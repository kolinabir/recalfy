import { Inject, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat';

import { ENV, Env } from '../config/env';
import { Completion, ToolCall, ToolSpec, Turn } from './llm.types';

const REQUEST_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 2;

/**
 * The model, behind one method.
 *
 * Z.ai speaks the OpenAI wire protocol, so this is the official `openai` SDK
 * pointed at a different baseURL — swapping providers is a config change, not
 * a code change. Callers never see OpenAI's message shapes.
 */
@Injectable()
export class GlmClient {
  private readonly logger = new Logger(GlmClient.name);
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(@Inject(ENV) env: Env) {
    this.client = new OpenAI({
      apiKey: env.glmApiKey,
      baseURL: env.glmBaseUrl,
      timeout: REQUEST_TIMEOUT_MS,
      maxRetries: MAX_RETRIES,
    });
    this.model = env.glmModel;
  }

  /**
   * `onText` opts into streaming: it is called with the answer so far, as
   * often as tokens arrive, and the same Completion comes back at the end
   * either way. Callers that do not pass it get the plain request, which is
   * one fewer moving part on the paths where nobody is watching.
   */
  async complete(
    turns: Turn[],
    tools: ToolSpec[],
    onText?: (partial: string) => void,
  ): Promise<Completion> {
    if (!onText) return this.completeAtOnce(turns, tools);

    try {
      return await this.completeStreaming(turns, tools, onText);
    } catch (error) {
      // Streaming is the presentation, not the product. If the transport
      // fails mid-answer — and it is the newer of the two paths — fall back
      // rather than hand the user the generic apology.
      if (isRateLimit(error)) throw error;
      this.logger.warn(`Stream failed, retrying unstreamed: ${message(error)}`);
      return this.completeAtOnce(turns, tools);
    }
  }

  private async completeAtOnce(turns: Turn[], tools: ToolSpec[]): Promise<Completion> {
    const response = await this.client.chat.completions.create(this.request(turns, tools));

    const choice = response.choices[0];
    const message = choice?.message;
    const usage = response.usage;
    this.logger.debug(`in=${usage?.prompt_tokens ?? '?'} out=${usage?.completion_tokens ?? '?'}`);

    const completion: Completion = {
      text: message?.content?.trim() ?? '',
      toolCalls: (message?.tool_calls ?? []).flatMap(toToolCall),
    };

    // A turn with neither words nor an action is a bug worth seeing, not a
    // silent fallback message to the user. Reasoning models can still land
    // here if GLM_MODEL is pointed at one, so salvage the monologue rather
    // than telling the user nothing.
    if (completion.text === '' && completion.toolCalls.length === 0) {
      this.logger.warn(
        `Empty completion: finish_reason=${choice?.finish_reason} ` +
          `keys=${Object.keys(message ?? {}).join(',')}`,
      );
      completion.text = reasoningOf(message).trim();
    }

    return completion;
  }

  /**
   * The same call, read as it arrives.
   *
   * Text is easy; tool calls are the fiddly part. They stream as fragments
   * keyed by an index — the id and name land in the first fragment and the
   * arguments dribble in as string pieces across the rest — so they are
   * reassembled by index here and only exist as whole calls at the end.
   */
  private async completeStreaming(
    turns: Turn[],
    tools: ToolSpec[],
    onText: (partial: string) => void,
  ): Promise<Completion> {
    const stream = await this.client.chat.completions.create({
      ...this.request(turns, tools),
      stream: true,
      stream_options: { include_usage: true },
    });

    let text = '';
    let reasoning = '';
    let finishReason: string | null | undefined;
    const partials = new Map<number, { id: string; name: string; args: string }>();

    for await (const chunk of stream) {
      if (chunk.usage) {
        this.logger.debug(
          `in=${chunk.usage.prompt_tokens ?? '?'} out=${chunk.usage.completion_tokens ?? '?'}`,
        );
      }

      const choice = chunk.choices[0];
      if (!choice) continue;
      if (choice.finish_reason) finishReason = choice.finish_reason;

      const delta = choice.delta;
      if (delta?.content) {
        text += delta.content;
        onText(text);
      }
      reasoning += reasoningOf(delta);

      for (const fragment of delta?.tool_calls ?? []) {
        const call = partials.get(fragment.index) ?? { id: '', name: '', args: '' };
        if (fragment.id) call.id = fragment.id;
        if (fragment.function?.name) call.name = fragment.function.name;
        if (fragment.function?.arguments) call.args += fragment.function.arguments;
        partials.set(fragment.index, call);
      }
    }

    const completion: Completion = {
      text: text.trim(),
      toolCalls: [...partials.values()]
        .filter((call) => call.name !== '')
        .map((call) => ({ id: call.id, name: call.name, rawArguments: call.args })),
    };

    if (completion.text === '' && completion.toolCalls.length === 0) {
      this.logger.warn(`Empty streamed completion: finish_reason=${finishReason}`);
      completion.text = reasoning.trim();
    }

    return completion;
  }

  private request(turns: Turn[], tools: ToolSpec[]) {
    return {
      model: this.model,
      messages: turns.map(toOpenAiMessage),
      tools: tools.map(toOpenAiTool),
      ...requestExtras(String(this.client.baseURL), this.model),
    };
  }
}

/**
 * The parameters that depend on who is on the other end.
 *
 * `thinking` is a Z.ai extension: GLM reasoning models otherwise spend the
 * whole turn in `reasoning_content` and return an empty `content`, and this
 * assistant has nothing to reason about worth doubling the latency for. OpenAI
 * rejects unknown fields outright, so it is only sent to Z.ai.
 *
 * `temperature` is refused by OpenAI's reasoning models (gpt-5, o-series) at
 * anything but the default, so those get none.
 */
export function requestExtras(baseUrl: string, model: string): Record<string, unknown> {
  const zai = /z\.ai|bigmodel\.cn/.test(baseUrl);
  const openAiReasoning = /api\.openai\.com/.test(baseUrl) && /^(gpt-5|o\d)/.test(model);

  return {
    ...(!openAiReasoning && { temperature: 0.3 }),
    ...(zai && { thinking: { type: 'disabled' } }),
  };
}

/** The free GLM tiers cap requests per minute, and a retry would not help. */
function isRateLimit(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === 429;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** `reasoning_content` is a Z.ai field the OpenAI types don't describe. */
function reasoningOf(message: unknown): string {
  if (typeof message !== 'object' || message === null) return '';
  const reasoning = (message as { reasoning_content?: unknown }).reasoning_content;
  return typeof reasoning === 'string' ? reasoning : '';
}

function toOpenAiMessage(turn: Turn): ChatCompletionMessageParam {
  if (turn.role === 'tool') {
    return { role: 'tool', tool_call_id: turn.toolCallId, content: turn.content };
  }

  if (turn.role === 'assistant' && 'toolCalls' in turn) {
    return {
      role: 'assistant',
      content: turn.content || null,
      tool_calls: turn.toolCalls.map((call) => ({
        id: call.id,
        type: 'function' as const,
        function: { name: call.name, arguments: call.rawArguments },
      })),
    };
  }

  return { role: turn.role, content: turn.content };
}

function toOpenAiTool(spec: ToolSpec): ChatCompletionTool {
  return {
    type: 'function',
    function: { name: spec.name, description: spec.description, parameters: spec.parameters },
  };
}

type RawToolCall = NonNullable<
  OpenAI.Chat.Completions.ChatCompletionMessage['tool_calls']
>[number];

/** Non-function tool calls (web search, etc.) aren't used here, so drop them. */
function toToolCall(raw: RawToolCall): ToolCall[] {
  if (raw.type !== 'function') return [];
  return [{ id: raw.id, name: raw.function.name, rawArguments: raw.function.arguments }];
}
