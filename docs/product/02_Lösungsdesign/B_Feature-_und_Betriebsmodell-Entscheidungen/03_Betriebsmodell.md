### Betriebsmodell

Das Betriebsmodell überführt SmartEditor von einem ad-hoc betriebenen Storyblok-basierten Individualsystem in ein versioniert ausgeliefertes, mandantenfähiges SaaS-Produkt. Es baut auf dem Self-hosted-Supabase-Stack der Version B auf und ist konsequent am **Ein-Produkt-Prinzip** (genau ein Codestrang, keine Forks) sowie am gewählten **Pooled-Database-Mandantenmodell (Modell A)** ausgerichtet.

#### 1. Deployment-Konzept

Containerisierung

Das Deployment-Fundament ist der **Self-hosted-Supabase-Stack** als Docker-Compose-Verbund (13-Service-Stack):

| Baustein | Rolle |
| --- | --- |
| PostgreSQL | Primärpersistenz aller mandantengebundenen Entitäten (Story/Rendition/Channel/Settings/Assets) |
| Auth-Service | Authentifizierung (NextAuth-Integration: Google, Microsoft 365/Azure AD, E-Mail/Passwort) |
| Storage | Asset-Bucket (assets, Pfadschema posts/{ts}-{name}) |
| Kong-Gateway | API-Gateway des Supabase-Stacks |
| Traefik | Reverse-Proxy vor dem Stack |
| App-Container | Next.js-15-Applikation mit Fachlogik-Kern (src/lib/**) |
| Export-Service | Eigenständiger headless-LibreOffice-Container (Markdown → ODF → Word/PDF) |

> Der Export-Service ist bewusst als **separater Container** geschnitten, da die LibreOffice-Runtime andere Ressourcen- und Skalierungscharakteristika hat als die App. Seine Betreibbarkeit in der Ziel-Topologie ist eine getragene Annahme (PUB-09, 🟡).

CI/CD-Pipeline

- **GitLab-CI/CD** ist das verpflichtende Pipeline-Fundament (übernommen aus Version B; Version A bringt kein vergleichbares Setup mit).
- Der Build erzeugt Container-Images, die über die Pipeline in die Ziel-Topologie ausgerollt werden.

Release-Strategie

- **Versionierte, nachvollziehbare Releases** ersetzen das bisherige Hot-Fixing. *Überprüfbares Kriterium: Jede Auslieferung trägt eine eindeutige Version.*
- Das Pooled-Database-Modell ermöglicht **genau einen versionierten Releasestrang** für alle Mandanten — kein kundenspezifisches Branching, kein Fork des Kerns.

#### 2. Hosting-Modell

| Dimension | Entscheidung |
| --- | --- |
| Betriebsform | Self-hosted (eigener Supabase-Stack statt SaaS-Storyblok) |
| Mandantentopologie | Modell A — Pooled Database: eine gemeinsame DB, ein Container/Stack, org_id je Zeile, Isolation über Row-Level-Security (RLS) |
| Verworfene Alternativen | Modell B (App + DB pro Kunde), Modell C (kompletter Stack pro Kunde) |
| Tenant-Definition | Organisation/Workspace; Nutzer über Memberships mit Rolle (Admin/Redakteur) zugeordnet |

**Begründung der Topologie-Wahl (Modell A):**

- **Skalierbarkeit:** Datenbankseitig am schwergewichtigsten (geteilte DB, hoher Isolationsaufwand), zugleich am leichtgewichtigsten im Rollout.
- **Betriebsaufwand & Kosten:** Nur ein Container/Stack und ein Releasestrang sind zu betreiben → niedrigste Infrastruktur- und Wartungskosten, geteilte Ressourcen.
- **Verfügbarkeit/Release-Disziplin:** Ein einziger Codestrang vereinfacht Auslieferung und Konsistenz.
- **Sicherheit:** Die Isolation hängt vollständig an korrekt umgesetzter RLS — hoher Security-Impact (OPS-03, 🔴); ein RLS-Fehler exponiert fremde Inhalte.

#### 3. Betriebskonzept

Skalierung

- Im gewählten Modell A wird **ein gemeinsamer Stack** betrieben; die Datenbank ist die last- und isolationskritische Komponente.
- Die auf Storyblok-Rate-Limits (\~5 req/s) und den 30-s-In-Memory-Config-Cache ausgelegten **Backoff-/Caching-Mechanismen** (`managementFetch`-Retry, `system-config`-Cache) werden auf DB-Persistenz umgebaut bzw. weitgehend überflüssig gemacht.
- **Annahme:** Quantifizierte Performance-/Skalierungs-Zielwerte (Mandantenanzahl, Datenvolumen, Durchsatz) sind **nicht definiert** und bewusst ausgeklammert (OP 15) — getragenes Restrisiko für ein verkauftes SaaS.

Scheduler-Betrieb

- Der **Headless-Scheduler** (`POST /api/cron/tick`, Bearer `CRON_SECRET`, extern/ansible-getriggert) bleibt erhalten und wird auf das Rendition-Modell übertragen.
- Zuverlässigkeitsmechanismen bleiben gewahrt: Retry-Cap 3 → `failed`, Orphan-Handling, status-basierte Idempotenz, „verpasste Slots feuern am geplanten Datum".
- **Scheduler-Horizont: 12 Wochen** (Entscheidung zu OP 4 / OP 15-Diskrepanz 8 vs. 12 Wochen).
- **Idempotenz** wird über das breitere Live-Kanalset generalisiert — als optionale Capability je Channel-Klasse (`none`/`upsert`/`publish-queue`/`send-once`).
- **Annahme (offen):** Der Scheduler ist heute fest auf `Europe/Berlin` verdrahtet; ein Mehr-Zeitzonen-Bedarf bei mehreren Mandanten ist möglich, wird aber **zunächst nicht umgesetzt** (OP 16, SCH-04).

Monitoring, Logging, Backup/Recovery

- Der Seed liefert **kein konkretes Konzept** für Monitoring, zentrales Logging oder Backup-Strategie. Dies ist als **offener Punkt (OP 19)** geführt und bewusst als „wird nicht gemacht" klassifiziertes, getragenes Restrisiko ausgewiesen.
- Bei einer **geteilten DB mehrerer Mandanten** ist dieser Bereich besonders relevant — die Lücke ist als ausdrückliche Annahme markiert und **nicht durch erfundene Vorgaben gefüllt**.
- **Logging-Restriktion (verbindlich):** Der geheime Redakteurs-/System-Prompt darf **niemals in Logs** (noch in Frontend oder API-Responses) offengelegt werden.

Updates und Wartung

- Updates erfolgen über **versionierte Releases** via GitLab-CI/CD auf den einen gemeinsamen Stack — alle Mandanten werden mit demselben Releasestand bedient.
- **Bestandsdatenmigration** (A → Supabase) erfolgt **initial per Script**, nicht als Teil der laufenden Applikation (OP 11).

#### 4. Verantwortlichkeiten im Betrieb

| Bereich | Verantwortung |
| --- | --- |
| Plattform-/Stack-Betrieb | Betreiber des Self-hosted-Supabase-Stacks (Container, Traefik, Gateway) |
| Release & Deployment | GitLab-CI/CD-Pipeline; ein versionierter Strang für alle Mandanten |
| Mandanten-Konfiguration (Admin-Rolle) | Verwaltung von User/Rollen/Settings, Formaten, Channels und Branding-Vorlage innerhalb der eigenen Organisation |
| Inhaltliche Arbeit (Redakteur-Rolle) | Erstellung und Publikation von Inhalten |
| Mandanten-Isolation | Technisch auf DB-Ebene durch RLS durchgesetzt (nicht nur in der Anwendungslogik) |

#### 5. Begründung der zentralen Entscheidungen

| Kriterium | Entscheidung & Begründung |
| --- | --- |
| Verfügbarkeit | Ein gemeinsamer, versioniert ausgelieferter Stack vereinfacht konsistente Auslieferung; Scheduler-Zuverlässigkeitsmechanismen (Retry, Orphan-Handling, Idempotenz) bleiben erhalten. |
| Skalierbarkeit | Modell A ist datenbankseitig am schwergewichtigsten, aber im Rollout am leichtesten; Zielwerte bewusst offen (OP 15). |
| Sicherheit | RLS als primärer Isolationsmechanismus (hoher Impact, OPS-03 🔴); Schutz des geheimen System-Prompts gegen Offenlegung in Frontend/API/Logs. |
| Kosten | Geteilte Ressourcen, ein Stack, ein Releasestrang → niedrigste Infrastruktur- und Wartungskosten; kein Fork-Overhead durch Ein-Produkt-Prinzip. |

#### 6. Getroffene Annahmen und getragene Restrisiken

- **Mandantenmodell A** ist der gewählte und wahrscheinlichste Kandidat (OPS-07/OPS-02, bestätigt durch OP 1).
- **Performance-/Skalierungs-Zielwerte** sind nicht definiert und bewusst ausgeklammert (OP 15).
- **Monitoring/Logging/Backup-Konzept** ist nicht spezifiziert — getragenes Restrisiko, bei geteilter DB besonders relevant (OP 19).
- **Mehr-Zeitzonen-Betrieb** des Schedulers zunächst nicht umgesetzt (OP 16, SCH-04).
- **Compliance/DSGVO/Audit** sind nicht festgelegt, trotz Datenschutzrelevanz des Mehr-Mandanten-SaaS (OP 18).
- **LibreOffice-Runtime** ist in der Ziel-Topologie betreibbar (PUB-09, 🟡).
- **I/O-Isolation** der Bestandslogik ist sauber genug, dass der Persistenzumzug auf den I/O-Austausch beschränkt bleibt (ARCH-01/ARCH-08).