# HTML Deployer App

A fullstack Next.js application that allows users to deploy HTML files to Dokploy with Google OAuth authentication.

## Features

- 🔐 Google OAuth authentication with NextAuth
- 📤 HTML file upload with validation
- 🚀 Automatic deployment to Dokploy
- 📊 Deployment history tracking
- 🎨 Modern UI with Tailwind CSS
- 💾 SQLite database (easily switchable to PostgreSQL)

## Prerequisites

- Node.js 18+ installed
- Google Cloud Console account for OAuth credentials
- Dokploy instance running with API access
- SSH keys configured for Dokploy git access

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and fill in your credentials:

```bash
cp env.example .env.local
```

Edit `.env.local` with your actual values:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# NextAuth Configuration
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000

# Database Configuration
DATABASE_URL=file:./dev.db

# Dokploy Configuration
DOKPLOY_API_KEY=your-dokploy-api-key
DOKPLOY_URL=https://yourdomain.com
SERVER_ID=your-server-id
ENVIRONMENT_ID=your-environment-id
SSH_HOST=yourdomain.com
```

#### Getting Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Choose "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (for development)
   - `https://your-production-domain.com/api/auth/callback/google` (for production)
7. Copy the Client ID and Client Secret

#### Generating NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

#### Getting Dokploy Configuration

1. Log into your Dokploy instance
2. Go to Settings → API/CLI section
3. Generate an API key
4. Get your Server ID and Environment ID from the Dokploy API or UI

### 3. Set Up Database

Generate Prisma Client and create the database:

```bash
npx prisma generate
npx prisma db push
```

### 4. Configure SSH for Dokploy

Ensure your server can push to Dokploy via SSH without password prompts:

```bash
# Test SSH connection
ssh git@yourdomain.com

# If this works without prompting for a password, you're good to go
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Login**: Click "Login with Google" to authenticate
2. **Upload**: Select an HTML file (max 10MB)
3. **Deploy**: Click "Deploy" to push your file to Dokploy
4. **Access**: Once deployed, click the generated URL to view your site
5. **History**: View all your previous deployments in the dashboard

## Project Structure

```
deployer-app/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/
│   │   │   │       └── route.ts   # NextAuth configuration
│   │   │   ├── deploy/
│   │   │   │   └── route.ts       # Deployment API
│   │   │   └── deployments/
│   │   │       └── route.ts       # Fetch deployments API
│   │   ├── layout.tsx             # Root layout with providers
│   │   └── page.tsx               # Main UI
│   ├── components/
│   │   └── providers.tsx          # SessionProvider wrapper
│   └── types/
│       └── next-auth.d.ts         # NextAuth type extensions
├── env.example                    # Environment variables template
└── package.json
```

## API Endpoints

### POST /api/deploy

Deploy an HTML file to Dokploy.

**Authentication**: Required (session)

**Body**: FormData with `htmlFile` field

**Response**:
```json
{
  "url": "https://deployed-site-url.com"
}
```

### GET /api/deployments

Fetch user's deployment history.

**Authentication**: Required (session)

**Response**:
```json
[
  {
    "id": "deployment-id",
    "appName": "user-xxx-yyy",
    "url": "https://deployed-site-url.com",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

## Deployment to Production

### Option 1: Deploy to Dokploy

1. Create a new app in Dokploy UI
2. Set build type to "nixpacks" or "dockerfile"
3. Add git remote:
   ```bash
   git remote add dokploy git@yourdomain.com:deployer-app.git
   ```
4. Push to deploy:
   ```bash
   git push dokploy main
   ```
5. Update environment variables in Dokploy UI
6. Generate domain for your app

### Option 2: Deploy to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

**Note**: Update `NEXTAUTH_URL` to your production URL.

## Database Migration (SQLite to PostgreSQL)

To switch from SQLite to PostgreSQL:

1. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Update `DATABASE_URL` in `.env.local`:
   ```env
   DATABASE_URL="postgresql://user:password@host:5432/dbname"
   ```

3. Run migrations:
   ```bash
   npx prisma migrate dev --name init
   ```

## Troubleshooting

### Git Push Fails

- Ensure SSH keys are properly configured
- Test SSH connection: `ssh git@yourdomain.com`
- Check that the Dokploy git remote is accessible

### Dokploy API Errors

- Verify API key is correct
- Check that Server ID and Environment ID exist
- Ensure Dokploy instance is accessible

### Authentication Issues

- Verify Google OAuth credentials
- Check redirect URIs match exactly
- Ensure NEXTAUTH_SECRET is set
- Clear browser cookies and try again

## Security Considerations

- Never commit `.env.local` to version control
- Use strong NEXTAUTH_SECRET (32+ characters)
- Implement rate limiting for production
- Add file size and type validation
- Consider adding CAPTCHA for public deployments

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
# deployer-app
# deployer
