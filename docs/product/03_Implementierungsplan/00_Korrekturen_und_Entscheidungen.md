# Korrekturen vor dem Ticketing (autoritativ)

_Diese Notiz hält die vor der Ticket-Erstellung getroffenen Korrekturen fest. Sie **hat Vorrang** vor abweichenden Formulierungen in den Phasen-Dokumenten (01/02), wo diese noch den alten Stand tragen. Stand: 29.06.2026. Zielsystem für Tickets: **Linear, Team SMEDIT** (Prefix `SMEDIT-`)._

---

## K1 — Frontend: inkrementell weiterentwickeln (NICHT kompletter Neubau)

**Entscheidung:** Das bestehende Next.js-Frontend bleibt erhalten und wird **inkrementell umgebaut/erweitert** (u. a. Editor → Multi-Format-Tabs). Es wird **nicht** von Grund auf neu gebaut.

**Wirkung:** Korrigiert die durchgängige Formulierung „Frontend wird komplett neu gebaut" im konsolidierten Seed (§1.4), in den NFR, im Architektur- und Komponenten-Doc und im Feature-Modell. Die heutige UI ist **Bestand zum Weiterbauen**, nicht bloße „Neubau-Referenz". Ticket FEAT-01 ist als Umbau (nicht Neuentwicklung) zu verstehen; Listen/Settings/Auth-Screens werden wiederverwendet. Barrierefreiheit bleibt irrelevant (konsistent mit Entscheidung in 01/B/05).

## K2 — Billing/Subscription: Platzhalter-Epic, erstes Release ohne Self-Serve-Verkauf

**Entscheidung:** Im ersten Release **kein** Self-Serve-Billing. Org/Plan-Struktur wird vorbereitet (das `organizations`-Modell trägt bereits ein „Plan"-Feld), Zahlung/Plan-Gating folgt später. Als **EPIC BILL** nur vorgemerkt, nicht spezifiziert.

**Wirkung:** Schließt die im Review festgestellte Lücke (Mission = „Zugang kaufen/subscriben", aber kein Billing im Plan). Zugänge werden zunächst manuell/über Admin vergeben.

## K3 — Zwei 🔴-Design-Risiken vor das Fundament ziehen (Spikes)

Die zwei höchsten Risiken waren als „Implementierungsdetail, später" vertagt, liegen aber auf bzw. nahe dem kritischen Pfad. Sie werden als **vorgezogene Design-Spikes** an den Anfang gestellt:

- **GEN-00 (neu)** — Design-Spike *Datenmodell-Tragfähigkeit*: Klärt, ob `content_formats` (JSONB-Key-Set in B) zu einer eigenständigen, einzeln publizierbaren, statusführenden **Rendition**-Entität trägt — **bevor** GEN-02 implementiert wird. (Risiko ARCH-07, 🔴)
- **ADAPT-00 (neu)** — Design-Spike *Channel-Interface-Entwurf*: Entwirft das Interface und validiert es gegen die heterogenen Erst-Ziele (Storyblok/CMS, LinkedIn/Push, Download/Datei) **bevor** darauf aufgebaut wird. Löst die Vertagung von OP 10 auf und entschärft ARCH-09 (🔴). Speist ADAPT-01.

**Wirkung:** GEN-00 → Welle 1 (vor GEN-02), ADAPT-00 → früh, vor ADAPT-01. Ergebnis der Spikes kann den Datenmodell-/Interface-Schnitt noch korrigieren, bevor Folgetickets darauf bauen.

## K4 — Bereits entschiedene „Entscheidungs-Tickets" bereinigen

Folgende als Welle-0-Tickets geführte Punkte sind durch `01_Seed-Analyse/.../05_Offene_Punkte` bereits **entschieden** und werden **nicht** als offene Tickets angelegt (sondern als erledigt dokumentiert):

| Ticket | Status | Entscheidung |
|---|---|---|
| ADAPT-10 (LinkedIn-API-Strategie) | erledigt | Nativer LinkedIn-Adapter **+** Publer als zusätzlicher Adapter. |
| PROC-02 (Scheduler-Horizont) | erledigt | 12 Wochen. |
| FEAT-04 (Geltungsbereich System-Prompt) | **entschieden** | **Mandantenübergreifend einheitlich** (kein org-Bezug). Entblockt FEAT-03/FEAT-05. |
| OPS-05 (Performance-Zielwerte) | won't-do | Bewusst keine Zielwerte; getragenes Restrisiko. |
| OPS-06 (Compliance/DSGVO/Audit) | won't-do | Keine spezifischen Anforderungen. |

ADAPT-07 (Publer-Mehrwert prüfen) bleibt als kleines PO-Abklärungs-Ticket bestehen (informiert ADAPT-08), ist aber kein Blocker.

## K5 — M4-Abnahmekriterium korrigieren

Das M4-Kriterium „Performance- und Compliance-Zielwerte (OPS-05, OPS-06) sind im laufenden Betrieb messbar erfüllt" widerspricht K4 (diese Zielwerte werden bewusst nicht gesetzt). Es wird zu einem Hinweis umformuliert, dass OPS-05/06 als getragenes Restrisiko ohne Zielwerte geführt werden.

---

## Konsequenz für die Ticket-Erstellung

Beim Anlegen in Linear (SMEDIT) gilt: FEAT-01 als Umbau formulieren; EPIC BILL als Platzhalter; GEN-00 und ADAPT-00 als Spikes ergänzen; ADAPT-10/PROC-02/FEAT-04/OPS-05/OPS-06 nicht als offene Tickets, sondern als dokumentierte Entscheidungen. Alle übrigen Tickets der Übersicht bleiben unverändert.
