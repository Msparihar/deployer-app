# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

HTML Deployer - a Next.js 16 app that lets authenticated users upload HTML files or ZIP archives, which get deployed as static sites behind Traefik with automatic SSL via Let's Encrypt. Auth is Google OAuth via NextAuth with database sessions stored in PostgreSQL via Prisma.

## Commands

```bash
bun install                  # install dependencies
bunx prisma generate         # generate Prisma client (required after schema changes)
bunx prisma db push          # push schema to database (no migrations, direct sync)
bun run dev                  # start dev server on port 3000
bun run build                # production build (standalone output)
bun run lint                 # run eslint
```

No test framework is configured.

## Environment

Copy `env.example` to `.env.local`. Required variables:
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL` - NextAuth config
- `DATABASE_URL` - PostgreSQL connection string
- `STATIC_SITES_PATH` - where uploaded sites are stored on disk (default: `/var/www/static-sites`)
- `TRAEFIK_CONFIG_PATH` - Traefik dynamic config directory (default: `/etc/dokploy/traefik/dynamic`)
- `SITES_DOMAIN` - base domain for deployed sites (default: `sites.manishsingh.tech`)

## Architecture

**Single-page app**: The entire UI is in `src/app/page.tsx` as a client component. No routing beyond the main page.

**Auth flow**: NextAuth v4 with Google provider and Prisma adapter. Session strategy is `database` (not JWT). The session callback attaches `user.id` to the session. Auth options are exported from the NextAuth route and imported by API routes.

**Deploy pipeline** (`src/app/api/deploy/route.ts`):
1. Accepts HTML file or ZIP via FormData (`htmlFile` field)
2. Validates file type and size (10MB HTML, 50MB ZIP, 100MB extracted)
3. ZIP handling: extracts with AdmZip, detects single-subdirectory wrapping, requires `index.html`
4. Writes files to `STATIC_SITES_PATH/{appName}/`
5. Creates Deployment record in DB
6. Regenerates Traefik config YAML with per-site routers for SSL cert issuance

**Traefik integration**: `updateTraefikConfig()` in the deploy route queries all ACTIVE deployments and writes a `static-sites.yml` to Traefik's dynamic config directory. Each site gets its own router with a Let's Encrypt cert. This function is also called on pause/resume/delete to update routing.

**Deployment management** (`src/app/api/deployments/[id]/route.ts`):
- PATCH with `{action: "pause"|"resume"}` toggles DeploymentStatus enum
- DELETE removes DB record, site files, and updates Traefik config
- Both verify user ownership before acting

**Prisma singleton**: `src/lib/prisma.ts` uses the global-cache pattern to prevent multiple PrismaClient instances in dev.

## Deployment

Two deployment methods configured:
- **Dockerfile**: Multi-stage build using `oven/bun:1` base image, standalone Next.js output
- **Nixpacks** (`nixpacks.toml`): Uses nodejs_20 + bun, builds standalone, runs `prisma db push` at startup

Both run `prisma db push` at container start to sync schema without migration files.

## Key Patterns

- All API routes use `getServerSession(authOptions)` and check `session?.user?.id` for auth
- `authOptions` is imported from `src/app/api/auth/[...nextauth]/route.ts` (not a separate file)
- Next.js standalone output mode is enabled in `next.config.ts`
- App name format: `site-{userId first 6 chars}-{uuid first 6 chars}`
- Deployed site URLs: `https://{appName}.{SITES_DOMAIN}`
