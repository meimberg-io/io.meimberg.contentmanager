# Setup Checklist

Local onboarding for meimberg.io Contentmanager.

For deployment and CI/CD topics, see:
- [GITHUB-SETUP.md](GITHUB-SETUP.md)
- [DEPLOYMENT.md](DEPLOYMENT.md)

## 1) Clone and Install

```bash
git clone <repository-url>
cd io.meimberg.contentmanager
npm install
cp env.example .env
```

## 2) Configure Integrations

### Google OAuth

1. Open [Google Cloud Console](https://console.cloud.google.com) -> Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://contentmanager.meimberg.io/api/auth/callback/google`

### Storyblok

1. Open [Storyblok](https://app.storyblok.com), Space `330326`
2. Create/copy:
   - Preview token (read-only)
   - Management token (write)

### Azure AD / Entra (Mail Import)

1. Open [Azure Portal](https://portal.azure.com) -> App registrations -> New
2. Add application permissions: `Mail.Read`, `Mail.ReadWrite`
3. Grant admin consent
4. Create client secret
5. Copy tenant ID, client ID, and client secret

### AI Provider (at least one required)

- [ ] OpenAI (`OPENAI_API_KEY`)
- [ ] Anthropic (`ANTHROPIC_API_KEY`)
- [ ] Google AI (`GOOGLE_AI_API_KEY`)

## 3) Fill Environment Variables

Populate `.env` with values from your setup.

Required in practice:
- [ ] `NEXT_PUBLIC_STORYBLOK_TOKEN`
- [ ] `STORYBLOK_MANAGEMENT_TOKEN`
- [ ] `STORYBLOK_SPACE_ID=330326`
- [ ] `NEXTAUTH_SECRET` (generate via `openssl rand -base64 32`)
- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `ADMIN_WHITELIST`
- [ ] At least one AI API key
- [ ] `MAILINBOX_USERNAME`
- [ ] `AZURE_TENANT_ID`
- [ ] `AZURE_CLIENT_ID`
- [ ] `AZURE_CLIENT_SECRET`
- [ ] `PUBLER_API_KEY`
- [ ] `PUBLER_WORKSPACE_ID`

## 4) Start and Validate

```bash
npm run dev
```

Validate in the UI:
- [ ] Google login works
- [ ] Posts list loads
- [ ] Import can read mailbox
- [ ] AI generation works with configured provider

## 5) Useful Commands

```bash
npm run dev
npm run lint
npm run pull-sb-components
npm run generate-sb-types
```

Docker (optional):

```bash
docker compose --profile dev up --build
```

## Related Documentation

- [README.md](../README.md) — Project overview
- [docs/README.md](README.md) — Documentation index
- [DEVELOPMENT.md](DEVELOPMENT.md) — Architecture and development workflow
- [DOCKER-COMPOSE.md](DOCKER-COMPOSE.md) — Docker usage
