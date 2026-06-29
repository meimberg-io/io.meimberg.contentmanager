### Meilenstein-Übersicht

Die Meilensteine bündeln die Wellen der Umsetzungsreihenfolge zu vier entscheidungsrelevanten Lieferständen. Jeder Meilenstein markiert einen wertstiftenden Produktzustand entlang des kritischen Pfads und der parallelen Mandanten- und Konfigurationsstränge.

| Meilenstein | Kurzbezeichnung | Abgedeckte Wellen | Zwischenziel |
| --- | --- | --- | --- |
| M1 | Mandantenfähiges Grundgerüst | Welle 0–3 | Tragfähige Persistenz, Tenant-Isolation und Kernmodell-Wurzel stehen. |
| M2 | Generalisiertes Kernmodell & Auth | Welle 4–5 | Story→Rendition→Channel ausgebaut, Auth aufgelöst, Settings-Basis steht. |
| M3 | Funktionales Feature-Set | Welle 6–8 | Adapter, KI-Generierung, Export und Editor sind nutzbar. |
| M4 | Betriebsbereite Lösung | Welle 9 | Monitoring/Backup aktiv; Produkt ist releasefähig. |

### M1 — Mandantenfähiges Grundgerüst

#### Zwischenziel

Korrektur des Persistenz-Konstruktionsfehlers und Errichtung der mandantenfähigen Basis: Supabase ist Primärpersistenz, Lese- und Schreibpfade laufen über die DB, die Tenant-Wurzel und RLS-Isolation sind etabliert, die Story-Entität als Wurzel des Kernmodells existiert.

#### Enthaltene Tickets

- **Fundament/Entscheidungen (Welle 0):** OPS-01, ARCH-01, FEAT-02, FEAT-04, ADAPT-07, ADAPT-10, PROC-02, PROC-05, OPS-05, OPS-06, GEN-08
- **Persistenz & Tenant-Wurzel (Welle 1):** ARCH-02, ARCH-03, ARCH-06, MAND-03, OPS-02
- **Konsolidierung & Verankerung (Welle 2):** ARCH-04, ARCH-05, ARCH-07, MAND-01, MAND-04, MAND-05, MAND-07, GEN-01, PROC-03, OPS-03
- **RLS & Modellwurzel (Welle 3):** MAND-02, GEN-02, GEN-08-Impl

#### Erreichter Zustand

- Relationale Primärpersistenz auf Supabase/PostgreSQL; Storyblok hat die Speicherrolle verloren.
- Bestandsdaten sind migriert; Routen-Schnittstelle ist stabil, Backoff/Cache zurückgebaut.
- Mandanten-/Workspace-Struktur mit `org_id`-Verankerung und lückenloser Row-Level-Security.
- Auth-Pfade (Google + Microsoft 365 + E-Mail/Passwort) und User-/Rollenverwaltung vorhanden.
- Story- und Rendition-Entität als generalisiertes Kernmodell angelegt; n-Seed-Kardinalität umgesetzt.

#### Nachprüfbare Kriterien

- Lese- und Schreibzugriffe erfolgen ausschließlich gegen Supabase; kein Schreibpfad nutzt Storyblok als Speicher (ARCH-02/03 abgenommen).
- RLS verhindert nachweislich den Zugriff auf fremde `org_id`-Daten — verifiziert durch Cross-Tenant-Zugriffstest (kein fremder Inhalt sichtbar).
- Bestandsdatenmigration vollständig und konsistenzgeprüft (ARCH-07).
- Anmeldung über alle drei Auth-Verfahren funktioniert und führt in den korrekten Mandantenkontext.
- Eine Story kann mit mehreren Seeds und mindestens einer Rendition persistiert und gelesen werden.

### M2 — Generalisiertes Kernmodell & Auth-Auflösung

#### Zwischenziel

Vollständiger Ausbau des Story→Rendition→Channel-Modells inklusive Statusführung, Asset-Modell und Channel-Ebene; Auflösung des kombinierten Mandanten-/Rollenkontexts und Errichtung der mandantenisolierten Settings-Basis als Fundament der Konfigurierbarkeit.

#### Enthaltene Tickets

- **Modell-Ausbau & Settings-Basis (Welle 4):** MAND-06, GEN-03, GEN-04, GEN-05, GEN-07, CONF-01
- **Channel-Interface & Konfig-Ausbau (Welle 5):** ADAPT-01, GEN-06, CONF-02, CONF-06, CONF-07

#### Erreichter Zustand

- Channel-Ebene und Adapter-Interface als einheitlicher Erweiterungspunkt definiert.
- Statusführung pro Rendition sowie generalisiertes Mehr-Pipeline-Statusmodell (Content-Reife + Channel-Status inkl. „scheduled").
- Feste LinkedIn↔Blog-Kopplung und deprecated `body`-JSONB entfernt; Assets als n:m-Entität teilbar.
- Mandanten-/Rollenkontext aufgelöst; `settings`-Tabelle aktiv mit Formaten per UI, ODT-Branding und Modell-Registry.

#### Nachprüfbare Kriterien

- `cm_blog_ref` und `body`-JSONB sind im Schema nicht mehr vorhanden (GEN-04 abgenommen).
- Eine Rendition trägt eigenständige Status (content_complete, confirmed_at, Channel-/Schedule-Status) unabhängig von anderen Renditions.
- Channel-Interface ist spezifiziert und implementierbar (ADAPT-01); ein Channel kann am Modell registriert werden.
- Ein Mandant kann über die UI ein eigenes Publikationsformat anlegen, das `org_id`-isoliert in `settings` persistiert wird.
- Modell-ID und ODT-Branding-Vorlage sind pro Mandant zur Laufzeit setzbar.

### M3 — Funktionales Feature-Set

#### Zwischenziel

Produkt erreicht funktionale Vollständigkeit für das erste Release: Adapter-Registry mit Storyblok-, LinkedIn- und Publer-Adapter, Idempotenz-Capabilities, KI-Generierung auf Rendition-Ebene mit geschütztem System-Prompt, Export-/Versand-Pipeline und integrierender Multi-Format-Editor.

#### Enthaltene Tickets

- **Registry, Capabilities, KI-Basis & Scheduler (Welle 6):** ADAPT-02, ADAPT-03, EXP-01, EXP-02, PROC-04, PROC-01, FEAT-03, CONF-03, CONF-05
- **Adapter, KI-Generierung & Export (Welle 7):** ADAPT-04, ADAPT-06, ADAPT-08, FEAT-05, EXP-03, EXP-04, FEAT-06
- **Folgeschritte, Editor & Channel-Konfig (Welle 8):** ADAPT-05, ADAPT-09, CONF-04, FEAT-01

#### Erreichter Zustand

- Adapter-Registry mit Idempotenz-Capability je Channel-Klasse; Storyblok als reiner Publishing-Adapter (SDK-Rückbau abgeschlossen).
- Nativer LinkedIn-Adapter und Publer-Adapter (inkl. Kanalset) verfügbar.
- KI generiert/optimiert Inhalte pro Rendition unter geschütztem, nie offengelegtem System-Prompt; Pro-Format-Prompts und Startset aktiv.
- Export-Pipeline Markdown→ODF→Word/PDF über headless LibreOffice; Download (md/docx/odt/pdf) und optionaler E-Mail-Versand.
- Scheduler auf Rendition-Ebene mit 12-Wochen-Horizont; MCP generalisiert; Bilder zwischen Renditions teilbar.
- Multi-Format-Tab-Editor mit Generate/Optimize/Copy je Rendition; Channels per UI konfigurierbar.

#### Nachprüfbare Kriterien

- Ein Inhalt kann über mindestens je einen Adapter (Storyblok, LinkedIn, Download) publiziert bzw. exportiert werden.
- Wiederholtes Publizieren verhält sich gemäß deklarierter Idempotenz-Capability (kein Dublettenversand).
- KI-Generierung liefert pro Rendition-Tab Ergebnisse; der System-Prompt erscheint nicht in Frontend, API-Responses oder Logs.
- Markdown-Inhalt wird korrekt nach docx/odt/pdf exportiert und nutzt die mandantenspezifische ODT-Branding-Vorlage.
- Eine geplante Rendition wird vom Scheduler innerhalb des 12-Wochen-Horizonts zum vorgesehenen Zeitpunkt verarbeitet.
- Ein Mandant kann über die UI einen Channel anlegen und einem Format zuordnen.

### M4 — Betriebsbereite Lösung

#### Zwischenziel

Überführung des funktional vollständigen Produkts in den betriebsbereiten Zustand: laufende Komponenten sind überwacht und gesichert, das Logging-Verbot des System-Prompts ist durchgesetzt.

#### Enthaltene Tickets

- **Betriebsabsicherung (Welle 9):** OPS-04

#### Erreichter Zustand

- Monitoring und Backup für den Supabase-Stack und die laufenden Services aktiv.
- Logging respektiert das Geheimhaltungsgebot des System-Prompts (kein Prompt in Logs).
- Produkt ist releasefähig im Geltungsumfang des ersten Release (Channels: Storyblok, LinkedIn nativ, Download; Auth: Google + Microsoft 365 + E-Mail/Passwort; Scheduler-Horizont 12 Wochen).

#### Nachprüfbare Kriterien

- Monitoring erfasst die zentralen Services; Ausfälle/Fehler lösen erkennbare Signale aus (OPS-04 abgenommen).
- Backup- und Restore-Pfad ist erprobt und dokumentiert.
- Stichprobe der Logs belegt, dass der geheime System-Prompt an keiner Stelle protokolliert wird (Abgleich mit FEAT-03/OPS-04).
- OPS-05 (Performance-Zielwerte) und OPS-06 (Compliance/DSGVO) werden **bewusst nicht** als Zielwerte gesetzt — getragenes Restrisiko, dokumentiert in 00_Korrekturen K4 (kein Abnahmekriterium).