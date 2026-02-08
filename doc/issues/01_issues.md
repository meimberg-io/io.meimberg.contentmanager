# **Produktqualität und Bugfixes**

Die dringendsten Bedienungsfehler in der App beeinträchtigen den Nutzerfluss und müssen vor größeren Features behoben werden.

- **Navigationsfehler im Importprozess verhindern das Starten neuer Bildimporte ohne Browser-Reload** ([00:03](https://app.fireflies.ai/view/01KFXYNDF7FMPZG17KJ0WQRXPH?t=3))
    - Nutzer können nach Abschluss eines Imports nicht direkt einen neuen Import starten.
    - Dieses Problem blockiert einen flüssigen Arbeitsablauf und erhöht Supportanfragen.
    - Die Korrektur erfordert eine Anpassung der Navigationslogik in der Import-UI.
    - Ziel ist es, den Reload komplett zu vermeiden und die Nutzererfahrung zu verbessern.
- **Der Preview-Button in der Kachelansicht funktioniert nicht, und der Status „Imported“ ist redundant** ([00:03](https://app.fireflies.ai/view/01KFXYNDF7FMPZG17KJ0WQRXPH?t=3))
    - Der Preview-Button ist inaktiv und verwirrt Nutzer, da er keinen Nutzen bringt.
    - Der Status „Imported“ wird als überflüssig bewertet, da alle Bilder dort bereits importiert sind.
    - Entfernung des Status und Reparatur/desaktivierung des Buttons sind notwendig.
    - Diese Änderungen vereinfachen die Ansicht und reduzieren Verwirrung.
- **Anzeige der Dateigrößen in der Bilddetailansicht ist fehlerhaft und zeigt immer 0 MB an** ([00:03](https://app.fireflies.ai/view/01KFXYNDF7FMPZG17KJ0WQRXPH?t=3))
    - Sowohl Original- als auch Thumbnail-Größen werden nicht korrekt dargestellt.
    - Das beeinträchtigt die Transparenz für Nutzer, die Speicherverbrauch prüfen wollen.
    - Eine Backend- oder Frontend-Korrektur der Metadatenanzeige ist erforderlich.
- **Der Content-Complete Status aktualisiert sich nicht dynamisch bei Änderungen ohne Reload** ([02:29](https://app.fireflies.ai/view/01KFXYNDF7FMPZG17KJ0WQRXPH?t=149))
    - Änderungen an Bildfeldern wie Titel oder Caption reflektieren den Status nicht sofort.
    - Nutzer müssen erst speichern und die Seite neu laden, um korrekten Status zu sehen.
    - Auch die Mark-as-Complete-Funktion reagiert nicht, was den Abschlussprozess blockiert.
    - Diese Verzögerungen behindern die effiziente Bearbeitung und Qualitätskontrolle.
    - Das UI muss so angepasst werden, dass Statusänderungen sofort sichtbar sind.
- **Der Button „Duplicate Image“ ist unnötig und soll entfernt werden** ([04:16](https://app.fireflies.ai/view/01KFXYNDF7FMPZG17KJ0WQRXPH?t=256))
    - Dieses Feature bringt keinen Mehrwert und könnte zu Verwirrung führen.
    - Die Entfernung soll die Benutzeroberfläche vereinfachen.

# **Datenkonsistenz und Tagging-System**

Die uneinheitliche Verarbeitung von Tags führt zu Inkonsistenzen und könnte Fehler im Datenmodell verursachen.

- **Tags werden in unterschiedlichen Formaten gespeichert und angezeigt, was zu Verwirrungen führt** ([04:16](https://app.fireflies.ai/view/01KFXYNDF7FMPZG17KJ0WQRXPH?t=256))
    - Im Storyblock-System sind Tags als durch Leerzeichen getrennte Hashtag-Strings gespeichert.
    - Im Frontend werden sie als einzelne Tag-Badges angezeigt, was ein Formatkonflikt ist.
    - Die Speicherung neuer Tags funktioniert scheinbar, ist aber technisch fragwürdig.
    - Eine Überprüfung und Anpassung des Datenmodells und der Frontend-Darstellung sind nötig, um Einheitlichkeit sicherzustellen.

# **Feature-Entwicklung: KI-gestützte Inhaltserstellung**

Die Einführung einer serverseitigen KI-Integration soll die Inhaltserstellung automatisieren und verbessern.

- **Geplant ist die Integration von OpenAI für automatisierte Titel-, Caption- und Textgenerierung** ([06:20](https://app.fireflies.ai/view/01KFXYNDF7FMPZG17KJ0WQRXPH?t=380))
    - Ein API-Key soll sicher serverseitig hinterlegt werden, um Missbrauch zu verhindern.
    - Die KI-Inhalte werden über einen konfigurierbaren Prompt in den Einstellungen gesteuert.
    - Aktuell ist die Speicherung der Einstellungen nicht funktionsfähig und muss priorisiert werden.
    - Das Feature „Generate with AI“ im Bilddetail soll die API nutzen, um Inhalte zu erzeugen.
    - Diese Automatisierung soll die Content-Produktion beschleunigen und konsistenter machen.
- **Die Umsetzung erfordert Backend-Anpassungen und UI-Integration in einem abgestimmten Zeitplan** ([06:20](https://app.fireflies.ai/view/01KFXYNDF7FMPZG17KJ0WQRXPH?t=380))
    - Die sichere Handhabung des API-Keys ist ein wichtiger Sicherheitsaspekt.
    - Die UI muss den Nutzerfluss für KI-Generierung klar und intuitiv gestalten.
    - Erfolgreiche Implementierung wird die Produktivität des Teams messbar steigern.

# **Benutzerinteraktion und UI-Verbesserungen**

Mehrere UI-Elemente funktionieren nicht oder sind nicht intuitiv, was den Arbeitsfluss hemmt.

- **Buttons wie „View Full Res“ und „Replace“ im Bilddetail funktionieren nicht** ([04:16](https://app.fireflies.ai/view/01KFXYNDF7FMPZG17KJ0WQRXPH?t=256))
    - Diese fehlenden Funktionen schränken die Bildbearbeitung und -verwaltung ein.
    - Die Behebung ist notwendig, um vollständige Kontrolle über Bildinhalte zu gewährleisten.
    - Verbesserte Funktionalität wird die Nutzerzufriedenheit erhöhen und Fehler reduzieren.
- **UI-Statusanzeigen und Interaktionspunkte müssen dynamisch und responsiv sein** ([02:29](https://app.fireflies.ai/view/01KFXYNDF7FMPZG17KJ0WQRXPH?t=149))
    - Verzögerte Statusupdates verwirren Nutzer und bremsen Arbeitsprozesse.
    - Sofortige visuelle Rückmeldungen erhöhen die Effizienz und reduzieren Supportbedarf.

# **Priorisierung und nächste Schritte**

Die Behebung der genannten Fehler und die Fertigstellung der KI-Integration haben höchste Priorität.

- **Alle genannten Fehler sollen vor größeren neuen Features behoben werden** ([00:03](https://app.fireflies.ai/view/01KFXYNDF7FMPZG17KJ0WQRXPH?t=3))
    - Dies sichert eine stabile Basis und verhindert, dass Probleme sich multiplizieren.
    - Ein klares Protokoll der Punkte wurde für die Umsetzung festgehalten.
    - Die Fehlerbehebung wird in enger Abstimmung zwischen Frontend- und Backend-Teams erfolgen.
    - Verantwortliche und Deadlines sind intern zuzuweisen, um den Fortschritt messbar zu machen.
- **KI-Feature-Entwicklung wird als nächster großer Schritt geplant, nach Basisstabilisierung** ([06:20](https://app.fireflies.ai/view/01KFXYNDF7FMPZG17KJ0WQRXPH?t=380))
    - Fokus liegt auf API-Sicherheit, Prompt-Konfiguration und UI-Integration.
    - Ein iterativer Entwicklungsansatz mit schnellem Feedback wird empfohlen.
    - Ziel ist ein funktionierendes MVP innerhalb der nächsten Wochen.

# **Action Items**

**Oli Meimberg**

- Fix der fehlerhaften Navigation nach Bildimport und Fehleranzeige, sodass ein neuer Import ohne Browser-Reload gestartet werden kann ([00:00](https://app.fireflies.ai/view/01KFXYNDF7FMPZG17KJ0WQRXPH?t=0))
- Deaktivierung und Entfernung des Preview-Buttons in der Kachelansicht sowie des Status „Imported“ in der gesamten Anwendung ([01:00](https://app.fireflies.ai/view/01KFXYNDF7FMPZG17KJ0WQRXPH?t=60))
- Korrekte Anzeige der Bildgrößen in den Metadaten (Originalsize und Thumbnail) implementieren ([01:30](https://app.fireflies.ai/view/01KFXYNDF7FMPZG17KJ0WQRXPH?t=90))
- Statusaktualisierung („Content Complete“) in der Detailansicht so anpassen, dass sie unmittelbar bei Eingabeänderungen erfolgt, ohne Reload ([02:29](https://app.fireflies.ai/view/01KFXYNDF7FMPZG17KJ0WQRXPH?t=149))
- Entfernung der unnötigen „Duplicate Image“-Funktion aus der Applikation ([04:16](https://app.fireflies.ai/view/01KFXYNDF7FMPZG17KJ0WQRXPH?t=256))
- Klärung und Vereinheitlichung des Tag-Formats zwischen Storyblock-Datenmodell und Frontend-Darstellung, insbesondere bzgl. Hashtags und Badges ([04:45](https://app.fireflies.ai/view/01KFXYNDF7FMPZG17KJ0WQRXPH?t=285))
- Behebung der nicht funktionierenden Buttons „View Full Res“ und „Replace“ in der Bilddetailansicht ([05:50](https://app.fireflies.ai/view/01KFXYNDF7FMPZG17KJ0WQRXPH?t=350))
- Implementierung des Features „Generate with AI“ mit serverseitiger OpenAI-Integration und funktionalen, speicherbaren Prompts ([06:20](https://app.fireflies.ai/view/01KFXYNDF7FMPZG17KJ0WQRXPH?t=380))
- Erstellung eines umfassenden Protokolls aller Issues sowie Priorisierung und Abarbeitung der Probleme ([07:50](https://app.fireflies.ai/view/01KFXYNDF7FMPZG17KJ0WQRXPH?t=470))