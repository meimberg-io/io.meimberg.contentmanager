# Epic: LinkedIn-Posts im Content Manager (MICM)

> Status: Epic-Entwurf (Brainstorming abgeschlossen, vom User freigegeben am 2026-06-05).
> Nächster Schritt: Zerlegung in spezifizierte User Stories.

## 1. Kontext & Ausgangslage

Der Content Manager erzeugt heute aus einem Intake (per Mail importiertes Plaud-Transkript) **Blogbeiträge**. Konkret im Ist-Stand:

- **Intake = Blogpost**: `POST /api/import/process` zieht eine Mail mit Anhängen und legt **sofort** einen `blog`-Story in Storyblok an; das Quellmaterial hängt direkt als `cm_source_raw` / `cm_source_summarized` am Story. Eine vom Blogpost getrennte Intake-Entität existiert nicht.
- **Persistenz**: Storyblok Management API (`storyblok-management.ts`), Blog-Ordner, CM-Metadaten als `cm_*`-Felder. Story-Typ bleibt `blog`; `blogBodyVariant` (`short`/`long`) und `article` steuern nur den KI-Prompt, nicht den Story-Typ.
- **Generierung**: `POST /api/ai/generate` erzeugt Feld für Feld (pagetitle, abstract, pageintro, teasertitle, readmoretext, body, optimize). Prompts sind in den Settings konfigurierbar (`aiPrompts`, `DEFAULT_PROMPTS`).
- **Publer ist NICHT real angebunden**: Es existieren nur aus einem anderen Projekt **mitkopierte Code-Fragmente** (`lib/publer.ts`, `PublerSection.tsx`, `api/publishing/publer/*`, Shop-Kanäle Instagram/Facebook/Pinterest/Twitter/Threads). Eine funktionierende Publer-Integration vom Content Manager aus gibt es **nicht**. Die echte, lauffähige Publer-Anbindung liegt nur im Referenzprojekt vor und dient als Vorlage.

## 2. Vision & Motivation

Pro Intake soll wahlweise ein **Blogbeitrag und/oder ein LinkedIn-Beitrag** entstehen — manche Themen sind einen Blog wert, manche nur einen LinkedIn-Post. LinkedIn-Posts werden über **Publer** in einen vorgefertigten LinkedIn-Schedule eingereiht, sodass über Wochen automatisch publiziert wird.

**Hintergrund (bewusst NICHT Teil dieses Epics):** Mittelfristig sollen extern per Agent ~10 Themen gedraftet werden. Diese laufen aber ganz normal **einzeln über die bestehenden Intake-Kanäle** rein — es entsteht in diesem Epic **kein** Batch-/Multi-Draft-Workflow im Content Manager. Das Epic liefert das Fundament, auf dem ein externer Agent später aufsetzen kann.

## 3. Ziel / Outcome

Nach diesem Epic kann ein Nutzer im Content Manager zu einem beliebigen Intake:

- einen **Blogbeitrag** erzeugen (wie heute),
- **und/oder** einen **LinkedIn-Beitrag** mit LinkedIn-spezifischem Text erzeugen,
- beide unabhängig voneinander (reiner LinkedIn-Post ohne Blog ist möglich, reiner Blog wie bisher),
- bei „beides" verweist der LinkedIn-Post auf den Blogbeitrag (Link + Vorschau-Card + Bild),
- den LinkedIn-Beitrag nach Storyblok persistieren (eigener, nicht-gerenderter Bereich) und über **Publer** in den LinkedIn-Kanal publishen.

## 4. Scope

**In Scope**

- LinkedIn-Content-Typ + eigener Ordner in Storyblok (nicht auf Website gerendert).
- LinkedIn-spezifischer Prompt + Generierungs-Funktion(en).
- Pro Intake unabhängig **Generate Blog** und **Generate LinkedIn**.
- Verknüpfung LinkedIn → Blog (Link, Preview, Bild), wenn beide existieren.
- **Echte** Publer-Anbindung für den LinkedIn-Kanal, neu gebaut (Referenzprojekt als Vorlage; vorhandene Fragmente als Startpunkt, aber nicht als lauffähige Basis vorausgesetzt).
- UI im Post-Detail: Blog- und LinkedIn-Bereich getrennt, eigene Status-/Publish-Anzeigen.
- Status-Tracking für LinkedIn (Content fertig / zu Publer publiziert).

**Out of Scope**

- Externer Agent / Batch-Drafting mehrerer Posts.
- Weitere Kanäle außer LinkedIn (nur Erweiterungspunkte vorsehen, nicht ausbauen).
- Rendering von LinkedIn-Inhalten auf der öffentlichen Website.
- Direkte LinkedIn-API-Integration (Publishing läuft über Publer).
- Analytics / Performance-Tracking publizierter LinkedIn-Posts.

## 5. Fachliches Modell

**App-Ebene — eine logische Post-Entität pro Intake.** Der bestehende `BlogPost`/Post bleibt die Einheit, mit der gearbeitet wird (ein Item, ein Card). Er wird um LinkedIn-Felder erweitert (z. B. `linkedinText`, `linkedinImage`, `linkedinStatus`, Referenz-IDs). Der Name `BlogPost` bleibt — semantisch leicht unscharf, bewusst akzeptiert.

**Storyblok-Ebene — Persistenz nach Content-Typ getrennt:**

- Blog-Output → `blog`-Story im Blog-Ordner (auf Website gerendert), wie heute.
- LinkedIn-Output → neuer `linkedin_post`-Story in eigenem LinkedIn-Ordner (**nicht** gerendert), publishbar Richtung Publer.
- Beide werden **verknüpft** (LinkedIn-Story referenziert die Blog-Story, wenn beide existieren — z. B. via Story-UUID/Slug).

**Warum getrennte Stories trotz „einer Entität":** Ein reiner LinkedIn-Post (ohne Blog) darf nicht als `blog`-Story im Blog-Ordner liegen, sonst rendert ihn die Website. Die App vereinheitlicht über die zwei Stories; die Persistenz trennt sie nach Render-Sichtbarkeit und Publish-Ziel.

## 6. Funktionale Bausteine (Vorschau auf die Story-Zerlegung)

1. **Storyblok-Schema & -Ordner für LinkedIn** — Content-Type `linkedin_post` (Felder: Text, Bild/Asset, Link auf Blog, Schedule-/Publer-Metadaten als `cm_*`), eigener Ordner, nicht im Website-Rendering. Anlege-Logik analog `getBlogFolderId()`.
2. **LinkedIn-Prompt & Generierung** — neuer Default-Prompt (`DEFAULT_PROMPTS.linkedin`), in Settings editierbar; neuer `type: 'linkedin'` in `/api/ai/generate` + Funktion in `lib/openai.ts`. LinkedIn-typischer Stil (Hook, kurze Absätze, CTA), abgeleitet aus demselben Quellmaterial.
3. **Unabhängige Erzeugung pro Intake** — UI-Aktionen „Generate Blog" / „Generate LinkedIn"; jede erzeugt/aktualisiert den jeweiligen Output. Beide, einer, oder keiner möglich. Quellmaterial bleibt geteilt am Intake.
4. **Blog↔LinkedIn-Verknüpfung** — wenn beide vorhanden: LinkedIn-Text verweist auf die publizierte Blog-URL; Vorschau-Card + Bild via Open-Graph der Blog-Seite (Teaser-Titel/-Bild). Abhängigkeit: für einen auflösbaren Link/Preview muss der Blog publiziert sein — Reihenfolge/Guard im Flow.
5. **Echte Publer-Anbindung (LinkedIn)** — Publer-Integration neu bauen (Referenzprojekt als Vorlage): `PubChannel` um `'linkedin'` erweitern, `formatForLinkedIn()` (Text + Link + Bild, LinkedIn-Limits), ein konfiguriertes LinkedIn-Konto; Media-Upload + Bulk-Schedule mit `share_last` (Queue-Ende). Status `publishedLinkedIn` + Post-IDs persistieren (analog `cm_publer_*`).
6. **UI im Post-Detail** — Blog-Bereich und LinkedIn-Bereich getrennt (Tabs/Sektionen), je eigene Generate-/Edit-/Publish-Controls und Status-Icons.
7. **Status & Tracking** — neue StatusChecks (z. B. `linkedinContentComplete`, `linkedinPublished`); Dashboard/PostCard-Anzeige erweitern.

## 7. Annahmen

- Publer hat ein eingerichtetes LinkedIn-Konto + vorkonfigurierten Schedule; Publishing reiht via Queue ein (kein manuelles Zeit-Picking) — über die `share_last`-Mechanik des Referenzprojekts.
- Die öffentliche Blog-Seite liefert saubere Open-Graph-Tags (Titel + Teaser-Bild), sodass LinkedIn/Publer die Preview-Card automatisch rendert. (Falls nicht gegeben → eigene Story zum Nachrüsten der OG-Tags.)
- LinkedIn braucht keinen Rich-Text/Body wie der Blog, sondern Plain-Text mit Zeilenumbrüchen + ein Bild.
- Die echten Publer-API-Credentials/Workspace-/LinkedIn-Account-IDs werden bereitgestellt (Konfiguration), die Mechanik wird aus dem Referenzprojekt übernommen.

## 8. Offene Punkte (für die Story-Spezifikation)

- **Source-of-Truth des Intakes bei „nur LinkedIn":** Wo lebt das Quellmaterial, wenn keine Blog-Story existiert? (Vorschlag: am `linkedin_post`-Story als `cm_source_*`, einheitlich für beide Fälle — in Spec festklopfen, Redundanz vermeiden.)
- **Verknüpfungsrichtung & -feld** zwischen Blog- und LinkedIn-Story (UUID vs. Slug; ein- oder beidseitig).
- **Bild für LinkedIn**: Teaser-Bild des Blogs wiederverwenden vs. eigenes LinkedIn-Bild; Verhalten bei „nur LinkedIn".
- **Guard/Reihenfolge** „LinkedIn verweist auf Blog": Blog muss publiziert sein — UX bei noch-nicht-publiziertem Blog.
- **Genaues `linkedin_post`-Feldschema** in Storyblok.
- **Publer-Konfiguration**: Welcher LinkedIn-Account/Schedule, API-Keys, Workspace-ID — woher beziehen.

## 9. Erweiterbarkeit

Erweiterungspunkte für spätere Kanäle vorsehen, **ohne** jetzt zu generalisieren: ein benannter Channel-Begriff (Publer), ein Prompt-Slot pro Kanal, ein Formatter pro Kanal. Echte Abstraktion erst, wenn Kanal Nr. 2 real ansteht (YAGNI).

## 10. Akzeptanzkriterien (Epic-Ebene)

- Ein Nutzer kann zu einem Intake einen LinkedIn-Post erzeugen, **ohne** dass ein Blogbeitrag entsteht — und dieser erscheint **nicht** auf der Website.
- Ein Nutzer kann zu einem Intake Blog **und** LinkedIn erzeugen; der LinkedIn-Post verweist auf den Blog inkl. Vorschau + Bild.
- LinkedIn-Posts werden über Publer in den LinkedIn-Kanal eingereiht und der Status im Content Manager korrekt getrackt.
- Bestehender Blog-Flow bleibt unverändert funktionsfähig.
