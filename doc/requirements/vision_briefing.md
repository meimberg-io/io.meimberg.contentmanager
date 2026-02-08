# Luxarise Admin Tool

This is a summary of a Transcript, created by Firefly.ai

## General Summary

* Luxurize Manager automatisiert Bild-Workflow: Importiert Bilder aus OneDrive, speichert sie in einer Datenbank und zeigt Fortschritte visuell an.
* Speicherung von Bildbinaries: Hochauflösendes Bild (6000x6000 px) und Thumbnail (2000x2000 px) mit Wasserzeichen für Schutz des geistigen Eigentums.
* KI-gestütztes Content-Enrichment: Automatische Generierung von Titel und Tags mittels OpenAI API, Anpassung durch Nutzer möglich.
* Publishing an Verkaufsplattformen: Bilder werden hochgeladen zu Gelato und Etsy; automatisierte Synchronisierung mit Shopify zur Verkaufsoptimierung.
* Integration in Social Media: Automatischer Post-Export an fünf Kanäle; konfigurierbare Content-Prompts für emotionale Beschreibungen.
* Technische Architektur mit Sicherheit: Storyblock als Backend, OAuth für Nutzer-Authentifizierung, sicheres Management der API-Keys zur Datenintegrität.


## Notes

### Workflow-Automatisierung und Bildverwaltung

Die App Luxurize Manager wird den gesamten Bild-Workflow nach der manuellen Erstellung und Entwicklung automatisieren und visualisieren.

- Luxurize Manager importiert Bilder automatisch aus Microsoft OneDrive oder SharePoint, zeigt fünf neue Bilder mit Thumbnails an und ermöglicht den Import per Knopfdruck (00:09)

    - Importierte Bilder werden in einer Datenbank gespeichert, mit Storyblock als bevorzugtem Backend für einfache Integration und API-Zugriff
    - Nach dem Import zeigt die App alle Bilder in Listen- oder Kachelansicht mit Statusanzeigen an, um den Fortschritt transparent zu machen
    - Jeder Bilddatensatz erhält einen eindeutigen Namen, der auch als Dateiname genutzt wird, und kann später im System umbenannt werden
    - Die App verwaltet fünf Status-Checks, die visuell als grüne, gelbe oder rote Häkchen dargestellt werden, wobei der gelbe Status speziell für Content-Enrichment steht

- Für jedes Bild werden zwei Binaries gespeichert: ein hochauflösendes 6000x6000 Pixel Bild und ein 2000x2000 Pixel Thumbnail mit einem halbtransparenten "Luxurize"-Wasserzeichen (00:22)

    - Die App übernimmt die automatische Erstellung des Wasserzeichens, um unerlaubtes Kopieren auf der Website zu verhindern
    - Änderungen am Hauptbild führen automatisch zu einem aktualisierten Thumbnail, beide werden direkt in Storyblock gespeichert
    - Diese Doppelstruktur unterstützt die Qualitätssicherung und schützt geistiges Eigentum in verschiedenen Nutzungsszenarien

### Content Enrichment mit KI-Unterstützung

Die App wird KI nutzen, um Titel, lyrische Captions und Tags für jedes Bild automatisch zu generieren und so die Content-Erstellung zu beschleunigen.

- In der Content-Enrichment-Phase erzeugt Luxurize Manager über OpenAI API automatisch Titel, Beschreibungen und Schlagwörter basierend auf konfigurierbaren Prompts (00:24)

    - Nutzer können die globalen KI-Prompts in den Einstellungen anpassen, um Stil und Inhalt flexibel zu steuern#
    - Bei Bedarf lässt sich der generierte Text manuell in der Detailansicht bearbeiten oder durch erneutes KI-Generieren ersetzen
    - Diese Automatisierung reduziert den manuellen Aufwand erheblich und sorgt für konsistente, emotionale Texte
    
- Die Content-Übersicht zeigt an, welche Felder für jedes Bild vollständig sind, und erleichtert so die Qualitätskontrolle (00:15)

    - Ein gelber Haken signalisiert vollständigen Content mit Titel, Caption und Tags, rote Markierung fehlt bei unvollständigen Daten
    - Nutzer können Content als fertig markieren, um den Workflow transparent zu steuern
    - Diese Struktur unterstützt eine schnelle Identifikation von Nachbearbeitungsbedarf und beschleunigt den Publishing-Prozess

### Publishing-Prozess zu Verkaufsplattformen

Luxurize Manager steuert den Upload von Bildern als Produkte zu Gelato, Shopify und Etsy und verwaltet deren Status im Workflow.

- Nach Content-Enrichment lädt die App Bilder zu Gelato hoch, wo daraus Acrylbild-Produkte in den Größen 30x30, 40x40 und 50x50 cm erstellt werden (00:16)

    - Gelato stellt die Produkt-Templates mit Preisen bereit, was den Produkt-Setup-Prozess beschleunigt
    - Die Uploads können idealerweise per API automatisiert werden, aktuell ist ein manueller oder halbautomatischer Upload vorgesehen
    - Nach Upload synchronisiert Gelato die Produkte automatisch mit Shopify, wo sie veröffentlicht und verkauft werden können
    - Ein Status-Check für "Publish to Gelato" und "Finalized in Shopify" sorgt für klare Übersicht im Workflow

- Parallel veröffentlicht Luxurize Manager die Bilder auch als digitale Downloads auf Etsy, was eine zusätzliche Erlösquelle mit geringem Aufwand schafft (00:18)

    - Etsy-Käufe betreffen nur die digitalen Dateien, die Kunden selbst drucken können
    - Die App zeigt Status-Checks für alle Vertriebswege, um Vollständigkeit und Verkaufbarkeit zu garantieren
    - Diese Multi-Channel-Strategie stärkt die Marktpräsenz und diversifiziert Umsätze

### Social Media Integration und Automatisierung

Die App integriert Social Media Publishing über Pabla, um Marketing-Kanäle zentral zu bedienen und zu steuern.

- Luxurize Manager exportiert für jedes Bild automatisch Posts an Pabla, die 5 Kanäle bedienen: Facebook, Instagram, Pinterest, X und Threads (00:25)

    - Die Posts enthalten Bild, Caption, Titel, Tags und die Shop-URL, angepasst an die Besonderheiten jedes Kanals

    - Pabla bietet einen Scheduling-Mechanismus, der auch automatisches Timing der Posts ermöglicht
    - Der Nutzer kann Post-Texte in Pabla manuell anpassen, um kanal-spezifische Optimierungen vorzunehmen
    - Ein Status-Check "Publish to Pabla" im Workflow signalisiert die Fertigstellung der Social Media Verteilung

- Die Content-Prompts für die Social Media Texte sind in der App konfigurierbar und KI-gestützt, um emotionale und lyrische Beschreibungen zu generieren (00:26)

    - Diese Automatisierung sorgt für konsistente Markenbotschaften und spart erheblich Zeit im Social Media Management
    - Künftige API-Integration mit Pabla könnte den Prozess komplett automatisieren und manuelle Eingriffe minimieren

### Technische Architektur und Sicherheit

Die App basiert auf Storyblock als Backend mit React-basiertem Frontend und nutzt OAuth für Nutzer-Authentifizierung und API-Sicherheit.

- Storyblock wird als Backend verwendet, da es bereits Datenstrukturen und API-Zugriff für Bild- und Content-Speicherung bietet (00:33)

    - Die Frontend-App wird in React oder Next.js gebaut, mit einer initialen Version über Loveable für schnelles Prototyping
    - Spätere Weiterentwicklung erfolgt mit Cursor und Custom Coding zur Integration aller Funktionalitäten in ein stabiles Produkt
    - Storyblock ermöglicht einfache Integration auf der bestehenden Website Meinberg IO für Content-Display

- Die Nutzer-Authentifizierung erfolgt über Microsoft 365 OAuth, mit einer Whitelist für autorisierte Nutzer basierend auf E-Mail-Adressen (00:39)

    - API-Keys werden sicher im Backend verwaltet, um Missbrauch zu verhindern und die Datenintegrität zu sichern

    - Das System plant eine Hardcoded Whitelist zu Beginn, mit offenem Potenzial für erweiterte Nutzerverwaltung

    - Dieses Vorgehen minimiert Entwicklungsaufwand und gewährleistet zuverlässigen Zugriffsschutz auf kritische Funktionen

### Dashboard und Nutzererlebnis

Die App bietet ein übersichtliches Dashboard und flexible Ansichten, die den Status aller Bilder und den Workflow transparent machen.

- Das Dashboard zeigt die Gesamtzahl der Bilder und deren Statusverteilung übersichtlich an, um schnelle Entscheidungen zu ermöglichen (00:33)

    - Nutzer können in Bereiche wie "Import New Images" oder "All Images" wechseln und dort gezielt filtern und suchen
    - Filterfunktionen erlauben das Sortieren nach Status, Namen und Beschreibung für effiziente Navigation
    - Listen- und Kachelansichten bieten unterschiedliche Übersichten, wobei Status-Checks als kleine Icons sichtbar sind
    - In der Detailansicht können Nutzer Bilddaten bearbeiten, KI-Texte generieren, Binaries tauschen und Status-Updates vornehmen
    - Die UI unterstützt durch klare Visualisierung der fünf Status-Checks eine einfache Nachverfolgung und schnelle Workflow-Steuerung (00:36)

- Status-Icons sind farblich differenziert (grün, gelb, rot/ grau) und in allen Ansichten sichtbar

    - Direkte Aktionen wie "Publish to Gelato", "Publish to Shop" oder "Publish to Pabla" sind als Buttons integriert
    - Diese Nutzerführung soll den Workflow schlank halten und Fehlbuchungen vermeiden
    - Die App erleichtert damit den Überblick über bis zu 65 Bilder oder mehr im System

Action items

- Erstellung eines detaillierten Anforderungskonzepts inklusive Maskenbeschreibungen, Use-Cases und Geschäftslogik für die App (42:05)
- Recherche und Entscheidung über Backend-Technologie (Storyblock, Supabase oder Spring Boot) und Klärung, wo die Binaries gespeichert werden (11:07)
- Implementierung einer Maske zum Importieren von Bildern aus Cloud-Speicher (OneDrive/SharePoint) mit Vorschau und Auswahlmöglichkeit (09:12)
- Implementierung der Statusverwaltung für Bilder mit fünf Prüf-Häkchen und Automatisierung möglicher Uploads zu Gelato, Shopify und Pabla (16:01)
- Entwicklung der AI-Integration zur automatischen Generierung von Titel, Caption und Tags per OpenAI API, inklusive Anpassungs- und Neugenerierungsfunktion (25:16)
- Implementierung von automatischer Thumbnail-Erzeugung mit Wasserzeichen und Speicherung beider Bildversionen im Backend (21:39)
- Konzeption und Umsetzung der Social Media Integration über Pabla mit automatischem Scheduling und Kanalspezifischer Textanpassung (25:16)
- Sicherstellung einer OAuth-basierten Authentifizierung mit Microsoft 365 und Absicherung der API-Zugriffe (39:57)
- Aufbau eines übersichtlichen Dashboards zur Statusanzeige aller Bilder mit Filter- und Suchfunktion und Detailansichten für die Bildbearbeitung (33:11)
