/**
 * Settings Storage
 * Uses config field in contentmanager_config story
 */

import { getSystemConfig, updateSystemConfig } from './system-config'

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
}

export interface Settings {
  aiModel?: string
  aiPrompts?: AiPrompts
  notes?: string
}

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
}

/**
 * Get settings from system config
 */
export async function getSettings(): Promise<Settings> {
  try {
    const config = await getSystemConfig()
    return config.settings || {}
  } catch (error) {
    console.error('Failed to get settings:', error)
    return {}
  }
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
