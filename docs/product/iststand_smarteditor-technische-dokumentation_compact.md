# SmartEditor — Technische Dokumentation (Ist-Stand)

_Technische Gesamtbeschreibung des bestehenden SmartEditors (Repo `io.meimberg.contentmanager`) als Ausgangspunkt für die Produkt-Transformation._

_Stand: 29.06.2026 · Ergänzung zu [`product-seed-konsolidiert.md`](product-seed-konsolidiert.md) und [`bestandsanalyse-und-gesamtrequirements.md`](bestandsanalyse-und-gesamtrequirements.md)_

---

## 0. Zweck

Das neue Produkt geht von **diesem** System aus (dem reiferen der zwei Versionen). Diese Doku erfasst den technischen Ist-Stand als Transformations-Grundlage:

- **Frontend wird komplett neu gebaut.** §8 dokumentiert die heutige UI als *Neubau-Referenz*, nicht als zu erhaltenden Code.
- **Backend-Logik bleibt im Kern** und zieht später von **Storyblok auf Supabase** (Seed §7.1). Die Logik liegt in `src/lib/**` (reines TS), Storyblok-I/O ist in zwei Modulen isoliert, API-Routen sind dünne Orchestratoren — das macht den Umzug überschaubar (§11).

> Modell-IDs, Prompt-Texte und MICM-Referenzen sind eine Momentaufnahme (Code-Stand 29.06.2026); Registry und Prompts sind bewusst editierbar.

---

## 1. Tech-Stack

Next.js **15** (App Router, `output:'standalone'`) · React **18** · TypeScript **5** · NextAuth **4** (Google OAuth) · Tailwind + shadcn/ui auf Radix · **TipTap 3** + ProseMirror (Block-Editor) · `@dnd-kit` (Drag&Drop) · `@tanstack/react-query` · `react-hook-form`+`zod` · `react-markdown`+`remark-gfm` · `recharts` (Dashboard) · `sonner`/`vaul`/`cmdk` · `lucide-react`, Inter+Playfair · Storyblok (`@storyblok/react`, `storyblok-js-client`, CLI) · `mcp-handler`.

> `package.json name` ist noch `com.luxarise.admin.frontend` (Legacy). Die Publer-Multi-Channel-Formatter in `lib/publer.ts` sind kopiertes Scaffolding — **live verdrahtet ist nur LinkedIn**.

---

## 2. Projektstruktur

```
src/
├── middleware.ts                 # Route-Gating + Whitelist
├── app/
│   ├── (auth)/login/             # öffentlich
│   ├── (admin)/                  # geschützt: dashboard posts posts/[id] linkedin linkedin/[id]
│   │                             #            schedule import settings create
│   └── api/                      # 23 Route-Handler (§6)
├── lib/                          # gesamte Geschäftslogik (reines TS) — §5
├── components/                   # blocks dashboard icons layout linkedin posts publer scheduler ui
├── hooks/
└── types/  index.ts · component-types-sb.d.ts (CLI-generiert, nicht editieren)
```

---

## 3. Architektur

**Storyblok ist die Datenbank, nicht nur CMS** — zwei Flächen:
- **Management-API** (`storyblok-management.ts`, `STORYBLOK_MANAGEMENT_TOKEN`, write, server-only) — Erstellen/Editieren als **Draft**. Nie in Client-Komponenten.
- **Delivery/CDN-API** (`storyblok.ts`, public Token) — Leseseite.

**Request-Fluss:** Client → `fetch('/api/…')` → Route (`requireAuth()`) → `lib/`-Funktion → Storyblok / OpenAI·Anthropic·Google / Publer / MS Graph.

**Publish:** Blog/Article nutzen Storybloks **nativen** Publish-State; nur publizierte Stories rendern auf der öffentlichen Website (separates Repo `../io.meimberg.www`). **Draft-only = unsichtbar** — so bleiben interne Inhalte (geplante LinkedIn-Posts) von der Website fern. LinkedIn-Posts bleiben **immer** Draft; ihr „Publish" lebt in **Publer**.

**Rate-Limits/Caching:** Storyblok ~5 req/s → `managementFetch()` retry+Backoff; System-Config 30 s In-Memory-Cache mit `fresh`-Bypass für Read-Modify-Write.

---

## 4. Datenmodell

### 4.1 Storyblok-Typen (Space `330326`)
Drei genutzte Story-Typen (Ordner werden bei Bedarf auto-angelegt); Settings in eigener Story `system/contentmanager_config` (Component `luxarise_manager_config`, Feld `config` = JSON-String):

| `component` | Ordner | Zweck | Publish |
|---|---|---|---|
| `blog` | `b/` | persönlicher Blogbeitrag | Storyblok-nativ |
| `article` | `a/` | sachlicher Artikel | Storyblok-nativ |
| `linkedin_post` | `linkedin/` | LinkedIn (standalone/attached) | nie (Draft); via Publer |

**Standard-Felder (blog/article):** `pagetitle, pageintro, date, headerpicture, teasertitle, teaserimage, readmoretext, abstract, body`.
**`cm_*` (blog/article):** `cm_content_complete(+_confirmed_at)`, `cm_source_raw/_summarized`, `cm_publer_published_at/_post_ids`, `cm_ai_hint`, `cm_image_prompt`, `cm_intake_pending`, `cm_origin`; `cm_blog_variant` (`short|long`, steuert nur den KI-Body-Prompt).
**`linkedin_post`:** `linkedin_text`, `linkedin_image`, `cm_blog_ref` (Eltern-Blog-UUID; leer = standalone), gespiegeltes Quellmaterial, `cm_tags`, `cm_publer_label`, dieselben Status-/Publer-Felder.

> Der Space enthält viele Legacy-Komponenten (`luxarise_picture`, `page`, …) aus dem Website-Modell — irrelevant für den SmartEditor.

### 4.2 Interne Typen (`src/types/index.ts`)
- **`BlogPost`** — normalisierte Sicht (UUID + numerische `storyblokId`, Content-Felder, `origin` import|create|mcp, `intakePending?`, `status:{contentComplete,published}`). Der **LinkedIn-Status ist hier NICHT** — er wird aus angehängten Posts join-abgeleitet (`buildLinkedinStatusByBlog`).
- **`LinkedinPost`** — eigene Entität (MICM-8): `blogParentUuid?` (einseitig LinkedIn→Blog), `status:{contentComplete,publishedLinkedIn}`, Publer-Felder.
- **`StatusCheck`** — `color: green|yellow|red|gray|blue` (`blue` = scheduled).
- **Scheduler (MICM-14/32):** `Slot`(weekday 0=So…6=Sa, time "HH:MM") · `SlotInstance`(slotId|null, weekStart=Montag-YMD, storyUuid, typ, status pending|published|failed|skipped, errorCount?) · `Schedule`(timezone fix `Europe/Berlin`, slots[], slotInstances[]).

### 4.3 Settings (`contentmanager_config` → JSON)
`aiModel?`, `aiPrompts?` (Feld-/Varianten-Prompts), `notes?`, `publerLabels?` (Default `Standard, Series 1–3`), `schedules?`, `mcpTokens?` (gehasht: id/name/tokenHash/prefix/createdAt).

---

## 5. Backend-Module (`src/lib/`) — zu erhaltende Logik

**Persistenz — `storyblok.ts` (read):** `fetchBlogPosts/LinkedinPosts/SinglePost/PostByUuid/Statistics`; `fetchLinkedinPostsByBlogUuid` nutzt Filter `cm_blog_ref:{in:…}` (**String braucht `in`, nicht `is`**). `mergeStoriesWithPublishFlags()` überlagert CDN-Drafts mit autoritativen `published/published_at` aus der Management-API.
**`storyblok-management.ts` (write):** Folder-Resolver (idempotent); `create/update/publish/unpublish/deletePost`, `create/updateLinkedinPost`, `uploadAsset`, `resolveStoryMetaByUuids` (Batch ≤100, 429-Retry; fehlend = gelöscht, Fehler ≠ Löschung). `managementFetch` retry+Backoff (~1.8 s, `Retry-After`). Gotchas: Asset-Felder brauchen `fieldtype:'asset'`; `publishPost({overrideDate})` setzt `content.date` aufs Slot-Datum (MICM-30); **`published`-Boolean nutzen, nie `published_at`** (bleibt nach Unpublish stehen); LinkedIn-Slug-Kollision wird retried.

**KI — `ai-provider.ts`:** Routing OpenAI/Anthropic/Google über `callAI({prompt,imageUrl?,modelId?})` (max 4096 Tok, Vision je Provider unterschiedlich). Registry `AI_MODELS` (Momentaufnahme): `gpt-5.5`(Default), `gpt-5.4-mini`, `claude-opus-4-8/sonnet-4-6/haiku-4-5`, `gemini-3.5-flash/2.5-pro/3.1-flash-lite`.
**`openai.ts`:** Generierungsfunktionen (Prompt aus Settings, Fallback `DEFAULT_PROMPTS`): Titel/Abstract/Intro/Teaser/ReadMore (String); `generateBody` (Prompt-Wahl nach contentType+Variante: `bodyArticle`/`bodyBlogShort`/`bodyBlogLong` → ProseMirror via `markdownToProsemirror`); `generateLinkedinText` (Plain-Text, **kein** Markdown); `generateTags`; `generateImagePrompt`+`generateHeaderImage` (DALL·E `gpt-image-1`, 1536×1024 PNG); `optimizeText`. Default-Prompts (deutsch, mit Längen-/Ton-Vorgaben) vollständig in `settings-storage.ts`.

**LinkedIn/Publishing — `linkedin-publish.ts`:** `publishLinkedinNow(storyId)` (session-frei, von Route **und** Scheduler genutzt). Ablauf: **Attached-Guard** (Eltern-Blog muss `published` sein, sonst 409) → **Idempotenz** (Publer-State: published⇒409, queued⇒löschen+`replaced`) → formatieren (attached=`link`-OG-Card, standalone=`photo`, sonst `status`) → `scheduleLinkedinPost()` → `cm_publer_*` persistieren (Story bleibt Draft).
`linkedin-link.ts` (OG-Preview: Titel/160-Z.-Description/Bild headerpicture→teaserimage) · `linkedin-status.ts` (Aggregat pro Blog, least-done-Farbe) · `publer.ts` (Client `app.publer.com/api/v1`; `scheduleLinkedinPost` ruft `/posts/schedule/publish` **sofort**, ohne Publer-Kalender, MICM-33; Job-Polling; nur LinkedIn live).

**Scheduler — `scheduler/tick.ts`:** `runScheduleTick()` — fresh Read → fällige `pending`-Instanzen aufsteigend → Blog/Article publishen (Slot-Datum), dann angehängte content-complete LinkedIn-Posts; Fehler→`errorCount++`, `>=3`→`failed`; verpasste Slots feuern am geplanten Datum (nicht „jetzt"). `normalize.ts` (idempotente Legacy-Migration, deterministische Slot-IDs) · `schedule-time.ts` (DST-korrekte Zeitmathematik via `Intl`; `instanceDate` = single source „wann"; Horizont 8 Wochen).

**Intake — `mail-inbox.ts`:** MS-Graph OAuth2 Client-Credentials (App-Permissions, Service-Account), Token gecached. `fetchNewEmails` (ungelesen), `fetchEmailWithAttachments` (Body→Plaintext, Attachments base64→Text), `delete/markAsProcessed`.

**MCP — `mcp-posts.ts`** (read-side: `listPosts/getPost/updatePostFromMcp` mit Feld-Typ-Validierung) · **`mcp-tokens.ts`** (`create/revoke/validate`, SHA-256, constant-time `timingSafeEqual`, Plaintext einmalig).

**Config/Auth — `system-config.ts`** (30 s TTL, `fresh`-Bypass, 429-Backoff, Cache-Warming) · **`settings-storage.ts`** (`getSettings` normalisiert Schedules bei jedem Read; `saveScheduleTemplates` bewahrt server-eigene `slotInstances`) · **`auth.ts`/`auth-guard.ts`** (NextAuth Google, JWT, Whitelist; `requireAuth()`). **Helfer:** `posts-list.ts`, `transform-storyblok.ts`, `editor-kind.ts`, `richtext-utils.ts`, `tiptap-paste.ts`, `utils.ts`.

---

## 6. API-Routen (`src/app/api/**`)

Alle verlangen NextAuth-Session+Whitelist, außer markiert. Dünne Orchestratoren der `lib/`-Funktionen.

| Route | Methoden | Zweck / Kontrakt |
|---|---|---|
| `ai/generate` | POST | `{type, source*, hint?, modelId?, contentType?, blogBodyVariant?, text?, instruction?, isFullDocument?, storyId?}`; type ∈ pagetitle/abstract/pageintro/teasertitle/readmoretext/body/linkedin/tags/optimize. Persistiert bei `storyId`. |
| `ai/generate-image` | POST | `action: prompt\|image\|upload` → `{imagePrompt}` / `{base64}` / `{assetUrl,assetId}` |
| `ai/models` | GET | verfügbare Modelle/Provider/Default |
| `auth/[...nextauth]` | GET/POST | NextAuth |
| `cron/tick` | POST | **Bearer `CRON_SECRET`** od. Session → `runScheduleTick()` |
| `import/emails` · `import/process` | GET · POST | Posteingang listen · ausgewählte Mails → Drafts (blog/linkedin) |
| `posts` | GET/POST/PATCH | Liste (CDN+Mgmt merge) · anlegen · aktualisieren |
| `posts/list` | GET | `?scope=&content=&linkedin=&q=` server-seitig gefiltert |
| `posts/[id]` · `posts/[id]/publish` | GET · POST/DELETE | Einzelpost per Slug · publish/unpublish |
| `posts/upload` | POST | Asset-Upload (FormData) |
| `linkedin` · `linkedin/[id]` | GET/POST/PATCH · GET | Liste(+Eltern-Preview)/anlegen/aktualisieren · Einzel+Eltern-OG |
| `mcp` | POST | **Bearer-Token (gehasht)**; Tools create_draft/list_posts/get_post/update_post |
| `publishing/linkedin` | POST | `{id}` → `publishLinkedinNow()` → `{success,replaced,postIds,jobId}` |
| `publishing/publer(+/accounts)` | POST/GET | Multi-Channel-Blog-Publish (Scaffolding) · Accounts |
| `schedule` | GET | Editorial-Plan (Slots+Instanzen, abgeleitete Daten, Orphan-Flag) |
| `schedule/assign` · `schedule/move` | POST/DELETE · POST | Post an Slot binden/entfernen (content-complete-Gate) · verschieben |
| `settings` | GET/PATCH | lesen · schreiben (Schedules via `saveScheduleTemplates`) |
| `settings/tokens(+/[id])` | GET/POST · DELETE | MCP-Tokens listen/anlegen (Plaintext einmalig) · widerrufen |

---

## 7. Auth & Middleware

`middleware.ts` gated `/dashboard,/posts,/linkedin,/import,/settings,/schedule` + `/api/{posts,linkedin,publishing,import,ai,schedule}`; **öffentlich:** `/login`, `/api/auth`, **`/api/mcp`** (eigener Token). UI → Redirect `/login`, API → 401. **Drei Auth-Pfade:** NextAuth/Google (UI+API), Bearer `CRON_SECRET` (Tick headless), gehashter MCP-Token. Whitelist = `ADMIN_WHITELIST`.

---

## 8. Frontend (wird neu gebaut) — Referenz

**Shell:** Root-Layout mit Providern (NextAuth-Session, react-query, Theme, sonner-Toaster); `(admin)/layout.tsx` → `AppLayout` (Sticky-Header-Nav, Mobile-Hamburger); Fonts Playfair (Headings)+Inter; dunkles „Luxury"-Theme + TipTap-Styles in `globals.css`.

**Seiten:**
- **login** — Google-OAuth-Button.
- **dashboard** — 4 Stat-Cards + Recent Activity (`recharts`).
- **posts** — Zwei-Achsen-Status-Filtergrid (Content · LinkedIn) mit Count-Badges, Suche, Grid/List-Toggle, Bulk-Delete; **URL-State** (`view,q,scope,content,linkedin`, debounced); ruft `posts/list`+`linkedin` (join → `linkedinByBlog`).
- **posts/[id]** — größte Seite: links TipTap-Body-Editor + LinkedIn-Sektion, rechts (sticky) AI-Settings-Drawer/Status/Meta/Quellmaterial; Per-Feld-**Generate** + Batch „Generate All", **Bild-Flow** (Prompt→DALL·E→Preview→Upload bei Save), **Optimize**-Dialog, Dirty-Tracking per Snapshot, **Intake-Resolution** (MICM-22).
- **linkedin / linkedin/[id]** — Karten+Filter / Editor (Text, Bild, Tags, Attach/Detach, Publer-Label, Publish-Button).
- **schedule** — zwei Ansichten (Tracks: Lanes×Slots Drag&Drop / Kalender-Wochengrid), „Run now" → `cron/tick`.
- **import** — Posteingangsliste, Ziel-Selektor blog/linkedin → `import/process`.
- **settings** — Tabs: Prompts, Modellwahl, Publer-Labels, Schedules (Templates), Notizen, MCP-Tokens.
- **create** — Titel + TipTap-Quellmaterial → `POST /api/posts`.

**Komponenten:** `layout/AppLayout`, `dashboard/{StatCard,ActivityList}`, `posts/PostCard`, `linkedin/{LinkedinEditor,LinkedinCard,BlogLinkedinSection}`, `scheduler/{ScheduleAssign,ScheduleTracksView,ScheduleCalendarView}`, `publer/PublerSection`, `ui/` (shadcn/Radix-Primitives).

**Block-Editor (`components/blocks/`):** `BodyEditor` (Drag&Drop via `@dnd-kit`, „Block hinzufügen") mit **6 Blocktypen** → Storyblok-Body: `richtext` (TipTap: Headings, bold/italic, Links, Listen, Blockquote, Codeblock, Tabellen), `picture`, `youtube`, `video`, `divider`, `hyperlink`. KI-Body kommt als Markdown → `markdownToProsemirror`.

**UI-Muster:** Status-Pipelines (MICM-37, Achsen Content·LinkedIn, rot→gelb→blau→grün, Filtergrid+Dots); Bestätigungen nur via `AlertDialog`/`Dialog` (**nie** native `confirm/alert`); Toasts via `sonner`; AI-Generate-State (`generating: Set`, Batch-Progress, `generatingImage`).

---

## 9. Build, Betrieb & Env

**Makefile:** `make check` = `lint`+`typecheck` (primäre Verifikation) · `dev`/`stop` · `build` (nur Deployment) · `sb-sync` = Komponenten ziehen + Typen regenerieren (`component-types-sb.d.ts`) · `docker-{build,up,down}`. **Kein Test-Suite** — „verify" = `make check` + manuell in `make dev`.
**`next.config.ts`:** `output:'standalone'`, `transpilePackages` (react-markdown/remark-*), Image-`remotePatterns` (storyblok/sharepoint/googleusercontent).

| Env-Gruppe | Variablen |
|---|---|
| Storyblok | `NEXT_PUBLIC_STORYBLOK_TOKEN`, `STORYBLOK_MANAGEMENT_TOKEN`, `STORYBLOK_SPACE_ID=330326`, `NEXT_PUBLIC_STORYBLOK_DISABLECACHING` |
| Auth | `NEXTAUTH_URL/_SECRET`, `GOOGLE_CLIENT_ID/_SECRET`, `ADMIN_WHITELIST` |
| KI | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_AI_API_KEY` (≥1) |
| Mail-Intake | `MAILINBOX_USERNAME`, `AZURE_TENANT_ID/CLIENT_ID/CLIENT_SECRET` |
| Publer | `PUBLER_API_KEY/_API_URL/_WORKSPACE_ID` (+ `PUBLER_LINKEDIN_ACCOUNT_ID`) |
| Scheduler / Website | `CRON_SECRET` · `WWW_REVALIDATE_URL`, `WWW_PUBLIC_BASE_URL` |

> Headless-Scheduler: externer (ansible-verwalteter) Cron ruft `POST /api/cron/tick` mit `Authorization: Bearer $CRON_SECRET`.

---

## 10. Querschnitts-Invarianten

- Storyblok-Filter: String-Gleichheit braucht `in`, nicht `is`.
- `published`-Boolean nutzen, nie `published_at` (bleibt nach Unpublish stehen).
- Rate-Limits (~5 req/s): `managementFetch`/`system-config` retrien mit Backoff; Bulk per `by_uuids` (per_page=100).
- Idempotenz: Scheduler status-basiert; LinkedIn über Publer-State (published⇒block, queued⇒replace); Storyblok-Publish idempotent.
- Caching: System-Config 30 s, `fresh`-Read für Read-Modify-Write.
- Coupling: Blog zuerst publishen, dann angehängte content-complete LinkedIn-Posts (sonst greift der 409-Guard).
- Keine nativen Dialoge; Destruktives immer modal bestätigen.

---

## 11. Transformations-Hinweise (Brücke zum Seed)

**Erhalten (Backend, §5–7):** KI-Generierung inkl. Prompts, LinkedIn/Publer-Contract, Scheduler, Intake (MS Graph), MCP, Status-Aggregation, Auth-Pfade.
**Neu bauen (Frontend, §8):** gesamte UI; Zielbild u. a. die Multi-Format-Tab-UI der ZDB-Variante (siehe Bestandsanalyse).
**Persistenz-Umzug Storyblok → Supabase (Seed §7.1):**
1. `storyblok.ts` + `storyblok-management.ts` durch Supabase-Client ersetzen.
2. `system-config.ts` → Supabase-`settings`-Tabelle (ZDB-Variante hat dieses Modell bereits).
3. Scheduler-/KI-/LinkedIn-/Publer-/Intake-Logik bleibt; Routen bleiben Schnittstelle, nur das I/O dahinter wechselt.
4. **Storyblok wird vom Primärspeicher zum Publishing-Adapter** — konsistent mit der Adapter-Architektur (Seed §6.2) und dem Modell Post → Publikation → Channel (§7.3).

**Altlasten:** Legacy-`name`, nicht-verdrahtete Publer-Formatter, Legacy-Storyblok-Komponenten, driftende Modell-IDs/Prompts. Natürlicher Schnitt beim Neubau: `lib/` (Logik) vs. `app/(admin)`+`components/` (UI).

---

_Quellen: vollständige Code-Inventur von `io.meimberg.contentmanager` (lib, API, Frontend, Typen, Build/Env) am 29.06.2026._
