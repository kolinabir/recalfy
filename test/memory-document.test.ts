import assert from 'node:assert/strict';
import test from 'node:test';
import { ObjectId } from 'mongodb';

import { renderMemoryDocument } from '../src/memory/memory-document';
import type { MemoryDoc } from '../src/mongo/collections';

const USER_ID = 1;
const NOW = new Date('2026-08-10T00:00:00Z');

function memory(overrides: Partial<MemoryDoc> & Pick<MemoryDoc, 'sid' | 'text'>): MemoryDoc {
  return {
    _id: new ObjectId(),
    userId: USER_ID,
    group: 'General',
    createdAt: new Date('2026-08-01T00:00:00Z'),
    ...overrides,
  };
}

test('reports an empty memory rather than an empty document', () => {
  const rendered = renderMemoryDocument({ timezone: 'UTC', memories: [], now: NOW });

  assert.match(rendered, /Timezone: UTC · 0 memories/);
  assert.match(rendered, /nothing yet/);
});

test('counts only live facts and uses the singular', () => {
  const rendered = renderMemoryDocument({
    timezone: 'Asia/Kolkata',
    now: NOW,
    memories: [
      memory({ sid: '01', text: 'Landlord is Rahim.' }),
      memory({ sid: '02', text: 'Gone.', deletedAt: new Date() }),
    ],
  });

  assert.match(rendered, /1 memory_/);
  assert.doesNotMatch(rendered, /Gone\./);
});

test('groups facts under headings in first-appearance order', () => {
  const rendered = renderMemoryDocument({
    timezone: 'UTC',
    now: NOW,
    memories: [
      memory({ sid: '01', text: 'Landlord is Rahim.', group: 'People' }),
      memory({ sid: '02', text: 'Rent is due on the 5th.', group: 'Home' }),
      memory({ sid: '03', text: 'Rahim likes cricket.', group: 'People' }),
    ],
  });

  assert.ok(rendered.indexOf('## People') < rendered.indexOf('## Home'));
  assert.match(rendered, /## People\n- Landlord is Rahim\. `01`\n- Rahim likes cricket\. `03`/);
});

test('hides a superseded fact but shows what it replaced', () => {
  const oldRent = new ObjectId();
  const rendered = renderMemoryDocument({
    timezone: 'UTC',
    now: NOW,
    memories: [
      memory({
        _id: oldRent,
        sid: '01',
        text: 'Rent is due on the 5th.',
        group: 'Home',
        supersededBy: new ObjectId(),
      }),
      memory({ sid: '02', text: 'Rent is due on the 3rd.', group: 'Home', supersedes: oldRent }),
    ],
  });

  assert.match(rendered, /- Rent is due on the 3rd\. \(was: Rent is due on the 5th\.\) `02`/);
  assert.match(rendered, /1 memory_/);
});

test('drops an expired fact and shows the horizon on a live one', () => {
  const rendered = renderMemoryDocument({
    timezone: 'UTC',
    now: NOW,
    memories: [
      memory({ sid: '01', text: 'Visiting parents.', staleAfter: new Date('2026-08-17T23:59:59Z') }),
      memory({ sid: '02', text: 'Car is in the shop.', staleAfter: new Date('2026-08-05T23:59:59Z') }),
    ],
  });

  assert.match(rendered, /- Visiting parents\. \(until 17 Aug\) `01`/);
  assert.doesNotMatch(rendered, /Car is in the shop/);
  assert.match(rendered, /1 memory_/);
});

test('clusters People facts by person, names in first-appearance order', () => {
  const rendered = renderMemoryDocument({
    timezone: 'UTC',
    now: NOW,
    memories: [
      memory({ sid: '01', text: 'Rahim is the landlord.', group: 'People' }),
      memory({ sid: '02', text: 'Anika is a colleague.', group: 'People' }),
      memory({ sid: '03', text: "Rahim's number is +880123.", group: 'People' }),
    ],
  });

  assert.match(
    rendered,
    /## People\n- Rahim is the landlord\. `01`\n- Rahim's number is \+880123\. `03`\n- Anika is a colleague\. `02`/,
  );
});

test('leaves non-People groups in creation order', () => {
  const rendered = renderMemoryDocument({
    timezone: 'UTC',
    now: NOW,
    memories: [
      memory({ sid: '01', text: 'Rent is due on the 3rd.', group: 'Home' }),
      memory({ sid: '02', text: 'Geyser was leaking in August.', group: 'Home' }),
      memory({ sid: '03', text: 'Rent includes water.', group: 'Home' }),
    ],
  });

  assert.match(rendered, /- Rent is due on the 3rd\. `01`\n- Geyser was leaking in August\. `02`\n- Rent includes water\. `03`/);
});
