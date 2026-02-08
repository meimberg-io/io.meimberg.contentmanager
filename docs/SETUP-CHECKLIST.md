# Setup Checklist

Quick reference for setting up the meimberg.io Contentmanager.

## Local Development

### 1. Clone & Install

```bash
git clone <repository-url>
cd io.meimberg.contentmanager
npm install
```

### 2. Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com) → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://contentmanager.meimberg.io/api/auth/callback/google`

### 3. Storyblok

1. [Storyblok](https://app.storyblok.com), Space **330326**
2. Get Preview Token (read-only) and Management Token (write)

### 4. Azure AD (Mail Import)

1. [Azure Portal](https://portal.azure.com) → App registrations → New
2. Add **Application permissions**: `Mail.Read`, `Mail.ReadWrite`
3. Grant admin consent
4. Create client secret
5. Note: Client ID, Client Secret, Tenant ID

### 5. AI Providers (at least one)

- [ ] **OpenAI** — [platform.openai.com](https://platform.openai.com/api-keys)
- [ ] **Anthropic** — [console.anthropic.com](https://console.anthropic.com)
- [ ] **Google AI** — [aistudio.google.com](https://aistudio.google.com)

### 6. Environment

```bash
cp env.example .env
```

Fill in:
- [ ] `NEXT_PUBLIC_STORYBLOK_TOKEN` + `STORYBLOK_MANAGEMENT_TOKEN`
- [ ] `STORYBLOK_SPACE_ID` (330326)
- [ ] `NEXTAUTH_SECRET` (`openssl rand -base64 32`)
- [ ] `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`
- [ ] `ADMIN_WHITELIST` (oli@meimberg.io)
- [ ] AI API key(s)
- [ ] `MAILINBOX_USERNAME` + Azure credentials
- [ ] `PUBLER_API_KEY` + `PUBLER_WORKSPACE_ID`

### 7. Test

```bash
npm run dev
```

- [ ] Login works
- [ ] Posts list shows entries
- [ ] Import connects to mailbox
- [ ] AI generation works

---

## Production Deployment

### 8. GitHub

See [GITHUB-SETUP.md](GITHUB-SETUP.md) — 9 Variables + 10 Secrets

### 9. DNS

CNAME: `contentmanager.meimberg.io` → `hc-02.meimberg.io`

### 10. Deploy

```bash
git push origin main
```

---

## Storyblok Content Model

**`blog` component fields:**

Content (existing): `pagetitle`, `pageintro`, `date`, `headerpicture`, `teaserimage`, `teasertitle`, `abstract`, `readmoretext`, `body`

Management (prefixed `cm_`):
- `cm_content_complete` (Boolean)
- `cm_content_confirmed_at` (Text)
- `cm_source_raw` (Textarea)
- `cm_source_summarized` (Textarea)
- `cm_ai_hint` (Textarea)
- `cm_image_prompt` (Textarea)
- `cm_socialmedia` (Boolean)
- `cm_publer_published_at` (Text)
- `cm_publer_post_ids` (Text)

System config: story slug `contentmanager_config` in `/system/`, field `config`.

---

## Quick Reference

```bash
npm run dev              # Development server
npm run build            # Production build
npm run lint             # Lint check
npm run pull-sb-components   # Pull Storyblok schema
npm run generate-sb-types    # Generate TS types

# Docker
docker compose --profile dev up --build

# Production
ssh deploy@hc-02.meimberg.io "docker logs meimberg-contentmanager -f"
ssh deploy@hc-02.meimberg.io "cd /srv/projects/meimberg-contentmanager && docker compose restart"
```

## Related Documentation

- [DEVELOPMENT.md](DEVELOPMENT.md) — Development guide
- [DEPLOYMENT.md](DEPLOYMENT.md) — Deployment operations
- [DOCKER-COMPOSE.md](DOCKER-COMPOSE.md) — Docker usage
- [GITHUB-SETUP.md](GITHUB-SETUP.md) — GitHub configuration
