# Documentation Index

Central entry point for all Contentmanager documentation.

## Recommended Reading Order

1. [SETUP-CHECKLIST.md](SETUP-CHECKLIST.md)  
   Local onboarding (env, OAuth, Storyblok, Azure, AI keys).
2. [DEVELOPMENT.md](DEVELOPMENT.md)  
   Architecture, conventions, and day-to-day development.
3. [DOCKER-COMPOSE.md](DOCKER-COMPOSE.md)  
   Run with Docker in development or for local production tests.
4. [GITHUB-SETUP.md](GITHUB-SETUP.md)  
   One-time repository configuration for CI/CD.
5. [DEPLOYMENT.md](DEPLOYMENT.md)  
   Operational deployment runbook (verify, rollback, troubleshooting).

## Which Document For Which Task

- New developer setup -> [SETUP-CHECKLIST.md](SETUP-CHECKLIST.md)
- Understand code structure -> [DEVELOPMENT.md](DEVELOPMENT.md)
- Run app in Docker -> [DOCKER-COMPOSE.md](DOCKER-COMPOSE.md)
- Configure GitHub secrets/variables -> [GITHUB-SETUP.md](GITHUB-SETUP.md)
- Deploy or rollback in production -> [DEPLOYMENT.md](DEPLOYMENT.md)

## Documentation Scope

To keep docs maintainable and avoid duplication:

- `SETUP-CHECKLIST.md` covers local onboarding only.
- `GITHUB-SETUP.md` covers one-time CI/CD configuration only.
- `DEPLOYMENT.md` covers deployment operations only.
- `DEVELOPMENT.md` covers architecture and implementation concepts.

If content belongs to another file, link to it instead of copying it.
