# Bestandsanalyse & Gesamtrequirements

_Analyse der zwei existierenden Tool-Versionen und Ableitung eines fusionierten Gesamt-Requirements als Grundlage für die Produktdefinition (SmartEditor)._

_Stand: 29.06.2026 · Ergänzung zum [`product_seed.md`](product_seed.md)_

---

## 0. Zweck & Vorgehen

Der [Produkt-Seed](product_seed.md) hält fest: Aus dem heutigen „Content Manager" soll ein verkaufbares Produkt („SmartEditor") werden, das **kanal- und zielsystem-agnostisch** ist. Es existieren bereits **zwei** auseinandergelaufene Versionen desselben Kerns. Dieses Dokument inventarisiert beide vollständig auf Requirements-Ebene, stellt sie gegenüber (was hat A, was hat B nicht — und umgekehrt) und leitet ein **Gesamtrequirement** ab.

**Leitsatz aus dem Seed:** Die Version in diesem Repo ist am weitesten entwickelt und damit die **Basis für alles**. Was für den ZDB gebaut wurde, wird auf Requirements-Ebene **dazugeholt**, statt es als zweiten Fork weiterzuführen. Der Kern darf nicht weiter forken.

| | **Version A — SmartEditor** | **Version B — ZDB SmartEditor** |
|---|---|---|
| Repo | `io.meimberg.contentmanager` (dieses) | `zdb.airedak` (`git.form4.de/zdb/baugewerbe-digital`) |
| Rolle | Persönliches Blog-/LinkedIn-Tool von O. Meimberg | Demo/Fork für ZDB (Zentralverband Deutsches Baugewerbe) |
| Reifegrad | **Höher** (mehr Features, produktiv genutzt) | Geringer, dafür architektonisch näher am Zielbild |
| Persistenz | **Storyblok** (CMS als DB) | **Self-hosted Supabase / PostgreSQL** ← Zielarchitektur |
| Output | Blog, Article, LinkedIn (gekoppelt) | Multi-Format: Rundschreiben, Pressemeldung, LinkedIn, WhatsApp |
| Auth | Google OAuth | Azure AD / Microsoft 365 |

**Zentrale Erkenntnis:** Die beiden Versionen sind komplementär. **A** ist auf der **Prozess-/Publishing-Achse** weiter (Scheduler, LinkedIn↔Blog-Kopplung, MCP, Intake-UI, Block-Editor, Status-Pipelines). **B** ist auf der **Architektur-/Multi-Format-Achse** weiter (lokale DB als Primärpersistenz, echtes Multi-Format-Modell, breiteres Publer-Kanalset, Azure-Auth). Das Gesamtprodukt ist die Vereinigung beider — auf dem Datenmodell von B, mit den Prozessfeatures von A.

---

## Teil A — Version A: SmartEditor (dieses Repo)

### A.1 Tech-Stack
Next.js 15 (App Router) · React 18 · NextAuth v4 (Google OAuth) · shadcn/ui + Radix + Tailwind · TipTap (Block-Editor) · `@dnd-kit` (Drag & Drop) · `mcp-handler` (MCP-Server) · Storyblok Management-API (write) + Delivery-API (read) · Multi-Provider-KI (OpenAI/Anthropic/Google) · DALL·E 3 (Bild) · Cron-Scheduler · Microsoft Graph (Mail-Import).

### A.2 Content-Modell
- **Drei Story-Typen** (über `content.component`):
  - **`blog`** (Ordner `b`) — persönlicher Blogbeitrag; Variante `cm_blog_variant` ∈ {`short`, `long`} steuert nur den Body-Prompt.
  - **`article`** (Ordner `a`) — sachlicher/neutraler Artikel.
  - **`linkedin_post`** (Ordner `linkedin`) — LinkedIn-only, immer Draft (nie auf der Website).
- **Blog-/Article-Felder:** `pagetitle` (max 80), `pageintro`, `date`, `teasertitle` (max 60), `abstract` (max 120), `readmoretext` (max 50), `headerpicture` (Asset), `teaserimage` (Asset), `body` (Block-Array).
- **„Content complete"** = alle 9 Felder befüllt → `cm_content_complete` (bool) + `cm_content_confirmed_at` (Timestamp).
- **Publish-State:** Storyblok-nativ (`published` + `published_at`); kein eigenes Feld. Nur publizierte Stories rendern auf der öffentlichen Website (`../io.meimberg.www`); Draft-only = unsichtbar (bewusster Mechanismus).
- **`cm_*`-Metadaten** auf der Story: `cm_source_raw`, `cm_source_summarized`, `cm_ai_hint`, `cm_image_prompt`, `cm_origin` (`import`|`create`|`mcp`), `cm_intake_pending`, `cm_blog_variant`, `cm_blog_ref` (LinkedIn→Blog-UUID), `cm_publer_published_at`, `cm_publer_post_ids`, `cm_publer_label`, `cm_tags`.

### A.3 KI-Generierung
- **Per-Feld-Generierung** (`POST /api/ai/generate`): `pagetitle`, `pageintro`, `teasertitle`, `abstract`, `readmoretext`, `body`, `linkedin`, `tags`, `optimize` (freie Umformulierung mit Instruktion).
- **Body-Prompt nach Typ+Variante:** `bodyBlogShort` (~350–600 W), `bodyBlogLong` (~800–1500 W), `bodyArticle` (sachlich/neutral).
- **Bild:** `POST /api/ai/generate-image` mit Aktionen `prompt` (DALL·E-Prompt aus Quelle generieren), `image` (DALL·E 3), `upload` (nach Storyblok). Eigene Bild-Meta-Prompts für Blog (`headerImage`) vs. Article (`headerImageArticle`).
- **Provider-agnostisch** über `ai-provider.ts`; Modell pro Request überschreibbar; App-Default in `settings.aiModel`.

### A.4 Kanäle / Publishing
- **Storyblok-Publish** (Blog/Article): Draft → Publish/Unpublish via Management-API; optional Revalidate der Website.
- **LinkedIn via Publer** (einziger Live-Social-Kanal):
  - **Standalone** (eigener Text + eigenes Bild) oder **attached** (an Blog gekoppelt via `cm_blog_ref`, sendet Publer `type:'link'`-Share mit der OG-Vorschau des Blogs).
  - Contract (MICM-17): Content Manager bestimmt Timing („post now"), Publer ist Push-API; Idempotenz: publizierter Post blockt Republish (409), noch gequeuter wird ersetzt.
  - Publish-Guard (MICM-12): attached Post braucht **publizierten** Eltern-Blog.
- **Nicht verdrahtet:** Instagram-/Threads-/Pinterest-Formatter in `publer.ts` und `components/publer/` sind kopiertes Scaffolding (Luxarise), in A nicht aktiv.

### A.5 Scheduling (ausgereift — MICM-14/16/20/32)
- **Modell:** wöchentlich wiederkehrende **Slots** (`weekday`+`time`, stabile `id`) + **SlotInstances** (konkrete Woche × Story, Status `pending`/`published`/`failed`/`skipped`) je **Schedule** (Track mit Timezone `Europe/Berlin`).
- **Tick-Engine** (`scheduler/tick.ts`): fällige Instanzen aufsteigend abarbeiten; Blog zuerst publizieren, dann gekoppelte content-complete LinkedIn-Posts; Retry-Cap (3 Fehlversuche → `failed`); Orphan-Handling (Slot gelöscht → „neu zuordnen"); ein finaler Write.
- **Cron** (`POST /api/cron/tick`): Bearer-Token (headless) **oder** Session (Admin-Button „run now").
- **UI** (`/schedule`): Tracks-Ansicht (Lanes × Slots, Drag&Drop) + Kalender-Ansicht; 12-Wochen-Horizont.

### A.6 Intake (Mail/Plaud — funktionsfähig inkl. UI)
- **Microsoft Graph** (`mail-inbox.ts`, OAuth2 Client-Credentials): ungelesene Mails listen, Body+Attachments (Plaud-Transkripte) extrahieren, als Draft (`blog` oder `linkedin_post`, `cm_origin='import'`) anlegen, Mail als gelesen markieren.
- **UI** (`/import`): Posteingang prüfen, Mails + Ziel wählen, importieren.

### A.7 Auth
- NextAuth v4 + **Google OAuth**; E-Mail-Whitelist (`ADMIN_WHITELIST`) in `signIn`-Callback **und** Middleware.
- **MCP-Auth separat:** gehashte Bearer-Tokens (`settings.mcpTokens[]`, SHA-256), MCP-Route umgeht NextAuth.

### A.8 MCP-Server (`POST /api/mcp`)
Tools: **`create_draft`** (Intake-only, `cm_intake_pending=true`), **`list_posts`** (Filter nach Typ/Status), **`get_post`** (Volldetail), **`update_post`** (Merge-Update, Republish wenn live). Ermöglicht LLM-/Automatisierungs-Zugriff auf den Bestand.

### A.9 Editor (Block-basiert)
TipTap-Block-Editor mit Blocktypen **richtext, picture, youtube, video, divider, hyperlink**; Drag&Drop-Reordering; Markdown↔ProseMirror-Konvertierung (KI liefert Markdown → ProseMirror-JSON).

### A.10 Status / Pipelines / Dashboard
- **2-Pipeline-Modell** (MICM-37): „Content" (rot/gelb/grün) · „LinkedIn" (rot/gelb/grün/blau=scheduled/grau). Server-seitige Filterung (`/api/posts/list?content=…&linkedin=…&q=…`).
- **Dashboard:** Kennzahlen (Posts gesamt, content-complete, published, LinkedIn) + Recent Activity.

### A.11 Settings (in Storyblok-Story `contentmanager_config`)
`aiModel`, `aiPrompts` (alle Feld-/Varianten-Prompts), `notes`, `publerLabels` (Slot-Labels MICM-13), `schedules[]`, `mcpTokens[]`. Settings-Page mit Tabs: Modelle · Prompts · Publer-Labels · MCP · Verschiedenes. 30 s In-Memory-Cache.

---

## Teil B — Version B: ZDB SmartEditor

### B.1 Tech-Stack
Next.js 15 · React 18 · NextAuth v4 (**Azure AD / Microsoft 365**) · shadcn/ui + Tailwind · TipTap · **Self-hosted Supabase** (PostgreSQL, Auth, Storage, Kong-Gateway — 13-Service-Docker-Stack) · Traefik (Prod) · GitLab CI/CD · Multi-Provider-KI · Publer.

### B.2 Persistenz / Datenmodell (PostgreSQL — **das Zielmodell**)
- **Tabelle `public.posts`** (zentrale Entität):
  - `id` (UUID PK), `slug` (UK).
  - Blog-Meta: `pagetitle`, `pageintro`, `date`, `teasertitle`, `abstract`, `readmoretext`.
  - Bilder: `headerpicture`, `teaserimage`.
  - **`body` (JSONB, deprecated)** + **`content_formats` (JSONB)** — Kern: Keys `rundschreiben`, `pressemeldung`, `linkedin`, `whatsapp`, jeweils ein TipTap-/ProseMirror-Dokument.
  - Quelle: `source_raw`, `source_summarized`; KI: `ai_hint`, `image_prompt`.
  - Status: `content_complete` + `content_confirmed_at`; `published` + `published_at`; `socialmedia` + `publer_published_at` + `publer_post_ids` (TEXT[]).
  - `created_at`, `updated_at` (Trigger). Indizes auf `slug`, `created_at`. **RLS:** Service-Role voll; public SELECT nur wo `published=true`.
- **Tabelle `public.settings`** (JSONB-Singleton `id='system'`): `aiModel`, `aiPrompts` (inkl. Format-Prompts), `notes`. Service-Role only.
- **Storage-Bucket `assets`** (public read): Header-/Teaser-/generierte Bilder, Pfad `posts/{ts}-{name}`.

### B.3 Multi-Format-Modell (das Alleinstellungsmerkmal von B)
Aus **einer** Quelle werden **mehrere parallele Formate** erzeugt (`content-formats.ts`):

| Format | Länge | Tonalität | Zweck |
|---|---|---|---|
| **Rundschreiben** | 600–1200 W | sachlich, gegliedert (##/###) | Verbands-/Mitglieder-Rundschreiben |
| **Pressemeldung** | 300–600 W | journalistisch, Lead-first | Pressemitteilung |
| **LinkedIn** | ~1300 Zeichen | professionell, Hook+CTA, 2–4 Hashtags | Social |
| **WhatsApp** | 2–5 Sätze, ~500 Z. | konversationell, Plaintext | Instant-Messaging |

Jedes Format: eigenes JSONB-Dokument, **eigener Prompt mit Längen-/Tonalitäts-Vorgabe**, unabhängig editierbar (Tabs in der UI), separat publizierbar.

### B.4 KI-Generierung
Wie A provider-agnostisch (OpenAI/Anthropic/Google, Vision), aber Generierungstypen um die **Format-Typen** erweitert (`rundschreiben`/`pressemeldung`/`linkedin`/`whatsapp`) plus `optimize`. Prompts in `settings.aiPrompts` (DB), per UI editierbar; Default-Prompts in `settings-storage.ts`. Prompt-Aufbau: Quellkontext (Summary + Rohtranskript) + gespeicherter Prompt + optionaler Titel-Kontext + `ai_hint`.

### B.5 Kanäle / Publishing (breiteres Publer-Set)
- **Website-Publish** (`/api/posts/[id]/publish`): `published=true/false`.
- **Publer** verdrahtet für **Instagram, Facebook, Pinterest, Twitter/X, Threads** mit plattformspezifischen Formattern (`formatForInstagram/Facebook/Pinterest/…`, Hashtag-Limits, Truncation, Auto-Schedule 9–21 h). `publer_post_ids` persistiert.
- **Export/Download** (Word/PDF/Markdown) als UI-Ansatz vorhanden.
- **E-Mail-Versand**: durch Modell vorgesehen, noch nicht implementiert.

### B.6 Scheduling
**Kein eigener Scheduler** — Scheduling ausschließlich über Publers Auto-Schedule (Zeitfenster, kein lokales Slot-/Kalendermodell, keine UI).

### B.7 Intake
`source_raw`/`source_summarized` im Modell (Plaud/Mail vorgesehen); **kein** dediziertes Mail-Import-UI/Graph-Anbindung wie in A sichtbar — manuelle Anlage + Felder.

### B.8 Auth
NextAuth + **Azure AD** (`AZURE_CLIENT_ID/SECRET/TENANT_ID`, Scope `openid profile email`, JWT 30 d) + E-Mail-Whitelist. Kein Rollensystem (alle authentifizierten = Admin). **Kein Google, kein E-Mail/Passwort.**

### B.9 UI-Surfaces
`/login` (Azure), `/dashboard` (Stats + Recharts), `/posts` (Liste, Tri-State-Status-Dots, Filter/Suche/Grid), **`/posts/[id]`** (Editor mit Metadaten, Quellmaterial, Header-Bild-Generierung, **Multi-Format-Tabs**, AI-Settings-Drawer, Optimize-Dialog, Publer-Publishing-Sektion), `/settings` (Modell + Prompts + Reset).

### B.10 Betrieb / Deployment
Monorepo (`web/` + `supabase/` + `scripts/` + `docs/`); Docker-Compose Dev/Prod; Traefik; GitLab-CI; Prod-URLs `smarteditor.zdb.form4.dev`, `…-api/…-studio.form4.dev`; `sync-prod-to-local.sh`. Single-Instance pro Deployment (keine Mandantenfähigkeit).

---

## Teil C — Gegenüberstellung (Feature-Diff)

### C.1 Gemeinsamer Kern (beide Versionen)
Next.js 15 / React 18 / shadcn / Tailwind / TipTap · NextAuth + E-Mail-Whitelist · Multi-Provider-KI (OpenAI/Anthropic/Google) mit Per-Feld-Generierung + `optimize` · Blog-Metadatenfelder (pagetitle, pageintro, abstract, teasertitle, readmoretext, date, header-/teaserimage) · `source_raw`/`source_summarized` + `ai_hint` + `image_prompt` · `content_complete` + `confirmed_at` · DALL·E-Bildgenerierung · Publer-Anbindung · Settings-Page (Modell + Prompts) · Dashboard + Postliste mit Status-Dots.

### C.2 Nur in A (SmartEditor) — fehlt in B
| Feature | Anmerkung |
|---|---|
| **Eigener Scheduler** | Wöchentliche Slots, SlotInstances, Tracks-/Kalender-UI, Cron-Tick, Retry-Cap, Orphan-Handling (MICM-14/16/20/32) |
| **LinkedIn↔Blog-Kopplung** | Attached Posts, OG-Link-Share, Publish-Guard, gekoppeltes Publishing im Tick |
| **Idempotenter Publer-Push-Contract** | 409 bei published, Replace bei queued (MICM-17) |
| **MCP-Server** | `create_draft`/`list_posts`/`get_post`/`update_post` + gehashte Bearer-Tokens |
| **Mail-/Plaud-Intake mit UI** | MS-Graph-Anbindung + `/import`-Seite |
| **Block-Editor** | picture/youtube/video/divider/hyperlink + Drag&Drop |
| **Content-Typen + Varianten** | blog (short/long), article — typ-/variantenspezifische Body- & Bild-Prompts |
| **Intake-Pending-Flow** | MCP-Draft ohne Typwahl (MICM-22) |
| **Origin-Tracking** | `cm_origin` import/create/mcp |
| **2-Pipeline-Status** | Content · LinkedIn, inkl. „scheduled" (blau) |
| **Storyblok-Publish + Website-Render** | Draft-only = unsichtbar als bewusster Mechanismus |
| **Publer-Labels** | benannte Posting-Slots (MICM-13) |

### C.3 Nur in B (ZDB) — fehlt in A
| Feature | Anmerkung |
|---|---|
| **Supabase/PostgreSQL als Primärpersistenz** | ← genau die Architektur, die der Seed fordert; RLS, Storage-Bucket, Migrationen |
| **Echtes Multi-Format-Modell** | `content_formats` JSONB — mehrere parallele Publikationen aus einer Quelle |
| **Format-Definitionen mit Länge+Tonalität** | rundschreiben/pressemeldung/linkedin/whatsapp deklarativ |
| **Multi-Format-Editor-UI** | Tabs pro Format |
| **Breiteres Publer-Kanalset (live)** | Instagram, Facebook, Pinterest, Twitter/X, Threads mit Formattern |
| **Azure AD / Microsoft-365-Login** | als verdrahteter Auth-Provider |
| **Settings als DB-Tabelle** | statt CMS-Story |
| **Self-hosted-Stack + Deployment-Topologie** | Docker-Compose, Traefik, GitLab-CI, Prod-Domains |
| **Dokument-Export-Ansatz** | Word/PDF/Markdown in der UI angedacht |

### C.4 Begriffs-/Konzept-Kollisionen (beim Merge zu klären)
- **„LinkedIn"**: in A eigener Story-Typ mit Blog-Kopplung; in B ein Format unter `content_formats`. → Im Zielmodell wird LinkedIn **eine Publikation** unter vielen (siehe Seed-Entität „Publikation").
- **Settings-Ort**: A=Storyblok-Story, B=DB-Tabelle. → Ziel: DB.
- **Persistenz**: A=Storyblok (Primär), B=Supabase. → Ziel: Supabase als Primär, Storyblok wird zum **Publishing-Adapter** degradiert (Seed §49).
- **Modell-IDs** divergieren (A liest aktuelle Provider-Liste, B `gpt-4o`/`claude-opus-4`) — irrelevant fürs Requirement, beide sind provider-agnostisch.

---

## Teil D — Gesamtrequirement (fusioniert)

> Vereinigungsmenge beider Versionen, organisiert nach Capability-Domänen. **Basis** = Version A (dieses Repo), sofern nicht anders vermerkt. Jede Zeile markiert Herkunft: **[A]** vorhanden in A · **[B]** vorhanden in B · **[A+B]** beide · **[NEU]** aus dem Seed, in keiner Version vorhanden.

### D.1 Datenmodell & Persistenz
- **[B→Basis]** Primärpersistenz in **lokaler relationaler DB (Supabase/PostgreSQL)**; Storyblok/LinkedIn/… werden nur noch Publishing-Ziele.
- **[NEU]** Kern-Entitäten (Seed): **Post** (1 Quelle/Seed) → **Publikation** (kundenspezifisches Zielformat) → **Channel** (Publishing-Ziel). Begriff für „Publikation" final festzulegen.
- **[B]** Eine Quelle erzeugt **n parallele Publikationen** (`content_formats`-Prinzip), je als eigenständiges Dokument.
- **[A+B]** Gemeinsame Meta- & Quellfelder (title/intro/abstract/teaser/readmore/date/images, `source_raw`/`source_summarized`, `ai_hint`, `image_prompt`).
- **[A]** Status je Objekt (`content_complete`+`confirmed_at`, Publish-State, Publer-State) — pro Publikation, nicht pro Post.
- **[A]** Origin-Tracking (`import`/`create`/`mcp`), Intake-Pending.

### D.2 Intake / Seed
- **[A]** Mail-/Plaud-Import via MS Graph **inkl. UI** als Basis.
- **[A+B]** `source_raw` + `source_summarized` + `ai_hint`.
- **[NEU/Seed]** Ein Post kann ggf. **mehrere Seeds** haben (offen).

### D.3 KI-Generierung (der geheime Mehrwert)
- **[A+B]** Provider-agnostisch (OpenAI/Anthropic/Google), Modell überschreibbar, `optimize`.
- **[B→generalisiert]** **Pro Publikationsformat ein eigener Prompt** mit deklarierter **Länge + Tonalität + Struktur**.
- **[NEU/Seed]** Übergeordneter, **geheimer Redakteurs-/System-Prompt** als Kern-Mehrwert, der über allen Format-Prompts liegt.
- **[A]** Bild-Pipeline: Prompt-Generierung → DALL·E → Upload; format-/typspezifische Bild-Meta-Prompts. Bilder zwischen Publikationen teilbar (Seed §37).

### D.4 Publikationsformate (frei definierbar)
- **[NEU/Seed]** Kunde definiert **eigene, frei anpassbare Format-Liste** (idealerweise per UI).
- **[B]** Beispielformate als Startset: Rundschreiben, Pressemeldung, LinkedIn, WhatsApp; **[A]** Blog (short/long), Article. Plus Seed-Wünsche: Presse an Spiegel/Springer etc.
- **[NEU/Seed]** Content reduziert auf **Markdown** als kanonisches Feldformat (→ HTML/Word/PDF ableitbar); reiner Text als zweite Ausprägung. Markdown muss Code-Sections & Tabellen können.
- **[B]** Format trägt Längen-/Tonalitäts-Konfiguration.

### D.5 Editor
- **[A→Basis]** Block-Editor (TipTap: richtext/picture/youtube/video/divider/hyperlink, Drag&Drop) + Markdown↔ProseMirror.
- **[B]** **Multi-Format-Tab-UI**: pro Publikation ein Editor-Tab, je mit Generate/Optimize/Copy.

### D.6 Kanäle / Publishing / Adapter
- **[NEU/Seed]** **Adapter-Architektur**: jedes Zielsystem implementiert ein klares **Channel-Interface** (reine Implementierungssache, agentfreundlich); Kanäle per Code erweiterbar.
- **[A]** LinkedIn (Publer, Link-Share, Idempotenz-Contract) als reifster Adapter; **[B]** Instagram/Facebook/Pinterest/X/Threads-Formatter.
- **[A]** Storyblok-Publish-Adapter (Website) — von Primärpersistenz zu reinem Ziel umgebaut.
- **[NEU/Seed]** **Download-/Versand-Adapter für jeden Channel**: Markdown/Word/PDF (intern via LibreOffice/ODF, Word→PDF), optional automatischer **E-Mail-Versand** des Dokuments; kundenspezifische Word-/ODF-Vorlage (Branding) hochladbar.
- **[NEU/Seed]** Zu klären: LinkedIn direkt per API statt über Publer? Welchen Mehrwert (Klick-Auswertung etc.) liefert Publer noch?

### D.7 Scheduling
- **[A→Basis]** Eigener Scheduler: wöchentliche Slots, SlotInstances, Tracks-/Kalender-UI, Cron-Tick, Retry-Cap, Orphan-Handling, gekoppeltes Publishing. **Beibehalten und ausbauen** (Seed §39).
- **[A]** Benannte Slots/Labels.

### D.8 Settings / Konfiguration
- **[B→Basis]** Settings in **DB** (nicht CMS-Story): App-Default-Modell, Prompts (global + pro Format), Notes.
- **[A]** Editierbare Prompts pro Feld/Format/Variante; Publer-Labels; MCP-Tokens; Schedules.
- **[NEU/Seed]** Channel-Verwaltung (anlegen/konfigurieren) idealerweise per UI.

### D.9 Auth & Mandanten
- **[A+B]** NextAuth + E-Mail-Whitelist als Basis; **beide** Provider zusammenführen: **Google [A] + Microsoft 365/Azure AD [B]**.
- **[NEU/Seed]** Zusätzlich **E-Mail/Passwort-Login** (für Nutzer ohne OAuth).
- **[NEU/Seed]** **Betriebs-/Mandantenmodell** entscheiden (offen, Recherche nötig): (A) eine DB+Container, vollständig mandantengetrennt (leicht im Rollout, hoher Security-Impact bei Datentrennung); (B) eine App + DB pro Kunde; (C) voller Stack pro Kunde mit gemeinsamem Deployment. → Bedingt **echte Releases** statt Continuous-Hot-Fixing.

### D.10 Automatisierung / API / MCP
- **[A]** MCP-Server (`create_draft`/`list_posts`/`get_post`/`update_post`) + gehashte Bearer-Tokens — generisch über Posts/Publikationen.

### D.11 Status / Pipelines / Dashboard
- **[A→generalisiert]** Mehr-Pipeline-Statusmodell pro Publikation (Content-Reife · je Channel ein Publish-/Schedule-Status inkl. „scheduled").
- **[A+B]** Dashboard mit Kennzahlen + Recent Activity; server-seitig gefilterte Listen.

### D.12 Betrieb / Deployment
- **[B→Basis]** Self-hosted-Supabase-Stack, Docker-Compose, Traefik, GitLab-CI als Deployment-Fundament.
- **[NEU/Seed]** Release-Disziplin (versioniert, nicht ad-hoc) — Voraussetzung fürs Produkt; abhängig vom Mandantenmodell (D.9).

---

## Teil E — Offene Punkte / nächste Schritte

1. **Entitäts-Benennung** finalisieren (Post · ? · Channel) — „Publikation" vs. Alternative.
2. **Mandanten-/Betriebsmodell** (D.9) recherchieren und entscheiden — größte offene Architekturfrage.
3. **Channel-Interface** spezifizieren (Methoden: generate-target-payload, publish, schedule, export, dispatch-email).
4. **Migrationspfad** A→Supabase: Datenmodell von B übernehmen, A's Prozessfeatures (Scheduler, MCP, Intake, LinkedIn-Kopplung) darauf neu aufsetzen; Storyblok zum Adapter degradieren.
5. **Publer vs. direkte APIs** evaluieren (Mehrwert Analytics/Klicks).
6. **Dokument-Export** (Markdown→ODF/LibreOffice→Word/PDF, Branding-Vorlagen) als Querschnitts-Channel-Capability spezifizieren.

---

_Quellen: vollständige Code-Inventur beider Repos (`io.meimberg.contentmanager` und `zdb.airedak`, web/+supabase/migrations) am 29.06.2026; Abgleich mit [`product_seed.md`](product_seed.md)._
