
### EPIC ARCH — Architektur & Persistenz-Fundament

*Ziel: Persistenzumzug von Storyblok auf Supabase und Bewahrung des bewährten Schnittmusters.*

- **ARCH-01** — Als Architekt möchte ich die I/O-Isolation der Bestandslogik verifizieren, um den Persistenzumzug risikoarm auf den I/O-Austausch zu beschränken. *(Annahme ARCH-01/ARCH-08)*
- **ARCH-02** — Als Entwickler möchte ich `storyblok.ts` (read) gegen einen Supabase-Client austauschen, um die Lese-Primärpersistenz auf PostgreSQL umzustellen.
- **ARCH-03** — Als Entwickler möchte ich `storyblok-management.ts` (write) gegen den Supabase-Client austauschen, um die Schreib-Primärpersistenz auf PostgreSQL umzustellen.
- **ARCH-04** — Als Entwickler möchte ich die Routen-Schnittstelle bei Persistenzumzug stabil halten, um Fachlogik und Frontend unverändert zu lassen.
- **ARCH-05** — Als Entwickler möchte ich die Storyblok-spezifischen Backoff-/Rate-Limit- und Config-Cache-Mechanismen zurückbauen, um sie auf DB-Persistenz zu überführen bzw. zu entfernen. *(GAP ARCH-08)*
- **ARCH-06** — Als Entwickler möchte ich den Supabase-Storage-Bucket `assets` (Pfadschema `posts/{ts}-{name}`) einrichten, um Asset-Persistenz auf Supabase umzustellen.
- **ARCH-07** — Als DevOps möchte ich ein Skript zur initialen Bestandsdatenmigration (A → Supabase) bereitstellen, um Altdaten einmalig außerhalb der App zu übernehmen. *(GAP OP 11)*

### EPIC MAND — Mandantenfähigkeit & Auth

*Ziel: Durchgängige Mandantentrennung via Pooled DB + RLS sowie vereinheitlichte Authentifizierung.*

- **MAND-01** — Als Architekt möchte ich `org_id` auf jeder mandantengebundenen Entität (Story/Rendition/Channel/Settings/Assets) verankern, um keine mandantenlose relevante Tabelle zuzulassen.
- **MAND-02** — Als Entwickler möchte ich die RLS-Policies aus Version B um die `org_id`-Dimension erweitern, um Mandantenisolation auf DB-Ebene durchzusetzen. *(GAP OPS-03, 🔴)*
- **MAND-03** — Als Architekt möchte ich Organisation/Workspace als Tenant mit Memberships und Rollen (Admin/Redakteur) modellieren, um Nutzer Mandanten zuzuordnen. *(GAP OP 14)*
- **MAND-04** — Als Nutzer möchte ich mich per Google-OAuth und Microsoft 365/Azure AD anmelden, um beide Bestands-Auth-Provider in einem NextAuth-Pfad zu vereinen.
- **MAND-05** — Als Nutzer möchte ich mich per E-Mail/Passwort anmelden, um ohne OAuth zugreifen zu können (mit sicherem Hashing und Brute-Force-Schutz). *(GAP OPS-08)*
- **MAND-06** — Als Entwickler möchte ich den Mandanten-/Rollenkontext aus der Auth-Komponente an die RLS-Pfade liefern, um Zugriffe mandanten- und rollengebunden aufzulösen.
- **MAND-07** — Als Admin möchte ich User und Rollen meiner Organisation verwalten, um Mitgliedschaften eigenständig zu pflegen.

### EPIC GEN — Generalisierung Kernmodell

*Ziel: Ablösung der festen Typenstruktur durch das dreistufige Modell Story → Rendition → Channel.*

- **GEN-00** — Als Architekt möchte ich in einem **Design-Spike** die Tragfähigkeit des Datenmodells für Story→Rendition→Channel klären (eigenständige, einzeln publizierbare, statusführende Rendition statt bloßem JSONB-Key-Set), **bevor** GEN-02 implementiert wird. *(vorgezogenes Risiko ARCH-07, 🔴 — siehe 00_Korrekturen K3)*
- **GEN-01** — Als Architekt möchte ich die Story-Entität (Post mit Seed) modellieren, um die generalisierte Quelle aller Inhalte abzubilden.
- **GEN-02** — Als Architekt möchte ich die Rendition-Entität auf Basis des `content_formats`-Prinzips modellieren, um n parallele, eigenständig editier-/publizierbare Dokumente zu erzeugen.
- **GEN-03** — Als Architekt möchte ich die Channel-Ebene eigenständig modellieren, da sie in Version B noch nicht vorhanden ist.
- **GEN-04** — Als Entwickler möchte ich die feste LinkedIn↔Blog-Kopplung (`cm_blog_ref`) und das deprecated `body`-JSONB entfernen, um sie durch eigenständige Renditions abzulösen.
- **GEN-05** — Als Entwickler möchte ich die Statusführung von Post- auf Rendition-Granularität umstellen (`content_complete` + `confirmed_at`, Publish-/Channel-/Publer-State), um parallele Publikationen getrennt zu reifen. *(GAP DATA-06)*
- **GEN-06** — Als Entwickler möchte ich das 2-Pipeline-Statusmodell zu einem generalisierten Mehr-Pipeline-Modell (Content-Reife + Publish-/Schedule-Status inkl. „scheduled" je Channel) überführen, um beliebige Channels abzubilden.
- **GEN-07** — Als Entwickler möchte ich die Bild-Pipeline auf eine Asset-Entität mit n:m-Zuordnung zwischen Renditions generalisieren, um teilbare Bilder zu ermöglichen. *(GAP DATA-07)*
- **GEN-08** — Als Architekt möchte ich eine Story n Seeds tragen lassen, um die entschiedene Kardinalität Post↔Seed festzuschreiben. *(GAP OP 3)*

### EPIC ADAPT — Adapter-Architektur & Channels

*Ziel: Einheitliches Channel-Interface und konkrete Adapter für das erste Release.*

- **ADAPT-00** — Als Architekt möchte ich in einem **Design-Spike** das Channel-Interface entwerfen und gegen die heterogenen Erst-Ziele (Storyblok/CMS, LinkedIn/Push, Download/Datei) validieren, **bevor** darauf aufgebaut wird. *(vorgezogenes Risiko ARCH-09, 🔴; löst die Vertagung von OP 10 auf — siehe 00_Korrekturen K3; speist ADAPT-01)*
- **ADAPT-01** — Als Architekt möchte ich das Channel-Interface spezifizieren (`generate-target-payload`, `publish`, `schedule`, `export`, `dispatch-email`), um ein einheitliches Erweiterungsmodell festzulegen. *(GAP ARCH-09/OP 10, 🔴)*
- **ADAPT-02** — Als Entwickler möchte ich die Channel-Adapter-Registry als zentralen Erweiterungspunkt extrahieren, um neue Kanäle ohne Kerneingriff anbindbar zu machen.
- **ADAPT-03** — Als Architekt möchte ich Idempotenz als optionale Capability je Channel-Klasse (`none`/`upsert`/`publish-queue`/`send-once`) modellieren, um Heterogenität ohne erzwungene State-Semantik abzubilden. *(GAP OP 12)*
- **ADAPT-04** — Als Entwickler möchte ich den Storyblok-Publishing-Adapter unter der Adapter-Architektur bereitstellen, um Storyblok vom Primärspeicher zum Channel zu degradieren.
- **ADAPT-05** — Als Entwickler möchte ich die Storyblok-SDKs aus dem Kern in den Storyblok-Adapter zurückbauen, um die Persistenzrolle der SDKs zu entfernen.
- **ADAPT-06** — Als Entwickler möchte ich einen nativen LinkedIn-Adapter bauen, um LinkedIn als eigenständige Rendition unter vielen anzubinden. *(GAP OP 6)*
- **ADAPT-07** — Als PO möchte ich die Publer-Mehrwerte (z. B. Klick-Analytics) vor Ablösung prüfen, um den parallelen Publer-Adapter begründet zu erhalten. *(GAP PUB-03/§15.4)*
- **ADAPT-08** — Als Entwickler möchte ich den Publer-Adapter als parallelen Adapter erhalten, um optionale Publer-Mehrwerte weiter nutzbar zu halten.
- **ADAPT-09** — Als Entwickler möchte ich das breitere Publer-Kanalset (Instagram, Facebook, Pinterest, X, Threads) sukzessive aktivieren, um zusätzliche Live-Kanäle bereitzustellen.
- **ADAPT-10** — ~~LinkedIn-Anbindungsstrategie entscheiden~~ **ENTSCHIEDEN: nativer LinkedIn-Adapter + Publer als zusätzlicher Adapter** (siehe ADAPT-06/08); kein offenes Ticket mehr. *(siehe 00_Korrekturen K4)*

### EPIC EXP — Dokument-Export & Versand

*Ziel: Einheitlicher Markdown→ODF→Word/PDF-Export und Versand-Adapter.*

- **EXP-01** — Als DevOps möchte ich einen headless LibreOffice-Container-Service betreiben, um Markdown→ODF→Word/PDF zu konvertieren. *(Annahme PUB-09, 🟡)*
- **EXP-02** — Als Entwickler möchte ich den Export als `export`-Methode in das Channel-Interface integrieren, um Download-Channels einheitlich anzubinden.
- **EXP-03** — Als Redakteur möchte ich Renditions als md/docx/odt/pdf herunterladen, um Inhalte in den gewünschten Formaten zu beziehen.
- **EXP-04** — Als Mandant möchte ich beim Publishen optional einen automatischen E-Mail-Versand des erzeugten Dokuments auslösen, um den Versandbedarf abzudecken.

### EPIC FEAT — Editor, KI & Content-Features

*Ziel: Multi-Format-Editor, generalisierte KI-Generierung und kanonisches Feldformat.*
*Hinweis: Frontend wird **inkrementell** umgebaut, nicht neu gebaut (siehe 00_Korrekturen K1).*

- **FEAT-01** — Als Redakteur möchte ich pro Rendition einen eigenen Editor-Tab mit Generate/Optimize/Copy erhalten, um Multi-Format-Inhalte ergonomisch zu bearbeiten. *(Umbau des **bestehenden** Editors, kein Neubau — Frontend inkrementell, siehe 00_Korrekturen K1)*
- **FEAT-02** — Als Entwickler möchte ich Markdown als kanonisches Feldformat (plus reiner Text, mit Code-Sections und Tabellen) durchsetzen, um Format-Wildwuchs zu verhindern. *(GAP OP 7/§15.6)*
- **FEAT-03** — Als Architekt möchte ich den geheimen Redakteurs-/System-Prompt über allen Format-Prompts führen und niemals in Frontend/API/Logs offenlegen, um den zentralen Produktwert zu schützen.
- **FEAT-04** — ~~Geltungsbereich des geheimen System-Prompts festlegen~~ **ENTSCHIEDEN: mandantenübergreifend einheitlich** (kein org-Bezug); kein offenes Ticket mehr. *(siehe 00_Korrekturen K4)*
- **FEAT-05** — Als Entwickler möchte ich die KI-Generierung auf das Rendition-/Format-Modell übertragen, um Inhalte je Format zu generieren.
- **FEAT-06** — Als Redakteur möchte ich ein generiertes Bild von mehreren Renditions gemeinsam nutzen, um Bilder selektiv (z. B. LinkedIn+Blog, WhatsApp nicht) zu teilen.

### EPIC CONF — Mandantenkonfiguration

*Ziel: Deklarativ, per UI und org_id-isoliert konfigurierbare Mandanten-Features.*

- **CONF-01** — Als Entwickler möchte ich Settings in eine mandantengebundene Supabase-`settings`-Tabelle (Default-Modell, Prompts, Notes, Labels, Schedules, MCP-Tokens) überführen, um mandantenisolierte Konfiguration zu ermöglichen.
- **CONF-02** — Als Admin möchte ich eine frei definierbare Liste an Publikationsformaten (Länge/Tonalität/Struktur/Prompt) per UI verwalten, um meinen individuellen Formatbedarf abzubilden. *(GAP OP 5; Annahme KI-05, 🟡)*
- **CONF-03** — Als PO möchte ich das Startset an Formaten (Blog short/long, Article, Rundschreiben, Pressemeldung, LinkedIn, WhatsApp, Presse-Varianten) bereitstellen, um vordefinierte Formate anzubieten.
- **CONF-04** — Als Admin möchte ich Channels (Prompts/Methoden pro Channel) per UI anlegen und konfigurieren, um mein Kanal-Set ohne Kerneingriff zu erweitern. *(GAP OP 5/§15.3, OPS-06)*
- **CONF-05** — Als Admin möchte ich je Publikationsformat einen eigenen Prompt (Länge/Tonalität/Struktur) hinterlegen, um den Format-Output kundenspezifisch zu steuern.
- **CONF-06** — Als Admin möchte ich eine ODT-Branding-Vorlage hochladen, um kundenspezifisches Branding im Export-Pfad zu berücksichtigen. *(GAP OP 8/§15.7, PUB-07)*
- **CONF-07** — Als Admin möchte ich die Modell-Registry und Prompts (global + pro Format) zur Laufzeit editieren, um provider-agnostisch auf driftende Modell-IDs zu reagieren. *(GAP KI-03/KI-04/OP 13)*

### EPIC PROC — Erhaltene Prozessfeatures

*Ziel: Bewährte Bestandslogik (Scheduler, Intake, MCP) auf neues Modell und neue Persistenz übertragen.*

- **PROC-01** — Als Entwickler möchte ich den Headless-Scheduler (`POST /api/cron/tick`, Bearer `CRON_SECRET`, Retry-Cap 3, Orphan-Handling, Idempotenz, verpasste Slots) auf das Rendition-Modell übertragen, um die Scheduling-Logik zu erhalten.
- **PROC-02** — ~~Scheduler-Horizont fixieren~~ **ENTSCHIEDEN: 12 Wochen** (Diskrepanz aufgelöst); fließt als Vorgabe in PROC-01, kein eigenes Entscheidungs-Ticket. *(siehe 00_Korrekturen K4)*
- **PROC-03** — Als Entwickler möchte ich den Intake (MS Graph) nur auf die neue Persistenz-I/O umstellen, um die Intake-Logik unverändert zu erhalten.
- **PROC-04** — Als Entwickler möchte ich den MCP-Server vom festen Blog/LinkedIn-Schema auf das generische Story-/Rendition-Modell verallgemeinern, um Automatisierung auf dem neuen Modell zu ermöglichen.
- **PROC-05** — Als PO möchte ich über künftigen Mehr-Zeitzonen-Bedarf des Schedulers (heute fest `Europe/Berlin`) entscheiden, um den Bedarf bewusst zunächst nicht umzusetzen. *(GAP OP 16/SCH-04)*

### EPIC OPS — Betriebsmodell & Deployment

*Ziel: Versioniertes, self-hosted SaaS-Deployment auf dem Pooled-DB-Stack.*

- **OPS-01** — Als DevOps möchte ich den Self-hosted-Supabase-Stack (PostgreSQL, Auth, Storage, Kong, Traefik, App-Container, Export-Service) bereitstellen, um das Deployment-Fundament zu betreiben.
- **OPS-02** — Als DevOps möchte ich die GitLab-CI/CD-Pipeline einrichten, um Container-Images zu bauen und in die Ziel-Topologie auszurollen.
- **OPS-03** — Als PO möchte ich versionierte, nachvollziehbare Releases auf genau einem Releasestrang etablieren, um Hot-Fixing durch eine eindeutige Versionierung je Auslieferung abzulösen.
- **OPS-04** — Als PO möchte ich ein Monitoring-/Logging-/Backup-Konzept für die geteilte DB definieren, um das getragene Restrisiko zu adressieren (inkl. Logging-Verbot des geheimen System-Prompts). *(GAP OP 19)*
- **OPS-05** — ~~Performance-/Skalierungs-Zielwerte festlegen~~ **WON'T-DO (bewusst):** keine Zielwerte gesetzt, getragenes Restrisiko. Kein Umsetzungs-Ticket. *(siehe 00_Korrekturen K4)*
- **OPS-06** — ~~Compliance-/DSGVO-/Audit-Anforderungen festlegen~~ **WON'T-DO (bewusst):** keine spezifischen Anforderungen. Kein Umsetzungs-Ticket. *(siehe 00_Korrekturen K4)*

### EPIC BILL — Billing & Subscription *(Platzhalter, nicht im ersten Release)*

*Ziel: vorgemerkt — erstes Release ohne Self-Serve-Billing; Org/Plan-Struktur wird vorbereitet, Zahlung/Plan-Gating folgt später (siehe 00_Korrekturen K2). Zugänge zunächst manuell/über Admin.*

- **BILL-00** — Als PO möchte ich Subscription/Plan-Gating/Zahlung (z. B. Stripe) als eigenes Epic für ein späteres Release vormerken, um die SaaS-Verkaufsmechanik nicht zu vergessen. *(noch nicht spezifiziert; org-Modell trägt bereits ein Plan-Feld)*