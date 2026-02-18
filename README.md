# meimberg.io Contentmanager

A Next.js content management app for blog posts, powered by Storyblok CMS with AI-assisted content generation.

## Features

- **Blog Post Management** — Create, edit, and publish blog posts stored in Storyblok
- **3-State Status Model** — Content (red/yellow/green) → Published → Social Media
- **AI Content Generation** — Generate all blog content (title, body, abstract, header image) from source material using OpenAI, Anthropic, or Google Gemini
- **DALL-E Header Images** — Auto-generate header pictures with AI-crafted prompts
- **Email Import** — Import blog entries from MS365 mailbox via Microsoft Graph API (Plaud transcriptions)
- **Block-based Body Editor** — Richtext (TipTap), pictures, YouTube, video, dividers, hyperlinks with drag-and-drop
- **Social Media Publishing** — Share posts via Publer
- **Google OAuth** — Secure authentication with email whitelist

## Tech Stack

- **Next.js 15** (App Router) + TypeScript
- **Storyblok CMS** (CDN + Management API)
- **Tailwind CSS** + **shadcn/ui** + **Radix UI**
- **NextAuth v4** (Google OAuth)
- **AI**: OpenAI (GPT-4o, DALL-E 3), Anthropic Claude, Google Gemini
- **Email**: Microsoft Graph API (OAuth2 Client Credentials)
- **Rich Text**: TipTap (ProseMirror)
- **Drag & Drop**: @dnd-kit

## Getting Started

```bash
cp env.example .env
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

For full setup and onboarding, start with:
- [docs/README.md](docs/README.md) — Documentation index
- [docs/SETUP-CHECKLIST.md](docs/SETUP-CHECKLIST.md) — Local setup checklist

## Docker

```bash
# Development (hot reload)
docker compose --profile dev up --build

# Production (local test)
docker compose --profile prod up --build
```

## Documentation

- [docs/README.md](docs/README.md) — Start here (doc map and recommended reading order)
- [docs/SETUP-CHECKLIST.md](docs/SETUP-CHECKLIST.md) — Local setup checklist
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — Development guide and architecture
- [docs/DOCKER-COMPOSE.md](docs/DOCKER-COMPOSE.md) — Docker usage (dev + local prod test)
- [docs/GITHUB-SETUP.md](docs/GITHUB-SETUP.md) — One-time GitHub/CI/CD configuration
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Deployment operations and rollback
