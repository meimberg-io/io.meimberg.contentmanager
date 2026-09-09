#### [x] **Betriebs-/Mandantenmodell A/B/C nicht entschieden (Informationslücke, hoch)**

Art: Informationslücke / offene Frage. Relevanz: hoch. Welches der drei Betriebsmodelle wird gewählt: (A) gemeinsame DB + gemeinsamer Container mit vollständiger mandantenmäßiger Trennung, (B) eine Applikation mit getrennter DB pro Kunde, (C) vollständiger Stack pro Kunde mit gemeinsamem Deployment? Der Seed bezeichnet dies in §8.2 und §15.5 selbst als die größte offene Architekturfrage. Die Entscheidung determiniert Infrastruktur-Topologie, Datenisolation, Skalierung, RLS-Policies und Release-Disziplin. Bezug: §8.2, §15.5.

Ergebnis:

##### Entscheidung

**Pooled Database (Option A): ein gemeinsames Postgres-Schema,** `org_id` **auf jeder mandanteneigenen Zeile, Isolation durch Postgres Row-Level Security (RLS).** Supabase ist dafür gebaut (RLS ist Kern-Feature); Auth liefert den User im JWT, Policies filtern nach Org-Zugehörigkeit.

Der **Tenant ist die Organisation/Workspace**, nicht der User:

- `organizations` (Tenant, trägt Abo/Plan) · `users` · `memberships` (User ↔ Org **mit Rolle** owner/editor/viewer).
- `org_id` **auf jeder mandanteneigenen Tabelle** (posts, publications, channels, custom_formats, secrets …); RLS-Policy: sichtbar nur, wenn `org_id` in den Memberships des Users.
- **Global vs. per-Org:** Adapter-Katalog und Default-Content-Formate sind **global** (vom Produkt bereitgestellt); eigene Formate, Channel-Verbindungen, Credentials und Content sind **per-Org**. Deckt „Adapter gestellt + selbst anlegen" sauber ab.
- **Per-Org-Secrets** (LinkedIn-/Publer-/API-Keys der Kunden) verschlüsselt at-rest, nie im Frontend.

##### Begründung

- **Self-serve + viele kleine Tenants** → niedrige Grenzkosten pro Tenant, **eine** Codebasis, **ein** Deploy, **eine** Migration. Konsistent mit dem Seed-Ziel „kein Fork, echte Releases".
- **Migrations-/Betriebsaufwand:** Silo (DB pro Kunde) bedeutet Migrationen × N, Provisioning pro Kunde, N Connection-Pools. Auf Supabase ist jedes Projekt eine ganze Postgres-Instanz — DB-pro-Tenant skaliert nicht auf viele kleine Kunden.
- **Datenklasse:** Posts/Publikationen/Prompts/Configs erzwingen keine physische Trennung (kein regulatorischer Zwang wie bei Gesundheitsdaten) → logische Isolation reicht.
- **Branchenstandard:** „Pool first, silo the whales later" ist das übliche Vorgehen erfolgreicher B2B-SaaS.

#### [x] **Finaler Begriff für die Entität „Publikation“ offen (offene Frage, mittel)**

Art: offene Frage / Begriffsfindung. Relevanz: mittel. Wie heißt die Entität für die einzelnen konkreten Posts (Rundschreiben, X-Post, Facebook-Post etc.) korrekt? „Publikation“ ist nur ein Kandidat; der finale Begriff muss noch gefunden werden. Betrifft die Benennung der Kernentität im Modell Post → ? → Channel. Bezug: §7.3, §13.4, §15.1.

Ergebnis:

Wir benennen die Entitäten folgendermaßen. 

Story (der "Post", der den Seed trägt)

Rendition (Fassung (bisher Publikation ))\
\
Channel (zum Beispiel LinkedIn, WhatsApp )

#### [x] **Kardinalität Post ↔ Seed ungeklärt (offene Frage, hoch)**

Art: offene Frage. Relevanz: hoch (datenmodell-bestimmend). Kann ein Post mehrere Seeds tragen oder genau einen? Im Seed angedeutet (⟦möglicherweise sogar mehrere, noch offen⟧), aber nicht entschieden. Es fehlt die Entscheidung über Kardinalität und fachliches Verhalten; sie beeinflusst direkt das Datenmodell. Bezug: §7.3, §14.2, Anhang A.

Ergebnis: mehrere

#### [x] **Scheduler-Horizont: 12 Wochen vs. 8 Wochen (Widerspruch, mittel)**

Art: inhaltlicher Widerspruch. Relevanz: mittel. Die Bestandsanalyse (§10.5) nennt einen 12-Wochen-Horizont in der UI, die technische Ist-Stand-Doku (§12.6, schedule-time.ts) einen Horizont von 8 Wochen. Beide Angaben sind dokumentiert, die Diskrepanz ist ungeklärt und muss vor dem Scheduler-Ausbau aufgelöst werden. Betroffene Stellen: §10.5 (12 Wochen) vs. §12.6 (8 Wochen), Hinweis in §15.11.

Ergebnis: 12

#### [x] **Kanal-/Format-Konfiguration per UI – ja/nein und Umfang (offene Frage, mittel)**

Art: offene Frage. Relevanz: mittel. Erfolgt die Anlage/Konfiguration von Kanälen und frei definierbaren Publikationsformaten vollständig über die Oberfläche, und in welchem Umfang? Der Seed enthält hierzu nur die interpretierende Annahme ⟦vermutlich direkt über die Oberfläche, noch nicht final entschieden⟧. Bezug: §2, §14.8, §15.3, Anhang A.

Ergebnis: ja, in den settings, pro mandant

#### [x] **Publer vs. direkte LinkedIn-API + Mehrwert von Publer (offene Frage, mittel)**

Art: offene Frage. Relevanz: mittel. Müssen LinkedIn-Posts weiter über Publer laufen oder können sie direkt an die LinkedIn-API geschickt werden? Welche Publer-Mehrwerte (z. B. Klick-Auswertung/Analytics) würden bei einer Ablösung wegfallen und sollen erhalten bleiben? Aktuell läuft es der Einfachheit halber über Publer; eine Entscheidung fehlt. Bezug: §6.3, §14.6, §15.4.

Ergebnis: Wir bauen einen nativen LinkedIn Adapter, lassen publer aber als weiteren adapter drin.

#### [x] **Feldformat-Reduktion auf Markdown + Text bestätigen; HTML/JSON-Sonderfälle (offene Frage, mittel)**

Art: offene Frage. Relevanz: mittel. Ist die Reduktion des Contents auf Markdown (kanonisch) + reinen Text bestätigt? Wie werden HTML und JSON als Sonderfälle behandelt? Der Seed bezeichnet dies als „vorläufige Leitentscheidung“. Markdown muss Code-Sections und Tabellen unterstützen. Bezug: §3.3, §14.4, §15.6.

Ergebnis:

Ja, Markdown ist ok\
\
Allerdings: Es gibt ja noch das modell der "Blöcke", Mit weiteren Contenttypen (Mappt aktuell auf Storyblok-Schema). Das würde ich gerne behalten

#### [x] **Dokument-Export-Engine: Word-Vorlage vs. ODF/LibreOffice (offene Frage, mittel)**

Art: offene Frage. Relevanz: mittel. Welche Export-Engine wird gewählt: standardisierte Word-Vorlage oder ODF/LibreOffice als interner Standard (Word→PDF)? Tendenz im Seed zu LibreOffice („Word macht immer Stress“), Format-Details bewusst offen. Branding-Vorlagen sind als Querschnitts-Channel-Capability zu spezifizieren. Offen ist zudem die Betreibbarkeit einer LibreOffice-Runtime in der Ziel-Topologie. Bezug: §6.5, §14.6, §15.7.

Ergebnis:

##### Entscheidung

**ODF/LibreOffice als interner Standard.** Markdown → ODF → Word **und** PDF via headless LibreOffice (`soffice --headless --convert-to`).

##### Eckpunkte

- **Branding via ODT-Vorlage** pro Mandant hochladbar (Logo, Schrift, Kopf-/Fußzeile); Inhalt wird in die Vorlage gemerged.
- **LibreOffice-Runtime** als eigener Container-Service (headless, im Compose-Stack), per interner API angesprochen — keine Bündelung in den App-Container.
- **Word-Vorlagen (.docx)** werden ebenfalls akzeptiert und intern nach ODT konvertiert.
- **Export-Capability** ist Teil des Channel-Interface (`export`), für jeden Channel nutzbar.

#### [x] **Welche Kanäle zuerst implementiert werden (Informationslücke, mittel)**

Art: Informationslücke. Relevanz: mittel. Der Seed sagt, Kanäle entstehen sukzessive bei Bedarf, die wichtigsten könnten aber bereits benannt werden – eine konkrete Priorisierung/Reihenfolge fehlt jedoch. Welche Kanäle sind für das erste Release verbindlich? Bezug: §6.4, §8.3.

Ergebnis:

Zuerst:\
\\

- Storyblok\\
- LinkedIn (native)
- Download (md, docx, odt, pdf)

#### [x] **Channel-Interface nicht spezifiziert (Informationslücke, hoch)**

Art: Informationslücke. Relevanz: hoch. Das klare Channel-Interface der Adapter-Architektur ist noch zu spezifizieren. Genannte Methoden-Kandidaten: generate-target-payload, publish, schedule, export, dispatch-email. Offen ist, ob heterogene Ziele (Push-Social-API, CMS, E-Mail-Versand, Datei-Download) unter einem gemeinsamen Interface subsumierbar sind. Bezug: §6.2, §14.6, §15.9.

Ergebnis: Implementierungsdetail. später

#### [x] **Migrationspfad A → Supabase und Bestandsdaten-Migration (Informationslücke, hoch)**

Art: Informationslücke. Relevanz: hoch. Der grobe Migrationspfad ist beschrieben (Datenmodell von B übernehmen, A's Prozessfeatures darauf neu aufsetzen, Storyblok zum Adapter degradieren). Nicht spezifiziert ist jedoch die Migration der bestehenden, produktiv genutzten Storyblok-Inhalte aus Version A (mehrere produktive Blogbeiträge). Es fehlen Vorgehen, Mapping und Datenmigrations-Anforderungen für Bestandsdaten. Bezug: §1.1, §7.1, §12.12.

Ergebnis: Bestand muss initial migriert werdn (nicht teil der app, nur script)

#### [x] **Idempotenz-Contract auf alle Channels generalisierbar? (offene Frage, hoch)**

Art: offene Frage / Risiko. Relevanz: hoch. Der heute nur für LinkedIn/Publer bestehende Idempotenz-Contract (published⇒block/409, queued⇒replace) soll auf das breitere Live-Kanalset generalisiert werden. Offen ist, ob alle Zielsysteme vergleichbare State-Semantik bieten – z. B. Datei-Download oder E-Mail-Versand kennen keinen „queued/published“-Zustand. Die Generalisierbarkeit ist unbelegt. Bezug: §12.11, §14.6.

Ergebnis:

##### 

**Idempotenz nicht channel-übergreifend vereinheitlichen, sondern als optionale Capability im Channel-Interface modellieren.**

| Channel-Klasse | Idempotenz-Strategie |
| --- | --- |
| Push-Social (LinkedIn nativ, Publer) | Voller Contract: published⇒block/409, queued⇒replace |
| CMS (Storyblok) | Upsert über stabile externe ID (idempotent by design) |
| Download (md/docx/odt/pdf) | Kein Zustand – jeder Aufruf erzeugt neu (no-op idempotent) |
| E-Mail-Versand | „Sent once"-Guard: einmal versendet ⇒ block, kein Replace |

**Umsetzung:** Der Adapter deklariert seine Idempotenz-Fähigkeit (`none` / `upsert` / `publish-queue` / `send-once`). Der Scheduler/Publisher respektiert die jeweils gemeldete Semantik, statt einen einheitlichen Contract zu erzwingen.

#### [x] **Modell-ID-Abweichung B (gpt-4o/claude-opus-4) vs. A-Registry (Widerspruch, niedrig)**

Art: inhaltlicher Widerspruch. Relevanz: niedrig. §13.4 nennt für B die Modell-IDs gpt-4o/claude-opus-4, die Ist-Stand-Registry von A (§12.5) listet abweichend gpt-5.5 (Default), gpt-5.4-mini, claude-opus-4-8/sonnet-4-6/haiku-4-5, gemini-3.5-flash/2.5-pro/3.1-flash-lite. Beide Angaben bleiben dokumentiert; fürs Requirement irrelevant, da provider-agnostisch und Registry editierbar. Bezug: §12.5, §13.4.

Ergebnis: Kann eh vom user gesetzt werden in den settings, nicht relevant

#### [x] **Rollensystem fehlt – für Mandantenfähigkeit nötig? (Informationslücke, mittel)**

Art: Informationslücke. Relevanz: mittel. In Version B sind alle authentifizierten Nutzer Admin; ein Rollensystem existiert nicht (§11.8). Der Seed adressiert nicht, ob die Mandantenfähigkeit ein Rollen-/Rechtekonzept erfordert (z. B. Admin vs. Redakteur, Mandanten-Admin). Diese Lücke ist vor dem Auth-/Mandanten-Design zu klären. Bezug: §11.8, §14.9.

Ergebnis: Pro Mandant gibt es admins (user adden, user rollen setzen settings) und redakteure

#### [-] **Performance-/Skalierungs-Zielwerte fehlen (Informationslücke, mittel)**

Art: Informationslücke. Relevanz: mittel. Der Seed nennt nur qualitative Aussagen (Modell A „am schwergewichtigsten in der Datenbank“ / „am leichtgewichtigsten im Rollout“) und weist auf erhöhte KI-Last durch parallele Mehrformat-Generierung hin, aber keine quantifizierten Zielwerte (Mandantenanzahl, Datenvolumen, Durchsatz, Nebenläufigkeit). Diese müssen vor der Mandantenmodell-Entscheidung definiert werden. Bezug: §8.2, §11.3, §14.3.

#### [x] **Keine I18N/L10N- und Mehr-Zeitzonen-Anforderungen (Informationslücke, niedrig)**

Art: Informationslücke. Relevanz: niedrig (potenziell mittel bei mehreren Mandanten). Der Seed nennt durchgängig deutschsprachige Inhalte/Prompts und eine fest verdrahtete Scheduler-Zeitzone Europe/Berlin. Anforderungen zu Mehrsprachigkeit oder Mehr-Zeitzonen-Betrieb (bei mehreren Mandanten relevant) sind nicht erkennbar und bleiben festzuhalten. Bezug: §12.4.2.

Ergebnis: erst keine i18n, später sollen posts übersetzbar werden

#### [x] **Keine Barrierefreiheits-Anforderungen trotz Frontend-Neubau (Informationslücke, niedrig)**

Art: Informationslücke. Relevanz: niedrig. Trotz vollständigem Frontend-Neubau enthält der Seed keine Vorgaben zu Barrierefreiheit (z. B. WCAG-Konformität). Dies ist als offener Punkt zu vermerken und nicht stillschweigend anzunehmen.

Ergebnis: Das Frontend wird nicht vollständig neugebaut, barrierefreiheit irrelevant

#### [x] **Keine expliziten Compliance-/DSGVO-/Audit-Vorgaben (Informationslücke, mittel)**

Art: Informationslücke. Relevanz: mittel. Der Seed nennt keine konkreten regulatorischen Anforderungen (DSGVO-Maßnahmen, Aufbewahrung, Audit-Logging). Aus dem SaaS-/Mehr-Mandanten-Charakter und der Verarbeitung von Kundeninhalten lässt sich Datenschutzrelevanz ableiten, jedoch ohne konkrete Vorgaben. Als offener Punkt zu führen.

Ergebnis: keine spezifischen anforderungen dazu

#### [-] **Kein Monitoring-/Logging-/Backup-Konzept spezifiziert (Informationslücke, mittel)**

Art: Informationslücke. Relevanz: mittel. Der Seed nennt keine Anforderungen zu Monitoring, zentralem Logging oder Backup-Strategie. Aus dem SaaS-/Mehr-Mandanten-Charakter ableitbar relevant, aber nicht ausgeführt. Als offener Punkt für das Betriebskonzept zu führen.

#### [-] **Keine automatisierte Test-Suite (Informationslücke, mittel)**

Art: Informationslücke. Relevanz: mittel. In Version A existiert keine Test-Suite; Verifikation erfolgt manuell via make check (lint+typecheck) + make dev. Für ein verkauftes Produkt mit Releases und Mandantenfähigkeit fehlt eine Aussage über Test-/Qualitätssicherungs-Anforderungen. Bezug: §12.10.

#### [x] **Tragfähigkeit des B-Datenmodells für Dreistufigkeit Post→Publikation→Channel (offene Frage, hoch)**

Art: offene Frage / Risiko. Relevanz: hoch. Das Zielmodell setzt auf das B-Datenmodell (posts + content_formats JSONB) auf. Die Dreistufigkeit mit Channel als eigener Ebene ist in B jedoch nicht ausmodelliert – content_formats ist nur ein JSONB-Key-Set. Offen ist, ob dieses Fundament für die generalisierte Struktur tragfähig genug ist oder ob ein erweitertes relationales Modell nötig wird. Bezug: §11.2, §14.1, §7.3.

Ergebnis: implementierungsdetail

#### [x] **Architektonisch unsaubere LinkedIn↔Blog-Kopplung (Informationslücke, mittel)**

Art: Informationslücke / inhaltliche Spannung. Relevanz: mittel. Der Seed räumt ein, dass die Kopplung Blog↔LinkedIn „noch nicht sauber aufgesetzt“ und nur „für den Moment akzeptiert“ ist (einseitige cm_blog_ref). Im generalisierten Modell soll LinkedIn eine Publikation unter vielen werden, doch das konkrete Vorgehen zur Auflösung der heutigen festen Kopplung ist nicht ausspezifiziert. Bezug: §1.2, §7.3, §13.4.

Ergebnis: es wird eine übergeordnete entität geben ("Story"). Dann kommen die angehängten Fassungen ("Rendition").

#### [-] **Geltungsbereich des geheimen Redakteurs-/System-Prompts (offene Frage, mittel)**

Art: offene Frage. Relevanz: mittel. Der geheime übergeordnete Redakteurs-Prompt ist als zentraler Produktwert benannt, aber der Seed formuliert dessen Existenz nur vermutend („vermutlich“). Offen ist, ob er mandantenübergreifend einheitlich gilt oder pro Mandant variiert, und wie er technisch gegen Offenlegung (Frontend, API-Responses, Logs) abgesichert wird. Bezug: §4.1, §14.3.