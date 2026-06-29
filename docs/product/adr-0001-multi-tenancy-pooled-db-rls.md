# ADR-0001 — Multi-Tenancy: Pooled Database + Row-Level Security

_Status: vorgeschlagen · 29.06.2026 · Kontext: Produktdefinition SmartEditor (SaaS)_
_Bezug: [`product-seed-konsolidiert.md`](product-seed-konsolidiert.md) §8 (Betriebsmodell A/B/C), [`smarteditor-technische-dokumentation.md`](smarteditor-technische-dokumentation.md) §11 (Persistenz-Umzug)_

---

## Kontext

Der SmartEditor wird eine **mandantenfähige SaaS-Anwendung**: Kunden subscriben einen Zugang, loggen sich mit **mehreren Usern** ein, verwalten einen **eigenen Content-Pool**, bekommen **Adapter und Content-Formate** bereitgestellt und können sich **eigene** anlegen. Heute sind beide Code-Versionen **single-tenant** (SmartEditor auf Storyblok, ZDB auf Supabase); Mandantenfähigkeit ist neu und greenfield auf dem Supabase-Zielstack.

Der Seed nennt drei Betriebsmodelle:
- **A** — eine gemeinsame DB + Container, vollständig mandantenbasiertes Datenmodell.
- **B** — eine Applikation, getrennte DB pro Kunde.
- **C** — vollständiger Stack pro Kunde.

Zu entscheiden: Welches Modell ist der Default?

## Entscheidung

**Pooled Database (Option A): ein gemeinsames Postgres-Schema, `org_id` auf jeder mandanteneigenen Zeile, Isolation durch Postgres Row-Level Security (RLS).** Supabase ist dafür gebaut (RLS ist Kern-Feature); Auth liefert den User im JWT, Policies filtern nach Org-Zugehörigkeit.

Der **Tenant ist die Organisation/Workspace**, nicht der User:
- `organizations` (Tenant, trägt Abo/Plan) · `users` · `memberships` (User ↔ Org **mit Rolle** owner/editor/viewer).
- **`org_id` auf jeder mandanteneigenen Tabelle** (posts, publications, channels, custom_formats, secrets …); RLS-Policy: sichtbar nur, wenn `org_id` in den Memberships des Users.
- **Global vs. per-Org:** Adapter-Katalog und Default-Content-Formate sind **global** (vom Produkt bereitgestellt); eigene Formate, Channel-Verbindungen, Credentials und Content sind **per-Org**. Deckt „Adapter gestellt + selbst anlegen" sauber ab.
- **Per-Org-Secrets** (LinkedIn-/Publer-/API-Keys der Kunden) verschlüsselt at-rest, nie im Frontend.

## Begründung

- **Self-serve + viele kleine Tenants** → niedrige Grenzkosten pro Tenant, **eine** Codebasis, **ein** Deploy, **eine** Migration. Konsistent mit dem Seed-Ziel „kein Fork, echte Releases".
- **Migrations-/Betriebsaufwand:** Silo (DB pro Kunde) bedeutet Migrationen × N, Provisioning pro Kunde, N Connection-Pools. Auf Supabase ist jedes Projekt eine ganze Postgres-Instanz — DB-pro-Tenant skaliert nicht auf viele kleine Kunden.
- **Datenklasse:** Posts/Publikationen/Prompts/Configs erzwingen keine physische Trennung (kein regulatorischer Zwang wie bei Gesundheitsdaten) → logische Isolation reicht.
- **Branchenstandard:** „Pool first, silo the whales later" ist das übliche Vorgehen erfolgreicher B2B-SaaS.

## Verworfene Alternativen

- **B — DB pro Tenant (Silo):** stärkere Isolation, aber operativ teuer (Migrationen/Provisioning/Connections × N), auf Supabase besonders schwergewichtig. Nur bei harter Isolations-/Compliance-Anforderung gerechtfertigt.
- **C — Stack pro Tenant:** noch schwerer; nur für on-prem/Enterprise. Widerspricht dem self-serve-Produktcharakter.
- **Bridge (Schema pro Tenant):** Kompromiss ohne klaren Gewinn gegenüber RLS; selten lohnend.

## Konsequenzen

**Positiv:** günstigster Rollout, eine Migration, ein Codestand für alle; Supabase-nativ; direkter Pfad aus der Technik-Doku (§11) — `storyblok*`-I/O → Supabase-Client, `system-config` → `settings`-Tabelle (per-Org).

**Risiko / tragende Wand — RLS-Disziplin:** Der heutige Code spricht Storyblok fast nur mit dem **Service-Role-Key** an, und der **umgeht RLS komplett**. Beim Umzug muss jede Query zuverlässig nach `org_id` gescoped sein. Muster: Route-Handler löst die Org aus der Session auf und scoped explizit **plus** RLS als Defense-in-Depth. Sitzt das nicht diszipliniert, leakt es zwischen Tenants — das ist die einzige Stelle mit echtem Sorgfaltsbedarf.

**Sekundär:** Noisy-Neighbor bei sehr großen Tenants später möglich → durch „Whale auf dedizierte Instanz" lösbar.

## Offen halten (Evolutionspfad)

**Connection-String pro Org konfigurierbar** halten, damit ein einzelner Großkunde mit harter Isolations-/Data-Residency-Anforderung später ohne Code-Fork auf eine **dedizierte Instanz** gehoben werden kann (gleiche Codebasis, anderer DB-Connection-String). Realistischer Trigger: ein Kunde wie ein **Verband (ZDB)**, der „unsere Daten nicht in einer geteilten DB" verlangt.

## Nächste Schritte

1. Konkretes Tenant-Schema entwerfen (`organizations`, `users`, `memberships`, Rollenmodell).
2. RLS-Policy-Muster + Scoping-Konvention für Route-Handler festlegen (Service-Role nur dort, wo bewusst tenant-übergreifend).
3. Per-Org-Secret-Storage (Verschlüsselung) spezifizieren.
4. Abo/Billing auf Org-Ebene (z. B. Stripe) als eigenes ADR.
