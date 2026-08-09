import assert from 'node:assert/strict';
import test from 'node:test';
import { ObjectId } from 'mongodb';

import { renderMemoryDocument } from '../src/memory/memory-document';
import type { MemoryDoc } from '../src/mongo/collections';

const USER_ID = 1;

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
  const rendered = renderMemoryDocument({ timezone: 'UTC', memories: [] });

  assert.match(rendered, /Timezone: UTC · 0 memories/);
  assert.match(rendered, /nothing yet/);
});

test('counts only live facts and uses the singular', () => {
  const rendered = renderMemoryDocument({
    timezone: 'Asia/Kolkata',
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
