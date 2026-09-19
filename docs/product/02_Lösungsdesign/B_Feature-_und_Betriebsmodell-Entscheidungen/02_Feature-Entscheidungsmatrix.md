#### [x] **Dreistufiges Kernmodell Story → Rendition → Channel als Standardfeature produktisieren**

Einordnung: PRODUKTISIERT (mandantenübergreifender Produktkern). Begründung: Generalisierte Basis aller Inhalte; ohne einheitliches Modell ist keine Produktisierung möglich. Ersetzt die feste Blog/Article/LinkedIn-Typenstruktur; jede Entität trägt org_id. Höchste Umsetzungsrelevanz, da fundamentale Voraussetzung für alle weiteren Features (DATA-01, OP 2/22).

Ergebnis: **Einordnung: PRODUKTISIERT** – das dreistufige Kernmodell Story → Rendition → Channel ist als mandantenübergreifender, nicht konfigurierbarer Produktkern festzuschreiben, da es die generalisierte Basis aller Inhalte bildet und fundamentale Voraussetzung für alle weiteren Features ist.

#### [x] **Primärpersistenz in relationaler DB (Supabase/PostgreSQL) produktisieren**

Einordnung: PRODUKTISIERT (Produktkern, Querschnitts-Infrastruktur). Begründung: Korrektur des 'ersten Konstruktionsfehlers'; Voraussetzung für RLS-Mandantentrennung und Adapter-Architektur. Storyblok verliert die Speicherrolle, RLS auf DB-Ebene wird erst möglich (ARCH-02, OP 1).

Ergebnis: **Einordnung: PRODUKTISIERT** – die Primärpersistenz in relationaler DB (Supabase/PostgreSQL) ist als querschnittlicher Produktkern festzuschreiben, da sie den „ersten Konstruktionsfehler" korrigiert und die zwingende Voraussetzung für RLS-Mandantentrennung und Adapter-Architektur bildet.

#### [x] **Row-Level-Security-Mechanik als Standard-Isolationsmechanismus produktisieren**

Einordnung: PRODUKTISIERT (Produktkern). Begründung: Primärer Mandanten-Isolationsmechanismus; muss lückenlos und identisch für alle Mandanten greifen. Hoher Security-Impact (OPS-03, 🔴) — ein RLS-Fehler exponiert fremde Inhalte. Pooled Database (Modell A), org_id je Zeile (OP 1).

Ergebnis: **Einordnung: PRODUKTISIERT** – die Row-Level-Security-Mechanik (Pooled Database Modell A, `org_id` je Zeile) ist als nicht verhandelbarer Produktkern festzuschreiben, da sie der primäre Mandanten-Isolationsmechanismus ist, lückenlos und identisch für alle Mandanten greifen muss und einen hohen Security-Impact trägt (OPS-03, 🔴 — ein Fehler exponiert fremde Inhalte).

#### [x] **Adapter-Architektur mit Channel-Interface produktisieren**

Einordnung: PRODUKTISIERT (Produktkern, einheitlicher Erweiterungspunkt). Begründung: Neue Kanäle = reine Interface-Implementierung ohne Architekturentscheidung; sichert Channel-/Zielsystem-Agnostik. Heterogenitäts-Risiko (ARCH-09, 🔴) verbleibt latent; finale Methoden-Spezifikation vertagt (OP 10).

Ergebnis: **Einordnung: PRODUKTISIERT** – die Adapter-Architektur mit einheitlichem Channel-Interface ist als Produktkern und einheitlicher Erweiterungspunkt festzuschreiben, da neue Kanäle damit zur reinen Interface-Implementierung ohne Architekturentscheidung werden und die Channel-/Zielsystem-Agnostik sichern, während das Heterogenitäts-Risiko (ARCH-09, 🔴) latent verbleibt und die finale Methoden-Spezifikation als Implementierungsdetail vertagt ist (OP 10).

#### [x] **Idempotenz als Capability je Channel-Klasse modellieren**

Einordnung: PRODUKTISIERT (Teil des Channel-Interface). Begründung: Heterogene Ziele lassen keinen einheitlichen Contract zu; Capability-Modell (none/upsert/publish-queue/send-once) ist die standardisierte Lösung (OP 12). Vom Channel-Typ, nicht vom Mandanten bestimmt.

Ergebnis: **Einordnung: PRODUKTISIERT** – Idempotenz ist als optionale Capability je Channel-Klasse (`none`/`upsert`/`publish-queue`/`send-once`) Teil des standardisierten Channel-Interface festzuschreiben, da heterogene Ziele keinen einheitlichen Contract zulassen und die Capability vom Channel-Typ, nicht vom Mandanten bestimmt wird (OP 12).

#### [x] **Geheimen Redakteurs-/System-Prompt als geschützten Produktkern festschreiben**

Einordnung: PRODUKTISIERT (zentraler, mandantenübergreifender Produktwert, PROD-04). Begründung: Liegt bewusst außerhalb der konfigurierbaren Ebene; niemals in Frontend/API/Logs/gegenüber Mandanten offengelegt, kein org_id-Bezug. Geltungsbereich-Feinheit (OP 23) als latentes Restrisiko getragen.

Ergebnis: **Einordnung: PRODUKTISIERT** – der geheime Redakteurs-/System-Prompt ist als zentraler, mandantenübergreifender Produktwert (PROD-04) ohne org_id-Bezug festzuschreiben, der bewusst außerhalb der konfigurierbaren Ebene liegt und niemals in Frontend/API/Logs/gegenüber Mandanten offengelegt wird, wobei die ungeklärte Geltungsbereich-Feinheit (OP 23) als latentes Restrisiko bewusst getragen wird.

#### [x] **Markdown als kanonisches Feldformat produktisieren**

Einordnung: PRODUKTISIERT (Produktkern). Begründung: Einheitliche Quelle, aus der HTML/Word/PDF abgeleitet werden; verhindert Format-Wildwuchs (OP 7, DATA-04). Markdown muss Code-Sections und Tabellen unterstützen; bestehendes Block-Modell (Storyblok-Mapping) bleibt erhalten.

Ergebnis: **Einordnung: PRODUKTISIERT** – Markdown ist als kanonisches Feldformat (plus reiner Text, mit Code-Sections und Tabellen) im Produktkern festzuschreiben, da es die einheitliche Quelle bildet, aus der HTML/Word/PDF abgeleitet werden, und so Format-Wildwuchs verhindert (OP 7, DATA-04), während das bestehende Block-Modell (Storyblok-Mapping) erhalten bleibt.

#### [x] **Multi-Format-Persistenz auf content_formats-Prinzip vereinheitlichen**

Einordnung: VEREINHEITLICHT (A: festes body-JSONB + LinkedIn↔Blog-Kopplung; B: content_formats). Begründung: A-Kopplung ist Produktisierungs-Blocker, B-Modell ist tragfähigere Basis (DATA-10). Generalisiertes content_formats-Prinzip mit n parallelen Renditions; deprecated body entfällt.

Ergebnis: **Einordnung: VEREINHEITLICHT** – die Multi-Format-Persistenz ist von der A-seitigen festen body-JSONB-Struktur mit LinkedIn↔Blog-Kopplung (`cm_blog_ref`) auf das generalisierte `content_formats`-Prinzip aus Version B mit n parallelen, eigenständig editier-/publizierbaren Renditions zusammenzuführen, wobei das deprecated `body`-JSONB entfällt, da die A-Kopplung ein Produktisierungs-Blocker und das B-Modell die tragfähigere Basis ist (DATA-10).

#### [x] **Statusführung pro Rendition vereinheitlichen**

Einordnung: VEREINHEITLICHT (A: pauschal pro Post; B: gemischt). Begründung: Mehrere parallele Publikationen erfordern getrennte Reifeführung (DATA-06). Ziel: content_complete + confirmed_at, Publish-/Channel-/Publer-State pro Rendition.

Ergebnis: **Einordnung: VEREINHEITLICHT** – die Statusführung ist von der A-seitig pauschal pro Post bzw. B-seitig gemischten Logik auf eine getrennte Reifeführung pro Rendition (`content_complete` + `confirmed_at` sowie Publish-/Channel-/Publer-State je Rendition) zusammenzuführen, da mehrere parallele Publikationen eine eigenständige Statusverfolgung erfordern (DATA-06).

#### [x] **Mehr-Pipeline-Statusmodell generalisieren**

Einordnung: VEREINHEITLICHT (A: festes 2-Pipeline-Modell Content/LinkedIn). Begründung: Beliebige Channels statt fixer LinkedIn-Pipeline. Generalisiertes Statusmodell: Content-Reife + pro Channel Publish-/Schedule-Status inkl. 'scheduled'.

Ergebnis: **Einordnung: VEREINHEITLICHT** – das Mehr-Pipeline-Statusmodell ist vom A-seitig festen 2-Pipeline-Modell (Content/LinkedIn) auf ein generalisiertes Statusmodell zu überführen, das die Content-Reife sowie pro Channel einen Publish-/Schedule-Status inklusive „scheduled" abbildet, da beliebige Channels statt einer fixen LinkedIn-Pipeline zu unterstützen sind.

#### [x] **Editor-UI als Multi-Format-Tab-UI vereinheitlichen** *(delegiert)*

Einordnung: VEREINHEITLICHT (A: Blog-Body + separate LinkedIn-Sektion; B: Multi-Format). Begründung: Löst feste Zweiteilung aus A ab und übernimmt ergonomisches B-Muster. Pro Rendition ein Tab mit Generate/Optimize/Copy; etablierte UI-Muster (Toasts, modale Bestätigungen, URL-State) bleiben erhalten.

Ergebnis: **Einordnung: VEREINHEITLICHT** – die Editor-UI ist von der A-seitigen festen Zweiteilung (Blog-Body + separate LinkedIn-Sektion) auf das ergonomische Multi-Format-Tab-Muster aus Version B zu überführen, bei dem pro Rendition ein eigener Tab mit Generate/Optimize/Copy bereitsteht und die etablierten UI-Muster (Toasts, modale Bestätigungen, URL-State) erhalten bleiben.

#### [x] **Auth-Provider zusammenführen (Google + Microsoft 365 + E-Mail/Passwort)** *(delegiert)*

Einordnung: VEREINHEITLICHT (A: Google-OAuth; B: Microsoft 365/Azure AD). Begründung: Beide Bestandsmodelle in einem NextAuth-Pfad vereint plus E-Mail/Passwort (OPS-05). E-Mail/Passwort erfordert sicheres Hashing und Brute-Force-Schutz (OPS-08).

Ergebnis: **Einordnung: VEREINHEITLICHT** – die Auth-Provider aus Version A (Google-OAuth) und Version B (Microsoft 365/Azure AD) sind in einem gemeinsamen NextAuth-Pfad zusammenzuführen und um E-Mail/Passwort-Login zu ergänzen (OPS-05), wobei der E-Mail/Passwort-Provider sicheres Passwort-Hashing und Brute-Force-Schutz erfordert (OPS-08) und die Auth-Komponente den Mandanten-/Rollenkontext (Admin/Redakteur) für die RLS-Pfade auflöst.

#### [x] **Settings-Persistenz in DB vereinheitlichen**

Einordnung: VEREINHEITLICHT (A: CMS-Story; B: DB). Begründung: Voraussetzung für mandantenisolierte Konfiguration. Settings in Supabase-settings-Tabelle, mandantengebunden über org_id (Default-Modell, Prompts, Notes, Labels, Schedules, MCP-Tokens).

Ergebnis: **Einordnung: VEREINHEITLICHT** – die Settings-Persistenz ist von der A-seitigen CMS-Story-Ablage (`system-config.ts`) auf die DB-Variante aus Version B zu überführen, konkret in eine mandantengebundene Supabase-`settings`-Tabelle (`org_id`-isoliert für Default-Modell, Prompts, Notes, Labels, Schedules, MCP-Tokens), da dies die zwingende Voraussetzung für eine mandantenisolierte Konfiguration ist.

#### [x] **LinkedIn-Anbindung als nativen Adapter vereinheitlichen**

Einordnung: VEREINHEITLICHT (A/B: über Publer). Begründung: LinkedIn wird zu einer Rendition unter vielen; nativer LinkedIn-Adapter gebaut, Publer bleibt als zusätzlicher Adapter (OP 6). Publer-Mehrwerte (Klick-Analytics) vor Ablösung prüfen (PUB-03).

Ergebnis: **Einordnung: VEREINHEITLICHT** – die LinkedIn-Anbindung ist von der bestehenden Publer-Vermittlung (A/B) auf einen nativen LinkedIn-Adapter zusammenzuführen, der LinkedIn als eine Rendition unter vielen im Story→Rendition→Channel-Modell anbindet, während Publer als zusätzlicher gleichberechtigter Adapter erhalten bleibt (OP 6) und dessen Mehrwerte (Klick-Analytics) vor einer endgültigen Ablösung zu prüfen sind (PUB-03).

#### [x] **Storyblok zum Publishing-Adapter degradieren**

Einordnung: VEREINHEITLICHT (A: Primärspeicher → Channel-Adapter). Begründung: Degradierung vom Datenbank-Surrogat zum gleichberechtigten Channel unter der Adapter-Architektur. Storyblok-SDKs (@storyblok/react, storyblok-js-client, CLI/Typen) verbleiben nur im Adapter.

Ergebnis: **Einordnung: VEREINHEITLICHT** – Storyblok ist von seiner A-seitigen Rolle als Primärspeicher zu einem gleichberechtigten Publishing-Adapter unter der Adapter-Architektur zu degradieren, wobei die Storyblok-SDKs (`@storyblok/react`, `storyblok-js-client`, CLI/Typen) ihre Persistenzrolle verlieren und ausschließlich im Storyblok-Adapter verbleiben.

#### [x] **Bild-Pipeline als teilbare Asset-Entität vereinheitlichen**

Einordnung: VEREINHEITLICHT (A: postgebunden). Begründung: Generalisierung auf Multi-Rendition-Modell (DATA-07). Bilder als Asset-Entität, zwischen Renditions teilbar (n:m); Supabase-Storage-Bucket 'assets', Pfadschema posts/{ts}-{name}. Bild-Pipeline (DALL·E/gpt-image-1) bleibt erhalten (KI-06).

Ergebnis: **Einordnung: VEREINHEITLICHT** – die Bild-Pipeline (DALL·E/gpt-image-1) ist von ihrer A-seitig postgebundenen Form auf ein Multi-Rendition-Modell zu generalisieren, bei dem Bilder als eigenständige Asset-Entität mit n:m-Zuordnung zwischen Renditions teilbar sind (Supabase-Storage-Bucket `assets`, Pfadschema `posts/{ts}-{name}`), während die Pipeline-Logik selbst erhalten bleibt (DATA-07, KI-06).

#### [x] **Scheduler-Kern produktisiert beibehalten und auf neues Modell übertragen**

Einordnung: PRODUKTISIERT (bewährte Bestandslogik aus Version A). Begründung: Logik in src/lib/** bleibt unverändert, nur I/O wechselt. Headless-Cron (POST /api/cron/tick, Bearer CRON_SECRET), Retry-Cap 3 → failed, Orphan-Handling, status-basierte Idempotenz, verpasste Slots. Horizont auf 12 Wochen fixiert (OP 4).

Ergebnis: **Einordnung: PRODUKTISIERT** – der Scheduler-Kern ist als bewährte Bestandslogik aus Version A unverändert beizubehalten und lediglich auf das Rendition-Modell sowie die neue Persistenz-I/O zu übertragen, wobei Headless-Cron (`POST /api/cron/tick`, Bearer `CRON_SECRET`), Retry-Cap 3 → `failed`, Orphan-Handling, status-basierte Idempotenz und das Feuern verpasster Slots erhalten bleiben und der Horizont auf 12 Wochen fixiert wird (OP 4).

#### [x] **MCP-Server generisch über Posts/Publikationen produktisieren**

Einordnung: PRODUKTISIERT (bestehende Automatisierung verallgemeinert, nicht ersetzt). Begründung: Wirkt auf Story-/Rendition-Modell statt fester Blog/LinkedIn-Struktur (ERW MCP generisch).

Ergebnis: **Einordnung: PRODUKTISIERT** – der MCP-Server ist als bestehende Automatisierung aus Version A unverändert in seiner Logik beizubehalten und lediglich vom festen Blog/LinkedIn-Schema auf das generische Story-/Rendition-Modell zu verallgemeinern, sodass er als mandantenübergreifendes Standardfeature über Posts/Publikationen wirkt (ERW MCP generisch).

#### [x] **Dokument-Export-Engine (ODF/LibreOffice, headless Container) produktisieren**

Einordnung: PRODUKTISIERT (interner Standardpfad, einheitliche Engine für alle Mandanten, OP 8). Begründung: Pipeline Markdown→ODF→Word/PDF über headless LibreOffice-Container-Service; Export als Teil des Channel-Interface. Branding-Vorlage ist der einzige mandantenspezifische Eingriff. Runtime-Betreibbarkeit angenommen (PUB-09, 🟡).

Ergebnis: **Einordnung: PRODUKTISIERT** – die Dokument-Export-Engine ist als interner Standardpfad (Pipeline Markdown→ODF→Word/PDF über einen eigenständigen headless LibreOffice-Container-Service) für alle Mandanten einheitlich festzuschreiben und als `export`-Methode in das Channel-Interface zu integrieren, wobei die mandantenspezifische ODT-Branding-Vorlage der einzige konfigurierbare Eingriff bleibt und die Betreibbarkeit der LibreOffice-Runtime in der Ziel-Topologie als getragene Annahme gilt (OP 8, PUB-09 🟡).

#### [x] **Publikationsformate (Länge/Tonalität/Struktur/Prompt) konfigurierbar machen**

Einordnung: KONFIGURIERBAR pro Mandant. Begründung: Jeder Kunde hat individuellen Format-/Kanalbedarf (PROD-05); deklarative Konfiguration genügt (KI-05, 🟡 — nicht belegt). Frei definierbare Liste in settings, org_id-isoliert, per UI verwaltbar (OP 5). Startset: Blog short/long, Article, Rundschreiben, Pressemeldung, LinkedIn, WhatsApp, Presse-Varianten.

Ergebnis: **Einordnung: KONFIGURIERBAR pro Mandant** – Publikationsformate (Länge/Tonalität/Struktur/Prompt) sind als frei definierbare, `org_id`-isolierte und per UI verwaltbare Liste in der `settings`-Tabelle deklarativ konfigurierbar zu machen (Startset: Blog short/long, Article, Rundschreiben, Pressemeldung, LinkedIn, WhatsApp, Presse-Varianten), da jeder Kunde individuellen Format-/Kanalbedarf hat (PROD-05) und eine rein deklarative Konfiguration ohne Codeänderung am Kern genügt (OP 5, KI-05 🟡 — nicht belegt).

#### [x] **Channel-Verwaltung per UI konfigurierbar machen**

Einordnung: KONFIGURIERBAR pro Mandant. Begründung: Kanal-Set ist mandantenindividuell, Erweiterung ohne Kerneingriff. Channels anlegen/konfigurieren (Prompts/Methoden pro Channel), mandantengebunden in den Settings (OP 5, OPS-06).

Ergebnis: **Einordnung: KONFIGURIERBAR pro Mandant** – die Channel-Verwaltung ist als deklarativ konfigurierbares Feature umzusetzen, das es Mandanten erlaubt, Channels mandantengebunden in den `org_id`-isolierten Settings per UI anzulegen und zu konfigurieren (Prompts/Methoden pro Channel), da das Kanal-Set mandantenindividuell ist und ohne Kerneingriff erweiterbar sein muss (OP 5, OPS-06).

#### [x] **Pro-Format-Prompts konfigurierbar machen**

Einordnung: KONFIGURIERBAR pro Mandant. Begründung: Format-Output ist kundenspezifisch; eigener Prompt je Format mit deklarierter Länge/Tonalität/Struktur. Liegt unterhalb des geheimen, produktweit geschützten System-Prompts; Prompts mandantenisoliert.

Ergebnis: **Einordnung: KONFIGURIERBAR pro Mandant** – Pro-Format-Prompts sind als deklarativ konfigurierbares Feature umzusetzen, bei dem je Publikationsformat ein eigener Prompt mit deklarierter Länge/Tonalität/Struktur `org_id`-isoliert in der `settings`-Tabelle hinterlegt wird, da der Format-Output kundenspezifisch ist und diese Prompts unterhalb des geheimen, produktweit geschützten System-Prompts liegen, der mandantenübergreifend und niemals offengelegt bleibt.

#### [x] **Branding-Vorlagen (Word/ODF) konfigurierbar machen**

Einordnung: KONFIGURIERBAR pro Mandant. Begründung: Branding ist je Kunde verschieden; einmalig hochladbare ODT-Vorlage pro Mandant — einziger mandantenspezifischer Eingriff im Export-Pfad. Vorlage org_id-gebunden, wirkt im headless-LibreOffice-Pfad (OP 8, PUB-07).

Ergebnis: **Einordnung: KONFIGURIERBAR pro Mandant** – Branding-Vorlagen (Word/ODF) sind als einmalig hochladbare, `org_id`-gebundene ODT-Vorlage pro Mandant deklarativ konfigurierbar zu machen, die im headless-LibreOffice-Export-Pfad wirkt und den einzigen mandantenspezifischen Eingriff in die ansonsten produktweit einheitliche Export-Engine darstellt, da das Branding je Kunde verschieden ist (OP 8, PUB-07).

#### [x] **Modell-Registry / Prompts zur Laufzeit editierbar machen**

Einordnung: KONFIGURIERBAR pro Mandant. Begründung: Modell-IDs driften; System bleibt provider-agnostisch, Modell überschreibbar (KI-03, KI-04, OP 13). In settings, mandantengebunden, vom User setzbar (global + pro Format).

Ergebnis: **Einordnung: KONFIGURIERBAR pro Mandant** – die Modell-Registry und die zugehörigen Prompts sind zur Laufzeit editierbar und `org_id`-gebunden in der `settings`-Tabelle (global sowie pro Format vom User setzbar) zu hinterlegen, da Modell-IDs driften und das System provider-agnostisch mit überschreibbarem Modell bleiben muss (KI-03, KI-04, OP 13).

#### [x] **Download-/Versand-Adapter (md/docx/odt/pdf, optional E-Mail) konfigurierbar machen**

Einordnung: KONFIGURIERBAR pro Mandant. Begründung: Versandbedarf ist mandantenabhängig (z. B. automatischer E-Mail-Versand beim Publishen). Capability je Channel-Klasse, mandantengebunden konfiguriert; E-Mail-Versand-Komponente als optionaler Adapter.

Ergebnis: **Einordnung: KONFIGURIERBAR pro Mandant** – der Download-/Versand-Adapter (Markdown/Word/ODT/PDF-Export, optional automatischer E-Mail-Versand beim Publishen) ist als mandantengebunden konfigurierbarer Channel mit aktivierbarer Versand-Capability je Channel-Klasse umzusetzen, wobei die E-Mail-Versand-Komponente einen optionalen Adapter darstellt, da der Versandbedarf mandantenabhängig ist.

#### [x] **Mehrere Seeds pro Post als Standardfeature des Kernmodells festschreiben**

Einordnung: PRODUKTISIERT (Standardfeature des Kernmodells, OP 3). Begründung: Story trägt n Seeds; Kardinalität Post↔Seed entschieden. Geringere Umsetzungspriorität, da reines Modell-Detail des bereits produktisierten Kernmodells.

Ergebnis: **Einordnung: PRODUKTISIERT** – die Kardinalität „mehrere Seeds pro Post" ist als Standardfeature des bereits produktisierten dreistufigen Kernmodells festzuschreiben, bei dem eine Story n Seeds trägt (OP 3), wobei die Umsetzungspriorität gering bleibt, da es sich um ein reines Modell-Detail des Kernmodells handelt.