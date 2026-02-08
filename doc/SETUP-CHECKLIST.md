# Setup Checklist

Quick reference checklist for Luxarise Admin setup and deployment.

## Local Development

### 1. Clone Repository

```bash
cd ~/workspace
git clone <repository-url>
cd com.luxarise.admin.frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Google OAuth App

**Create OAuth 2.0 credentials in Google Cloud Console:**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing: "Luxarise"
3. Navigate to "APIs & Services" → "Credentials"
4. Click "Create Credentials" → "OAuth client ID"
5. Choose "Web application"
6. Configure:
   - **Name**: Luxarise Admin
   - **Authorized JavaScript origins**:
     - `http://localhost:3000`
     - `https://luxarise-admin.meimberg.io`
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://luxarise-admin.meimberg.io/api/auth/callback/google`
7. Save and copy **Client ID** and **Client Secret**

### 4. Configure Storyblok

**Get Storyblok API Tokens:**

1. Log into [Storyblok](https://app.storyblok.com)
2. Select Space: **330326** (same as io.meimberg.www)
3. Get **Public Preview Token**:
   - Settings → Access Tokens → Preview Token
   - This token is read-only (safe to expose in browser)
4. Get **Management API Token**:
   - Settings → Access Tokens → Management Token
   - ⚠️  This token has WRITE access - keep secure!

**Add fields to luxarise_picture content type:**

Navigate to "Content Types" → "luxarise_picture" and add these fields:

- `content_complete` (Boolean, default: false)
- `content_confirmed_at` (Datetime)
- `gelato_published_at` (Datetime)
- `shopify_product_id` (Text)
- `shopify_product_url` (Text)
- `shopify_finalized` (Boolean)
- `shopify_finalized_at` (Datetime)
- `publer_post_ids` (Text - JSON array as string)
- `publer_published_at` (Datetime)
- `import_date` (Datetime)
- `last_modified` (Datetime)

### 5. Configure OneDrive API (Microsoft Azure)

**Create Azure App Registration:**

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **"App registrations"** → **"New registration"**
3. Configure application:
   - **Name**: `Luxarise Admin OneDrive`
   - **Supported account types**: "Accounts in any organizational directory and personal Microsoft accounts"
   - **Redirect URI**:
     - Type: Web
     - URL: `http://localhost:3000/api/onedrive/callback`
4. Click **"Register"**
5. Copy the **Application (client) ID** → This is your `ONEDRIVE_CLIENT_ID`
6. Copy the **Directory (tenant) ID** → This is your `ONEDRIVE_TENANT_ID`

**Create Client Secret:**

7. Navigate to **"Certificates & secrets"** → **"Client secrets"** → **"New client secret"**
8. Description: `Luxarise Admin Secret`
9. Expires: 24 months (or as needed)
10. Click **"Add"**
11. ⚠️  **IMPORTANT**: Copy the **Value** immediately → This is your `ONEDRIVE_CLIENT_SECRET`
    - You won't be able to see this value again!

**Configure API Permissions:**

12. Navigate to **"API permissions"** → **"Add a permission"**
13. Select **"Microsoft Graph"** → **"Delegated permissions"**
14. Add these permissions:
    - ✅ `Files.Read` - Read user files
    - ✅ `Files.Read.All` - Read all files user can access
    - ✅ `Files.ReadWrite` - Have full access to user files (needed for delete after import)
    - ✅ `offline_access` - Maintain access to data
15. Click **"Add permissions"**
16. (Optional) Click **"Grant admin consent"** if you're an admin

**Add Production Redirect URI (Later):**

17. Navigate to **"Authentication"** → **"Platform configurations"** → **"Web"**
18. Add redirect URI: `https://luxarise-admin.meimberg.io/api/onedrive/callback`
19. Save changes

**Configure OneDrive Folder:**

20. Create folder in your OneDrive: `/Luxarise/ArtImages`
21. This is where you'll place images to import

### 6. Get Additional API Keys

- [ ] **OpenAI API Key**: [platform.openai.com](https://platform.openai.com/api-keys)
- [ ] **Gelato API Key**: Contact Gelato support
- [ ] **Shopify API Token**: Shopify Admin → Apps → Private apps
- [ ] **Etsy API Key**: [Etsy Developers](https://www.etsy.com/developers)
- [ ] **Publer API Key**: Publer Settings → API

### 7. Environment Setup

```bash
cp env.example .env.local
```

Edit `.env.local` with your values:

- [ ] `NEXT_PUBLIC_STORYBLOK_TOKEN` - Public preview token
- [ ] `STORYBLOK_MANAGEMENT_TOKEN` - Management API token (keep secret!)
- [ ] `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- [ ] `GOOGLE_CLIENT_ID` - From Google Cloud Console
- [ ] `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- [ ] `ADMIN_WHITELIST` - `oli@meimberg.io`
- [ ] `ONEDRIVE_CLIENT_ID` - Application (client) ID from Azure
- [ ] `ONEDRIVE_CLIENT_SECRET` - Client secret value from Azure
- [ ] `ONEDRIVE_TENANT_ID` - Directory (tenant) ID from Azure (use `common` for personal accounts)
- [ ] `ONEDRIVE_IMAGES_FOLDER` - `/Luxarise/ArtImages` (folder path in OneDrive)
- [ ] `OPENAI_API_KEY` - From OpenAI
- [ ] All publishing API keys

### 8. Test Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and test:

- [ ] Login with Google (oli@meimberg.io should work)
- [ ] Dashboard loads
- [ ] Can navigate to all pages
- [ ] Mock data displays correctly

### 9. Test Docker (Optional)

```bash
# Start with Docker
docker compose --profile dev up --build

# Access at http://localhost:3000
```

---

## Production Deployment

### 10. Initialize Git Repository

```bash
git init
git add .
git commit -m "Initial commit: Luxarise Admin migration"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 11. GitHub Secrets Configuration

**Navigate to:** GitHub Repository → Settings → Secrets and variables → Actions

**Secrets (keep confidential):**

- [ ] `SSH_PRIVATE_KEY` - Deploy user SSH key
- [ ] `NEXT_PUBLIC_STORYBLOK_TOKEN` - Public preview token
- [ ] `STORYBLOK_MANAGEMENT_TOKEN` - Management token ⚠️  CRITICAL
- [ ] `GOOGLE_CLIENT_ID` - Google OAuth Client ID
- [ ] `GOOGLE_CLIENT_SECRET` - Google OAuth secret
- [ ] `NEXTAUTH_SECRET` - Generate unique secret
- [ ] `ADMIN_WHITELIST` - `oli@meimberg.io`
- [ ] `NEXT_PUBLIC_STORYBLOK_EDITOR_SECRET` - Editor preview secret
- [ ] `REVALIDATE_SECRET` - Cache revalidation secret
- [ ] `OPENAI_API_KEY` - OpenAI API key
- [ ] `ONEDRIVE_CLIENT_ID` - OneDrive client ID
- [ ] `ONEDRIVE_CLIENT_SECRET` - OneDrive secret
- [ ] `GELATO_API_KEY` - Gelato API key
- [ ] `SHOPIFY_API_TOKEN` - Shopify token
- [ ] `ETSY_API_KEY` - Etsy API key
- [ ] `PUBLER_API_KEY` - Publer API key

**Variables (non-sensitive):**

- [ ] `APP_DOMAIN` = `luxarise-admin.meimberg.io`
- [ ] `SERVER_HOST` = `hc-02.meimberg.io`
- [ ] `SERVER_USER` = `deploy`
- [ ] `SHOPIFY_SHOP_URL` = `luxarise.myshopify.com`
- [ ] `NEXT_PUBLIC_STORYBLOK_DISABLECACHING` = `false`

### 12. DNS Configuration

- [ ] CNAME: `luxarise-admin.meimberg.io` → `hc-02.meimberg.io`
- [ ] Test: `dig luxarise-admin.meimberg.io +short`

### 13. Server Infrastructure

Verify prerequisites on server:

- [ ] Ansible infrastructure deployed (Docker, Traefik, deploy user)
- [ ] Can SSH to server: `ssh deploy@hc-02.meimberg.io`
- [ ] Traefik network exists: `docker network ls | grep traefik`
- [ ] Deploy directory writable: `/srv/projects/`

### 14. First Deployment

```bash
git add .
git commit -m "Setup production deployment"
git push origin main
```

- [ ] Watch GitHub Actions: Repository → Actions tab
- [ ] Wait for all jobs to complete (test, build-and-push, deploy)
- [ ] Verify container running: `ssh deploy@hc-02.meimberg.io "docker ps | grep luxarise-admin"`
- [ ] Test app: [https://luxarise-admin.meimberg.io](https://luxarise-admin.meimberg.io)

---

## Verification

### Check Local Development

```bash
# Server running
curl -I http://localhost:3000

# Can access login page
open http://localhost:3000/login

# Check logs
# (View browser console or terminal output)
```

### Check Production Deployment

```bash
# Container running
ssh deploy@hc-02.meimberg.io "docker ps | grep luxarise-admin"

# View logs
ssh deploy@hc-02.meimberg.io "docker logs luxarise-admin -f"

# Test HTTPS
curl -I https://luxarise-admin.meimberg.io

# Check SSL certificate
curl -vI https://luxarise-admin.meimberg.io 2>&1 | grep -i "subject:"
```

### Test Application Features

- [ ] Google OAuth login works (oli@meimberg.io)
- [ ] Non-whitelisted emails are rejected
- [ ] Dashboard loads with statistics
- [ ] Can navigate to all pages
- [ ] Storyblok connection works (images load)
- [ ] Can import from OneDrive (if configured)
- [ ] AI content generation works (if OpenAI configured)
- [ ] Publishing buttons are visible (even if APIs not configured)

---

## Common Issues

### Local Development

❌ **Google OAuth not working** → Check Client ID/Secret in `.env.local`  
❌ **"Email not whitelisted"** → Add email to `ADMIN_WHITELIST` in `.env.local`  
❌ **Storyblok connection fails** → Verify `NEXT_PUBLIC_STORYBLOK_TOKEN`  
❌ **Port 3000 in use** → Change `APP_PORT` in `.env.local`  
❌ **Build fails** → Check Node version (18+) with `node -v`  

### Deployment

❌ **GitHub Actions fails on test** → Check lint errors with `npm run lint`  
❌ **Docker build fails** → Check Dockerfile syntax and build args  
❌ **Container not starting** → Check logs: `docker logs luxarise-admin`  
❌ **SSL not working** → DNS not propagated or Traefik misconfigured  
❌ **403/404 errors** → Check Traefik labels in docker-compose.prod.yml  
❌ **OAuth redirect fails** → Verify redirect URIs in Google Cloud Console  

---

## Security Checklist

- [ ] `STORYBLOK_MANAGEMENT_TOKEN` is NEVER in browser/client code
- [ ] All API keys are in server-side env vars (not `NEXT_PUBLIC_*`)
- [ ] Only whitelisted emails can access admin
- [ ] All write API routes use `requireAuth()` middleware
- [ ] Session cookies are HTTP-only (automatic with NextAuth)
- [ ] HTTPS enabled in production (via Traefik)

---

## Quick Reference

### Local Commands

```bash
# Development
npm run dev

# Build
npm run build

# Lint
npm run lint

# Pull Storyblok components
npm run pull-sb-components

# Generate TypeScript types from Storyblok
npm run generate-sb-types

# Docker dev
docker compose --profile dev up --build

# Docker prod test (local)
docker compose --profile prod up --build
```

### Production Commands

```bash
# View logs
ssh deploy@hc-02.meimberg.io "docker logs luxarise-admin -f"

# Restart container
ssh deploy@hc-02.meimberg.io "cd /srv/projects/luxarise-admin && docker compose restart"

# Redeploy (pull latest image)
ssh deploy@hc-02.meimberg.io "cd /srv/projects/luxarise-admin && docker compose pull && docker compose up -d"

# SSH into container
ssh deploy@hc-02.meimberg.io "docker exec -it luxarise-admin sh"

# Check environment variables
ssh deploy@hc-02.meimberg.io "docker exec luxarise-admin env | grep STORYBLOK"
```

---

## Next Steps

After successful setup:

1. Test complete workflow: Import → Enrich → Publish
2. Configure all publishing APIs
3. Train users on the interface
4. Monitor logs for errors
5. Set up monitoring/alerts (optional)

---

## Related Documentation

- [README.md](../README.md) - Project overview
- [DEVELOPMENT.md](DEVELOPMENT.md) - Development guide
- [DOCKER-COMPOSE.md](DOCKER-COMPOSE.md) - Docker usage
- [GITHUB-SETUP.md](GITHUB-SETUP.md) - Detailed GitHub configuration
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment operations
- [Frontend Concept](requirements/frontend_concept.md) - UI/UX specification
