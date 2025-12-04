# Deployment Guide

## Overview

Excalidraw is a static web application that can be deployed in several ways. The build process creates static files that can be served by any web server.

## Build Process

### Prerequisites

- **Node.js**: >= 18.0.0
- **Yarn**: 1.22.22 (package manager)

### Building the Application

From the root directory:

```bash
# Install dependencies
yarn install

# Build the application
yarn build
```

This will:
1. Build all packages (`build:packages`)
2. Build the app (`build:app`)
3. Build version info (`build:version`)

**Output Location**: `excalidraw-app/build/`

The build folder contains:
- `index.html` - Main HTML file
- `assets/` - JavaScript, CSS, and other assets
- `fonts/` - Font files
- `locales/` - Translation files
- `service-worker.js` - PWA service worker
- Other static assets

## Deployment Options

### Option 1: Static File Hosting (Simplest)

Deploy the `excalidraw-app/build` folder to any static hosting service.

#### Steps:

1. **Build the application**:
   ```bash
   yarn build
   ```

2. **Deploy the `excalidraw-app/build` folder** to your hosting service:
   - **Netlify**: Drag and drop the `build` folder
   - **GitHub Pages**: Push `build` folder contents to `gh-pages` branch
   - **AWS S3**: Upload `build` folder contents to S3 bucket
   - **Cloudflare Pages**: Connect repo and set build output to `excalidraw-app/build`
   - **Any web server**: Copy `build` folder contents to web root

#### Example: Netlify

1. Build: `yarn build`
2. Publish directory: `excalidraw-app/build`
3. Build command: `yarn build`

#### Example: GitHub Pages

```bash
# Build
yarn build

# Copy build contents to gh-pages branch
cd excalidraw-app/build
git init
git add .
git commit -m "Deploy"
git branch -M gh-pages
git remote add origin <your-repo-url>
git push -u origin gh-pages
```

### Option 2: Docker Container

A Dockerfile is provided for containerized deployment.

#### Build Docker Image

```bash
# Build the Docker image
docker build -t excalidraw-app .

# Or build for specific platform
docker build --platform linux/amd64 -t excalidraw-app .
```

#### Run Docker Container

```bash
# Run the container
docker run -d -p 8080:80 excalidraw-app

# Access at http://localhost:8080
```

#### Docker Compose

A `docker-compose.yml` file is available:

```bash
docker-compose up -d
```

**What the Dockerfile does**:
1. Uses Node 18 to build the application
2. Runs `yarn build:app:docker` (builds with Docker-specific settings)
3. Uses Nginx to serve the static files from `/usr/share/nginx/html`
4. Includes health check endpoint

### Option 3: Vercel

Vercel configuration is included (`vercel.json`).

#### Deploy to Vercel

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

3. **Or connect via GitHub**:
   - Push to GitHub
   - Import project in Vercel dashboard
   - Vercel will auto-detect the configuration

**Vercel Configuration**:
- Build command: `yarn build`
- Output directory: `excalidraw-app/build`
- Install command: `yarn install`

### Option 4: Custom Web Server

#### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/excalidraw-app/build;
    index index.html;

    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Cache static assets
    location ~* \.(woff2|woff|ttf|eot|svg|png|jpg|jpeg|gif|ico|css|js)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

#### Apache Configuration

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /path/to/excalidraw-app/build

    <Directory /path/to/excalidraw-app/build>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # SPA routing
    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</VirtualHost>
```

## Environment Variables

### Build-time Variables

Set these before building:

- `VITE_APP_DISABLE_SENTRY`: Set to `true` to disable Sentry (for Docker builds)
- `VITE_APP_ENABLE_TRACKING`: Set to `true` to enable analytics
- `VITE_APP_GIT_SHA`: Git commit SHA (auto-set by Vercel)

### Example

```bash
# Build with Sentry disabled
VITE_APP_DISABLE_SENTRY=true yarn build

# Build with tracking enabled
VITE_APP_ENABLE_TRACKING=true yarn build
```

## Production Build Commands

### Standard Build
```bash
yarn build
```
- Output: `excalidraw-app/build`
- Includes sourcemaps
- Enables tracking (if env var set)

### Docker Build
```bash
yarn build:app:docker
```
- Output: `excalidraw-app/build`
- Disables Sentry
- Optimized for container deployment

### Preview Build
```bash
yarn build:preview
```
- Builds and starts preview server on port 5000
- Useful for testing production build locally

## Testing Production Build Locally

### Option 1: Using http-server
```bash
yarn build
cd excalidraw-app
npx http-server build -p 5001 -o
```

### Option 2: Using Vite Preview
```bash
yarn build:preview
# Opens at http://localhost:5000
```

### Option 3: Using Docker
```bash
docker build -t excalidraw-app .
docker run -p 8080:80 excalidraw-app
# Access at http://localhost:8080
```

## Important Notes

### SPA Routing

Excalidraw is a Single Page Application (SPA). All routes must serve `index.html` to enable client-side routing. This is important for:
- Direct URL access (e.g., `/some/path`)
- Browser refresh on any route
- Presentation mode URLs with `?presentation=true`

### Service Worker

The build includes a service worker for PWA functionality. Ensure your server:
- Serves `service-worker.js` with correct MIME type
- Allows service worker registration
- Handles cache updates properly

### CORS Headers

If deploying to a CDN or different domain, you may need CORS headers for:
- Font files (`.woff2`)
- Locale files
- Assets

See `vercel.json` for example headers.

### Build Size

The production build is optimized but can be large:
- Main bundle: ~2-3 MB
- Locale files: ~50-100 KB each
- Fonts: ~200-300 KB total
- Total: ~5-10 MB (first load, then cached)

Consider:
- CDN for static assets
- Compression (gzip/brotli)
- HTTP/2 for parallel loading

## Troubleshooting

### Build Fails

1. **Check Node version**: Must be >= 18.0.0
   ```bash
   node --version
   ```

2. **Clear cache and reinstall**:
   ```bash
   yarn clean-install
   ```

3. **Check for TypeScript errors**:
   ```bash
   yarn test:typecheck
   ```

### Assets Not Loading

1. **Check base path**: Ensure `homepage: "."` in `package.json`
2. **Check asset paths**: Should be relative, not absolute
3. **Check server configuration**: Must serve from correct root

### Service Worker Issues

1. **Clear browser cache**: Service workers cache aggressively
2. **Check HTTPS**: Service workers require HTTPS (or localhost)
3. **Check registration**: Look for errors in browser console

### Presentation Mode Not Working

1. **Check URL format**: Must be `?presentation=true` (before `#`)
2. **Check build**: Ensure all files are included
3. **Check console**: Look for JavaScript errors

## CI/CD Examples

### GitHub Actions

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: yarn install
      - run: yarn build
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./excalidraw-app/build
```

### GitLab CI

```yaml
build:
  image: node:18
  script:
    - yarn install
    - yarn build
  artifacts:
    paths:
      - excalidraw-app/build
    expire_in: 1 week
```

## Recommended Deployment Platforms

### For Quick Deployment
- **Vercel**: Easiest, auto-detects config, free tier available
- **Netlify**: Simple drag-and-drop or Git integration
- **Cloudflare Pages**: Fast CDN, free tier available

### For Production/Enterprise
- **Docker + Kubernetes**: Full control, scalable
- **AWS S3 + CloudFront**: Highly scalable, pay-as-you-go
- **Azure Static Web Apps**: Integrated with Azure services
- **Google Cloud Storage + CDN**: Similar to AWS

### For Self-Hosting
- **Docker**: Use provided Dockerfile
- **Nginx/Apache**: Traditional web server
- **Caddy**: Modern web server with automatic HTTPS

## Quick Reference

```bash
# Build for production
yarn build

# Build for Docker
yarn build:app:docker

# Test production build locally
yarn build:preview

# Build Docker image
docker build -t excalidraw-app .

# Run Docker container
docker run -p 8080:80 excalidraw-app

# Deploy to Vercel
vercel

# Output directory
excalidraw-app/build/
```

