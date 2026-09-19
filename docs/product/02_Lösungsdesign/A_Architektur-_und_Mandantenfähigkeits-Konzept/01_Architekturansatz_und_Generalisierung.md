### Architekturansatz und Generalisierung

#### Leitidee der Produktisierung

Das Produkt entsteht aus der **Vereinigung zweier komplementärer Bestandssysteme**: Das **Datenmodell der Version B** bildet das Fundament, die **ausgereiften Prozessfeatures der Version A** (Scheduler, KI-Generierung, MCP, Intake, Kopplung) werden darauf neu aufgesetzt. Es gilt das **Ein-Produkt-Prinzip**: Es existiert genau ein Codestrang; ZDB-Anforderungen werden auf Requirements-Ebene integriert, nicht als zweiter Fork. Damit wird der zentrale Produktisierungs-Fehler — kundenspezifische Verzweigung des Kerns — strukturell ausgeschlossen.

Der grundlegendste Eingriff ist die Korrektur des „ersten Konstruktionsfehlers": Die **Primärpersistenz wandert von Storyblok (einem Publishing-Ziel) in eine eigene relationale Datenbank** (Supabase/PostgreSQL). Storyblok wird vom Datenbank-Surrogat zu einem von vielen Channel-Adaptern degradiert.

#### Schichtung und erhaltenes Schnittmuster

Das bestehende, bewährte Schnittmuster bleibt **bewusst erhalten**:

| Schicht | Rolle | Veränderung |
| --- | --- | --- |
| API-Routen | Dünne Orchestratoren | Schnittstelle bleibt stabil |
| src/lib/** | Fachlogik in reinem TypeScript | Kern bleibt erhalten |
| I/O-Module | Persistenzanbindung | storyblok.ts / storyblok-management.ts → Supabase-Client |
| Frontend | Next.js 15 / React 18 / shadcn / TipTap | Referenz, nicht 1:1 erhaltener Code |

**Designentscheidung:** Da die Logik vom I/O isoliert ist, beschränkt sich der Persistenzumzug auf den Austausch der I/O-Module. Scheduler-, KI-, LinkedIn-, Publer- und Intake-Logik bleiben unverändert.

- **Vorteil:** Minimaler Migrationsrisikobereich, überschaubarer, agentengestützt umsetzbarer Umzug, keine Re-Implementierung erprobter Fachlogik.
- **Nachteil / Annahme:** Setzt voraus, dass die I/O-Isolation tatsächlich sauber ist (ARCH-01) und Storyblok-spezifische Querschnitts-Invarianten (Rate-Limit-Backoff \~5 req/s, Config-Cache) sinngemäß auf DB-Persistenz übertragbar bzw. entbehrlich sind (ARCH-08, 🟡).

#### Kernmodell: Dreistufige Generalisierung

Die feste Typenstruktur (Blog/Article/LinkedIn) wird durch ein **kanal- und zielsystem-agnostisches dreistufiges Modell** ersetzt:

```
Story (Post mit Seed) → Rendition (n parallele Publikationen) → Channel (Publishing-Ziel)
```

- Eine **Story** trägt den/die Seed(s) und erzeugt n **Renditions** (vormals „Publikation"); jede Rendition ist ein eigenständiges, unabhängig editier- und publizierbares Dokument (Generalisierung des `content_formats`-Prinzips aus B).
- Die feste, „nicht sauber aufgesetzte" LinkedIn↔Blog-Kopplung (`cm_blog_ref`) entfällt; **LinkedIn wird zu einer Rendition/Publikation unter vielen**.
- **Statusführung pro Rendition** statt pro Story (`content_complete` + `confirmed_at`, Publish-/Channel-/Publer-State).
- Das deprecated `body`-JSONB entfällt zugunsten eigenständiger Rendition-Dokumente.

**Annahme (ARCH-07, 🟡):** Das B-Modell (`posts` + `content_formats`-JSONB) ist tragfähig genug für die ausmodellierte Dreistufigkeit. Die Channel-Ebene ist in B noch nicht eigenständig modelliert — als datenmodell-bestimmendes Implementierungsdetail vertagt.

#### Service-Schnitt: Adapter-Architektur

Jedes Zielsystem wird über einen **Adapter mit klar definiertem Channel-Interface** angebunden (Faustregel: ein Adapter je Zielsystem). Neue Kanäle sind damit reine Interface-Implementierung — agentenfreundlich erweiterbar.

- **Vorteil:** Channel-/Zielsystem-Agnostik; Erweiterung ohne Kerneingriff; Storyblok, native LinkedIn-API, Publer und Download/E-Mail-Versand stehen gleichberechtigt nebeneinander.
- **Nachteil / Risiko (ARCH-09, 🔴):** Heterogene Ziele (Social-Push vs. CMS vs. Datei-Download vs. E-Mail) unter ein gemeinsames Interface zu subsumieren ist abstraktionskritisch. Methoden-Kandidaten: `generate-target-payload`, `publish`, `schedule`, `export`, `dispatch-email`. Die finale Interface-Spezifikation ist als Implementierungsdetail vertagt.
- **Entschärfung des Idempotenz-Risikos (OP 12):** Statt eines einheitlichen Contracts wird Idempotenz als **optionale Capability je Channel-Klasse** modelliert: `none` / `upsert` / `publish-queue` / `send-once`. Damit wird der Heterogenität Rechnung getragen, ohne nicht zutreffende State-Semantik zu erzwingen.

Für das erste Release sind die Channels **Storyblok, LinkedIn (nativer Adapter) und Download (md/docx/odt/pdf)** vorgesehen; das breitere Publer-Kanalset (Instagram, Facebook, Pinterest, X, Threads) wird sukzessive aktiviert.

#### Mandantenfähigkeit auf Architekturebene

Mandantenfähigkeit ist **durchgängig im Modell und in den Zugriffspfaden verankert**, nicht nachgelagert.

- **Betriebsmodell-Entscheidung (OP 1):** **Pooled Database (Modell A)** — eine gemeinsame DB, `org_id` je Zeile, Isolation über **Row-Level-Security**. Tenant = Organisation/Workspace, Memberships mit Rolle (Admin / Redakteur).
- **Jede mandantengebundene Entität** (Story/Rendition/Channel/Settings) trägt eine Mandanten-Referenz; es existiert keine mandantenlose relevante Tabelle.
- **Begründung:** B nutzt bereits RLS; Modell A ist am leichtgewichtigsten im Rollout und unterstützt das Ein-Produkt-Prinzip ohne separate Stacks.
- **Vorteil:** Einfachster Rollout, ein einziger versionierter Releasestrang.
- **Nachteil / Annahme:** RLS muss korrekt und lückenlos die Mandanten-Dimension durchsetzen — hoher Security-Impact (OPS-03); ein RLS-Fehler exponiert fremde Inhalte.

#### Generalisierungsstrategie: Produktkern vs. Konfiguration

| Bestandteil | Einordnung | Begründung |
| --- | --- | --- |
| Dreistufiges Kernmodell Story→Rendition→Channel | Produktweiter Kern | Generalisierte Basis für alle Mandanten |
| Channel-Interface + Adapter-Mechanik | Produktweiter Kern | Einheitlicher Erweiterungspunkt |
| Geheimer Redakteurs-/System-Prompt | Produktweiter Kern (Produktwert) | Mandantenübergreifend; nie in Frontend/API/Logs offengelegt |
| Persistenz, Auth, Scheduler, RLS-Mechanik | Produktweiter Kern | Querschnittliche Infrastruktur |
| Publikationsformate (Länge/Tonalität/Struktur/Prompt) | Konfigurierbar pro Mandant | Frei definierbare Liste, idealerweise per UI, ohne Codeänderung am Kern |
| Channel-Verwaltung (Prompts/Methoden pro Channel) | Konfigurierbar pro Mandant | Anlegbar/konfigurierbar in den Settings |
| Format-/Kanal-/Prompt-Konfiguration | Mandantenindividuell, isoliert | Pro Mandant getrennt gehalten |
| Branding (Word-/ODF-Vorlagen) | Mandantenindividuell | Einmalig hochladbare ODT-Vorlage je Mandant |
| Modell-Registry / Prompts | Zur Laufzeit editierbar | Modell-IDs driften; provider-agnostisch |

**Kanonisches Feldformat:** Content wird auf **Markdown** (mit reinem Text als zweiter Ausprägung) reduziert; HTML/Word/PDF werden daraus abgeleitet. Markdown muss Code-Sections und Tabellen unterstützen. Das bestehende Block-Modell (Mapping auf Storyblok-Schema) bleibt erhalten.

**Annahme (KI-05, 🟡):** Eine rein **deklarative** Format-Konfiguration genügt, um ohne format-spezifischen Code qualitativ hochwertige Outputs zu erzeugen — Voraussetzung dafür, dass neue Formate ohne Kerneingriff entstehen.

#### Querschnittliche Komponentenentscheidungen

- **Dokument-Export (OP 8):** ODF/LibreOffice als interner Standard; Pipeline Markdown→ODF→Word/PDF über einen **headless LibreOffice-Container-Service**; Branding via ODT-Vorlage pro Mandant; Export als Teil des Channel-Interface. **Annahme (PUB-09, 🟡):** LibreOffice-Runtime ist in der Ziel-Topologie betreibbar.
- **Storyblok-SDKs** (`@storyblok/react`, `storyblok-js-client`, CLI/Typen) verlieren ihre Persistenzrolle und verbleiben nur im Storyblok-Adapter.
- **Bestandsdatenmigration (OP 11):** initial per Script (nicht Teil der App).

#### Zugrunde liegende Annahmen und bewusst getragene Risiken

- Die KI-Generierungsqualität bleibt bei der Generalisierung erhalten (PROD-07/KI-05, 🟡) — behauptet, für das deklarative Modell nicht belegt.
- Die Tragfähigkeit des B-Datenmodells für die Dreistufigkeit (ARCH-07) und die Channel-Interface-Spezifikation (ARCH-09/OP 10) sind als **Implementierungsdetails vertagt** — latente Risiken.
- **Bewusst ausgeklammert** (kein offener Klärungsbedarf, getragenes Restrisiko für ein verkauftes SaaS): quantifizierte Performance-/Skalierungs-Zielwerte (OP 15), Monitoring/Logging/Backup (OP 19), automatisierte Test-Suite (OP 20).