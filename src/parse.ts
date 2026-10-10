export interface ParsedEmailList {
  /** Unique entries (case-insensitive) in input order, at most `limit`. */
  entries: string[];
  /** Repeats of an earlier entry that were dropped. */
  duplicates: number;
  /** More unique entries were pasted than `limit` allows. */
  truncated: boolean;
}

/**
 * Pull email addresses and domains out of pasted text: one per line, or
 * separated by commas, semicolons, tabs, or spaces — so a CSV column, a mail
 * client's `Jane Doe <jane@acme.com>` header, or a plain list all work.
 * `mailto:`, angle brackets, quotes, and trailing punctuation are stripped;
 * tokens with neither an `@` nor a dot (names, labels) are skipped.
 */
export function parseEmailList(text: string, limit = Number.POSITIVE_INFINITY): ParsedEmailList {
  const seen = new Set<string>();
  const entries: string[] = [];
  let duplicates = 0;
  let truncated = false;

  for (const token of text.split(/[\s,;]+/)) {
    const entry = token
      .replace(/^mailto:/i, "")
      .replace(/^[<("'[]+/, "")
      .replace(/[>)"'\].:!?]+$/, "");
    if (!entry || (!entry.includes("@") && !entry.includes("."))) continue;

    const key = entry.toLowerCase();
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }
    if (entries.length >= limit) {
      truncated = true;
      continue;
    }
    seen.add(key);
    entries.push(entry);
  }

  return { entries, duplicates, truncated };
}
