import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { siteLink } from '../src/config/site';
import { strangerWelcome } from '../src/channels/stranger';

const saved = { mode: process.env.RECALFY_MODE, web: process.env.WEB_URL };

afterEach(() => {
  process.env.RECALFY_MODE = saved.mode;
  process.env.WEB_URL = saved.web;
  if (saved.mode === undefined) delete process.env.RECALFY_MODE;
  if (saved.web === undefined) delete process.env.WEB_URL;
});

describe('siteLink', () => {
  it('says exactly what recalfy.com always said when hosted', () => {
    delete process.env.RECALFY_MODE;
    delete process.env.WEB_URL;
    assert.equal(siteLink('/dashboard/billing'), 'recalfy.com/dashboard/billing');
  });

  it('points at a self-hosted dashboard when there is one', () => {
    process.env.RECALFY_MODE = 'selfhost';
    process.env.WEB_URL = 'https://memory.example.com/';
    assert.equal(siteLink('/login'), 'memory.example.com/login');
  });

  it('names no website at all on a self-hosted install without one', () => {
    process.env.RECALFY_MODE = 'selfhost';
    delete process.env.WEB_URL;
    assert.equal(siteLink('/login'), null);
    assert.doesNotMatch(strangerWelcome('telegram'), /recalfy\.com|Sign in/);
  });
});
