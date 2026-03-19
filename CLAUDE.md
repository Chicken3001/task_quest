# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

```
task_quest/
├── web/          ← Next.js 16 web app (deployed on Vercel)
├── ios/          ← Native SwiftUI iPhone app
├── .gitignore
├── CLAUDE.md
└── README.md
```

Both apps share the same Supabase backend. The web app's API routes serve as the AI proxy for iOS.

## Web App (`web/`)

### Commands

- `cd web && npm run dev` — Start dev server (port 3000)
- `cd web && npm run build` — Production build
- `cd web && npm run lint` — ESLint

### Architecture

Next.js 16 App Router + Supabase + TypeScript + Tailwind CSS v4. Deployed on Vercel (root directory: `web`).

#### 3-Tier Data Model: Epic → Quest → Task

- **Epic**: Large project containing multiple quests. Has `plan_summary` from AI planning.
- **Quest**: Group of related tasks within an epic. `epic_id` is nullable (standalone quests from Quest Planner).
- **Task**: Individual action item with difficulty/XP. `quest_id` is nullable (standalone tasks).
- DB tables prefixed `task_quest_` (e.g., `task_quest_epics`, `task_quest_quests`, `task_quest_tasks`, `task_quest_profiles`).
- All tables use RLS with `auth.uid() = user_id` policies.
- Cascade completion handled in application logic (`actions.ts`), not DB triggers.

#### Auth Flow

- `src/proxy.ts` — Next.js 16 middleware, validates Supabase auth cookie.
- Supabase clients: `src/lib/supabase/server.ts` (server-side, cookies) and `src/lib/supabase/client.ts` (browser).
- API routes support dual auth: cookie-based (web) and `Authorization: Bearer <token>` (iOS). See `src/lib/supabase/api-auth.ts`.
- Signup creates a profile in `task_quest_profiles` via `/api/auth/signup`.

#### AI Integration (Gemini)

- Model configured in `src/lib/gemini.ts`.
- Three API routes under `src/app/api/quests/`:
  - `chat/` — Multi-turn conversational planning.
  - `generate/` — Generates structured Epic/Quest/Task breakdown.
  - `task-chat/` — Per-task AI assistant.
- All routes accept both cookie auth (web) and Bearer token auth (iOS).

#### Key Patterns

- **Route groups**: `(auth)` for login, `(protected)` for authenticated pages.
- **Server components** (`page.tsx`): Fetch data from Supabase, pass to client components.
- **Server actions** (`actions.ts`): All mutations. Use `revalidatePath("/dashboard")`.
- **Path alias**: `@/*` maps to `./src/*`.

### Styling

- Dark theme with violet/purple accent colors.
- CSS custom properties in `src/app/globals.css`.

### Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase connection.
- `GEMINI_API_KEY` — Server-only, used by API routes.

## iOS App (`ios/`)

### Architecture

SwiftUI + supabase-swift (SPM). Targets iOS 17+. Dark theme matching web.

#### Key Patterns

- **Auth**: Supabase Swift SDK with Keychain-based token storage.
- **Data**: PostgREST queries via supabase-swift (same tables, same RLS).
- **AI features**: HTTP calls to web's API routes with `Authorization: Bearer <token>`.
- **State**: `@Observable` view models with pull-to-refresh.
- **Mutations**: Direct PostgREST writes with cascade completion logic matching `actions.ts`.

### Supabase Project

- Project ID: `absyxliepphiqqfsudyv`
- Migrations managed via Supabase MCP tools.
