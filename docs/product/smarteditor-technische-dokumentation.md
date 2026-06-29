# SmartEditor — Vollständige technische Dokumentation (Ist-Stand)

_Technische Gesamtbeschreibung des bestehenden SmartEditors (Repo `io.meimberg.contentmanager`) als Ausgangspunkt für die Produkt-Transformation._

_Stand: 29.06.2026 · Ergänzung zu [`product-seed-konsolidiert.md`](product-seed-konsolidiert.md) und [`bestandsanalyse-und-gesamtrequirements.md`](bestandsanalyse-und-gesamtrequirements.md)_

---

## 0. Zweck dieses Dokuments

Das neue Produkt wird **nicht** auf der grünen Wiese gebaut, sondern geht von **diesem** System aus — es ist von beiden Versionen das reifere (siehe Bestandsanalyse). Diese Dokumentation erfasst den **technischen Ist-Stand** vollständig, damit daraus das neue Produkt erzeugt werden kann.

**Transformations-Leitlinien (aus dem Seed):**
- **Frontend wird komplett neu gebaut.** Abschnitt 8 dokumentiert das aktuelle Frontend so genau, dass sich jedes Verhalten reproduzieren lässt — als *Referenz für den Neubau*, nicht als zu erhaltender Code.
- **Backend-Logik bleibt im Kern erhalten** und wird später von **Storyblok auf Supabase** umgezogen (Seed §7.1). Abschnitt 5–7 ist die Spezifikation dessen, was erhalten bleibt.
- Die gesamte Geschäftslogik liegt in `src/lib/**` (reines TypeScript); Storyblok-I/O ist in zwei Modulen isoliert; API-Routen sind dünne Orchestratoren. Das macht den Persistenz-Umzug überschaubar (Abschnitt 11).

> **Hinweis zu Stand/Drift:** Modell-IDs, Prompt-Texte und Ticket-Referenzen (MICM-*) entsprechen dem Code zum Stand 29.06.2026. Die KI-Modell-Registry (`ai-provider.ts`) und die Default-Prompts (`settings-storage.ts`) sind bewusst editierbar und verändern sich; sie sind hier als Momentaufnahme dokumentiert.

---

## 1. Überblick & Tech-Stack

**Was es ist:** Eine interne Next.js-15-Admin-App, die Blog-/Artikel-Content verfasst, in **Storyblok** speichert und mit Multi-Provider-KI bei der Erstellung assistiert. Zusätzlich: gekoppelte LinkedIn-Posts, ein wiederkehrender Publishing-Scheduler, Mail-/Plaud-Intake und ein MCP-Server. Jede Route liegt hinter Google-OAuth + E-Mail-Whitelist.

| Schicht | Technologie | Version |
|---|---|---|
| Framework | Next.js (App Router), `output: 'standalone'` | ^15.5.9 |
| UI-Runtime | React | ^18.3.1 |
| Sprache | TypeScript | ^5.8.3 |
| Auth | NextAuth (Google OAuth) | ^4.24.13 |
| Styling | Tailwind CSS + `@tailwindcss/typography` + `tailwindcss-animate` | ^3.4.19 |
| UI-Komponenten | shadcn/ui auf Radix UI (≈30 Radix-Pakete) | div. |
| Editor | TipTap 3 (StarterKit, Image, Link, Table, CodeBlockLowlight, Markdown) + ProseMirror | ^3.19.x |
| Drag & Drop | `@dnd-kit/core`, `/sortable`, `/utilities` | ^6/10/3 |
| Daten-Fetching | `@tanstack/react-query` | ^5.83 |
| Formulare | `react-hook-form` + `@hookform/resolvers` + `zod` | div. |
| Markdown-Render | `react-markdown` + `remark-gfm` + `remark-breaks` | div. |
| Charts | `recharts` (Dashboard) | ^2.15 |
| Toasts / Drawer / Command | `sonner`, `vaul`, `cmdk` | div. |
| Icons / Fonts | `lucide-react`, `@fontsource/inter`, `@fontsource/playfair-display` | div. |
| Storyblok | `@storyblok/react`, `@storyblok/richtext`, `storyblok-js-client`, CLI `storyblok` | div. |
| MCP | `mcp-handler` | ^1.1.0 |

> `package.json` `name` ist noch `com.luxarise.admin.frontend` (Legacy); Teile von `src/lib/publer.ts` / `src/components/publer/` sind kopiertes Scaffolding aus dem Luxarise-Projekt — die **Multi-Channel-Formatter sind vorhanden, aber im SmartEditor nicht alle verdrahtet**; **live** ist LinkedIn.

---

## 2. Projektstruktur

```
src/
├── middleware.ts                 # Route-Gating (NextAuth) + Whitelist
├── app/
│   ├── layout.tsx · page.tsx     # Root-Layout + Redirect
│   ├── (auth)/login/             # öffentliche Login-Seite
│   ├── (admin)/                  # geschützte UI (Route-Group)
│   │   ├── dashboard/ · posts/ · posts/[id]/ · linkedin/ · linkedin/[id]/
│   │   ├── schedule/ · import/ · settings/ · create/
│   └── api/                      # 23 Route-Handler (s. Abschnitt 6)
│       ├── ai/{generate,generate-image,models}/
│       ├── auth/[...nextauth]/ · cron/tick/ · mcp/
│       ├── import/{emails,process}/
│       ├── posts/{,[id],[id]/publish,list,upload}/
│       ├── linkedin/{,[id]}/
│       ├── publishing/{linkedin,publer,publer/accounts}/
│       ├── schedule/{,assign,move}/
│       └── settings/{,tokens,tokens/[id]}/
├── lib/                          # gesamte Geschäftslogik (reines TS)
│   ├── storyblok.ts · storyblok-management.ts        # Persistenz (read / write)
│   ├── ai-provider.ts · openai.ts                    # KI-Routing + Generierung
│   ├── linkedin-publish.ts · linkedin-link.ts · linkedin-status.ts · publer.ts
│   ├── scheduler/{tick.ts,normalize.ts} · schedule-time.ts
│   ├── mail-inbox.ts                                 # MS-Graph-Intake
│   ├── mcp-posts.ts · mcp-tokens.ts                  # MCP read-side + Tokens
│   ├── system-config.ts · settings-storage.ts        # Config/Settings
│   ├── auth.ts · auth-guard.ts                        # Auth
│   ├── posts-list.ts · transform-storyblok.ts · editor-kind.ts
│   ├── richtext-utils.ts · tiptap-paste.ts · utils.ts
├── components/                   # blocks/ dashboard/ icons/ layout/ linkedin/ posts/ publer/ scheduler/ ui/
├── hooks/
└── types/
    ├── index.ts                  # interne Domänen-Typen
    └── component-types-sb.d.ts   # CLI-generiert aus Storyblok (nicht editieren)
```

---

## 3. Architektur (Big Picture)

**Storyblok ist die Datenbank, nicht nur CMS.** Zwei getrennte Storyblok-Flächen:
- **Management-API** (`storyblok-management.ts`, `STORYBLOK_MANAGEMENT_TOKEN`, write, server-only) — alles Erstellen/Editieren passiert hier als **Draft**. Nie in Client-Komponenten importieren.
- **Delivery/CDN-API** (`storyblok.ts`, `NEXT_PUBLIC_STORYBLOK_TOKEN`) — Leseseite.

**Request-Fluss:** Client-Komponente → `fetch('/api/…')` → Route-Handler (`requireAuth()`) → `lib/`-Funktion → Storyblok-API (oder OpenAI/Anthropic/Google, Publer, MS Graph). Routen sind dünn; die Logik liegt in `lib/`.

**Publish-Mechanik:** Blog/Article nutzen Storybloks **nativen** Publish-State; nur publizierte Stories rendern auf der öffentlichen Website (separates Repo `../io.meimberg.www`, catch-all `[...slug]`). **Draft-only = unsichtbar** — der Mechanismus, mit dem interne Inhalte (geplante LinkedIn-Posts) von der Website ferngehalten werden. LinkedIn-Posts bleiben **immer** Storyblok-Draft; ihr „Publish" lebt in **Publer**.

**Caching/Rate-Limits:** Storyblok ~5 req/s. `managementFetch()` macht 429-Retry mit Backoff; System-Config 30 s In-Memory-Cache mit `fresh`-Bypass für Read-Modify-Write.

---

## 4. Datenmodell

### 4.1 Storyblok-Content-Typen (`component-types-sb.d.ts`, Space `330326`)
Die App nutzt drei Story-Typen; Ordner werden bei Bedarf automatisch angelegt:

| Typ (`component`) | Ordner | Zweck | Publish |
|---|---|---|---|
| `blog` | `b/` | persönlicher Blogbeitrag | Storyblok-nativ |
| `article` | `a/` | sachlicher Artikel | Storyblok-nativ |
| `linkedin_post` | `linkedin/` | LinkedIn-Post (standalone/attached) | nie (Draft); Publish via Publer |

Settings liegen in einer eigenen Story `system/contentmanager_config` (Component `luxarise_manager_config`, Feld `config` als JSON-String).

**Blog / Article — Felder** (Standard-CMS-Felder + `cm_*`):
`pagetitle`, `pageintro`, `date`, `headerpicture` (Asset), `teasertitle`, `teaserimage` (Asset), `readmoretext`, `abstract`, `body` (Block-Array, s. 8.4).

**`cm_*`-Metadaten auf `blog`:** `cm_content_complete` (bool), `cm_content_confirmed_at`, `cm_source_raw`, `cm_source_summarized`, `cm_socialmedia` (legacy), `cm_publer_published_at`, `cm_publer_post_ids`, `cm_ai_hint`, `cm_image_prompt`, `cm_intake_pending`, `cm_origin`, `name`. (Hinweis: `cm_blog_variant` `short|long` wird als Feld geführt, steuert nur den KI-Body-Prompt.)

**`linkedin_post` — Felder:** `linkedin_text`, `linkedin_image` (Asset), `cm_blog_ref` (UUID des Eltern-Blogs; leer = standalone), `cm_source_raw`, `cm_source_summarized`, `cm_ai_hint`, `cm_image_prompt`, `cm_origin` (`""|import|create`), `cm_content_complete`, `cm_content_confirmed_at`, `cm_publer_published_at`, `cm_publer_post_ids`, `cm_tags`, `cm_publer_label`.

> Im Storyblok-Space existieren noch viele Legacy-Komponenten (`luxarise_picture`, `news`, `page`, `gallery`, …) aus dem Website-Datenmodell. Für den SmartEditor relevant sind nur `blog`, `article`, `linkedin_post`, `luxarise_manager_config` sowie die Body-Blocktypen (`richtext`, `picture`, `youtube`, `video`, `divider`, `hyperlink`).

### 4.2 Interne Domänen-Typen (`src/types/index.ts`)
- **`BlogPost`** — normalisierte Sicht: `id`(UUID), `storyblokId`(numerisch), `slug`, `contentType` (`blog|article`), `blogBodyVariant?`, alle Content-Felder, `hasBody`/`body[]`, `sourceRaw/sourceSummarized`, `origin` (`import|create|mcp`), `intakePending?`, `aiHint?`, `imagePrompt?`, `status: { contentComplete, published }`, `publerPostIds?`, `createdAt`, `lastModified`. Der **LinkedIn-Status ist NICHT hier** — er wird join-abgeleitet aus den angehängten `linkedin_post`-Stories (`buildLinkedinStatusByBlog`).
- **`LinkedinPost`** — eigene Entität (MICM-8 Variante C): `linkedinText`, `linkedinImage?`, gespiegeltes Quellmaterial, `tags[]`, `origin`, `blogParentUuid?` (einseitig LinkedIn→Blog), `status: { contentComplete, publishedLinkedIn }`, `publerPostIds?/publerPublishedAt?/publerLabel?`.
- **`StatusCheck`** — `{ completed, timestamp?, color: green|yellow|red|gray|blue, manuallyConfirmed?, errorMessage? }`. `blue` = scheduled.
- **Scheduler (MICM-14/32):** `Slot` (`id`, `weekday` 0=So…6=Sa, `time` "HH:MM"), `SlotInstance` (`id`, `slotId|null`, `weekStart` Montag-YYYY-MM-DD, `storyUuid`, `typ` blog|article|linkedin, `status` pending|published|failed|skipped, `errorCount?/lastError?/lastErrorAt?`), `Schedule` (`id`, `name`, `timezone` fix `Europe/Berlin`, `slots[]`, `slotInstances[]`).

### 4.3 Settings-Modell (`settings-storage.ts`)
In `contentmanager_config` → `config` (JSON): `aiModel?`, `aiPrompts?` (alle Feld-/Varianten-Prompts, s. 5.2), `notes?`, `publerLabels?` (Default `['Standard','Series 1','Series 2','Series 3']`), `schedules?` (Schedule[]), `mcpTokens?` (gehashte Bearer-Tokens: `{id,name,tokenHash(SHA-256),prefix,createdAt}`).

---

## 5. Backend-Module (`src/lib/`) — zu erhaltende Logik

### 5.1 Persistenz
**`storyblok.ts` (Delivery/CDN, read).** `getStoryblokApi()` (Region eu, Cache je `NEXT_PUBLIC_STORYBLOK_DISABLECACHING`). `fetchBlogPosts({perPage,page,searchQuery,dateFrom,dateTo,filters})` — fragt `b/`+`a/` parallel, sortiert `content.date:desc`, merged per UUID. `fetchLinkedinPosts()` (sortiert `created_at:desc`), `fetchLinkedinPostsByBlogUuid(uuid)` (Filter `cm_blog_ref:{in:uuid}` — **String-Gleichheit braucht `in`, nicht `is`**). `fetchSinglePost(slug)`, `fetchPostByUuid`, `fetchEarliestPostYear()`, `fetchStatistics()`. **`mergeStoriesWithPublishFlags(cdn,mgmt)`** — die einzige Stelle, die CDN-Drafts mit autoritativen `published/published_at/unpublished_changes` aus der Management-API überlagert.

**`storyblok-management.ts` (Management, write).** Folder-Resolver `getBlogFolderId()/getArticleFolderId()/getLinkedinFolderId()` (idempotent). `createPost/updatePost/publishPost/unpublishPost/deletePost`, `createLinkedinPost/updateLinkedinPost`, `uploadAsset`, `getPostById`, `getStoryIdByUuid`, `resolveBlogStoryByUuid`, **`resolveStoryMetaByUuids(uuids[])`** (Batch, chunked per 100, 429-Retry; fehlende UUID = wirklich gelöscht; geworfener Fehler ≠ Löschung). **`managementFetch`**: `RATE_LIMIT_RETRIES=2`, Backoff ~1.8 s, respektiert `Retry-After`. Gotchas: Asset-Felder brauchen `fieldtype:'asset'`; `publishPost({overrideDate})` setzt `content.date` auf das Slot-Datum (MICM-30); Unpublish lässt `published_at` stehen → **immer das `published`-Boolean nutzen**; LinkedIn-Slug-Kollisionen werden mit Suffix bis 20× retried; Publish ist idempotent; Cache-Invalidation via `WWW_REVALIDATE_URL`.

### 5.2 KI-Generierung
**`ai-provider.ts`** — Provider-Routing OpenAI/Anthropic/Google. `getAvailableProviders()/getAvailableModels()/isModelAvailable()/getProviderForModel()`, **`callAI({prompt,imageUrl?,modelId?})`** routet zu `callOpenAI/callAnthropic/callGoogleAI` (jeweils max 4096 Tokens, Vision: OpenAI per `image_url`, Anthropic/Google per base64+MIME). Registry `AI_MODELS` (Momentaufnahme): `gpt-5.5` (Default), `gpt-5.4-mini`; `claude-opus-4-8`, `claude-sonnet-4-6`, `claude-haiku-4-5`; `gemini-3.5-flash`, `gemini-2.5-pro`, `gemini-3.1-flash-lite` — alle vision-fähig.

**`openai.ts`** — Generierungsfunktionen, jede lädt Prompt aus Settings mit Fallback auf `DEFAULT_PROMPTS`: `generatePageTitle/Abstract/PageIntro/TeaserTitle/ReadMoreText` (String, getrimmt), `generateBody` (Prompt-Wahl nach `contentType`+Variante: `bodyArticle` / `bodyBlogShort` / `bodyBlogLong`→Fallback `body`; Rückgabe **ProseMirror-JSON** via `markdownToProsemirror`), `generateLinkedinText` (Plain-Text, kein Markdown), `generateTags` (→string[]), `generateImagePrompt` (DALL·E-Prompt, `headerImage`/`headerImageArticle`), `generateHeaderImage(prompt)` (DALL·E, Modell `gpt-image-1`, 1536×1024, PNG base64), `optimizeText({text,instruction,isFullDocument})` (Voll-Dokument → ProseMirror, sonst Plain). **`markdownToProsemirror`** unterstützt Headings (#→h2–h4), bold/italic/code/link, Listen, Blockquote, Codeblock, HR, Tabellen.
Die **Default-Prompts** (deutsch, mit Längen-/Ton-Vorgaben) stehen vollständig in `settings-storage.ts` (Z. 78–190): u. a. `bodyBlogShort` 350–600 W, `bodyBlogLong`/`bodyArticle` 800–1500 W (meinungsstark vs. nüchtern), `linkedin` (Hook+CTA, ~1300 Z., keine Hashtags/Links), getrennte Bild-Meta-Prompts Blog vs. Article.

### 5.3 LinkedIn & Publishing
**`linkedin-publish.ts`** — `publishLinkedinNow(storyId)` (session-frei, von Route **und** Scheduler genutzt). Ablauf: Publer-Config prüfen → Story laden → **Attached-Guard (MICM-12 AK6):** bei `cm_blog_ref` Eltern-Blog auflösen, OG-Preview bauen, **Eltern muss `published===true`** sonst 409 → **Idempotenz (AK5):** vorhandene `cm_publer_post_ids` gegen Publer-State; published ⇒ 409, queued ⇒ löschen+`replaced` → formatieren (attached=`link`-Share/OG-Card, standalone=`photo`, sonst `status`) → `scheduleLinkedinPost()` → `cm_publer_post_ids`+`cm_publer_published_at` persistieren (Story bleibt Draft). Fehler als `LinkedinPublishError(msg,status)`.
**`linkedin-link.ts`** — `buildBlogUrl(fullSlug)` (`WWW_PUBLIC_BASE_URL`, Default `https://www.meimberg.io`), `buildBlogLinkPreview(uuid,story)` (Titel/Description 160-Z.-clamped/Bild aus headerpicture→teaserimage; `published`-Boolean), `buildBlogLinkPreviewFromListMeta`.
**`linkedin-status.ts`** — `buildLinkedinStatusByBlog(posts,isScheduled?)` aggregiert pro Eltern-Blog (least-done-Farbe gewinnt: gelb > blau > grün); orphan/ohne Eltern → nicht im Map (Caller: grau).
**`publer.ts`** — Publer-Client (`app.publer.com/api/v1`, Header `Bearer-API`+`Publer-Workspace-Id`). Formatter `formatForInstagram/Facebook/Twitter/Pinterest/Threads/LinkedIn` (Hashtag-Limits/Truncation; **nur LinkedIn ist im SmartEditor live**). `getPubAccounts()`, State-Helfer `getPublerPostState/isPublishedState/isQueuedState/deletePublerPost`, **`scheduleLinkedinPost({text,accountId,mediaUrl?,link?})`** ruft `/posts/schedule/publish` (sofort, ohne Publer-Kalender; MICM-33), pollt Job (≤15×), extrahiert echte Post-IDs. `uploadMediaFromUrl` (async, Poll), `pollJobStatus`.

### 5.4 Scheduler
**`scheduler/tick.ts`** — `runScheduleTick(now?)`: **fresh** Settings-Read → je Schedule fällige `pending`+slot-gebundene Instanzen aufsteigend → `publishEntry`: Blog/Article via `publishPost({overrideDate:slotDatum})`, danach angehängte content-complete LinkedIn-Posts; Erfolg→`published`, Fehler→`errorCount++`(`lastError`), `>=RETRY_CAP(3)`→`failed`; **partielles Coupled-Failure** (Blog live, LinkedIn-Post scheitert) → LinkedIn-Instanz bleibt/re-pending im selben Slot; `isPublishedOrMissing` (Blog `published===true`, LinkedIn `cm_publer_published_at`) → skip. Verpasste Slots feuern beim nächsten Tick am **geplanten** Datum (kein „jetzt"). Ein finaler Write.
**`scheduler/normalize.ts`** — `normalizeSchedules(raw)` migriert Legacy-Shapes (`queue/sidelined`) idempotent ins SlotInstance-Modell; deterministische Slot-IDs `slot-${weekday}-${time}`; orphan-ID `orphan-${storyUuid}`. `isOrphan(instance,schedule)`.
**`schedule-time.ts`** — DST-korrekte Zeitmathematik via `Intl`: `weekStartOf`, **`instanceDate(slot,weekStart,tz)`** (single source „wann"), `deriveUpcomingSlots`/`nextFreeFutureSlot` (`SCHEDULE_HORIZON_WEEKS=8`), `ymdInZone`.

### 5.5 Intake (MS Graph)
**`mail-inbox.ts`** — OAuth2 **Client-Credentials** (App-Permissions, Service-Account; `AZURE_TENANT_ID/CLIENT_ID/CLIENT_SECRET`, Scope `.default`), Token gecached (60 s Puffer). `fetchNewEmails()` (ungelesen, top 50), `fetchEmailWithAttachments(id)` (Body→Plaintext via `stripHtml`, Attachments base64→UTF-8), `deleteEmail`/`markAsProcessed`. 401/403 → Cache-Clear + 1 Retry.

### 5.6 MCP
**`mcp-posts.ts`** — read-side für MCP: `listPosts({types?,intake_pending?,published?})`, `getPost({id?|slug?})`, `updatePostFromMcp({…})` (Feld-Typ-Validierung blog/article vs. linkedin; Body muss Block-Array sein; Republish wenn live). `buildScheduledMap()` (uuid→Slot-Datum für pending+slot-gebundene Instanzen).
**`mcp-tokens.ts`** — `listMcpTokens/createMcpToken(name)`(32-byte, `micm_`-Prefix, Hash gespeichert, Plaintext einmalig)/`revokeMcpToken/validateMcpToken` (constant-time `timingSafeEqual`; Settings 30 s gecached).

### 5.7 Config, Auth & Helfer
**`system-config.ts`** — `getSystemConfig({fresh?})`/`updateSystemConfig(updates)`; 30 s TTL (`CONFIG_CACHE_TTL_MS`), Story-ID-Cache, 429-Backoff (3×); Write mit `publish:1` + Cache-Warming (Read-after-write, MICM-20 AK6). **`settings-storage.ts`** — `getSettings({fresh?})` (normalisiert Schedules bei jedem Read), `updateSettings`, `saveScheduleTemplates` (merged Template per ID, **bewahrt** server-eigene `slotInstances`).
**`auth.ts`** — NextAuth, GoogleProvider, JWT-Session, Whitelist-Check im `signIn`-Callback. **`auth-guard.ts`** — `requireAuth()`/`getAuthSession()`/`isEmailWhitelisted()`. **Helfer:** `posts-list.ts` (server-seitige Filterung scope/content/linkedin/q), `transform-storyblok.ts` (Story→`BlogPost`/`LinkedinPost`), `editor-kind.ts`, `richtext-utils.ts`, `tiptap-paste.ts`, `utils.ts`.

---

## 6. API-Routen (`src/app/api/**`)

Alle UI-Routen verlangen NextAuth-Session+Whitelist (außer markiert). Routen sind dünne Orchestratoren der `lib/`-Funktionen.

| Route | Methoden | Zweck / Kontrakt |
|---|---|---|
| `ai/generate` | POST | `{type, sourceRaw?, sourceSummarized?, hint?, modelId?, contentType?, blogBodyVariant?, text?, instruction?, isFullDocument?, storyId?}`; type ∈ pagetitle/abstract/pageintro/teasertitle/readmoretext/body/linkedin/tags/optimize → `{success, <feld>, modelUsed}`. Persistiert bei `storyId` (blog/article). |
| `ai/generate-image` | POST | `action: 'prompt'|'image'|'upload'` → `{imagePrompt}` / `{base64}` / `{assetUrl,assetId}` |
| `ai/models` | GET | `{models, allModels, providers, defaultModel}` |
| `auth/[...nextauth]` | GET/POST | NextAuth-Handler |
| `cron/tick` | POST | **Bearer `CRON_SECRET`** ODER Session → `runScheduleTick()` → `{ranAt, results[]}` |
| `import/emails` | GET | `fetchNewEmails()` → `{emails[]}` |
| `import/process` | POST | `{emailIds[], targets?}` → Drafts (blog/linkedin) anlegen, Mail löschen → `{results[]}` |
| `posts` | GET/POST/PATCH | Liste (CDN+Mgmt merge) / Blog-Article anlegen / aktualisieren |
| `posts/list` | GET | `?scope=&content=&linkedin=&q=` server-seitig gefiltert |
| `posts/[id]` | GET | Einzelpost per Slug |
| `posts/[id]/publish` | POST/DELETE | Publish / Unpublish |
| `posts/upload` | POST | Asset-Upload (FormData) → `{id,filename,publicUrl}` |
| `linkedin` | GET/POST/PATCH | Liste(+Eltern-Preview gebündelt)/anlegen(standalone\|attached)/aktualisieren |
| `linkedin/[id]` | GET | Einzel-LinkedIn + Eltern-OG |
| `mcp` | POST | **Bearer-Token** (gehasht); Tools `create_draft/list_posts/get_post/update_post` |
| `publishing/linkedin` | POST | `{id}` → `publishLinkedinNow()` → `{success,replaced,postIds,jobId}` |
| `publishing/publer` | POST | Multi-Channel-Blog-Publish (Scaffolding; LinkedIn live) |
| `publishing/publer/accounts` | GET | verbundene Publer-Accounts |
| `schedule` | GET | Editorial-Plan: Schedules+Slots+Instanzen (Batch-Resolve, abgeleitete Daten, Orphan-Flag) |
| `schedule/assign` | POST/DELETE | Post an Slot binden (content-complete-Gate, auto/man. Slot) / entfernen |
| `schedule/move` | POST | Post in andere Woche/Slot verschieben |
| `settings` | GET/PATCH | Settings lesen / schreiben (Schedules via `saveScheduleTemplates`) |
| `settings/tokens` | GET/POST | MCP-Tokens listen / anlegen (Plaintext einmalig) |
| `settings/tokens/[id]` | DELETE | Token widerrufen |

---

## 7. Auth & Middleware

**`src/middleware.ts`** — geschützt: `/dashboard,/posts,/linkedin,/import,/settings,/schedule` + `/api/{posts,linkedin,publishing,import,ai,schedule}`; **öffentlich:** `/login`, `/api/auth`, **`/api/mcp`** (eigener Bearer-Token). UI-Routen → Redirect `/login`; API → 401. Drei Auth-Pfade: **NextAuth/Google** (UI+API), **Bearer `CRON_SECRET`** (Scheduler-Tick headless), **gehashter MCP-Token** (MCP-Server). Whitelist = `ADMIN_WHITELIST` (Komma-getrennt).

---

## 8. Frontend (wird neu gebaut) — Referenz des Ist-Verhaltens

### 8.1 App-Shell & Setup
Root-`layout.tsx` mit Providern: NextAuth `SessionProvider`, react-query `QueryClient`, Theme (`next-themes`), Toaster (`sonner`). `(admin)/layout.tsx` rendert `components/layout/AppLayout.tsx` (Sticky-Header-Nav: Dashboard, Posts, LinkedIn, Schedule, Import, Settings; Desktop-Labels, Mobile-Hamburger). Fonts: Playfair Display (Headings) + Inter (Body). Theme: dunkles „Luxury"-Design, Gold-Akzent; Theme-Tokens + TipTap-Styles in `app/globals.css`. Root-`page.tsx` redirectet (→ Dashboard/Login).

### 8.2 Seiten
- **`(auth)/login`** — Google-OAuth-Button (NextAuth `signIn`).
- **`dashboard`** — 4 Stat-Cards (Posts gesamt, content-complete, published, LinkedIn) + Recent-Activity-Liste; `recharts`. Quelle: `fetchStatistics` (via Route).
- **`posts`** — Zwei-Achsen-Status-Filtergrid (Content · LinkedIn) mit Count-Badges, Suche, Grid/List-Toggle, Bulk-Delete. **URL-State** (`view,q,scope,content,linkedin`, 300 ms debounced). Ruft `GET /api/posts/list` und `GET /api/linkedin` (join → `linkedinByBlog`-Map an `PostCard`). Filter-Serialisierung `r/y/b/g`.
- **`posts/[id]`** — größtes File (~1700 Z.). Links: TipTap-Body-Editor + LinkedIn-Sektion; rechts (sticky): AI-Settings-Drawer (Modellwahl, Hint), Status/Publish-Controls, Meta-Felder, Quellmaterial. Per-Feld-**Generate**-Buttons + Batch „Generate All" (Progress); **Bild-Flow** (auto-Prompt→DALL·E→Preview→Upload bei Save); **Optimize**-Dialog (Selektion/Voll-Dokument, Revert-Snapshot). **Dirty-Tracking** per JSON-Snapshot. **Intake-Resolution** (MICM-22: `intakePending` → Typwahl, setzt `cm_intake_pending=false`). Ruft `posts`, `posts/[id]`, `posts/[id]/publish`, `ai/generate`, `ai/generate-image`, `ai/models`, `schedule/assign`.
- **`linkedin`** — LinkedIn-Karten mit Status-Filtern; Eltern-Marker; „Standalone anlegen".
- **`linkedin/[id]`** — LinkedIn-Editor (`LinkedinEditor.tsx`): Text, Bild (standalone), Tags, Attach/Detach zum Blog, Publer-Label, **Publish-Button** (`publishing/linkedin`).
- **`schedule`** — zwei Ansichten: **Tracks** (Lanes × Slots, Drag&Drop-Zuweisung/Swap) und **Kalender** (Wochengrid). „Run now" → `cron/tick`. Ruft `GET /api/schedule`, `schedule/assign`, `schedule/move`.
- **`import`** — Posteingangsliste (MS-Graph), pro Mail Ziel-Selektor blog/linkedin, Import → `import/process`.
- **`settings`** — Tabs: KI-Prompts, Modellwahl, Publer-Labels, Schedules (Templates), Notizen, **MCP-Tokens** (anlegen/widerrufen). Ruft `settings`, `settings/tokens`, `ai/models`.
- **`create`** — einfaches Formular: Titel + TipTap-Quellmaterial-Eingabe → `POST /api/posts`.

### 8.3 Komponenten-Inventar
`layout/AppLayout.tsx` (Header+Mobile-Menü). `dashboard/{StatCard,ActivityList}`. `posts/PostCard` (Grid/List, Selektion, Status-Dots). `linkedin/{LinkedinEditor,LinkedinCard,BlogLinkedinSection}`. `scheduler/{ScheduleAssign,ScheduleTracksView,ScheduleCalendarView}`. `publer/PublerSection` (Label + Publish). `icons/`. `ui/` = shadcn/Radix-Primitives (button, input, dialog, alert-dialog, select, tabs, tooltip, dropdown-menu, popover, drawer(vaul), command(cmdk), toast/sonner, …).

### 8.4 Block-Editor (`components/blocks/`)
`BodyEditor.tsx` — Drag&Drop-Container (`@dnd-kit`), „Block hinzufügen"-Dropdown. **6 Blocktypen** → Storyblok-Body-Array: `richtext` (`RichtextBlock.tsx`, TipTap: Headings, bold/italic, Links, Listen, Blockquote, Codeblock(lowlight), Tabellen), `picture` (style normal/keyvisual/small, spacing), `youtube` (id+format), `video` (Datei), `divider`, `hyperlink` (url+label). `CreatePageEditor.tsx` für die Quellmaterial-Eingabe. KI-Body kommt als Markdown → `markdownToProsemirror` → TipTap-JSON.

### 8.5 Querschnitts-UI-Muster
**Status-Pipelines (MICM-37):** zwei Achsen (Content · LinkedIn), Farben rot(fehlt)→gelb(in Arbeit)→blau(scheduled)→grün(published); Filtergrid mit Count-Badges, farbige Dots auf Karten. **Bestätigungen** ausschließlich via `AlertDialog`/`Dialog` (nie native `confirm/alert/prompt`). **Toasts** via `sonner`. **AI-Generate-Pattern:** `generating: Set<string>` pro Feld, `generateAllProgress` für Batch, `generatingImage: 'prompt'|'image'|null`.

---

## 9. Build, Betrieb & Konfiguration

**Makefile (primäre Verifikation):** `make check` = `lint`+`typecheck` (`next lint` + `tsc --noEmit`). `make dev`/`stop`, `make build` (nur für Deployment — Build killt Dev-Server), `make sb-sync` = `sb-pull`+`sb-types` (Komponenten-Schema ziehen + TS-Typen `component-types-sb.d.ts` regenerieren, Space `330326`), `make docker-{build,up,down}`. **Kein Test-Suite** (kein jest/vitest/playwright) — „verify" = `make check` + manuell in `make dev`.

**`next.config.ts`:** `output:'standalone'`, `transpilePackages` (react-markdown, remark-gfm, remark-breaks), Image-`remotePatterns` (a.storyblok.com, *.sharepoint.com, lh3.googleusercontent.com).

**Env-Variablen (`env.example`):**

| Gruppe | Variablen |
|---|---|
| Storyblok | `NEXT_PUBLIC_STORYBLOK_TOKEN`, `STORYBLOK_MANAGEMENT_TOKEN`, `STORYBLOK_SPACE_ID=330326`, `NEXT_PUBLIC_STORYBLOK_DISABLECACHING` |
| Auth | `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_WHITELIST` |
| KI | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_AI_API_KEY` (≥1 nötig) |
| Mail-Intake | `MAILINBOX_USERNAME`, `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` |
| Publer | `PUBLER_API_KEY`, `PUBLER_API_URL`, `PUBLER_WORKSPACE_ID` (+ `PUBLER_LINKEDIN_ACCOUNT_ID` im Code) |
| Scheduler | `CRON_SECRET` |
| Website-Revalidate | `WWW_REVALIDATE_URL`, `WWW_PUBLIC_BASE_URL` |
| Dev | `NODE_ENV`, `APP_PORT`, `DEBUG`, `LOG_LEVEL` |

> Headless-Scheduler: externer Cron (ansible-verwaltet auf dem Server) ruft `POST /api/cron/tick` mit `Authorization: Bearer $CRON_SECRET`.

---

## 10. Querschnitts-Invarianten (für den Neubau wichtig)

- **Storyblok `is` vs `in`:** String-Gleichheit braucht `in` (sonst Filter still ignoriert → alle Treffer).
- **`published` Boolean, nie `published_at`:** Letzteres bleibt nach Unpublish stehen.
- **Rate-Limits:** Storyblok ~5 req/s; `managementFetch` + `system-config` retrien mit Backoff; Bulk per `by_uuids` (per_page=100) statt Request-Flut.
- **Idempotenz:** Scheduler status-basiert; LinkedIn-Publish über Publer-State (published⇒block, queued⇒replace); Storyblok-Publish idempotent.
- **Caching:** System-Config 30 s, `fresh`-Read für Read-Modify-Write (Scheduler, Schedule-Edits, Token-Create).
- **Coupling Blog↔LinkedIn:** Blog zuerst publishen, dann angehängte content-complete LinkedIn-Posts (sonst greift der 409-Guard).
- **Keine nativen Dialoge** in der UI; Destruktives immer modal bestätigen.

---

## 11. Transformations-Hinweise (Brücke zum Seed)

**Erhalten (Backend, Abschnitt 5–7):** KI-Generierung inkl. Prompts, LinkedIn/Publer-Publish-Contract, Scheduler (Slots/Tick/Zeitmathematik), Intake (MS Graph), MCP, Status-Aggregation, Auth-Pfade. Diese Logik ist persistenz-agnostisch genug, um den Umzug zu überstehen.

**Neu bauen (Frontend, Abschnitt 8):** Die gesamte UI gemäß Seed §… — als Referenz dient Abschnitt 8; Zielbild ist u. a. die Multi-Format-Tab-UI der ZDB-Variante (siehe Bestandsanalyse).

**Persistenz-Umzug Storyblok → Supabase (Seed §7.1):**
1. `storyblok.ts` + `storyblok-management.ts` durch Supabase-Client ersetzen (read/write).
2. `system-config.ts` → Supabase-`settings`-Tabelle (die ZDB-Variante hat dieses Modell bereits — JSONB-Singleton).
3. Scheduler-, KI-, LinkedIn-, Publer-, Intake-Logik bleibt unverändert; Routen bleiben Schnittstelle, nur das I/O dahinter wechselt.
4. **Storyblok wird vom Primärspeicher zum Publishing-Adapter** (ein Channel unter vielen) — konsistent mit der Adapter-Architektur des Seeds (§6.2) und dem Entitätenmodell Post → Publikation → Channel (§7.3).

**Bekannte Altlasten/Abweichungen:** `package.json name` (Luxarise-Legacy); nicht-verdrahtete Publer-Multi-Channel-Formatter; viele Legacy-Storyblok-Komponenten im Space; Modell-IDs/Prompts driften (editierbar). Beim Neubau ist der Schnitt entlang `lib/` (Logik) vs. `app/(admin)` + `components/` (UI) der natürliche Trenn-Punkt.

---

_Quellen: vollständige Code-Inventur von `io.meimberg.contentmanager` (lib-Module, API-Routen, Frontend-Seiten/Komponenten, Typen, Build/Env) am 29.06.2026._
