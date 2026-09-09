Die folgende Liste enthält ausschließlich **nicht-funktionale Anforderungen**, die gegenüber der Basisversion (Version A, `io.meimberg.contentmanager`) neu hinzukommen, angepasst oder erweitert werden müssen. Unveränderte, bereits erfüllte nicht-funktionale Eigenschaften der Basisversion sind nicht aufgeführt.

Jeder Eintrag ist gekennzeichnet als **\[NEU\]** (neue Anforderung), **\[ERW\]** (Erweiterung) oder **\[ÄND\]** (Änderung). Sofern eine Anforderung nur implizit im Seed angelegt ist, ist sie als **abgeleitete Annahme** markiert.

### 1. Sicherheit & Datenschutz

- **\[NEU\] Schutz des geheimen Redakteurs-/System-Prompts.** Der übergeordnete Redakteurs-/System-Prompt ist als zentraler Produktwert geheim zu halten und darf weder im Frontend, in API-Responses, in Logs noch gegenüber Mandanten/Nutzern offengelegt werden (§4.1, §14.3). *Überprüfbar: keine Ausspielung des Prompt-Texts über erreichbare Schnittstellen.*
- **\[NEU\] Sichere Mandanten-Zugriffskontrolle.** Es muss technisch durchgesetzt werden, dass kein Mandant Daten (Posts/Publikationen/Settings) anderer Mandanten lesen oder verändern kann; Version B nutzt hierfür Row-Level-Security (RLS) als Referenz (§8.2, §11.2, §14.9). *Hoher Security-Impact laut Seed.*
- **\[ERW\] Erweiterung der Auth-Pfade.** Neben den bestehenden drei Auth-Pfaden (NextAuth/Google, Bearer `CRON_SECRET`, gehashter MCP-Token) müssen Microsoft-365/Azure-AD sowie E-Mail/Passwort sicher integriert werden (§9, §14.9). *Abgeleitete Annahme: E-Mail/Passwort erfordert sicheres Passwort-Hashing und Schutz gegen Brute-Force; konkrete Vorgaben fehlen im Seed.*
- **\[ERW\] Secret-Management für zusätzliche Provider/Channels.** Mit Azure AD, breiterem Publer-Kanalset und Dokument-/E-Mail-Versand kommen neue Credentials hinzu, die sicher zu verwalten sind (§9, §14.6). *Abgeleitete Annahme: konkrete Secret-Store-Anforderungen nicht spezifiziert.*

### 2. Mandantentrennung & Datenisolation

- **\[NEU\] Vollständige Mandantenfähigkeit des Datenmodells.** Das Datenmodell muss durchgängig mandantenbasiert sein (Mandanten-Zuordnung auf allen relevanten Entitäten Post/Publikation/Channel/Settings) (§8.2, §14.9). *Überprüfbar: jede mandantengebundene Tabelle trägt eine Mandanten-Referenz.*
- **\[NEU\] Mandantenspezifische Konfiguration.** Format-/Kanal-/Prompt-/Branding-Konfiguration (Word-/ODF-Vorlagen) muss pro Mandant isoliert gehalten werden, da jeder Kunde eine individuelle Kanal-/Formatliste hat (§2, §6.5, §14.4).
- **\[OFFENER PUNKT\] Betriebs-/Mandantenmodell ungeklärt.** Die Wahl zwischen Modell A (gemeinsame DB + Container, vollständig mandantengetrennt), B (App + DB pro Kunde) und C (voller Stack pro Kunde) ist die größte offene Architekturfrage und bestimmt Datenisolation, Rollout-Aufwand und Security-Impact (§8.2, §15.5). *Bis zur Entscheidung können konkrete Isolationsanforderungen nicht abschließend festgelegt werden.*

### 3. Betrieb, Deployment & Release

- **\[NEU\] Echte, versionierte Releases statt Hot-Fixing.** Sobald das Produkt verkauft wird, muss mit versionierten, nachvollziehbaren Releases gearbeitet werden statt mit ad-hoc-Updates; die Release-Disziplin ist abhängig vom Mandantenmodell (§8.1, §14.12). *Überprüfbar: jede Auslieferung trägt eine eindeutige Version.*
- **\[ÄND\] Self-hosted-Supabase-Stack als Deployment-Fundament.** Das Deployment muss auf den Self-hosted-Supabase-Stack (Docker-Compose, Traefik, GitLab-CI) der Version B umgestellt werden statt auf das Storyblok-basierte Betriebsmodell der Version A (§11.10, §14.12).
- **\[ÄND\] Persistenz-Betrieb statt CMS-Abhängigkeit.** Mit dem Umzug Storyblok → Supabase entfällt die Abhängigkeit von Storyblok-Rate-Limits (\~5 req/s) und CMS-Caching als Primärspeicher; die bestehenden Backoff-/Cache-Mechanismen sind auf die DB-Persistenz hin anzupassen (§7.1, §12.3, §12.12). *Abgeleitete Annahme: konkrete neue Performance-Zielwerte sind im Seed nicht genannt.*

### 4. Wartbarkeit & Erweiterbarkeit

- **\[NEU\] Kein Fork des Kerns / Ein-Produkt-Prinzip.** Es darf nur ein einziges Produkt existieren; ein erneutes Forken des Kerns (wie bei der ZDB-Version geschehen) ist auszuschließen (§1.4, §7.2). *Überprüfbar: ZDB-Anforderungen werden auf Requirements-Ebene integriert, nicht als separater Codestrang geführt.*
- **\[NEU\] Agentenfreundliche Erweiterbarkeit von Channels.** Neue Kanäle müssen sich über ein klares Channel-Interface als reine Implementierungsarbeit ergänzen lassen, ohne Architekturentscheidungen — explizit so gestaltet, dass Agenten dies leisten können (§6.2, §14.6). *Überprüfbar: ein neuer Channel erfordert nur Interface-Implementierung.*
- **\[NEU\] Frei erweiterbare Publikationsformate ohne Codeänderung am Kern.** Publikationsformate (Länge/Tonalität/Struktur/Prompt) müssen als Konfiguration definierbar sein, idealerweise per UI (§2, §14.4, §14.8). *Überprüfbar: neues Format ohne Kerneingriff anlegbar.*
- **\[NEU\] Editierbarkeit von Prompts und Modell-Registry zur Laufzeit.** Prompts (global/pro Format) und die Modellauswahl müssen bewusst editierbar bleiben, da Modell-IDs driften (§4.2, §12-Hinweis, §14.8). *Erhalt einer bestehenden Eigenschaft, jetzt generalisiert auf das Formatmodell.*
- **\[ÄND\] Sauberere Architektur-Kopplung.** Die heute „nicht sauber aufgesetzte" Kopplung (LinkedIn↔Blog) muss im generalisierten Post→Publikation→Channel-Modell aufgelöst werden (§1.2, §7.3). *Abgeleitete Annahme: explizite Architekturqualitätsziele nicht beziffert.*

### 5. Kompatibilität & Interoperabilität

- **\[NEU\] Zielsystem-Agnostik / Channel-Agnostik.** Das Produkt muss kanal- und zielsystem-agnostisch sein; jedes Zielsystem wird per Adapter angebunden (Faustregel: ein Adapter je Zielsystem) (§1.4, §6.2, §7.2).
- **\[ÄND\] Storyblok von Primärspeicher zu Publishing-Adapter.** Storyblok muss als reiner Publishing-Adapter unter der Adapter-Architektur weiterbetrieben werden, konsistent mit dem Post→Publikation→Channel-Modell (§7.1, §12.12).
- **\[NEU\] Dokument-Export-Interoperabilität (Word/PDF/ODF).** Das System muss Markdown verlustarm nach HTML, Word und PDF überführen können; intern wird ODF/LibreOffice als Engine favorisiert (Word→PDF), unter Berücksichtigung kundenspezifischer Vorlagen (§6.5, §14.6). *Überprüfbar: aus einer Markdown-Publikation lassen sich Word und PDF erzeugen. Offener Punkt: finale Engine-Wahl (§15.7).*
- **\[ÄND\] Format-Kanonisierung auf Markdown + Text.** Zwei kanonische Feld-Zielformate (Markdown, reiner Text); Markdown muss Code-Sections und Tabellen unterstützen (§3.3, §14.4). *Offener Punkt: Behandlung von HTML/JSON als Sonderfälle (§15.6).*

### 6. Bedienbarkeit

- **\[NEU\] Multi-Format-Bedienkonzept.** Das neu zu bauende Frontend muss die parallele Bearbeitung mehrerer Publikationen pro Quelle ergonomisch über Tabs ermöglichen (Referenz: ZDB-Multi-Format-UI) (§14.5). *Funktional-nah; hier als Usability-Qualitätsziel des Neubaus.*
- **\[ERW\] Beibehaltung etablierter UI-Muster.** Die als Referenz dienenden UI-Muster (modale Bestätigungen statt nativer Dialoge, Toasts, Status-Pipelines, URL-State) sind im Neubau zu erhalten (§12.9). *Abgeleitete Annahme: Übernahme als Qualitätsanker, nicht als zu erhaltender Code.*

### 7. Performance & Skalierbarkeit

- **\[OFFENER PUNKT\] Skalierungsverhalten je Mandantenmodell.** Modell A wird als „am schwergewichtigsten in der Datenbank" beschrieben (geteilte DB, hoher Isolations-/Last-Aufwand), Modell A zugleich „am leichtgewichtigsten im Rollout" (§8.2). Konkrete Performance-/Skalierungs-Zielwerte (Mandantenanzahl, Datenvolumen, Durchsatz) sind im Seed **nicht genannt** und müssen vor der Modellentscheidung definiert werden.
- **\[ERW\] Parallele Generierung mehrerer Formate.** Da aus einer Quelle n parallele Publikationen entstehen, steigt die Last auf die KI-Generierung gegenüber der Basis; entsprechendes Last-/Nebenläufigkeitsverhalten ist zu berücksichtigen (§11.3, §14.3). *Abgeleitete Annahme: keine Zielwerte im Seed.*

### 8. Verfügbarkeit & Zuverlässigkeit

- **\[ERW\] Zuverlässigkeit des erweiterten Schedulers.** Die bestehenden Zuverlässigkeitsmechanismen (Retry-Cap von 3 Fehlversuchen → `failed`, Orphan-Handling, status-basierte Idempotenz, „verpasste Slots feuern am geplanten Datum") müssen beim Ausbau des Schedulers erhalten und auf das neue Modell übertragen werden (§5, §10.5, §12.5). *Offener Punkt: Horizont-Diskrepanz 8 vs. 12 Wochen ungeklärt (§15.11).*
- **\[ERW\] Idempotenz über mehrere Channels.** Die in A nur für LinkedIn/Publer bestehenden Idempotenz-Garantien (published⇒409/block, queued⇒replace) müssen auf das breitere Live-Kanalset generalisiert werden (§12.11, §14.6). *Abgeleitete Annahme.*

### 9. Internationalisierung & Lokalisierung

- **\[OFFENER PUNKT\] Keine expliziten I18N/L10N-Anforderungen.** Der Seed nennt durchgängig deutschsprachige Inhalte/Prompts und eine feste Scheduler-Zeitzone `Europe/Berlin`. Anforderungen zu Mehrsprachigkeit oder Mehr-Zeitzonen-Betrieb (relevant bei mehreren Mandanten) sind **nicht erkennbar** und bleiben als offener Punkt festzuhalten. *Abgeleitete Annahme: Mandantenfähigkeit könnte künftig Mehr-Zeitzonen-Bedarf erzeugen; im Seed nicht entschieden.*

### 10. Barrierefreiheit

- **\[OFFENER PUNKT\] Keine Barrierefreiheits-Anforderungen im Seed.** Trotz vollständigem Frontend-Neubau enthält der Seed keine expliziten Vorgaben zu Barrierefreiheit (z. B. WCAG-Konformität). Dies ist als offener Punkt zu vermerken und nicht stillschweigend anzunehmen.

### 11. Compliance & regulatorische Vorgaben

- **\[OFFENER PUNKT\] Keine expliziten Compliance-Vorgaben.** Der Seed nennt keine konkreten regulatorischen Anforderungen (z. B. DSGVO-spezifische Maßnahmen, Aufbewahrung, Audit-Logging). Aus dem SaaS-/Mehr-Mandanten-Charakter und der Verarbeitung von Kundeninhalten lässt sich Datenschutzrelevanz **ableiten**, jedoch ohne konkrete Vorgaben im Seed. *Als offener Punkt zu führen.*

### Zusammenfassende Hinweise

| Bereich | Status im Seed |
| --- | --- |
| Sicherheit / Mandantentrennung | konkret adressiert (hoher Security-Impact), Modell aber offen |
| Wartbarkeit / Erweiterbarkeit | konkret adressiert (Adapter, kein Fork, freie Formate) |
| Kompatibilität / Export | adressiert, Engine-Wahl offen |
| Betrieb / Release | adressiert, abhängig vom Mandantenmodell |
| Performance / Skalierung | nur qualitativ, keine Zielwerte |
| I18N / Barrierefreiheit / Compliance | keine expliziten Anforderungen im Seed |

- Mehrere nicht-funktionale Anforderungen hängen direkt von der noch ausstehenden **Betriebs-/Mandantenmodell-Entscheidung (§8.2, §15.5)** ab und können erst danach mit konkreten Zielwerten versehen werden.
- Für **Performance/Skalierbarkeit, Internationalisierung, Barrierefreiheit und Compliance** liefert der Seed keine bzw. nur implizite Hinweise; diese Lücken sind oben als offene Punkte ausgewiesen und wurden nicht durch erfundene Zielwerte gefüllt.