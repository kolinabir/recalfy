/**
 * Timezone → currency, so a bare "250" is never ambiguous about what 250 is.
 *
 * The zone is the one piece of location the user has already given us —
 * onboarding refuses to schedule anything without it — so it doubles as the
 * currency default without a single extra question. A curated map beats a
 * country database here: it covers the zones real users actually type, and a
 * miss falls back to USD, which the user can correct in one sentence.
 */
const CURRENCY_BY_ZONE: Record<string, string> = {
  'Asia/Dhaka': 'BDT',
  'Asia/Kolkata': 'INR',
  'Asia/Karachi': 'PKR',
  'Asia/Colombo': 'LKR',
  'Asia/Kathmandu': 'NPR',
  'Asia/Dubai': 'AED',
  'Asia/Riyadh': 'SAR',
  'Asia/Qatar': 'QAR',
  'Asia/Kuwait': 'KWD',
  'Asia/Singapore': 'SGD',
  'Asia/Kuala_Lumpur': 'MYR',
  'Asia/Jakarta': 'IDR',
  'Asia/Bangkok': 'THB',
  'Asia/Manila': 'PHP',
  'Asia/Ho_Chi_Minh': 'VND',
  'Asia/Tokyo': 'JPY',
  'Asia/Seoul': 'KRW',
  'Asia/Shanghai': 'CNY',
  'Asia/Hong_Kong': 'HKD',
  'Asia/Taipei': 'TWD',
  'Europe/London': 'GBP',
  'Europe/Dublin': 'EUR',
  'Europe/Paris': 'EUR',
  'Europe/Berlin': 'EUR',
  'Europe/Madrid': 'EUR',
  'Europe/Rome': 'EUR',
  'Europe/Amsterdam': 'EUR',
  'Europe/Brussels': 'EUR',
  'Europe/Lisbon': 'EUR',
  'Europe/Vienna': 'EUR',
  'Europe/Warsaw': 'PLN',
  'Europe/Prague': 'CZK',
  'Europe/Stockholm': 'SEK',
  'Europe/Oslo': 'NOK',
  'Europe/Copenhagen': 'DKK',
  'Europe/Zurich': 'CHF',
  'Europe/Istanbul': 'TRY',
  'Europe/Moscow': 'RUB',
  'Europe/Kyiv': 'UAH',
  'Africa/Cairo': 'EGP',
  'Africa/Lagos': 'NGN',
  'Africa/Nairobi': 'KES',
  'Africa/Johannesburg': 'ZAR',
  'Australia/Sydney': 'AUD',
  'Australia/Melbourne': 'AUD',
  'Pacific/Auckland': 'NZD',
  'America/Toronto': 'CAD',
  'America/Vancouver': 'CAD',
  'America/Mexico_City': 'MXN',
  'America/Sao_Paulo': 'BRL',
  'America/Buenos_Aires': 'ARS',
  'America/Bogota': 'COP',
  'America/Lima': 'PEN',
  'America/Santiago': 'CLP',
};

export const FALLBACK_CURRENCY = 'USD';

/** Every US zone shares one currency; matching the prefix spares 30 rows. */
const PREFIX_CURRENCIES: [prefix: string, currency: string][] = [['America/', 'USD']];

export function currencyForZone(zone: string): string {
  const exact = CURRENCY_BY_ZONE[zone];
  if (exact) return exact;

  const prefixed = PREFIX_CURRENCIES.find(([prefix]) => zone.startsWith(prefix));
  return prefixed ? prefixed[1] : FALLBACK_CURRENCY;
}
