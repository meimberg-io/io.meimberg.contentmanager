### Architektur

#### Anforderungen

- **\[ÄND\] Primärpersistenz in relationaler Datenbank** (Supabase/PostgreSQL) statt Storyblok; Storyblok wird zum reinen Publishing-Ziel. *(Querbezug: Betriebsmodell, Mandantenfähigkeit)*
- **\[NEU\] Dreistufiges Kernmodell Post → Publikation → Channel** einführen; ersetzt die feste Blog-/Article-/LinkedIn-Typenstruktur.
- **\[ÄND\] Feste LinkedIn↔Blog-Kopplung auflösen** (`cm_blog_ref`); LinkedIn wird zu einer Publikation unter vielen.
- **\[NEU\] Adapter-Architektur mit klarem Channel-Interface** (ein Adapter je Zielsystem, agentenfreundlich). *(Querbezug: Features, Generalisierung)*
- **\[ÄND\] Storyblok vom Primärspeicher zum Publishing-Adapter degradieren.** *(Querbezug: Betriebsmodell)*
- **\[NEU\] Mandantenfähigkeit auf Architekturebene verankern** (Mandanten-Zuordnung durchgängig in Modell und Zugriffspfaden). *(Dominanter Cluster: siehe Mandantenfähigkeit – hier nur als Architekturverankerung)*
- **\[NEU\] Zielsystem-/Channel-Agnostik** des Produkts (Faustregel: ein Adapter je Zielsystem). *(Querbezug: Features)*
- **\[ÄND\] Sauberere Architektur-Kopplung** im generalisierten Post→Publikation→Channel-Modell.
- **\[ÄND\] I/O-Module austauschen** (`storyblok.ts`, `storyblok-management.ts` → Supabase-Client); Scheduler-/KI-/LinkedIn-/Publer-/Intake-Logik bleibt unverändert.
- **\[ÄND\] Settings von CMS-Story in DB-Tabelle überführen** (`system-config.ts` → Supabase-`settings`). *(Querbezug: Features, Mandantenfähigkeit)*
- **\[ÄND/B\] Multi-Format-Persistenz übernehmen** (`content_formats`-Prinzip generalisieren; deprecated `body`-JSONB entfällt).
- **\[ÄND\] Statusfelder pro Publikation statt pro Post** (`content_complete`+`confirmed_at`, Publish-/Channel-/Publer-State). *(Querbezug: Features)*
- **\[NEU/B\] Storage-Bucket für Assets** (Supabase-Storage `assets`, Pfadschema `posts/{ts}-{name}`); Bilder zwischen Publikationen teilbar. *(Querbezug: Features)*
- **\[NEU\] Migrationspfad A → Supabase** (B-Datenmodell übernehmen, A-Prozessfeatures darauf neu aufsetzen). *(Querbezug: Betriebsmodell)*
- **\[ÄND\] Storyblok-SDKs zurückbauen** (`@storyblok/react`, `storyblok-js-client`, CLI/Typen verbleiben nur im Storyblok-Adapter).
- **\[NEU\] Supabase-Client als Persistenzkomponente einführen.**
- **\[BESTAND, erhaltend\] Dünne API-Routen als Orchestratoren / Logik in** `src/lib/**` bleiben erhalten; nur das I/O wechselt.
- **\[BESTAND, erhaltend\] Frontend-Tech-Stack als Neubau-Referenz** (Next.js 15 / React 18 / shadcn/Tailwind / TipTap). *(Querbezug: Features – Multi-Format-UI)*

#### Annahmen

- **\[EXPLIZIT\] ARCH-01:** Backend-Logik in `src/lib/**` bleibt im Kern erhalten, isolierte Storyblok-I/O-Module sind überschaubar migrierbar.
- **\[EXPLIZIT\] ARCH-02:** Supabase/PostgreSQL ist Zielarchitektur für die Primärpersistenz.
- **\[EXPLIZIT\] ARCH-03:** Persistenz-Umzug Storyblok→Supabase ist agentengestützt umsetzbar („kein großes Problem").
- **\[EXPLIZIT\] ARCH-04:** API-Routen sind dünne Orchestratoren; I/O-Wechsel lässt die Routen-Schnittstelle bestehen.
- **\[EXPLIZIT\] ARCH-05:** Frontend wird neu gebaut, heutige UI nur als Referenz. *(Hinweis: durch Offenen Punkt 17 relativiert – Frontend wird nicht vollständig neugebaut.)*
- **\[EXPLIZIT\] ARCH-06:** Jedes Zielsystem hat einen Adapter; Kanäle werden per Code erweitert.
- **\[IMPLIZIT 🟡\] ARCH-07:** B-Datenmodell (posts + content_formats JSONB) ist tragfähig genug für die Dreistufigkeit. *(Querbezug: offener Punkt 21)*
- **\[IMPLIZIT 🟡\] ARCH-08:** Querschnitts-Invarianten (Backoff, Caching, Idempotenz) sinngemäß auf DB-Persistenz übertragbar. *(Querbezug: Betriebsmodell)*
- **\[IMPLIZIT 🔴\] ARCH-09:** Channel-Interface kann heterogene Ziele (Social-API, CMS, E-Mail, Download) unter einem Interface subsumieren. *(Querbezug: Features, offener Punkt 10/12)*
- **\[IMPLIZIT 🟢\] ARCH-10:** TipTap/ProseMirror bleibt Editor-Basis und trägt Multi-Format-Tabs.
- **\[IMPLIZIT 🟢\] ARCH-11:** Next.js 15 / React 18 / NextAuth bleiben gemeinsamer Tech-Stack.

#### Offene Punkte

- **\[ENTSCHIEDEN\] OP 21 – Tragfähigkeit B-Datenmodell für Dreistufigkeit:** als Implementierungsdetail eingestuft.
- **\[ENTSCHIEDEN\] OP 22 – Unsaubere LinkedIn↔Blog-Kopplung:** übergeordnete Entität „Story", angehängte Fassungen „Rendition".
- **\[ENTSCHIEDEN\] OP 2 – Begriff „Publikation":** Story (Post mit Seed), Rendition (vormals Publikation), Channel. *(Querbezug: Generalisierung)*
- **\[ENTSCHIEDEN\] OP 11 – Migrationspfad/Bestandsdaten:** Bestand wird initial per Script migriert (nicht Teil der App). *(Querbezug: Betriebsmodell)*

### Generalisierung

#### Anforderungen

- **\[NEU\] Mehrere parallele Publikationen aus einer Quelle** (n eigenständige, unabhängig editier-/publizierbare Dokumente; Generalisierung des ZDB-`content_formats`-Prinzips).
- **\[NEU\] Frei definierbare Publikationsformate** (frei anpassbare Liste pro Nutzer/Kunde). *(Querbezug: Mandantenfähigkeit, Features)*
- **\[ERW\] Format trägt Längen-, Tonalitäts- und Strukturkonfiguration** (deklarativ, aus Version B generalisiert).
- **\[NEU\] Erweitertes Startset an Formaten** (Blog short/long, Article, Rundschreiben, Pressemeldung, LinkedIn, WhatsApp, Presse-Varianten).
- **\[ÄND\] Markdown als kanonisches Feldformat** (+ reiner Text; HTML/Word/PDF ableitbar; Code-Sections und Tabellen). *(Querbezug: Features – Export)*
- **\[NEU\] Frei erweiterbare Publikationsformate ohne Codeänderung am Kern** (idealerweise per UI). *(Querbezug: Mandantenfähigkeit, Features)*
- **\[NEU\] Agentenfreundliche Erweiterbarkeit von Channels** (neuer Channel = reine Interface-Implementierung). *(Querbezug: Architektur, Betriebsmodell)*
- **\[NEU\] Editierbarkeit von Prompts und Modell-Registry zur Laufzeit** (Modell-IDs driften). *(Querbezug: Features – KI)*
- **\[NEU\] Kein Fork des Kerns / Ein-Produkt-Prinzip** (ZDB-Anforderungen auf Requirements-Ebene integriert). *(Querbezug: Betriebsmodell, Architektur)*
- **\[ERW\] MCP generisch über Posts/Publikationen** (Verallgemeinerung des MCP-Servers auf das neue Modell). *(Querbezug: Features)*

#### Annahmen

- **\[EXPLIZIT\] PROD-02:** Version A ist Basis; Version B wird auf Requirements-Ebene dazugeholt.
- **\[EXPLIZIT\] PROD-03:** Versionen komplementär; Gesamtprodukt = Datenmodell B + Prozessfeatures A.
- **\[IMPLIZIT 🟡\] PROD-06:** ZDB ist (potenzieller) Referenzkunde, nicht nur technischer Fork.
- **\[IMPLIZIT 🟡\] PROD-07:** KI-Generierungsqualität bleibt bei Generalisierung erhalten. *(Querbezug: Features – KI)*
- **\[EXPLIZIT\] DATA-01:** Entitätenmodell dreistufig Post → Publikation → Channel. *(Querbezug: Architektur)*
- **\[IMPLIZIT 🟢\] DATA-10:** LinkedIn wird zu einer Publikation unter vielen. *(Querbezug: Architektur)*
- **\[EXPLIZIT\] KI-05 → siehe Features:** deklarative Format-Konfiguration. *(dominanter Cluster Features)*

#### Offene Punkte

- **\[ENTSCHIEDEN\] OP 5 – Kanal-/Format-Konfiguration per UI:** ja, in den Settings, pro Mandant. *(Querbezug: Mandantenfähigkeit, Features)*
- **\[ENTSCHIEDEN\] OP 7 – Feldformat-Reduktion auf Markdown + Text:** bestätigt; Block-Modell mit weiteren Contenttypen (Mapping auf Storyblok-Schema) bleibt erhalten. *(Querbezug: Features)*
- **\[ENTSCHIEDEN\] OP 13 – Modell-ID-Abweichung B vs. A-Registry:** irrelevant, vom User in Settings setzbar. *(Querbezug: Features – KI)*

### Mandantenfähigkeit

#### Anforderungen

- **\[NEU\] Mandantenfähigkeit mit Datentrennung** (kein Mandant sieht/ändert fremde Posts/Publikationen).
- **\[NEU\] Vollständige Mandantenfähigkeit des Datenmodells** (Mandanten-Zuordnung auf allen relevanten Entitäten Post/Publikation/Channel/Settings).
- **\[NEU\] Datenmodell durchgängig mandantenbasiert gestalten** (jede mandantengebundene Entität trägt Mandanten-Referenz).
- **\[NEU\] Sichere Mandanten-Zugriffskontrolle** (technische Durchsetzung; RLS aus Version B als Referenz). *(Querbezug: Betriebsmodell)*
- **\[NEU\] Row-Level-Security als Mandanten-Isolationsmechanismus** (um Mandanten-Dimension erweitert). *(Querbezug: Architektur, Betriebsmodell)*
- **\[NEU\] Mandantenspezifische Konfiguration** (Format-/Kanal-/Prompt-/Branding-Konfiguration pro Mandant isoliert). *(Querbezug: Generalisierung, Features)*
- **\[NEU\] Mandantenspezifische Konfiguration isolieren** (Format-/Kanal-/Prompt-/Branding-Konfiguration getrennt). *(Architektur-/Generalisierungs-Querbezug)*
- **\[NEU\] Schutz des geheimen Redakteurs-/System-Prompts** (nicht in Frontend/API/Logs/gegenüber Mandanten offengelegt). *(Querbezug: Features – KI)*

#### Annahmen

- **\[IMPLIZIT 🟡\] PROD-05:** Es existiert ein zahlungsbereiter Markt mehrerer Kunden mit individuellem Kanal-/Formatbedarf.
- **\[IMPLIZIT 🟢\] DATA-08:** Jede mandantengebundene Entität trägt eine Mandanten-Referenz. *(Querbezug: Architektur)*
- **\[EXPLIZIT\] OPS-03:** Mandantengetrennte Absicherung hat hohen Security-Impact. *(Querbezug: Betriebsmodell)*
- **\[EXPLIZIT\] OPS-05:** Beide OAuth-Provider (Google + Microsoft 365/Azure AD) zusammengeführt, zusätzlich E-Mail/Passwort. *(Querbezug: Features – Auth)*

#### Offene Punkte

- **\[ENTSCHIEDEN\] OP 1 – Betriebs-/Mandantenmodell A/B/C:** Pooled Database (Option A), `org_id` je Zeile, RLS-Isolation; Tenant = Organisation/Workspace; Memberships mit Rolle. *(Querbezug: Architektur, Betriebsmodell)*
- **\[ENTSCHIEDEN\] OP 14 – Rollensystem:** pro Mandant Admins (User/Rollen/Settings) und Redakteure. *(Querbezug: Features – Auth)*
- **\[ERLEDIGT/qualitativ\] OP 16 – I18N/L10N & Mehr-Zeitzonen:** zunächst keine I18N; später Posts übersetzbar. *(Querbezug: Features)*

### Features

#### Anforderungen

- **\[NEU\] Mehrere Seeds pro Post.** *(Kardinalität – siehe OP 3)* *(Querbezug: Architektur)*
- **\[NEU\] Multi-Format-Tab-UI** (pro Publikation eigener Editor-Tab mit Generate/Optimize/Copy).
- **\[NEU\] Multi-Format-Bedienkonzept** (parallele Bearbeitung über Tabs, ergonomisch).
- **\[ERW\] Beibehaltung etablierter UI-Muster** (modale Bestätigungen, Toasts, Status-Pipelines, URL-State).
- **\[NEU\] Übergeordneter geheimer Redakteurs-/System-Prompt** (über allen Format-Prompts). *(Querbezug: Mandantenfähigkeit)*
- **\[ERW\] Pro Publikationsformat ein eigener Prompt** (mit deklarierter Länge/Tonalität/Struktur). *(Querbezug: Generalisierung)*
- **\[ERW\] Bilder zwischen Publikationen teilbar** (z. B. LinkedIn+Blog teilen, WhatsApp nicht). *(Querbezug: Architektur – Asset-Storage)*
- **\[ERW\] Breiteres Live-Kanalset** (Instagram, Facebook, Pinterest, Twitter/X, Threads mit Formattern). *(Querbezug: Architektur – Adapter)*
- **\[NEU\] Download-/Versand-Adapter pro Channel** (Markdown/Word/PDF-Export, optional E-Mail-Versand beim Publishen). *(Querbezug: Architektur)*
- **\[NEU\] Dokument-Export mit Branding-Vorlage** (kundenspezifische Word-/ODF-Vorlagen hochladbar). *(Querbezug: Mandantenfähigkeit, Betriebsmodell)*
- **\[NEU\] Channel-Verwaltung per UI** (Channels anlegen/konfigurieren). *(Querbezug: Generalisierung, Mandantenfähigkeit)*
- **\[ÄND\] Settings in der Datenbank** (Default-Modell, Prompts global/pro Format, Notes, Labels, Schedules, MCP-Tokens). *(Querbezug: Architektur)*
- **\[ERW\] Zusammenführung beider OAuth-Provider** (Google + Microsoft 365/Azure AD). *(Querbezug: Mandantenfähigkeit)*
- **\[NEU\] E-Mail/Passwort-Login** (alternativ zu OAuth). *(Querbezug: Mandantenfähigkeit, Betriebsmodell – Hashing)*
- **\[ERW\] Mehr-Pipeline-Statusmodell pro Publikation** (Content-Reife + pro Channel Publish-/Schedule-Status inkl. „scheduled"). *(Querbezug: Architektur)*
- **\[ERW\] Scheduler beibehalten und ausbauen.** *(Querbezug: Betriebsmodell)*
- **\[NEU\] Dokument-Export-Interoperabilität (Word/PDF/ODF)** (Markdown verlustarm → HTML/Word/PDF, ODF/LibreOffice favorisiert). *(Querbezug: Betriebsmodell – Runtime)*
- **\[ÄND\] Format-Kanonisierung auf Markdown + Text** (Code-Sections/Tabellen). *(dominant Generalisierung; hier als Feldformat-Feature-Querbezug)*
- **\[NEU\] Dokument-Export-Engine ergänzen** (Markdown→Word/PDF, ODF/LibreOffice favorisiert). *(Querbezug: Betriebsmodell)*
- **\[ERW\] Breiteres Publer-Kanalset live verdrahten** (Instagram/Facebook/Pinterest/Twitter-X/Threads aktivieren). *(Querbezug: Architektur)*
- **\[ERW\] Auth-Provider zusammenführen** (NextAuth: Google + Microsoft 365/Azure AD). *(Querbezug: Mandantenfähigkeit)*
- **\[NEU\] E-Mail/Passwort-Provider ergänzen** (inkl. Passwort-Hashing/Brute-Force-Schutz). *(Querbezug: Betriebsmodell)*
- **\[NEU\] E-Mail-Versand-Komponente** (automatischer Versand erzeugter Dokumente beim Publishen).

#### Annahmen

- **\[EXPLIZIT\] PROD-04:** Geheimer Redakteurs-Prompt = zentraler Produktwert. *(Querbezug: Mandantenfähigkeit)*
- **\[EXPLIZIT\] DATA-04:** Markdown kanonisches Feldformat, reiner Text als zweite Ausprägung. *(Querbezug: Generalisierung)*
- **\[EXPLIZIT\] DATA-05:** Markdown verlustarm nach HTML überführbar, umgekehrt nicht unbedingt.
- **\[EXPLIZIT\] DATA-06:** Status künftig pro Publikation statt pro Post. *(Querbezug: Architektur)*
- **\[IMPLIZIT 🟡\] DATA-07:** Teilbare Bilder erfordern eigene Asset-Entität mit n:m-Zuordnung. *(Querbezug: Architektur)*
- **\[EXPLIZIT\] KI-01:** Pro Kanal/Format genügen vermutlich spezifische Prompts (keine Agents/Skills).
- **\[EXPLIZIT\] KI-02:** Übergeordneter geheimer Redakteurs-Prompt über allen Format-Prompts existiert (vermutlich).
- **\[EXPLIZIT\] KI-03:** System bleibt provider-agnostisch, Modell überschreibbar.
- **\[EXPLIZIT\] KI-04:** Modell-IDs driften; Registry/Prompts bleiben editierbar. *(Querbezug: Generalisierung)*
- **\[IMPLIZIT 🟡\] KI-05:** Deklarative Format-Konfiguration (Länge/Tonalität/Struktur) reicht für hochwertige Outputs ohne format-spezifischen Code aus.
- **\[IMPLIZIT 🟢\] KI-06:** Bild-Pipeline (DALL·E / gpt-image-1) bleibt erhalten, auf Publikationsmodell übertragen.
- **\[EXPLIZIT\] PUB-01:** „Kanäle" = Publishing-Ziele (LinkedIn, Website/Storyblok, WordPress, X, Facebook etc.).
- **\[EXPLIZIT\] PUB-04:** Word wird immer generiert; PDF (vermutlich) aus Word/ODF.
- **\[EXPLIZIT\] PUB-07:** Kunden können Word-/ODF-Vorlage einmalig zurechtbasteln und hochladen (Branding). *(Querbezug: Mandantenfähigkeit)*
- **\[IMPLIZIT 🟡\] PUB-08:** A-inaktive Formatter und live verdrahtetes B-Kanalset zu gemeinsamem Live-Set zusammenführbar.

#### Offene Punkte

- **\[ENTSCHIEDEN\] OP 3 – Kardinalität Post ↔ Seed:** mehrere Seeds pro Post. *(Querbezug: Architektur)*
- **\[ENTSCHIEDEN\] OP 6 – Publer vs. native LinkedIn-API:** nativer LinkedIn-Adapter bauen, Publer als weiterer Adapter bleibt. *(Querbezug: Architektur, Betriebsmodell)*
- **\[ENTSCHIEDEN\] OP 9 – Kanäle für erstes Release:** zuerst Storyblok, LinkedIn (native), Download (md/docx/odt/pdf). *(Querbezug: Betriebsmodell)*
- **\[ENTSCHIEDEN\] OP 10 – Channel-Interface-Spezifikation:** Implementierungsdetail, später. *(Querbezug: Architektur)*
- **\[WIRD NICHT GEMACHT\] OP 23 – Geltungsbereich des geheimen Redakteurs-Prompts:** nicht weiter spezifiziert. *(Querbezug: Mandantenfähigkeit)*

### Betriebsmodell

#### Anforderungen

- **\[NEU\] Echte, versionierte Releases statt Hot-Fixing** (abhängig vom Mandantenmodell). *(Querbezug: Mandantenfähigkeit)*
- **\[NEU\] Versionierte, echte Releases statt Hot-Fixing** (jede Auslieferung trägt eindeutige Version). *(Architektur-/Betriebs-Querbezug)*
- **\[ÄND\] Self-hosted-Supabase-Stack als Deployment-Fundament** (Docker-Compose 13-Service-Stack, Traefik, GitLab-CI). *(Querbezug: Architektur)*
- **\[ÄND\] Deployment-Fundament auf Self-hosted-Supabase-Stack umstellen.** *(Querbezug: Architektur)*
- **\[ÄND\] Persistenz-Betrieb statt CMS-Abhängigkeit** (Wegfall Storyblok-Rate-Limits \~5 req/s; Backoff-/Cache-Mechanismen auf DB anpassen). *(Querbezug: Architektur)*
- **\[ÄND\] Caching-/Backoff-Mechanismen auf DB-Persistenz anpassen** (`managementFetch`-Retry, `system-config`-Cache).
- **\[ÄND\] CI/CD über GitLab** (Pipeline der Version B als Fundament).
- **\[ERW\] Headless-Scheduler-Cron beibehalten und auf neues Modell übertragen** (`POST /api/cron/tick` mit Bearer `CRON_SECRET`; Retry-Cap 3 → `failed`, Orphan-Handling, status-basierte Idempotenz, „verpasste Slots feuern am geplanten Datum"). *(Querbezug: Features – Scheduler)*
- **\[ERW\] Zuverlässigkeit des erweiterten Schedulers** (Bestandsmechanismen erhalten und übertragen). *(Querbezug: Features)*
- **\[ERW\] Idempotenz über mehrere Channels generalisieren** (published⇒409/block, queued⇒replace → breiteres Live-Kanalset). *(Querbezug: Architektur, Features)*
- **\[ERW\] Parallele Generierung mehrerer Formate** (erhöhte KI-Last/Nebenläufigkeit berücksichtigen). *(Querbezug: Features – KI)*
- **\[ERW\] Secret-Management für zusätzliche Provider/Channels** (Azure AD, Publer-Kanalset, Dokument-/E-Mail-Versand). *(Querbezug: Features, Mandantenfähigkeit)*
- **\[ERW\] Erweiterung der Auth-Pfade** (Microsoft-365/Azure-AD + E-Mail/Passwort sicher integrieren). *(Querbezug: Features – Auth)*

#### Annahmen

- **\[EXPLIZIT\] PROD-01:** Aus Individualsoftware lässt sich ein marktfähiges Produkt machen.
- **\[EXPLIZIT\] OPS-01:** SaaS-Anwendung; konkretes Betriebsmodell zu recherchieren.
- **\[EXPLIZIT\] OPS-02:** Drei Betriebsmodell-Optionen (A/B/C). *(Querbezug: Mandantenfähigkeit)*
- **\[EXPLIZIT\] OPS-04:** Nach Verkauf kein Hot-Fixing mehr; echte versionierte Releases nötig.
- **\[EXPLIZIT\] OPS-06:** Kanal-Konfiguration vermutlich über Oberfläche, nicht final entschieden. *(Querbezug: Generalisierung, Features)*
- **\[IMPLIZIT 🟡\] OPS-07:** Modell A (geteilte DB + RLS) wahrscheinlichster Kandidat. *(Querbezug: Mandantenfähigkeit; bestätigt durch OP 1)*
- **\[IMPLIZIT 🟢\] OPS-08:** E-Mail/Passwort-Login erfordert sicheres Hashing und Brute-Force-Schutz. *(Querbezug: Features – Auth)*
- **\[IMPLIZIT 🟢\] OPS-09:** Self-hosted-Supabase-Deployment von B (Docker-Compose/Traefik/GitLab-CI) als Fundament übernommen. *(Querbezug: Architektur)*
- **\[IMPLIZIT 🟢\] OPS-10:** Headless Cron-Tick (extern, ansible, Bearer-Token) bleibt Scheduler-Auslöser.
- **\[IMPLIZIT 🟡\] PUB-09:** LibreOffice-Runtime in Ziel-Topologie betreibbar (headless Konvertierungsdienst). *(Querbezug: Features – Export)*
- **\[EXPLIZIT\] PUB-02:** LinkedIn via Publer oder direkt API offen; aktuell Publer. *(Querbezug: Features; bestätigt durch OP 6)*
- **\[EXPLIZIT\] PUB-03:** Publer-Mehrwerte (Klick-Analytics) vor Ablösung prüfen.
- **\[EXPLIZIT\] PUB-05:** Tendenz zu LibreOffice/ODF als Export-Engine; Format-Details offen. *(Querbezug: Features; bestätigt durch OP 8)*
- **\[EXPLIZIT\] PUB-06:** Kanäle entstehen sukzessive bei Bedarf. *(Querbezug: Features; bestätigt durch OP 9)*
- **\[IMPLIZIT 🔴\] PUB-10:** Idempotenz-Contract auf alle Channels generalisierbar. *(Querbezug: Features; differenziert durch OP 12)*
- **\[EXPLIZIT\] SCH-01:** Scheduler wird beibehalten und vermutlich ausgebaut. *(Querbezug: Features)*
- **\[EXPLIZIT\] SCH-02:** Konkreter Ausbaubedarf nicht spezifiziert.
- **\[EXPLIZIT\] SCH-03:** Scheduler-Horizont widersprüchlich (8 vs. 12 Wochen). *(bestätigt durch OP 4)*
- **\[IMPLIZIT 🟡\] SCH-04:** Feste TZ `Europe/Berlin` reicht im Single-Mandanten-Fall, ggf. Mehr-Zeitzonen-Bedarf. *(Querbezug: Mandantenfähigkeit)*
- **\[IMPLIZIT 🟢\] SCH-05:** Scheduler-Zuverlässigkeitsmechanismen bleiben im neuen Modell gültig.
- **\[IMPLIZIT 🟢\] ARCH-08:** Querschnitts-Invarianten sinngemäß auf DB-Persistenz übertragbar. *(Dominant Architektur, hier Betriebs-Querbezug)*

#### Offene Punkte

- **\[ENTSCHIEDEN\] OP 4 – Scheduler-Horizont:** 12 Wochen.
- **\[ENTSCHIEDEN\] OP 8 – Dokument-Export-Engine:** ODF/LibreOffice als interner Standard; Markdown→ODF→Word/PDF via headless LibreOffice als eigener Container-Service; Branding via ODT-Vorlage pro Mandant; Word akzeptiert (intern → ODT); Export als Teil des Channel-Interface. *(Querbezug: Features, Mandantenfähigkeit, Architektur)*
- **\[ENTSCHIEDEN\] OP 12 – Idempotenz-Contract:** nicht vereinheitlichen, sondern als optionale Capability je Channel-Klasse modellieren (`none`/`upsert`/`publish-queue`/`send-once`). *(Querbezug: Architektur, Features)*
- **\[ENTSCHIEDEN\] OP 13 → siehe Generalisierung:** Modell-ID-Abweichung irrelevant.
- **\[WIRD NICHT GEMACHT\] OP 15 – Performance-/Skalierungs-Zielwerte:** nicht definiert.
- **\[WIRD NICHT GEMACHT\] OP 19 – Monitoring-/Logging-/Backup-Konzept:** nicht spezifiziert.
- **\[WIRD NICHT GEMACHT\] OP 20 – Automatisierte Test-Suite:** nicht vorgesehen.
- **\[ERLEDIGT\] OP 18 – Compliance/DSGVO/Audit:** keine spezifischen Anforderungen.
- **\[ERLEDIGT\] OP 17 – Barrierefreiheit:** irrelevant (Frontend wird nicht vollständig neugebaut). *(Querbezug: Architektur – relativiert ARCH-05)*

#### Negativ-Annahmen (Lücken im Seed)

- **\[IMPLIZIT 🟡\] GAP-01:** Keine expliziten I18N/L10N-Anforderungen. *(Querbezug: Mandantenfähigkeit; vgl. OP 16)*
- **\[IMPLIZIT 🟢\] GAP-02:** Keine Barrierefreiheits-Anforderungen. *(vgl. OP 17)*
- **\[IMPLIZIT 🟡\] GAP-03:** Keine konkreten Compliance-/DSGVO-/Audit-Vorgaben. *(vgl. OP 18)*
- **\[IMPLIZIT 🟢\] GAP-04:** Keine automatisierte Test-Suite. *(vgl. OP 20)*
- **\[IMPLIZIT 🟡\] GAP-05:** Kein Rollensystem (alle Nutzer Admin in B). *(Querbezug: Mandantenfähigkeit; aufgelöst durch OP 14)*
- **\[IMPLIZIT 🟢\] GAP-06:** Keine quantifizierten Performance-/Skalierungs-Zielwerte. *(vgl. OP 15)*
- **\[IMPLIZIT 🟡\] GAP-07:** Keine Datenmigrations-Anforderungen für Storyblok-Bestandsdaten. *(Querbezug: Architektur; aufgelöst durch OP 11)*