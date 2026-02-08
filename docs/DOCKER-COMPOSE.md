# Docker Compose Guide

Running the meimberg.io Contentmanager with Docker.

## Profiles

- **dev** — Development with volume mounts (hot reload)
- **prod** — Production (immutable container)

## Development

```bash
docker compose --profile dev up --build
```

Access at [http://localhost:3000](http://localhost:3000)

### Volume Mounts

Source code is mounted read-only — changes reflect immediately without rebuild.

### Stop

```bash
docker compose --profile dev down
```

## Production (Local Test)

```bash
docker compose --profile prod up --build
```

## Common Commands

```bash
# Logs
docker compose logs -f

# Rebuild
docker compose --profile dev up --build --force-recreate

# Shell access
docker compose exec admin-dev sh

# Clean up
docker compose down -v --rmi all
```

## Multi-Stage Build

1. **deps** — Install dependencies
2. **builder** — Build Next.js
3. **runner** — Minimal production image (~200MB)

## Networks

- **Development**: Default bridge network
- **Production**: External Traefik network (`docker network create traefik`)

## Environment Variables

**Build args** (baked into bundle):
- `NEXT_PUBLIC_STORYBLOK_TOKEN`
- `NEXT_PUBLIC_STORYBLOK_DISABLECACHING`

**Runtime env** (from `.env` file):
- All API keys, secrets, tokens

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Hot reload broken | Rebuild: `down && up --build` |
| Port 3000 in use | `lsof -i :3000` or change `APP_PORT` |
| Build fails | `docker compose build --no-cache` |
| Permission issues | Container runs as non-root (`nextjs:nodejs`) |

## Related Documentation

- [DEVELOPMENT.md](DEVELOPMENT.md) — Development guide
- [DEPLOYMENT.md](DEPLOYMENT.md) — Production deployment
- [GITHUB-SETUP.md](GITHUB-SETUP.md) — CI/CD pipeline
