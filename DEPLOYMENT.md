# Deployment Guide - Vercel

## Prerequisites
- GitHub/GitLab/Bitbucket account
- Vercel account (free tier is sufficient)
- Git installed on your local machine

## Step 1: Initialize Git Repository

If not already initialized:

```bash
cd /Users/idcuq/Documents/Midnigth\ Akindo/proof-of-healing
git init
git add .
git commit -m "Initial commit - Proof of Healing dApp"
```

## Step 2: Create Remote Repository

### Option A: GitHub
1. Go to https://github.com/new
2. Create new repository (name: `proof-of-healing`)
3. Don't initialize with README (we already have files)
4. Copy the repository URL

### Option B: GitLab
1. Go to https://gitlab.com/projects/new
2. Create new project
3. Copy the repository URL

## Step 3: Push to Remote

```bash
git remote add origin <YOUR_REPOSITORY_URL>
git branch -M main
git push -u origin main
```

## Step 4: Deploy to Vercel

### Method A: Vercel Dashboard (Recommended)

1. Go to https://vercel.com
2. Sign up/login
3. Click "Add New Project"
4. Import your repository from GitHub/GitLab
5. Vercel will automatically detect Next.js
6. Configure:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`
7. Click "Deploy"

### Method B: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
cd /Users/idcuq/Documents/Midnigth\ Akindo/proof-of-healing
vercel
```

## Step 5: Verify Deployment

1. Wait for deployment to complete (usually 1-2 minutes)
2. Vercel will provide a URL like: `https://proof-of-healing.vercel.app`
3. Open the URL in browser
4. Test the application:
   - Connect wallet
   - Verify unshielded address display
   - Check all UI elements load correctly

## Configuration Notes

### vercel.json
The project includes `vercel.json` with optimal settings:
- **Region**: Singapore (sin1) - closer to Indonesia
- **Framework**: Next.js auto-detection
- **Build**: Standard Next.js build process

### Environment Variables
No environment variables required for this application.

### Custom Domain (Optional)
1. Go to Vercel project settings
2. Domains → Add domain
3. Configure DNS records as instructed

## Troubleshooting

### Build Fails
```bash
# Check build locally first
npm run build
```

### Deployment Stuck
- Check Vercel dashboard for error logs
- Ensure all dependencies are in package.json
- Verify Node.js version compatibility

### Wallet Connection Issues
- Ensure wallet extension is installed
- Check browser console for errors
- Verify network configuration (preview network)

## Continuous Deployment

Vercel automatically deploys on every push to main branch:
- Push to main → Automatic deployment
- Pull requests → Preview deployments
- Branch deployments → Separate URLs

## Performance Optimization

The application is already optimized:
- Static generation where possible
- Client-side rendering for dynamic content
- No server-side dependencies
- IndexedDB for local storage

## Monitoring

Vercel provides:
- Real-time logs
- Analytics
- Error tracking
- Performance metrics

Access via Vercel dashboard.

## Cost

- **Free Tier**: Sufficient for this application
- **Limits**: 100GB bandwidth/month, 6,000 build hours/month
- **No database costs** (uses browser IndexedDB)

## Support

For issues:
- Vercel documentation: https://vercel.com/docs
- Next.js deployment: https://nextjs.org/docs/deployment
