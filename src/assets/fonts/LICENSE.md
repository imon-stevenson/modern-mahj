# Bundled fonts

All three families are licensed under the SIL Open Font License, Version 1.1,
which permits bundling and redistribution with this app. Full license text:
<https://openfontlicense.org/open-font-license-official-text/>

| File | Family | Copyright |
| --- | --- | --- |
| `manrope-variable-latin.woff2` | [Manrope](https://fonts.google.com/specimen/Manrope) | Copyright 2018 The Manrope Project Authors |
| `ibm-plex-mono-500-latin.woff2`, `ibm-plex-mono-600-latin.woff2` | [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) | Copyright 2017 IBM Corp. |
| `noto-sans-sc-tiles.woff2` | [Noto Sans SC](https://fonts.google.com/noto/specimen/Noto+Sans+SC) | Copyright 2014-2021 Adobe (http://www.adobe.com/) |

## How these were produced

Latin faces are the `latin` subsets served by the Google Fonts CSS API
(`latin-ext` is deliberately omitted — the UI is English-only).

`noto-sans-sc-tiles.woff2` is a **16-glyph subset**, not the full CJK face,
requested via the API's `&text=` parameter. It contains exactly the characters
the tile faces render: the crak numerals 一二三四伍六七八九, 萬, the winds
東南西北, and the dragons 發中 (see `CRAK_CHARS` / `WIND_CHARS` in
`src/components/Tile.tsx`). The full family is several megabytes; this is 2.7 KB.

**If a tile ever renders a new CJK character, this subset must be regenerated**
or that glyph will silently fall back to a system font. Re-derive the glyph set
from source rather than hand-listing it, and update the `unicode-range` on the
`@font-face` rule in `src/index.css` to match.
