"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";

// Must match DEFAULT_PROMPTS in settings-storage.ts
const DEFAULT_PROMPTS: Record<string, string> = {
  pagetitle: `Basierend auf dem Quellmaterial, generiere einen überzeugenden Blog-Titel. Der Titel sollte einprägsam sein und den Kern des Themas erfassen. Maximal 80 Zeichen. Gib NUR den Titel zurück, keine Erklärung. Sprache: Deutsch.`,
  pageintro: `Basierend auf dem Quellmaterial, schreibe eine kurze Einleitung für den Blogpost. 2-3 Sätze. Nüchtern, sachlich, auf den Punkt. Den Leser NICHT direkt ansprechen (kein "du", kein "ihr", kein "Sie"). Keine Übertreibungen, keine Superlative, nichts Werbliches. Keine Formulierungen wie "klingt nach Science-Fiction", "spannender Weg" oder "mehr als man denkt" — das ist zu plakativ. Einfach beschreiben, worum es geht, ruhig und unaufgeregt. Gib NUR den Text zurück. Sprache: Deutsch.`,
  teasertitle: `Basierend auf dem Quellmaterial, generiere einen kurzen Teaser-Titel. Dieser wird als Überschrift in der Vorschau / Teaser-Karte angezeigt. Maximal 60 Zeichen. Gib NUR den Titel zurück. Sprache: Deutsch.`,
  abstract: `Basierend auf dem Quellmaterial, schreibe ein kurzes Abstract für den Blogpost. 1-2 Sätze, maximal 120 Zeichen. Sachlich, aber nicht trocken. Subtil eigene Haltung zeigen, ohne aufzutrumpfen. Keine Ausrufezeichen, keine rhetorischen Fragen, keine Wortspiele. Ruhig und klar. Gib NUR den Text zurück. Sprache: Deutsch.`,
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
};

const PROMPT_FIELDS: { key: string; label: string; description: string }[] = [
  { key: "pagetitle", label: "Page Title", description: "Generates the main blog post title (pagetitle)" },
  { key: "pageintro", label: "Page Intro", description: "Generates the introductory paragraph (pageintro)" },
  { key: "teasertitle", label: "Teaser Title", description: "Generates the teaser card headline (teasertitle)" },
  { key: "abstract", label: "Abstract", description: "Generates a short summary / abstract" },
  { key: "readmoretext", label: "Read More Text", description: "Generates the call-to-action text (readmoretext)" },
  { key: "generateAll", label: "Generate All (combined)", description: "Used when generating all meta fields at once. Must produce JSON output." },
  { key: "body", label: "Body Article", description: "Generates the main blog article body content as a richtext block with headings, formatting and links." },
  { key: "headerImage", label: "Header Image (DALL-E)", description: "Meta-prompt: generates a DALL-E image prompt from the source material. The resulting prompt is then sent to DALL-E to create the header picture." },
];

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
  const [defaultModel, setDefaultModel] = useState<string>('gpt-4o');
  
  // AI Prompts State - keyed by prompt field name
  const [prompts, setPrompts] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  // Notes State
  const [notes, setNotes] = useState<string>('');

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
          
          const savedPrompts = settings.aiPrompts || {};
          const merged: Record<string, string> = {};
          for (const field of PROMPT_FIELDS) {
            merged[field.key] = savedPrompts[field.key] || DEFAULT_PROMPTS[field.key];
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
          setDefaultModel(modelsData.defaultModel || 'gpt-4o');
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
        <TabsList className="bg-muted/50 grid w-full grid-cols-3">
          <TabsTrigger value="prompts" className="gap-2">
            <Sparkles className="h-4 w-4 text-blue-400" />
            Prompts
          </TabsTrigger>
          <TabsTrigger value="model" className="gap-2">
            <Sparkles className="h-4 w-4 text-blue-400" />
            Model
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
    </div>
  );
}
