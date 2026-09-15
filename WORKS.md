# Works

Local corpus of licensed Scripture and commentary. **This file is the source of truth** for what we acquire and where it comes from. The files under `corpus/` are a gitignored cache; they must be re-fetched from the URLs here, not restored from git.

- Translations: eBible USFM; each work’s `copr.htm` is the license of record. Re-fetch: the `usfm` zip URL in that work’s table.
- Commentary: HelloAO Free Use Bible API JSON (`https://bible.helloao.org/api/`); each work’s `SOURCE.json` is the license of record. Re-fetch: `npx tsx scripts/fetch-helloao-commentaries.ts`. Douay notes: the GitHub `source` URL.
- Scholarship / SWORD: CrossWire module names below; not yet extracted.

Paths: `corpus/translations/{workId}/`, `corpus/commentary/{workId}/`, `corpus/scholarship/{workId}/`.

Commentary chunks always have a primary passage. Scholarship chunks may not. Scholarship has not been acquired yet.

## Translations

### World English Bible Classic

| | |
| --- | --- |
| workId | `web` |
| kind | translation |
| language | `en` (American) |
| license | public-domain |
| attribution | World English Bible, public domain. Courtesy of eBible.org. “World English Bible” is a trademark of eBible.org; do not use that name for a modified text. |
| versification | eng |
| year | 2020 (stable text; this dump dated 2026-08-26) |
| publisher | eBible.org |
| source | https://ebible.org/find/details.php?id=eng-web |
| usfm | https://ebible.org/Scriptures/eng-web_usfm.zip |
| path | `corpus/translations/web/` |
| coverage | 66 proto-canon + deuterocanon (TOB JDT ESG WIS SIR BAR 1MA 2MA 1ES MAN PS2 3MA 2ES 4MA DAG) + FRT + GLO |

### King James (Authorized) Version

| | |
| --- | --- |
| workId | `kjv` |
| kind | translation |
| language | `en` (archaic British) |
| license | public-domain (outside the UK) |
| attribution | King James Version, 1769 standardized text, protocanon only, with Strong’s numbers. Courtesy of the CrossWire Bible Society and eBible.org. |
| versification | eng |
| year | 1769 (this dump dated 2026-08-19) |
| publisher | eBible.org / CrossWire |
| source | https://ebible.org/find/details.php?id=eng-kjv2006 |
| usfm | https://ebible.org/Scriptures/eng-kjv2006_usfm.zip |
| path | `corpus/translations/kjv/` |
| coverage | 66 proto-canon |
| notes | UK printing is still restricted by letters patent (Cambridge, Oxford, Collins). That does not apply to this digital copy outside the UK. |

### American Standard Version (1901)

| | |
| --- | --- |
| workId | `asv` |
| kind | translation |
| language | `en` (archaic American) |
| license | public-domain |
| attribution | American Standard Version, 1901. Courtesy of eBible.org. |
| versification | eng |
| year | 1901 (this dump dated 2026-08-08) |
| publisher | eBible.org |
| source | https://ebible.org/find/details.php?id=eng-asv |
| usfm | https://ebible.org/Scriptures/eng-asv_usfm.zip |
| path | `corpus/translations/asv/` |
| coverage | 66 proto-canon + FRT + INT |

### Young's Literal Translation

| | |
| --- | --- |
| workId | `ylt` |
| kind | translation |
| language | `en` (archaic British) |
| license | public-domain |
| attribution | Young's Literal Translation of the Holy Bible, Robert Young. Courtesy of eBible.org. |
| versification | eng |
| year | 1898 (this dump dated 2019-10-20) |
| publisher | eBible.org |
| source | https://ebible.org/find/details.php?id=engylt |
| usfm | https://ebible.org/Scriptures/engylt_usfm.zip |
| path | `corpus/translations/ylt/` |
| coverage | 66 proto-canon |

### Darby Translation

| | |
| --- | --- |
| workId | `dby` |
| kind | translation |
| language | `en` (archaic British) |
| license | public-domain |
| attribution | The Holy Scriptures, a New Translation from the Original Languages by J. N. Darby. Courtesy of eBible.org. |
| versification | eng |
| year | 1890 (this dump dated 2019-11-15) |
| publisher | eBible.org |
| source | https://ebible.org/find/details.php?id=engDBY |
| usfm | https://ebible.org/Scriptures/engDBY_usfm.zip |
| path | `corpus/translations/dby/` |
| coverage | 66 proto-canon |

### Noah Webster Bible

| | |
| --- | --- |
| workId | `webster` |
| kind | translation |
| language | `en` (archaic American) |
| license | public-domain |
| attribution | The Holy Bible, Containing the Old and New Testaments, in the Common Version, with Amendments of the language by Noah Webster, LL.D. Courtesy of eBible.org. |
| versification | eng |
| year | 1833 (this dump dated 2024-08-01) |
| publisher | eBible.org |
| source | https://ebible.org/find/details.php?id=engwebster |
| usfm | https://ebible.org/Scriptures/engwebster_usfm.zip |
| path | `corpus/translations/webster/` |
| coverage | 66 proto-canon |

### Open English Bible (U. S. spelling)

| | |
| --- | --- |
| workId | `oeb` |
| kind | translation |
| language | `en` |
| license | public-domain |
| attribution | The Holy Bible, Open English Bible translation, U. S. spelling edition. See OpenEnglishBible.org. |
| versification | eng |
| year | this dump dated 2026-08-08 |
| publisher | OpenEnglishBible.org / eBible.org |
| source | https://ebible.org/find/details.php?id=engoebus |
| usfm | https://ebible.org/Scriptures/engoebus_usfm.zip |
| path | `corpus/translations/oeb/` |
| coverage | Incomplete: NT (27) plus GEN JOS RUT EST PSA and the Twelve. Missing most of the OT. |

### Bible in Basic English

| | |
| --- | --- |
| workId | `bbe` |
| kind | translation |
| language | `en` (simple British) |
| license | public-domain (US; eBible) |
| attribution | Bible in Basic English, S. H. Hooke. eBible: printed 1965 by Cambridge without a copyright notice and distributed in America, so PD in the US. |
| versification | eng |
| year | 1949/1964 (this dump dated 2020-04-17) |
| publisher | eBible.org |
| source | https://ebible.org/find/details.php?id=engBBE |
| usfm | https://ebible.org/Scriptures/engBBE_usfm.zip |
| path | `corpus/translations/bbe/` |
| coverage | 66 proto-canon |
| notes | Cambridge still historically associated with the print edition; we rely on eBible’s US PD determination. |

### Berean Standard Bible

| | |
| --- | --- |
| workId | `bsb` |
| kind | translation |
| language | `en` |
| license | public-domain |
| attribution | Berean Standard Bible. Contributor: BSB Publishing, LLC. Courtesy of eBible.org. |
| versification | eng |
| year | this dump dated 2026-08-08 |
| publisher | BSB Publishing / eBible.org |
| source | https://ebible.org/find/details.php?id=engbsb |
| usfm | https://ebible.org/Scriptures/engbsb_usfm.zip |
| path | `corpus/translations/bsb/` |
| coverage | 66 proto-canon |

### Douay-Rheims 1899

| | |
| --- | --- |
| workId | `dra` |
| kind | translation |
| language | `en` (archaic American) |
| license | public-domain |
| attribution | Douay-Rheims American Edition of 1899, from the Latin Vulgate. Courtesy of eBible.org. |
| versification | eng |
| year | 1899 (this dump dated 2022-11-03) |
| publisher | eBible.org |
| source | https://ebible.org/find/details.php?id=engDRA |
| usfm | https://ebible.org/Scriptures/engDRA_usfm.zip |
| path | `corpus/translations/dra/` |
| coverage | 66 proto-canon + deuterocanon (TOB JDT WIS SIR BAR 1MA 2MA) |

### Geneva Bible 1599

| | |
| --- | --- |
| workId | `gnv` |
| kind | translation |
| language | `en` (original 1599 spelling) |
| license | public-domain |
| attribution | Geneva Bible, 1599. Courtesy of eBible.org. Text is the original spelling, not modernized. |
| versification | eng |
| year | 1599 (this dump dated 2024-03-16) |
| publisher | eBible.org |
| source | https://ebible.org/find/details.php?id=enggnv |
| usfm | https://ebible.org/Scriptures/enggnv_usfm.zip |
| path | `corpus/translations/gnv/` |
| coverage | 66 proto-canon |
| notes | This is the Bible text, not the Geneva *notes* (those remain unacquired: CrossWire license is `null`). |

### JPS TaNaKH 1917

| | |
| --- | --- |
| workId | `jps` |
| kind | translation |
| language | `en` |
| license | public-domain |
| attribution | Jewish Publication Society *TaNaKH* (Old Testament), 1917 (“Old JPS”). Courtesy of eBible.org. Not the 1985 NJPS. |
| versification | eng |
| year | 1917 (this dump dated 2023-09-19) |
| publisher | Jewish Publication Society / eBible.org |
| source | https://ebible.org/find/details.php?id=engjps |
| usfm | https://ebible.org/Scriptures/engjps_usfm.zip |
| path | `corpus/translations/jps/` |
| coverage | OT only (39 books) |

### Revised Version with Apocrypha (1895)

| | |
| --- | --- |
| workId | `rv` |
| kind | translation |
| language | `en` (archaic British) |
| license | public-domain |
| attribution | Revised Version of the Holy Bible (1895) with Apocrypha. Public domain. Courtesy of eBible.org. |
| versification | eng |
| year | 1895 (this dump dated 2026-08-08) |
| publisher | eBible.org |
| source | https://ebible.org/find/details.php?id=eng-rv |
| usfm | https://ebible.org/Scriptures/eng-rv_usfm.zip |
| path | `corpus/translations/rv/` |
| coverage | 66 proto-canon + deuterocanon (TOB JDT ESG WIS SIR BAR S3Y SUS BEL 1MA 2MA 1ES MAN 2ES) |

## Commentary

HelloAO marks six classics with the [Creative Commons Public Domain Mark](https://creativecommons.org/publicdomain/mark/1.0/) and Tyndale with CC BY-SA 4.0. Entries are keyed to a book + chapter and one or more verse lemmas (`chapter.content[].type === "verse"`), which maps to our required primary `passage`. Henry and Keil–Delitzsch often cover a range (one lemma starts a multi-verse section). HelloAO does not pin the underlying print edition or transcription.

Fetched with `npx tsx scripts/fetch-helloao-commentaries.ts` (7366 chapter files; 16 listed chapter numbers 404'd). About 271 MB.

### Matthew Henry Bible Commentary

| | |
| --- | --- |
| workId | `matthew-henry` |
| kind | commentary |
| language | `en` |
| license | public-domain (CC0 / PD mark) |
| attribution | Matthew Henry, *Exposition of the Old and New Testament* (1708–1710; NT finished by colleagues after his death). Digitisation via HelloAO. |
| tradition | protestant / nonconformist |
| year | 1710 |
| source | https://bible.helloao.org/api/available_commentaries.json |
| path | `corpus/commentary/matthew-henry/` |
| coverage | 65 books, 1167 chapters, 4124 lemmas (HelloAO counts). Missing one proto-canon book in this feed. |

### Jamieson-Fausset-Brown Bible Commentary

| | |
| --- | --- |
| workId | `jfb` |
| kind | commentary |
| language | `en` |
| license | public-domain (CC0 / PD mark) |
| attribution | Robert Jamieson, A. R. Fausset, and David Brown, *Commentary Critical and Explanatory on the Whole Bible* (1871). Digitisation via HelloAO. |
| tradition | reformed / evangelical |
| year | 1871 |
| source | https://bible.helloao.org/api/c/jamieson-fausset-brown/books.json |
| path | `corpus/commentary/jfb/` |
| coverage | 66 books, 1187 chapters, 17056 lemmas |

### Adam Clarke Bible Commentary

| | |
| --- | --- |
| workId | `clarke` |
| kind | commentary |
| language | `en` |
| license | public-domain (CC0 / PD mark) |
| attribution | Adam Clarke, *Commentary and Critical Notes on the Bible* (1810–1826). Digitisation via HelloAO. |
| tradition | methodist |
| year | 1826 |
| source | https://bible.helloao.org/api/c/adam-clarke/books.json |
| path | `corpus/commentary/clarke/` |
| coverage | 57 books, 854 chapters, 13318 lemmas (not a full 66-book set in this feed) |

### John Gill Bible Commentary

| | |
| --- | --- |
| workId | `gill` |
| kind | commentary |
| language | `en` |
| license | public-domain (CC0 / PD mark) |
| attribution | John Gill, *Exposition of the Old and New Testaments* (1746–1763). Digitisation via HelloAO. |
| tradition | baptist / reformed |
| year | 1763 |
| source | https://bible.helloao.org/api/c/john-gill/books.json |
| path | `corpus/commentary/gill/` |
| coverage | 66 books, 1189 chapters, 29707 lemmas |

### John Calvin's Commentaries

| | |
| --- | --- |
| workId | `calvin` |
| kind | commentary |
| language | `en` |
| license | public-domain (CC0 / PD mark) |
| attribution | John Calvin’s commentaries in the Calvin Translation Society English texts. HelloAO notes: CCEL identifies the electronic Calvin commentaries as public domain. This is *not* the *Institutes* (that is scholarship). |
| tradition | reformed |
| year | 19th-c. English (CTS) |
| source | https://bible.helloao.org/api/c/john-calvin/books.json |
| path | `corpus/commentary/calvin/` |
| coverage | 48 books, 817 chapters, 7332 lemmas (Calvin did not comment on every book) |

### Keil and Delitzsch Old Testament Commentary

| | |
| --- | --- |
| workId | `keil-delitzsch` |
| kind | commentary |
| language | `en` |
| license | public-domain (CC0 / PD mark) |
| attribution | C. F. Keil and Franz Delitzsch, *Biblical Commentary on the Old Testament*; English T. & T. Clark, 1860s–1870s. Digitisation via HelloAO. |
| tradition | lutheran / critical |
| year | 1870s (English) |
| source | https://bible.helloao.org/api/c/keil-delitzsch/books.json |
| path | `corpus/commentary/keil-delitzsch/` |
| coverage | OT only: 39 books, 909 chapters, 6516 lemmas |

### Tyndale Open Study Notes

| | |
| --- | --- |
| workId | `tyndale` |
| kind | commentary |
| language | `en` |
| license | CC BY-SA 4.0 |
| attribution | *Tyndale Open Study Notes* © 2019 Tyndale House Publishers. HelloAO JSON conversion changed format only. Official: https://tyndaleopenresources.com/ |
| tradition | evangelical |
| year | 2019 |
| source | https://bible.helloao.org/api/c/tyndale/books.json |
| path | `corpus/commentary/tyndale/` |
| coverage | 69 books, 1243 chapters, 15757 lemmas |
| notes | Share-alike: derivatives must stay CC BY-SA and credit Tyndale. |

### Original Douay-Rheims annotations

| | |
| --- | --- |
| workId | `douay-rheims-notes` |
| kind | commentary |
| language | `en` |
| license | CC0 1.0 |
| attribution | Annotations from the Original Douay-Rheims (NT 1582 / OT 1609). Dataset: [janvier-s/original-douay-rheims](https://github.com/janvier-s/original-douay-rheims) (CC0). |
| tradition | catholic |
| year | 1582/1609 |
| source | https://github.com/janvier-s/original-douay-rheims |
| path | `corpus/commentary/douay-rheims-notes/` |
| coverage | 397 chapter annotation files; verse lemmas with titles (`annotations[].verse`) |
| notes | Repo also includes the original DRA text and USFM (CC0), distinct from eBible’s 1899 American DRA. |

## SWORD modules (binary)

CrossWire raw zips under `corpus/sword/{Module}/`. Each `mods.d/*.conf` says **Public Domain**. These are compressed SWORD (`zCom` / `zLD`), not yet extracted to JSON — need `diatheke` or similar.

| Module | kind | title | notes |
| --- | --- | --- | --- |
| `Barnes` | commentary | Barnes' New Testament Notes | NT only |
| `Wesley` | commentary | John Wesley's Notes on the Bible | |
| `Catena` | commentary | Catena Aurea (Aquinas / Newman 1842) | Gospels |
| `TSK` | commentary | Treasury of Scripture Knowledge | mostly parallel refs |
| `MHCC` | commentary | Matthew Henry's Concise Commentary | abridgement of HelloAO Henry |
| `Easton` | scholarship | Easton's Bible Dictionary (1897) | dictionary |
| `Smith` | scholarship | Smith's Bible Dictionary (1884) | dictionary |
| `Hitchcock` | scholarship | Hitchcock's Bible Names | names glossary |
| `ISBE` | scholarship | International Standard Bible Encyclopedia (Orr, 1915) | encyclopedia |

## Not acquired

### Commentary (cleared, not yet downloaded)

| work | license | source | notes |
| --- | --- | --- | --- |
| unfoldingWord Translation Notes (`en_tn` v90) | CC BY-SA 4.0 | Door43 | Verse-level TSV. Zip/git from this host timed out; retry later. |
| Haydock Catholic Commentary | public-domain (1859) | various | Verse-keyed notes |
| Aquifer / Tyndale Open Study Notes | CC BY-SA 4.0 | BibleAquifer | Same work as HelloAO `tyndale` |

### Commentary (found, license or format not clean enough)

| work | issue |
| --- | --- |
| Geneva Bible notes (CrossWire `Geneva`) | Distribution license is `null` |
| CCEL HTML / ThML / PDF of Henry, Calvin, etc. | Underlying text is PD; CCEL claims copyright on *their* generated files |
| OpenChristianData Hugging Face `commentary` (34 works, CC0 publication) | Compilation is CC0; their *code* is CC BY-NC; edition/transcription still needs a per-work check |
| Robertson’s Word Pictures (1930–33) | US copyright status is messy; do not take without a PD determination |
| NICOT/NICNT, IVP, Constable, Bible.org notes, NET notes | Copyrighted |
| HelloAO `api.zip` / `bible.db` | Fine to use later; 1.5–11 GB includes much we do not need |

### Scholarship (`kind: scholarship`)

Works that discuss Scripture without being commentary on one range (dictionaries, systematic theologies, histories). Chunks may omit `passage`; they still may list `references`.

| work | reason |
| --- | --- |
| Calvin’s *Institutes* | Need structured plaintext/JSON, not only CCEL HTML |
| Easton, Smith, Hitchcock | Have SWORD binaries in `corpus/sword/`; not extracted yet |
| unfoldingWord Translation Words (`en_tw` v90) | CC BY-SA 4.0; Door43 unreachable this pass |

### Other translations

| work | reason |
| --- | --- |
| NASB, NET, Amplified, ESV, … | Copyrighted; out of scope |

## Adding a work

1. Confirm public-domain or explicit license; set `kind` correctly (do not file a theology or dictionary as commentary).
2. Translations: download `https://ebible.org/Scriptures/{ebibleId}_usfm.zip` into `corpus/translations/{workId}/` (keep `copr.htm`).
3. Commentary: prefer HelloAO JSON (`npx tsx scripts/fetch-helloao-commentaries.ts`) or a CrossWire module whose Distribution License is Public Domain. Scholarship: store under `corpus/scholarship/` with the license file.
4. Add a section here with the Work fields from DESIGN.md, including a retrieval URL (`usfm` or `source`) so the work can be re-fetched without git.
