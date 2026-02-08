# GitHub Setup

Initial configuration required for automated deployment of meimberg.io Contentmanager.

## GitHub Variables

**Settings → Secrets and variables → Actions → Variables**

| Name | Value | Description |
|------|-------|-------------|
| `APP_DOMAIN` | `contentmanager.meimberg.io` | Application domain |
| `SERVER_HOST` | `hc-02.meimberg.io` | Server hostname |
| `SERVER_USER` | `deploy` | SSH user |
| `NEXT_PUBLIC_STORYBLOK_DISABLECACHING` | `false` | Storyblok cache control |
| `STORYBLOK_SPACE_ID` | `330326` | Storyblok Space ID |
| `ADMIN_WHITELIST` | `oli@meimberg.io` | Allowed admin emails |
| `MAILINBOX_USERNAME` | `bloginbox@meimberg.io` | Mail inbox for blog imports |
| `PUBLER_API_URL` | `https://app.publer.com/api/v1` | Publer API base URL |
| `PUBLER_WORKSPACE_ID` | *(your workspace id)* | Publer workspace ID |

## GitHub Secrets

**Settings → Secrets and variables → Actions → Secrets**

### Deployment & Auth

| Name | Description |
|------|-------------|
| `SSH_PRIVATE_KEY` | Deploy user private key |
| `NEXTAUTH_SECRET` | NextAuth encryption secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

### Storyblok

| Name | Description |
|------|-------------|
| `NEXT_PUBLIC_STORYBLOK_TOKEN` | Storyblok public/preview token |
| `STORYBLOK_MANAGEMENT_TOKEN` | Storyblok management API token |

### AI Providers

| Name | Description |
|------|-------------|
| `OPENAI_API_KEY` | OpenAI API key (GPT-4o, DALL-E) |
| `ANTHROPIC_API_KEY` | Anthropic API key (Claude) |
| `GOOGLE_AI_API_KEY` | Google AI API key (Gemini) |

### Mail Inbox (Azure AD / MS365)

| Name | Description |
|------|-------------|
| `AZURE_CLIENT_ID` | Azure app client ID |
| `AZURE_CLIENT_SECRET` | Azure app client secret |
| `AZURE_TENANT_ID` | Azure directory tenant ID |

### Publer

| Name | Description |
|------|-------------|
| `PUBLER_API_KEY` | Publer API key |

---

## Generate Secrets

```bash
# NEXTAUTH_SECRET
openssl rand -base64 32
```

**SSH private key:**
```bash
cat ~/.ssh/id_rsa
# Copy entire output including -----BEGIN and -----END lines
```

---

## DNS Configuration

```
contentmanager.meimberg.io  →  CNAME  →  hc-02.meimberg.io
```

---

## Server Infrastructure

**Prerequisites (one-time setup via Ansible):**

- Docker + Docker Compose
- Traefik reverse proxy (automatic SSL)
- `deploy` user with Docker permissions
- Firewall rules (SSH, HTTP, HTTPS)

```bash
# If setting up a new server:
cd ../io.meimberg.ansible
ansible-galaxy collection install -r requirements.yml
ansible-playbook -i inventory/hosts.ini playbooks/site.yml --vault-password-file vault_pass
```

---

## First Deployment Checklist

- [ ] GitHub Variables added (9 total)
- [ ] GitHub Secrets added (10 total)
- [ ] DNS CNAME record configured
- [ ] Server infrastructure ready
- [ ] Can SSH: `ssh deploy@hc-02.meimberg.io`
- [ ] Google OAuth redirect URI: `https://contentmanager.meimberg.io/api/auth/callback/google`

### Deploy

```bash
git push origin main
```

Monitor: **Repository → Actions**

---

## Troubleshooting

### GitHub Actions fails at deploy step
```bash
ssh deploy@hc-02.meimberg.io "echo 'SSH works'"
ssh deploy@hc-02.meimberg.io "docker network ls | grep traefik"
```

### Container not starting
```bash
ssh deploy@hc-02.meimberg.io "docker logs meimberg-contentmanager"
```

### OAuth redirect fails
Verify redirect URI in Google Cloud Console:
```
https://contentmanager.meimberg.io/api/auth/callback/google
```

---

## Related Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) — Deployment operations
- [SETUP-CHECKLIST.md](SETUP-CHECKLIST.md) — Full setup checklist
- [DOCKER-COMPOSE.md](DOCKER-COMPOSE.md) — Docker usage
