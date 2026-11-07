# Perun LLM Web

The web frontend of **Perun LLM**, a chat assistant built for a bachelor's thesis. No language model is connected yet: every reply comes from a clearly labelled demo responder. A Python/FastAPI backend running local models on PERUN will replace it later through `src/api/`.

## Requirements

- Node.js 22.12 or newer, and npm.
- For the end-to-end tests: Chromium for Playwright (`npx playwright install chromium`).

## Run it

```bash
npm install
npm run dev            # http://localhost:5173
```

## Build and host it on your laptop

```bash
npm run build
npm run preview -- --host
```

`--host` makes the preview server listen on your network, so other devices on the same Wi-Fi can open `http://<laptop-ip>:4173`. Vite prints the address.

Notes for plain-http LAN addresses: browsers allow the clipboard API only on HTTPS or `localhost`. On `http://<laptop-ip>`, the code block's **Copy** button selects the code and shows "Press Ctrl+C to copy" instead.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serves `dist/` |
| `npm run typecheck` | TypeScript in strict mode |
| `npm run lint` | ESLint |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:e2e` | Browser tests (Playwright) on 1440×900, 768×1024 and 390×844 |

`test:e2e` builds the app in test mode into `dist-e2e/` and serves it on port 4173. It also saves review screenshots into `screenshots/`. Typing a message that starts with `/error` simulates a failed request, but only in development and test mode.

## Environment variables

Copy `.env.example` to `.env` to change them.

| Variable | Default | Meaning |
|---|---|---|
| `VITE_API_MODE` | `mock` | `mock` uses the demo responder. `http` is reserved for the FastAPI client, which is not built yet. Any other value stops the app at startup with a clear message. |
| `VITE_API_BASE_URL` | `/api` | Base path of the future API. |

Vite copies every `VITE_*` value into the JavaScript bundle, where anyone can read it. **Never put secrets, API keys or credentials in these variables or anywhere in the frontend.**

## Security notes

- **Chat history is stored unencrypted in `localStorage`.** Anyone using the same browser profile can read it. The app says so on the empty screen. It never stores tokens or credentials there.
- Replies are rendered with react-markdown without any raw HTML passthrough. HTML in a reply shows as text, `javascript:` and `data:` links lose their `href`, links open with `rel="noopener noreferrer"`, and images are shown as their alt text instead of being loaded.
- The app makes no third-party requests: the Onest font is bundled, with no CDNs and no analytics.
- Frontend checks such as the 8,000-character limit are for usability only. The backend must validate and authorise every request itself, and CORS is not authentication.

### Recommended Content Security Policy

When you host the build behind a web server, send this header:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'
```

## Project layout

```
src/
├── main.tsx, App.tsx       entry point and layout
├── config.ts               reads and validates the VITE_* variables
├── types.ts                shared types
├── styles.css              Tailwind, design tokens, highlight theme
├── components/             UI only, never imports from api/
├── chat/                   reducer, ChatContext (useChat) and storage
└── api/                    ChatApi interface and the mock
tests/e2e/                  Playwright specs
```

## Connecting the FastAPI backend later

The UI already streams and supports cancellation, so connecting the backend needs no UI changes:

1. Add `src/api/httpChatApi.ts` that implements `ChatApi` (`src/api/chatApi.ts`). It should POST to `${apiBaseUrl}/chat` with `fetch` and the `AbortSignal`, read the `text/event-stream` body, and yield `delta`, `done` and `error` events. Write tests for the stream parser first.
2. Return it from `getChatApi()` when `config.apiMode === "http"`.
3. Add a Vite proxy to `vite.config.ts` for both `server` and `preview`, so `/api` goes to `http://localhost:8000`. The browser then sees one origin and needs no CORS.
4. Set `VITE_API_MODE=http`.

The proposed API contract, authentication via HttpOnly cookies, streaming and future citation support are described in `plan.md` §11–13.
