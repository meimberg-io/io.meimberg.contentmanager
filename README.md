# meimberg.io Contentmanager

A Next.js-based content management application for blog posts, integrated with Storyblok CMS.

## Features

- **Blog Post Management**: Create, edit, and manage blog posts stored in Storyblok
- **3-State Status Model**: Content Complete → Published → Social Media
- **AI Content Generation**: Generate blog content from Plaud transcription source material using OpenAI, Anthropic, or Google AI
- **Email Import**: Import blog posts from a dedicated MS365 mailbox (Plaud transcriptions)
- **Social Media Publishing**: Schedule posts to multiple social channels via Publer
- **Google OAuth**: Secure authentication with email whitelist

## Tech Stack

- **Next.js 15** (App Router)
- **Storyblok CMS** (CDN + Management API)
- **Tailwind CSS** + **shadcn/ui**
- **NextAuth** (Google OAuth)
- **AI**: OpenAI, Anthropic Claude, Google Gemini
- **Email**: IMAP via `imapflow` + `mailparser`

## Getting Started

1. Copy `env.example` to `.env.local` and fill in your credentials
2. Install dependencies: `npm install`
3. Run the dev server: `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000)

## Storyblok Setup

The `blog` component in Storyblok needs the following fields:

**Content fields** (already existing):
- `pagetitle` (Text), `pageintro` (Textarea), `date` (Date)
- `headerpicture` (Asset), `teaserimage` (Asset)
- `teasertitle` (Text), `abstract` (Textarea), `readmoretext` (Text)
- `body` (Blocks)

**Management fields** (add these, all prefixed with `cm_`):
- `cm_content_complete` (Boolean)
- `cm_content_confirmed_at` (Text)
- `cm_source_raw` (Textarea)
- `cm_source_summarized` (Textarea)
- `cm_socialmedia` (Boolean)
- `cm_publer_published_at` (Text)
- `cm_publer_post_ids` (Text)

## Docker

```bash
# Development
docker compose --profile dev up

# Production
docker compose --profile prod up
```
