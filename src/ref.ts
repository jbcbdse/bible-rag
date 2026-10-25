import type { Passage, Ref } from "./types.ts";

const BOOKS: [string, ...string[]][] = [
  ["GEN", "genesis", "gen"],
  ["EXO", "exodus", "exo", "exod"],
  ["LEV", "leviticus", "lev"],
  ["NUM", "numbers", "num"],
  ["DEU", "deuteronomy", "deut", "deu"],
  ["JOS", "joshua", "josh", "jos"],
  ["JDG", "judges", "judg", "jdg"],
  ["RUT", "ruth", "rut"],
  ["1SA", "1 samuel", "1 sam", "1sa", "1sam"],
  ["2SA", "2 samuel", "2 sam", "2sa", "2sam"],
  ["1KI", "1 kings", "1 kgs", "1ki", "1kgs"],
  ["2KI", "2 kings", "2 kgs", "2ki", "2kgs"],
  ["1CH", "1 chronicles", "1 chr", "1ch", "1chr"],
  ["2CH", "2 chronicles", "2 chr", "2ch", "2chr"],
  ["EZR", "ezra", "ezr"],
  ["NEH", "nehemiah", "neh"],
  ["EST", "esther", "est"],
  ["JOB", "job"],
  ["PSA", "psalms", "psalm", "psa", "ps"],
  ["PRO", "proverbs", "prov", "pro"],
  ["ECC", "ecclesiastes", "eccl", "ecc"],
  ["SNG", "song of solomon", "song of songs", "canticles", "song", "sng"],
  ["ISA", "isaiah", "isa"],
  ["JER", "jeremiah", "jer"],
  ["LAM", "lamentations", "lam"],
  ["EZK", "ezekiel", "ezek", "ezk"],
  ["DAN", "daniel", "dan"],
  ["HOS", "hosea", "hos"],
  ["JOL", "joel", "jol"],
  ["AMO", "amos", "amo"],
  ["OBA", "obadiah", "obad", "oba"],
  ["JON", "jonah", "jon"],
  ["MIC", "micah", "mic"],
  ["NAM", "nahum", "nah", "nam"],
  ["HAB", "habakkuk", "hab"],
  ["ZEP", "zephaniah", "zeph", "zep"],
  ["HAG", "haggai", "hag"],
  ["ZEC", "zechariah", "zech", "zec"],
  ["MAL", "malachi", "mal"],
  ["MAT", "matthew", "matt", "mat", "mt"],
  ["MRK", "mark", "mrk", "mk"],
  ["LUK", "luke", "luk", "lk"],
  ["JHN", "john", "jhn", "jn", "joh"],
  ["ACT", "acts", "act"],
  ["ROM", "romans", "rom"],
  ["1CO", "1 corinthians", "1 cor", "1co", "1cor"],
  ["2CO", "2 corinthians", "2 cor", "2co", "2cor"],
  ["GAL", "galatians", "gal"],
  ["EPH", "ephesians", "eph"],
  ["PHP", "philippians", "phil", "php"],
  ["COL", "colossians", "col"],
  ["1TH", "1 thessalonians", "1 thess", "1th", "1thess"],
  ["2TH", "2 thessalonians", "2 thess", "2th", "2thess"],
  ["1TI", "1 timothy", "1 tim", "1ti", "1tim"],
  ["2TI", "2 timothy", "2 tim", "2ti", "2tim"],
  ["TIT", "titus", "tit"],
  ["PHM", "philemon", "phlm", "phm"],
  ["HEB", "hebrews", "heb"],
  ["JAS", "james", "jas", "jam"],
  ["1PE", "1 peter", "1 pet", "1pe", "1pet"],
  ["2PE", "2 peter", "2 pet", "2pe", "2pet"],
  ["1JN", "1 john", "1 jn", "1jn", "1jo"],
  ["2JN", "2 john", "2 jn", "2jn", "2jo"],
  ["3JN", "3 john", "3 jn", "3jn", "3jo"],
  ["JUD", "jude", "jud"],
  ["REV", "revelation", "rev"],
  ["TOB", "tobit", "tob"],
  ["JDT", "judith", "jdt"],
  ["WIS", "wisdom", "wis"],
  ["SIR", "sirach", "ecclesiasticus", "sir"],
  ["BAR", "baruch", "bar"],
  ["1MA", "1 maccabees", "1 mac", "1ma"],
  ["2MA", "2 maccabees", "2 mac", "2ma"],
];

const ALIAS = new Map<string, string>();
for (const [osis, ...names] of BOOKS) {
  ALIAS.set(osis.toLowerCase(), osis);
  for (const n of names) ALIAS.set(n, osis);
}

function osis(name: string): string | undefined {
  return ALIAS.get(name.trim().toLowerCase().replace(/\s+/g, " "));
}

const REF =
  /^(\d?\s*[A-Za-z][A-Za-z0-9 ]*?)\s+(\d+):(\d+)(?:\s*[-–—]\s*(?:(\d+):)?(\d+))?$/;

export function parsePassage(input: string): Passage {
  const m = input.trim().match(REF);
  if (!m) throw new Error(`unrecognized reference: ${input}`);
  const book = osis(m[1]!);
  if (!book) throw new Error(`unknown book: ${m[1]}`);
  const start: Ref = {
    book,
    chapter: Number(m[2]),
    verse: Number(m[3]),
  };
  const end: Ref = {
    book,
    chapter: m[4] != null ? Number(m[4]) : start.chapter,
    verse: m[5] != null ? Number(m[5]) : start.verse,
  };
  return { start, end };
}

export function cmpRef(a: Ref, b: Ref): number {
  if (a.book !== b.book) return a.book.localeCompare(b.book);
  if (a.chapter !== b.chapter) return a.chapter - b.chapter;
  return a.verse - b.verse;
}

export function rangesOverlap(a: Passage, b: Passage): boolean {
  if (a.start.book !== b.start.book) return false;
  return cmpRef(a.start, b.end) <= 0 && cmpRef(b.start, a.end) <= 0;
}
