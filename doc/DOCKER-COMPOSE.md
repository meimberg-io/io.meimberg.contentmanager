# Docker Compose Guide

Guide for running Luxarise Admin with Docker Compose in development and production.

## Architecture

The project uses a unified `docker-compose.yml` with profiles for different environments:

- **dev profile**: Development with volume mounts (hot reload)
- **prod profile**: Production without volumes (immutable)

## Development Mode

### Start Development Container

```bash
docker compose --profile dev up --build
```

This will:
1. Build the Docker image
2. Mount source code volumes (enables hot reload)
3. Start container with development settings
4. Expose port 3000

### Configuration

Uses `.env` file for configuration:

```bash
# Copy example
cp env.example .env

# Edit with your values
nano .env
```

**Development-specific variables:**

```env
NODE_ENV=development
NEXT_PUBLIC_STORYBLOK_DISABLECACHING=true
```

### Volume Mounts

The development profile mounts these directories:

```yaml
volumes:
  - ./src:/app/src:ro           # Source code (read-only)
  - ./public:/app/public:ro     # Static assets
  - ./next.config.ts:/app/next.config.ts:ro
  - ./tailwind.config.ts:/app/tailwind.config.ts:ro
  - ./tsconfig.json:/app/tsconfig.json:ro
  - /app/node_modules           # Prevent overwriting
```

**Benefits:**
- Code changes reflected immediately
- No rebuild needed for most changes
- Faster development iteration

### Stop Development Container

```bash
docker compose --profile dev down
```

## Production Mode

### Local Production Testing

Test production build locally:

```bash
# Build and run with prod profile
docker compose --profile prod up --build

# Access at http://localhost:3000
```

This simulates the production environment without Traefik.

### Configuration

Production requires these environment variables:

```env
NODE_ENV=production
NEXTAUTH_URL=https://luxarise-admin.meimberg.io
# ... all API keys and secrets
```

### Production vs Development

| Feature | Development | Production |
|---------|-------------|------------|
| Volume mounts | Yes (hot reload) | No (immutable) |
| Build optimization | Minimal | Full |
| Caching | Disabled | Enabled |
| Telemetry | Disabled | Disabled |
| Node env | development | production |

## Docker Commands

### View Logs

```bash
# Follow logs
docker compose logs -f

# Last 100 lines
docker compose logs --tail 100

# Specific service
docker compose logs admin-dev -f
```

### Rebuild Container

```bash
# Force rebuild
docker compose --profile dev up --build --force-recreate
```

### Execute Commands in Container

```bash
# Shell access
docker compose exec admin-dev sh

# Run npm command
docker compose exec admin-dev npm run lint

# Check environment
docker compose exec admin-dev env
```

### Clean Up

```bash
# Stop and remove containers
docker compose down

# Remove volumes as well
docker compose down -v

# Remove images
docker compose down --rmi all
```

## Health Checks

The container includes a health check:

```yaml
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get(...)"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

Check health status:

```bash
docker compose ps
# Look for "healthy" status
```

## Multi-Stage Build

The Dockerfile uses multi-stage builds for efficiency:

1. **deps stage**: Install dependencies
2. **builder stage**: Build Next.js application
3. **runner stage**: Production image with minimal footprint

**Benefits:**
- Smaller final image (~200MB vs ~1GB)
- Faster deployments
- Improved security (no build tools in production)

## Networks

### Development

Uses default bridge network: `app-network`

```bash
# List networks
docker network ls

# Inspect network
docker network inspect com-luxarise-admin-frontend_app-network
```

### Production

Uses external Traefik network:

```yaml
networks:
  traefik:
    external: true
```

This must exist on the server before deployment.

## Environment Variables in Docker

### Build Args vs Runtime Env

**Build args** (available during `docker build`):
- `NEXT_PUBLIC_STORYBLOK_TOKEN`
- `NEXT_PUBLIC_STORYBLOK_EDITOR_SECRET`
- `NEXT_PUBLIC_STORYBLOK_DISABLECACHING`

These are baked into the bundle.

**Runtime env** (available when container runs):
- `STORYBLOK_MANAGEMENT_TOKEN`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_SECRET`
- All other API keys

These are loaded from `.env` file or passed to container.

### Passing Environment Variables

**Option 1: .env file** (recommended)

```bash
# Create .env file
cat > .env << EOF
NEXTAUTH_SECRET=abc123
GOOGLE_CLIENT_ID=xyz789
EOF

# Start with env_file
docker compose up
```

**Option 2: Environment section**

```yaml
services:
  admin:
    environment:
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
```

**Option 3: Command line**

```bash
NEXTAUTH_SECRET=abc123 docker compose up
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose logs

# Common issues:
# - Missing required env vars
# - Port 3000 already in use
# - Build errors
```

### Hot Reload Not Working

```bash
# Restart with fresh build
docker compose --profile dev down
docker compose --profile dev up --build
```

### Permission Issues

```bash
# Container runs as non-root user (nextjs:nodejs)
# If file permission errors, check file ownership
ls -la src/
```

### Build Fails

```bash
# Check Dockerfile syntax
docker compose config

# Build without cache
docker compose build --no-cache
```

### Port Already in Use

```bash
# Check what's using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in .env
APP_PORT=3001
```

## Best Practices

1. **Always use profiles**: `--profile dev` or `--profile prod`
2. **Use .env files**: Don't pass secrets on command line
3. **Rebuild after dep changes**: `npm install` → rebuild container
4. **Check logs frequently**: `docker compose logs -f`
5. **Clean up regularly**: `docker compose down` when not in use

## CI/CD Integration

GitHub Actions uses the same Docker setup:

1. **Test job**: Runs `npm run lint` and `npm run build`
2. **Build job**: Builds Docker image with build args
3. **Deploy job**: Pushes to GitHub Container Registry and deploys

See [GITHUB-SETUP.md](GITHUB-SETUP.md) for details.

## Related Documentation

- [SETUP-CHECKLIST.md](SETUP-CHECKLIST.md) - Initial setup
- [DEVELOPMENT.md](DEVELOPMENT.md) - Development guide
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment operations
- [GITHUB-SETUP.md](GITHUB-SETUP.md) - GitHub configuration
