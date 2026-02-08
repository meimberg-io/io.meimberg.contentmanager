# GitHub Setup

Initial configuration required for automatic deployment.

## GitHub Variables

**Settings → Secrets and variables → Actions → Variables**

| Name | Value | Description |
|------|-------|-------------|
| `APP_DOMAIN` | `luxarise-admin.meimberg.io` | Application domain (**required**) |
| `SERVER_HOST` | `hc-02.meimberg.io` | Server hostname (**required**) |
| `SERVER_USER` | `deploy` | SSH user (**required**) |
| `NEXT_PUBLIC_STORYBLOK_DISABLECACHING` | `false` | Storyblok cache control (**required**) |
| `SHOPIFY_SHOP_URL` | `luxarise.myshopify.com (**required**) |
| `SHOPIFY_API_VERSION` | `2026-01` | Shopify API version (**required**) |
| `ONEDRIVE_IMAGES_FOLDER` | `/Luxarise/storyblok_import` | OneDrive import folder (**required**) |
| `OPENAI_MODEL` | `gpt-5.2` | OpenAI model (optional) |
| `PUBLER_WORKSPACE_ID` | `682f9b3922c161a9bbdd24b4` | Publer workspace ID (**required**) |

## GitHub Secrets

**Settings → Secrets and variables → Actions → Secrets**

### Deployment & Auth

| Name | Description |
|------|-------------|
| `SSH_PRIVATE_KEY` | Deploy user private key (**required**) |
| `NEXTAUTH_SECRET` | NextAuth encryption secret (**required**) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (**required**) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret (**required**) |
| `ADMIN_WHITELIST` | Comma-separated admin emails (**required**) |

### Storyblok

| Name | Description |
|------|-------------|
| `NEXT_PUBLIC_STORYBLOK_TOKEN` | Storyblok public/preview token (**required**) |
| `STORYBLOK_MANAGEMENT_TOKEN` | Storyblok management API token (**required**) |

### Integrations

| Name | Description |
|------|-------------|
| `ONEDRIVE_CLIENT_ID` | Azure app client ID (**required**) |
| `ONEDRIVE_CLIENT_SECRET` | Azure app client secret (**required**) |
| `ONEDRIVE_TENANT_ID` | Azure directory tenant ID (**required**) |
| `SHOPIFY_CLIENT_ID` | Shopify app client ID (**required**) |
| `SHOPIFY_CLIENT_SECRET` | Shopify app client secret (**required**) |
| `PUBLER_API_KEY` | Publer API key (**required**) |
| `OPENAI_API_KEY` | OpenAI API key (**required**) |

**Get SSH private key:**
```bash
cat ~/.ssh/id_rsa
# Or your deploy key: cat ~/.ssh/deploy_key
```

Copy entire output including `-----BEGIN` and `-----END` lines.

**Generate secrets:**
```bash
openssl rand -base64 32  # NEXTAUTH_SECRET, REVALIDATE_SECRET
```

---

## DNS Configuration

**Add CNAME record:**
```
luxarise-admin.meimberg.io  →  CNAME  →  hc-02.meimberg.io
```

---

## Server Infrastructure

**Prerequisites (one-time setup):**

The server must have infrastructure in place before first deployment:

✅ **Already done for meimberg.io servers:**
- Docker + Docker Compose
- Traefik reverse proxy (automatic SSL)
- `deploy` user (for deployments)
- Firewall rules (SSH, HTTP, HTTPS)

**If setting up a new server**, run Ansible first:

```bash
cd ../io.meimberg.ansible
ansible-galaxy collection install -r requirements.yml
ansible-playbook -i inventory/hosts.ini playbooks/site.yml --vault-password-file vault_pass
```

---

## First Deployment

### Checklist

Before first deployment:

- [ ] GitHub Variables added (8 total)
- [ ] GitHub Secrets added (17 total)
- [ ] DNS CNAME record configured
- [ ] Server infrastructure ready (Ansible deployed)
- [ ] Can SSH to server: `ssh deploy@hc-02.meimberg.io`
- [ ] Google OAuth redirect URI configured: `https://luxarise-admin.meimberg.io/api/auth/callback/google`

### Deploy

```bash
git add .
git commit -m "Setup deployment"
git push origin main
```

**Monitor:** Repository → Actions

**Deployment takes ~6-10 minutes:**
1. ✅ Tests run (lint, build)
2. ✅ Docker image builds
3. ✅ Pushes to GitHub Container Registry
4. ✅ SSHs to server
5. ✅ Deploys container with Traefik labels
6. ✅ App live at https://luxarise-admin.meimberg.io

---

## Troubleshooting

### GitHub Actions fails at deploy step

```bash
# Test SSH manually
ssh deploy@hc-02.meimberg.io "echo 'SSH works'"

# Check Traefik network
ssh deploy@hc-02.meimberg.io "docker network ls | grep traefik"
```

### Container not starting

```bash
ssh deploy@hc-02.meimberg.io "docker logs luxarise-admin"
```

### OAuth redirect fails

Verify Google Cloud Console redirect URI:
```
✅ https://luxarise-admin.meimberg.io/api/auth/callback/google
```

### Image pull failed

- Automatically handled via `GITHUB_TOKEN`
- If still failing: Settings → Packages → Package settings → Change visibility

---

## Changing Domain

1. Update DNS CNAME record
2. Update GitHub Variable `APP_DOMAIN`
3. Update Google OAuth redirect URI
4. Push to trigger redeploy

---

## Related Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment operations
- [SETUP-CHECKLIST.md](SETUP-CHECKLIST.md) - Full setup checklist
- [DOCKER-COMPOSE.md](DOCKER-COMPOSE.md) - Local development
- [README.md](../README.md) - Project documentation
