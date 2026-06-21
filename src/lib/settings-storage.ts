/**
 * Settings Storage
 * Uses config field in contentmanager_config story
 */

import { getSystemConfig, updateSystemConfig } from './system-config'
import { normalizeSchedules } from './scheduler/normalize'
import type { Schedule } from '@/types'

export interface AiPrompts {
  pagetitle?: string
  pageintro?: string
  teasertitle?: string
  abstract?: string
  readmoretext?: string
  /** @deprecated Nutze bodyBlogLong; wird als Fallback für „Long“ gelesen */
  body?: string
  /** Body-Prompt für Blog (Short) */
  bodyBlogShort?: string
  /** Body-Prompt für Blog (Long) */
  bodyBlogLong?: string
  /** Body generation when content type is Article (sachlich, neutral) */
  bodyArticle?: string
  /** DALL-E meta-prompt for header image when content type is Blog */
  headerImage?: string
  /** DALL-E meta-prompt for header image when content type is Article */
  headerImageArticle?: string
  /** LinkedIn post text generation (plain text, LinkedIn style) */
  linkedin?: string
  /** Categorization tags generation (comma-separated, Content-Manager-internal) */
  tags?: string
}

/**
 * A bearer token for the MCP server (MICM-31). Stored HASHED — the plaintext is
 * shown to the user exactly once at creation and never persisted. `prefix` is a
 * masked, non-reconstructable hint for recognising the token in the list.
 */
export interface McpToken {
  id: string
  name: string
  /** SHA-256 hex of the full plaintext token. */
  tokenHash: string
  /** Masked display hint, e.g. `micm_ab12cd…`. */
  prefix: string
  /** ISO 8601 creation timestamp. */
  createdAt: string
}

export interface Settings {
  aiModel?: string
  aiPrompts?: AiPrompts
  notes?: string
  /**
   * Publer labels used as LinkedIn posting slots (MICM-13). Each label maps to a
   * timeslot series in Publer's posting schedule; order = dropdown order, first
   * entry = default. Empty/undefined → DEFAULT_PUBLER_LABELS.
   */
  publerLabels?: string[]
  /**
   * Publishing schedules (MICM-14). Each holds recurring weekly slots plus an
   * ordered queue of posts that the scheduler drains into the next free slots.
   */
  schedules?: Schedule[]
  /**
   * MCP bearer tokens (MICM-31). Managed in Settings → "MCP", validated by the
   * MCP server (MICM-22). Stored hashed; revoke = hard delete from this array.
   */
  mcpTokens?: McpToken[]
}

/** Fixed timezone for schedule slots (MICM-15 — no per-schedule UI selection yet). */
export const SCHEDULE_DEFAULT_TIMEZONE = 'Europe/Berlin'

/** Default Publer label set; must match the labels configured in Publer's posting schedule (MICM-13). */
export const DEFAULT_PUBLER_LABELS = ['Standard', 'Series 1', 'Series 2', 'Series 3']

export const DEFAULT_PROMPTS: Required<AiPrompts> = {
  pagetitle: `Basierend auf dem Quellmaterial, generiere einen überzeugenden Blog-Titel. Der Titel sollte einprägsam sein und den Kern des Themas erfassen. Maximal 80 Zeichen. Gib NUR den Titel zurück, keine Erklärung. Sprache: Deutsch.`,
  pageintro: `Basierend auf dem Quellmaterial, schreibe eine kurze Einleitung für den Blogpost. 2-3 Sätze. Nüchtern, sachlich, auf den Punkt. Den Leser NICHT direkt ansprechen (kein "du", kein "ihr", kein "Sie"). Keine Übertreibungen, keine Superlative, nichts Werbliches. Keine Formulierungen wie "klingt nach Science-Fiction", "spannender Weg" oder "mehr als man denkt" — das ist zu plakativ. Einfach beschreiben, worum es geht, ruhig und unaufgeregt. Gib NUR den Text zurück. Sprache: Deutsch.`,
  teasertitle: `Basierend auf dem Quellmaterial, generiere einen kurzen Teaser-Titel. Dieser wird als Überschrift in der Vorschau / Teaser-Karte angezeigt. Maximal 60 Zeichen. Gib NUR den Titel zurück. Sprache: Deutsch.`,
  abstract: `Basierend auf dem Quellmaterial, schreibe ein kurzes Abstract für den Blogpost. 1-2 Sätze, maximal 120 Zeichen. Sachlich, aber nicht trocken. Subtil eigene Haltung zeigen, ohne aufzutrumpfen. Keine Ausrufezeichen, keine rhetorischen Fragen, keine Wortspiele. Ruhig und klar. Gib NUR den Text zurück. Sprache: Deutsch.`,
  readmoretext: `Basierend auf dem Quellmaterial, generiere einen kurzen "Weiterlesen"-Text. Dieser Text erscheint als Call-to-Action unter dem Teaser. Maximal 50 Zeichen. Gib NUR den Text zurück (z.B. "Mehr über XY erfahren", "Warum XY wichtig ist"). Sprache: Deutsch.`,
  body: `Basierend auf dem folgenden Quellmaterial, schreibe einen ausführlichen, gut strukturierten Blogartikel.

Anforderungen:
- Strukturiere den Artikel mit Überschriften: verwende ## für Hauptabschnitte und ### für Unterabschnitte. Nutze beide Ebenen für eine gute Gliederung.
- Verwende **fett** für wichtige Begriffe und Schlüsselwörter
- Verwende *kursiv* für Betonungen und Fachbegriffe
- Verwende Aufzählungen mit Bindestrich (- Punkt 1, - Punkt 2) wo sinnvoll, z.B. für Vorteile, Schritte oder Auflistungen
- Füge relevante Links ein, wenn im Quellmaterial URLs erwähnt werden, im Format [Linktext](URL)
- Der Artikel sollte 800-1500 Wörter lang sein
- Schreibe in einem persönlichen, leicht meinungsstarken Ton — so, als würdest du laut für den Leser mitdenken. Nutze rhetorische Fragen, gelegentliche Einschübe in Klammern und bildhafte Redewendungen. Der Stil darf ruhig etwas provokant und nachdenklich sein — nicht zu glatt, nicht zu akademisch.
- Trau dich, eigene Einordnungen und Meinungen zu formulieren, statt nur neutral zu berichten.
- Beginne NICHT mit einem Titel oder einer Überschrift der Ebene # (der Seitentitel wird separat generiert)
- Beginne direkt mit einem einleitenden Absatz, dann folgen die ## Abschnitte

Sprache: Deutsch.
Antworte NUR mit dem Artikeltext in Markdown, keine Erklärung oder Meta-Kommentare.`,
  bodyBlogShort: `Basierend auf dem folgenden Quellmaterial, schreibe einen kompakten Blogartikel (Kurzform).

Anforderungen:
- Strukturiere mit wenigen ##-Überschriften (2–4 Hauptabschnitte); ### nur wenn es wirklich nötig ist
- Verwende **fett** für wichtige Begriffe und *kursiv* sparsam für Betonungen
- Aufzählungen mit Bindestrich nur wo sie Klarheit bringen
- Links aus dem Quellmaterial: [Linktext](URL)
- Ziel-Länge etwa 350–600 Wörter — prägnant, ohne Fülltext
- Ton: persönlich und meinungsstark wie beim Blog, aber straff; keine ausschweifenden Absätze
- Beginne NICHT mit # (Seitentitel ist separat); starte mit einem kurzen Einstieg, dann ##

Sprache: Deutsch.
Antworte NUR mit dem Artikeltext in Markdown, keine Erklärung oder Meta-Kommentare.`,
  bodyBlogLong: `Basierend auf dem folgenden Quellmaterial, schreibe einen ausführlichen, gut strukturierten Blogartikel.

Anforderungen:
- Strukturiere den Artikel mit Überschriften: verwende ## für Hauptabschnitte und ### für Unterabschnitte. Nutze beide Ebenen für eine gute Gliederung.
- Verwende **fett** für wichtige Begriffe und Schlüsselwörter
- Verwende *kursiv* für Betonungen und Fachbegriffe
- Verwende Aufzählungen mit Bindestrich (- Punkt 1, - Punkt 2) wo sinnvoll, z.B. für Vorteile, Schritte oder Auflistungen
- Füge relevante Links ein, wenn im Quellmaterial URLs erwähnt werden, im Format [Linktext](URL)
- Der Artikel sollte 800-1500 Wörter lang sein
- Schreibe in einem persönlichen, leicht meinungsstarken Ton — so, als würdest du laut für den Leser mitdenken. Nutze rhetorische Fragen, gelegentliche Einschübe in Klammern und bildhafte Redewendungen. Der Stil darf ruhig etwas provokant und nachdenklich sein — nicht zu glatt, nicht zu akademisch.
- Trau dich, eigene Einordnungen und Meinungen zu formulieren, statt nur neutral zu berichten.
- Beginne NICHT mit einem Titel oder einer Überschrift der Ebene # (der Seitentitel wird separat generiert)
- Beginne direkt mit einem einleitenden Absatz, dann folgen die ## Abschnitte

Sprache: Deutsch.
Antworte NUR mit dem Artikeltext in Markdown, keine Erklärung oder Meta-Kommentare.`,
  bodyArticle: `Basierend auf dem folgenden Quellmaterial, schreibe einen sachlichen, gut strukturierten Fachartikel.

Anforderungen:
- Strukturiere den Text mit Überschriften: ## für Hauptabschnitte und ### für Unterabschnitte.
- Verwende **fett** für zentrale Begriffe und **kursiv** nur bei Fachbegriffen, wo es sinnvoll ist.
- Nutze Aufzählungen mit Bindestrich (- Punkt 1) für klare Auflistungen.
- Füge relevante Links ein, wenn im Quellmaterial URLs vorkommen: [Linktext](URL)
- Länge etwa 800–1500 Wörter.
- Ton: nüchtern, informativ, klar. Keine persönliche Meinung, keine rhetorischen Fragen, keine provokanten Formulierungen, keine Ausrufezeichen als Stilmittel.
- Sachlich erklären und einordnen; keine direkte Ansprache des Lesers (kein "du", "ihr", "Sie").
- Beginne NICHT mit einer # Überschrift (Seitentitel wird separat gesetzt).
- Beginne mit einem kurzen einleitenden Absatz, danach ## Abschnitte.

Sprache: Deutsch.
Antworte NUR mit dem Artikeltext in Markdown, keine Erklärung oder Meta-Kommentare.`,
  headerImage: `Basierend auf dem folgenden Quellmaterial, erstelle eine prägnante Bildbeschreibung (Prompt) für ein KI-generiertes Header-Bild eines persönlichen Blogbeitrags.

Anforderungen:
- Die Beschreibung soll auf Englisch sein (für DALL-E)
- Visuell zum Blogton passen: ausdrucksstärker, stimmungsvoller, eher metaphorisch oder symbolisch; darf ruhig kontrastreicher Lichtstimmung, subjektiver Atmosphäre oder leicht ungewöhnlicher Bildsprache sein — nicht nüchtern-wie-ein-Handbuch
- Kein Text im Bild
- Stil: modern, editorial, mit eigener visueller Handschrift; nicht generische Stock-Ästhetik
- Farbpalette: darf emotional wirken; muss nicht zurückhaltend sein
- Format: Wide banner/header image (landscape orientation)
- Gib NUR den Bild-Prompt zurück, keine Erklärung

Sprache des Prompts: Englisch.`,
  headerImageArticle: `Basierend auf dem folgenden Quellmaterial, erstelle eine prägnante Bildbeschreibung (Prompt) für ein KI-generiertes Header-Bild eines sachlichen Fachartikels (nicht Blog).

Anforderungen:
- Die Beschreibung soll auf Englisch sein (für DALL-E)
- Visuell klar von Blog-Headern abweichen: zurückhaltend, dokumentarisch oder „business editorial“; sachliche Symbolik, ruhige Komposition, professionelles Magazin-/Reportage-Gefühl
- Kein Text im Bild
- Stil: clean, seriös, zurückhaltende Farbpalette, keine dramatische Stimmungsinszenierung
- Format: Wide banner/header image (landscape orientation)
- Gib NUR den Bild-Prompt zurück, keine Erklärung

Sprache des Prompts: Englisch.`,
  linkedin: `Basierend auf dem folgenden Quellmaterial, schreibe einen publikationsreifen LinkedIn-Beitrag.

Anforderungen:
- Beginne mit einem starken Hook in der ersten Zeile, der zum Weiterlesen anregt.
- Schreibe in kurzen Absätzen, getrennt durch Leerzeilen — gut lesbar im LinkedIn-Feed.
- Persönlicher, meinungsstarker Ton; eigene Einordnung statt nüchterner Bericht.
- Schließe mit einem klaren Call-to-Action (z. B. eine Frage an die Leser oder eine Einladung zur Diskussion).
- Ziel-Länge etwa 1300 Zeichen, maximal 3000 Zeichen.
- KEINE Hashtags.
- KEINE Links und keine Verweise auf einen Blogartikel (die Verlinkung passiert separat).
- Reiner Plain-Text mit Zeilenumbrüchen, KEIN Markdown, keine Überschriften, keine **fett**/*kursiv*-Formatierung.

Sprache: Deutsch.
Antworte NUR mit dem LinkedIn-Beitragstext, keine Erklärung oder Meta-Kommentare.`,
  tags: `Basierend auf dem folgenden Quellmaterial, generiere 4-8 prägnante Schlagworte (Tags) zur thematischen Kategorisierung des Beitrags.

Anforderungen:
- Kurze Begriffe oder kurze Wortgruppen (1-3 Wörter), die das Thema gut einordnen.
- Keine Hashtags, keine Rauten (#), keine Nummerierung, keine Aufzählungszeichen.
- Nur die Tags, getrennt durch Kommas, in einer einzigen Zeile.
- Keine Erklärung, kein Meta-Kommentar.

Sprache: Deutsch.`,
}

/**
 * Get settings from system config. `schedules` are normalized to the SlotInstance
 * model on the way out (MICM-32) — the single chokepoint that feeds the tick, both
 * schedule routes, ScheduleAssign and mcp-posts, so every reader sees the new shape.
 */
export async function getSettings(options?: { fresh?: boolean }): Promise<Settings> {
  try {
    const config = await getSystemConfig(options)
    const settings = config.settings || {}
    return { ...settings, schedules: normalizeSchedules(settings.schedules) }
  } catch (error) {
    console.error('Failed to get settings:', error)
    return {}
  }
}

/**
 * Save schedule *templates* (id/name/timezone/slots) from the Settings editor while
 * PRESERVING each schedule's live `slotInstances` from a fresh read (MICM-32).
 *
 * The editor holds a stale snapshot for as long as the user has the page open; a
 * blind full-array write would clobber instance status updates a tick made in the
 * meantime, and a slot edit must move its instances (not drop them). Merging by
 * schedule id keeps instances authoritative on the server side.
 */
export async function saveScheduleTemplates(
  incoming: Array<Pick<Schedule, 'id' | 'name' | 'timezone'> & { slots?: Schedule['slots'] }>,
): Promise<Schedule[]> {
  const settings = await getSettings({ fresh: true })
  const existing = Array.isArray(settings.schedules) ? settings.schedules : []
  const byId = new Map(existing.map((s) => [s.id, s]))

  const merged: Schedule[] = incoming.map((t) => {
    const prev = byId.get(t.id)
    return {
      id: t.id,
      name: t.name,
      timezone: t.timezone || SCHEDULE_DEFAULT_TIMEZONE,
      slots: (t.slots || []).map((sl) => ({
        id: sl.id || `slot-${sl.weekday}-${sl.time}`,
        weekday: sl.weekday,
        time: sl.time,
      })),
      // Live instances are owned by the engine/routes, never by the editor.
      slotInstances: prev ? prev.slotInstances : [],
    }
  })

  await updateSettings({ schedules: merged })
  return merged
}

/**
 * Update settings in system config
 */
export async function updateSettings(settings: Partial<Settings>): Promise<Settings> {
  const currentConfig = await getSystemConfig()
  const currentSettings = currentConfig.settings || {}

  const updatedSettings: Settings = {
    ...currentSettings,
    ...settings
  }

  await updateSystemConfig({
    settings: updatedSettings
  })

  return updatedSettings
}
