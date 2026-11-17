# Lumen Tide

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/silver-finch-59/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/silver-finch-59/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A complete, original 2D arena-defence game for the web, built for
make.fun's **best-game-01** ("Make the best game").

You are the Keeper of a small light on a night tide. Hold the light through
5 waves of gloom — drifters, darters and spitters — and beat the Gloomwarden
in wave 5 to win. Catch hearts, triple shot and shields; every foe you light
scores, and your best score is kept between visits.

## Play

```sh
node serve.ts
# open http://localhost:8080
```

- **Move:** WASD or arrow keys
- **Aim:** mouse
- **Fire:** hold click or Space
- **Pause:** P or Esc · **Mute:** M · **Restart:** R (on end screens)

## Build the entry

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/`
to the output directory and writes `dossier.json` with the kit's vendored
`vendor/makefun-game.ts`. Screenshots are real renders of the game's own
`?shot=` scenes in a browser: `1-start` (title), `2-play` (wave 2),
`3-boss` (the Gloomwarden), `4-win` (victory).

## Files

- `game/index.html` — the page; `game/src/main.js` — boot and game loop
- `game/src/world.js` — rules: waves, enemies, boss, pickups, score, win/loss
- `game/src/render.js` — canvas drawing, HUD, panels, boss bar
- `game/src/config.js` — all tuning numbers and colours
- `game/src/input.js` — keyboard and mouse · `game/src/audio.js` — WebAudio bleeps
- `game/src/random.js` — seeded RNG · `game/src/shots.js` — screenshot scenes
- `main.ts`, `serve.ts`, `vendor/makefun-game.ts` (kit copy, unchanged)

License: MIT. See `LICENSE`.
