
### 1. Gewähltes Isolationsmodell

**Entscheidung (OP 1):** **Pooled Database (Modell A)** — eine gemeinsame PostgreSQL-Datenbank für alle Mandanten, mit einer **Mandanten-Diskriminatorspalte** `org_id` **auf jeder mandantengebundenen Zeile** und Isolation über **Row-Level-Security (RLS)**.

- **Tenant-Definition:** Ein Mandant ist eine **Organisation/Workspace**.
- **Mitgliedschaft:** Nutzer werden über **Memberships mit Rolle** (Admin / Redakteur) einer Organisation zugeordnet.
- **Verworfen:** Modell B (eine App + DB pro Kunde) und Modell C (kompletter Stack pro Kunde).

### 2. Begründung der Modellwahl

| Kriterium | Bewertung Modell A (gewählt) |
| --- | --- |
| Sicherheit | Isolation hängt vollständig an korrekt umgesetzter RLS. Hoher Security-Impact (OPS-03): ein RLS-Fehler kann fremde Inhalte exponieren. Erfordert lückenlose Policy-Disziplin. |
| Skalierbarkeit | Laut Seed „am schwergewichtigsten in der Datenbank" (geteilte DB, hoher Isolations-/Last-Aufwand), zugleich „am leichtgewichtigsten im Rollout". Konkrete Zielwerte sind im Seed nicht definiert (OP 15, bewusst ausgeklammert). |
| Betriebsaufwand | Minimal: nur ein Container/Stack und ein versionierter Releasestrang sind zu betreiben — unterstützt das Ein-Produkt-Prinzip ohne separate Stacks pro Kunde. |
| Kosten | Niedrigste Infrastruktur- und Wartungskosten durch geteilte Ressourcen und einen einzigen Deployment-Pfad. |

**Ausschlaggebend:** Modell A ist am leichtgewichtigsten im Rollout, vermeidet Code-Forks und fügt sich nahtlos in das Fundament der Version B (die bereits RLS nutzt). Die Release-Disziplin profitiert vom einzigen Codestrang.

### 3. Technische Datenisolation und Zugriffstrennung

#### Datenmodell

- **Durchgängige Mandantenbindung:** Jede mandantengebundene Entität — **Story, Rendition, Channel, Settings** — trägt eine `org_id`-Referenz. Es existiert keine mandantenlose relevante Tabelle (überprüfbares Kriterium).
- Die Mandanten-Dimension ist **auf Architekturebene verankert**, nicht nachgelagert ergänzt.

#### Zugriffsdurchsetzung

- **Row-Level-Security als primärer Isolationsmechanismus:** RLS aus Version B (Referenz: Service-Role voll, public `SELECT` nur wo `published = true`) wird um die `org_id`**-Dimension erweitert**.
- Technisch durchgesetzt wird, dass **kein Mandant Posts/Renditions/Settings anderer Mandanten lesen oder verändern kann** — auf Datenbankebene, nicht nur in der Anwendungslogik.
- Die Zugriffspfade (dünne API-Routen als Orchestratoren, Logik in `src/lib/**`) bleiben in der Schichtung unverändert; die Mandantenfilterung greift auf Persistenzebene.

#### Authentifizierung und Rollen

- **Auth-Pfade:** NextAuth mit **Google-OAuth + Microsoft 365/Azure AD** zusammengeführt, zusätzlich **E-Mail/Passwort** (mit sicherem Passwort-Hashing und Brute-Force-Schutz; konkrete Vorgaben im Seed nicht genannt, abgeleitet).
- **Rollensystem (OP 14):** Pro Mandant zwei Rollen:
  - **Admin** — verwaltet User/Rollen/Settings der eigenen Organisation
  - **Redakteur** — arbeitet inhaltlich

#### Schutz des geheimen System-Prompts

- Der **übergeordnete Redakteurs-/System-Prompt** ist ein **mandantenübergreifender Produktkern-Wert** und liegt bewusst **außerhalb** der mandantenkonfigurierbaren Ebene.
- Er darf **weder im Frontend, in API-Responses, in Logs noch gegenüber Mandanten/Nutzern** offengelegt werden (überprüfbar: keine Ausspielung über erreichbare Schnittstellen).

### 4. Pro Mandant konfigurierbare Aspekte

| Aspekt | Konfigurierbarkeit | Verwaltung |
| --- | --- | --- |
| Publikationsformate (Länge/Tonalität/Struktur/Prompt) | Frei definierbare Liste pro Mandant, ohne Codeänderung am Kern | Idealerweise per UI in den Settings (OP 5) |
| Channels (Prompts pro Channel, Publishing-Methoden) | Anleg- und konfigurierbar pro Mandant | Channel-Verwaltung per UI in den Settings |
| Format-/Kanal-/Prompt-Konfiguration | Pro Mandant isoliert gehalten | Settings-Tabelle, mandantengebunden |
| Branding (Word-/ODF-Vorlagen) | Kundenspezifische ODT-Vorlage, einmalig hochladbar | Pro Mandant; Branding via ODT-Vorlage im Export-Pfad (OP 8) |
| Modell-Registry / Prompts (global + pro Format) | Zur Laufzeit editierbar (Modell-IDs driften) | Settings; provider-agnostisch, vom User setzbar |

**Verwaltung der Konfiguration:**

- Settings werden von der CMS-Story (Version A) in eine **Supabase-**`settings`**-Tabelle** überführt (Default-Modell, Prompts global + pro Format, Notes, Labels, Schedules, MCP-Tokens).
- Die `settings`-Tabelle ist **mandantengebunden** (`org_id`) und unterliegt derselben RLS-Isolation wie die Inhaltsentitäten.
- Konfiguration erfolgt **deklarativ** — neue Formate entstehen ohne Kerneingriff (Annahme KI-05).

### 5. Offene Risiken

- **RLS-Korrektheit (🔴 hoch):** Die gesamte Mandantenisolation hängt an lückenlos und korrekt umgesetzter RLS. Ein Policy-Fehler exponiert fremde Inhalte (OPS-03, hoher Security-Impact).
- **Geltungsbereich des geheimen System-Prompts (OP 23):** Ob der Prompt mandantenübergreifend einheitlich oder pro Mandant gilt sowie dessen vollständige Absicherung gegen Offenlegung wurde als „wird nicht gemacht" markiert — betrifft jedoch den zentralen Produktwert.
- **Skalierungsverhalten (OP 15):** Modell A ist datenbankseitig am schwergewichtigsten; quantifizierte Performance-/Skalierungs-Zielwerte (Mandantenanzahl, Datenvolumen, Durchsatz) sind nicht definiert und bewusst ausgeklammert — getragenes Restrisiko für ein verkauftes SaaS.
- **Monitoring/Logging/Backup (OP 19):** Kein Konzept spezifiziert — bei geteilter DB mehrerer Mandanten besonders relevant, als „wird nicht gemacht" klassifiziert.
- **Mehr-Zeitzonen-Bedarf (OP 16, SCH-04):** Der Scheduler ist fest auf `Europe/Berlin` verdrahtet; mehrere Mandanten könnten künftig Mehr-Zeitzonen-Bedarf erzeugen — zunächst nicht umgesetzt.
- **Compliance/DSGVO/Audit (OP 18):** Keine spezifischen Anforderungen festgelegt, obwohl SaaS-/Mehr-Mandanten-Charakter und Verarbeitung von Kundeninhalten Datenschutzrelevanz nahelegen.

### 6. Getroffene Annahmen

- **OPS-07 / OPS-02:** Modell A (geteilte DB + RLS) ist der wahrscheinlichste und gewählte Kandidat unter den drei Betriebsmodellen (bestätigt durch OP 1).
- **DATA-08:** Jede mandantengebundene Entität trägt eine Mandanten-Referenz.
- **PROD-05:** Es existiert ein zahlungsbereiter Markt mehrerer Kunden mit individuellem Kanal-/Formatbedarf.
- **OPS-08:** E-Mail/Passwort-Login erfordert sicheres Hashing und Brute-Force-Schutz (konkrete Vorgaben im Seed nicht genannt).
- **KI-05:** Eine rein deklarative Format-Konfiguration genügt für hochwertige Outputs ohne format-spezifischen Code.
- **GAP-01 / OP 16:** Zunächst keine I18N/L10N; später sollen Posts übersetzbar sein.