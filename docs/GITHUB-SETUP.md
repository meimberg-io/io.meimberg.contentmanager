# GitHub Repository Setup

This document describes the required GitHub Secrets and Variables for the CI/CD pipeline.

## GitHub Secrets (Repository Settings → Secrets and variables → Actions → Secrets)

| Secret | Description | Example |
|--------|-------------|---------|
| `NEXTAUTH_SECRET` | NextAuth.js secret for session encryption | `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | |
| `NEXT_PUBLIC_STORYBLOK_TOKEN` | Storyblok public preview token | |
| `STORYBLOK_MANAGEMENT_TOKEN` | Storyblok management API token | |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `ONEDRIVE_CLIENT_ID` | Azure App Client ID | |
| `ONEDRIVE_CLIENT_SECRET` | Azure App Client Secret | |
| `ONEDRIVE_TENANT_ID` | Azure Tenant ID | |
| `SHOPIFY_CLIENT_ID` | Shopify App Client ID | |
| `SHOPIFY_CLIENT_SECRET` | Shopify App Client Secret | |
| `PUBLER_API_KEY` | Publer API key | |
| `SSH_PRIVATE_KEY` | SSH key for server deployment | |

## GitHub Variables (Repository Settings → Secrets and variables → Actions → Variables)

| Variable | Description | Example |
|----------|-------------|---------|
| `ADMIN_WHITELIST` | Comma-separated admin emails | `admin@example.com,user@example.com` |
| `APP_DOMAIN` | Production domain | `admin.luxarise.com` |
| `SERVER_HOST` | Server IP/hostname | `123.45.67.89` |
| `SERVER_USER` | SSH user for deployment | `deploy` |
| `NEXT_PUBLIC_STORYBLOK_DISABLECACHING` | Disable Storyblok cache | `false` |
| `OPENAI_MODEL` | OpenAI model to use | `gpt-4o` |
| `ONEDRIVE_IMAGES_FOLDER` | OneDrive folder path | `/Luxarise/ArtImages` |
| `SHOPIFY_SHOP_URL` | Shopify store URL | `luxarise.myshopify.com` |
| `SHOPIFY_PUBLIC_URL` | Public shop URL | `https://luxarise.com` |
| `SHOPIFY_API_VERSION` | Shopify API version | `2026-01` |
| `PUBLER_WORKSPACE_ID` | Publer workspace ID | |

## Deployment Flow

1. Push to `main` branch triggers the pipeline
2. Lint and build are tested
3. Docker image is built and pushed to `ghcr.io`
4. Image is deployed to server via SSH
5. App is accessible at `https://${APP_DOMAIN}`

## Server Requirements

- Docker and Docker Compose installed
- SSH access configured
- Traefik reverse proxy (for HTTPS)
- Directory: `/srv/projects/luxarise-admin/`
