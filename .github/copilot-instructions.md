# Copilot / AI Agent instructions — Letrix (projeto-integrador-1)

Purpose: quickly orient an AI coding agent to edit, extend, and debug the Letrix web app.

1) Big picture
- Project is a static PWA frontend under `LetrixV2/` (HTML/CSS/JS). There is no Node build step.
- Main components:
  - UI pages: `LetrixV2/index.html`, `jogar.html`, `memoria.html`, `drag.html`, `dashboard.html`.
  - Mini-games: `LetrixV2/js/game-palavras.js`, `game-drag.js`, `game-memoria.js` (self-contained JS modules manipulating DOM).
  - Data: `LetrixV2/palavras.js` exports `CONTEUDO_TXT` used by `game-palavras.js`.
  - Persistence: `LetrixV2/js/db.js` (IndexedDB, store `partidas`) and `LetrixV2/js/dashboard.js` (aggregated stats in `localStorage`).
  - PWA: `LetrixV2/manifest.json` and `LetrixV2/sw.js` (service worker caches a static asset list defined in `ASSETS_TO_CACHE`).

2) Coding patterns & conventions (project-specific)
- Variable/function names are in Portuguese (e.g. `salvarPartida`, `trackSpellingWord`, `CONTEUDO_TXT`). Keep names consistent.
- Scripts rely on global functions/variables and DOM element IDs; changes must preserve the global API or update all call sites in HTML/other JS files.
- Persistence split: use `db.js` for detailed records (IndexedDB) and `dashboard.js` for lightweight aggregated stats (localStorage). Don't conflate them.
- No bundler/ES modules: files are loaded directly via `<script>` tags; avoid introducing module imports unless you update HTML script tags.

3) Key integration points to be careful about
- `game-palavras.js` expects `CONTEUDO_TXT` from `LetrixV2/palavras.js` — editing the data format requires updating the parsing in `initWords()`.
- `game-*.js` files call `salvarPartida()` (from `js/db.js`) and `trackSpellingWord()` / `trackDragAttempt()` / `trackMemoryAttempt()` (from `js/dashboard.js`). Changing function signatures will break cross-file calls.
- `sw.js` contains the cached asset list (`ASSETS_TO_CACHE`). Add new static files to this array when adding assets, and bump `CACHE_NAME` to force update.

4) Debugging & developer workflows
- No build step: run a local static server and open `LetrixV2/index.html`.
  - Example quick servers:
    ```bash
    # Node (http-server)
    npx http-server LetrixV2 -c-1 -p 8000

    # Python 3
    python -m http.server 8000 --directory LetrixV2
    ```
- For PWA/service-worker changes: open DevTools > Application > Service Workers and `Unregister` old worker; clear caches under Application > Clear storage. Also clear IndexedDB / localStorage if persistence changes.
- To inspect stored game records: DevTools > Application > IndexedDB > `LetrixDB` → `partidas`. Aggregated stats live in `localStorage` under key `letrix_stats`.

5) When adding features
- Keep global API compatibility: if you add a new tracking call, add a no-op in `dashboard.js` to avoid runtime errors until fully wired.
- If you change DOM IDs used by games (e.g. `word-slots`, `letter-grid`, `btn-confirm`), update all references across `LetrixV2/*.html` and `LetrixV2/js/*`.
- Update `sw.js` and `manifest.json` when you add or rename public assets.

6) Examples (copyable snippets)
- Save a detailed match record (use `db.js` helpers):
  ```javascript
  // inside a game file after a round
  salvarPartida({ jogo: 'Letrix Palavras', resultado: 'Vitória', tempo: 12, detalhes: 'Palavra: CASA' });
  ```
- Update aggregated stats:
  ```javascript
  // call provided function in dashboard.js
  trackSpellingWord(true, true, false, 12, 'Animais');
  ```

7) Files to inspect when editing behavior/UI
- Layout & entry points: `LetrixV2/index.html`, `jogar.html`, `dashboard.html`.
- Game logic: `LetrixV2/js/game-palavras.js`, `game-drag.js`, `game-memoria.js`.
- Persistence: `LetrixV2/js/db.js`, `LetrixV2/js/dashboard.js`.
- Data & assets: `LetrixV2/palavras.js`, `LetrixV2/assets/`, `LetrixV2/css/`.

8) What I cannot discover from repo contents
- No automated tests or CI configured; assume manual browser testing required.
- `Letrix.sql` appears to be a database dump (server-side import) but is not used by the client-side app directly.

If any section is unclear or you'd like examples expanded (e.g. a short checklist for adding a new game), tell me which part to expand and I will iterate.
