# Quick Start Guide

Get your HTML Deployer app running in 5 minutes!

## Prerequisites Checklist

Before starting, ensure you have:
- [ ] Node.js 18+ installed
- [ ] Google Cloud Console account
- [ ] Dokploy instance with API access
- [ ] SSH access to Dokploy configured

## 5-Minute Setup

### Step 1: Install Dependencies (1 min)

```bash
npm install
```

### Step 2: Configure Environment (2 min)

```bash
# Copy the environment template
cp env.example .env.local

# Edit .env.local with your credentials
# Required values:
# - GOOGLE_CLIENT_ID (from Google Cloud Console)
# - GOOGLE_CLIENT_SECRET (from Google Cloud Console)
# - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)
# - DOKPLOY_API_KEY (from Dokploy settings)
# - DOKPLOY_URL (your Dokploy instance URL)
# - SERVER_ID (from Dokploy)
# - ENVIRONMENT_ID (from Dokploy)
# - SSH_HOST (your Dokploy domain)
```

### Step 3: Set Up Database (1 min)

```bash
npx prisma generate
npx prisma db push
```

### Step 4: Run the App (1 min)

```bash
npm run dev
```

Visit: http://localhost:3000

## Quick Test

1. **Login**: Click "Login with Google"
2. **Upload**: Use the provided `test-deployment.html` file
3. **Deploy**: Click "Deploy" button
4. **Verify**: Click the generated URL to see your deployed site

## Troubleshooting

### Can't login?
- Check Google OAuth credentials
- Verify redirect URI: `http://localhost:3000/api/auth/callback/google`
- Generate new NEXTAUTH_SECRET

### Deployment fails?
- Test SSH: `ssh git@yourdomain.com`
- Verify Dokploy API key
- Check Server ID and Environment ID

### Database errors?
- Delete `dev.db` and run `npx prisma db push` again
- Ensure DATABASE_URL is set correctly

## What's Next?

- ✅ Read [SETUP.md](./SETUP.md) for detailed setup instructions
- ✅ Check [README.md](./README.md) for full documentation
- ✅ Review [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for technical details

## Need Help?

Common issues and solutions:

| Issue | Solution |
|-------|----------|
| "Module not found" | Run `npm install` |
| "Unauthorized" | Check .env.local credentials |
| "Git push failed" | Configure SSH keys |
| "Prisma Client not found" | Run `npx prisma generate` |

## Environment Variables Quick Reference

```env
# Google OAuth (https://console.cloud.google.com/)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# NextAuth (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# Database (default SQLite)
DATABASE_URL=file:./dev.db

# Dokploy (from your Dokploy instance)
DOKPLOY_API_KEY=your-api-key
DOKPLOY_URL=https://yourdomain.com
SERVER_ID=your-server-id
ENVIRONMENT_ID=your-environment-id
SSH_HOST=yourdomain.com
```

## Commands Reference

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run linter

# Database
npx prisma generate  # Generate Prisma Client
npx prisma db push   # Push schema to database
npx prisma studio    # Open Prisma Studio (database GUI)

# Deployment
git push dokploy main  # Deploy to Dokploy
```

## Success!

If you can see the login page at http://localhost:3000, you're all set! 🎉

Start deploying your HTML files and enjoy the seamless deployment experience!



