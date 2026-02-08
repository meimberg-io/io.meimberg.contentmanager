# Deployment Guide

Complete guide for deploying Luxarise Admin to production.

## Deployment Architecture

```
┌─────────────────┐
│  GitHub Actions │
│   (CI/CD)       │
└────────┬────────┘
         │ 1. Build Docker image
         │ 2. Push to ghcr.io
         │ 3. SSH to server
         ▼
┌─────────────────┐
│  Server         │
│  hc-02.meimberg │
│  .io            │
└────────┬────────┘
         │ 4. Pull image
         │ 5. Deploy with compose
         ▼
┌─────────────────┐
│   Traefik       │
│   (Reverse      │
│    Proxy)       │
└────────┬────────┘
         │ 6. SSL/TLS
         │ 7. Route to container
         ▼
┌─────────────────┐
│  Luxarise Admin │
│  Container      │
│  (Port 3000)    │
└─────────────────┘
```

## Server Prerequisites

### 1. Server Infrastructure

The server must have:

- **Docker** installed
- **Docker Compose** installed
- **Traefik** running (reverse proxy)
- **Traefik network** created: `docker network create traefik`
- **Deploy user** with Docker permissions
- **SSH access** for deploy user

This is typically managed by Ansible (see `io.meimberg.ansible` repo).

### 2. Traefik Configuration

Traefik handles:
- SSL/TLS certificates (Let's Encrypt)
- HTTPS termination
- Routing by hostname
- Automatic certificate renewal

Verify Traefik is running:

```bash
ssh deploy@hc-02.meimberg.io "docker ps | grep traefik"
```

### 3. DNS Configuration

Set up DNS record:

```
Type: CNAME
Name: luxarise-admin.meimberg.io
Value: hc-02.meimberg.io
TTL: 3600
```

Verify DNS:

```bash
dig luxarise-admin.meimberg.io +short
# Should return server IP
```

## Automated Deployment (Recommended)

### Trigger Deployment

```bash
git push origin main
```

GitHub Actions will automatically:
1. Run tests
2. Build Docker image
3. Push to registry
4. Deploy to server

Monitor at: **Repository → Actions**

### What Happens on Server

The deployment script does:

```bash
# 1. Login to GitHub Container Registry
docker login ghcr.io

# 2. Create project directory
mkdir -p /srv/projects/luxarise-admin

# 3. Create .env file with all secrets

# 4. Generate docker-compose.yml from template
envsubst < docker-compose.prod.yml > docker-compose.yml

# 5. Pull and start
docker compose pull
docker compose up -d

# 6. Verify container is healthy
docker ps | grep luxarise-admin
```

### Deployment Directory Structure

On server `/srv/projects/luxarise-admin/`:

```
├── .env                    # Environment variables
├── docker-compose.prod.yml # Template (from repo)
└── docker-compose.yml      # Generated (with substituted vars)
```

## Manual Deployment

### If GitHub Actions is unavailable:

```bash
# 1. Build locally
docker build -t luxarise-admin:latest \
  --build-arg NEXT_PUBLIC_STORYBLOK_TOKEN=$NEXT_PUBLIC_STORYBLOK_TOKEN \
  .

# 2. Save and transfer
docker save luxarise-admin:latest | gzip > luxarise-admin.tar.gz
scp luxarise-admin.tar.gz deploy@hc-02.meimberg.io:/tmp/

# 3. Load on server
ssh deploy@hc-02.meimberg.io "docker load < /tmp/luxarise-admin.tar.gz"

# 4. Deploy
# Follow manual steps in deploy job script
```

## Post-Deployment

### 1. Verify Container Health

```bash
# Container running
ssh deploy@hc-02.meimberg.io "docker ps | grep luxarise-admin"

# Expected output:
# luxarise-admin   Up 2 minutes   0.0.0.0:3000->3000/tcp

# Check health status
ssh deploy@hc-02.meimberg.io "docker inspect luxarise-admin | grep Health -A 5"
```

### 2. Check Logs

```bash
# View recent logs
ssh deploy@hc-02.meimberg.io "docker logs luxarise-admin --tail 50"

# Follow logs in real-time
ssh deploy@hc-02.meimberg.io "docker logs luxarise-admin -f"
```

### 3. Test Application

**Login Flow:**
1. Open https://luxarise-admin.meimberg.io
2. Should redirect to `/login`
3. Click "Sign in with Google"
4. Authenticate with oli@meimberg.io
5. Should redirect to `/dashboard`

**Security Test:**
- Try logging in with non-whitelisted email
- Should show "Access denied" or reject login

**API Test:**
```bash
# Without auth (should fail)
curl -X GET https://luxarise-admin.meimberg.io/api/images

# Expected: 401 Unauthorized
```

### 4. Monitor Initial Traffic

Watch logs for first hour:

```bash
ssh deploy@hc-02.meimberg.io "docker logs luxarise-admin -f"
```

Look for:
- Authentication events
- API calls
- Errors or warnings
- Performance issues

## Rollback

### Roll back to previous deployment

```bash
ssh deploy@hc-02.meimberg.io
cd /srv/projects/luxarise-admin

# Pull specific version
docker compose pull ghcr.io/your-repo:main-abc1234

# Update docker-compose.yml with specific tag
nano docker-compose.yml
# Change image: to specific tag

# Restart
docker compose up -d
```

### Emergency rollback

```bash
# Stop current container
docker compose down

# Revert to previous image
docker tag luxarise-admin:previous luxarise-admin:latest

# Start
docker compose up -d
```

## Scaling & Performance

### Horizontal Scaling

To run multiple instances (behind Traefik load balancer):

```bash
# Scale to 2 instances
docker compose up -d --scale luxarise-admin=2
```

Traefik automatically load-balances requests.

### Vertical Scaling

Add resource limits in docker-compose:

```yaml
services:
  luxarise-admin:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 512M
```

### Performance Monitoring

```bash
# Container stats
ssh deploy@hc-02.meimberg.io "docker stats luxarise-admin --no-stream"

# Memory usage
ssh deploy@hc-02.meimberg.io "docker stats luxarise-admin --no-stream --format 'Memory: {{.MemUsage}}'"
```

## Maintenance

### Update Dependencies

```bash
# Locally
npm update

# Test
npm run build

# Commit and deploy
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

### Rotate Secrets

**Example: Rotate NEXTAUTH_SECRET**

1. Generate new secret: `openssl rand -base64 32`
2. Update GitHub Secret: `NEXTAUTH_SECRET`
3. Push any change to trigger redeploy
4. All existing sessions will be invalidated (users must re-login)

### Database Backup

Luxarise Admin doesn't have a database (data in Storyblok), but:

**Backup Storyblok content:**
- Use Storyblok's built-in backup feature
- Export content via Management API
- Schedule regular exports

### SSL Certificate Renewal

Traefik handles automatic SSL renewal via Let's Encrypt.

**Check certificate expiry:**

```bash
curl -vI https://luxarise-admin.meimberg.io 2>&1 | grep "expire date"
```

**If renewal fails:**
- Check Traefik logs
- Verify DNS is correct
- Ensure port 80/443 accessible

## Disaster Recovery

### Container Failure

Restart policy: `unless-stopped` (automatic restart)

```bash
# Manual restart if needed
ssh deploy@hc-02.meimberg.io "docker compose restart"
```

### Server Failure

If entire server fails:

1. Provision new server (via Ansible)
2. Update DNS: `luxarise-admin.meimberg.io` → new server IP
3. Update GitHub Variable: `SERVER_HOST`
4. Push to trigger deployment to new server

### Data Loss

Data is stored in Storyblok (SaaS), not on server:
- No local data to back up
- Storyblok has their own redundancy
- Images stored in Storyblok Assets (CDN)

## Monitoring & Alerting

### Application Logs

```bash
# Real-time monitoring
ssh deploy@hc-02.meimberg.io "docker logs luxarise-admin -f | grep -i error"
```

### Health Check Endpoint

Container health check runs every 30s:

```bash
# Check health
ssh deploy@hc-02.meimberg.io "docker inspect luxarise-admin --format='{{.State.Health.Status}}'"
```

### External Monitoring (Optional)

Set up external monitoring with:
- UptimeRobot (uptime monitoring)
- Sentry (error tracking)
- New Relic (APM)

## Common Operations

### View Application Status

```bash
# Container status
ssh deploy@hc-02.meimberg.io "docker ps -a | grep luxarise"

# Logs (last 100 lines)
ssh deploy@hc-02.meimberg.io "docker logs luxarise-admin --tail 100"

# Environment
ssh deploy@hc-02.meimberg.io "docker exec luxarise-admin env"
```

### Restart Application

```bash
ssh deploy@hc-02.meimberg.io "cd /srv/projects/luxarise-admin && docker compose restart"
```

### Update Configuration

```bash
# Edit .env on server
ssh deploy@hc-02.meimberg.io "nano /srv/projects/luxarise-admin/.env"

# Restart to apply
ssh deploy@hc-02.meimberg.io "cd /srv/projects/luxarise-admin && docker compose restart"
```

### Force Redeploy

```bash
# On server
ssh deploy@hc-02.meimberg.io
cd /srv/projects/luxarise-admin

# Pull latest image
docker compose pull

# Recreate container
docker compose up -d --force-recreate
```

## Security Hardening

### Server-Level

- [ ] Firewall configured (only 80, 443, 22 open)
- [ ] SSH key authentication only (no passwords)
- [ ] Fail2ban configured
- [ ] Regular system updates
- [ ] Deploy user has minimal permissions

### Application-Level

- [ ] All secrets in environment variables
- [ ] HTTPS enforced (via Traefik)
- [ ] OAuth with email whitelist
- [ ] API routes protected with `requireAuth()`
- [ ] Management token never exposed
- [ ] HTTP-only session cookies (NextAuth default)
- [ ] CORS configured if needed

### Storyblok-Level

- [ ] Management token stored securely
- [ ] Public token only has read access
- [ ] Regular token rotation
- [ ] Audit log monitoring in Storyblok

## Troubleshooting Production

### Application Not Accessible

```bash
# 1. Check container is running
docker ps | grep luxarise-admin

# 2. Check Traefik routing
docker logs traefik | grep luxarise-admin

# 3. Check DNS
dig luxarise-admin.meimberg.io +short

# 4. Test direct to container
curl http://localhost:3000  # From server
```

### OAuth Fails in Production

- Verify redirect URI in Google Console
- Check `NEXTAUTH_URL` matches production domain
- Verify `NEXTAUTH_SECRET` is set
- Check `ADMIN_WHITELIST` includes user email

### Storyblok Connection Issues

```bash
# Test token validity
curl -H "Token: $NEXT_PUBLIC_STORYBLOK_TOKEN" \
  https://api.storyblok.com/v2/cdn/spaces/330326
```

### High Memory Usage

```bash
# Check memory
docker stats luxarise-admin --no-stream

# If high, restart container
docker compose restart
```

## Related Documentation

- [SETUP-CHECKLIST.md](SETUP-CHECKLIST.md) - Initial setup
- [DEVELOPMENT.md](DEVELOPMENT.md) - Development guide
- [DOCKER-COMPOSE.md](DOCKER-COMPOSE.md) - Docker usage
- [GITHUB-SETUP.md](GITHUB-SETUP.md) - GitHub configuration
