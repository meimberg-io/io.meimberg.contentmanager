### Zusammenfassung der Bestandsaufnahme

Die Bestandsaufnahme gliedert das Vorhaben „Von Individualsoftware zum Produkt" in fünf Themencluster. Ausgangspunkt ist die Vereinigung zweier komplementärer Versionen: **Datenmodell aus Version B** plus **Prozessfeatures aus Version A**, überführt in ein mandantenfähiges Produkt auf Supabase/PostgreSQL. Die inhaltliche Grundlage ist insgesamt belastbar: Die zentralen Architektur- und Modellentscheidungen sind getroffen, der Restbedarf konzentriert sich auf Detail- und Betriebsfragen.

#### Reifegrad je Cluster

| Cluster | Reifegrad | Begründung |
| --- | --- | --- |
| Architektur | 🟢 hoch | Zielarchitektur (Supabase statt Storyblok, Adapter-Modell, dünne API-Routen) und das Entitätenmodell Story → Rendition → Channel sind festgelegt. Alle offenen Punkte sind entschieden; verbleibende Annahmen (ARCH-07 Tragfähigkeit B-Modell, ARCH-09 Channel-Interface) wurden bewusst als Implementierungsdetail vertagt. |
| Generalisierung | 🟢 hoch | Markdown als kanonisches Format (plus erhaltenes Block-Modell), frei definierbare Formate pro Mandant und das Ein-Produkt-Prinzip sind bestätigt. Alle offenen Punkte entschieden. |
| Mandantenfähigkeit | 🟢 hoch | Kernentscheidung getroffen: Pooled Database (Modell A) mit org_id je Zeile und RLS, Tenant = Organisation, Rollenmodell Admin/Redakteur. Damit ist die größte Architekturfrage des Seeds geklärt. |
| Features | 🟡 mittel–hoch | Funktionsumfang breit und überwiegend entschieden (mehrere Seeds pro Post, nativer LinkedIn-Adapter + Publer, Release-Kanäle Storyblok/LinkedIn/Download, ODF-Export). Restbedarf: Channel-Interface-Spezifikation (vertagt) und nicht weiter spezifizierter Geltungsbereich des geheimen System-Prompts. |
| Betriebsmodell | 🟡 mittel | Höchste absolute Zahl offener Punkte und alle sieben Negativ-Annahmen. Fundament steht (Self-hosted-Supabase, GitLab-CI, Headless-Cron, versionierte Releases, Export-Runtime als Container). Mehrere Punkte sind jedoch bewusste Scope-Ausschlüsse, kein echter Klärungsbedarf. |

#### Zentrale Risiken

- **Channel-Interface (ARCH-09, OP 10):** Subsumierung heterogener Ziele (Social-Push, CMS, Download, E-Mail) unter ein gemeinsames Interface — als 🔴 niedrig-sicher eingestuft und als Implementierungsdetail vertagt. Risiko verbleibt latent.
- **Idempotenz über Channels (PUB-10):** Ursprünglich 🔴 niedrig; durch OP 12 entschärft, indem Idempotenz als **optionale Capability je Channel-Klasse** (`none`/`upsert`/`publish-queue`/`send-once`) statt als einheitlicher Contract modelliert wird.
- **Tragfähigkeit des B-Datenmodells (ARCH-07):** content_formats-JSONB als Fundament für die ausmodellierte Dreistufigkeit — als Implementierungsdetail eingestuft, aber datenmodell-bestimmend.
- **Erhalt der KI-Qualität bei Generalisierung (PROD-07, KI-05):** Behauptet, aber für das generalisierte, rein deklarative Format-Modell nicht belegt (🟡).
- **Bewusst ausgeklammerte Querschnittsthemen:** Performance-/Skalierungs-Zielwerte (OP 15), Monitoring/Logging/Backup (OP 19) und automatisierte Test-Suite (OP 20) sind als „wird nicht gemacht" klassifiziert — für ein verkauftes SaaS-Produkt ein bewusst getragenes Restrisiko.

#### Wichtigste ungeklärte Punkte

- **Geltungsbereich des geheimen Redakteurs-/System-Prompts (OP 23):** mandantenübergreifend einheitlich vs. pro Mandant sowie Absicherung gegen Offenlegung — als „wird nicht gemacht" markiert, betrifft jedoch den als zentral benannten Produktwert.
- **Channel-Interface-Spezifikation (OP 10):** auf später vertagt, aber Voraussetzung für die agentenfreundliche Erweiterbarkeit.
- **Detailausgestaltung der Export-Engine und Scheduler-Übertragung:** Engine-Wahl (ODF/LibreOffice) entschieden, Betriebsdetails der Runtime und Übertragung der Scheduler-Mechanismen bleiben auszuarbeiten.

#### Einschätzung: erwarteter Analyse- und Entscheidungsaufwand

1. **Features** — höchster verbleibender Detaillierungsaufwand, getrieben durch die vertagte Channel-Interface-Spezifikation und die Vielzahl umzusetzender Funktionen (22 Anforderungen).
2. **Betriebsmodell** — hohe nominale Punktzahl, real reduziert durch bewusste Scope-Ausschlüsse; Restaufwand bei Deployment-Runtime, Export-Engine-Betrieb und Scheduler-Übertragung.
3. **Architektur** — Grundsatzentscheidungen getroffen; Aufwand verlagert sich in die Implementierung (B-Modell-Tragfähigkeit, Bestandsdaten-Migrationsskript).
4. **Mandantenfähigkeit / Generalisierung** — geringster Entscheidungsaufwand; Kernfragen sind durchentschieden, der Fokus liegt auf konsistenter Umsetzung.

> **Gesamteinschätzung:** Die inhaltliche Grundlage ist entscheidungsreif. Die fünf Cluster sind überwiegend durchentschieden; die hohe Zahl offener Punkte im Betriebsmodell spiegelt teils bewusste Ausklammerungen, nicht offenen Klärungsbedarf. Der reale Folgeaufwand konzentriert sich auf Implementierungsdetails (Channel-Interface, Datenmodell-Ausmodellierung) und Betriebs-Runtime, nicht auf grundlegende Richtungsentscheidungen.