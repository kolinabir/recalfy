/**
 * The tracker system: repeating numbers, the way `memories` is durable facts.
 *
 * One shape covers expenses, water, gym visits, weight — an entry is a
 * numeric value logged against a named tracker. What varies per tracker is
 * deliberately tiny: a unit, an aggregation mode, and an optional target.
 * The model never invents fields; that single constraint is what keeps this
 * a ledger rather than a database-inside-the-database.
 *
 * Volume is the reason this is not a memory group: expenses arrive by the
 * thousand per year, so raw rows can never enter the prompt (DESIGN.md §1).
 * The prompt gets a rendered digest of aggregates; questions get answered by
 * aggregation in Mongo.
 */

/** How a tracker's entries collapse into one number for a period. */
export type Aggregate =
  /** Money, litres — amounts that add up. */
  | 'sum'
  /** Gym visits, cigarettes — occurrences, value defaulting to 1. */
  | 'count'
  /** Weight, savings balance — readings where only the latest matters. */
  | 'last';

export type TargetPeriod = 'day' | 'week' | 'month';

/**
 * One tracker's configuration, embedded on the user document — a user has a
 * handful at most, and embedding means they arrive with the user record the
 * brain already fetches every turn.
 */
export interface TrackerConfig {
  /** Lower-case identity, e.g. "spending", "water". */
  name: string;
  aggregate: Aggregate;
  /** "L", "kg", "pages". For spending the unit is the user's currency. */
  unit?: string;
  /** A budget (spending) or a goal (water: 3/day) — same field, same maths. */
  target?: number;
  targetPeriod?: TargetPeriod;
  createdAt: Date;
}

/**
 * The built-in tracker. Always present without configuration, because
 * expenses are the launch feature; its unit is the user's currency and the
 * only thing to configure is a budget.
 */
export const SPEND_TRACKER = 'spending';

/** A new entry as a tool hands it over, already validated field-by-field. */
export interface NewEntry {
  /** Which tracker. Unknown names auto-create one — see TrackerStore. */
  tracker: string;
  /** What the money or number was for: "cucumber", "rickshaw". */
  item?: string;
  /** Amount in the tracker's unit. Omitted means 1 (a count-style tick). */
  value?: number;
  /** Spending only: "groceries", "transport". */
  category?: string;
  /**
   * Spending only: money not yet spent — a shopping-list line. Checking it
   * off later flips it to a real expense via `update`.
   */
  planned?: boolean;
}

/** What `update` may change about an existing entry, all optional. */
export interface EntryPatch {
  value?: number;
  category?: string;
  item?: string;
  /** Flip a planned entry into a real expense, stamped at the flip. */
  bought?: boolean;
  /** Soft-delete — "that wasn't an expense". */
  remove?: boolean;
}

export interface ReportQuery {
  tracker: string;
  /** Inclusive start / exclusive end, resolved by the tool in the user's zone. */
  from: Date;
  to: Date;
  groupBy?: 'category' | 'item' | 'day';
}
