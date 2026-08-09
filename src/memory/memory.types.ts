/** A single atomic thing the assistant knows. One fact, one row. */
export interface Fact {
  /**
   * The fact itself, self-contained and in the third person:
   * "Landlord is Rahim", not "he is Rahim".
   */
  text: string;
  /** Heading it renders under. Free-form; a handful of stable ones is ideal. */
  group?: string;
  /**
   * Short ids (`sid`) of existing facts this one replaces. Superseded facts
   * drop out of the rendered memory but stay in the collection.
   */
  supersedes?: string[];
  /** When a temporary fact stops being true and leaves the rendered memory. */
  staleAfter?: Date;
}

export interface Memory {
  sid: string;
  text: string;
  group: string;
  createdAt: Date;
}

export const DEFAULT_GROUP = 'General';
