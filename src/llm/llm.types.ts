/** A JSON Schema object describing a tool's arguments. */
export type JsonSchema = Record<string, unknown>;

export interface ToolSpec {
  name: string;
  description: string;
  parameters: JsonSchema;
}

export interface ToolCall {
  id: string;
  name: string;
  /** Raw JSON string from the model — validate before trusting. */
  rawArguments: string;
}

export type Turn =
  | { role: 'system' | 'user' | 'assistant'; content: string }
  | { role: 'assistant'; content: string; toolCalls: ToolCall[] }
  | { role: 'tool'; toolCallId: string; content: string };

export interface Completion {
  /** Empty when the model chose to call tools instead of speaking. */
  text: string;
  toolCalls: ToolCall[];
}
