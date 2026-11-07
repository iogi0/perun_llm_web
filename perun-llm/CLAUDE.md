# CLAUDE.md: Perun LLM Web

## Purpose
Frontend MVP of **Perun LLM**, a ChatGPT-style chat UI for a bachelor's thesis. It runs on the author's laptop against a **mock**. Later, a Python/FastAPI backend (local LLMs on PERUN, possibly RAG) plugs in through `src/api/`.

`plan.md` is the blueprint. Check it before starting a phase and follow its scope.

## Stack
Vite · React · TypeScript (strict) · Tailwind CSS v4 · react-markdown + remark-gfm + rehype-highlight · lucide-react · Onest (Fontsource) · Vitest + Testing Library · Playwright + axe.

**No router, no component library, no state library.** Overlays use the native `<dialog>`.

## Architecture rules
- Layers: `components/` (UI only) → `chat/ChatContext.tsx` (`useChat()`) → `chat/chatReducer.ts` (pure) and `chat/storage.ts` → `api/` (`ChatApi` interface + implementations).
- **Components never import from `api/`.** Only `ChatContext.tsx` calls `getChatApi()`.
- `api/` and `chat/chatReducer.ts` contain no React code.
- Shared types live only in `src/types.ts`. Do not redefine them elsewhere.
- Environment variables are read only in `src/config.ts`.
- Reducer actions always carry `conversationId`. State changes go through the reducer, never by mutation.
- The mock must stay labelled: assistant messages carry `origin: "mock"` and show the "Demo reply" badge. Never make mock output look like a real model answer.
- **Prepare, don't pre-build.** Add fields, events or endpoints (sources, model, auth, attachments) only when the backend actually provides them, and bump the storage `version` with a migration when the persisted shape changes.

## Code conventions
- Function components and named exports. One component per file, named like the file (`MessageItem.tsx`).
- Keep files under ~200 lines. Split by responsibility, not by layer.
- Style with Tailwind utilities plus the CSS variables in `styles.css`. **No raw hex colours in components.**
- Avoid `any`. Narrow `unknown` with type guards (for example, data loaded from storage).
- Unit tests sit next to the code (`*.test.ts(x)`). E2E tests go in `tests/e2e/`.
- UI copy uses sentence case. Errors state what happened and what to do, and don't apologise.

## Security rules
- All client code and `VITE_*` variables are public. **Never put secrets, API keys or credentials in the frontend.**
- Never use `dangerouslySetInnerHTML`, `rehype-raw` or any HTML passthrough.
  - User text renders as plain text.
  - Assistant text renders through `Markdown.tsx` only. Keep its URL sanitising; `img` renders no `<img>`; links get `rel="noopener noreferrer"`.
- Never store tokens or credentials in `localStorage`. Future auth uses HttpOnly cookies issued by FastAPI.
- No third-party runtime requests (no CDNs, analytics or remote fonts).
- Frontend validation is UX only. The backend must validate and authorise everything. CORS is not authentication.
- Do not weaken or bypass these rules to make something work. Raise the problem instead.

## UI/UX principles
- Calm, minimal and cool-toned. The Perun hexafoil logo is the only decorative element.
- No gradients, glass, card grids, heavy shadows or all-caps labels.
- Motion only for the drawer, typing dots and streaming caret. Each lasts 200 ms or less and respects `prefers-reduced-motion`.
- Message column max 46rem. Keyboard accessible, with a visible focus ring, `aria-label` on icon buttons, and AA contrast in light and dark.
- Mobile: drawer navigation, `100dvh` with safe-area insets, no page-level horizontal scroll (code and tables scroll inside their own container).

## Dependencies
- Do not add a dependency without stating why existing code or the platform can't do the job. Prefer native APIs.
- Pin exact versions and commit the lockfile. Never add a dependency just because a popular chat app uses it.

## Working rules
- Inspect existing code before changing it. Reuse before creating, and don't duplicate logic.
- Change only what the task needs. No unrelated refactors, renames or formatting sweeps.
- Do not touch files outside this project (for example, thesis/PERUN scripts).
- Stay within the current phase in `plan.md`. Ask before expanding scope.

## Verification (before saying "done")
- Run `npm run typecheck && npm run lint && npm run test && npm run build`. For UI changes, also run `npm run test:e2e`.
- Report the commands you ran and their output. "It renders" is not verification; test the actual behaviour.
- Bug fixes start with a failing test.
