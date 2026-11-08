# Perun LLM Web — Implementation Plan

> **For agentic workers:** implement phase by phase (superpowers:executing-plans or subagent-driven-development). Steps use `- [ ]` checkboxes. Read `CLAUDE.md` first; it holds the permanent rules this plan assumes.

**Goal:** A polished, simple AI chat frontend (MVP) that works today against a clearly labelled mock and later connects to a Python/FastAPI backend by swapping one file.

**Architecture:** Vite + React SPA. UI components → one chat context (`useReducer`, persisted to `localStorage`) → a small `ChatApi` interface whose MVP implementation is a mock. The interface already streams and supports cancellation, so the future FastAPI client fits without UI changes.

**Tech stack:** Vite, React, TypeScript (strict), Tailwind CSS v4, react-markdown + remark-gfm + rehype-highlight, lucide-react, Vitest + Testing Library, Playwright + @axe-core/playwright.

---

## 1. Project overview and goals

**Perun LLM** is a ChatGPT-style assistant, developed as part of a bachelor's thesis. In the future, the backend (FastAPI in front of local LLMs on the PERUN supercomputer, possibly with RAG) will generate answers. That backend is **out of scope**: this repository is only the web frontend, developed and hosted on the author's laptop.

MVP goals:

1. A modern, calm chat UI with excellent typography and a high-quality composer.
2. Conversations: create, list, switch, delete, persisted locally.
3. Sending messages, with Markdown and highlighted, copyable code blocks in replies.
4. Loading, stopped and error states.
5. Desktop and mobile layouts.
6. A service seam so FastAPI can be connected later without rewriting UI.

## 2. Current repository analysis

Inspected 2026-11-07:

| Found | Notes |
|---|---|
| No `package.json`, no source code, no config, no git | Greenfield: no framework or styling to preserve |
| `plan.md` (previous version) | **Replaced by this file.** The old plan had a welcome/registration screen, guest sessions, React Router, shadcn/ui, a "Clear history" button, and no Markdown or delete. This brief drops or changes those (see §20, Assumptions). |
| `experiment_config.yaml`, `serve_model.sh`, `freeze_experiment.py` | Thesis/PERUN backend files, **unrelated to this web app**. Do not touch them, and do not keep them in the web repo. |
| Node 22, npm 10 | Constraint: use tooling that supports Node 22. |

**Action before Phase 1:** put `plan.md` and `CLAUDE.md` in a new, empty folder `perun-llm-web/` and scaffold there. Every path below is relative to that folder.

## 3. Recommended technology stack

| Choice | Why (not just popular) |
|---|---|
| **Vite + React + TypeScript (strict)** | Client-only app with no SSR needs. Instant dev server, and the static build is easy to run on a laptop. *Next.js rejected*: its server features would duplicate the FastAPI backend and add hydration issues with `localStorage`. |
| **No router** | One screen. The active conversation lives in state. Per-conversation URLs add little while history is only local. |
| **Tailwind CSS v4** | Design tokens as CSS variables, consistent spacing, no CSS sprawl. |
| **No component library** (no shadcn/Radix) | The only overlays are a mobile drawer and a delete confirmation. The native `<dialog>` element gives focus trapping and Escape handling for free. This means fewer dependencies and code a student can read. |
| **react-markdown + remark-gfm** | Safe by default: no raw HTML rendered, unsafe URLs neutralised. GFM adds tables and lists. |
| **rehype-highlight** (highlight.js, limited language set) | Lighter than Shiki or Prism wrappers; themeable with our tokens. |
| **lucide-react** | Small, tree-shaken icons. |
| **@fontsource-variable/onest** | One self-hosted typeface (no Google Fonts requests). Code uses the system monospace stack. |
| **Context + `useReducer`** | Small state with predictable transitions. No state library needed. |
| **Vitest, Testing Library, Playwright, axe** | Unit tests for logic, real-browser behaviour, accessibility. |

Pin exact versions at install and commit the lockfile.

## 4. Proposed architecture

```
components/*  ──props / useChat()──▶  chat/ChatContext.tsx  ──▶ chat/chatReducer.ts (pure)
   (UI only)                          │  orchestrates send/stop │
                                      │  persists via           ▼
                                      │  chat/storage.ts ──▶ localStorage
                                      ▼
                                 api/chatApi.ts  (interface + factory, reads config.ts)
                                   ├── api/mockChatApi.ts   [MVP]
                                   └── api/httpChatApi.ts   [FUTURE: FastAPI]
```

Rules: components never import from `api/`. Only `ChatContext.tsx` calls the API. `api/` contains no React.

## 5. Minimal folder structure

```
perun-llm-web/
├── plan.md  CLAUDE.md  README.md
├── index.html  package.json  vite.config.ts  tsconfig.json  eslint.config.js  playwright.config.ts
├── .env.example             # VITE_API_MODE=mock, VITE_API_BASE_URL=/api
├── public/favicon.svg
├── src/
│   ├── main.tsx             # mounts <App/>, imports styles + font
│   ├── App.tsx              # layout: sidebar (desktop) / drawer (mobile) + ChatView
│   ├── config.ts            # reads and validates import.meta.env
│   ├── types.ts             # Message, Conversation, ChatRequest, ChatStreamEvent
│   ├── styles.css           # Tailwind, tokens, highlight theme
│   ├── components/
│   │   ├── Logo.tsx
│   │   ├── Sidebar.tsx      # new chat, history list, delete
│   │   ├── ChatView.tsx     # header, empty state, MessageList, Composer
│   │   ├── MessageList.tsx  # scrolling + auto-scroll
│   │   ├── MessageItem.tsx  # user vs assistant, status notes, Demo badge
│   │   ├── Markdown.tsx     # react-markdown config (safe)
│   │   ├── CodeBlock.tsx    # language label + copy
│   │   ├── Composer.tsx
│   │   └── ConfirmDialog.tsx
│   ├── chat/
│   │   ├── chatReducer.ts   # state, actions, deriveTitle()
│   │   ├── ChatContext.tsx  # provider + useChat()
│   │   └── storage.ts       # versioned load/save
│   └── api/
│       ├── chatApi.ts       # ChatApi interface + getChatApi()
│       └── mockChatApi.ts
└── tests/e2e/               # chat.spec.ts, layout.spec.ts
```

That is about 18 source files. Unit tests sit next to the code (`*.test.ts(x)`). Do not add folders without a concrete need.

## 6. Main components and responsibilities

| Component | Responsibility |
|---|---|
| `App` | Two-column grid on desktop. On mobile, `Sidebar` inside a `<dialog>` drawer. Owns `drawerOpen`. |
| `Sidebar` | Logo, **New chat**, history sorted by `updatedAt` desc (active item has `aria-current="true"`), delete icon on hover/focus (always visible on touch) → `ConfirmDialog`. |
| `ChatView` | Mobile top bar (menu button, title), `EmptyState` or `MessageList`, `Composer`, demo notice. |
| `MessageList` | `role="log"`. Auto-scrolls only if the user is within 120 px of the bottom. |
| `MessageItem` | User: right-aligned bubble, plain text. Assistant: left, no bubble, rendered by `Markdown`. Shows a **"Demo reply"** badge when `origin === "mock"`, a "Stopped" note, or an error with **Retry**. |
| `Markdown` | Plain react-markdown + remark-gfm + rehype-highlight. Custom `code`, `a` and `img` renderers (§15). |
| `CodeBlock` | Language label + **Copy** button ("Copied" for 2 s). Scrolls horizontally inside itself. |
| `Composer` | Auto-growing textarea (1–8 lines), Send/Stop button, character limit. |
| `ConfirmDialog` | Native `<dialog>`: "Delete conversation?", with "This can't be undone." and Cancel/Delete buttons. |

## 7. Message and conversation data models

```ts
// src/types.ts
export type Role = "user" | "assistant";
export type MessageStatus = "complete" | "streaming" | "stopped" | "error";

export interface Message {
  id: string;                 // crypto.randomUUID()
  role: Role;
  content: string;            // user: plain text; assistant: Markdown
  createdAt: string;          // ISO 8601
  status: MessageStatus;
  origin?: "mock" | "api";    // assistant only; drives the "Demo reply" badge
  error?: string;             // user-facing text when status === "error"
}

export interface Conversation {
  id: string;
  title: string;              // "New chat" until the first user message
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}
```

Persisted under `localStorage["perun-llm:v1"]` as `{ version: 1, conversations: Conversation[], activeId: string | null }`.

Future fields such as `sources`, `model` and `attachments` are **not added now**. They arrive with a `version: 2` migration when the backend sends them.

## 8. State management approach

```ts
interface ChatState {
  conversations: Conversation[];          // kept sorted by updatedAt desc
  activeId: string | null;
  streaming: { conversationId: string; messageId: string } | null;
}
type ChatAction =
  | { type: "hydrated"; state: ChatState }
  | { type: "conversationCreated"; conversation: Conversation }
  | { type: "conversationOpened"; id: string }
  | { type: "conversationDeleted"; id: string }
  | { type: "userMessageAdded"; conversationId: string; message: Message }
  | { type: "assistantStarted"; conversationId: string; message: Message }
  | { type: "assistantDelta"; conversationId: string; messageId: string; text: string }
  | { type: "assistantFinished" | "assistantStopped"; conversationId: string; messageId: string }
  | { type: "assistantFailed"; conversationId: string; messageId: string; error: string };
```

- The reducer is pure and fully unit-tested. Actions always carry `conversationId`, so a stream writes into its own conversation even after the user switches away.
- `useChat()` exposes `state` plus `newChat()`, `openChat(id)`, `deleteChat(id)`, `send(text)`, `stop()`, `retry(messageId)`.
- **One stream at a time.** Send is disabled elsewhere while streaming.
- Deleting the streaming conversation aborts its stream first.
- `newChat()` reuses the active conversation if it is still empty.
- `deriveTitle(text)`: first line, whitespace collapsed, at most 48 characters, cut at a word boundary with "…"; empty text gives "New chat".
- **Persistence** (`storage.ts`):
  - `load()` validates the data and never throws. Corrupt or unknown data gives an empty state. Messages still marked `streaming` are loaded as `stopped`.
  - `save(state)` is debounced by 300 ms, with an immediate save when a reply finishes. It wraps writes in `try/catch`. If storage is full or blocked, the app keeps working in memory and shows one notice: "History can't be saved in this browser."
  - Keep at most 100 conversations, dropping the oldest.

## 9. API/service abstraction

```ts
// src/types.ts
export interface ChatRequest {
  conversationId: string;
  messages: { role: Role; content: string }[];   // full history, oldest first
}
export type ChatStreamEvent =
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; message: string; retryable: boolean };

// src/api/chatApi.ts
export interface ChatApi {
  readonly origin: "mock" | "api";
  streamReply(req: ChatRequest, signal: AbortSignal): AsyncIterable<ChatStreamEvent>;
}
export function getChatApi(): ChatApi;   // picks the implementation by config.apiMode
```

**Why streaming and an `AbortSignal` from day one:** retrofitting streaming is what usually forces a UI rewrite. A non-streaming backend can still satisfy this interface by yielding one `delta` and then `done`.

`src/config.ts` exports `{ apiMode: "mock" | "http", apiBaseUrl: string }`:

- built from `VITE_API_MODE` (default `mock`) and `VITE_API_BASE_URL` (default `/api`);
- unknown values throw at startup with a clear message.

## 10. Mock API strategy

`mockChatApi.ts` has `origin: "mock"`.

**Timing:** wait 500 ms (the typing indicator shows), then yield the reply in 3–8 character chunks every 20 ms. Abort ends the stream immediately.

**Reply copy (exact):**

````md
**Demo reply.** No language model is connected yet, so this is a placeholder.

You wrote:
> {user text, first 300 chars}

Code blocks will look like this:

```python
print("Hello from Perun LLM")
```
````

This exercises the Markdown and code-block paths and never imitates a real answer.

**Error simulation** (only when `import.meta.env.DEV` or in test mode): a message that starts with `/error` yields `{ type: "error", message: "The server could not be reached.", retryable: true }`. This lets you test error UI and Retry.

## 11. Future FastAPI integration (not built now)

To connect, add `src/api/httpChatApi.ts` (with an SSE parser and its tests), set `VITE_API_MODE=http`, and make no UI changes.

**Contract proposal:**

| Method | Path | Body / response |
|---|---|---|
| `GET` | `/api/health` | `{ status: "ok", models: string[] }` |
| `POST` | `/api/chat` | Body: `{ conversation_id, messages: [{ role, content }] }` → `text/event-stream` with events `delta {text}`, `done {}`, `error {message, retryable}` |

**Client behaviour:**

- `fetch` POST with `signal`, reading the body as a `ReadableStream`. `EventSource` can't POST.
- A non-2xx status, a dropped connection or a timeout (no bytes for 60 s) maps to an `error` event with a friendly message.
- `AbortError` maps to "Stopped", not an error.

**Dev and laptop hosting:** use the Vite proxy (`server.proxy` and `preview.proxy`: `/api` → `http://localhost:8000`). The browser then sees one origin, so **no CORS is needed**. CORS matters only if the frontend and API are deployed on different origins (§15).

**Future authentication:**

- FastAPI issues an `HttpOnly; Secure; SameSite=Lax` session cookie, and the frontend sends `credentials: "include"`. Tokens are **never** kept in `localStorage`.
- When a server holds conversations, `ChatContext` loads from the API instead of `storage.ts`. The `ChatApi` interface gains list/delete methods only at that point.

## 12. Future streaming support

The UI streams already, against the mock. With the backend, FastAPI returns a `StreamingResponse` with `media_type="text/event-stream"`, and the vLLM token stream is forwarded as `delta` events.

On the client:

- `httpChatApi` parses lines into `ChatStreamEvent`.
- Deltas are batched with `requestAnimationFrame` if rendering becomes slow.
- Markdown re-renders while streaming. An unclosed code fence renders as a code block until it closes, and that is acceptable.

## 13. Future RAG and citation support

When the backend adds retrieval:

1. Add `{ type: "sources"; sources: { n: number; title: string; url?: string; snippet: string }[] }` to `ChatStreamEvent`.
2. Add `Message.sources?`, with a storage `version: 2` migration.
3. Add a `Sources` list under assistant messages, and render `[n]` markers in the text as links to it.

Model selection and generation settings work the same way: add optional `model` and `settings` to `ChatRequest` and a small selector in `ChatView`, but only when the backend supports them.

Document text and prompts stay on the backend. The frontend only displays what it receives.

## 14. UI/UX requirements

**Character.** Calm, cool-toned, academic. The one distinctive element is the **Perun logo**: a hexafoil "thunder mark" line icon with an amber centre dot, used in the sidebar, the empty state and as the assistant avatar.

**Avoid:** gradients, glass, card grids, big shadows, all-caps labels, and decorative animation.

**Tokens** (CSS variables in `styles.css`, light / dark via `prefers-color-scheme`):

| Token | Light | Dark | Use |
|---|---|---|---|
| `--canvas` | `#FCFCFC` | `#161719` | Chat background |
| `--sidebar` | `#F4F4F5` | `#111214` | Sidebar, drawer |
| `--surface` | `#FFFFFF` | `#1F2023` | Composer, dialogs, code-block header |
| `--bubble` | `#EDEEF0` | `#27292C` | User bubble, hovered history item |
| `--code` | `#F6F6F7` | `#1C1D1F` | Code block body |
| `--ink` | `#191B1F` | `#EAEBED` | Text |
| `--ink-muted` | `#61656B` | `#9EA1A6` | Secondary text |
| `--line` | `#E4E5E7` | `#2D2F32` | 1 px borders |
| `--accent` | `#3346C2` | `#8593FF` | Send button, focus ring, active item, links |
| `--spark` | `#D9A21B` | `#E8B931` | Logo dot only |
| `--danger` | `#B42318` | `#F97066` | Delete, errors |

Neutral values were chosen at the design checkpoint: 60% of the way from the original cool palette to neutral grey.

Composer shadow: `0 2px 12px` at 6% opacity in light and 18% in dark.

Write a small highlight.js theme that maps `.hljs-*` classes to five token-derived colours: keyword `--accent`, title 55% `--accent` + `--ink`, string 65% `--danger` + `--ink`, number `--danger`, comment `--ink-muted`.

**Typography:**

- Onest throughout. Message text 16 px with line-height 1.65.
- UI text 15 px, small text 13 px. The empty-state greeting is 28 px at weight 500.
- Code: 14 px in the system monospace stack.
- Message column max width 46rem. Sentence case everywhere.

**Empty state:** the logo, the greeting "How can I help you today?", and one muted line, "Answers come from a demo responder until a model is connected."

**Composer:**

- Placeholder "Message Perun LLM…".
- **Enter** sends and **Shift+Enter** adds a new line. Nothing is sent during IME composition (`isComposing`).
- On touch devices (`pointer: coarse`), Enter adds a new line and sending is via the button.
- Send is disabled when the trimmed text is empty or a reply is streaming. While streaming, the button becomes **Stop**.
- Limit 8,000 characters. A counter appears above 7,000.
- Focus returns to the textarea after sending (desktop).

**Loading states:** three-dot typing indicator until the first delta, then a blinking caret while streaming.

**Motion:** drawer slide, typing dots and caret only. Each is 200 ms or less and switched off under `prefers-reduced-motion`.

**Shape:** composer radius 16, user bubble 18, buttons 10, list items 8. One subtle shadow, on the composer only.

**Accessibility:**

- Visible 2 px accent focus ring.
- Icon buttons have `aria-label`s ("New chat", "Delete conversation", "Copy code", "Send message", "Stop generating", "Open menu").
- Contrast meets WCAG AA in both themes.

## 15. Security considerations

**Frontend (enforced in this MVP):**

- **All client code is public.** No API keys, secrets or credentials anywhere, and nothing secret in `VITE_*` variables (Vite inlines them into the bundle). `.env.example` contains only mode and base URL.
- **XSS:**
  - Never use `dangerouslySetInnerHTML`, `rehype-raw` or any HTML passthrough.
  - User messages render as plain text.
  - Assistant Markdown goes through react-markdown, with its default URL sanitising kept (`javascript:` and `data:` links neutralised).
  - Links open with `target="_blank" rel="noopener noreferrer"`.
  - **Images in Markdown are not loaded.** Render the alt text or a link instead, to avoid tracking pixels and unexpected requests.
- **Input validation** (for UX only): trim, block empty messages, limit to 8,000 characters. Validate parsed storage data before use.
- **No third-party runtime requests:** self-hosted font, no CDNs, no analytics.
- **Local data:** history in `localStorage` is unencrypted and readable by anyone using that browser profile. The empty state and README say so. Store no tokens or credentials there, ever.
- **Copy button:** `navigator.clipboard` works only in secure contexts. On `http://<laptop-ip>` (LAN hosting), fall back to selecting the code and showing "Press Ctrl+C to copy".
- **Recommended CSP** (documented in the README for hosting): `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'`.

**Backend (future: FastAPI's responsibility, not the frontend's):**

- **Frontend checks are not security.** FastAPI must validate every request with Pydantic: roles, lengths, message count and request size.
- **Authorization** happens on the server, for every conversation and document. Hiding UI is not access control.
- **CORS is not authentication.** It only tells browsers which origins may read responses. If the frontend and API are on different origins:
  ```python
  app.add_middleware(CORSMiddleware,
      allow_origins=settings.frontend_origins,   # explicit list from env, never "*" with credentials
      allow_methods=["GET", "POST", "DELETE"],
      allow_headers=["Content-Type"],
      allow_credentials=True)                    # only once cookie auth exists
  ```
- **Other server-side duties:** rate limiting, timeouts and log hygiene (no prompts in logs without consent).
- **Future file attachments:** validate type and size on the server, parse in an isolated process with timeouts, and store outside the web root. Treat document text as untrusted, because it can carry prompt injection.

## 16. Responsive design

| Width | Layout |
|---|---|
| ≥ 1024 px | Sidebar 264 px plus chat |
| 768–1023 px | Chat full width (24 px padding); sidebar in the drawer |
| < 768 px | Drawer (85 vw, max 320 px), top bar, 16 px padding, user bubble max 85% width |

- No page-level horizontal scroll at 320 px or wider. Long words wrap (`overflow-wrap: anywhere`). Code blocks and tables scroll **inside** their own container.
- Use `100dvh` and `env(safe-area-inset-bottom)` so the composer stays visible with the mobile keyboard open.
- Touch targets are at least 44 px.
- The drawer closes on selection, Escape and backdrop click, and returns focus to the menu button.

## 17. Implementation phases

Every phase ends with `npm run typecheck && npm run lint && npm run test && npm run build` passing, then a commit.

**Phase 1: Foundation**
- [ ] `git init`; scaffold Vite React TS; install the stack from §3.
- [ ] Set up Tailwind v4, `styles.css` tokens (light and dark), the font, ESLint, Vitest and Playwright.
- [ ] Add the scripts `dev`, `build`, `preview`, `typecheck`, `lint`, `test`, `test:e2e`.
- [ ] Add `config.ts` with a test (bad mode throws, defaults applied) and `.env.example`.
- [ ] Check: the app shows the token colours; dark mode follows the OS; the Network tab shows no third-party requests.

**Phase 2: Layout and static UI**
- [ ] Build `App`, `Sidebar`, `ChatView`, empty state, `Composer` (with key handling), `Logo` and favicon, driven by hard-coded sample data.
- [ ] Unit test `Composer`: Enter calls `onSend`, Shift+Enter doesn't, IME doesn't, empty is blocked.

**Phase 3: Chat state and mock API**
- [ ] Write `types.ts`, `chatReducer.ts` (with tests for every action, stream routing by `conversationId` and `deriveTitle`), `chatApi.ts`, and `mockChatApi.ts` (tests: deltas then `done`; abort; `/error`).
- [ ] Write `ChatContext.tsx` and wire up send, stop and retry. Add `MessageList` and `MessageItem` with plain text for now.
- [ ] E2E: send → typing → Demo reply; Stop → "Stopped"; `/error` → error + Retry.

**Phase 4: Conversation history**
- [ ] Add new, switch and delete (`ConfirmDialog`) plus `storage.ts` (tests: round trip, corrupt data, blocked storage, `streaming`→`stopped`, the 100 cap).
- [ ] E2E: create two chats, switch, and both keep their messages; delete active → next chat opens; delete last → empty state; reload restores everything.

**Phase 5: Markdown and code blocks**
- [ ] Add `Markdown.tsx` and `CodeBlock.tsx` with the language subset (python, bash, javascript, typescript, json, yaml, sql, xml/html, css) and the highlight theme.
- [ ] Unit test: headings, lists, tables, inline code, and a fenced block with a language label.
- [ ] Unit test: `<script>` and `<img onerror>` render as text; a `javascript:` link has no `href`; an image renders no `<img>`.
- [ ] Test Copy in both the secure and the fallback path.
- [ ] E2E: the mock reply shows a highlighted Python block; Copy → "Copied".

**Phase 6: Responsive and polish**
- [ ] Build the drawer, top bar, `dvh` and safe-area handling, touch Enter behaviour, reduced motion, and copy review.
- [ ] E2E on mobile: open/close the drawer (select, Escape, backdrop) and check focus return; no horizontal overflow with a 300-character word, a wide table and a long code line.

**Phase 7: Verification**
- [ ] Run the full E2E suite on desktop (1440×900), tablet (768×1024) and mobile (390×844).
- [ ] axe shows no serious or critical issues in light and dark.
- [ ] Do a keyboard-only pass (Tab → type → Enter → Tab to Copy).
- [ ] Review screenshots of empty and filled chats × 2 themes × 3 viewports.
- [ ] Write the README: run, build, laptop hosting with `npm run build && npm run preview -- --host`, env vars, CSP, the local-storage warning, and how to plug in FastAPI.

## 18. Files to create or modify

- **Create:** everything in §5, plus `src/**/*.test.ts(x)` and `tests/e2e/*.spec.ts`.
- **Modify:** none. There is no existing application code.
- **Do not create now:** `api/httpChatApi.ts`, SSE parser, auth code, routing, component library, backend.
- **Leave untouched:** the thesis files (`experiment_config.yaml`, `serve_model.sh`, `freeze_experiment.py`). They don't belong in this repository.

## 19. Testing and verification

| Layer | What |
|---|---|
| Static | `tsc --noEmit` (strict), ESLint, `vite build`: zero errors |
| Unit (Vitest) | `config`, `chatReducer` and `deriveTitle`, `storage`, `mockChatApi`, `Composer` keys, `Markdown` safety, `CodeBlock` copy |
| E2E (Playwright) | Phases 3–6 scenarios, on 3 viewports, each test starting with empty storage |
| Accessibility | `@axe-core/playwright` on empty and filled chats, both colour schemes |
| Visual | Screenshot review (Phase 7) |

**Review focus**: failure modes that are easy to miss, each pinned by a test in the phase named:

1. Copy on a non-HTTPS LAN address must fall back, not fail silently (Phase 5).
2. Raw HTML, `javascript:` links or images inside a reply must stay inert (Phase 5).
3. Switching or deleting during a stream must not write into the wrong conversation or leave a dangling stream (Phases 3–4).
4. Corrupt or blocked `localStorage` must not crash the app (Phase 4).
5. Wide code, tables and long words must not cause page-level horizontal scroll on mobile (Phase 6).

Report the commands run and their output before declaring any phase done.

## 20. Definition of Done

- [ ] All MVP features in §1 work as described. Nothing from "Future" (§11–13) is implemented.
- [ ] All checks in §19 pass on 3 viewports and 2 colour schemes.
- [ ] Every mock reply shows "Demo reply". No mock text could be mistaken for an AI answer.
- [ ] No secrets in the bundle, no raw HTML rendering, no third-party runtime requests.
- [ ] Swapping the mock for another `ChatApi` touches only `src/api/` and `config.ts`.
- [ ] Source files stay under ~200 lines, and components don't import `api/`.
- [ ] The README covers running, laptop hosting, env vars, the security notes and FastAPI hookup.

**Assumptions to confirm:**

1. **Welcome/registration screen and guest session are removed** (they were in the old plan). This brief doesn't list them, so the app opens straight into chat. Re-add only if wanted.
2. **"Clear history" is replaced by per-conversation delete.**
3. **The product name stays "Perun LLM"**, with the hexafoil logo.
4. **English UI only.**
5. **Model selector and citations wait for the backend**, even though the thesis will need both.
