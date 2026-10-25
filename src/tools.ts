import { BaseTool } from "@jbcbdse/charlie-core";
import { z } from "zod";
import type pg from "pg";
import {
  compareTranslations,
  getCommentary,
  listWorks,
  lookupPassage,
  search,
} from "./retrieve.ts";

const kind = z.enum(["translation", "commentary", "scholarship"]);

export class ListWorksTool extends BaseTool {
  public name = "list_works";
  public description =
    "List ingested translations, commentaries, and scholarly works with license metadata.";
  public schema = z.object({});
  constructor(private readonly pool: pg.Pool) {
    super();
  }
  public async handler(): Promise<string> {
    return JSON.stringify(await listWorks(this.pool));
  }
}

export class LookupPassageTool extends BaseTool {
  public name = "lookup_passage";
  public description =
    "Look up an exact Bible range in one translation (e.g. John 3:16-18, WEB).";
  public schema = z.object({
    reference: z
      .string()
      .describe("Human or OSIS range, e.g. John 3:16-18 or JHN 3:16"),
    translation: z
      .string()
      .default("web")
      .describe("workId of a translation, default web"),
  });
  constructor(private readonly pool: pg.Pool) {
    super();
  }
  public async handler({
    reference,
    translation,
  }: z.infer<typeof this.schema>): Promise<string> {
    return JSON.stringify(
      await lookupPassage(this.pool, reference, translation),
    );
  }
}

export class CompareTranslationsTool extends BaseTool {
  public name = "compare_translations";
  public description = "The same passage range in two or more translations.";
  public schema = z.object({
    reference: z.string().describe("Human or OSIS range, e.g. John 3:16-18"),
    translations: z
      .array(z.string())
      .min(2)
      .describe("workIds, e.g. [\"web\",\"kjv\"]"),
  });
  constructor(private readonly pool: pg.Pool) {
    super();
  }
  public async handler({
    reference,
    translations,
  }: z.infer<typeof this.schema>): Promise<string> {
    return JSON.stringify(
      await compareTranslations(this.pool, reference, translations),
    );
  }
}

export class SearchTool extends BaseTool {
  public name = "search";
  public description =
    "Hybrid lexical + vector search over Bible, commentary, and scholarship chunks.";
  public schema = z.object({
    query: z.string().describe("Thematic or wording query, not necessarily a verse ref"),
    kind: kind.optional().describe("Restrict to translation, commentary, or scholarship"),
    workId: z.string().optional().describe("Restrict to one work"),
  });
  constructor(private readonly pool: pg.Pool) {
    super();
  }
  public async handler({
    query,
    kind: k,
    workId,
  }: z.infer<typeof this.schema>): Promise<string> {
    return JSON.stringify(await search(this.pool, query, k, workId));
  }
}

export class GetCommentaryTool extends BaseTool {
  public name = "get_commentary";
  public description =
    "Commentary whose primary passage overlaps the asked range. Does not match citations alone or scholarship.";
  public schema = z.object({
    reference: z.string().describe("Human or OSIS range the commentary is on"),
    workId: z.string().optional().describe("Restrict to one commentary work"),
  });
  constructor(private readonly pool: pg.Pool) {
    super();
  }
  public async handler({
    reference,
    workId,
  }: z.infer<typeof this.schema>): Promise<string> {
    return JSON.stringify(await getCommentary(this.pool, reference, workId));
  }
}
