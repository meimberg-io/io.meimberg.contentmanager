
Die folgende Sequenzierung leitet sich direkt aus dem Abhängigkeitsdiagramm ab. Tickets ohne Vorbedingungen bilden die Startwellen; jede weitere Welle wird erst freigegeben, wenn alle Vorgänger abgeschlossen sind. Innerhalb einer Welle können Tickets parallel bearbeitet werden, sofern nichts anderes vermerkt ist.

### Welle 0 — Fundament & Entscheidungen (keine Vorbedingungen)

Parallel startbar, da im Diagramm als Startknoten markiert.

| Ticket | Begründung der Position |
| --- | --- |
| OPS-01 — Supabase-Stack | Infrastruktur-Wurzel; Vorbedingung für ARCH-02/03/06, MAND-03, OPS-02/04. |
| ARCH-01 — I/O-Isolation verifizieren | Risikoanalyse vor jedem Persistenzaustausch; Vorbedingung für ARCH-02/03. |
| FEAT-02 — Markdown kanonisch | Eigenständige Format-Festlegung, blockiert nur FEAT-01. |
| FEAT-04 — Geltungsbereich System-Prompt | Reine Produktentscheidung, Vorbedingung für FEAT-03. |
| ADAPT-07 — Publer-Mehrwert prüfen | PO-Bewertung, Vorbedingung für ADAPT-08. |
| ADAPT-10 — LinkedIn API-Strategie | PO-Entscheid, Vorbedingung für ADAPT-06. |
| PROC-02 — Horizont 12 Wochen | Entscheidung, Vorbedingung für PROC-01. |
| PROC-05 — Zeitzonen-Entscheid | Bewusst-Nicht-Umsetzen-Entscheid, keine Nachfolger. |
| OPS-05 — Performance-Ziele | Eigenständige Zielwert-Definition, keine technischen Nachfolger. |
| OPS-06 — Compliance/DSGVO | Eigenständige Anforderungsdefinition, keine technischen Nachfolger. |
| GEN-08 — Story n Seeds | Kardinalitätsfestlegung; benötigt GEN-01 erst zur Implementierung (siehe Annahme A1). |

> **Annahme A1:** GEN-08 ist als Entscheidung Startknoten, die *Implementierung* der n-Seed-Kardinalität setzt jedoch GEN-01 voraus. Wir verorten die Entscheidung in Welle 0, die Umsetzung folgt mit Welle 3.

### Welle 1 — Persistenz-Read/Write & Tenant-Wurzel

Setzt **OPS-01** und **ARCH-01** voraus.

| Ticket | Begründung |
| --- | --- |
| ARCH-02 — Read auf Supabase | Setzt ARCH-01 + OPS-01 voraus. |
| ARCH-03 — Write auf Supabase | Setzt ARCH-01 + OPS-01 voraus; kritischer Pfad, Wurzel für GEN-01, MAND-01, CONF-01, PROC-03. |
| ARCH-06 — Storage-Bucket assets | Setzt OPS-01 voraus; parallel zu ARCH-02/03. |
| MAND-03 — Org/Workspace-Tenant | Setzt OPS-01 voraus; Wurzel der gesamten Mandanten-/Auth-Kette. |
| OPS-02 — GitLab-CI/CD | Setzt OPS-01 voraus; parallel. |

### Welle 2 — Persistenz-Konsolidierung, Auth & Mandanten-Verankerung

| Ticket | Begründung |
| --- | --- |
| ARCH-04 — Routen-Schnittstelle stabil | Setzt ARCH-02 + ARCH-03 voraus. |
| ARCH-05 — Backoff/Cache zurückbauen | Setzt ARCH-03 voraus. |
| ARCH-07 — Bestandsdatenmigration | Setzt ARCH-02 + ARCH-03 voraus. |
| MAND-01 — org_id verankern | Setzt MAND-03 + ARCH-03 voraus; kritischer Pfad. |
| MAND-04 — OAuth Google/MS | Setzt MAND-03 voraus; parallel zu MAND-05. |
| MAND-05 — E-Mail/Passwort | Setzt MAND-03 voraus; parallel zu MAND-04. |
| MAND-07 — User-/Rollenverwaltung | Setzt MAND-03 voraus; parallel. |
| GEN-01 — Story-Entität | Setzt ARCH-03 voraus; Wurzel des Kernmodells. |
| PROC-03 — Intake-Persistenz | Setzt ARCH-03 voraus; reine I/O-Umstellung, parallel. |
| OPS-03 — Versionierte Releases | Setzt OPS-02 voraus; parallel. |

### Welle 3 — RLS, Rendition-Modell & Mandantenkontext

| Ticket | Begründung |
| --- | --- |
| MAND-02 — RLS um org_id | Setzt MAND-01 voraus; kritischer Pfad, Vorbedingung für CONF-01 und MAND-06. |
| GEN-02 — Rendition-Entität | Setzt GEN-01 voraus; zentraler Knoten für GEN-03/04/05/07, FEAT, PROC-04. |
| GEN-08-Impl — Story n Seeds umsetzen | Setzt GEN-01 voraus (vgl. Annahme A1). |

> **Sequenziell zwingend:** MAND-06 darf erst nach MAND-02 **und** MAND-04 **und** MAND-05 starten (siehe Welle 4).

### Welle 4 — Modell-Ausbau, Auth-Auflösung & Settings-Basis

| Ticket | Begründung |
| --- | --- |
| MAND-06 — Mandanten-/Rollenkontext | Setzt MAND-02 + MAND-04 + MAND-05 voraus. |
| GEN-03 — Channel-Ebene | Setzt GEN-02 voraus; Vorbedingung für ADAPT-01 + GEN-06. |
| GEN-04 — cm_blog_ref/body entfernen | Setzt GEN-01 + GEN-02 voraus; parallel. |
| GEN-05 — Status auf Rendition | Setzt GEN-02 voraus; Vorbedingung für GEN-06 + PROC-01. |
| GEN-07 — Asset-Entität n:m | Setzt GEN-02 + ARCH-06 voraus; Vorbedingung für FEAT-06. |
| CONF-01 — settings-Tabelle | Setzt MAND-02 + ARCH-03 voraus; Wurzel des CONF-Epics. |

### Welle 5 — Channel-Interface, Mehr-Pipeline-Status & Konfig-Ausbau

| Ticket | Begründung |
| --- | --- |
| ADAPT-01 — Channel-Interface | Setzt GEN-03 voraus; kritischer Pfad, Wurzel des Adapter-Epics, EXP-02, PROC-04. |
| GEN-06 — Mehr-Pipeline-Status | Setzt GEN-03 + GEN-05 voraus. |
| CONF-02 — Formate per UI | Setzt CONF-01 voraus; Vorbedingung für CONF-03/05. |
| CONF-06 — ODT-Branding | Setzt CONF-01 voraus; parallel. |
| CONF-07 — Modell-Registry | Setzt CONF-01 voraus; parallel. |

### Welle 6 — Adapter-Registry, Capabilities, KI-Basis & Scheduler

| Ticket | Begründung |
| --- | --- |
| ADAPT-02 — Adapter-Registry | Setzt ADAPT-01 voraus; Vorbedingung für ADAPT-04/06/08. |
| ADAPT-03 — Idempotenz-Capability | Setzt ADAPT-01 voraus; parallel. |
| EXP-02 — export-Methode | Setzt ADAPT-01 + EXP-01 voraus (EXP-01 ist jederzeit ab Welle 0 startbar, siehe Annahme A2). |
| PROC-04 — MCP generalisieren | Setzt GEN-02 + ADAPT-01 voraus. |
| PROC-01 — Scheduler auf Rendition | Setzt GEN-05 + GEN-06 + PROC-02 voraus. |
| FEAT-03 — Geheimer System-Prompt | Setzt FEAT-04 voraus; Vorbedingung für FEAT-05 + OPS-04. |
| CONF-03 — Startset Formate | Setzt CONF-02 voraus; parallel. |
| CONF-05 — Format-Prompt | Setzt CONF-02 voraus; parallel. |

> **Annahme A2:** **EXP-01** (LibreOffice-Service) hat im Diagramm keine eingehende Kante und ist daher bereits ab Welle 0 startbar. Wir bündeln es operativ mit EXP-02 in Welle 6, da es erst dort fachlich benötigt wird — frühere Umsetzung ist unschädlich.

### Welle 7 — Konkrete Adapter, KI-Generierung & Export-Endpunkte

| Ticket | Begründung |
| --- | --- |
| ADAPT-04 — Storyblok-Adapter | Setzt ADAPT-02 voraus; Vorbedingung für ADAPT-05 + CONF-04. |
| ADAPT-06 — LinkedIn-Adapter | Setzt ADAPT-02 + ADAPT-10 voraus; parallel. |
| ADAPT-08 — Publer-Adapter | Setzt ADAPT-02 + ADAPT-07 voraus; parallel. |
| FEAT-05 — KI auf Rendition | Setzt GEN-02 + FEAT-03 voraus; Vorbedingung für FEAT-01. |
| EXP-03 — Download md/docx/odt/pdf | Setzt EXP-02 voraus; parallel. |
| EXP-04 — E-Mail-Versand | Setzt EXP-02 voraus; parallel. |
| FEAT-06 — Bild teilen | Setzt GEN-07 voraus; parallel. |

### Welle 8 — Adapter-Folgeschritte, Editor & Channel-Konfig

| Ticket | Begründung |
| --- | --- |
| ADAPT-05 — SDK-Rückbau | Setzt ADAPT-04 voraus. |
| ADAPT-09 — Publer-Kanalset | Setzt ADAPT-08 voraus. |
| CONF-04 — Channels per UI | Setzt CONF-01 + ADAPT-04 voraus. |
| FEAT-01 — Editor-Tab je Rendition | Setzt GEN-02 + FEAT-02 + FEAT-05 voraus; integrierendes Frontend-Ticket. |

### Welle 9 — Betriebsabsicherung (integrierend)

| Ticket | Begründung |
| --- | --- |
| OPS-04 — Monitoring/Backup | Setzt OPS-01 + FEAT-03 voraus (Logging-Verbot des System-Prompts); abschließend, da es laufende Komponenten überwacht. |

### Hinweise zu Parallelität & Zirkelfreiheit

- **Keine Zirkelbezüge:** Der Abhängigkeitsgraph ist gerichtet und azyklisch; jede Welle referenziert ausschließlich abgeschlossene Vorwellen.
- **Kritischer Pfad** (längste Sequenz): `ARCH-01 → ARCH-03 → GEN-01 → GEN-02 → GEN-03 → ADAPT-01 → ADAPT-02 → ADAPT-04 → CONF-04`. Diese Kette bestimmt die Mindestdauer und sollte vorrangig staffiert werden.
- **Mandanten-Strang** läuft weitgehend parallel zum Modell-Strang und konvergiert erst bei **CONF-01** (benötigt MAND-02 + ARCH-03).
- **Frühstartbare Inseln:** OPS-05, OPS-06, PROC-05 und EXP-01 sind ohne harte Vorbedingungen und können zur Glättung der Teamauslastung beliebig vorgezogen werden.