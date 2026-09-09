### Vorbemerkung zur Methodik

Die nachstehenden Annahmen wurden aus dem konsolidierten Seed sowie den abgeleiteten Anforderungslisten extrahiert. Es wird unterschieden zwischen:

- **\[EXPLIZIT\]** — im Seed ausdrücklich als Annahme, Vermutung oder offener Punkt benannt (häufig mit ⟦…⟧-Markierung oder Formulierungen wie „vermutlich", „möglicherweise", „noch offen").
- **\[IMPLIZIT\]** — von mir aus dem Kontext abgeleitet, mit Begründung und Sicherheitsgrad.

**Sicherheitsgrade für abgeleitete Annahmen:**

| Grad | Bedeutung |
| --- | --- |
| 🟢 hoch | Aus mehreren Quellstellen konsistent ableitbar, geringes Fehlinterpretationsrisiko |
| 🟡 mittel | Plausibel, aber durch konkurrierende Lesarten oder fehlende Bestätigung relativiert |
| 🔴 niedrig | Spekulativ, stark kontextabhängig, dringend zu verifizieren |

Jede Annahme ist mit einer **Prüf-ID** versehen, damit sie in späteren Phasen (GAP-Analyse, Lösungsdesign) referenziert, bestätigt oder verworfen werden kann.

---

### 1. Produkt- & Geschäftsannahmen

| ID | Typ | Annahme | Quelle / Begründung | Sicherheit |
| --- | --- | --- | --- | --- |
| PROD-01 | EXPLIZIT | Aus der bestehenden Individualsoftware lässt sich ein marktfähiges Produkt machen. | §1.4 „Aus dem Ding lässt sich ein Produkt machen." | — |
| PROD-02 | EXPLIZIT | Version A ist am weitesten entwickelt und dient als Basis für alles; Version B wird auf Requirements-Ebene dazugeholt. | §1.4 Leitsatz | — |
| PROD-03 | EXPLIZIT | Die beiden Versionen sind komplementär; das Gesamtprodukt ist ihre Vereinigung (Datenmodell B + Prozessfeatures A). | §1.4 „Zentrale Erkenntnis" | — |
| PROD-04 | EXPLIZIT | Der geheime Redakteurs-Prompt bildet den zentralen Produktwert ab. | §4.1 | — |
| PROD-05 | IMPLIZIT | Es existiert ein zahlungsbereiter Markt mehrerer Kunden mit jeweils individuellem Kanal-/Formatbedarf. | Mandantenfähigkeit und „jeder Kunde hat individuelle Kanalliste" (§2) implizieren mehrere Kunden; konkrete Marktvalidierung fehlt im Seed. | 🟡 mittel |
| PROD-06 | IMPLIZIT | Der ZDB ist ein (potenzieller) Referenzkunde, nicht nur ein technischer Fork. | B wurde „für den ZDB" gebaut (§1.2); Requirements werden produktiv integriert. | 🟡 mittel |
| PROD-07 | IMPLIZIT | Die Qualität der KI-Generierung („hervorragend funktioniert", §1.1) bleibt bei Generalisierung erhalten. | Annahme, dass der Mehrwert beim Umbau nicht verloren geht; Seed behauptet dies, belegt es aber nicht für das generalisierte Modell. | 🟡 mittel |

---

### 2. Architektur- & Technologieannahmen

| ID | Typ | Annahme | Quelle / Begründung | Sicherheit |
| --- | --- | --- | --- | --- |
| ARCH-01 | EXPLIZIT | Die Backend-Logik in src/lib/** bleibt im Kern erhalten und ist durch isolierte Storyblok-I/O-Module überschaubar migrierbar. | §1.4 Transformations-Eckpunkte, §12.12 | — |
| ARCH-02 | EXPLIZIT | Supabase/PostgreSQL ist die Zielarchitektur für die Primärpersistenz. | §1.3 Tabelle, §7.1, §14.1 | — |
| ARCH-03 | EXPLIZIT | Der Persistenz-Umzug Storyblok→Supabase ist „kein großes Problem", da agentengestützt umsetzbar. | §7.1 „dafür haben wir unsere Agenten" | — |
| ARCH-04 | EXPLIZIT | API-Routen sind dünne Orchestratoren; ein Wechsel des I/O dahinter lässt die Routen-Schnittstelle bestehen. | §1.4, §12.12 Punkt 3 | — |
| ARCH-05 | EXPLIZIT | Das Frontend wird komplett neu gebaut; die heutige UI dient nur als Referenz. | §1.4, §12.9 | — |
| ARCH-06 | EXPLIZIT | Jedes Zielsystem hat einen Adapter (Faustregel); Kanäle werden per Code erweitert. | §6.2 | — |
| ARCH-07 | IMPLIZIT | Das Datenmodell von B (posts + content_formats JSONB) ist als Fundament tragfähig genug für die generalisierte Post→Publikation→Channel-Struktur. | Seed setzt B-Modell als Basis (§14.1), aber die Dreistufigkeit (Channel als eigene Ebene) ist in B noch nicht ausmodelliert; content_formats ist nur ein JSONB-Key-Set. | 🟡 mittel |
| ARCH-08 | IMPLIZIT | Die bestehenden Querschnitts-Invarianten (Rate-Limit-Backoff, Caching, Idempotenz) lassen sich sinngemäß auf die DB-Persistenz übertragen. | §12.11 beschreibt Storyblok-spezifische Invarianten; bei Supabase entfallen einige (Rate-Limit ~5 req/s), andere müssen neu gedacht werden. | 🟡 mittel |
| ARCH-09 | IMPLIZIT | Das Channel-Interface lässt sich so abstrahieren, dass heterogene Ziele (Social-API, CMS, E-Mail-Versand, Datei-Download) unter einem Interface subsumierbar sind. | §6.2 / §15.9 nennen Methoden-Kandidaten (publish, schedule, export, dispatch-email), aber das Interface ist nicht spezifiziert. Heterogenität (Push-Social vs. Download) erhöht Abstraktionsrisiko. | 🔴 niedrig |
| ARCH-10 | IMPLIZIT | TipTap/ProseMirror bleibt die Editor-Basis und kann Multi-Format-Tabs tragen. | Beide Versionen nutzen TipTap (§10.9, §11.x); B hat Multi-Format-Tabs bereits. | 🟢 hoch |
| ARCH-11 | IMPLIZIT | Next.js 15 / React 18 / NextAuth bleiben der gemeinsame Tech-Stack des Zielprodukts. | Beide Versionen teilen diesen Stack (§13.1). | 🟢 hoch |

---

### 3. Datenmodell- & Entitätsannahmen

| ID | Typ | Annahme | Quelle / Begründung | Sicherheit |
| --- | --- | --- | --- | --- |
| DATA-01 | EXPLIZIT | Das Entitätenmodell ist dreistufig: Post → Publikation → Channel. | §7.3, §14.1 | — |
| DATA-02 | EXPLIZIT | Der finale Begriff für „Publikation" steht noch nicht fest. | §7.3, §15.1 | — |
| DATA-03 | EXPLIZIT | Ein Post hat immer (mindestens) einen Seed; ob mehrere möglich sind, ist offen. | §7.3, §14.2, Anhang A (⟦möglicherweise sogar mehrere, noch offen⟧) | — |
| DATA-04 | EXPLIZIT | Markdown wird kanonisches Feldformat; reiner Text als zweite Ausprägung (vorläufige Leitentscheidung). | §3.3 „Leitentscheidung (vorläufig)" | — |
| DATA-05 | EXPLIZIT | Markdown lässt sich verlustarm nach HTML überführen, umgekehrt (z. B. aus JSON) nicht unbedingt. | §3.3 | — |
| DATA-06 | EXPLIZIT | Status (content_complete, Publish-State) wird künftig pro Publikation statt pro Post geführt. | §14.1 | — |
| DATA-07 | IMPLIZIT | Bilder als teilbare Ressource erfordern eine eigene Asset-Entität mit n:m-Zuordnung zu Publikationen. | §3.2 (Bild teilbar LinkedIn/Blog, nicht WhatsApp) impliziert eine vom Format gelöste Asset-Verwaltung; im Seed nicht als Entität modelliert. | 🟡 mittel |
| DATA-08 | IMPLIZIT | Jede mandantengebundene Entität trägt eine Mandanten-Referenz. | Mandantenfähigkeit (§8.2, §14.9) erfordert dies datenmodellseitig; in B noch nicht vorhanden (Single-Instance). | 🟢 hoch |
| DATA-09 | IMPLIZIT | Das deprecated body-JSONB-Feld aus B wird im Zielmodell nicht weitergeführt. | §11.2 markiert body als deprecated zugunsten content_formats. | 🟢 hoch |
| DATA-10 | IMPLIZIT | LinkedIn wird im Zielmodell zu einer Publikation unter vielen (statt eigenem Story-Typ wie in A). | §13.4 Begriffs-Kollision explizit benannt; Auflösung Richtung „eine Publikation" als Annahme. | 🟢 hoch |

---

### 4. KI-Generierungsannahmen

| ID | Typ | Annahme | Quelle / Begründung | Sicherheit |
| --- | --- | --- | --- | --- |
| KI-01 | EXPLIZIT | Pro Kanal/Format genügen vermutlich spezifische Prompts (keine Agents/Skills), da im Wesentlichen Tonalitäten variieren. | §4.1 „vermutlich aber nur Prompts" | — |
| KI-02 | EXPLIZIT | Es existiert (vermutlich) ein übergeordneter geheimer Redakteurs-Prompt über allen Format-Prompts. | §4.1 | — |
| KI-03 | EXPLIZIT | Das System bleibt provider-agnostisch (OpenAI/Anthropic/Google), Modell überschreibbar. | §4.2, §14.3 | — |
| KI-04 | EXPLIZIT | Modell-IDs driften; Registry und Prompts bleiben bewusst editierbar. | §12 Hinweis, §13.4 | — |
| KI-05 | IMPLIZIT | Die deklarative Format-Konfiguration (Länge/Tonalität/Struktur) reicht aus, um qualitativ hochwertige Outputs ohne format-spezifischen Code zu erzeugen. | §14.4 generalisiert das B-Modell; ob rein deklarativ ausreichend, ist unbelegt. | 🟡 mittel |
| KI-06 | IMPLIZIT | Die Bild-Pipeline (DALL·E / gpt-image-1) bleibt erhalten und wird auf das Publikationsmodell übertragen. | §4.2, §14.3, §12.5 | 🟢 hoch |
| KI-07 | IMPLIZIT | Parallele Mehrformat-Generierung erhöht Last/Kosten signifikant; Nebenläufigkeit muss gesteuert werden. | §11.3, NFR §7; im Seed nur qualitativ, ohne Zielwerte. | 🟡 mittel |

---

### 5. Publishing-, Kanal- & Export-Annahmen

| ID | Typ | Annahme | Quelle / Begründung | Sicherheit |
| --- | --- | --- | --- | --- |
| PUB-01 | EXPLIZIT | „Kanäle" meint Publishing-Ziele (wie Publer sie anbietet): LinkedIn, Website/Storyblok, WordPress, X, Facebook etc. | §6.1 | — |
| PUB-02 | EXPLIZIT | Ob LinkedIn weiter über Publer oder direkt per API läuft, ist offen; aktuell Publer der Einfachheit halber. | §6.3, §15.4 | — |
| PUB-03 | EXPLIZIT | Publer-Mehrwerte (z. B. Klick-Auswertung) sind zu prüfen, bevor man Publer ablöst. | §6.3 | — |
| PUB-04 | EXPLIZIT | Word wird immer generiert; PDF wird (vermutlich) aus dem Word/ODF erzeugt. | §6.5 | — |
| PUB-05 | EXPLIZIT | Tendenz zu LibreOffice/ODF als interner Export-Engine („Word macht immer Stress"); Format-Details bewusst offen. | §6.5, §15.7 | — |
| PUB-06 | EXPLIZIT | Kanäle entstehen sukzessive bei Bedarf; nicht alle müssen sofort implementiert werden. | §6.4, §8.3 | — |
| PUB-07 | EXPLIZIT | Kunden können eine standardisierte Word-/ODF-Vorlage einmalig zurechtbasteln und hochladen (Branding). | §6.5 | — |
| PUB-08 | IMPLIZIT | Die in A inaktiven Publer-Formatter (Instagram/Threads/Pinterest, Luxarise-Scaffolding) und das live verdrahtete B-Kanalset lassen sich zu einem gemeinsamen Live-Set zusammenführen. | §10.4, §11.5, §14.6; Annahme der technischen Konvergenz. | 🟡 mittel |
| PUB-09 | IMPLIZIT | Eine LibreOffice-Runtime ist in der Ziel-Deployment-Topologie betreibbar (Server-seitiger Headless-Konvertierungsdienst). | §6.5 erwähnt LibreOffice-Packages intern; Betriebsaufwand/Containerisierung nicht adressiert. | 🟡 mittel |
| PUB-10 | IMPLIZIT | Der Idempotenz-Contract (published⇒block, queued⇒replace), heute nur für LinkedIn/Publer, ist auf alle Channels generalisierbar. | §12.11, §14.6, NFR §8; nicht alle Ziele bieten vergleichbare State-Semantik (z. B. Datei-Download). | 🔴 niedrig |

---

### 6. Auth-, Mandanten- & Betriebsannahmen

| ID | Typ | Annahme | Quelle / Begründung | Sicherheit |
| --- | --- | --- | --- | --- |
| OPS-01 | EXPLIZIT | Es handelt sich um eine SaaS-Anwendung; das konkrete Betriebsmodell ist noch unklar und zu recherchieren. | §8.2, §15.5 | — |
| OPS-02 | EXPLIZIT | Drei Betriebsmodell-Optionen stehen zur Wahl (A: geteilte DB+Container / B: App + DB pro Kunde / C: Stack pro Kunde). | §8.2 | — |
| OPS-03 | EXPLIZIT | Die mandantengetrennte Absicherung hat hohen Security-Impact (niemand darf fremde Posts sehen/ändern). | §8.2 | — |
| OPS-04 | EXPLIZIT | Sobald verkauft, ist kein agiles Hot-Fixing mehr möglich; es braucht echte, versionierte Releases. | §8.1, §14.12 | — |
| OPS-05 | EXPLIZIT | Beide OAuth-Provider (Google + Microsoft 365/Azure AD) werden zusammengeführt; zusätzlich E-Mail/Passwort. | §9, §14.9 | — |
| OPS-06 | EXPLIZIT | Kanal-Konfiguration erfolgt vermutlich über die Oberfläche, noch nicht final entschieden. | §2, Anhang A, §15.3 | — |
| OPS-07 | IMPLIZIT | Modell A (geteilte DB + RLS) ist der wahrscheinlichste Kandidat, da B bereits RLS einsetzt und es „am leichtgewichtigsten im Rollout" ist. | §8.2, §11.2; Seed favorisiert nichts explizit, lässt aber A als naheliegend erscheinen. | 🟡 mittel |
| OPS-08 | IMPLIZIT | E-Mail/Passwort-Login erfordert sicheres Passwort-Hashing und Brute-Force-Schutz. | NFR §1; Standard-Sicherheitspraxis, im Seed nicht spezifiziert. | 🟢 hoch |
| OPS-09 | IMPLIZIT | Das Self-hosted-Supabase-Deployment von B (Docker-Compose/Traefik/GitLab-CI) wird als Deployment-Fundament übernommen. | §11.10, §14.12, NFR §3. | 🟢 hoch |
| OPS-10 | IMPLIZIT | Der headless Cron-Tick (extern, ansible-verwaltet, Bearer-Token) bleibt als Scheduler-Auslöser bestehen. | §12.10; Mechanismus ist persistenz-unabhängig. | 🟢 hoch |

---

### 7. Scheduling-Annahmen

| ID | Typ | Annahme | Quelle / Begründung | Sicherheit |
| --- | --- | --- | --- | --- |
| SCH-01 | EXPLIZIT | Der Scheduler wird auf jeden Fall beibehalten und vermutlich weiter ausgebaut. | §5 | — |
| SCH-02 | EXPLIZIT | Der konkrete Ausbaubedarf ist nicht spezifiziert. | FR §6, abgeleitet aus §5 | — |
| SCH-03 | EXPLIZIT | Der Scheduler-Horizont ist widersprüchlich dokumentiert (8 Wochen §12.6 vs. 12 Wochen §10.5); ungeklärt. | §15.11, ⚠-Hinweise | — |
| SCH-04 | IMPLIZIT | Die feste Zeitzone Europe/Berlin reicht im Single-Mandanten-Fall, könnte aber bei mehreren Mandanten Mehr-Zeitzonen-Bedarf erzeugen. | §12.4.2 (fixe TZ), NFR §9; Mehr-Zeitzonen-Betrieb im Seed nicht entschieden. | 🟡 mittel |
| SCH-05 | IMPLIZIT | Die Scheduler-Zuverlässigkeitsmechanismen (Retry-Cap 3, Orphan-Handling, verpasste Slots) bleiben im neuen Modell gültig. | §12.5, NFR §8. | 🟢 hoch |

---

### 8. Annahmen zu Lücken im Seed (Negativ-Annahmen)

Diese Punkte sind Annahmen darüber, dass bestimmte Anforderungen **nicht** existieren bzw. nicht spezifiziert sind. Sie sind besonders verifizierungsbedürftig, da ein Übersehen teuer ist.

| ID | Typ | Annahme | Quelle / Begründung | Sicherheit |
| --- | --- | --- | --- | --- |
| GAP-01 | IMPLIZIT | Es gibt keine expliziten Internationalisierungs-/Lokalisierungsanforderungen (Inhalte durchgängig deutsch). | NFR §9; im Seed nicht erwähnt. | 🟡 mittel |
| GAP-02 | IMPLIZIT | Es gibt keine expliziten Barrierefreiheits-Anforderungen (trotz Frontend-Neubau). | NFR §10; im Seed nicht erwähnt. | 🟢 hoch |
| GAP-03 | IMPLIZIT | Es gibt keine konkreten Compliance-/DSGVO-/Audit-Vorgaben, obwohl SaaS + Kundeninhalte Datenschutzrelevanz nahelegen. | NFR §11; abgeleitet, nicht spezifiziert. | 🟡 mittel |
| GAP-04 | IMPLIZIT | Es existiert keine automatisierte Test-Suite; Verifikation erfolgt manuell (make check + make dev). | §12.10; explizit „Kein Test-Suite". | 🟢 hoch |
| GAP-05 | IMPLIZIT | Es gibt kein Rollensystem (in B sind alle authentifizierten Nutzer = Admin); Mandantenfähigkeit könnte ein Rollenkonzept erfordern. | §11.8; im Seed nicht adressiert. | 🟡 mittel |
| GAP-06 | IMPLIZIT | Es gibt keine quantifizierten Performance-/Skalierungs-Zielwerte (Mandantenzahl, Durchsatz, Datenvolumen). | NFR §7, §8.2; im Seed nur qualitativ. | 🟢 hoch |
| GAP-07 | IMPLIZIT | Datenmigrations-Anforderungen für bestehende Storyblok-Inhalte (Version A produktiv genutzt) sind nicht spezifiziert. | §1.1 („mehrere gute Blogbeiträge entstanden") + §7.1; Migration von Bestandsdaten nicht adressiert. | 🟡 mittel |

---

### Überblick: Annahmen mit höchster Verifizierungspriorität

Die folgenden Annahmen sollten in der GAP-Analyse / im Lösungsdesign zuerst geklärt werden, da sie weite Teile der Architektur determinieren oder hohes Fehlinterpretationsrisiko tragen:

1. **OPS-01 / OPS-02 / OPS-07** — Betriebs-/Mandantenmodell (größte offene Architekturfrage, §15.5).
2. **ARCH-09 / PUB-10** — Generalisierbarkeit des Channel-Interfaces und des Idempotenz-Contracts (🔴 niedrig).
3. **DATA-02 / DATA-03** — Begriffsfindung „Publikation" und Seed-Kardinalität.
4. **PUB-05 / PUB-09** — Export-Engine-Wahl und LibreOffice-Betreibbarkeit.
5. **ARCH-07** — Tragfähigkeit des B-Datenmodells für die Dreistufigkeit.
6. **GAP-03 / GAP-05 / GAP-07** — Compliance, Rollenkonzept, Bestandsdatenmigration als bislang unadressierte Lücken.