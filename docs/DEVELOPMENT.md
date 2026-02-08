# Development Guide

Guide for developing the meimberg.io Contentmanager.

## Project Structure

```
io.meimberg.contentmanager/
├── .github/workflows/     # CI/CD pipeline
│   └── deploy.yml
├── docs/                  # Documentation
├── public/                # Static assets
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── (admin)/       # Protected admin routes
│   │   │   ├── dashboard/
│   │   │   ├── posts/     # Blog post list & detail
│   │   │   ├── import/    # Email inbox import
│   │   │   └── settings/  # AI, prompts, system config
│   │   ├── (auth)/        # Login page
│   │   ├── api/           # API routes
│   │   │   ├── auth/      # NextAuth
│   │   │   ├── posts/     # Blog post CRUD
│   │   │   ├── ai/        # AI generation (text + images)
│   │   │   ├── import/    # Mail inbox import
│   │   │   └── posts/[id]/publish/
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/            # shadcn/ui components
│   │   ├── blocks/        # Body block editors (richtext, picture, etc.)
│   │   └── layout/        # AppLayout, NavLink
│   ├── lib/
│   │   ├── storyblok.ts              # Read-only Storyblok client
│   │   ├── storyblok-management.ts   # Write Storyblok client (server-only)
│   │   ├── transform-storyblok.ts    # Story → BlogPost transform
│   │   ├── auth-guard.ts             # Authentication middleware
│   │   ├── openai.ts                 # AI text generation
│   │   ├── ai-provider.ts            # Multi-provider AI model registry
│   │   ├── mail-inbox.ts             # MS365 Graph API mail client
│   │   ├── settings-storage.ts       # System config & AI prompts
│   │   ├── system-config.ts          # Storyblok config story
│   │   └── utils.ts
│   └── types/
├── Dockerfile
├── docker-compose.yml
├── docker-compose.prod.yml
└── package.json
```

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui + Radix UI
- **Authentication**: NextAuth v4 with Google OAuth + email whitelist
- **CMS**: Storyblok (Space 330326)
- **AI**: OpenAI (GPT-4o, DALL-E 3), Anthropic Claude, Google Gemini
- **Email**: Microsoft Graph API (OAuth2 Client Credentials)
- **Rich Text**: TipTap editor
- **Drag & Drop**: @dnd-kit
- **Social Media**: Publer API

## Quick Start

```bash
cp env.example .env
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Key Concepts

### Storyblok Integration

**Two-client architecture:**
- `lib/storyblok.ts` — CDN read-only (safe for browser)
- `lib/storyblok-management.ts` — Management API (server-only)

**Blog posts** live in folder `/blog` (slug `b`). Component: `blog`.

**System config** stored in story slug `contentmanager_config` under `/system/`, field `config`.

### Status Model

| Status | Color | Meaning |
|--------|-------|---------|
| **Content** | Red/Yellow/Green | Fields empty → All filled → Marked complete |
| **Published** | Red/Yellow/Green | Draft → Published with changes → Published |
| **Publer** | Red/Green | Not shared → Shared to social media |

### AI Content Generation

- Prompts stored in Storyblok system config, editable via Settings
- Each field has its own prompt (pagetitle, abstract, body, etc.)
- "Generate All" fires all generators in parallel
- Header images: DALL-E 3 (1792x1024, CSS-cropped to 4:1)
- Source material (`cm_source_raw`, `cm_source_summarized`) is the AI input

### Mail Import

Blog entries imported from `bloginbox@meimberg.io` via Microsoft Graph API:
- Each email = one blog entry
- Two attachments: raw transcription + summary
- Stored in `cm_source_raw` and `cm_source_summarized`

### Body Content

Block-based editor:
- **Richtext** (TipTap / ProseMirror JSON)
- **Picture** (Storyblok asset upload)
- **YouTube** / **Video** / **Divider** / **Hyperlink**
- Drag-and-drop reordering (@dnd-kit)

## Adding Features

### New page

```bash
mkdir src/app/(admin)/my-feature
# Create page.tsx with "use client"
```

### Protected API route

```typescript
import { requireAuth } from '@/lib/auth-guard'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try { await requireAuth() }
  catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }
  // ...
}
```

### Pull Storyblok schema

```bash
npm run pull-sb-components
npm run generate-sb-types
```

## Environment Variables

- `NEXT_PUBLIC_*` — browser-exposed (build-time). Non-sensitive only.
- Regular vars — server-only. All API keys and secrets.
- **Never expose `STORYBLOK_MANAGEMENT_TOKEN` to the browser.**

## Related Documentation

- [SETUP-CHECKLIST.md](SETUP-CHECKLIST.md) — Setup guide
- [DOCKER-COMPOSE.md](DOCKER-COMPOSE.md) — Docker usage
- [DEPLOYMENT.md](DEPLOYMENT.md) — Deployment guide
- [GITHUB-SETUP.md](GITHUB-SETUP.md) — GitHub configuration
