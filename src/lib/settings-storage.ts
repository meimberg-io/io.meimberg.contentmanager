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
  generateAll?: string
  body?: string
}

export interface Settings {
  aiModel?: string
  aiPrompts?: AiPrompts
  notes?: string
}

export const DEFAULT_PROMPTS: Required<AiPrompts> = {
  pagetitle: `Basierend auf dem Quellmaterial, generiere einen überzeugenden Blog-Titel. Der Titel sollte einprägsam sein und den Kern des Themas erfassen. Maximal 80 Zeichen. Gib NUR den Titel zurück, keine Erklärung. Sprache: Deutsch.`,
  pageintro: `Basierend auf dem Quellmaterial, schreibe eine Einleitung für den Blogpost. Die Einleitung sollte den Leser ins Thema einführen und Kontext geben. 2-4 Sätze. Gib NUR den Text zurück. Sprache: Deutsch.`,
  teasertitle: `Basierend auf dem Quellmaterial, generiere einen kurzen Teaser-Titel. Dieser wird als Überschrift in der Vorschau / Teaser-Karte angezeigt. Maximal 60 Zeichen. Gib NUR den Titel zurück. Sprache: Deutsch.`,
  abstract: `Basierend auf dem Quellmaterial, schreibe eine kurze Zusammenfassung / ein Abstract für den Blogpost. Der Text sollte neugierig machen und zum Weiterlesen anregen. 2-3 Sätze, ca. 150-250 Zeichen. Gib NUR den Text zurück. Sprache: Deutsch.`,
  readmoretext: `Basierend auf dem Quellmaterial, generiere einen kurzen "Weiterlesen"-Text. Dieser Text erscheint als Call-to-Action unter dem Teaser. Maximal 50 Zeichen. Gib NUR den Text zurück (z.B. "Mehr über XY erfahren", "Warum XY wichtig ist"). Sprache: Deutsch.`,
  generateAll: `Basierend auf dem Quellmaterial, generiere die folgenden Blog-Felder.
Antworte im JSON-Format:

{
  "pagetitle": "Seitentitel (max 80 Zeichen)",
  "pageintro": "Einleitungstext (2-4 Sätze)",
  "teasertitle": "Teaser-Titel für Vorschau (max 60 Zeichen)",
  "abstract": "Kurze Zusammenfassung (2-3 Sätze, 150-250 Zeichen)",
  "readmoretext": "Weiterlesen CTA (max 50 Zeichen)"
}

Sprache: Deutsch.
Antworte NUR mit dem JSON-Objekt, keine Erklärung.`,
  body: `Basierend auf dem folgenden Quellmaterial, schreibe einen ausführlichen, gut strukturierten Blogartikel.

Anforderungen:
- Strukturiere den Artikel mit Überschriften: verwende ## für Hauptabschnitte und ### für Unterabschnitte. Nutze beide Ebenen für eine gute Gliederung.
- Verwende **fett** für wichtige Begriffe und Schlüsselwörter
- Verwende *kursiv* für Betonungen und Fachbegriffe
- Verwende Aufzählungen mit Bindestrich (- Punkt 1, - Punkt 2) wo sinnvoll, z.B. für Vorteile, Schritte oder Auflistungen
- Füge relevante Links ein, wenn im Quellmaterial URLs erwähnt werden, im Format [Linktext](URL)
- Der Artikel sollte 800-1500 Wörter lang sein
- Schreibe in einem professionellen aber zugänglichen Stil
- Beginne NICHT mit einem Titel oder einer Überschrift der Ebene # (der Seitentitel wird separat generiert)
- Beginne direkt mit einem einleitenden Absatz, dann folgen die ## Abschnitte

Sprache: Deutsch.
Antworte NUR mit dem Artikeltext in Markdown, keine Erklärung oder Meta-Kommentare.`,
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
