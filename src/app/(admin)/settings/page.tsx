"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Save,
  Check,
  AlertCircle,
  StickyNote,
  RotateCcw,
  CalendarClock,
  CalendarDays,
  Plus,
  X,
  Trash2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Schedule, ScheduleSlot } from "@/types";

// Must match DEFAULT_PROMPTS in settings-storage.ts
const DEFAULT_PROMPTS: Record<string, string> = {
  pagetitle: `Basierend auf dem Quellmaterial, generiere einen überzeugenden Blog-Titel. Der Titel sollte einprägsam sein und den Kern des Themas erfassen. Maximal 80 Zeichen. Gib NUR den Titel zurück, keine Erklärung. Sprache: Deutsch.`,
  pageintro: `Basierend auf dem Quellmaterial, schreibe eine kurze Einleitung für den Blogpost. 2-3 Sätze. Nüchtern, sachlich, auf den Punkt. Den Leser NICHT direkt ansprechen (kein "du", kein "ihr", kein "Sie"). Keine Übertreibungen, keine Superlative, nichts Werbliches. Keine Formulierungen wie "klingt nach Science-Fiction", "spannender Weg" oder "mehr als man denkt" — das ist zu plakativ. Einfach beschreiben, worum es geht, ruhig und unaufgeregt. Gib NUR den Text zurück. Sprache: Deutsch.`,
  teasertitle: `Basierend auf dem Quellmaterial, generiere einen kurzen Teaser-Titel. Dieser wird als Überschrift in der Vorschau / Teaser-Karte angezeigt. Maximal 60 Zeichen. Gib NUR den Titel zurück. Sprache: Deutsch.`,
  abstract: `Basierend auf dem Quellmaterial, schreibe ein kurzes Abstract für den Blogpost. 1-2 Sätze, maximal 120 Zeichen. Sachlich, aber nicht trocken. Subtil eigene Haltung zeigen, ohne aufzutrumpfen. Keine Ausrufezeichen, keine rhetorischen Fragen, keine Wortspiele. Ruhig und klar. Gib NUR den Text zurück. Sprache: Deutsch.`,
  readmoretext: `Basierend auf dem Quellmaterial, generiere einen kurzen "Weiterlesen"-Text. Dieser Text erscheint als Call-to-Action unter dem Teaser. Maximal 50 Zeichen. Gib NUR den Text zurück (z.B. "Mehr über XY erfahren", "Warum XY wichtig ist"). Sprache: Deutsch.`,
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
};

const PROMPT_FIELDS: { key: string; label: string; description: string }[] = [
  { key: "pagetitle", label: "Page Title", description: "Generates the main blog post title (pagetitle)" },
  { key: "pageintro", label: "Page Intro", description: "Generates the introductory paragraph (pageintro)" },
  { key: "teasertitle", label: "Teaser Title", description: "Generates the teaser card headline (teasertitle)" },
  { key: "abstract", label: "Abstract", description: "Generates a short summary / abstract" },
  { key: "readmoretext", label: "Read More Text", description: "Generates the call-to-action text (readmoretext)" },
  { key: "bodyBlogShort", label: "Body — Blog (Short)", description: "Body generation when Meta „Blog (Short)“ is selected (kompakt)." },
  { key: "bodyBlogLong", label: "Body — Blog (Long)", description: "Body generation when Meta „Blog (Long)“ is selected (ausführlich)." },
  { key: "bodyArticle", label: "Body Article (Artikel)", description: "Generates the main body when content type is Article (sachlich, neutral)." },
  { key: "headerImage", label: "Header Image — Blog (DALL-E)", description: "Meta-prompt for Blog content type: expressive, editorial header imagery." },
  { key: "headerImageArticle", label: "Header Image — Article (DALL-E)", description: "Meta-prompt for Article content type: restrained, documentary / business editorial style." },
  { key: "linkedin", label: "LinkedIn Post", description: "Generates the LinkedIn post text (plain text, hook + short paragraphs + CTA, no hashtags/links)." },
];

// Must match DEFAULT_PUBLER_LABELS in settings-storage.ts (MICM-13).
const DEFAULT_PUBLER_LABELS = ["Standard", "Series 1", "Series 2", "Series 3"];

// ── Scheduler (MICM-14) ──────────────────────────────────────────────
const SCHEDULE_TIMEZONE = "Europe/Berlin";

// weekday uses JS getDay(): 0 = Sonntag … 6 = Samstag. Displayed Monday-first.
const WEEKDAYS: { value: number; label: string }[] = [
  { value: 1, label: "Montag" },
  { value: 2, label: "Dienstag" },
  { value: 3, label: "Mittwoch" },
  { value: 4, label: "Donnerstag" },
  { value: 5, label: "Freitag" },
  { value: 6, label: "Samstag" },
  { value: 0, label: "Sonntag" },
];

const timeToMinutes = (t: string): number => {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
// Sort key: Monday-first weekday, then time-of-day.
const slotSortKey = (s: ScheduleSlot): number => ((s.weekday + 6) % 7) * 10000 + timeToMinutes(s.time);
const weekdayLabel = (w: number): string => WEEKDAYS.find((d) => d.value === w)?.label ?? String(w);

/** Returns a human-readable error message if the schedules are invalid, else null. */
function validateSchedules(list: Schedule[]): string | null {
  const names = new Set<string>();
  for (const s of list) {
    const name = s.name.trim();
    if (!name) return "Jeder Schedule braucht einen Namen.";
    const nameKey = name.toLowerCase();
    if (names.has(nameKey)) return `Doppelter Schedule-Name: „${name}".`;
    names.add(nameKey);
    const slotKeys = new Set<string>();
    for (const slot of s.slots) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.time)) {
        return `Ungültige Uhrzeit „${slot.time}" in „${name}" (Format HH:MM).`;
      }
      const slotKey = `${slot.weekday}-${slot.time}`;
      if (slotKeys.has(slotKey)) return `Doppelter Slot in „${name}": ${weekdayLabel(slot.weekday)} ${slot.time}.`;
      slotKeys.add(slotKey);
    }
  }
  return null;
}

interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google';
  supportsVision: boolean;
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google AI'
};

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'bg-green-500/20 text-green-400 border-green-500/30',
  anthropic: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  google: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
};

export default function SettingsPage() {
  const [isLoaded, setIsLoaded] = useState(false);
  
  // AI Model State
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [allModels, setAllModels] = useState<AIModel[]>([]);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [defaultModel, setDefaultModel] = useState<string>('gpt-5.5');
  
  // AI Prompts State - keyed by prompt field name
  const [prompts, setPrompts] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  // Notes State
  const [notes, setNotes] = useState<string>('');

  // Publer slot labels (MICM-13)
  const [publerLabels, setPublerLabels] = useState<string[]>(DEFAULT_PUBLER_LABELS);

  // Publishing schedules (MICM-14)
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);

  // Load settings and models from API on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [settingsResponse, modelsResponse] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/ai/models')
        ]);
        
        if (settingsResponse.ok) {
          const data = await settingsResponse.json();
          const settings = data.settings || {};
          
          setSelectedModel(settings.aiModel || '');
          setNotes(settings.notes || '');
          setPublerLabels(
            Array.isArray(settings.publerLabels) && settings.publerLabels.length > 0
              ? settings.publerLabels
              : DEFAULT_PUBLER_LABELS
          );
          setSchedules(Array.isArray(settings.schedules) ? settings.schedules : []);
          
          const savedPrompts = settings.aiPrompts || {};
          const merged: Record<string, string> = {};
          for (const field of PROMPT_FIELDS) {
            merged[field.key] = savedPrompts[field.key] || DEFAULT_PROMPTS[field.key];
          }
          if (!merged.bodyBlogLong && savedPrompts.body) {
            merged.bodyBlogLong = savedPrompts.body;
          }
          setPrompts(merged);
        } else {
          setPrompts({ ...DEFAULT_PROMPTS });
        }
        
        if (modelsResponse.ok) {
          const modelsData = await modelsResponse.json();
          setAvailableModels(modelsData.models || []);
          setAllModels(modelsData.allModels || []);
          setAvailableProviders(modelsData.providers || []);
          setDefaultModel(modelsData.defaultModel || 'gpt-5.5');
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        setPrompts({ ...DEFAULT_PROMPTS });
      } finally {
        setIsLoaded(true);
      }
    }
    
    loadData();
  }, []);

  const handleSave = async () => {
    const scheduleError = validateSchedules(schedules);
    if (scheduleError) {
      toast({ variant: 'destructive', title: 'Schedule ungültig', description: scheduleError });
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            aiModel: selectedModel || undefined,
            aiPrompts: prompts,
            notes,
            publerLabels: publerLabels.map((l) => l.trim()).filter(Boolean),
            schedules: schedules.map((s) => ({
              ...s,
              name: s.name.trim(),
              slots: [...s.slots].sort((a, b) => slotSortKey(a) - slotSortKey(b)),
            })),
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
      
      toast({
        title: 'Settings saved',
        description: 'Your settings have been updated.'
      });
      
      setTimeout(() => setIsSaving(false), 1000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save settings. Please try again.'
      });
      setIsSaving(false);
    }
  };

  const handleResetPrompt = (key: string) => {
    setPrompts(prev => ({ ...prev, [key]: DEFAULT_PROMPTS[key] }));
  };

  const handleResetAll = () => {
    setPrompts({ ...DEFAULT_PROMPTS });
  };

  const setPromptValue = (key: string, value: string) => {
    setPrompts(prev => ({ ...prev, [key]: value }));
  };

  const setLabelAt = (index: number, value: string) => {
    setPublerLabels(prev => prev.map((l, i) => (i === index ? value : l)));
  };
  const removeLabel = (index: number) => {
    setPublerLabels(prev => prev.filter((_, i) => i !== index));
  };
  const addLabel = () => {
    setPublerLabels(prev => [...prev, ""]);
  };

  // ── Schedules (MICM-14) ──
  const addSchedule = () =>
    setSchedules((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: `Schedule ${prev.length + 1}`, timezone: SCHEDULE_TIMEZONE, slots: [], queue: [], lastFiredAt: null },
    ]);
  const renameSchedule = (id: string, name: string) =>
    setSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  const confirmDeleteSchedule = () => {
    setSchedules((prev) => prev.filter((s) => s.id !== scheduleToDelete));
    setScheduleToDelete(null);
  };
  const addSlot = (id: string) =>
    setSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, slots: [...s.slots, { weekday: 1, time: "10:00" }] } : s)));
  const removeSlot = (id: string, idx: number) =>
    setSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, slots: s.slots.filter((_, i) => i !== idx) } : s)));
  const setSlot = (id: string, idx: number, patch: Partial<ScheduleSlot>) =>
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, slots: s.slots.map((sl, i) => (i === idx ? { ...sl, ...patch } : sl)) } : s))
    );

  const effectiveModel = selectedModel || defaultModel;
  const effectiveModelInfo = allModels.find(m => m.id === effectiveModel);
  const isModelAvailable = availableModels.some(m => m.id === effectiveModel);

  if (!isLoaded) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="animate-fade-in">
          <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure AI prompts and model
          </p>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="animate-fade-in">
        <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure AI prompts and model
        </p>
      </div>

      <Tabs defaultValue="prompts" className="space-y-6">
        <TabsList className="bg-muted/50 grid w-full grid-cols-5">
          <TabsTrigger value="prompts" className="gap-2">
            <Sparkles className="h-4 w-4 text-blue-400" />
            Prompts
          </TabsTrigger>
          <TabsTrigger value="model" className="gap-2">
            <Sparkles className="h-4 w-4 text-blue-400" />
            Model
          </TabsTrigger>
          <TabsTrigger value="publer" className="gap-2">
            <CalendarClock className="h-4 w-4 text-[#0a66c2]" />
            Publer
          </TabsTrigger>
          <TabsTrigger value="schedules" className="gap-2">
            <CalendarDays className="h-4 w-4 text-blue-400" />
            Schedules
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2">
            <StickyNote className="h-4 w-4" />
            Notes
          </TabsTrigger>
        </TabsList>

        {/* Prompts Tab */}
        <TabsContent value="prompts" className="space-y-6 animate-fade-in">
          <div className="glass-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">Generation Prompts</h2>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={handleResetAll}>
                <RotateCcw className="h-3 w-3" />
                Reset All to Defaults
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              These prompts are sent to the AI model when generating content. The source material (raw transcription + summary) is automatically prepended.
            </p>
            
            {PROMPT_FIELDS.map(field => (
              <div key={field.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`prompt-${field.key}`}>{field.label}</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs text-muted-foreground"
                    onClick={() => handleResetPrompt(field.key)}
                  >
                    Reset
                  </Button>
                </div>
                <Textarea
                  id={`prompt-${field.key}`}
                  className="font-mono bg-secondary/50 resize-none overflow-hidden"
                  value={prompts[field.key] || ''}
                  onChange={(e) => setPromptValue(field.key, e.target.value)}
                  onInput={(e) => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }}
                  ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">{field.description}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button className="gap-2" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {isSaving ? 'Saved!' : 'Save Settings'}
            </Button>
          </div>
        </TabsContent>

        {/* Model Tab */}
        <TabsContent value="model" className="space-y-6 animate-fade-in">
          <div className="glass-card p-6 space-y-4">
            <h2 className="font-display text-xl font-semibold">AI Model</h2>
            
            <div className="flex flex-wrap gap-2">
              {['openai', 'anthropic', 'google'].map(provider => {
                const isAvailable = availableProviders.includes(provider);
                return (
                  <Badge 
                    key={provider}
                    variant="outline"
                    className={isAvailable ? PROVIDER_COLORS[provider] : 'bg-muted/50 text-muted-foreground border-muted'}
                  >
                    {isAvailable ? <Check className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                    {PROVIDER_LABELS[provider]}
                  </Badge>
                );
              })}
            </div>
            
            {availableModels.length === 0 ? (
              <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/10">
                <p className="text-sm text-destructive">
                  No AI providers configured. Please set at least one API key in your environment variables:
                </p>
                <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside">
                  <li>OPENAI_API_KEY for OpenAI (GPT-4o)</li>
                  <li>ANTHROPIC_API_KEY for Claude</li>
                  <li>GOOGLE_AI_API_KEY for Gemini</li>
                </ul>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="ai-model">Select Model</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue placeholder={`Default: ${defaultModel}`} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {availableModels.map(model => (
                      <SelectItem key={model.id} value={model.id}>
                        <span className="flex items-center gap-2">
                          {model.name}
                          <Badge variant="outline" className={`text-xs ${PROVIDER_COLORS[model.provider]}`}>
                            {PROVIDER_LABELS[model.provider]}
                          </Badge>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Current: {effectiveModelInfo?.name || effectiveModel}
                  {!isModelAvailable && effectiveModel && (
                    <span className="text-destructive ml-2">(not available - will use default)</span>
                  )}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button className="gap-2" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {isSaving ? 'Saved!' : 'Save Settings'}
            </Button>
          </div>
        </TabsContent>

        {/* Publer Tab */}
        <TabsContent value="publer" className="space-y-6 animate-fade-in">
          <div className="glass-card p-6 space-y-4">
            <h2 className="font-display text-xl font-semibold">Publer Slot Labels</h2>
            <p className="text-sm text-muted-foreground">
              These labels map to the timeslot series in your Publer posting schedule. Each LinkedIn post
              picks one; on publish it is auto-scheduled into the next free slot tagged with that label
              (matched by name in Publer). The first label is the default for new posts.
            </p>

            <div className="space-y-2">
              {publerLabels.map((label, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={label}
                    onChange={(e) => setLabelAt(i, e.target.value)}
                    placeholder="Label name (e.g. Series 1)"
                    className="bg-secondary/50"
                  />
                  {i === 0 && (
                    <Badge variant="outline" className="shrink-0 text-xs text-muted-foreground">
                      Default
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground/60 hover:bg-red-600 hover:text-white cursor-pointer"
                    onClick={() => removeLabel(i)}
                    disabled={publerLabels.length <= 1}
                    title={publerLabels.length <= 1 ? "Keep at least one label" : "Remove label"}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button variant="outline" size="sm" className="gap-2" onClick={addLabel}>
              <Plus className="h-3.5 w-3.5" />
              Add label
            </Button>
          </div>

          <div className="flex justify-end">
            <Button className="gap-2" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {isSaving ? 'Saved!' : 'Save Settings'}
            </Button>
          </div>
        </TabsContent>

        {/* Schedules Tab */}
        <TabsContent value="schedules" className="space-y-6 animate-fade-in">
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">Veröffentlichungs-Schedules</h2>
              <Button variant="outline" size="sm" className="gap-2" onClick={addSchedule}>
                <Plus className="h-3.5 w-3.5" />
                Schedule
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Ein Schedule ist eine Liste wöchentlich wiederkehrender Zeit-Slots (Zeitzone {SCHEDULE_TIMEZONE}).
              Eingeplante Beiträge werden der Reihe nach in die nächsten freien Slots veröffentlicht.
            </p>

            {schedules.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Noch kein Schedule angelegt.</p>
            ) : (
              <div className="space-y-4">
                {schedules.map((s) => {
                  const sortedSlots = [...s.slots].sort((a, b) => slotSortKey(a) - slotSortKey(b));
                  return (
                    <div key={s.id} className="rounded-lg border border-border/60 bg-secondary/30 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Input
                          value={s.name}
                          onChange={(e) => renameSchedule(s.id, e.target.value)}
                          placeholder="Schedule-Name"
                          className="bg-secondary/50 font-medium"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 text-muted-foreground/60 hover:bg-red-600 hover:text-white cursor-pointer"
                          onClick={() => setScheduleToDelete(s.id)}
                          title="Schedule löschen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {s.slots.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Keine Slots — füge wöchentliche Zeitpunkte hinzu.</p>
                        ) : (
                          s.slots.map((slot, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <Select value={String(slot.weekday)} onValueChange={(v) => setSlot(s.id, i, { weekday: Number(v) })}>
                                <SelectTrigger className="bg-secondary/50 w-40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-popover">
                                  {WEEKDAYS.map((d) => (
                                    <SelectItem key={d.value} value={String(d.value)}>
                                      {d.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                type="time"
                                value={slot.time}
                                onChange={(e) => setSlot(s.id, i, { time: e.target.value })}
                                className="bg-secondary/50 w-32"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 shrink-0 text-muted-foreground/60 hover:bg-red-600 hover:text-white cursor-pointer"
                                onClick={() => removeSlot(s.id, i)}
                                title="Slot entfernen"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))
                        )}
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => addSlot(s.id)}>
                          <Plus className="h-3.5 w-3.5" />
                          Slot
                        </Button>
                      </div>

                      {sortedSlots.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {sortedSlots.map((slot, i) => (
                            <Badge key={i} variant="outline" className="text-xs text-muted-foreground">
                              {weekdayLabel(slot.weekday)} {slot.time}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button className="gap-2" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {isSaving ? 'Saved!' : 'Save Settings'}
            </Button>
          </div>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-6 animate-fade-in">
          <div className="glass-card p-6 space-y-4">
            <h2 className="font-display text-xl font-semibold">Notes</h2>
            <p className="text-sm text-muted-foreground">
              Scratch pad for prompts, ideas, or any text you want to save.
            </p>
            <Textarea
              placeholder="Save prompts, ideas, or any text here..."
              className="font-mono bg-secondary/50 resize-none overflow-hidden"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onInput={(e) => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }}
              ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
              rows={10}
            />
          </div>

          <div className="flex justify-end">
            <Button className="gap-2" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {isSaving ? 'Saved!' : 'Save Notes'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={scheduleToDelete !== null}
        onOpenChange={(open) => { if (!open) setScheduleToDelete(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Schedule löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const s = schedules.find((x) => x.id === scheduleToDelete);
                const n = s?.queue.length ?? 0;
                if (n > 0) {
                  return `„${s?.name}" enthält ${n} eingeplante${n === 1 ? "n" : ""} Beitrag${n === 1 ? "" : "e"}. Beim Löschen werden diese nur aus dem Plan genommen und bleiben unveröffentlichte Entwürfe.`;
                }
                return `„${s?.name ?? ""}" wird gelöscht. Das betrifft nur den Schedule, keine Beiträge. Wirksam mit „Save Settings".`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSchedule} className="bg-red-600 hover:bg-red-700">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
