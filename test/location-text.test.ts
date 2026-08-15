import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  LOCATION_PREFIX,
  describeSharedLocation,
  mapsUrl,
} from '../src/telegram/location-text';

/**
 * A shared pin becomes text at the edge, and that text is the entire contract
 * between Telegram and the rest of the product. Everything downstream — the
 * model's decision to store it, the fact it writes, the export it lands in —
 * reads this string and nothing else.
 */

const DHAKA = { latitude: 23.7808, longitude: 90.4126 };

describe('describeSharedLocation', () => {
  it('renders a bare pin as a prefix and a link', () => {
    assert.equal(
      describeSharedLocation(DHAKA),
      'Shared a location: https://www.google.com/maps?q=23.780800,90.412600',
    );
  });

  it('leads with the place when Telegram named one', () => {
    const said = describeSharedLocation(DHAKA, {
      title: 'Jamuna Future Park',
      address: 'Ka-244, Kuril',
    });

    assert.match(said, /^Shared a location: Jamuna Future Park, Ka-244, Kuril — https/);
  });

  it('uses whichever half of the venue Telegram supplied', () => {
    assert.match(describeSharedLocation(DHAKA, { title: 'Level 3, Row F' }), /Level 3, Row F —/);
    assert.match(describeSharedLocation(DHAKA, { address: '12 Gulshan Ave' }), /12 Gulshan Ave —/);
  });

  it('falls back to the bare form when a venue carries no usable text', () => {
    // Telegram types both fields as optional, and an empty string is not a name.
    assert.equal(
      describeSharedLocation(DHAKA, { title: '  ', address: undefined }),
      describeSharedLocation(DHAKA),
    );
  });

  it('always opens with the prefix the system prompt keys on', () => {
    // The prompt rule matches this exact opening; drift here silently turns a
    // pin back into an unremarkable line of text the model may not store.
    for (const venue of [undefined, { title: 'Somewhere' }]) {
      assert.ok(describeSharedLocation(DHAKA, venue).startsWith(LOCATION_PREFIX));
    }
  });
});

describe('mapsUrl', () => {
  it('pins six decimal places, so a round number is not truncated to nothing', () => {
    assert.equal(mapsUrl({ latitude: 51.5, longitude: -0.12 }), 'https://www.google.com/maps?q=51.500000,-0.120000');
  });

  it('keeps southern and western coordinates negative', () => {
    const url = mapsUrl({ latitude: -33.8688, longitude: -70.6693 });
    assert.match(url, /q=-33\.868800,-70\.669300$/);
  });

  it('is a plain coordinate search, so any map app can answer it', () => {
    assert.match(mapsUrl(DHAKA), /^https:\/\/www\.google\.com\/maps\?q=/);
  });
});
