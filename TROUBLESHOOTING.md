# Troubleshooting Guide

Common issues and their solutions for the HTML Deployer app.

## Authentication Issues

### Problem: Can't login with Google

**Symptoms:**
- Redirect loop after clicking "Login with Google"
- "Configuration error" message
- OAuth consent screen doesn't appear

**Solutions:**

1. **Check Google OAuth Configuration**
   ```bash
   # Verify in .env.local:
   GOOGLE_CLIENT_ID=your-actual-client-id
   GOOGLE_CLIENT_SECRET=your-actual-client-secret
   ```

2. **Verify Redirect URI**
   - Go to Google Cloud Console → Credentials
   - Check authorized redirect URIs include:
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://your-domain.com/api/auth/callback/google` (production)

3. **Check NEXTAUTH_SECRET**
   ```bash
   # Generate a new one:
   openssl rand -base64 32
   # Add to .env.local
   ```

4. **Clear Browser Data**
   - Clear cookies for localhost:3000
   - Try incognito/private browsing mode

### Problem: "Unauthorized" error after login

**Solutions:**

1. **Check Session Configuration**
   - Ensure database is set up: `npx prisma db push`
   - Verify DATABASE_URL in .env.local

2. **Restart Development Server**
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

3. **Check Browser Console**
   - Open DevTools → Console
   - Look for session-related errors

## Deployment Issues

### Problem: "Failed to create application in Dokploy"

**Solutions:**

1. **Verify Dokploy API Key**
   ```bash
   # Test API access:
   curl -H "x-api-key: YOUR_API_KEY" https://yourdomain.com/api/health
   ```

2. **Check Environment Variables**
   ```env
   DOKPLOY_API_KEY=correct-api-key
   DOKPLOY_URL=https://yourdomain.com  # No trailing slash
   SERVER_ID=your-server-id
   ENVIRONMENT_ID=your-environment-id
   ```

3. **Verify Server and Environment IDs**
   - Log into Dokploy dashboard
   - Check that IDs exist and are correct
   - Try creating a test app manually first

### Problem: Git push fails

**Symptoms:**
- "Permission denied (publickey)" error
- "Could not resolve hostname" error
- Timeout during git push

**Solutions:**

1. **Test SSH Connection**
   ```bash
   ssh git@yourdomain.com
   # Should connect without password
   ```

2. **Set Up SSH Keys**
   ```bash
   # Generate key if needed:
   ssh-keygen -t ed25519 -C "your_email@example.com"

   # Copy to Dokploy:
   ssh-copy-id git@yourdomain.com
   ```

3. **Check SSH_HOST**
   ```env
   SSH_HOST=yourdomain.com  # Should match Dokploy domain
   ```

4. **Test Git Access**
   ```bash
   # Try cloning a test repo:
   git clone git@yourdomain.com:test.git
   ```

### Problem: Deployment succeeds but site doesn't work

**Solutions:**

1. **Check Dokploy Logs**
   - Log into Dokploy dashboard
   - View application logs
   - Look for build/deployment errors

2. **Verify Static Site Configuration**
   - Ensure build type is set to "static"
   - Check publish directory is "."

3. **Test HTML File Locally**
   - Open the HTML file in a browser
   - Check for any errors in console

## Database Issues

### Problem: "Prisma Client not found"

**Solutions:**

```bash
# Generate Prisma Client:
npx prisma generate

# If that doesn't work, reinstall:
npm install @prisma/client
npx prisma generate
```

### Problem: Database errors or migrations fail

**Solutions:**

1. **Reset Database**
   ```bash
   # Delete database file:
   rm dev.db dev.db-journal

   # Recreate:
   npx prisma db push
   ```

2. **Check DATABASE_URL**
   ```env
   DATABASE_URL=file:./dev.db
   ```

3. **Verify Schema**
   - Check `prisma/schema.prisma` exists
   - Ensure no syntax errors

### Problem: "Can't reach database server"

**Solutions:**

1. **For SQLite (default)**
   - Ensure file path is correct
   - Check write permissions in project directory

2. **For PostgreSQL**
   - Verify connection string format
   - Test database connection:
     ```bash
     npx prisma db pull
     ```

## File Upload Issues

### Problem: "Only HTML files are allowed"

**Solutions:**

1. **Check File Extension**
   - File must end with `.html`
   - Not `.htm` or other extensions

2. **Rename File**
   ```bash
   mv myfile.htm myfile.html
   ```

### Problem: "File size must be less than 10MB"

**Solutions:**

1. **Reduce File Size**
   - Remove large embedded images
   - Minify HTML/CSS/JS
   - Use external resources instead of inline

2. **Increase Limit** (if needed)
   - Edit `src/app/api/deploy/route.ts`
   - Change: `if (file.size > 10 * 1024 * 1024)`

## Development Issues

### Problem: Module not found errors

**Solutions:**

```bash
# Reinstall dependencies:
rm -rf node_modules package-lock.json
npm install

# Or with clean cache:
npm cache clean --force
npm install
```

### Problem: TypeScript errors

**Solutions:**

```bash
# Regenerate types:
npx prisma generate

# Check TypeScript config:
npx tsc --noEmit
```

### Problem: Port 3000 already in use

**Solutions:**

```bash
# Use different port:
PORT=3001 npm run dev

# Or kill process on port 3000:
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:3000 | xargs kill -9
```

## Production Issues

### Problem: Environment variables not working in production

**Solutions:**

1. **For Dokploy**
   - Add environment variables in Dokploy UI
   - Restart application after adding

2. **For Vercel**
   - Add in Project Settings → Environment Variables
   - Redeploy after adding

3. **Update NEXTAUTH_URL**
   ```env
   NEXTAUTH_URL=https://your-production-domain.com
   ```

### Problem: OAuth redirect error in production

**Solutions:**

1. **Update Google OAuth Redirect URIs**
   - Add production URL to authorized redirects
   - Format: `https://your-domain.com/api/auth/callback/google`

2. **Check NEXTAUTH_URL**
   - Must match your production domain
   - Include https://

## Performance Issues

### Problem: Slow deployments

**Solutions:**

1. **Check Network Connection**
   - Ensure stable internet connection
   - Test upload speed

2. **Optimize HTML File**
   - Minify HTML/CSS/JS
   - Remove unnecessary code
   - Use external resources

3. **Check Dokploy Server**
   - Verify server resources
   - Check server load

## Logging and Debugging

### Enable Detailed Logging

1. **Browser Console**
   - Open DevTools → Console
   - Check for errors and warnings

2. **Server Logs**
   ```bash
   # Development server shows logs automatically
   npm run dev
   ```

3. **Dokploy Logs**
   - Access via Dokploy dashboard
   - Check application logs
   - Review deployment logs

### Debug Mode

Add to `.env.local` for more verbose logging:

```env
NEXTAUTH_DEBUG=true
NODE_ENV=development
```

## Getting Help

If none of these solutions work:

1. **Check Documentation**
   - Review README.md
   - Read SETUP.md
   - Check IMPLEMENTATION_SUMMARY.md

2. **Check Dependencies**
   - Ensure all packages are installed
   - Verify versions match package.json

3. **Review Configuration**
   - Double-check all environment variables
   - Verify file paths are correct

4. **Test Components Individually**
   - Test authentication separately
   - Test file upload without deployment
   - Test Dokploy API directly

5. **Create Minimal Reproduction**
   - Isolate the issue
   - Test with minimal HTML file
   - Check with fresh database

## Common Error Messages

| Error | Likely Cause | Solution |
|-------|--------------|----------|
| "Unauthorized" | Session/auth issue | Check NEXTAUTH_SECRET, clear cookies |
| "No file provided" | Upload failed | Check file input, try again |
| "Deployment failed" | Dokploy error | Check API key, server IDs |
| "Git push failed" | SSH issue | Configure SSH keys |
| "Prisma Client not found" | Missing generation | Run `npx prisma generate` |
| "Module not found" | Missing dependency | Run `npm install` |
| "Port in use" | Port conflict | Use different port or kill process |

## Still Having Issues?

1. Check the browser console for errors
2. Check the terminal for server errors
3. Review Dokploy logs
4. Verify all environment variables
5. Try with a fresh clone of the repository

Remember: Most issues are related to configuration or environment variables. Double-check those first!

