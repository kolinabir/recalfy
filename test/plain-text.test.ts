import assert from 'node:assert/strict';
import test from 'node:test';

import { toPlainText } from '../src/channels/plain-text';

test('strips the bold that Telegram would show literally', () => {
  assert.equal(toPlainText('**Spending today:** 2,585 total'), 'Spending today: 2,585 total');
  assert.equal(toPlainText('__Water:__ 1.5L'), 'Water: 1.5L');
  assert.equal(toPlainText('***both***'), 'both');
});

test('strips italics without eating asterisks that mean something else', () => {
  assert.equal(toPlainText('that was *really* cheap'), 'that was really cheap');
  assert.equal(toPlainText('2 * 3 = 6'), '2 * 3 = 6');
});

test('strips headings and quotes', () => {
  assert.equal(toPlainText('## Today\nrice 900'), 'Today\nrice 900');
  assert.equal(toPlainText('> you said this'), 'you said this');
});

test('turns markdown bullets into typographic ones', () => {
  assert.equal(toPlainText('- rice 900\n- milk 85'), '• rice 900\n• milk 85');
  assert.equal(toPlainText('* rice 900'), '• rice 900');
});

test('unwraps code and links into something readable in chat', () => {
  assert.equal(toPlainText('your id is `e07`'), 'your id is e07');
  assert.equal(toPlainText('```\nrice 900\n```'), 'rice 900');
  assert.equal(
    toPlainText('see [the dashboard](https://recalfy.com/dashboard)'),
    'see the dashboard (https://recalfy.com/dashboard)',
  );
});

test('leaves an ordinary warm reply completely alone', () => {
  const reply = "250 on cucumbers, groceries. You're well under budget!";
  assert.equal(toPlainText(reply), reply);
});

test('leaves prices, apostrophes and emoji untouched', () => {
  const reply = 'Rent is 15,000 — that_s 17% of your budget 💧';
  assert.equal(toPlainText(reply), reply);
});

test('collapses the blank lines stripping opens up', () => {
  assert.equal(toPlainText('Today\n\n---\n\nrice 900'), 'Today\n\nrice 900');
});
