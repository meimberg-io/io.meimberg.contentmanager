# **Notes**

**Bild-Detailansicht und Statusanzeige**

Es gibt mehrere Probleme mit der Bild-Detailansicht und dem Statussystem, die dringend behoben werden müssen.

- **Der Status “Image Imported” wird im Detail View weiterhin angezeigt, obwohl er entfernt werden sollte** ([00:09](https://app.fireflies.ai/view/01KFXZWH3H156WWRD5C4HTA5QM?t=9))
    - Das führt zu Verwirrung bei den Nutzern, die den korrekten Uploadstatus erwarten.
    - Es fehlt eine klare Trennung zwischen Import-Status und inhaltlicher Fertigstellung.
    - Die Beibehaltung dieses Status behindert den Workflow der Content-Freigabe.
    - Die Korrektur ist nötig, um eine klare, nachvollziehbare Statusanzeige zu gewährleisten.
- **Das Watermark soll als PNG unten rechts eingeblendet werden, statt als zentriertes Text-Overlay** ([00:09](https://app.fireflies.ai/view/01KFXZWH3H156WWRD5C4HTA5QM?t=9))
    - Das PNG-Wasserzeichen wird als Layer eingebaut, nicht als einfacher HTTP-Link.
    - Dies soll die Bildqualität verbessern und das Wasserzeichen professioneller wirken lassen.
    - Die technische Umsetzung erfordert eine Layer-Funktion, die das Wasserzeichen direkt über das Bild legt.
    - Dadurch wird der Schutz der Bildrechte gestärkt und die Nutzererfahrung verbessert.
- **Ein Download-Button in der Bild-Detailansicht wird gewünscht** ([00:09](https://app.fireflies.ai/view/01KFXZWH3H156WWRD5C4HTA5QM?t=9))
    - Nutzer sollen Bilder direkt aus der Detailansicht herunterladen können.
    - Das erleichtert die weitere Nutzung und spart Zeit bei der Content-Verarbeitung.
    - Der Button muss gut sichtbar und intuitiv bedienbar sein.
    - Die Implementierung muss mit dem bestehenden UI-Design harmonieren.
- **Der Publishing-Status schaltet fälschlich sofort auf “Content Complete” (grün), wenn ein Text in das Caption-Feld eingetragen wird** ([00:09](https://app.fireflies.ai/view/01KFXZWH3H156WWRD5C4HTA5QM?t=9))
    - Richtig wäre, dass der Status nach Eingabe des Texts auf “gelb” (Content Complete, aber noch nicht final bestätigt) wechselt.
    - Nur nach manuellem Klick auf “Mark as Complete” soll der Status auf grün wechseln.
    - Dieses Dreistufensystem soll Klarheit über den Fortschritt der Content-Freigabe schaffen.
    - Die aktuelle Logik führt zu falschen Statusanzeigen und damit zu möglichen Fehlern im Publishing-Prozess.
- **Die Status-Logik umfasst drei Stufen, die korrekt abgebildet werden müssen:** ([01:54](https://app.fireflies.ai/view/01KFXZWH3H156WWRD5C4HTA5QM?t=114))
    - Rot: Mindestens ein Pflichtfeld ist leer, Status “nicht alle Felder gefüllt”.
    - Gelb: Alle Felder sind ausgefüllt, aber der Content ist noch nicht als abgeschlossen markiert.
    - Grün: Alle Felder sind gefüllt und der Content wurde aktiv als abgeschlossen markiert.
    - Diese Stufen müssen technisch sauber umgesetzt werden, um Nutzerfehler zu vermeiden.
- **Dateigrößen werden im System noch immer mit “0” angezeigt, was falsch ist** ([01:54](https://app.fireflies.ai/view/01KFXZWH3H156WWRD5C4HTA5QM?t=114))
    - Das verhindert eine verlässliche Einschätzung der Bildgröße vor dem Download oder der Weiterverarbeitung.
    - Die korrekte Anzeige ist wichtig für die Qualitätskontrolle und Ressourcenplanung.
    - Die Fehlerbehebung muss auf der Datenbank- oder Frontend-Ebene erfolgen.
    - Eine korrekte Dateigrößenanzeige unterstützt auch die Nutzerakzeptanz und die interne Nachverfolgung.

# **Action Items**

**Oli Meimberg**

- Den Status „Image Imported“ aus der Detailansicht entfernen oder korrigieren ([00:09](https://app.fireflies.ai/view/01KFXZWH3H156WWRD5C4HTA5QM?t=9))
- Ein PNG-Wasserzeichen integrieren, das unten rechts angezeigt wird, anstelle des Text-Overlays in der Bildmitte ([00:09](https://app.fireflies.ai/view/01KFXZWH3H156WWRD5C4HTA5QM?t=9))
- Die Darstellung der Full-Res-Downloads über einen Layer realisieren und nicht nur als HTTP-Link ([00:09](https://app.fireflies.ai/view/01KFXZWH3H156WWRD5C4HTA5QM?t=9))
- Einen Download-Button in der Detailansicht für Bilder hinzufügen ([00:09](https://app.fireflies.ai/view/01KFXZWH3H156WWRD5C4HTA5QM?t=9))
- Das Statusverhalten im Caption-Feld anpassen: Bei Eingabe von Text soll der Status auf Gelb wechseln, nicht automatisch auf Grün; der „Mark as Complete“-Button soll erst bei vollständigen Feldern und erst nach manuellem Bestätigen aktiv sein ([00:09](https://app.fireflies.ai/view/01KFXZWH3H156WWRD5C4HTA5QM?t=9))
- Überprüfen und beheben, dass der Button „Mark as Complete“ bei leeren Feldern nicht aktiv ist ([01:54](https://app.fireflies.ai/view/01KFXZWH3H156WWRD5C4HTA5QM?t=114))
- Die Anzeige der Dateigrößen korrekt implementieren, da aktuell immer „0“ angezeigt wird