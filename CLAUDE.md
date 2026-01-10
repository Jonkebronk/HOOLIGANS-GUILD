# HOOLIGANS Guild - Development Rules

## Golden Rule: No Local Development

**NEVER work or test locally. Always commit to git and push to deploy on Railway.**

### Workflow

1. Make code changes
2. `git add .`
3. `git commit -m "description"`
4. `git push`
5. Railway auto-deploys from main branch
6. Test on production URL: https://hooligans-guild-production.up.railway.app

### Why?

- Single source of truth
- No "works on my machine" issues
- Production-identical environment
- Database always available
- Team can see changes immediately

## Environment

- **Platform**: Railway
- **Database**: PostgreSQL on Railway
- **Frontend**: Next.js 15 deployed on Railway
- **Auth**: Discord OAuth (production callbacks only)

## Git Workflow

```bash
# After making changes
git add .
git commit -m "feat: description of change"
git push origin main
```

## Railway URLs

- **App**: https://hooligans-guild-production.up.railway.app
- **Database**: Provided by Railway (see environment variables)

## Discord OAuth Setup

Callback URL for Discord Developer Portal:
```
https://hooligans-guild-production.up.railway.app/api/auth/callback/discord
```

## Environment Variables (set in Railway)

```
DATABASE_URL=<railway-postgres-url>
NEXTAUTH_URL=https://hooligans-guild-production.up.railway.app
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
DISCORD_CLIENT_ID=<from-discord-developer-portal>
DISCORD_CLIENT_SECRET=<from-discord-developer-portal>
```

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Prisma + PostgreSQL
- NextAuth.js (Discord OAuth)
- TailwindCSS + shadcn/ui
- pnpm workspaces (monorepo)
