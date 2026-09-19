
### Zielarchitektur im Überblick

Die Zielarchitektur bewahrt das bewährte Schnittmuster (dünne API-Routen als Orchestratoren, Fachlogik in `src/lib/**`) und ersetzt ausschließlich die Persistenz-I/O-Schicht sowie die Publishing-Mechanik. Das Kernmodell wird auf das dreistufige Schema **Story → Rendition → Channel** generalisiert; jedes Zielsystem wird über einen Adapter mit einheitlichem Channel-Interface angebunden.

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Next.js 15 / React 18 / shadcn / TipTap)          │
│  Multi-Format-Tab-UI · Settings · Channel-/Format-Verwaltung │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP
┌───────────────────────────▼─────────────────────────────────┐
│  API-Routen (dünne Orchestratoren) + NextAuth                │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Fachlogik-Kern (src/lib/**)                                 │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌────────────────┐ │
│  │ Content/ │ │   KI-    │ │ Scheduler │ │   Intake       │ │
│  │ Rendition│ │ Generier.│ │  (Cron)   │ │  (MS Graph)    │ │
│  └────┬─────┘ └────┬─────┘ └─────┬─────┘ └───────┬────────┘ │
│       │            │             │               │          │
│  ┌────▼────────────▼─────────────▼───────────────▼───────┐  │
│  │     Channel-Adapter-Registry (Channel-Interface)      │  │
│  │  Storyblok · LinkedIn(nativ) · Publer · Download/Mail │  │
│  └───────────────────────┬───────────────────────────────┘  │
│  ┌──────────────┐  ┌──────▼──────────┐  ┌────────────────┐  │
│  │ Persistenz-  │  │ Export-Service  │  │ MCP-Server      │  │
│  │ Adapter      │  │ (LibreOffice)   │  │ (generisch)     │  │
│  │ (Supabase)   │  │                 │  │                 │  │
│  └──────┬───────┘  └─────────────────┘  └────────────────┘  │
└─────────┼─────────────────────────────────────────────────-─┘
          │
┌─────────▼─────────────────────────────────────────────────-─┐
│  Supabase/PostgreSQL (Pooled DB, org_id + RLS) · Storage      │
└──────────────────────────────────────────────────────────-──┘
```

### Komponenten und Verantwortlichkeiten

#### 1. Persistenz-Adapter (Supabase-Client)

| Aspekt | Beschreibung |
| --- | --- |
| Verantwortlichkeit | Primärpersistenz aller mandantengebundenen Entitäten (Story, Rendition, Channel, Settings, Assets) in Supabase/PostgreSQL; Durchsetzung der Mandanten-Isolation per RLS (org_id je Zeile). |
| Ersetzt | storyblok.ts (read), storyblok-management.ts (write), system-config.ts (Settings) |
| Schnittstellen | Wird von Content/Rendition-Logik, Scheduler, KI-Generierung, Intake und MCP konsumiert; identische Routen-Schnittstelle nach außen (ARCH-04). |
| Abhängigkeiten | Supabase-Stack (PostgreSQL, Auth, Storage, Kong-Gateway) |

#### 2. Content-/Rendition-Kern

| Aspekt | Beschreibung |
| --- | --- |
| Verantwortlichkeit | Verwaltung des dreistufigen Modells Story → Rendition → Channel; Erzeugung n paralleler, eigenständig editier-/publizierbarer Renditions aus einer Story; Statusführung pro Rendition (content_complete, confirmed_at, Publish-/Channel-State). |
| Ersetzt | Feste Blog/Article/LinkedIn-Typenstruktur, cm_blog_ref-Kopplung, deprecated body-JSONB |
| Schnittstellen | Konsumiert Persistenz-Adapter; ruft KI-Generierung und Channel-Adapter auf. |
| Abhängigkeiten | Persistenz-Adapter, Format-Konfiguration (Settings) |

#### 3. Channel-Adapter-Registry mit Channel-Interface

| Aspekt | Beschreibung |
| --- | --- |
| Verantwortlichkeit | Einheitlicher Erweiterungspunkt für alle Zielsysteme (ein Adapter je Zielsystem). Methoden-Kandidaten: generate-target-payload, publish, schedule, export, dispatch-email. Idempotenz als optionale Capability je Channel-Klasse (none/upsert/publish-queue/send-once). |
| Konkrete Adapter | Storyblok (Publishing-Ziel), LinkedIn (nativer Adapter), Publer (verbleibt parallel), Download/E-Mail-Versand |
| Schnittstellen | Wird vom Content-/Rendition-Kern und Scheduler aufgerufen; ruft Export-Service auf (Download-Channels). |
| Risiko | 🔴 Subsumierung heterogener Ziele (Social-Push/CMS/Datei/E-Mail) unter ein Interface; Spezifikation als Implementierungsdetail vertagt (ARCH-09 / OP 10). |

#### 4. Export-Service (headless LibreOffice)

| Aspekt | Beschreibung |
| --- | --- |
| Verantwortlichkeit | Konvertierung Markdown → ODF → Word/PDF; Berücksichtigung mandantenspezifischer ODT-Branding-Vorlagen. Eigener Container-Service. |
| Schnittstellen | Wird über die export-Methode des Channel-Interface aufgerufen. |
| Abhängigkeiten | LibreOffice-Runtime in der Ziel-Topologie (PUB-09, 🟡); mandantenspezifische Vorlagen aus Settings/Storage. |

#### 5. Auth-Komponente (NextAuth)

| Aspekt | Beschreibung |
| --- | --- |
| Verantwortlichkeit | Zusammenführung von Google-OAuth (A) und Microsoft 365/Azure AD (B) plus E-Mail/Passwort-Login (Hashing, Brute-Force-Schutz); Auflösung Tenant/Membership inkl. Rolle (Admin/Redakteur). |
| Schnittstellen | Liefert Mandanten-/Rollenkontext an API-Routen und damit an RLS-Pfade. |

#### 6. Erhaltene Prozessfeatures (unverändert in der Logik)

| Komponente | Anpassung |
| --- | --- |
| Scheduler (Cron) | Logik erhalten; auf Rendition-Modell übertragen; Horizont 12 Wochen; Zuverlässigkeitsmechanismen (Retry-Cap 3, Orphan-Handling, Idempotenz) generalisiert. Nur Persistenz-I/O wechselt. |
| KI-Generierung | Logik erhalten; auf Rendition-/Format-Modell übertragen; geheimer Redakteurs-/System-Prompt über allen Format-Prompts. |
| Intake (MS Graph) | Logik erhalten; nur Persistenz-I/O wechselt. |
| MCP-Server | Verallgemeinert auf Story/Rendition statt feste Blog/LinkedIn-Struktur. |

### Erforderliche strukturelle Anpassungen

#### A. Persistenz-Umzug (I/O-Austausch statt Re-Implementierung)

Es findet **keine Aufteilung eines Monolithen** statt – die Fachlogik ist bereits vom I/O isoliert. Der Eingriff beschränkt sich auf:

- Austausch der I/O-Module (`storyblok.ts`, `storyblok-management.ts`) gegen den Supabase-Client.
- Überführung von `system-config.ts` in eine Supabase-`settings`-Tabelle.
- Rückbau der Storyblok-SDKs (`@storyblok/react`, `storyblok-js-client`, CLI/Typen) auf den Storyblok-Adapter.
- Anpassung/Wegfall der auf Storyblok-Rate-Limits ausgelegten Backoff-/Cache-Mechanismen.

#### B. Modell-Generalisierung (Datenmodell-Ausmodellierung)

- Übernahme des B-Datenmodells (`content_formats`-Prinzip), generalisiert zur eigenständigen Rendition-Entität.
- Eigenständige Modellierung der Channel-Ebene (in B noch nicht vorhanden).
- Umstellung der Statusfelder von Post- auf Rendition-Granularität.
- Asset-Storage auf Supabase-Bucket (`assets`, `posts/{ts}-{name}`) mit n:m-Zuordnung für teilbare Bilder.

#### C. Service-Extraktion / Entkopplung

- **Extraktion** der Channel-Adapter-Registry als zentralen Erweiterungspunkt; Storyblok von Primärspeicher zu einem Adapter degradieren.
- **Entkopplung** der festen LinkedIn↔Blog-Kopplung (`cm_blog_ref`); LinkedIn wird ein Adapter unter vielen.
- **Auslagerung** des Dokument-Exports in einen separaten headless LibreOffice-Container-Service.

#### D. Mandantenfähigkeit verankern

- `org_id` auf jeder mandantengebundenen Entität; RLS um die Mandanten-Dimension erweitern.
- Mandantenspezifische Konfiguration (Format/Kanal/Prompt/Branding) isolieren.

### Priorisierung nach Aufwand und Risiko

| # | Anpassung | Aufwand | Risiko | Begründung / Reihenfolge |
| --- | --- | --- | --- | --- |
| 1 | Datenmodell + Mandanten-Dimension (org_id/RLS) | Mittel | 🔴 Hoch | Fundament aller weiteren Schritte; RLS-Fehler exponiert fremde Mandantendaten (OPS-03). Muss zuerst stehen und gründlich getestet werden. |
| 2 | Persistenz-I/O-Austausch (Storyblok → Supabase) | Mittel | 🟡 Mittel | Agentengestützt umsetzbar (ARCH-03); Risiko liegt in der Annahme sauberer I/O-Isolation (ARCH-01) und Übertragbarkeit der Querschnitts-Invarianten (ARCH-08). |
| 3 | Modell-Generalisierung Story→Rendition→Channel | Hoch | 🟡 Mittel | Datenmodell-bestimmend; Tragfähigkeit des B-Modells für die Dreistufigkeit unbelegt (ARCH-07). Baut auf #1/#2 auf. |
| 4 | Settings in DB + mandantenspezifische Konfiguration | Niedrig | 🟢 Niedrig | B-Modell vorhanden; folgt direkt aus #1/#2. |
| 5 | Channel-Adapter-Registry + Channel-Interface | Hoch | 🔴 Hoch | Abstraktionskritisch (heterogene Ziele unter einem Interface, ARCH-09). Idempotenz via Capability-Klassen entschärft (OP 12). Interface-Spezifikation vertagt. |
| 6 | Auth-Zusammenführung (Google + Azure AD + E-Mail/Passwort) | Mittel | 🟡 Mittel | Sicherheitskritisch (Hashing, Brute-Force-Schutz); liefert Mandanten-/Rollenkontext für RLS. |
| 7 | Erste Channel-Adapter: Storyblok, LinkedIn (nativ), Download | Mittel | 🟡 Mittel | Release-Scope; LinkedIn nativ + Publer parallel (OP 6). |
| 8 | Export-Service (headless LibreOffice-Container) | Mittel | 🟡 Mittel | Eigenständiger Service; Betreibbarkeit der Runtime in Ziel-Topologie als Annahme (PUB-09). |
| 9 | Übertragung Scheduler / KI / Intake / MCP auf neues Modell | Niedrig–Mittel | 🟢 Niedrig | Logik bleibt erhalten; nur Modell-/I/O-Anbindung wechselt. |
| 10 | Breiteres Publer-Kanalset aktivieren | Niedrig | 🟢 Niedrig | Reine Adapter-Implementierung; sukzessive nach #5. |

**Reihenfolge-Empfehlung:** Die Schritte #1–#4 bilden das risikobehaftete, aber verpflichtende Fundament (Datenmodell, Mandantenisolation, Persistenz). Erst danach erfolgt mit #5 der konzeptionell anspruchsvollste Schritt (Channel-Interface), gefolgt von den konkreten Adaptern (#7, #8, #10) und der Übertragung der bewährten Prozessfeatures (#9), die das geringste Risiko tragen.