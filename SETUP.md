# Quick Setup Guide

Follow these steps to get your HTML Deployer app running:

## Step 1: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- next-auth (authentication)
- @prisma/client (database)
- axios (HTTP client)
- child-process-promise (git commands)

## Step 2: Set Up Environment Variables

1. Copy the environment template:
   ```bash
   cp env.example .env.local
   ```

2. Edit `.env.local` and fill in your credentials:

### Required Environment Variables:

#### Google OAuth (Get from Google Cloud Console)
- `GOOGLE_CLIENT_ID` - Your Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Your Google OAuth client secret

**How to get Google OAuth credentials:**
1. Visit https://console.cloud.google.com/
2. Create/select a project
3. Go to APIs & Services → Credentials
4. Create OAuth 2.0 Client ID
5. Add redirect URI: `http://localhost:3000/api/auth/callback/google`

#### NextAuth Secret
- `NEXTAUTH_SECRET` - Random string for JWT encryption

**Generate with:**
```bash
openssl rand -base64 32
```

#### Dokploy Configuration
- `DOKPLOY_API_KEY` - Your Dokploy API key
- `DOKPLOY_URL` - Your Dokploy instance URL (e.g., https://yourdomain.com)
- `SERVER_ID` - Your Dokploy server ID
- `ENVIRONMENT_ID` - Your Dokploy environment ID
- `SSH_HOST` - Your Dokploy SSH host (usually same as DOKPLOY_URL domain)

**How to get Dokploy credentials:**
1. Log into your Dokploy instance
2. Go to Settings → API/CLI
3. Generate an API key
4. Find Server ID and Environment ID in Dokploy dashboard

## Step 3: Set Up Database

Run these commands to create your SQLite database:

```bash
npx prisma generate
npx prisma db push
```

This will:
- Generate the Prisma Client
- Create the SQLite database file (`dev.db`)
- Create all necessary tables

## Step 4: Configure SSH for Dokploy

Your server needs to push code to Dokploy via SSH. Test your connection:

```bash
ssh git@yourdomain.com
```

If this prompts for a password, you need to set up SSH keys:

1. Generate SSH key (if you don't have one):
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```

2. Copy your public key to Dokploy:
   ```bash
   ssh-copy-id git@yourdomain.com
   ```

3. Test again - it should connect without a password

## Step 5: Run the Development Server

```bash
npm run dev
```

Visit http://localhost:3000 in your browser!

## Verification Checklist

Before deploying your first HTML file, verify:

- [ ] All environment variables are set in `.env.local`
- [ ] Google OAuth is configured with correct redirect URI
- [ ] Database is created (`dev.db` file exists)
- [ ] SSH connection to Dokploy works without password
- [ ] Dokploy API key is valid
- [ ] Server ID and Environment ID are correct

## Testing the App

1. **Login Test:**
   - Click "Login with Google"
   - Authorize the app
   - You should see the deployment dashboard

2. **Deployment Test:**
   - Create a simple HTML file:
     ```html
     <!DOCTYPE html>
     <html>
     <head><title>Test</title></head>
     <body><h1>Hello World!</h1></body>
     </html>
     ```
   - Upload and deploy
   - Wait for deployment to complete
   - Click the generated URL to view your site

## Common Issues

### "Unauthorized" Error
- Check that you're logged in
- Verify NEXTAUTH_SECRET is set
- Clear browser cookies and login again

### "Failed to create application in Dokploy"
- Verify DOKPLOY_API_KEY is correct
- Check DOKPLOY_URL is accessible
- Ensure SERVER_ID and ENVIRONMENT_ID exist

### Git Push Fails
- Test SSH connection: `ssh git@yourdomain.com`
- Check SSH keys are configured
- Verify SSH_HOST is correct

### Database Errors
- Run `npx prisma generate` again
- Delete `dev.db` and run `npx prisma db push`
- Check DATABASE_URL in `.env.local`

## Next Steps

Once everything is working:

1. **Customize the UI** - Edit `src/app/page.tsx`
2. **Add features** - Implement delete deployments, custom domains, etc.
3. **Deploy to production** - Follow README.md deployment instructions
4. **Switch to PostgreSQL** - For production use (see README.md)

## Need Help?

- Check the main README.md for detailed documentation
- Review the Dokploy API documentation
- Check NextAuth.js documentation for auth issues
- Open an issue on GitHub

Happy deploying! 🚀

