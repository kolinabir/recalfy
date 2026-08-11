import assert from 'node:assert/strict';
import test from 'node:test';

import { FALLBACK_CURRENCY, currencyForZone } from '../src/tracker/currency';

test('maps the zones the product actually meets', () => {
  assert.equal(currencyForZone('Asia/Dhaka'), 'BDT');
  assert.equal(currencyForZone('Asia/Kolkata'), 'INR');
  assert.equal(currencyForZone('Europe/London'), 'GBP');
  assert.equal(currencyForZone('Europe/Berlin'), 'EUR');
});

test('any unlisted American zone means dollars', () => {
  assert.equal(currencyForZone('America/New_York'), 'USD');
  assert.equal(currencyForZone('America/Chicago'), 'USD');
});

test('a listed American zone beats the prefix rule', () => {
  assert.equal(currencyForZone('America/Toronto'), 'CAD');
  assert.equal(currencyForZone('America/Sao_Paulo'), 'BRL');
});

test('an unknown zone falls back rather than failing', () => {
  assert.equal(currencyForZone('Antarctica/Troll'), FALLBACK_CURRENCY);
});
