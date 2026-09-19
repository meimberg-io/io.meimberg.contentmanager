### 1. Zweck und Geltung des Feature-Modells

Dieses Feature-Modell ist die **verbindliche Festschreibung** der Produktisierungsentscheidungen für „SmartEditor". Es klassifiziert alle bestehenden und geplanten Features in drei Kategorien und ist die Grundlage für die Ticket-Zerlegung in Stage 4.

| Kategorie | Definition | Verortung |
| --- | --- | --- |
| Produktisiertes Standardfeature | Mandantenübergreifend identisch im Kern; nicht konfigurierbar, nicht abschaltbar. | Produktkern (src/lib/**, Persistenz, Auth, RLS) |
| Vereinheitlichtes Feature | Aus zwei divergierenden Bestandsimplementierungen (Version A / B) auf ein generalisiertes Verhalten zusammengeführt; verdrängt kundenspezifische Sonderlogik. | Generalisierter Kern |
| Mandantenspezifisch konfigurierbares Feature | Pro Mandant deklarativ konfigurierbar, ohne Codeänderung am Kern; isoliert über org_id/RLS. | settings-Tabelle, UI |

**Leitprinzip:** Es gilt das **Ein-Produkt-Prinzip** — genau ein Codestrang. Mandantenunterschiede entstehen ausschließlich über **Konfiguration**, niemals über Code-Forks.

### 2. Produktisierte Standardfeatures

Diese Features sind mandantenübergreifend identisch und bilden den nicht verhandelbaren Produktkern.

| Feature | Begründung der Standardisierung | Auswirkung auf Architektur & Mandantenfähigkeit |
| --- | --- | --- |
| Dreistufiges Kernmodell Story → Rendition → Channel | Generalisierte Basis aller Inhalte; ohne einheitliches Modell keine Produktisierung möglich. | Ersetzt feste Blog/Article/LinkedIn-Typenstruktur. Jede Entität trägt org_id. |
| Primärpersistenz in relationaler DB (Supabase/PostgreSQL) | Korrektur des „ersten Konstruktionsfehlers"; Voraussetzung für RLS-Mandantentrennung und Adapter-Architektur. | Storyblok verliert Speicherrolle. RLS auf DB-Ebene wird erst möglich. |
| Adapter-Architektur mit Channel-Interface | Einheitlicher Erweiterungspunkt; neue Kanäle = reine Interface-Implementierung ohne Architekturentscheidung. | Channel-/Zielsystem-Agnostik; Heterogenitäts-Risiko (ARCH-09) verbleibt latent. |
| Idempotenz als Capability je Channel-Klasse (none/upsert/publish-queue/send-once) | Heterogene Ziele lassen keinen einheitlichen Contract zu; Capability-Modell ist die standardisierte Lösung (OP 12). | Teil des Channel-Interface; vom Channel-Typ, nicht vom Mandanten bestimmt. |
| Geheimer Redakteurs-/System-Prompt | Zentraler, mandantenübergreifender Produktwert (PROD-04); liegt bewusst außerhalb der konfigurierbaren Ebene. | Niemals in Frontend/API/Logs/gegenüber Mandanten offengelegt. Kein org_id-Bezug. |
| Markdown als kanonisches Feldformat (+ reiner Text; Code-Sections/Tabellen) | Einheitliche Quelle, aus der HTML/Word/PDF abgeleitet werden; verhindert Format-Wildwuchs (OP 7, DATA-04). | Block-Modell (Storyblok-Mapping) bleibt erhalten. Export-Pipeline baut darauf auf. |
| Row-Level-Security-Mechanik | Primärer Isolationsmechanismus; muss lückenlos und identisch für alle Mandanten greifen. | Hoher Security-Impact (OPS-03); RLS-Fehler exponiert fremde Inhalte (🔴). |
| Scheduler-Kern (Headless-Cron, Retry-Cap, Idempotenz, Orphan-Handling) | Bewährte Bestandslogik aus Version A; bleibt unverändert, wird nur auf neues Modell übertragen. | Logik in src/lib/** bleibt; nur I/O wechselt. Horizont auf 12 Wochen fixiert (OP 4). |
| MCP-Server (generisch über Posts/Publikationen) | Bestehende Automatisierung wird verallgemeinert, nicht ersetzt. | Wirkt auf Story-/Rendition-Modell statt feste Blog/LinkedIn-Struktur. |
| Dokument-Export-Engine (ODF/LibreOffice, headless Container) | Interner Standardpfad Markdown→ODF→Word/PDF; einheitliche Engine für alle Mandanten (OP 8). | Eigener Container-Service. Branding-Vorlage ist der einzige mandantenspezifische Eingriff. |

### 3. Vereinheitlichte Features

Diese Features führen **zwei divergierende Bestandsimplementierungen** (Version A bzw. B) auf **ein** Produktverhalten zusammen. Sie sind der Kern der Produktisierung: kundenspezifische Sonderlogik wird abgelöst.

| Feature | Bestand A / B | Vereinheitlichtes Verhalten | Begründung |
| --- | --- | --- | --- |
| Multi-Format-Persistenz | A: festes body-JSONB + feste LinkedIn↔Blog-Kopplung; B: content_formats | Generalisiertes content_formats-Prinzip; n parallele Renditions; deprecated body entfällt. | A-Kopplung ist Produktisierungs-Blocker; B-Modell ist tragfähigere Basis (DATA-10). |
| Statusführung | A: pauschal pro Post; B: gemischt | Pro Rendition (content_complete+confirmed_at, Publish-/Channel-/Publer-State). | Mehrere parallele Publikationen erfordern getrennte Reifeführung (DATA-06). |
| Mehr-Pipeline-Statusmodell | A: festes 2-Pipeline-Modell (Content/LinkedIn) | Generalisiertes Statusmodell: Content-Reife + pro Channel Publish-/Schedule-Status inkl. „scheduled". | Beliebige Channels statt fixer LinkedIn-Pipeline. |
| Editor-UI | A: Blog-Body + separate LinkedIn-Sektion; B: Multi-Format | Multi-Format-Tab-UI: pro Rendition ein Tab mit Generate/Optimize/Copy. | Löst feste Zweiteilung A ab; übernimmt ergonomisches B-Muster. |
| Auth-Provider | A: Google-OAuth; B: Microsoft 365/Azure AD | Zusammengeführt (NextAuth: Google + Microsoft 365) plus E-Mail/Passwort. | Beide Bestandsmodelle werden in einem Auth-Pfad vereint (OPS-05). |
| Settings-Persistenz | A: CMS-Story; B: DB | Settings in Supabase-settings-Tabelle, mandantengebunden (org_id). | Voraussetzung für mandantenisolierte Konfiguration. |
| LinkedIn-Anbindung | A/B: über Publer | Nativer LinkedIn-Adapter gebaut; Publer bleibt als zusätzlicher Adapter (OP 6). | LinkedIn wird zu einer Rendition unter vielen; Publer-Mehrwert bleibt optional erhalten. |
| Storyblok | A: Primärspeicher | Storyblok-Publishing-Adapter unter Adapter-Architektur. | Degradierung vom Datenbank-Surrogat zum Channel; SDKs verbleiben nur im Adapter. |
| Bild-Pipeline | A: postgebunden | Bilder als Asset-Entität, zwischen Renditions teilbar (n:m). | Generalisierung auf Multi-Rendition-Modell (DATA-07). |

### 4. Mandantenspezifisch konfigurierbare Features

Diese Features sind pro Mandant **deklarativ** konfigurierbar — ohne Codeänderung am Kern, isoliert über `org_id`/RLS.

| Feature | Konfigurationsumfang | Begründung der Konfigurierbarkeit | Mandantenfähigkeits-Auswirkung |
| --- | --- | --- | --- |
| Publikationsformate (Länge/Tonalität/Struktur/Prompt) | Frei definierbare Liste pro Mandant; Startset Blog short/long, Article, Rundschreiben, Pressemeldung, LinkedIn, WhatsApp, Presse-Varianten | Jeder Kunde hat individuellen Format-/Kanalbedarf (PROD-05); deklarative Konfiguration genügt (KI-05). | Formate liegen in settings, org_id-isoliert; per UI verwaltbar (OP 5). |
| Channel-Verwaltung (Prompts/Methoden pro Channel) | Channels anlegen/konfigurieren | Kanal-Set ist mandantenindividuell; Erweiterung soll ohne Kerneingriff erfolgen. | Channel-Config mandantengebunden; UI in Settings (OP 5, OPS-06). |
| Pro-Format-Prompts | Eigener Prompt je Format (Länge/Tonalität/Struktur) | Format-Output ist kundenspezifisch; liegt unterhalb des geheimen System-Prompts. | Prompts mandantenisoliert; System-Prompt bleibt produktweit geschützt. |
| Branding-Vorlagen (Word/ODF) | Einmalig hochladbare ODT-Vorlage pro Mandant | Branding ist je Kunde verschieden; einziger mandantenspezifischer Eingriff im Export-Pfad. | Vorlage org_id-gebunden; wirkt im headless-LibreOffice-Pfad (OP 8). |
| Modell-Registry / Prompts (global + pro Format) | Zur Laufzeit editierbar, Modell-ID überschreibbar | Modell-IDs driften; provider-agnostisch (KI-03, KI-04, OP 13). | In settings, mandantengebunden, vom User setzbar. |
| Download-/Versand-Adapter (md/docx/odt/pdf, optional E-Mail-Versand) | Aktivierung/Konfiguration je Channel | Versandbedarf ist mandantenabhängig (z. B. autom. E-Mail beim Publishen). | Capability je Channel-Klasse; mandantengebunden konfiguriert. |

### 5. Abgelöste / entfallende kundenspezifische Sonderlösungen

| Sonderlösung (Bestand) | Status | Ablösung durch |
| --- | --- | --- |
| Feste LinkedIn↔Blog-Kopplung (cm_blog_ref) | Entfällt | LinkedIn als Rendition unter vielen im Story→Rendition→Channel-Modell. |
| Storyblok als Primärspeicher | Abgelöst | Supabase-Primärpersistenz; Storyblok wird Channel-Adapter. |
| Festes 2-Pipeline-Statusmodell (Content/LinkedIn) | Abgelöst | Generalisiertes Mehr-Pipeline-Statusmodell pro Rendition. |
| Fixer cm_blog_variant (short/long) | Abgelöst | Deklarative Format-Konfiguration (Länge/Tonalität/Struktur) pro Format. |
| Deprecated body-JSONB | Entfällt | Eigenständige Rendition-Dokumente (content_formats-Prinzip). |
| Settings in CMS-Story | Abgelöst | Mandantengebundene settings-Tabelle. |
| Code-Fork pro Kunde (drohender Produktisierungsfehler) | Strukturell ausgeschlossen | Ein-Produkt-Prinzip; Mandantenunterschiede nur über Konfiguration. |
| Storyblok-spezifische Persistenz-SDKs im Kern | Zurückgebaut | SDKs verbleiben ausschließlich im Storyblok-Adapter. |

### 6. Release-Geltung (erstes Release)

| Bereich | Erstes Release | Sukzessive danach |
| --- | --- | --- |
| Channels | Storyblok, LinkedIn (nativ), Download (md/docx/odt/pdf) (OP 9) | Publer-Kanalset: Instagram, Facebook, Pinterest, X, Threads |
| Auth | Google + Microsoft 365 + E-Mail/Passwort | — |
| Scheduler-Horizont | 12 Wochen (OP 4) | — |

### 7. Entscheidungsoffene Punkte mit Feature-Bezug

| Punkt | Status | Auswirkung auf das Feature-Modell |
| --- | --- | --- |
| Channel-Interface-Spezifikation (OP 10) | Vertagt (Implementierungsdetail) | Konkrete Methoden (generate-target-payload/publish/schedule/export/dispatch-email) noch zu fixieren; betrifft alle Channel-Features. |
| Geltungsbereich geheimer System-Prompt (OP 23) | „Wird nicht gemacht" | Vorläufig als produktweites Standardfeature behandelt (nicht pro Mandant); latentes Risiko für den Produktwert. |
| KI-Qualität bei rein deklarativer Konfiguration (KI-05/PROD-07) | Annahme (🟡) | Tragfähigkeit der konfigurierbaren Format-Features nicht belegt. |
| Mehr-Seeds-pro-Post-Verhalten (OP 3) | Entschieden (mehrere Seeds) | Story trägt n Seeds; Standardfeature des Kernmodells. |