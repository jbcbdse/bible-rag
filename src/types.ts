export type WorkKind = "translation" | "commentary" | "scholarship";

export type Ref = { book: string; chapter: number; verse: number };

export type Passage = { start: Ref; end: Ref };

export type WorkManifest = {
  workId: string;
  kind: WorkKind;
  title: string;
  author?: string;
  publisher?: string;
  language: string;
  license: string;
  attribution: string;
  versification?: string;
  tradition?: string;
  year?: number;
  series?: string;
  path: string;
};

export type Verse = {
  workId: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
};

export type Chunk = {
  workId: string;
  kind: WorkKind;
  text: string;
  passage?: Passage;
  references: Passage[];
  bookMeta?: Record<string, unknown>;
};
