# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Next.js 15 (App Router) admin app — the **meimberg.io Content Manager** — that authors blog/article content, stores it in **Storyblok**, and assists authoring with multi-provider AI. It is an internal tool: every route is behind Google OAuth + an email whitelist.

> Note: `package.json` `name` is still `com.luxarise.admin.frontend`, and parts of `src/lib/publer.ts` / `src/components/publer/` are **copied scaffolding from another project (Luxarise) and are NOT wired up** in this app. Don't treat that Publer code as a working integration. (A real LinkedIn→Publer integration is planned — see Jira epic MICM-6.)

## Commands

Use the **Makefile** (wraps npm/next/storyblok):

| Command | Purpose |
| --- | --- |
| `make dev` / `make stop` | Start / kill the Next.js dev server (port 3000) |
| `make check` | **Primary verification**: `lint` + `typecheck` (`next lint` + `tsc --noEmit`) |
| `make lint` / `make typecheck` | Run individually |
| `make build` | Production build (see policy below) |
| `make sb-sync` | Pull Storyblok component schemas **and** regenerate TS types → `src/types/component-types-sb.d.ts` (space `330326`) |
| `make sb-pull` / `make sb-types` | The two halves of `sb-sync` separately |
| `make docker-up` / `make docker-down` | Local production container |

**There is no test suite** (no jest/vitest/playwright). "Verify" means `make check` plus exercising the change in `make dev`.

### Build-check policy (important)
**Do NOT run `make build` / `npm run build` after routine changes.** It kills the dev server and wastes time; the dev server hot-reloads and surfaces errors immediately. Run a build only when explicitly preparing for deployment, on request, or after a major refactor. For normal verification use `make check`.

## Architecture (big picture)

**Storyblok is the database, not just a CMS.** Two distinct Storyblok surfaces are used:
- **Management API** (`src/lib/storyblok-management.ts`, `STORYBLOK_MANAGEMENT_TOKEN`, write, server-only) — all content creation/editing happens here as **drafts**. Never import this into client components.
- **Delivery/CDN API** (`src/lib/storyblok.ts`) — read side.

Content model:
- Two content types: **`blog`** (folder slug `b`) and **`article`** (folder slug `a`). The story's `content.component` selects the type; folders are auto-created on demand (`getBlogFolderId()` / `getArticleFolderId()`). `EditorKind` (`article` | `blog_short` | `blog_long`) is a UI/prompt distinction only — `blog_short`/`blog_long` are both the `blog` component, differing only in which AI body prompt runs.
- Content-Manager metadata lives in **`cm_*` fields** on the story (`cm_source_raw`, `cm_source_summarized`, `cm_origin`, `cm_publer_*`, etc.). "Content complete" requires all 9 content fields; **publish state uses Storyblok's native publish/unpublish**, not a custom field.
- **App settings + AI prompts are themselves stored in a Storyblok story** (`contentmanager_config`), via `src/lib/system-config.ts` → `src/lib/settings-storage.ts`. There is no separate DB or settings file. `DEFAULT_PROMPTS` in `settings-storage.ts` are the German fallback prompts.

**Cross-repo relationship — the public website is a separate repo: `../io.meimberg.www`.** It renders **published** Storyblok stories via a catch-all `src/app/[...slug]/page.tsx` → `renderPage()`, which fetches from the public delivery API and calls `notFound()` on 404. Consequence: a story that is **never published** (draft-only) is invisible on the website. This is the mechanism relied on to keep internal content (e.g. planned LinkedIn posts) off the public site.

**AI generation** (`src/app/api/ai/generate/route.ts` + `src/lib/openai.ts`): per-field generation (`pagetitle`, `abstract`, `pageintro`, `teasertitle`, `readmoretext`, `body`, `optimize`). Provider-agnostic via `src/lib/ai-provider.ts` (OpenAI / Anthropic / Google; keys from env; `DEFAULT_MODEL = gpt-4o`). The body prompt is chosen by content type + variant.

**Intake pipeline**: `src/app/api/import/*` pulls emails (Plaud transcriptions) from an MS365 mailbox via Microsoft Graph (`src/lib/mail-inbox.ts`) and creates **draft blog stories** with the transcript in `cm_source_*`. Today the imported item *is* the blog post (no separate intake entity).

**Body editor**: block-based (TipTap richtext, picture, youtube, video, divider, hyperlink) with `@dnd-kit` drag-and-drop under `src/components/blocks/`. Storyblok body is a raw block array; see `src/lib/transform-storyblok.ts`.

**Auth**: NextAuth v4 Google OAuth. Enforced in `src/middleware.ts` (route gating + `ADMIN_WHITELIST` env check) and `requireAuth()` (`src/lib/auth-guard.ts`) at the top of every protected API route. UI lives under the `(admin)` route group; `(auth)/login` is public.

## Conventions

- **Storyblok rate limits (~5 req/s).** For bulk Management-API work, space requests by ~200ms and back off on errors containing "Rate limit". `managementFetch()` already retries on HTTP 429 — reuse it rather than calling `fetch` directly.
- **Confirmations/dialogs**: use the existing `AlertDialog` / `Dialog` components. **Never** use native `window.confirm` / `alert` / `prompt` in app UI. Destructive actions (delete/unpublish/reset) must show a modal confirm.
- **UI stack**: shadcn/ui + Radix + Tailwind (`components.json`, `src/components/ui/`). Follow existing component patterns.
- After changing Storyblok component schemas, run `make sb-sync` so `src/types/component-types-sb.d.ts` stays in sync (it is CLI-generated — do not hand-edit).

## Issue tracking (Jira)

Configured in `.claude/jira.json` — Jira project **MICM** (`io.meimberg.contentmanager`). The agent-os workflow skills (`/specify`, `/implement`, `/commit`) auto-detect this. Status flow: `Zu Spezifizieren` → `Zu erledigen` → `In Arbeit` → `Erledigt`. Specs live in the issue **description**.
