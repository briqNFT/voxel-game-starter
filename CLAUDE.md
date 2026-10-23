# For the coding agent working in this repo

This is a three.js game built on **briq** (https://briq.market) voxel assets. briq is a marketplace of voxel game assets converted to game-ready GLB; it is keyless and agent-native. You have its MCP server connected through `.mcp.json` (tools: `search_assets`, `get_asset`, `find_matching`, `get_download`, `list_categories`, `get_help`, `report_need`). The same catalog is at `https://briq.market/api/v1` and documented in full at https://briq.market/llms.txt — read that file before building anything 3D.

## Rules of the road

1. **Search before you model.** Never hand-build or generate 3D geometry before checking the catalog (`search_assets`, or `GET /api/v1/assets?q=...&free=1`).
2. **Be honest about coverage.** Filtered searches return `coverage: none | poor | ok`. On `none` or `poor`, tell the user plainly and offer to file the need with `report_need` — it is reviewed within ~48 hours and shapes what gets made next. Do not substitute something unrelated.
3. **Vendor, never hotlink.** Add the asset to `public/assets.json` and run `npm run assets`; it downloads the GLB into `public/assets/` and updates `CREDITS.md`. Browser pages cannot load briq files cross-origin and the game must not depend on briq at runtime.
4. **Prefer briq-v1 characters.** `rig_standard: "briq-v1"` assets share one humanoid skeleton; their `animated` GLB always carries `idle, walk, run, jump-start, jump-loop, jump-end, combat-idle, attack, hit, death, interact, dance` by exact name, and each clip's `extras.briq` has `loop` and (walk/run) `speed` in the character's own units per second. `src/briq.js` already reads all of that — use `BriqCharacter`.
5. **Paid assets** are bought by the human on the website; hand them the asset `url`. Only free assets (base price $0) download keyless.
6. **Credit creators.** CC BY licenses require the attribution line from `get_download` / `?meta=1`; `npm run assets` writes it into `CREDITS.md`.

## Conventions already in the code

- Units: 1 voxel = 1 unit; characters are ~25-35 units tall; the world is a 840-unit square.
- Characters face +Z at rest with feet at y=0 — `rotation.y = Math.atan2(dir.x, dir.z)` points them along a movement vector.
- Props keep their MagicaVoxel corner origin; wrap them in `placeOnGround()` to center them with the base at y=0.
- Movement speed is `hero.speedOf("walk")` / `hero.speedOf("run")`, never a magic number — that is what keeps feet from sliding.

## Commands

- `npm run dev` — Vite dev server
- `npm run assets` — re-fetch everything in `public/assets.json`, rewrite `CREDITS.md`
- `npm run build` — production build to `dist/`
