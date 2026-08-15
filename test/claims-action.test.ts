import assert from 'node:assert/strict';
import test from 'node:test';

import { claimsAction } from '../src/brain/claims-action';

test('catches a claim that something was stored', () => {
  assert.equal(claimsAction("Got it, I've noted that down."), true);
  assert.equal(claimsAction('Saved!'), true);
});

test('catches a claim that something was changed', () => {
  assert.equal(claimsAction('Got it, rent is now due on the 3rd.'), true);
  assert.equal(claimsAction("I've updated it."), true);
});

test('catches a claim that something was deleted', () => {
  assert.equal(claimsAction('Done, forgot the rent information.'), true);
  assert.equal(claimsAction("I've removed those."), true);
});

test('catches a claim that a reminder exists', () => {
  assert.equal(claimsAction("I'll remind you to call Rahim at 5pm."), true);
  assert.equal(claimsAction('Reminder set for tomorrow.'), true);
});

test('catches a claim that an expense or entry was logged', () => {
  assert.equal(claimsAction("Logged it — 250 on groceries."), true);
  assert.equal(claimsAction("I've tracked that for you."), true);
  assert.equal(claimsAction('Added it to your shopping list.'), true);
  assert.equal(claimsAction('Marked it as bought.'), true);
});

test('leaves a plain answer alone', () => {
  assert.equal(claimsAction('Your rent is due on the 3rd of each month.'), false);
  assert.equal(claimsAction('Your landlord is Rahim.'), false);
});

test('leaves a question or a refusal alone', () => {
  assert.equal(claimsAction("What's your name, and which city are you in?"), false);
  assert.equal(claimsAction("I don't know that yet — tell me and I'll keep it."), false);
});

/*
  Seen in production: "Yep, still got it — laptop password is xeers34. All
  good!" was challenged as an unbacked claim, and the model answered the
  challenge by storing the fact a second time. A true answer about what memory
  holds became a duplicate row.
*/
test('leaves a statement about what memory already holds alone', () => {
  assert.equal(claimsAction('Yep, still got it — laptop password is xeers34.'), false);
  assert.equal(claimsAction('Already got it, from last week.'), false);
});

test('still catches the acknowledgements it was written for', () => {
  assert.equal(claimsAction('Got it — saved.'), true);
  assert.equal(claimsAction('Done.'), true);
  assert.equal(claimsAction('All set!'), true);
});
