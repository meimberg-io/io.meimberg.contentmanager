### Funktionale Delta-Anforderungen

Die folgende Liste enthält ausschließlich funktionale Anforderungen, die gegenüber der Basisversion (Version A, `io.meimberg.contentmanager`) neu sind, erweitert oder geändert werden. Unverändert übernommene Funktionalität (z. B. die bestehende Per-Feld-KI-Generierung, der Block-Editor, der Scheduler-Kern, Intake via MS Graph, MCP-Server) ist nicht aufgeführt.

Jeder Eintrag ist gekennzeichnet als **\[NEU\]** (Neuentwicklung), **\[ERW\]** (Erweiterung bestehender Funktion) oder **\[ÄND\]** (Änderung bestehenden Verhaltens).

#### 1. Datenmodell & Entitätenstruktur

- **\[ÄND\] Primärpersistenz in relationaler Datenbank.** Das System muss jeden Beitrag primär in einer lokalen relationalen Datenbank (Supabase/PostgreSQL) speichern statt in Storyblok. Ziel: Storyblok wird von der Datenbank zum reinen Publishing-Ziel degradiert; Voraussetzung für Mandantenfähigkeit und Adapter-Architektur.
- **\[NEU\] Dreistufiges Entitätenmodell Post → Publikation → Channel.** Das System muss eine Quelle (Post mit zugehörigem Seed) abbilden, aus der mehrere Publikationen (kundenspezifische Zielformate) erzeugt werden, die wiederum in Channels publiziert werden können. *Ableitbar/unvollständig: Der finale Begriff für „Publikation" ist im Seed noch nicht festgelegt (§7.3, §15.1).*
- **\[NEU\] Mehrere parallele Publikationen aus einer Quelle.** Das System muss aus einer Quelle n parallele Publikationen erzeugen können, die jeweils ein eigenständiges Dokument sind und unabhängig editier- und publizierbar bleiben (Generalisierung des ZDB-`content_formats`-Prinzips). Bestand A kennt nur die feste LinkedIn↔Blog-Kopplung.
- **\[ÄND\] Statusführung pro Publikation statt pro Post.** Das System muss Reife- und Publish-Status (content_complete + confirmed_at, Publish-State, Publer/Channel-State) je Publikation getrennt führen, nicht pauschal pro Post.
- **\[NEU\] Mehrere Seeds pro Post.** *Ableitbar/unvollständig: Im Seed angedeutet, aber nicht entschieden, ob ein Post mehrere Seeds tragen kann (§7.3, §14.2). Es fehlt die Entscheidung über Kardinalität und fachliches Verhalten.*

#### 2. Publikationsformate & Feldformate

- **\[NEU\] Frei definierbare Publikationsformate.** Der Nutzer/Kunde muss eine eigene, frei anpassbare Liste von Publikationsformaten definieren können. Ziel: Mandantenfähigkeit, da jeder Kunde eine individuelle Kanal-/Formatliste hat. *Ableitbar/unvollständig: Ob dies vollständig per UI erfolgt, ist im Seed nicht final entschieden (§2, §15.3).*
- **\[ERW\] Format trägt Längen-, Tonalitäts- und Strukturkonfiguration.** Jedes Publikationsformat muss eine deklarative Konfiguration für Länge, Tonalität und Struktur tragen (aus Version B zu übernehmen und zu generalisieren). Bestand A steuert dies nur über den fixen `cm_blog_variant` (short/long).
- **\[NEU\] Erweitertes Startset an Formaten.** Das System muss zusätzlich zu Blog (short/long) und Article die Formate Rundschreiben, Pressemeldung, LinkedIn und WhatsApp sowie Presse-Varianten (z. B. an Spiegel/Springer) als vordefinierbare Formate unterstützen.
- **\[ÄND\] Markdown als kanonisches Feldformat.** Das System muss Content auf Markdown als kanonisches Feldformat reduzieren (mit reinem Text als zweiter Ausprägung), woraus HTML/Word/PDF ableitbar sind. Markdown muss Code-Sections und Tabellen unterstützen. *Ableitbar/unvollständig: Bestätigung der Reduktion und Behandlung von HTML/JSON als Sonderfälle ist offen (§3.3, §15.6).*

#### 3. Editor

- **\[NEU\] Multi-Format-Tab-UI.** Der Nutzer muss pro Publikation einen eigenen Editor-Tab erhalten, je mit Generate-, Optimize- und Copy-Funktion (aus Version B zu übernehmen). Bestand A bietet nur Blog-Body-Editor plus separate LinkedIn-Sektion.

#### 4. KI-Generierung

- **\[NEU\] Übergeordneter geheimer Redakteurs-/System-Prompt.** Das System muss einen geheimen, übergeordneten Redakteurs-/System-Prompt führen, der über allen Format-Prompts liegt und als zentraler Produktwert nicht offengelegt wird.
- **\[ERW\] Pro Publikationsformat ein eigener Prompt.** Das System muss für jedes (frei definierbare) Publikationsformat einen eigenen Prompt mit deklarierter Länge, Tonalität und Struktur unterstützen. Erweiterung der bestehenden feld-/variantenbasierten Prompts auf das generalisierte Formatmodell.
- **\[ERW\] Bilder zwischen Publikationen teilbar.** Das System muss ermöglichen, ein generiertes Bild von mehreren Publikationen gemeinsam zu nutzen (z. B. LinkedIn und Blog teilen ein Bild, WhatsApp nicht).

#### 5. Kanäle, Publishing & Adapter

- **\[NEU\] Adapter-Architektur mit klarem Channel-Interface.** Das System muss eine Adapter-Architektur bereitstellen, in der jedes Zielsystem ein klar definiertes Channel-Interface implementiert. Ziel: Neue Kanäle sind reine Implementierungsarbeit ohne Architekturentscheidungen. *Ableitbar/unvollständig: Die konkreten Interface-Methoden (genannt u. a. generate-target-payload, publish, schedule, export, dispatch-email) sind noch zu spezifizieren (§15.9).*
- **\[ERW\] Storyblok als Publishing-Adapter.** Das System muss Storyblok-Publishing als einen Channel-Adapter unter der neuen Architektur bereitstellen (statt als Primärspeicher). Änderung des Architekturzwecks gegenüber Bestand A.
- **\[ERW\] Breiteres Live-Kanalset.** Das System muss zusätzlich zu LinkedIn die Kanäle Instagram, Facebook, Pinterest, Twitter/X und Threads (mit plattformspezifischen Formattern) live verdrahtet bereitstellen (aus Version B zu übernehmen; in A nur als inaktives Scaffolding vorhanden).
- **\[NEU\] Download-/Versand-Adapter pro Channel.** Das System muss pro Channel Download- und Versand-Möglichkeiten bieten: Markdown-, Word- und PDF-Export sowie optional den automatischen E-Mail-Versand des erzeugten Dokuments beim Publishen.
- **\[NEU\] Dokument-Export mit Branding-Vorlage.** Das System muss kundenspezifische Word-/ODF-Vorlagen für Dokument-Export hochladbar machen, sodass Branding berücksichtigt wird. *Ableitbar/unvollständig: Die Wahl der Export-Engine (Word-Vorlage vs. ODF/LibreOffice; Word→PDF) ist noch zu entscheiden (§6.5, §15.7).*
- **\[NEU\] Klärung LinkedIn direkt per API.** *Ableitbar/unvollständig: Es ist offen, ob LinkedIn künftig direkt per API statt über Publer angebunden wird und welche Publer-Mehrwerte (z. B. Klick-Analytics) erhalten bleiben sollen (§6.3, §15.4). Eine Entscheidung fehlt.*

#### 6. Scheduling

- **\[ERW\] Scheduler beibehalten und ausbauen.** Das System muss den bestehenden Slot-/Kalender-Scheduler beibehalten und ausbauen. *Ableitbar/unvollständig: Der konkrete Ausbaubedarf ist im Seed nicht spezifiziert; zudem besteht eine ungeklärte Horizont-Diskrepanz (8 vs. 12 Wochen, §15.11).*

#### 7. Settings / Konfiguration

- **\[ÄND\] Settings in der Datenbank.** Das System muss Settings (Default-Modell, Prompts global und pro Format, Notes, Labels, Schedules, MCP-Tokens) in der Datenbank statt in einer CMS-Story persistieren (aus Version B zu übernehmen).
- **\[NEU\] Channel-Verwaltung per UI.** Der Nutzer muss Channels anlegen und konfigurieren können. *Ableitbar/unvollständig: Umfang der UI-gestützten Konfiguration ist offen (§14.8, §15.3).*

#### 8. Auth & Mandantenfähigkeit

- **\[ERW\] Zusammenführung beider OAuth-Provider.** Das System muss sowohl Google-OAuth (Version A) als auch Microsoft 365/Azure AD (Version B) als Login-Provider gemeinsam unterstützen.
- **\[NEU\] E-Mail/Passwort-Login.** Der Nutzer muss sich alternativ per E-Mail/Passwort anmelden können, ohne OAuth zu nutzen.
- **\[NEU\] Mandantenfähigkeit mit Datentrennung.** Das System muss mandantenfähig sein und sicherstellen, dass kein Mandant Posts/Publikationen anderer Mandanten sehen oder ändern kann. *Ableitbar/unvollständig: Das Betriebs-/Mandantenmodell (gemeinsame DB+Container / DB pro Kunde / Stack pro Kunde) ist noch nicht entschieden (§8.2, §15.5).*

#### 9. Status / Pipelines / Dashboard

- **\[ERW\] Mehr-Pipeline-Statusmodell pro Publikation.** Das System muss ein generalisiertes Statusmodell führen, das die Content-Reife sowie pro Channel einen Publish-/Schedule-Status (inkl. „scheduled") je Publikation abbildet. Erweiterung des bestehenden 2-Pipeline-Modells (Content/LinkedIn) auf beliebige Channels.

#### 10. MCP / Automatisierung

- **\[ERW\] MCP generisch über Posts/Publikationen.** Das System muss den bestehenden MCP-Server so verallgemeinern, dass er auf das neue Post-/Publikations-Modell wirkt (nicht mehr auf die feste Blog-/LinkedIn-Struktur).

### Hinweise zur Abgrenzung

- Nicht-funktionale Aspekte (Betriebsmodell-Entscheidung, Release-Disziplin, Self-hosted-Deployment-Topologie, Security-Impact der Datentrennung) sind hier bewusst ausgeklammert, soweit sie keine konkrete Funktion beschreiben; sie gehören in die GAP-/Betriebsmodell-Analyse.
- Mehrere Anforderungen sind als **ableitbar/unvollständig** markiert, weil der Seed sie explizit als offene Punkte (§15) führt. Die dort fehlenden Entscheidungen müssen vor der Ticket-Erstellung getroffen werden.
- Das Seed lässt durchgängig abweichende funktionale Anforderungen erkennen; eine Konstruktion zusätzlicher Inhalte war nicht erforderlich.