### 1. Infrastruktur & Hosting

- **\[ÄND\] Deployment-Fundament auf Self-hosted-Supabase-Stack umstellen.** Das heute Storyblok-basierte Betriebsmodell der Version A muss durch den Self-hosted-Stack der Version B ersetzt werden: Docker-Compose (13-Service-Stack: PostgreSQL, Auth, Storage, Kong-Gateway), Traefik als Reverse-Proxy und GitLab-CI/CD. *Grund: Voraussetzung für eigene Primärpersistenz und Mandantenfähigkeit.*
- **\[OFFENER PUNKT\] Betriebs-/Mandantentopologie ungeklärt.** Die Infrastruktur-Topologie hängt von der noch ausstehenden Entscheidung zwischen Modell A (eine gemeinsame DB + ein Container, vollständig mandantengetrennt), Modell B (eine App + DB pro Kunde) und Modell C (kompletter Stack pro Kunde mit gemeinsamem Deployment) ab (§8.2, §15.5). *Bis zur Entscheidung sind Netzwerk-Schnitt, Container-Anzahl und Skalierungsweg nicht festlegbar — laut Seed die größte offene Architekturfrage.*
- **\[ANNAHME\] Mehr-Zeitzonen-Betrieb potenziell relevant.** Der Scheduler ist heute fest auf `Europe/Berlin` verdrahtet. Bei mehreren Mandanten könnte ein Mehr-Zeitzonen-Bedarf entstehen; im Seed nicht entschieden (abgeleitet aus Mandantenfähigkeit).

### 2. Architektur & Architekturmuster

- **\[NEU\] Dreistufiges Kernmodell Post → Publikation → Channel einführen.** Die heutige feste Blog-/Article-/LinkedIn-Typenstruktur muss durch ein generalisiertes Modell ersetzt werden: Eine Quelle (Post mit Seed) erzeugt n parallele Publikationen, die je in Channels publiziert werden. *Grund: kanal-/zielsystem-agnostisches Produkt. Finaler Begriff für „Publikation" offen (§7.3, §15.1).*
- **\[ÄND\] Feste LinkedIn↔Blog-Kopplung auflösen.** Die heute „nicht sauber aufgesetzte" einseitige Kopplung (`cm_blog_ref`) muss im generalisierten Modell durch das allgemeine Publikations-Konzept ersetzt werden; LinkedIn wird zu einer Publikation unter vielen.
- **\[NEU\] Adapter-Architektur mit klarem Channel-Interface.** Jedes Zielsystem muss über einen Adapter angebunden werden (Faustregel: ein Adapter je Zielsystem), der ein klar definiertes Interface implementiert, sodass neue Kanäle reine Implementierungsarbeit (agentenfreundlich) sind. *Genannte, noch zu spezifizierende Methoden: generate-target-payload, publish, schedule, export, dispatch-email (§15.9).*
- **\[ÄND\] Storyblok vom Primärspeicher zum Publishing-Adapter degradieren.** Storyblok muss als einer von mehreren Channel-Adaptern unter der neuen Architektur weiterbetrieben werden, statt als Datenbank zu fungieren.
- **\[NEU\] Mandantenfähigkeit auf Architekturebene verankern.** Mandanten-Zuordnung muss durchgängig in Modell und Zugriffspfaden vorgesehen werden, sodass kein Mandant Daten anderer sieht/ändert. *Konkrete Ausprägung abhängig vom Betriebsmodell (§8.2).*
- **\[NEU\] Ein-Produkt-Prinzip / kein Fork des Kerns.** Es darf nur ein Produkt-Codestrang existieren; die ZDB-Anforderungen werden auf Requirements-Ebene integriert, nicht als zweiter Fork weitergeführt. *Überprüfbar: kein separater ZDB-Codestrang.*
- **\[BESTAND, erhaltend\] Dünne API-Routen als Orchestratoren / Logik in** `src/lib/**`**.** Das bestehende Schnittmuster (Routen orchestrieren, Logik in reinem TS) bleibt erhalten; nur das I/O dahinter (Storyblok → Supabase) wechselt. *Kein Delta in der Schichtung, aber Voraussetzung für den überschaubaren Umzug.*

### 3. Persistenz & Datenhaltung

- **\[ÄND\] Primärpersistenz von Storyblok auf lokale relationale DB (Supabase/PostgreSQL) umziehen.** Jeder Beitrag wird primär in der lokalen DB gespeichert; von dort aus wird in Channels publiziert. *Grund: „erster Konstruktionsfehler" — Primärpersistenz darf nicht auf einem Publishing-Ziel liegen.*
- **\[ÄND\] I/O-Module austauschen.** `storyblok.ts` (read) und `storyblok-management.ts` (write) müssen durch einen Supabase-Client ersetzt werden; Scheduler-, KI-, LinkedIn-, Publer- und Intake-Logik bleiben unverändert, nur das Persistenz-I/O wechselt.
- **\[ÄND\] Settings von CMS-Story in DB-Tabelle überführen.** `system-config.ts` muss auf eine Supabase-`settings`-Tabelle umgestellt werden (Modell aus Version B vorhanden): Default-Modell, Prompts (global + pro Format), Notes, Labels, Schedules, MCP-Tokens.
- **\[NEU\] Datenmodell durchgängig mandantenbasiert gestalten.** Jede mandantengebundene Entität (Post/Publikation/Channel/Settings) muss eine Mandanten-Referenz tragen. *Überprüfbar: keine mandantenlose relevante Tabelle.*
- **\[ÄND/B\] Multi-Format-Persistenz übernehmen.** Das `content_formats`-Prinzip (mehrere parallele Publikationen als je eigenständiges Dokument) muss generalisiert übernommen werden; das deprecated `body`-JSONB entfällt zugunsten der Publikations-Dokumente.
- **\[ÄND\] Statusfelder pro Publikation statt pro Post.** `content_complete`+`confirmed_at`, Publish-State und Channel-/Publer-State müssen je Publikation getrennt geführt werden.
- **\[NEU/B\] Storage-Bucket für Assets.** Bildablage muss auf einen Supabase-Storage-Bucket (`assets`, Pfadschema `posts/{ts}-{name}`) umgestellt werden statt Storyblok-Asset-Upload; Bilder zwischen Publikationen teilbar.
- **\[NEU\] Row-Level-Security als Mandanten-Isolationsmechanismus.** RLS (Referenz Version B: Service-Role voll, public SELECT nur wo `published=true`) muss um die Mandanten-Dimension erweitert werden. *Konkrete Policy hängt vom Betriebsmodell ab.*
- **\[NEU\] Migrationspfad A → Supabase.** Datenmodell von B übernehmen und A's Prozessfeatures (Scheduler, MCP, Intake, Kopplung) darauf neu aufsetzen. *Migrationsdetails der Bestandsdaten im Seed nicht spezifiziert.*
- **\[OFFENER PUNKT\] Kardinalität Post ↔ Seed.** Ob ein Post mehrere Seeds tragen darf, ist offen (§7.3, §14.2) und beeinflusst das Datenmodell.

### 4. Komponenten & Technologien

- **\[ÄND\] Storyblok-SDKs zurückbauen.** `@storyblok/react`, `storyblok-js-client`, CLI und CLI-generierte Typen verlieren ihre Rolle als Datenbank-Anbindung; verbleiben nur noch im Storyblok-Publishing-Adapter.
- **\[NEU\] Supabase-Client als Persistenzkomponente einführen.** Ersetzt die Storyblok-Management-/Delivery-API als Primärspeicher-Zugriff.
- **\[NEU\] Dokument-Export-Engine ergänzen.** Komponente zur Überführung von Markdown nach Word und PDF; intern favorisiert ODF/LibreOffice (Word→PDF), unter Berücksichtigung kundenspezifischer Word-/ODF-Vorlagen. *Engine-Wahl offen (§6.5, §15.7).*
- **\[ERW\] Breiteres Publer-Kanalset live verdrahten.** Die in A nur als inaktives Scaffolding vorhandenen Formatter für Instagram, Facebook, Pinterest, Twitter/X und Threads (aus B übernehmen) müssen aktiviert werden.
- **\[ERW\] Auth-Provider zusammenführen.** NextAuth muss Google-OAuth (A) **und** Microsoft 365/Azure AD (B) gemeinsam unterstützen.
- **\[NEU\] E-Mail/Passwort-Provider ergänzen.** Zusätzlicher Login ohne OAuth, inkl. sicherem Passwort-Hashing und Brute-Force-Schutz. *Konkrete Vorgaben im Seed nicht genannt (abgeleitet).*
- **\[NEU\] E-Mail-Versand-Komponente.** Für den automatischen Versand erzeugter Dokumente beim Publishen (Download-/Versand-Adapter pro Channel).
- **\[OFFENER PUNKT\] Publer vs. direkte LinkedIn-API.** Zu klären, ob LinkedIn künftig direkt per API statt über Publer angebunden wird und welche Publer-Mehrwerte (z. B. Klick-Analytics) erhalten bleiben (§6.3, §15.4).
- **\[BESTAND, erhaltend\] Frontend-Tech-Stack als Neubau-Referenz.** Next.js 15 / React 18 / shadcn/Tailwind / TipTap bleiben als Basis; das Frontend wird komplett neu gebaut (heutige UI dient als Referenz, nicht als zu erhaltender Code), Zielbild u. a. die Multi-Format-Tab-UI von B.

### 5. Betrieb (Deployment, CI/CD, Release, Verfügbarkeit)

- **\[NEU\] Versionierte, echte Releases statt Hot-Fixing.** Mit dem verkauften Produkt muss von ad-hoc-Updates auf versionierte, nachvollziehbare Releases umgestellt werden. *Überprüfbar: jede Auslieferung trägt eine eindeutige Version. Abhängig vom Mandantenmodell (§8.1).*
- **\[ÄND\] CI/CD über GitLab.** Die Deployment-Pipeline der Version B (GitLab-CI) wird Fundament; A bringt heute kein vergleichbares Pipeline-Setup mit.
- **\[ÄND\] Caching-/Backoff-Mechanismen auf DB-Persistenz anpassen.** Die heute auf Storyblok-Rate-Limits (\~5 req/s) und 30-s-In-Memory-Config-Cache ausgelegten Mechanismen (`managementFetch`-Retry, `system-config`-Cache) sind auf die DB-Persistenz hin umzubauen bzw. weitgehend überflüssig zu machen. *Neue Performance-Zielwerte im Seed nicht genannt.*
- **\[ERW\] Headless-Scheduler-Cron beibehalten und auf neues Modell übertragen.** `POST /api/cron/tick` mit Bearer `CRON_SECRET` (extern/ansible-getriggert) bleibt; Zuverlässigkeitsmechanismen (Retry-Cap 3 → `failed`, Orphan-Handling, status-basierte Idempotenz, „verpasste Slots feuern am geplanten Datum") müssen erhalten und übertragen werden.
- **\[ERW\] Idempotenz über mehrere Channels generalisieren.** Die heute nur für LinkedIn/Publer bestehenden Garantien (published⇒409/block, queued⇒replace) müssen auf das breitere Live-Kanalset ausgeweitet werden.
- **\[OFFENER PUNKT\] Scheduler-Horizont-Diskrepanz.** 12 Wochen (§10.5) vs. 8 Wochen (§12.6) sind ungeklärt und vor dem Ausbau zu entscheiden (§15.11).
- **\[OFFENER PUNKT\] Monitoring, Logging, Backup nicht spezifiziert.** Der Seed nennt keine konkreten Anforderungen zu Monitoring, zentralem Logging oder Backup-Strategie. *Aus SaaS-/Mehr-Mandanten-Charakter ableitbar relevant, aber im Seed nicht ausgeführt — als offener Punkt zu führen.*

### 6. Produktisierung & Konfigurierbarkeit (Generalisierung)

- **\[NEU\] Frei definierbare Publikationsformate ohne Kerneingriff.** Formate (Länge/Tonalität/Struktur/Prompt) müssen als Konfiguration anlegbar sein — jeder Kunde hat eine individuelle Liste. *Überprüfbar: neues Format ohne Codeänderung am Kern, idealerweise per UI (§2, §14.4). UI-Umfang offen (§15.3).*
- **\[NEU\] Channel-Verwaltung als Konfiguration.** Channels müssen anleg-/konfigurierbar sein (Prompts pro Channel, Publishing-Methoden pro Channel), idealerweise per UI. *Umfang offen.*
- **\[NEU\] Übergeordneter, geheimer Redakteurs-/System-Prompt.** Als zentraler, mandantenübergreifender Produktwert über allen Format-Prompts — darf weder im Frontend, in API-Responses noch in Logs offengelegt werden.
- **\[NEU\] Mandantenspezifische Konfiguration isolieren.** Format-, Kanal-, Prompt- und Branding-Konfiguration (Word-/ODF-Vorlagen) müssen pro Mandant getrennt gehalten werden.
- **\[ÄND\] Markdown als kanonisches Feldformat festlegen.** Content wird auf Markdown (mit reinem Text als zweiter Ausprägung) reduziert; HTML/Word/PDF werden daraus abgeleitet, Markdown muss Code-Sections und Tabellen unterstützen. *Behandlung von HTML/JSON als Sonderfälle offen (§3.3, §15.6).*

### Querschnittliche offene Punkte (architekturentscheidend)

| Offener Punkt | Wirkung | Referenz |
| --- | --- | --- |
| Betriebs-/Mandantenmodell A/B/C | Infrastruktur-Topologie, Datenisolation, Skalierung, Release-Disziplin | §8.2, §15.5 |
| Begriff „Publikation" | Benennung der Kernentität | §7.3, §15.1 |
| Mehrere Seeds pro Post | Kardinalität im Datenmodell | §7.3, §14.2 |
| Channel-Interface-Methoden | Adapter-Vertrag | §15.9 |
| Dokument-Export-Engine | Komponentenwahl (Word vs. ODF/LibreOffice) | §6.5, §15.7 |
| Publer vs. direkte LinkedIn-API | Adapter-Implementierung | §6.3, §15.4 |
| Scheduler-Horizont 8 vs. 12 Wochen | Scheduler-Verhalten | §15.11 |
| Monitoring/Logging/Backup | Betriebskonzept | nicht im Seed |

> **Hinweis:** Performance-/Skalierungs-Zielwerte, Monitoring-, Backup- und Compliance-Vorgaben sowie I18N/Barrierefreiheit liefert der Seed nicht. Diese Lücken sind bewusst als offene Punkte ausgewiesen und nicht durch erfundene Werte gefüllt. Mehrere der oben genannten Architektur-Deltas können erst nach der Mandantenmodell-Entscheidung final konkretisiert werden.