
*Konsolidierte Gesamtfassung aus drei Quelldokumenten: Produkt-Seed (Voice-Intake 29.06.2026, Oliver Meimberg), Bestandsanalyse & Gesamtrequirements sowie technische Ist-Stand-Dokumentation. Diese Datei ist die alleinige Arbeitsgrundlage für alle weiteren Schritte.*

*Markierung: Transkriptionskorrekturen und interpretierende Annahmen aus dem Voice-Intake sind im Text mit ⟦…⟧ gekennzeichnet (siehe Anhang A).*

### 1. Ausgangslage & Mission

#### 1.1 Herkunft

Das Tool in diesem Repo heißt im Code „Content Manager"; inzwischen wird es **SmartEditor** genannt. Es ist als kleines Werkzeug entstanden, mit dem Oliver Blogbeiträge schreibt: Man wirft einen **Seed** hinein — z. B. eine Voice-Message oder etwas Zusammengescriptetes — und das Tool erzeugt daraus einen **Blogbeitrag**. Zusätzlich werden ein **Bild** und diverse **Metadaten** generiert (u. a. Titel, Abstract usw.). Das war die ursprüngliche Basis; sie hat hervorragend funktioniert, mehrere gute Blogbeiträge sind so entstanden.

#### 1.2 Zwei Abzweigungen

Aus dieser Basis sind **zwei** Entwicklungen voneinander abgezweigt:

1. **SmartEditor (persönlich, dieses Repo).** Erweitert, sodass zu jedem Blogbeitrag auch ein **LinkedIn-Post** veröffentlicht werden kann. Der LinkedIn-Post hat einen eigenen Text und verweist auf den verknüpften Blogbeitrag. Möglich ist:

   - Blogbeitrag **mit** LinkedIn-Post,
   - Blogbeitrag **ohne** LinkedIn-Post,
   - LinkedIn-Post **ohne** Blogbeitrag.

   Architektonisch ist diese Kopplung noch nicht sauber aufgesetzt — für den Moment aber akzeptiert.

2. **ZDB-Version (Demo/Fork).** Gebaut für den **ZDB** (Zentralverband des Deutschen Baugewerbes). Der ZDB möchte aus einem Eingangstext verschiedene Formate generieren:

   - ein **Rundschreiben** für die Verbandsmitglieder,
   - eine **Pressemitteilung**,
   - einen **LinkedIn-Beitrag**,
   - eine **WhatsApp-Meldung**,
   - eine **Pressemitteilung an den Spiegel**,
   - eine **Pressemitteilung an Springer** usw.

   Alle Formate haben **unterschiedliche Längen und Tonalitäten**. Es ist ebenfalls Multichannel-Publishing. Die Idee ist dieselbe, der Kern ist im Wesentlichen gleich — nur die Ausprägung der Kanäle ist eine völlig andere.

#### 1.3 Repos & Rollen der zwei Versionen

|  | Version A — SmartEditor | Version B — ZDB SmartEditor |
| --- | --- | --- |
| Repo | io.meimberg.contentmanager (dieses) | zdb.airedak (git.form4.de/zdb/baugewerbe-digital) |
| Rolle | Persönliches Blog-/LinkedIn-Tool von O. Meimberg | Demo/Fork für ZDB (Zentralverband Deutsches Baugewerbe) |
| Reifegrad | Höher (mehr Features, produktiv genutzt) | Geringer, dafür architektonisch näher am Zielbild |
| Persistenz | Storyblok (CMS als DB) | Self-hosted Supabase / PostgreSQL ← Zielarchitektur |
| Output | Blog, Article, LinkedIn (gekoppelt) | Multi-Format: Rundschreiben, Pressemeldung, LinkedIn, WhatsApp |
| Auth | Google OAuth | Azure AD / Microsoft 365 |

#### 1.4 Die Mission

Aus dem Ding lässt sich ein **Produkt** machen. Ziel ist eine **Produktdefinition**: eine fachliche Produktbeschreibung und möglicherweise bereits eine **Basisarchitektur**. Das neue Produkt soll **kanal- und zielsystem-agnostisch** sein.

**Leitsatz:** Die Version in diesem Repo (A) ist am weitesten entwickelt und damit die **Basis für alles**. Was für den ZDB gebaut wurde (B), wird auf Requirements-Ebene **dazugeholt**, statt es als zweiten Fork weiterzuführen. Der Kern darf nicht weiter forken.

**Zentrale Erkenntnis (Komplementarität):** Die beiden Versionen sind komplementär. **A** ist auf der **Prozess-/Publishing-Achse** weiter (Scheduler, LinkedIn↔Blog-Kopplung, MCP, Intake-UI, Block-Editor, Status-Pipelines). **B** ist auf der **Architektur-/Multi-Format-Achse** weiter (lokale DB als Primärpersistenz, echtes Multi-Format-Modell, breiteres Publer-Kanalset, Azure-Auth). Das Gesamtprodukt ist die Vereinigung beider — auf dem Datenmodell von B, mit den Prozessfeatures von A.

**Transformations-Eckpunkte:**

- **Frontend wird komplett neu gebaut.** Die heutige UI (Version A) dient als *Neubau-Referenz*, nicht als zu erhaltender Code.
- **Backend-Logik bleibt im Kern** und zieht später von **Storyblok auf Supabase**. Die Logik liegt in `src/lib/**` (reines TS), Storyblok-I/O ist in zwei Modulen isoliert, API-Routen sind dünne Orchestratoren — das macht den Umzug überschaubar.

### 2. Produktkern

- Der **Kern beider Systeme ist gleich**: Aus einem **Seed/Intake** werden unterschiedliche **Textformate** generiert — in **hoher Qualität** und mit **sehr gut festgezurrter Sprachlichkeit**.
- Das Produkt muss grundsätzlich **unterschiedliche Kanäle** bedienen können.
- **Jeder Kunde hat eine völlig individuelle Liste von Kanälen.** Die Kanäle müssen daher **frei anpassbar** sein — ⟦vermutlich direkt über die Oberfläche, noch nicht final entschieden⟧.

### 3. Kanäle & Formate (fachlich)

#### 3.1 Woraus sich ein Kanal definiert

Ein Kanal definiert sich aus zwei Dimensionen:

1. **Content** — welcher Inhalt erzeugt werden muss. In der Regel zuerst der **Haupttext** (bei einem Blogbeitrag völlig anders als bei einem LinkedIn-Post) **plus zusätzliche Metadaten**. Beispiele:
   - Ein LinkedIn-Post hat möglicherweise **Tags**, ein Blogpost nicht unbedingt.
   - Ein Blogpost hat ein **Header-Bild**, ein LinkedIn-Beitrag vielleicht nicht — oder doch.
2. **Zielformat / Publikation** je Kanal (siehe 3.3 und Abschnitt 6).

#### 3.2 Geteilte vs. individuelle Eigenschaften

Einige Eigenschaften können sich Formate **teilen** — etwa ein **Bild**: dasselbe Bild wird für LinkedIn und Blog verwendet, nicht aber für WhatsApp. Andere Eigenschaften sind **individuell** — etwa unterschiedliche **Tags** für LinkedIn gegenüber X.

#### 3.3 Feld-/Zielformate

- **LinkedIn** ist normaler **Text**. Die **Blogbeiträge** sind **Markdown**. Anderes ist möglicherweise **HTML** — eventuell sogar mit bestimmter Semantik von Tags/Klassen. Theoretisch sind weitere Formate wie **JSON** denkbar.
- **Leitentscheidung (vorläufig):** Der Content wird auf **Markdown** reduziert. Markdown lässt sich jederzeit nach **HTML** überführen (umgekehrt — z. B. aus JSON — nicht unbedingt). „Text ist Text." Damit gibt es im Kern **zwei** Feld-Zielformate: **Markdown** und **(reiner) Text**.
- Markdown muss auch **Code-Sections** und **Tabellen** können. Das funktioniert bereits gut — jedenfalls im persönlichen SmartEditor, der gegenüber der ZDB-Variante etwas ausgereifter ist, weil die beiden vor einiger Zeit geforkt wurden.

### 4. KI-Generierung

#### 4.1 Prompts & geheimer Redakteurs-Prompt

- Für jeden Kanal braucht es **ganz spezifische Prompts**, die den Content erzeugen — eventuell sogar Agents oder Skills, **vermutlich aber nur Prompts**, weil im Wesentlichen unterschiedliche **Tonalitäten** erzeugt werden müssen.
- Es gibt vermutlich einen **übergeordneten Redakteurs-Prompt**, der den **Mehrwert im Kern des Systems** abbildet. Dieser ist **geheim** und damit ein zentraler Produktwert. Im fusionierten Gesamtrequirement liegt dieser geheime System-/Redakteurs-Prompt **über allen Format-Prompts**.

#### 4.2 Provider-Agnostik & Bild-Pipeline (aus Bestandsanalyse)

- Provider-agnostisch (OpenAI/Anthropic/Google), Modell überschreibbar, plus `optimize` (freie Umformulierung mit Instruktion).
- **Pro Publikationsformat ein eigener Prompt** mit deklarierter **Länge + Tonalität + Struktur**.
- Bild-Pipeline: Prompt-Generierung → DALL·E → Upload; format-/typspezifische Bild-Meta-Prompts. Bilder zwischen Publikationen teilbar.

### 5. Scheduling

- Es existiert inzwischen eine **Scheduling-Funktion, ähnlich wie bei ⟦Publer⟧**: Man kann **Slots** definieren, in denen die Posts abgeschickt werden.
- Diese Funktion muss **auf jeden Fall beibehalten** und vermutlich **weiter ausgebaut** werden.

### 6. Publishing, Kanäle & Adapter (technisch)

#### 6.1 Kanäle als Publishing-Ziele

„Kanäle" meint das eigentliche **Publishing** — das, was ⟦Publer⟧ anbietet. Beispiele für Ziele: **LinkedIn**, die eigene **Website (publiziert auf Storyblok)**, **WordPress**, **X**, **Facebook** usw.

#### 6.2 Erweiterbarkeit & Adapter-Architektur

- Kanäle müssen **erweiterbar** sein — die eigentlichen Kanäle vermutlich **per Code**. Wer einen Kanal möchte, meldet ihn an, dann wird er gebaut.
- Ein Kanal soll ein **klares Interface** implementieren, sodass die Umsetzung reine **Implementierungsarbeit** ist, die **Agenten** ohne große Architekturentscheidungen leisten können.
- Jedes **Zielsystem** braucht in irgendeiner Form eine **API** — oder es wird ein anderer **Adapter** gebaut. Faustregel: **Jedes Zielsystem hat einen Adapter.**

#### 6.3 Offene Klärung: Publer vs. direkte API

- Zu klären: Müssen die LinkedIn-Posts wirklich über **⟦Publer⟧** laufen, oder können sie direkt an die **API** geschickt werden? Aktuell läuft es der Einfachheit halber über ⟦Publer⟧.
- Ebenfalls zu klären: Bietet ⟦Publer⟧ derzeit **Mehrwerte**, die sonst wegfielen — etwa **Auswertung der Klicks**? (Eigenes Thema, gehört aber in den Seed.)

#### 6.4 Publishing-Methoden je Kanal

- Das Einfachste ist das **Erzeugen von Markdown zum Download** — oder **Word** oder **PDF**.
- Jeder Kanal sollte wahrscheinlich **Download- und Versand-Möglichkeiten** bekommen: Ein Kanal kann beim Publishen z. B. **automatisch per E-Mail** an jemanden ein **Word-Dokument** schicken.
- Weitere Kanäle (zum Hin-Posten) lassen sich definieren; sie entstehen **sukzessive bei Bedarf**. Es müssen nicht alle sofort implementiert werden — die wichtigsten kann man aber schon benennen.

#### 6.5 Dokument-Export & Branding

- Bei **Word/PDF** stellt sich die **Branding-Frage**. Vermutlich gilt: **Word wird immer generiert**; wenn **⟦PDF⟧** gebraucht wird, wird das PDF **aus dem Word** erzeugt.
- Dann könnte mit einer **standardisierten Word-Vorlage** gearbeitet werden, die Kunden sich einmal zurechtbasteln und hochladen.
- Möglicherweise sogar Rückgriff auf das **Open Document Format (ODF)**, weil es besser und sowohl durch Word als auch durch **LibreOffice** erzeugbar ist. Empfehlung tendiert zu **LibreOffice** (Word „macht immer Stress"). Aus dem LibreOffice-/ODF-Dokument ließen sich dann Word **und** PDF erzeugen.
- Intern wird vermutlich ohnehin immer mit OpenOffice-/**LibreOffice-Tools** gearbeitet (d. h. beim Erzeugen eines Word-Dokuments kommen LibreOffice-Packages zum Einsatz). Format-Details bleiben hier bewusst offen.

### 7. Architektur-Leitentscheidungen

#### 7.1 Primärpersistenz in lokaler Datenbank

- **Erster Konstruktionsfehler** (generisch betrachtet): Auch die **Primärpersistenz** des Tools sitzt heute auf **Storyblok**, weil es ursprünglich so gedacht war.
- **Muss geändert werden:** Die Primärpersistenz **jedes einzelnen Beitrags** liegt zunächst in einer **lokalen Datenbank** (z. B. **Supabase**). Von dort aus wird **gepublished** — nach Storyblok, LinkedIn, WordPress, X, Facebook usw.
- Das ist eine **große architektonische Änderung**, aber kein großes Problem — „**dafür haben wir unsere Agenten**" (die Umsetzung erfolgt agentengestützt).

#### 7.2 Kein Fork des Kerns

- Der **Kern der Software darf nicht forken.** Ein verkaufbares Produkt soll **ein** Produkt sein, nicht 25 Versionen — die ZDB-Version bekommt man bereits „nicht mehr eingefangen".
- Das **allererste** Ziel: ein Produkt bauen, das **kanal- und zielsystem-agnostisch** ist und gleichzeitig die **Blog-+LinkedIn-Journey** (persönlich) **und** die **ZDB-Journey** (⟦Verbands-⟧Rundschreiben usw.) bedient.
- Wie bei ⟦Publer⟧: Man muss **verschiedene Channels anlegen** können, **Prompts pro Channel** und vielleicht noch ein paar weitere Dinge. Dazu kommen **Publishing-Methoden pro Channel**.

#### 7.3 Entitätenmodell

- Es gibt eine Entität **Post**. Ein Post hat immer einen **Seed** — ⟦möglicherweise sogar mehrere, noch offen⟧.
- Pro Post wird eine **neue Instanz** erzeugt (vergleichbar einer abstrakten Klasse / einem Stub).
- Aus einem Post können **kundenspezifisch** verschiedene **Zielformate** erzeugt werden. „Format" ist nicht das richtige Wort — passender wäre **Publikation**.
- Eine **Publikation** kann in einen **Kanal (Channel)** gepostet werden — oder auch nicht.
- Damit: **Post → Publikation → Channel.**
- **Offen (Begriffsfindung):** Wenn aus einem Beitrag z. B. ein Rundschreiben, mehrere Social-Media-Posts (X, Facebook …) entstehen — wie heißt die Entität für diese **einzelnen konkreten Posts** korrekt? „Publikation" ist ein Kandidat; der finale Begriff muss noch gefunden werden.

### 8. Betrieb & Mandantenmodell

#### 8.1 Releases statt Hot-Fixing

- Sobald ein verkauftes Produkt entsteht, kann man **nicht mehr beliebig agil Updates hineinblasen**, wie es heute beim persönlichen Content Manager / SmartEditor möglich ist. Es muss mit **echten Releases** gearbeitet werden (versioniert, nicht ad-hoc) — Voraussetzung fürs Produkt; abhängig vom Mandantenmodell.

#### 8.2 SaaS — Betriebsmodelle recherchieren

- Es handelt sich um eine **⟦SaaS⟧-Anwendung**. Es ist wichtig zu recherchieren, **wie andere das machen** (es gibt sehr viele Anwendungen dieser Art). Hier besteht noch wenig Klarheit.
- **Möglichkeit A — gemeinsame DB + gemeinsamer Container:** Eine große Supabase-Datenbank und ein Container. Das Datenmodell ist **vollständig mandantenbasiert** ⟦mandantenmäßig⟧. Am **leichtgewichtigsten im Rollout**, am **schwergewichtigsten in der Datenbank**. Spezielle Challenge: die klare **mandantenmäßige Absicherung** (niemand darf Posts anderer sehen/ändern) — **sehr wichtig, hoher Security-Impact**.
- **Möglichkeit B — eine Applikation, getrennte DB pro Kunde:** Eine Applikation, für jeden Kunden eine eigene Supabase-Datenbank.
- **Möglichkeit C — vollständiger Stack pro Kunde:** Für jeden Kunden läuft ein kompletter Stack; das Deployment updatet immer alle gleichzeitig.
- **Offen:** Welches Modell? Dazu braucht es eine Entscheidung über das Betriebsmodell.

#### 8.3 Erweiterungspunkte definieren

Die Erweiterungspunkte müssen definiert werden, u. a.:

- die verschiedenen **Publikationsformate** mit ihren **Prompts**,
- **Download- und Versand-Möglichkeiten** pro Kanal (z. B. automatischer E-Mail-Versand eines Word-Dokuments),
- weitere **Kanäle** zum Hin-Posten (entstehen sukzessive bei Bedarf).

### 9. Auth / Login

- Aktuell ist nur **Google**-Login möglich (Version A).
- Der andere Editor (ZDB, Version B) kann zusätzlich **Microsoft-365-Logins** (Azure AD).
- Zusätzlich braucht es vermutlich **E-Mail/Passwort**-Login — für Nutzer, die kein OAuth verwenden möchten. Das muss noch gebaut werden.
- Im Gesamtprodukt: NextAuth + E-Mail-Whitelist als Basis; **beide** OAuth-Provider zusammenführen (Google + Microsoft 365/Azure AD), plus E-Mail/Passwort.

### 10. Bestandsanalyse Version A — SmartEditor (dieses Repo)

#### 10.1 Tech-Stack (Bestandsanalyse-Sicht)

Next.js 15 (App Router) · React 18 · NextAuth v4 (Google OAuth) · shadcn/ui + Radix + Tailwind · TipTap (Block-Editor) · `@dnd-kit` (Drag & Drop) · `mcp-handler` (MCP-Server) · Storyblok Management-API (write) + Delivery-API (read) · Multi-Provider-KI (OpenAI/Anthropic/Google) · DALL·E 3 (Bild) · Cron-Scheduler · Microsoft Graph (Mail-Import).

#### 10.2 Content-Modell

- **Drei Story-Typen** (über `content.component`):
  - `blog` (Ordner `b`) — persönlicher Blogbeitrag; Variante `cm_blog_variant` ∈ {`short`, `long`} steuert nur den Body-Prompt.
  - `article` (Ordner `a`) — sachlicher/neutraler Artikel.
  - `linkedin_post` (Ordner `linkedin`) — LinkedIn-only, immer Draft (nie auf der Website).
- **Blog-/Article-Felder:** `pagetitle` (max 80), `pageintro`, `date`, `teasertitle` (max 60), `abstract` (max 120), `readmoretext` (max 50), `headerpicture` (Asset), `teaserimage` (Asset), `body` (Block-Array).
- **„Content complete"** = alle 9 Felder befüllt → `cm_content_complete` (bool) + `cm_content_confirmed_at` (Timestamp).
- **Publish-State:** Storyblok-nativ (`published` + `published_at`); kein eigenes Feld. Nur publizierte Stories rendern auf der öffentlichen Website (`../io.meimberg.www`); Draft-only = unsichtbar (bewusster Mechanismus).
- `cm_*`**-Metadaten** auf der Story: `cm_source_raw`, `cm_source_summarized`, `cm_ai_hint`, `cm_image_prompt`, `cm_origin` (`import`|`create`|`mcp`), `cm_intake_pending`, `cm_blog_variant`, `cm_blog_ref` (LinkedIn→Blog-UUID), `cm_publer_published_at`, `cm_publer_post_ids`, `cm_publer_label`, `cm_tags`.

#### 10.3 KI-Generierung

- **Per-Feld-Generierung** (`POST /api/ai/generate`): `pagetitle`, `pageintro`, `teasertitle`, `abstract`, `readmoretext`, `body`, `linkedin`, `tags`, `optimize` (freie Umformulierung mit Instruktion).
- **Body-Prompt nach Typ+Variante:** `bodyBlogShort` (\~350–600 W), `bodyBlogLong` (\~800–1500 W), `bodyArticle` (sachlich/neutral).
- **Bild:** `POST /api/ai/generate-image` mit Aktionen `prompt` (DALL·E-Prompt aus Quelle generieren), `image` (DALL·E 3), `upload` (nach Storyblok). Eigene Bild-Meta-Prompts für Blog (`headerImage`) vs. Article (`headerImageArticle`).
- **Provider-agnostisch** über `ai-provider.ts`; Modell pro Request überschreibbar; App-Default in `settings.aiModel`.

#### 10.4 Kanäle / Publishing

- **Storyblok-Publish** (Blog/Article): Draft → Publish/Unpublish via Management-API; optional Revalidate der Website.
- **LinkedIn via Publer** (einziger Live-Social-Kanal):
  - **Standalone** (eigener Text + eigenes Bild) oder **attached** (an Blog gekoppelt via `cm_blog_ref`, sendet Publer `type:'link'`-Share mit der OG-Vorschau des Blogs).
  - Contract (MICM-17): Content Manager bestimmt Timing („post now"), Publer ist Push-API; Idempotenz: publizierter Post blockt Republish (409), noch gequeuter wird ersetzt.
  - Publish-Guard (MICM-12): attached Post braucht **publizierten** Eltern-Blog.
- **Nicht verdrahtet:** Instagram-/Threads-/Pinterest-Formatter in `publer.ts` und `components/publer/` sind kopiertes Scaffolding (Luxarise), in A nicht aktiv.

#### 10.5 Scheduling (ausgereift — MICM-14/16/20/32)

- **Modell:** wöchentlich wiederkehrende **Slots** (`weekday`+`time`, stabile `id`) + **SlotInstances** (konkrete Woche × Story, Status `pending`/`published`/`failed`/`skipped`) je **Schedule** (Track mit Timezone `Europe/Berlin`).
- **Tick-Engine** (`scheduler/tick.ts`): fällige Instanzen aufsteigend abarbeiten; Blog zuerst publizieren, dann gekoppelte content-complete LinkedIn-Posts; Retry-Cap (3 Fehlversuche → `failed`); Orphan-Handling (Slot gelöscht → „neu zuordnen"); ein finaler Write.
- **Cron** (`POST /api/cron/tick`): Bearer-Token (headless) **oder** Session (Admin-Button „run now").
- **UI** (`/schedule`): Tracks-Ansicht (Lanes × Slots, Drag&Drop) + Kalender-Ansicht; 12-Wochen-Horizont.

> **⚠ Abweichung (Scheduler-Horizont):** Die Bestandsanalyse nennt einen **12-Wochen-Horizont** in der UI (§10.5). Die technische Ist-Stand-Doku nennt für `schedule-time.ts` einen **Horizont von 8 Wochen** (§12.6). Beide Angaben bleiben dokumentiert; die Diskrepanz ist ungeklärt.

#### 10.6 Intake (Mail/Plaud — funktionsfähig inkl. UI)

- **Microsoft Graph** (`mail-inbox.ts`, OAuth2 Client-Credentials): ungelesene Mails listen, Body+Attachments (Plaud-Transkripte) extrahieren, als Draft (`blog` oder `linkedin_post`, `cm_origin='import'`) anlegen, Mail als gelesen markieren.
- **UI** (`/import`): Posteingang prüfen, Mails + Ziel wählen, importieren.

#### 10.7 Auth

- NextAuth v4 + **Google OAuth**; E-Mail-Whitelist (`ADMIN_WHITELIST`) in `signIn`-Callback **und** Middleware.
- **MCP-Auth separat:** gehashte Bearer-Tokens (`settings.mcpTokens[]`, SHA-256), MCP-Route umgeht NextAuth.

#### 10.8 MCP-Server (`POST /api/mcp`)

Tools: `create_draft` (Intake-only, `cm_intake_pending=true`), `list_posts` (Filter nach Typ/Status), `get_post` (Volldetail), `update_post` (Merge-Update, Republish wenn live). Ermöglicht LLM-/Automatisierungs-Zugriff auf den Bestand.

#### 10.9 Editor (Block-basiert)

TipTap-Block-Editor mit Blocktypen **richtext, picture, youtube, video, divider, hyperlink**; Drag&Drop-Reordering; Markdown↔ProseMirror-Konvertierung (KI liefert Markdown → ProseMirror-JSON).

#### 10.10 Status / Pipelines / Dashboard

- **2-Pipeline-Modell** (MICM-37): „Content" (rot/gelb/grün) · „LinkedIn" (rot/gelb/grün/blau=scheduled/grau). Server-seitige Filterung (`/api/posts/list?content=…&linkedin=…&q=…`).
- **Dashboard:** Kennzahlen (Posts gesamt, content-complete, published, LinkedIn) + Recent Activity.

#### 10.11 Settings (in Storyblok-Story `contentmanager_config`)

`aiModel`, `aiPrompts` (alle Feld-/Varianten-Prompts), `notes`, `publerLabels` (Slot-Labels MICM-13), `schedules[]`, `mcpTokens[]`. Settings-Page mit Tabs: Modelle · Prompts · Publer-Labels · MCP · Verschiedenes. 30 s In-Memory-Cache.

### 11. Bestandsanalyse Version B — ZDB SmartEditor

#### 11.1 Tech-Stack

Next.js 15 · React 18 · NextAuth v4 (**Azure AD / Microsoft 365**) · shadcn/ui + Tailwind · TipTap · **Self-hosted Supabase** (PostgreSQL, Auth, Storage, Kong-Gateway — 13-Service-Docker-Stack) · Traefik (Prod) · GitLab CI/CD · Multi-Provider-KI · Publer.

#### 11.2 Persistenz / Datenmodell (PostgreSQL — das Zielmodell)

- **Tabelle** `public.posts` (zentrale Entität):
  - `id` (UUID PK), `slug` (UK).
  - Blog-Meta: `pagetitle`, `pageintro`, `date`, `teasertitle`, `abstract`, `readmoretext`.
  - Bilder: `headerpicture`, `teaserimage`.
  - `body` **(JSONB, deprecated)** + `content_formats` **(JSONB)** — Kern: Keys `rundschreiben`, `pressemeldung`, `linkedin`, `whatsapp`, jeweils ein TipTap-/ProseMirror-Dokument.
  - Quelle: `source_raw`, `source_summarized`; KI: `ai_hint`, `image_prompt`.
  - Status: `content_complete` + `content_confirmed_at`; `published` + `published_at`; `socialmedia` + `publer_published_at` + `publer_post_ids` (TEXT\[\]).
  - `created_at`, `updated_at` (Trigger). Indizes auf `slug`, `created_at`. **RLS:** Service-Role voll; public SELECT nur wo `published=true`.
- **Tabelle** `public.settings` (JSONB-Singleton `id='system'`): `aiModel`, `aiPrompts` (inkl. Format-Prompts), `notes`. Service-Role only.
- **Storage-Bucket** `assets` (public read): Header-/Teaser-/generierte Bilder, Pfad `posts/{ts}-{name}`.

#### 11.3 Multi-Format-Modell (das Alleinstellungsmerkmal von B)

Aus **einer** Quelle werden **mehrere parallele Formate** erzeugt (`content-formats.ts`):

| Format | Länge | Tonalität | Zweck |
| --- | --- | --- | --- |
| Rundschreiben | 600–1200 W | sachlich, gegliedert (##/###) | Verbands-/Mitglieder-Rundschreiben |
| Pressemeldung | 300–600 W | journalistisch, Lead-first | Pressemitteilung |
| LinkedIn | ~1300 Zeichen | professionell, Hook+CTA, 2–4 Hashtags | Social |
| WhatsApp | 2–5 Sätze, ~500 Z. | konversationell, Plaintext | Instant-Messaging |

Jedes Format: eigenes JSONB-Dokument, **eigener Prompt mit Längen-/Tonalitäts-Vorgabe**, unabhängig editierbar (Tabs in der UI), separat publizierbar.

#### 11.4 KI-Generierung

Wie A provider-agnostisch (OpenAI/Anthropic/Google, Vision), aber Generierungstypen um die **Format-Typen** erweitert (`rundschreiben`/`pressemeldung`/`linkedin`/`whatsapp`) plus `optimize`. Prompts in `settings.aiPrompts` (DB), per UI editierbar; Default-Prompts in `settings-storage.ts`. Prompt-Aufbau: Quellkontext (Summary + Rohtranskript) + gespeicherter Prompt + optionaler Titel-Kontext + `ai_hint`.

#### 11.5 Kanäle / Publishing (breiteres Publer-Set)

- **Website-Publish** (`/api/posts/[id]/publish`): `published=true/false`.
- **Publer** verdrahtet für **Instagram, Facebook, Pinterest, Twitter/X, Threads** mit plattformspezifischen Formattern (`formatForInstagram/Facebook/Pinterest/…`, Hashtag-Limits, Truncation, Auto-Schedule 9–21 h). `publer_post_ids` persistiert.
- **Export/Download** (Word/PDF/Markdown) als UI-Ansatz vorhanden.
- **E-Mail-Versand**: durch Modell vorgesehen, noch nicht implementiert.

#### 11.6 Scheduling

**Kein eigener Scheduler** — Scheduling ausschließlich über Publers Auto-Schedule (Zeitfenster, kein lokales Slot-/Kalendermodell, keine UI).

#### 11.7 Intake

`source_raw`/`source_summarized` im Modell (Plaud/Mail vorgesehen); **kein** dediziertes Mail-Import-UI/Graph-Anbindung wie in A sichtbar — manuelle Anlage + Felder.

#### 11.8 Auth

NextAuth + **Azure AD** (`AZURE_CLIENT_ID/SECRET/TENANT_ID`, Scope `openid profile email`, JWT 30 d) + E-Mail-Whitelist. Kein Rollensystem (alle authentifizierten = Admin). **Kein Google, kein E-Mail/Passwort.**

#### 11.9 UI-Surfaces

`/login` (Azure), `/dashboard` (Stats + Recharts), `/posts` (Liste, Tri-State-Status-Dots, Filter/Suche/Grid), `/posts/[id]` (Editor mit Metadaten, Quellmaterial, Header-Bild-Generierung, **Multi-Format-Tabs**, AI-Settings-Drawer, Optimize-Dialog, Publer-Publishing-Sektion), `/settings` (Modell + Prompts + Reset).

#### 11.10 Betrieb / Deployment

Monorepo (`web/` + `supabase/` + `scripts/` + `docs/`); Docker-Compose Dev/Prod; Traefik; GitLab-CI; Prod-URLs `smarteditor.zdb.form4.dev`, `…-api/…-studio.form4.dev`; `sync-prod-to-local.sh`. Single-Instance pro Deployment (keine Mandantenfähigkeit).

### 12. Technischer Ist-Stand Version A (Detail) — Transformations-Grundlage

> Diese Detail-Dokumentation des Ist-Standes von Version A (`io.meimberg.contentmanager`) dient als Transformations-Grundlage. **Modell-IDs, Prompt-Texte und MICM-Referenzen sind eine Momentaufnahme (Code-Stand 29.06.2026); Registry und Prompts sind bewusst editierbar.**

#### 12.1 Tech-Stack (Ist-Stand-Detailsicht)

Next.js **15** (App Router, `output:'standalone'`) · React **18** · TypeScript **5** · NextAuth **4** (Google OAuth) · Tailwind + shadcn/ui auf Radix · **TipTap 3** + ProseMirror (Block-Editor) · `@dnd-kit` (Drag&Drop) · `@tanstack/react-query` · `react-hook-form`+`zod` · `react-markdown`+`remark-gfm` · `recharts` (Dashboard) · `sonner`/`vaul`/`cmdk` · `lucide-react`, Inter+Playfair · Storyblok (`@storyblok/react`, `storyblok-js-client`, CLI) · `mcp-handler`.

> **Altlast:** `package.json name` ist noch `com.luxarise.admin.frontend` (Legacy). Die Publer-Multi-Channel-Formatter in `lib/publer.ts` sind kopiertes Scaffolding — **live verdrahtet ist nur LinkedIn**.

#### 12.2 Projektstruktur

```
src/
├── middleware.ts                 # Route-Gating + Whitelist
├── app/
│   ├── (auth)/login/             # öffentlich
│   ├── (admin)/                  # geschützt: dashboard posts posts/[id] linkedin linkedin/[id]
│   │                             #            schedule import settings create
│   └── api/                      # 23 Route-Handler (§12.7)
├── lib/                          # gesamte Geschäftslogik (reines TS) — §12.5
├── components/                   # blocks dashboard icons layout linkedin posts publer scheduler ui
├── hooks/
└── types/  index.ts · component-types-sb.d.ts (CLI-generiert, nicht editieren)
```

#### 12.3 Architektur

**Storyblok ist die Datenbank, nicht nur CMS** — zwei Flächen:

- **Management-API** (`storyblok-management.ts`, `STORYBLOK_MANAGEMENT_TOKEN`, write, server-only) — Erstellen/Editieren als **Draft**. Nie in Client-Komponenten.
- **Delivery/CDN-API** (`storyblok.ts`, public Token) — Leseseite.

**Request-Fluss:** Client → `fetch('/api/…')` → Route (`requireAuth()`) → `lib/`-Funktion → Storyblok / OpenAI·Anthropic·Google / Publer / MS Graph.

**Publish:** Blog/Article nutzen Storybloks **nativen** Publish-State; nur publizierte Stories rendern auf der öffentlichen Website (separates Repo `../io.meimberg.www`). **Draft-only = unsichtbar** — so bleiben interne Inhalte (geplante LinkedIn-Posts) von der Website fern. LinkedIn-Posts bleiben **immer** Draft; ihr „Publish" lebt in **Publer**.

**Rate-Limits/Caching:** Storyblok \~5 req/s → `managementFetch()` retry+Backoff; System-Config 30 s In-Memory-Cache mit `fresh`-Bypass für Read-Modify-Write.

#### 12.4 Datenmodell (Ist-Stand-Detail)

12.4.1 Storyblok-Typen (Space `330326`)

Drei genutzte Story-Typen (Ordner werden bei Bedarf auto-angelegt); Settings in eigener Story `system/contentmanager_config` (Component `luxarise_manager_config`, Feld `config` = JSON-String):

| component | Ordner | Zweck | Publish |
| --- | --- | --- | --- |
| blog | b/ | persönlicher Blogbeitrag | Storyblok-nativ |
| article | a/ | sachlicher Artikel | Storyblok-nativ |
| linkedin_post | linkedin/ | LinkedIn (standalone/attached) | nie (Draft); via Publer |

**Standard-Felder (blog/article):** `pagetitle, pageintro, date, headerpicture, teasertitle, teaserimage, readmoretext, abstract, body`. `cm_*` **(blog/article):** `cm_content_complete(+_confirmed_at)`, `cm_source_raw/_summarized`, `cm_publer_published_at/_post_ids`, `cm_ai_hint`, `cm_image_prompt`, `cm_intake_pending`, `cm_origin`; `cm_blog_variant` (`short|long`, steuert nur den KI-Body-Prompt). `linkedin_post`**:** `linkedin_text`, `linkedin_image`, `cm_blog_ref` (Eltern-Blog-UUID; leer = standalone), gespiegeltes Quellmaterial, `cm_tags`, `cm_publer_label`, dieselben Status-/Publer-Felder.

> Der Space enthält viele Legacy-Komponenten (`luxarise_picture`, `page`, …) aus dem Website-Modell — irrelevant für den SmartEditor.

12.4.2 Interne Typen (`src/types/index.ts`)

- `BlogPost` — normalisierte Sicht (UUID + numerische `storyblokId`, Content-Felder, `origin` import|create|mcp, `intakePending?`, `status:{contentComplete,published}`). Der **LinkedIn-Status ist hier NICHT** — er wird aus angehängten Posts join-abgeleitet (`buildLinkedinStatusByBlog`).
- `LinkedinPost` — eigene Entität (MICM-8): `blogParentUuid?` (einseitig LinkedIn→Blog), `status:{contentComplete,publishedLinkedIn}`, Publer-Felder.
- `StatusCheck` — `color: green|yellow|red|gray|blue` (`blue` = scheduled).
- **Scheduler (MICM-14/32):** `Slot`(weekday 0=So…6=Sa, time "HH:MM") · `SlotInstance`(slotId|null, weekStart=Montag-YMD, storyUuid, typ, status pending|published|failed|skipped, errorCount?) · `Schedule`(timezone fix `Europe/Berlin`, slots\[\], slotInstances\[\]).

12.4.3 Settings (`contentmanager_config` → JSON)

`aiModel?`, `aiPrompts?` (Feld-/Varianten-Prompts), `notes?`, `publerLabels?` (Default `Standard, Series 1–3`), `schedules?`, `mcpTokens?` (gehasht: id/name/tokenHash/prefix/createdAt).

#### 12.5 Backend-Module (`src/lib/`) — zu erhaltende Logik

**Persistenz —** `storyblok.ts` **(read):** `fetchBlogPosts/LinkedinPosts/SinglePost/PostByUuid/Statistics`; `fetchLinkedinPostsByBlogUuid` nutzt Filter `cm_blog_ref:{in:…}` (**String braucht** `in`**, nicht** `is`). `mergeStoriesWithPublishFlags()` überlagert CDN-Drafts mit autoritativen `published/published_at` aus der Management-API.

`storyblok-management.ts` **(write):** Folder-Resolver (idempotent); `create/update/publish/unpublish/deletePost`, `create/updateLinkedinPost`, `uploadAsset`, `resolveStoryMetaByUuids` (Batch ≤100, 429-Retry; fehlend = gelöscht, Fehler ≠ Löschung). `managementFetch` retry+Backoff (\~1.8 s, `Retry-After`). Gotchas: Asset-Felder brauchen `fieldtype:'asset'`; `publishPost({overrideDate})` setzt `content.date` aufs Slot-Datum (MICM-30); `published`**-Boolean nutzen, nie** `published_at` (bleibt nach Unpublish stehen); LinkedIn-Slug-Kollision wird retried.

**KI —** `ai-provider.ts`**:** Routing OpenAI/Anthropic/Google über `callAI({prompt,imageUrl?,modelId?})` (max 4096 Tok, Vision je Provider unterschiedlich). Registry `AI_MODELS` (Momentaufnahme): `gpt-5.5`(Default), `gpt-5.4-mini`, `claude-opus-4-8/sonnet-4-6/haiku-4-5`, `gemini-3.5-flash/2.5-pro/3.1-flash-lite`.

`openai.ts`**:** Generierungsfunktionen (Prompt aus Settings, Fallback `DEFAULT_PROMPTS`): Titel/Abstract/Intro/Teaser/ReadMore (String); `generateBody` (Prompt-Wahl nach contentType+Variante: `bodyArticle`/`bodyBlogShort`/`bodyBlogLong` → ProseMirror via `markdownToProsemirror`); `generateLinkedinText` (Plain-Text, **kein** Markdown); `generateTags`; `generateImagePrompt`+`generateHeaderImage` (DALL·E `gpt-image-1`, 1536×1024 PNG); `optimizeText`. Default-Prompts (deutsch, mit Längen-/Ton-Vorgaben) vollständig in `settings-storage.ts`.

**LinkedIn/Publishing —** `linkedin-publish.ts`**:** `publishLinkedinNow(storyId)` (session-frei, von Route **und** Scheduler genutzt). Ablauf: **Attached-Guard** (Eltern-Blog muss `published` sein, sonst 409) → **Idempotenz** (Publer-State: published⇒409, queued⇒löschen+`replaced`) → formatieren (attached=`link`-OG-Card, standalone=`photo`, sonst `status`) → `scheduleLinkedinPost()` → `cm_publer_*` persistieren (Story bleibt Draft).

`linkedin-link.ts` (OG-Preview: Titel/160-Z.-Description/Bild headerpicture→teaserimage) · `linkedin-status.ts` (Aggregat pro Blog, least-done-Farbe) · `publer.ts` (Client `app.publer.com/api/v1`; `scheduleLinkedinPost` ruft `/posts/schedule/publish` **sofort**, ohne Publer-Kalender, MICM-33; Job-Polling; nur LinkedIn live).

**Scheduler —** `scheduler/tick.ts`**:** `runScheduleTick()` — fresh Read → fällige `pending`-Instanzen aufsteigend → Blog/Article publishen (Slot-Datum), dann angehängte content-complete LinkedIn-Posts; Fehler→`errorCount++`, `>=3`→`failed`; verpasste Slots feuern am geplanten Datum (nicht „jetzt").

`normalize.ts` (idempotente Legacy-Migration, deterministische Slot-IDs) · `schedule-time.ts` (DST-korrekte Zeitmathematik via `Intl`; `instanceDate` = single source „wann"; Horizont 8 Wochen).

#### 12.6 Scheduler-Zeitmathematik

`schedule-time.ts`: DST-korrekte Zeitmathematik via `Intl`; `instanceDate` = single source „wann"; **Horizont 8 Wochen** *(siehe ⚠ Diskrepanz-Hinweis zu §10.5: dort 12 Wochen genannt)*.

**Intake —** `mail-inbox.ts`**:** MS-Graph OAuth2 Client-Credentials (App-Permissions, Service-Account), Token gecached. `fetchNewEmails` (ungelesen), `fetchEmailWithAttachments` (Body→Plaintext, Attachments base64→Text), `delete/markAsProcessed`.

**MCP —** `mcp-posts.ts` (read-side: `listPosts/getPost/updatePostFromMcp` mit Feld-Typ-Validierung) · `mcp-tokens.ts` (`create/revoke/validate`, SHA-256, constant-time `timingSafeEqual`, Plaintext einmalig).

**Config/Auth —** `system-config.ts` (30 s TTL, `fresh`-Bypass, 429-Backoff, Cache-Warming) · `settings-storage.ts` (`getSettings` normalisiert Schedules bei jedem Read; `saveScheduleTemplates` bewahrt server-eigene `slotInstances`) · `auth.ts`**/**`auth-guard.ts` (NextAuth Google, JWT, Whitelist; `requireAuth()`). **Helfer:** `posts-list.ts`, `transform-storyblok.ts`, `editor-kind.ts`, `richtext-utils.ts`, `tiptap-paste.ts`, `utils.ts`.

#### 12.7 API-Routen (`src/app/api/**`)

Alle verlangen NextAuth-Session+Whitelist, außer markiert. Dünne Orchestratoren der `lib/`-Funktionen.

| Route | Methoden | Zweck / Kontrakt |
| --- | --- | --- |
| ai/generate | POST | {type, source*, hint?, modelId?, contentType?, blogBodyVariant?, text?, instruction?, isFullDocument?, storyId?}; type ∈ pagetitle/abstract/pageintro/teasertitle/readmoretext/body/linkedin/tags/optimize. Persistiert bei storyId. |
| ai/generate-image | POST | action: prompt\|image\|upload → {imagePrompt} / {base64} / {assetUrl,assetId} |
| ai/models | GET | verfügbare Modelle/Provider/Default |
| auth/[...nextauth] | GET/POST | NextAuth |
| cron/tick | POST | Bearer CRON_SECRET od. Session → runScheduleTick() |
| import/emails · import/process | GET · POST | Posteingang listen · ausgewählte Mails → Drafts (blog/linkedin) |
| posts | GET/POST/PATCH | Liste (CDN+Mgmt merge) · anlegen · aktualisieren |
| posts/list | GET | ?scope=&content=&linkedin=&q= server-seitig gefiltert |
| posts/[id] · posts/[id]/publish | GET · POST/DELETE | Einzelpost per Slug · publish/unpublish |
| posts/upload | POST | Asset-Upload (FormData) |
| linkedin · linkedin/[id] | GET/POST/PATCH · GET | Liste(+Eltern-Preview)/anlegen/aktualisieren · Einzel+Eltern-OG |
| mcp | POST | Bearer-Token (gehasht); Tools create_draft/list_posts/get_post/update_post |
| publishing/linkedin | POST | {id} → publishLinkedinNow() → {success,replaced,postIds,jobId} |
| publishing/publer(+/accounts) | POST/GET | Multi-Channel-Blog-Publish (Scaffolding) · Accounts |
| schedule | GET | Editorial-Plan (Slots+Instanzen, abgeleitete Daten, Orphan-Flag) |
| schedule/assign · schedule/move | POST/DELETE · POST | Post an Slot binden/entfernen (content-complete-Gate) · verschieben |
| settings | GET/PATCH | lesen · schreiben (Schedules via saveScheduleTemplates) |
| settings/tokens(+/[id]) | GET/POST · DELETE | MCP-Tokens listen/anlegen (Plaintext einmalig) · widerrufen |

#### 12.8 Auth & Middleware

`middleware.ts` gated `/dashboard,/posts,/linkedin,/import,/settings,/schedule` + `/api/{posts,linkedin,publishing,import,ai,schedule}`; **öffentlich:** `/login`, `/api/auth`, `/api/mcp` (eigener Token). UI → Redirect `/login`, API → 401. **Drei Auth-Pfade:** NextAuth/Google (UI+API), Bearer `CRON_SECRET` (Tick headless), gehashter MCP-Token. Whitelist = `ADMIN_WHITELIST`.

#### 12.9 Frontend (wird neu gebaut) — Referenz

**Shell:** Root-Layout mit Providern (NextAuth-Session, react-query, Theme, sonner-Toaster); `(admin)/layout.tsx` → `AppLayout` (Sticky-Header-Nav, Mobile-Hamburger); Fonts Playfair (Headings)+Inter; dunkles „Luxury"-Theme + TipTap-Styles in `globals.css`.

**Seiten:**

- **login** — Google-OAuth-Button.
- **dashboard** — 4 Stat-Cards + Recent Activity (`recharts`).
- **posts** — Zwei-Achsen-Status-Filtergrid (Content · LinkedIn) mit Count-Badges, Suche, Grid/List-Toggle, Bulk-Delete; **URL-State** (`view,q,scope,content,linkedin`, debounced); ruft `posts/list`+`linkedin` (join → `linkedinByBlog`).
- **posts/\[id\]** — größte Seite: links TipTap-Body-Editor + LinkedIn-Sektion, rechts (sticky) AI-Settings-Drawer/Status/Meta/Quellmaterial; Per-Feld-**Generate** + Batch „Generate All", **Bild-Flow** (Prompt→DALL·E→Preview→Upload bei Save), **Optimize**-Dialog, Dirty-Tracking per Snapshot, **Intake-Resolution** (MICM-22).
- **linkedin / linkedin/\[id\]** — Karten+Filter / Editor (Text, Bild, Tags, Attach/Detach, Publer-Label, Publish-Button).
- **schedule** — zwei Ansichten (Tracks: Lanes×Slots Drag&Drop / Kalender-Wochengrid), „Run now" → `cron/tick`.
- **import** — Posteingangsliste, Ziel-Selektor blog/linkedin → `import/process`.
- **settings** — Tabs: Prompts, Modellwahl, Publer-Labels, Schedules (Templates), Notizen, MCP-Tokens.
- **create** — Titel + TipTap-Quellmaterial → `POST /api/posts`.

**Komponenten:** `layout/AppLayout`, `dashboard/{StatCard,ActivityList}`, `posts/PostCard`, `linkedin/{LinkedinEditor,LinkedinCard,BlogLinkedinSection}`, `scheduler/{ScheduleAssign,ScheduleTracksView,ScheduleCalendarView}`, `publer/PublerSection`, `ui/` (shadcn/Radix-Primitives).

**Block-Editor (**`components/blocks/`**):** `BodyEditor` (Drag&Drop via `@dnd-kit`, „Block hinzufügen") mit **6 Blocktypen** → Storyblok-Body: `richtext` (TipTap: Headings, bold/italic, Links, Listen, Blockquote, Codeblock, Tabellen), `picture`, `youtube`, `video`, `divider`, `hyperlink`. KI-Body kommt als Markdown → `markdownToProsemirror`.

**UI-Muster:** Status-Pipelines (MICM-37, Achsen Content·LinkedIn, rot→gelb→blau→grün, Filtergrid+Dots); Bestätigungen nur via `AlertDialog`/`Dialog` (**nie** native `confirm/alert`); Toasts via `sonner`; AI-Generate-State (`generating: Set`, Batch-Progress, `generatingImage`).

#### 12.10 Build, Betrieb & Env

**Makefile:** `make check` = `lint`+`typecheck` (primäre Verifikation) · `dev`/`stop` · `build` (nur Deployment) · `sb-sync` = Komponenten ziehen + Typen regenerieren (`component-types-sb.d.ts`) · `docker-{build,up,down}`. **Kein Test-Suite** — „verify" = `make check` + manuell in `make dev`.

`next.config.ts`**:** `output:'standalone'`, `transpilePackages` (react-markdown/remark-\*), Image-`remotePatterns` (storyblok/sharepoint/googleusercontent).

| Env-Gruppe | Variablen |
| --- | --- |
| Storyblok | NEXT_PUBLIC_STORYBLOK_TOKEN, STORYBLOK_MANAGEMENT_TOKEN, STORYBLOK_SPACE_ID=330326, NEXT_PUBLIC_STORYBLOK_DISABLECACHING |
| Auth | NEXTAUTH_URL/_SECRET, GOOGLE_CLIENT_ID/_SECRET, ADMIN_WHITELIST |
| KI | OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_AI_API_KEY (≥1) |
| Mail-Intake | MAILINBOX_USERNAME, AZURE_TENANT_ID/CLIENT_ID/CLIENT_SECRET |
| Publer | PUBLER_API_KEY/_API_URL/_WORKSPACE_ID (+ PUBLER_LINKEDIN_ACCOUNT_ID) |
| Scheduler / Website | CRON_SECRET · WWW_REVALIDATE_URL, WWW_PUBLIC_BASE_URL |

> Headless-Scheduler: externer (ansible-verwalteter) Cron ruft `POST /api/cron/tick` mit `Authorization: Bearer $CRON_SECRET`.

#### 12.11 Querschnitts-Invarianten

- Storyblok-Filter: String-Gleichheit braucht `in`, nicht `is`.
- `published`-Boolean nutzen, nie `published_at` (bleibt nach Unpublish stehen).
- Rate-Limits (\~5 req/s): `managementFetch`/`system-config` retrien mit Backoff; Bulk per `by_uuids` (per_page=100).
- Idempotenz: Scheduler status-basiert; LinkedIn über Publer-State (published⇒block, queued⇒replace); Storyblok-Publish idempotent.
- Caching: System-Config 30 s, `fresh`-Read für Read-Modify-Write.
- Coupling: Blog zuerst publishen, dann angehängte content-complete LinkedIn-Posts (sonst greift der 409-Guard).
- Keine nativen Dialoge; Destruktives immer modal bestätigen.

#### 12.12 Transformations-Hinweise (Brücke zum Seed)

**Erhalten (Backend, §12.5–12.8):** KI-Generierung inkl. Prompts, LinkedIn/Publer-Contract, Scheduler, Intake (MS Graph), MCP, Status-Aggregation, Auth-Pfade.

**Neu bauen (Frontend, §12.9):** gesamte UI; Zielbild u. a. die Multi-Format-Tab-UI der ZDB-Variante (siehe Bestandsanalyse).

**Persistenz-Umzug Storyblok → Supabase (Seed §7.1):**

1. `storyblok.ts` + `storyblok-management.ts` durch Supabase-Client ersetzen.
2. `system-config.ts` → Supabase-`settings`-Tabelle (ZDB-Variante hat dieses Modell bereits).
3. Scheduler-/KI-/LinkedIn-/Publer-/Intake-Logik bleibt; Routen bleiben Schnittstelle, nur das I/O dahinter wechselt.
4. **Storyblok wird vom Primärspeicher zum Publishing-Adapter** — konsistent mit der Adapter-Architektur (Seed §6.2) und dem Modell Post → Publikation → Channel (§7.3).

**Altlasten:** Legacy-`name`, nicht-verdrahtete Publer-Formatter, Legacy-Storyblok-Komponenten, driftende Modell-IDs/Prompts. Natürlicher Schnitt beim Neubau: `lib/` (Logik) vs. `app/(admin)`+`components/` (UI).

### 13. Feature-Gegenüberstellung (Feature-Diff A vs. B)

#### 13.1 Gemeinsamer Kern (beide Versionen)

Next.js 15 / React 18 / shadcn / Tailwind / TipTap · NextAuth + E-Mail-Whitelist · Multi-Provider-KI (OpenAI/Anthropic/Google) mit Per-Feld-Generierung + `optimize` · Blog-Metadatenfelder (pagetitle, pageintro, abstract, teasertitle, readmoretext, date, header-/teaserimage) · `source_raw`/`source_summarized` + `ai_hint` + `image_prompt` · `content_complete` + `confirmed_at` · DALL·E-Bildgenerierung · Publer-Anbindung · Settings-Page (Modell + Prompts) · Dashboard + Postliste mit Status-Dots.

#### 13.2 Nur in A (SmartEditor) — fehlt in B

| Feature | Anmerkung |
| --- | --- |
| Eigener Scheduler | Wöchentliche Slots, SlotInstances, Tracks-/Kalender-UI, Cron-Tick, Retry-Cap, Orphan-Handling (MICM-14/16/20/32) |
| LinkedIn↔Blog-Kopplung | Attached Posts, OG-Link-Share, Publish-Guard, gekoppeltes Publishing im Tick |
| Idempotenter Publer-Push-Contract | 409 bei published, Replace bei queued (MICM-17) |
| MCP-Server | create_draft/list_posts/get_post/update_post + gehashte Bearer-Tokens |
| Mail-/Plaud-Intake mit UI | MS-Graph-Anbindung + /import-Seite |
| Block-Editor | picture/youtube/video/divider/hyperlink + Drag&Drop |
| Content-Typen + Varianten | blog (short/long), article — typ-/variantenspezifische Body- & Bild-Prompts |
| Intake-Pending-Flow | MCP-Draft ohne Typwahl (MICM-22) |
| Origin-Tracking | cm_origin import/create/mcp |
| 2-Pipeline-Status | Content · LinkedIn, inkl. „scheduled" (blau) |
| Storyblok-Publish + Website-Render | Draft-only = unsichtbar als bewusster Mechanismus |
| Publer-Labels | benannte Posting-Slots (MICM-13) |

#### 13.3 Nur in B (ZDB) — fehlt in A

| Feature | Anmerkung |
| --- | --- |
| Supabase/PostgreSQL als Primärpersistenz | ← genau die Architektur, die der Seed fordert; RLS, Storage-Bucket, Migrationen |
| Echtes Multi-Format-Modell | content_formats JSONB — mehrere parallele Publikationen aus einer Quelle |
| Format-Definitionen mit Länge+Tonalität | rundschreiben/pressemeldung/linkedin/whatsapp deklarativ |
| Multi-Format-Editor-UI | Tabs pro Format |
| Breiteres Publer-Kanalset (live) | Instagram, Facebook, Pinterest, Twitter/X, Threads mit Formattern |
| Azure AD / Microsoft-365-Login | als verdrahteter Auth-Provider |
| Settings als DB-Tabelle | statt CMS-Story |
| Self-hosted-Stack + Deployment-Topologie | Docker-Compose, Traefik, GitLab-CI, Prod-Domains |
| Dokument-Export-Ansatz | Word/PDF/Markdown in der UI angedacht |

#### 13.4 Begriffs-/Konzept-Kollisionen (beim Merge zu klären)

- **„LinkedIn"**: in A eigener Story-Typ mit Blog-Kopplung; in B ein Format unter `content_formats`. → Im Zielmodell wird LinkedIn **eine Publikation** unter vielen (siehe Seed-Entität „Publikation").
- **Settings-Ort**: A=Storyblok-Story, B=DB-Tabelle. → Ziel: DB.
- **Persistenz**: A=Storyblok (Primär), B=Supabase. → Ziel: Supabase als Primär, Storyblok wird zum **Publishing-Adapter** degradiert (Seed §7.1 / §6.2).
- **Modell-IDs** divergieren (A liest aktuelle Provider-Liste, B `gpt-4o`/`claude-opus-4`) — irrelevant fürs Requirement, beide sind provider-agnostisch.

> **⚠ Hinweis (Modell-ID-Abweichung):** §13.4 nennt für B die Modell-IDs `gpt-4o`/`claude-opus-4`. Die Ist-Stand-Registry von A (§12.5) listet abweichend `gpt-5.5`(Default), `gpt-5.4-mini`, `claude-opus-4-8/sonnet-4-6/haiku-4-5`, `gemini-3.5-flash/2.5-pro/3.1-flash-lite`. Beide Angaben bleiben dokumentiert; für das Requirement irrelevant, da provider-agnostisch.

### 14. Gesamtrequirement (fusioniert)

> Vereinigungsmenge beider Versionen, organisiert nach Capability-Domänen. **Basis** = Version A (dieses Repo), sofern nicht anders vermerkt. Jede Zeile markiert Herkunft: **\[A\]** vorhanden in A · **\[B\]** vorhanden in B · **\[A+B\]** beide · **\[NEU\]** aus dem Seed, in keiner Version vorhanden.

#### 14.1 Datenmodell & Persistenz

- **\[B→Basis\]** Primärpersistenz in **lokaler relationaler DB (Supabase/PostgreSQL)**; Storyblok/LinkedIn/… werden nur noch Publishing-Ziele.
- **\[NEU\]** Kern-Entitäten (Seed): **Post** (1 Quelle/Seed) → **Publikation** (kundenspezifisches Zielformat) → **Channel** (Publishing-Ziel). Begriff für „Publikation" final festzulegen.
- **\[B\]** Eine Quelle erzeugt **n parallele Publikationen** (`content_formats`-Prinzip), je als eigenständiges Dokument.
- **\[A+B\]** Gemeinsame Meta- & Quellfelder (title/intro/abstract/teaser/readmore/date/images, `source_raw`/`source_summarized`, `ai_hint`, `image_prompt`).
- **\[A\]** Status je Objekt (`content_complete`+`confirmed_at`, Publish-State, Publer-State) — pro Publikation, nicht pro Post.
- **\[A\]** Origin-Tracking (`import`/`create`/`mcp`), Intake-Pending.

#### 14.2 Intake / Seed

- **\[A\]** Mail-/Plaud-Import via MS Graph **inkl. UI** als Basis.
- **\[A+B\]** `source_raw` + `source_summarized` + `ai_hint`.
- **\[NEU/Seed\]** Ein Post kann ggf. **mehrere Seeds** haben (offen).

#### 14.3 KI-Generierung (der geheime Mehrwert)

- **\[A+B\]** Provider-agnostisch (OpenAI/Anthropic/Google), Modell überschreibbar, `optimize`.
- **\[B→generalisiert\]** **Pro Publikationsformat ein eigener Prompt** mit deklarierter **Länge + Tonalität + Struktur**.
- **\[NEU/Seed\]** Übergeordneter, **geheimer Redakteurs-/System-Prompt** als Kern-Mehrwert, der über allen Format-Prompts liegt.
- **\[A\]** Bild-Pipeline: Prompt-Generierung → DALL·E → Upload; format-/typspezifische Bild-Meta-Prompts. Bilder zwischen Publikationen teilbar (Seed §3.2).

#### 14.4 Publikationsformate (frei definierbar)

- **\[NEU/Seed\]** Kunde definiert **eigene, frei anpassbare Format-Liste** (idealerweise per UI).
- **\[B\]** Beispielformate als Startset: Rundschreiben, Pressemeldung, LinkedIn, WhatsApp; **\[A\]** Blog (short/long), Article. Plus Seed-Wünsche: Presse an Spiegel/Springer etc.
- **\[NEU/Seed\]** Content reduziert auf **Markdown** als kanonisches Feldformat (→ HTML/Word/PDF ableitbar); reiner Text als zweite Ausprägung. Markdown muss Code-Sections & Tabellen können.
- **\[B\]** Format trägt Längen-/Tonalitäts-Konfiguration.

#### 14.5 Editor

- **\[A→Basis\]** Block-Editor (TipTap: richtext/picture/youtube/video/divider/hyperlink, Drag&Drop) + Markdown↔ProseMirror.
- **\[B\]** **Multi-Format-Tab-UI**: pro Publikation ein Editor-Tab, je mit Generate/Optimize/Copy.

#### 14.6 Kanäle / Publishing / Adapter

- **\[NEU/Seed\]** **Adapter-Architektur**: jedes Zielsystem implementiert ein klares **Channel-Interface** (reine Implementierungssache, agentfreundlich); Kanäle per Code erweiterbar.
- **\[A\]** LinkedIn (Publer, Link-Share, Idempotenz-Contract) als reifster Adapter; **\[B\]** Instagram/Facebook/Pinterest/X/Threads-Formatter.
- **\[A\]** Storyblok-Publish-Adapter (Website) — von Primärpersistenz zu reinem Ziel umgebaut.
- **\[NEU/Seed\]** **Download-/Versand-Adapter für jeden Channel**: Markdown/Word/PDF (intern via LibreOffice/ODF, Word→PDF), optional automatischer **E-Mail-Versand** des Dokuments; kundenspezifische Word-/ODF-Vorlage (Branding) hochladbar.
- **\[NEU/Seed\]** Zu klären: LinkedIn direkt per API statt über Publer? Welchen Mehrwert (Klick-Auswertung etc.) liefert Publer noch?

#### 14.7 Scheduling

- **\[A→Basis\]** Eigener Scheduler: wöchentliche Slots, SlotInstances, Tracks-/Kalender-UI, Cron-Tick, Retry-Cap, Orphan-Handling, gekoppeltes Publishing. **Beibehalten und ausbauen** (Seed §5).
- **\[A\]** Benannte Slots/Labels.

#### 14.8 Settings / Konfiguration

- **\[B→Basis\]** Settings in **DB** (nicht CMS-Story): App-Default-Modell, Prompts (global + pro Format), Notes.
- **\[A\]** Editierbare Prompts pro Feld/Format/Variante; Publer-Labels; MCP-Tokens; Schedules.
- **\[NEU/Seed\]** Channel-Verwaltung (anlegen/konfigurieren) idealerweise per UI.

#### 14.9 Auth & Mandanten

- **\[A+B\]** NextAuth + E-Mail-Whitelist als Basis; **beide** Provider zusammenführen: **Google \[A\] + Microsoft 365/Azure AD \[B\]**.
- **\[NEU/Seed\]** Zusätzlich **E-Mail/Passwort-Login** (für Nutzer ohne OAuth).
- **\[NEU/Seed\]** **Betriebs-/Mandantenmodell** entscheiden (offen, Recherche nötig): (A) eine DB+Container, vollständig mandantengetrennt (leicht im Rollout, hoher Security-Impact bei Datentrennung); (B) eine App + DB pro Kunde; (C) voller Stack pro Kunde mit gemeinsamem Deployment. → Bedingt **echte Releases** statt Continuous-Hot-Fixing.

#### 14.10 Automatisierung / API / MCP

- **\[A\]** MCP-Server (`create_draft`/`list_posts`/`get_post`/`update_post`) + gehashte Bearer-Tokens — generisch über Posts/Publikationen.

#### 14.11 Status / Pipelines / Dashboard

- **\[A→generalisiert\]** Mehr-Pipeline-Statusmodell pro Publikation (Content-Reife · je Channel ein Publish-/Schedule-Status inkl. „scheduled").
- **\[A+B\]** Dashboard mit Kennzahlen + Recent Activity; server-seitig gefilterte Listen.

#### 14.12 Betrieb / Deployment

- **\[B→Basis\]** Self-hosted-Supabase-Stack, Docker-Compose, Traefik, GitLab-CI als Deployment-Fundament.
- **\[NEU/Seed\]** Release-Disziplin (versioniert, nicht ad-hoc) — Voraussetzung fürs Produkt; abhängig vom Mandantenmodell (§14.9).

### 15. Offene Fragen / noch zu entscheiden

Gesammelt aus allen Quelldokumenten — bewusst offen gelassene Punkte:

 1. **Entitäts-Benennung** der konkreten Einzel-Posts („Publikation" vs. anderer Begriff) — final festzulegen (Post · ? · Channel) (§7.3, §13.4, §14.1).
 2. **Mehrere Seeds pro Post** — möglich oder nicht? (§7.3, §14.2)
 3. **Kanal-Konfiguration per UI** — ja/nein bzw. in welchem Umfang (§2, §14.8).
 4. **Publer vs. direkte API** für LinkedIn und welchen Mehrwert (Klick-Analytics) Publer bietet (§6.3, §14.6).
 5. **Betriebs-/Mandantenmodell** A/B/C — Recherche + Entscheidung; **größte offene Architekturfrage** (§8.2, §14.9).
 6. **Feldformate**: Reduktion auf Markdown + Text bestätigt? HTML/JSON als Sonderfälle? (§3.3, §14.4)
 7. **Dokument-Export-Engine**: Word-Vorlage vs. ODF/LibreOffice als interner Standard; Branding-Vorlagen als Querschnitts-Channel-Capability spezifizieren (§6.5, §14.6).
 8. **Welche Kanäle zuerst** implementiert werden (die wichtigsten benennen) (§8.3).
 9. **Channel-Interface** spezifizieren (Methoden u. a.: generate-target-payload, publish, schedule, export, dispatch-email) (§14.6).
10. **Migrationspfad** A→Supabase: Datenmodell von B übernehmen, A's Prozessfeatures (Scheduler, MCP, Intake, LinkedIn-Kopplung) darauf neu aufsetzen; Storyblok zum Adapter degradieren (§12.12).
11. **Scheduler-Horizont-Diskrepanz**: 12 Wochen (§10.5) vs. 8 Wochen (§12.6) — ungeklärt.

### 16. Nächste Schritte (laut Intake-Abschluss)

Der Intake endete ursprünglich mit dem Auftrag, dem Seed Folgendes hinzuzufügen, damit alle aktuell angedachten Features auf **Requirements-Ebene fusioniert** werden:

- die **vollständige Beschreibung des SmartEditors** (persönlich),
- die **vollständige Produktbeschreibung des SmartEditors für den ZDB**.

> **Status:** Diese Fusion ist bereits erfolgt und in diesem konsolidierten Dokument enthalten (vollständige Requirements-Inventur beider Versionen, Feature-Diff und abgeleitetes Gesamtrequirement — siehe §10–§14).

### Anhang A — Konsolidierungs-Notizen

Im Text mit ⟦…⟧ markierte Stellen kennzeichnen Transkriptionskorrekturen und interpretierende Annahmen aus dem ursprünglichen Voice-Intake (29.06.2026, Oliver Meimberg):

- **⟦Publer⟧** — Produktname des Drittanbieter-Schedulers/Publishing-Tools (mehrfach referenziert).
- **⟦PDF⟧** — Dokumentformat-Bezug bei Export-Diskussion.
- **⟦SaaS⟧** — Betriebsmodell-Bezeichnung.
- **⟦mandantenmäßig⟧ / ⟦mandantenbasiert⟧** — Begriff für die mandantengetrennte Datenhaltung.
- **⟦Verbands-⟧** — Bezug auf das Verbands-Rundschreiben des ZDB.
- **⟦vermutlich direkt über die Oberfläche, noch nicht final entschieden⟧** — interpretierende Annahme zur Kanal-Konfiguration.
- **⟦möglicherweise sogar mehrere, noch offen⟧** — Annahme zu mehreren Seeds pro Post.

### Quellenvermerk

- **Voice-Intake** vom 29.06.2026, Oliver Meimberg (konsolidiert als `product-seed-konsolidiert.md`).
- **Bestandsanalyse & Gesamtrequirements** (`bestandsanalyse-und-gesamtrequirements.md`) — vollständige Code-Inventur beider Repos (`io.meimberg.contentmanager` und `zdb.airedak`, web/+supabase/migrations) am 29.06.2026; Abgleich mit dem Produkt-Seed.
- **Technische Ist-Stand-Dokumentation** (`iststand_smarteditor-technische-dokumentation_compact.md`) — vollständige Code-Inventur von `io.meimberg.contentmanager` (lib, API, Frontend, Typen, Build/Env) am 29.06.2026.