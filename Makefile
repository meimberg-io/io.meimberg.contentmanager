.PHONY: help dev stop lint typecheck check build clean sb-pull sb-types sb-sync docker-build docker-up docker-down

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}'

# --- Dev ---

dev: ## Start Next.js dev server
	npm run dev

stop: ## Kill Next.js dev server
	@pkill -f "next dev" 2>/dev/null && echo "Stopped." || echo "Not running."

# --- Quality ---

lint: ## Run ESLint
	npx next lint

typecheck: ## Run TypeScript check
	npx tsc --noEmit

check: lint typecheck ## Run lint + typecheck

# --- Build ---

build: ## Build Next.js for production
	npm run build

clean: ## Remove build artifacts
	rm -rf .next

# --- Storyblok ---

sb-pull: ## Pull component definitions from Storyblok
	npx storyblok components pull --space 330326

sb-types: ## Generate TypeScript types from Storyblok
	npx storyblok types --space 330326 generate && cp .storyblok/types/330326/storyblok-components.d.ts src/types/component-types-sb.d.ts

sb-sync: sb-pull sb-types ## Pull components + generate types

# --- Docker ---

docker-build: ## Build production Docker image
	docker compose build admin-prod

docker-up: ## Start production container locally
	docker compose --profile prod up -d

docker-down: ## Stop production container
	docker compose --profile prod down
