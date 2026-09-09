# SmartEditor — Konsolidierter Produkt-Seed

_Sauber strukturierte, konsolidierte Fassung des eingesprochenen Produkt-Seeds. Verlustfrei: alle Aussagen aus dem Roh-Intake sind hier überführt. Diese Datei ist ab jetzt die Arbeitsgrundlage — der rohe Intake ([`product_seed.md`](product_seed.md)) wird nicht mehr direkt verwendet._

_Ursprung: Voice-Intake vom 29.06.2026, Oliver Meimberg · Konsolidiert: 29.06.2026_

_Transkriptionskorrekturen und interpretierende Annahmen sind in [Anhang A](#anhang-a--konsolidierungs-notizen) dokumentiert und im Text mit ⟦…⟧ markiert._

---

## 1. Ausgangslage & Mission

### 1.1 Herkunft
Das Tool in diesem Repo heißt im Code „Content Manager"; inzwischen wird es **SmartEditor** genannt. Es ist als kleines Werkzeug entstanden, mit dem Oliver Blogbeiträge schreibt: Man wirft einen **Seed** hinein — z. B. eine Voice-Message oder etwas Zusammengescriptetes — und das Tool erzeugt daraus einen **Blogbeitrag**. Zusätzlich werden ein **Bild** und diverse **Metadaten** generiert (u. a. Titel, Abstract usw.). Das war die ursprüngliche Basis; sie hat hervorragend funktioniert, mehrere gute Blogbeiträge sind so entstanden.

### 1.2 Zwei Abzweigungen
Aus dieser Basis sind **zwei** Entwicklungen voneinander abgezweigt:

1. **SmartEditor (persönlich, dieses Repo).** Erweitert, sodass zu jedem Blogbeitrag auch ein **LinkedIn-Post** veröffentlicht werden kann. Der LinkedIn-Post hat einen eigenen Text und verweist auf den verknüpften Blogbeitrag. Möglich ist:
   - Blogbeitrag **mit** LinkedIn-Post,
   - Blogbeitrag **ohne** LinkedIn-Post,
   - LinkedIn-Post **ohne** Blogbeitrag.

   Architektonisch ist diese Kopplung noch nicht sauber aufgesetzt — für den Moment aber akzeptiert.

2. **ZDB-Version (Demo/Fork).** Gebaut für den **ZDB** (Zentralverband des Deutschen Baugewerbes). Der ZDB möchte aus einem Eingangstext verschiedene Formate generieren:
   - ein **Rundschreiben** für die Verbandsmitglieder,
   - eine **Pressemitteilung**,
   - einen **LinkedIn-Beitrag**,
   - eine **WhatsApp-Meldung**,
   - eine **Pressemitteilung an den Spiegel**,
   - eine **Pressemitteilung an Springer** usw.

   Alle Formate haben **unterschiedliche Längen und Tonalitäten**. Es ist ebenfalls Multichannel-Publishing. Die Idee ist dieselbe, der Kern ist im Wesentlichen gleich — nur die Ausprägung der Kanäle ist eine völlig andere.

### 1.3 Die Mission
Aus dem Ding lässt sich ein **Produkt** machen. Ziel ist eine **Produktdefinition**: eine fachliche Produktbeschreibung und möglicherweise bereits eine **Basisarchitektur**. Die folgenden Punkte sind die im Intake genannten Wünsche und Constraints — in loser Folge erfasst, hier strukturiert.

---

## 2. Produktkern

- Der **Kern beider Systeme ist gleich**: Aus einem **Seed/Intake** werden unterschiedliche **Textformate** generiert — in **hoher Qualität** und mit **sehr gut festgezurrter Sprachlichkeit**.
- Das Produkt muss grundsätzlich **unterschiedliche Kanäle** bedienen können.
- **Jeder Kunde hat eine völlig individuelle Liste von Kanälen.** Die Kanäle müssen daher **frei anpassbar** sein — ⟦vermutlich direkt über die Oberfläche, noch nicht final entschieden⟧.

---

## 3. Kanäle & Formate (fachlich)

### 3.1 Woraus sich ein Kanal definiert
Ein Kanal definiert sich aus zwei Dimensionen:

1. **Content** — welcher Inhalt erzeugt werden muss. In der Regel zuerst der **Haupttext** (bei einem Blogbeitrag völlig anders als bei einem LinkedIn-Post) **plus zusätzliche Metadaten**. Beispiele:
   - Ein LinkedIn-Post hat möglicherweise **Tags**, ein Blogpost nicht unbedingt.
   - Ein Blogpost hat ein **Header-Bild**, ein LinkedIn-Beitrag vielleicht nicht — oder doch.
2. **Zielformat / Publikation** je Kanal (siehe 3.3 und Abschnitt 6).

### 3.2 Geteilte vs. individuelle Eigenschaften
Einige Eigenschaften können sich Formate **teilen** — etwa ein **Bild**: dasselbe Bild wird für LinkedIn und Blog verwendet, nicht aber für WhatsApp. Andere Eigenschaften sind **individuell** — etwa unterschiedliche **Tags** für LinkedIn gegenüber X.

### 3.3 Feld-/Zielformate
- **LinkedIn** ist normaler **Text**. Die **Blogbeiträge** sind **Markdown**. Anderes ist möglicherweise **HTML** — eventuell sogar mit bestimmter Semantik von Tags/Klassen. Theoretisch sind weitere Formate wie **JSON** denkbar.
- **Leitentscheidung (vorläufig):** Der Content wird auf **Markdown** reduziert. Markdown lässt sich jederzeit nach **HTML** überführen (umgekehrt — z. B. aus JSON — nicht unbedingt). „Text ist Text." Damit gibt es im Kern **zwei** Feld-Zielformate: **Markdown** und **(reiner) Text**.
- Markdown muss auch **Code-Sections** und **Tabellen** können. Das funktioniert bereits gut — jedenfalls im persönlichen SmartEditor, der gegenüber der ZDB-Variante etwas ausgereifter ist, weil die beiden vor einiger Zeit geforkt wurden.

---

## 4. KI-Generierung

- Für jeden Kanal braucht es **ganz spezifische Prompts**, die den Content erzeugen — eventuell sogar Agents oder Skills, **vermutlich aber nur Prompts**, weil im Wesentlichen unterschiedliche **Tonalitäten** erzeugt werden müssen.
- Es gibt vermutlich einen **übergeordneten Redakteurs-Prompt**, der den **Mehrwert im Kern des Systems** abbildet. Dieser ist **geheim** und damit ein zentraler Produktwert.

---

## 5. Scheduling

- Es existiert inzwischen eine **Scheduling-Funktion, ähnlich wie bei ⟦Publer⟧**: Man kann **Slots** definieren, in denen die Posts abgeschickt werden.
- Diese Funktion muss **auf jeden Fall beibehalten** und vermutlich **weiter ausgebaut** werden.

---

## 6. Publishing, Kanäle & Adapter (technisch)

### 6.1 Kanäle als Publishing-Ziele
„Kanäle" meint das eigentliche **Publishing** — das, was ⟦Publer⟧ anbietet. Beispiele für Ziele: **LinkedIn**, die eigene **Website (publiziert auf Storyblok)**, **WordPress**, **X**, **Facebook** usw.

### 6.2 Erweiterbarkeit & Adapter-Architektur
- Kanäle müssen **erweiterbar** sein — die eigentlichen Kanäle vermutlich **per Code**. Wer einen Kanal möchte, meldet ihn an, dann wird er gebaut.
- Ein Kanal soll ein **klares Interface** implementieren, sodass die Umsetzung reine **Implementierungsarbeit** ist, die **Agenten** ohne große Architekturentscheidungen leisten können.
- Jedes **Zielsystem** braucht in irgendeiner Form eine **API** — oder es wird ein anderer **Adapter** gebaut. Faustregel: **Jedes Zielsystem hat einen Adapter.**

### 6.3 Offene Klärung: Publer vs. direkte API
- Zu klären: Müssen die LinkedIn-Posts wirklich über **⟦Publer⟧** laufen, oder können sie direkt an die **API** geschickt werden? Aktuell läuft es der Einfachheit halber über ⟦Publer⟧.
- Ebenfalls zu klären: Bietet ⟦Publer⟧ derzeit **Mehrwerte**, die sonst wegfielen — etwa **Auswertung der Klicks**? (Eigenes Thema, gehört aber in den Seed.)

### 6.4 Publishing-Methoden je Kanal
- Das Einfachste ist das **Erzeugen von Markdown zum Download** — oder **Word** oder **PDF**.
- Jeder Kanal sollte wahrscheinlich **Download- und Versand-Möglichkeiten** bekommen: Ein Kanal kann beim Publishen z. B. **automatisch per E-Mail** an jemanden ein **Word-Dokument** schicken.
- Weitere Kanäle (zum Hin-Posten) lassen sich definieren; sie entstehen **sukzessive bei Bedarf**. Es müssen nicht alle sofort implementiert werden — die wichtigsten kann man aber schon benennen.

### 6.5 Dokument-Export & Branding
- Bei **Word/PDF** stellt sich die **Branding-Frage**. Vermutlich gilt: **Word wird immer generiert**; wenn **⟦PDF⟧** gebraucht wird, wird das PDF **aus dem Word** erzeugt.
- Dann könnte mit einer **standardisierten Word-Vorlage** gearbeitet werden, die Kunden sich einmal zurechtbasteln und hochladen.
- Möglicherweise sogar Rückgriff auf das **Open Document Format (ODF)**, weil es besser und sowohl durch Word als auch durch **LibreOffice** erzeugbar ist. Empfehlung tendiert zu **LibreOffice** (Word „macht immer Stress"). Aus dem LibreOffice-/ODF-Dokument ließen sich dann Word **und** PDF erzeugen.
- Intern wird vermutlich ohnehin immer mit OpenOffice-/**LibreOffice-Tools** gearbeitet (d. h. beim Erzeugen eines Word-Dokuments kommen LibreOffice-Packages zum Einsatz). Format-Details bleiben hier bewusst offen.

---

## 7. Architektur-Leitentscheidungen

### 7.1 Primärpersistenz in lokaler Datenbank
- **Erster Konstruktionsfehler** (generisch betrachtet): Auch die **Primärpersistenz** des Tools sitzt heute auf **Storyblok**, weil es ursprünglich so gedacht war.
- **Muss geändert werden:** Die Primärpersistenz **jedes einzelnen Beitrags** liegt zunächst in einer **lokalen Datenbank** (z. B. **Supabase**). Von dort aus wird **gepublished** — nach Storyblok, LinkedIn, WordPress, X, Facebook usw.
- Das ist eine **große architektonische Änderung**, aber kein großes Problem — „**dafür haben wir unsere Agenten**" (die Umsetzung erfolgt agentengestützt).

### 7.2 Kein Fork des Kerns
- Der **Kern der Software darf nicht forken.** Ein verkaufbares Produkt soll **ein** Produkt sein, nicht 25 Versionen — die ZDB-Version bekommt man bereits „nicht mehr eingefangen".
- Das **allererste** Ziel: ein Produkt bauen, das **kanal- und zielsystem-agnostisch** ist und gleichzeitig die **Blog-+LinkedIn-Journey** (persönlich) **und** die **ZDB-Journey** (⟦Verbands-⟧Rundschreiben usw.) bedient.
- Wie bei ⟦Publer⟧: Man muss **verschiedene Channels anlegen** können, **Prompts pro Channel** und vielleicht noch ein paar weitere Dinge. Dazu kommen **Publishing-Methoden pro Channel**.

### 7.3 Entitätenmodell
- Es gibt eine Entität **Post**. Ein Post hat immer einen **Seed** — ⟦möglicherweise sogar mehrere, noch offen⟧.
- Pro Post wird eine **neue Instanz** erzeugt (vergleichbar einer abstrakten Klasse / einem Stub).
- Aus einem Post können **kundenspezifisch** verschiedene **Zielformate** erzeugt werden. „Format" ist nicht das richtige Wort — passender wäre **Publikation**.
- Eine **Publikation** kann in einen **Kanal (Channel)** gepostet werden — oder auch nicht.
- Damit: **Post → Publikation → Channel.**
- **Offen (Begriffsfindung):** Wenn aus einem Beitrag z. B. ein Rundschreiben, mehrere Social-Media-Posts (X, Facebook …) entstehen — wie heißt die Entität für diese **einzelnen konkreten Posts** korrekt? „Publikation" ist ein Kandidat; der finale Begriff muss noch gefunden werden.

---

## 8. Betrieb & Mandantenmodell

### 8.1 Releases statt Hot-Fixing
- Sobald ein verkauftes Produkt entsteht, kann man **nicht mehr beliebig agil Updates hineinblasen**, wie es heute beim persönlichen Content Manager / SmartEditor möglich ist. Es muss mit **echten Releases** gearbeitet werden.

### 8.2 SaaS — Betriebsmodelle recherchieren
- Es handelt sich um eine **⟦SaaS⟧-Anwendung**. Es ist wichtig zu recherchieren, **wie andere das machen** (es gibt sehr viele Anwendungen dieser Art). Hier besteht noch wenig Klarheit.
- **Möglichkeit A — gemeinsame DB + gemeinsamer Container:** Eine große Supabase-Datenbank und ein Container. Das Datenmodell ist **vollständig mandantenbasiert** ⟦mandantenmäßig⟧. Am **leichtgewichtigsten im Rollout**, am **schwergewichtigsten in der Datenbank**. Spezielle Challenge: die klare **mandantenmäßige Absicherung** (niemand darf Posts anderer sehen/ändern) — **sehr wichtig, hoher Security-Impact**.
- **Möglichkeit B — eine Applikation, getrennte DB pro Kunde:** Eine Applikation, für jeden Kunden eine eigene Supabase-Datenbank.
- **Möglichkeit C — vollständiger Stack pro Kunde:** Für jeden Kunden läuft ein kompletter Stack; das Deployment updatet immer alle gleichzeitig.
- **Offen:** Welches Modell? Dazu braucht es eine Entscheidung über das Betriebsmodell.

### 8.3 Erweiterungspunkte definieren
Die Erweiterungspunkte müssen definiert werden, u. a.:
- die verschiedenen **Publikationsformate** mit ihren **Prompts**,
- **Download- und Versand-Möglichkeiten** pro Kanal (z. B. automatischer E-Mail-Versand eines Word-Dokuments),
- weitere **Kanäle** zum Hin-Posten (entstehen sukzessive bei Bedarf).

---

## 9. Auth / Login

- Aktuell ist nur **Google**-Login möglich.
- Der andere Editor (ZDB) kann zusätzlich **Microsoft-365-Logins**.
- Zusätzlich braucht es vermutlich **E-Mail/Passwort**-Login — für Nutzer, die kein OAuth verwenden möchten. Das muss noch gebaut werden.

---

## 10. Offene Fragen / noch zu entscheiden

Gesammelt aus den obigen Abschnitten — bewusst offen gelassene Punkte:

1. **Entitäts-Benennung** der konkreten Einzel-Posts („Publikation" vs. anderer Begriff) — final festzulegen (§7.3).
2. **Mehrere Seeds pro Post** — möglich oder nicht? (§7.3)
3. **Kanal-Konfiguration per UI** — ja/nein bzw. in welchem Umfang (§2).
4. **Publer vs. direkte API** für LinkedIn und welchen Mehrwert (Klick-Analytics) Publer bietet (§6.3).
5. **Betriebs-/Mandantenmodell** A/B/C — Recherche + Entscheidung (§8.2).
6. **Feldformate**: Reduktion auf Markdown + Text bestätigt? HTML/JSON als Sonderfälle? (§3.3)
7. **Dokument-Export-Engine**: Word-Vorlage vs. ODF/LibreOffice als interner Standard (§6.5).
8. **Welche Kanäle zuerst** implementiert werden (die wichtigsten benennen) (§8.3).

---

## 11. Nächste Schritte (laut Intake-Abschluss)

Der Intake endet mit dem Auftrag, dem Seed Folgendes hinzuzufügen, damit alle aktuell angedachten Features auf **Requirements-Ebene fusioniert** werden:
- die **vollständige Beschreibung des SmartEditors** (persönlich),
- die **vollständige Produktbeschreibung des SmartEditors für den ZDB**.

> Status: Diese Fusion ist bereits erfolgt und liegt als [`bestandsanalyse-und-gesamtrequirements.md`](bestandsanalyse-und-gesamtrequirements.md) vor (vollständige Requirements-Inventur beider Versionen, Feature-Diff und abgeleitetes Gesamtrequirement).


