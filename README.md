# voxel-game-starter

A tiny three.js game built entirely on free [briq](https://briq.market) voxel assets: an animated character, a small sci-fi outpost, and a collect-the-energy-cells loop. Clone it, run it, then point your coding agent at it and ask for more.

```
npm install
npm run dev
```

Open the URL Vite prints. WASD / arrows to move, Shift to run, Space to jump.

## Where the assets come from

Every 3D thing on screen is a [briq](https://briq.market) asset, listed in [`public/assets.json`](public/assets.json) by id and vendored into `public/assets/`. Creators are credited in [`CREDITS.md`](CREDITS.md) — the CC BY licenses ask for that line to ship with your game.

`npm run assets` re-fetches them from briq's permanent, keyless download URLs and rewrites `CREDITS.md`. To swap the character, change `character.id` in `assets.json` to any asset with `rig_standard: "briq-v1"` and run it again — the clip names (`idle`, `walk`, `run`, `jump-start`, …) and the walk/run speeds come from the GLB, so the game code does not change.

## Let your agent use briq

briq is agent-native: a keyless read-only API, an MCP server, and an `llms.txt`. This repo ships a [`.mcp.json`](.mcp.json), so Claude Code picks the briq server up automatically, and a [`CLAUDE.md`](CLAUDE.md) that tells the agent how to use it. For any other client, one command:

```
claude mcp add --transport http briq https://briq.market/mcp
```

Then ask for things: *"add a second character that patrols between the ships"*, *"find a vehicle the orc can drive"*, *"replace the energy cells with a real briq prop"*. The agent searches the catalog first, vendors what it finds, and tells you honestly when the catalog has nothing — and can file the request so it gets made.

Full reference for agents: https://briq.market/llms.txt · Developers page: https://briq.market/developers

## What is in the box

| | |
|---|---|
| `src/main.js` | the game: scene, outpost layout, movement, jump, cells, camera |
| `src/briq.js` | the briq conventions in code: units, `placeOnGround`, `BriqCharacter` (clips by name, `extras.briq` speed and loop) |
| `public/assets.json` | the asset manifest — ids, variants, file names |
| `scripts/fetch-assets.mjs` | `npm run assets` |
| `.mcp.json` / `CLAUDE.md` | your coding agent's briq setup |

Code is MIT. Assets belong to their creators under the licenses in `CREDITS.md`.
