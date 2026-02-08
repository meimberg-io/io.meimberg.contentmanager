# Deployment Guide

Deploying the meimberg.io Contentmanager to production.

## Architecture

```
GitHub Actions (CI/CD)
    │ 1. Build Docker image
    │ 2. Push to ghcr.io
    │ 3. SSH to server
    ▼
Server (hc-02.meimberg.io)
    │ 4. Pull image
    │ 5. Deploy with compose
    ▼
Traefik (Reverse Proxy)
    │ 6. SSL/TLS (Let's Encrypt)
    │ 7. Route to container
    ▼
meimberg.io Contentmanager (Port 3000)
```

## Automated Deployment

Push to `main` triggers automatic deployment:

```bash
git push origin main
```

**Pipeline steps (~6-10 min):**
1. Tests (lint + build)
2. Docker image build
3. Push to GitHub Container Registry
4. SSH to server, deploy container

Monitor at: **Repository → Actions**

### Server Directory

```
/srv/projects/meimberg-contentmanager/
├── .env                    # Environment variables (generated)
├── docker-compose.prod.yml # Template (from repo)
└── docker-compose.yml      # Generated (with substituted vars)
```

## Manual Deployment

If GitHub Actions is unavailable:

```bash
# Build locally
docker build -t meimberg-contentmanager:latest \
  --build-arg NEXT_PUBLIC_STORYBLOK_TOKEN=$NEXT_PUBLIC_STORYBLOK_TOKEN .

# Transfer to server
docker save meimberg-contentmanager:latest | gzip > cm.tar.gz
scp cm.tar.gz deploy@hc-02.meimberg.io:/tmp/

# Load on server
ssh deploy@hc-02.meimberg.io "docker load < /tmp/cm.tar.gz"
```

## Post-Deployment

### Verify

```bash
# Container running
ssh deploy@hc-02.meimberg.io "docker ps | grep meimberg-contentmanager"

# Logs
ssh deploy@hc-02.meimberg.io "docker logs meimberg-contentmanager --tail 50"

# Follow live
ssh deploy@hc-02.meimberg.io "docker logs meimberg-contentmanager -f"
```

### Test

1. Open `https://contentmanager.meimberg.io`
2. Login with Google (oli@meimberg.io)
3. Verify dashboard, posts list, import, settings

## Rollback

```bash
ssh deploy@hc-02.meimberg.io
cd /srv/projects/meimberg-contentmanager
docker compose pull    # specific tag if needed
docker compose up -d --force-recreate
```

## Common Operations

```bash
# View status
ssh deploy@hc-02.meimberg.io "docker ps -a | grep meimberg"

# Restart
ssh deploy@hc-02.meimberg.io "cd /srv/projects/meimberg-contentmanager && docker compose restart"

# Force redeploy
ssh deploy@hc-02.meimberg.io "cd /srv/projects/meimberg-contentmanager && docker compose pull && docker compose up -d --force-recreate"

# Edit env on server
ssh deploy@hc-02.meimberg.io "nano /srv/projects/meimberg-contentmanager/.env"
```

## Data

All data lives in Storyblok (SaaS) — no local database.

- Blog posts → Storyblok stories
- Images → Storyblok assets (CDN)
- Settings → Storyblok system config story

## Related Documentation

- [GITHUB-SETUP.md](GITHUB-SETUP.md) — GitHub configuration
- [SETUP-CHECKLIST.md](SETUP-CHECKLIST.md) — Initial setup
- [DOCKER-COMPOSE.md](DOCKER-COMPOSE.md) — Docker usage
