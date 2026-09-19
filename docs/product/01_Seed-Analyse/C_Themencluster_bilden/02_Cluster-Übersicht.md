### Cluster-Übersicht

#### Quantitative Zusammenfassung

| Cluster | Anforderungen | Annahmen | Offene Punkte | Inhaltlicher Schwerpunkt (Stichworte) |
| --- | --- | --- | --- | --- |
| Architektur | 18 | 11 | 4 | Relationale Primärpersistenz (Supabase statt Storyblok); dreistufiges Kernmodell Post→Publikation→Channel; Adapter-Architektur; Storyblok als Publishing-Adapter; I/O-Modulwechsel; Asset-Storage; Migrationspfad |
| Generalisierung | 10 | 7 | 3 | Parallele Publikationen aus einer Quelle; frei definierbare Formate; Markdown als kanonisches Format; agentenfreundliche Channel-Erweiterung; Ein-Produkt-Prinzip; editierbare Prompts/Modell-Registry |
| Mandantenfähigkeit | 8 | 4 | 3 | Datentrennung pro Mandant; durchgängige Mandanten-Referenz; Row-Level-Security; mandantenspezifische Konfiguration; Schutz des geheimen System-Prompts; OAuth-/Rollen-Grundlagen |
| Features | 22 | 15 | 5 | Multi-Format-Tab-UI; Seeds/Prompts pro Format; geheimer Redakteurs-Prompt; Channel-/Settings-Verwaltung; Dokument-Export (Word/PDF/ODF); Auth-Provider (Google/MS/E-Mail); Statusmodell pro Publikation |
| Betriebsmodell | 13 | 20 | 9 (+7 GAPs) | Versionierte Releases statt Hot-Fixing; Self-hosted-Supabase-Deployment; CI/CD über GitLab; Caching/Backoff; Headless-Scheduler-Cron; Idempotenz über Channels; Secret-Management; Export-Engine-Runtime |

#### Verteilung der offenen Punkte

| Cluster | Offene Punkte (inkl. GAPs) | Anteil am Klärungsbedarf |
| --- | --- | --- |
| Betriebsmodell | 9 + 7 GAPs = 16 | 🔴 sehr hoch |
| Features | 5 | 🟡 mittel |
| Architektur | 4 | 🟢 niedrig–mittel |
| Generalisierung | 3 | 🟢 niedrig |
| Mandantenfähigkeit | 3 | 🟢 niedrig |

#### Schwerpunkte des Klärungsbedarfs

- **Betriebsmodell** weist mit Abstand den größten Klärungsbedarf auf: Neben neun expliziten offenen Punkten (u. a. Scheduler-Horizont, Dokument-Export-Engine, Idempotenz-Contract, Performance-Zielwerte, Monitoring/Backup, Test-Suite) sind ihm auch sämtliche sieben **Negativ-Annahmen (GAPs)** zugeordnet, die Lücken im Seed markieren. Auffällig: Mehrere dieser Punkte sind als **„WIRD NICHT GEMACHT"** klassifiziert (Performance-Zielwerte, Monitoring/Logging/Backup, Test-Suite) und damit eher bewusst ausgeklammert als ungeklärt.
- **Features** folgt mit fünf offenen Punkten an zweiter Stelle; diese sind jedoch überwiegend **bereits entschieden** (Kardinalität Seeds, native LinkedIn-API, Release-Kanäle), sodass der reale Restbedarf gering ist – mit Ausnahme der als Implementierungsdetail vertagten Channel-Interface-Spezifikation (OP 10).
- **Architektur, Generalisierung und Mandantenfähigkeit** sind weitgehend durchentschieden: Alle ihnen zugeordneten offenen Punkte tragen den Status **„ENTSCHIEDEN"** bzw. **„ERLEDIGT"**, sodass hier kaum Klärungsbedarf für die nachfolgenden Phasen verbleibt.

> **Hinweis zur Interpretation:** Die hohe absolute Zahl offener Punkte im Cluster **Betriebsmodell** spiegelt nicht durchgängig echten offenen Klärungsbedarf wider, sondern teils bewusste Scope-Ausschlüsse. Der inhaltlich verbliebene Restbedarf konzentriert sich auf die Detailausgestaltung von Deployment-Runtime, Export-Engine und Scheduler-Übertragung.