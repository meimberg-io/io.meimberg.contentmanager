---
requirementsId: reqspec-2026-06-29-smarteditor
titel: SmartEditor — Produktisierung (Transformation zu mandantenfähigem SaaS)
provider: linear
team: SMEDIT
epicMapping: project
hinweis: >
  Ableitung aus 01_Ticketübersicht.md nach Einarbeitung von 00_Korrekturen_und_Entscheidungen.md.
  Bereits entschiedene Punkte (ADAPT-10, PROC-02, FEAT-04, OPS-05, OPS-06) sind NICHT enthalten.
  H2 = Epic (→ Linear-Projekt), H3 = Ticket (→ Linear-Issue). Status "neu".
---

# SmartEditor — Produktisierung

Transformation des bestehenden SmartEditors (Storyblok, single-tenant) in ein mandantenfähiges SaaS-Produkt: Primärpersistenz auf Supabase, dreistufiges Kernmodell Story → Rendition → Channel, Adapter-Architektur, Pooled-DB-Mandantenfähigkeit mit RLS, vereinheitlichte Auth. Frontend wird inkrementell weiterentwickelt (kein Neubau).

## EPIC ARCH — Architektur & Persistenz-Fundament

Persistenzumzug von Storyblok auf Supabase bei Bewahrung des bewährten Schnittmusters (dünne Routen, Logik in src/lib/**, I/O isoliert).

### ARCH-01 — I/O-Isolation verifizieren
Als Architekt möchte ich die I/O-Isolation der Bestandslogik verifizieren, um den Persistenzumzug risikoarm auf den I/O-Austausch zu beschränken.

### ARCH-02 — Lese-Persistenz auf Supabase umstellen
Als Entwickler möchte ich `storyblok.ts` (read) gegen einen Supabase-Client austauschen, um die Lese-Primärpersistenz auf PostgreSQL umzustellen.

### ARCH-03 — Schreib-Persistenz auf Supabase umstellen
Als Entwickler möchte ich `storyblok-management.ts` (write) gegen den Supabase-Client austauschen, um die Schreib-Primärpersistenz auf PostgreSQL umzustellen. Kritischer Pfad, Wurzel für GEN-01, MAND-01, CONF-01, PROC-03.

### ARCH-04 — Routen-Schnittstelle stabil halten
Als Entwickler möchte ich die Routen-Schnittstelle bei Persistenzumzug stabil halten, um Fachlogik und Frontend unverändert zu lassen.

### ARCH-05 — Storyblok-Backoff/Config-Cache zurückbauen
Als Entwickler möchte ich die Storyblok-spezifischen Backoff-/Rate-Limit- und Config-Cache-Mechanismen zurückbauen, um sie auf DB-Persistenz zu überführen bzw. zu entfernen.

### ARCH-06 — Supabase-Storage-Bucket assets einrichten
Als Entwickler möchte ich den Supabase-Storage-Bucket `assets` (Pfadschema `posts/{ts}-{name}`) einrichten, um die Asset-Persistenz auf Supabase umzustellen.

### ARCH-07 — Bestandsdatenmigration A → Supabase (Skript)
Als DevOps möchte ich ein Skript zur initialen Bestandsdatenmigration (A → Supabase) bereitstellen, um Altdaten einmalig außerhalb der App zu übernehmen. (Migration ist kein Teil der laufenden App.)

## EPIC MAND — Mandantenfähigkeit & Auth

Durchgängige Mandantentrennung via Pooled DB + RLS sowie vereinheitlichte Authentifizierung (Google + Microsoft 365 + E-Mail/Passwort).

### MAND-01 — org_id auf allen Entitäten verankern
Als Architekt möchte ich `org_id` auf jeder mandantengebundenen Entität (Story/Rendition/Channel/Settings/Assets) verankern, um keine mandantenlose relevante Tabelle zuzulassen.

### MAND-02 — RLS um org_id-Dimension erweitern
Als Entwickler möchte ich die RLS-Policies aus Version B um die `org_id`-Dimension erweitern, um Mandantenisolation auf DB-Ebene durchzusetzen. Hoher Security-Impact (ein RLS-Fehler exponiert fremde Inhalte).

### MAND-03 — Organisation/Workspace + Memberships/Rollen modellieren
Als Architekt möchte ich Organisation/Workspace als Tenant mit Memberships und Rollen (Admin/Redakteur) modellieren, um Nutzer Mandanten zuzuordnen. Das Org-Modell trägt bereits ein Plan-Feld (Vorbereitung für späteres Billing).

### MAND-04 — Login per Google + Microsoft 365
Als Nutzer möchte ich mich per Google-OAuth und Microsoft 365/Azure AD anmelden, um beide Bestands-Auth-Provider in einem NextAuth-Pfad zu vereinen.

### MAND-05 — Login per E-Mail/Passwort
Als Nutzer möchte ich mich per E-Mail/Passwort anmelden, um ohne OAuth zugreifen zu können (mit sicherem Hashing und Brute-Force-Schutz).

### MAND-06 — Mandanten-/Rollenkontext an RLS liefern
Als Entwickler möchte ich den Mandanten-/Rollenkontext aus der Auth-Komponente an die RLS-Pfade liefern, um Zugriffe mandanten- und rollengebunden aufzulösen. Setzt MAND-02, MAND-04 und MAND-05 voraus.

### MAND-07 — User-/Rollenverwaltung (Admin)
Als Admin möchte ich User und Rollen meiner Organisation verwalten, um Mitgliedschaften eigenständig zu pflegen.

## EPIC GEN — Generalisierung Kernmodell

Ablösung der festen Typenstruktur (Blog/Article/LinkedIn) durch das dreistufige Modell Story → Rendition → Channel.

### GEN-00 — Design-Spike Datenmodell-Tragfähigkeit
Als Architekt möchte ich in einem Design-Spike die Tragfähigkeit des Datenmodells für Story→Rendition→Channel klären (eigenständige, einzeln publizierbare, statusführende Rendition statt bloßem JSONB-Key-Set), bevor GEN-02 implementiert wird. Vorgezogenes Risiko ARCH-07 (🔴). Ergebnis kann den Datenmodell-Schnitt noch korrigieren.

### GEN-01 — Story-Entität modellieren
Als Architekt möchte ich die Story-Entität (Post mit Seed) modellieren, um die generalisierte Quelle aller Inhalte abzubilden.

### GEN-02 — Rendition-Entität modellieren
Als Architekt möchte ich die Rendition-Entität auf Basis des `content_formats`-Prinzips modellieren, um n parallele, eigenständig editier-/publizierbare Dokumente zu erzeugen. Setzt GEN-00 (Spike) und GEN-01 voraus.

### GEN-03 — Channel-Ebene eigenständig modellieren
Als Architekt möchte ich die Channel-Ebene eigenständig modellieren, da sie in Version B noch nicht vorhanden ist.

### GEN-04 — Feste Kopplung und deprecated body entfernen
Als Entwickler möchte ich die feste LinkedIn↔Blog-Kopplung (`cm_blog_ref`) und das deprecated `body`-JSONB entfernen, um sie durch eigenständige Renditions abzulösen.

### GEN-05 — Statusführung auf Rendition-Granularität
Als Entwickler möchte ich die Statusführung von Post- auf Rendition-Granularität umstellen (`content_complete` + `confirmed_at`, Publish-/Channel-/Publer-State), um parallele Publikationen getrennt zu reifen.

### GEN-06 — Mehr-Pipeline-Statusmodell generalisieren
Als Entwickler möchte ich das 2-Pipeline-Statusmodell zu einem generalisierten Mehr-Pipeline-Modell (Content-Reife + Publish-/Schedule-Status inkl. „scheduled" je Channel) überführen, um beliebige Channels abzubilden.

### GEN-07 — Asset-Entität mit n:m-Zuordnung
Als Entwickler möchte ich die Bild-Pipeline auf eine Asset-Entität mit n:m-Zuordnung zwischen Renditions generalisieren, um teilbare Bilder zu ermöglichen.

### GEN-08 — Story trägt n Seeds
Als Architekt möchte ich eine Story n Seeds tragen lassen, um die entschiedene Kardinalität Post↔Seed (mehrere) festzuschreiben.

## EPIC ADAPT — Adapter-Architektur & Channels

Einheitliches Channel-Interface und konkrete Adapter für das erste Release (Storyblok, LinkedIn nativ, Download).

### ADAPT-00 — Design-Spike Channel-Interface-Entwurf
Als Architekt möchte ich in einem Design-Spike das Channel-Interface entwerfen und gegen die heterogenen Erst-Ziele (Storyblok/CMS, LinkedIn/Push, Download/Datei) validieren, bevor darauf aufgebaut wird. Vorgezogenes Risiko ARCH-09 (🔴); speist ADAPT-01.

### ADAPT-01 — Channel-Interface spezifizieren
Als Architekt möchte ich das Channel-Interface spezifizieren (`generate-target-payload`, `publish`, `schedule`, `export`, `dispatch-email`), um ein einheitliches Erweiterungsmodell festzulegen.

### ADAPT-02 — Channel-Adapter-Registry extrahieren
Als Entwickler möchte ich die Channel-Adapter-Registry als zentralen Erweiterungspunkt extrahieren, um neue Kanäle ohne Kerneingriff anbindbar zu machen.

### ADAPT-03 — Idempotenz als Capability je Channel-Klasse
Als Architekt möchte ich Idempotenz als optionale Capability je Channel-Klasse (`none`/`upsert`/`publish-queue`/`send-once`) modellieren, um Heterogenität ohne erzwungene State-Semantik abzubilden.

### ADAPT-04 — Storyblok-Publishing-Adapter
Als Entwickler möchte ich den Storyblok-Publishing-Adapter unter der Adapter-Architektur bereitstellen, um Storyblok vom Primärspeicher zum Channel zu degradieren.

### ADAPT-05 — Storyblok-SDKs in den Adapter zurückbauen
Als Entwickler möchte ich die Storyblok-SDKs aus dem Kern in den Storyblok-Adapter zurückbauen, um die Persistenzrolle der SDKs zu entfernen.

### ADAPT-06 — Nativer LinkedIn-Adapter
Als Entwickler möchte ich einen nativen LinkedIn-Adapter bauen, um LinkedIn als eigenständige Rendition unter vielen anzubinden (Entscheidung: nativ + Publer parallel).

### ADAPT-07 — Publer-Mehrwert prüfen
Als PO möchte ich die Publer-Mehrwerte (z. B. Klick-Analytics) prüfen, um den parallelen Publer-Adapter begründet zu erhalten.

### ADAPT-08 — Publer-Adapter parallel erhalten
Als Entwickler möchte ich den Publer-Adapter als parallelen Adapter erhalten, um optionale Publer-Mehrwerte weiter nutzbar zu halten.

### ADAPT-09 — Breiteres Publer-Kanalset aktivieren
Als Entwickler möchte ich das breitere Publer-Kanalset (Instagram, Facebook, Pinterest, X, Threads) sukzessive aktivieren, um zusätzliche Live-Kanäle bereitzustellen. (Nach dem ersten Release.)

## EPIC EXP — Dokument-Export & Versand

Einheitlicher Markdown→ODF→Word/PDF-Export über headless LibreOffice und Versand-Adapter.

### EXP-01 — Headless LibreOffice-Container-Service
Als DevOps möchte ich einen headless LibreOffice-Container-Service betreiben, um Markdown→ODF→Word/PDF zu konvertieren.

### EXP-02 — export-Methode ins Channel-Interface
Als Entwickler möchte ich den Export als `export`-Methode in das Channel-Interface integrieren, um Download-Channels einheitlich anzubinden.

### EXP-03 — Download md/docx/odt/pdf
Als Redakteur möchte ich Renditions als md/docx/odt/pdf herunterladen, um Inhalte in den gewünschten Formaten zu beziehen.

### EXP-04 — Optionaler E-Mail-Versand beim Publishen
Als Mandant möchte ich beim Publishen optional einen automatischen E-Mail-Versand des erzeugten Dokuments auslösen, um den Versandbedarf abzudecken.

## EPIC FEAT — Editor, KI & Content-Features

Multi-Format-Editor (inkrementeller Umbau des bestehenden Frontends), generalisierte KI-Generierung, kanonisches Feldformat.

### FEAT-01 — Editor inkrementell zu Multi-Format-Tabs umbauen
Als Redakteur möchte ich pro Rendition einen eigenen Editor-Tab mit Generate/Optimize/Copy erhalten, um Multi-Format-Inhalte ergonomisch zu bearbeiten. Umbau des bestehenden Editors (Frontend inkrementell, kein Neubau).

### FEAT-02 — Markdown als kanonisches Feldformat
Als Entwickler möchte ich Markdown als kanonisches Feldformat (plus reiner Text, mit Code-Sections und Tabellen) durchsetzen, um Format-Wildwuchs zu verhindern. Bestehendes Block-Modell (Storyblok-Mapping) bleibt erhalten.

### FEAT-03 — Geheimen System-Prompt führen und schützen
Als Architekt möchte ich den geheimen Redakteurs-/System-Prompt über allen Format-Prompts führen und niemals in Frontend/API/Logs offenlegen, um den zentralen Produktwert zu schützen. Geltungsbereich entschieden: mandantenübergreifend einheitlich.

### FEAT-05 — KI-Generierung auf Rendition/Format übertragen
Als Entwickler möchte ich die KI-Generierung auf das Rendition-/Format-Modell übertragen, um Inhalte je Format zu generieren.

### FEAT-06 — Bild zwischen Renditions teilen
Als Redakteur möchte ich ein generiertes Bild von mehreren Renditions gemeinsam nutzen, um Bilder selektiv (z. B. LinkedIn+Blog, WhatsApp nicht) zu teilen.

## EPIC CONF — Mandantenkonfiguration

Deklarativ, per UI und org_id-isoliert konfigurierbare Mandanten-Features.

### CONF-01 — settings-Tabelle (mandantengebunden)
Als Entwickler möchte ich Settings in eine mandantengebundene Supabase-`settings`-Tabelle (Default-Modell, Prompts, Notes, Labels, Schedules, MCP-Tokens) überführen, um mandantenisolierte Konfiguration zu ermöglichen.

### CONF-02 — Publikationsformate per UI verwalten
Als Admin möchte ich eine frei definierbare Liste an Publikationsformaten (Länge/Tonalität/Struktur/Prompt) per UI verwalten, um meinen individuellen Formatbedarf abzubilden.

### CONF-03 — Startset an Formaten bereitstellen
Als PO möchte ich das Startset an Formaten (Blog short/long, Article, Rundschreiben, Pressemeldung, LinkedIn, WhatsApp, Presse-Varianten) bereitstellen, um vordefinierte Formate anzubieten.

### CONF-04 — Channels per UI anlegen/konfigurieren
Als Admin möchte ich Channels (Prompts/Methoden pro Channel) per UI anlegen und konfigurieren, um mein Kanal-Set ohne Kerneingriff zu erweitern.

### CONF-05 — Pro-Format-Prompt hinterlegen
Als Admin möchte ich je Publikationsformat einen eigenen Prompt (Länge/Tonalität/Struktur) hinterlegen, um den Format-Output kundenspezifisch zu steuern. Liegt unterhalb des geheimen System-Prompts.

### CONF-06 — ODT-Branding-Vorlage hochladen
Als Admin möchte ich eine ODT-Branding-Vorlage hochladen, um kundenspezifisches Branding im Export-Pfad zu berücksichtigen.

### CONF-07 — Modell-Registry/Prompts zur Laufzeit editieren
Als Admin möchte ich die Modell-Registry und Prompts (global + pro Format) zur Laufzeit editieren, um provider-agnostisch auf driftende Modell-IDs zu reagieren.

## EPIC PROC — Erhaltene Prozessfeatures

Bewährte Bestandslogik (Scheduler, Intake, MCP) auf neues Modell und neue Persistenz übertragen.

### PROC-01 — Scheduler auf Rendition-Modell übertragen
Als Entwickler möchte ich den Headless-Scheduler (`POST /api/cron/tick`, Bearer `CRON_SECRET`, Retry-Cap 3, Orphan-Handling, Idempotenz, verpasste Slots) auf das Rendition-Modell übertragen, um die Scheduling-Logik zu erhalten. Horizont fix: 12 Wochen.

### PROC-03 — Intake (MS Graph) auf neue Persistenz umstellen
Als Entwickler möchte ich den Intake (MS Graph) nur auf die neue Persistenz-I/O umstellen, um die Intake-Logik unverändert zu erhalten.

### PROC-04 — MCP-Server generalisieren
Als Entwickler möchte ich den MCP-Server vom festen Blog/LinkedIn-Schema auf das generische Story-/Rendition-Modell verallgemeinern, um Automatisierung auf dem neuen Modell zu ermöglichen.

### PROC-05 — Mehr-Zeitzonen-Bedarf bewusst zurückstellen
Als PO möchte ich festhalten, dass der Scheduler zunächst fest auf `Europe/Berlin` bleibt und Mehr-Zeitzonen-Betrieb bewusst nicht umgesetzt wird, um den Bedarf nachvollziehbar zurückzustellen.

## EPIC OPS — Betriebsmodell & Deployment

Versioniertes, self-hosted SaaS-Deployment auf dem Pooled-DB-Stack.

### OPS-01 — Self-hosted-Supabase-Stack bereitstellen
Als DevOps möchte ich den Self-hosted-Supabase-Stack (PostgreSQL, Auth, Storage, Kong, Traefik, App-Container, Export-Service) bereitstellen, um das Deployment-Fundament zu betreiben.

### OPS-02 — GitLab-CI/CD-Pipeline einrichten
Als DevOps möchte ich die GitLab-CI/CD-Pipeline einrichten, um Container-Images zu bauen und in die Ziel-Topologie auszurollen.

### OPS-03 — Versionierte Releases etablieren
Als PO möchte ich versionierte, nachvollziehbare Releases auf genau einem Releasestrang etablieren, um Hot-Fixing durch eine eindeutige Versionierung je Auslieferung abzulösen.

### OPS-04 — Monitoring/Logging/Backup-Konzept
Als PO möchte ich ein Monitoring-/Logging-/Backup-Konzept für die geteilte DB definieren, um das getragene Restrisiko zu adressieren — inkl. Logging-Verbot des geheimen System-Prompts.

## EPIC BILL — Billing & Subscription (Platzhalter)

Vorgemerkt: erstes Release ohne Self-Serve-Billing; Org/Plan-Struktur wird vorbereitet, Zahlung/Plan-Gating folgt später. Zugänge zunächst manuell/über Admin.

### BILL-00 — Billing/Subscription für späteres Release vormerken
Als PO möchte ich Subscription/Plan-Gating/Zahlung (z. B. Stripe) als eigenes Epic für ein späteres Release vormerken, um die SaaS-Verkaufsmechanik nicht zu vergessen. Noch nicht spezifiziert; org-Modell trägt bereits ein Plan-Feld.
