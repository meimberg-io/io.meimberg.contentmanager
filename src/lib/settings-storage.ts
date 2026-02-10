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
  body?: string
  headerImage?: string
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
  headerImage: `Basierend auf dem folgenden Quellmaterial, erstelle eine prägnante Bildbeschreibung (Prompt) für ein KI-generiertes Header-Bild eines Blogposts.

Anforderungen:
- Die Beschreibung soll auf Englisch sein (für DALL-E)
- Beschreibe eine stimmungsvolle, abstrakte oder symbolische Szene, die das Thema visuell einfängt
- Kein Text im Bild
- Stil: modern, clean, professionell, leicht editorial
- Farbpalette: harmonisch, nicht zu bunt
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
