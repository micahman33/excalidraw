# CORS Proxy Setup Guide for Shared Hosting

## What is a CORS Proxy?

A CORS (Cross-Origin Resource Sharing) proxy is a server that sits between your frontend and the Excalidraw backend. It:
1. Receives requests from your custom domain
2. Forwards them to `json.excalidraw.com`
3. Adds CORS headers to the response so your browser accepts it

**Why you need it:** The Excalidraw backend only allows requests from `excalidraw.com` domains. Your custom domain (`excalidraw.micahdanielsmith.com`) is blocked.

## Important: Where Are Files Stored?

**Yes, files are still stored on `json.excalidraw.com`** even though you're hosting the app separately. Here's how it works:

- **Your domain (`excalidraw.micahdanielsmith.com`)**: Hosts the frontend app (the UI you interact with)
- **`json.excalidraw.com`**: The backend service that stores shared drawings

When you share a drawing:
1. Your frontend sends the drawing data to the backend
2. The backend stores it and returns a shareable link ID
3. When someone opens the link, the frontend fetches the data from the backend

**The CORS proxy doesn't change where files are stored** - it just allows your custom domain to communicate with Excalidraw's backend. The drawings are still stored on Excalidraw's servers.

**If you want to store files on your own backend**, that's a much more complex solution requiring you to:
- Set up your own backend server that implements the Excalidraw API
- Handle file storage yourself
- Configure Firebase for image storage
- This is beyond the scope of this guide (and not necessary for most use cases)

## Option A: Cloudflare Workers (Recommended - Free & Easy)

Cloudflare Workers is perfect for this - it's free, fast, and easy to set up.

### Step 1: Create a Cloudflare Account
1. Go to https://workers.cloudflare.com/
2. Sign up for a free account (no credit card needed)
3. You may be asked to choose a subdomain for your workers (e.g., `yourname.workers.dev`) - choose anything you like

### Step 2: Create a Worker

1. On the "Ship something new" screen, click **"Start with Hello World!"** (the option with the globe icon)
2. This will create a new worker and open the code editor
3. In the code editor on the left, you'll see default "Hello World" code
4. **Delete all the default code** and replace it with this:

```javascript
export default {
  async fetch(request) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Get the target URL from the request path
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Determine the target backend URL
    let targetUrl;
    if (path === '/api/v2/post/' || path.endsWith('/api/v2/post/')) {
      // POST request to create a shareable link
      targetUrl = 'https://json.excalidraw.com/api/v2/post/';
    } else if (path.startsWith('/api/v2/')) {
      // GET request to load a shared link
      // Path format: /api/v2/{id}
      // Remove leading /api/v2/ to get the ID
      const id = path.replace(/^\/api\/v2\//, '');
      targetUrl = `https://json.excalidraw.com/api/v2/${id}`;
    } else {
      return new Response('Not found', { status: 404 });
    }

    // Forward the request
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'Content-Type': request.headers.get('Content-Type') || 'application/octet-stream',
      },
      body: request.method === 'POST' ? request.body : null,
    });

    // Get response body
    const responseBody = await response.arrayBuffer();

    // Create new response with CORS headers
    const newResponse = new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

    return newResponse;
  },
};
```

3. Click **"Deploy"** button (top right of the editor)
4. After deployment, you'll see your worker URL at the top (e.g., `https://your-worker-name.your-subdomain.workers.dev`)
5. **Copy this URL** - you'll need it for the next step

### Step 3: Configure Your Build

Rebuild your Excalidraw app with the worker URL:

```bash
VITE_APP_BACKEND_V2_POST_URL=https://excalidraw.micahdanielsmith.workers.dev/api/v2/post/ \
VITE_APP_BACKEND_V2_GET_URL=https://excalidraw.micahdanielsmith.workers.dev/api/v2/ \
yarn build
```

**Important:** Don't forget the `https://` protocol in the URLs!

### Step 4: Deploy

Upload the new `excalidraw-app/build` folder to your Hostinger hosting.

---

## Option B: Vercel Serverless Function (Free)

If you prefer Vercel:

### Step 1: Create a Vercel Account
1. Go to https://vercel.com
2. Sign up (free tier available)

### Step 2: Create a New Project

1. Create a new directory for your proxy:
```bash
mkdir excalidraw-proxy
cd excalidraw-proxy
```

2. Create `api/proxy.js`:

```javascript
export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { path } = req.query;
  const targetUrl = path 
    ? `https://json.excalidraw.com/api/v2/${Array.isArray(path) ? path.join('/') : path}`
    : 'https://json.excalidraw.com/api/v2/post/';

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/octet-stream',
      },
      body: req.method === 'POST' ? req.body : null,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

3. Create `package.json`:
```json
{
  "name": "excalidraw-proxy",
  "version": "1.0.0"
}
```

4. Deploy to Vercel:
```bash
vercel
```

5. Use the deployed URL in your build (similar to Cloudflare Workers)

---

## Option C: Simple Node.js Proxy (If you have another server)

If you have access to any Node.js hosting (even a free tier like Railway, Render, or Fly.io):

### Create `proxy.js`:

```javascript
const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 3001;
const TARGET = 'https://json.excalidraw.com';

const server = http.createServer((req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Determine target path
  let targetPath = req.url;
  if (req.url === '/api/v2/post/') {
    targetPath = '/api/v2/post/';
  } else if (req.url.startsWith('/api/v2/')) {
    targetPath = req.url;
  } else {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const targetUrl = `${TARGET}${targetPath}`;
  const url = new URL(targetUrl);

  const options = {
    hostname: url.hostname,
    port: url.port || 443,
    path: url.pathname,
    method: req.method,
    headers: {
      'Content-Type': req.headers['content-type'] || 'application/octet-stream',
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    res.writeHead(500);
    res.end(err.message);
  });

  req.pipe(proxyReq);
});

server.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
```

Deploy this to any Node.js hosting service.

---

## Quick Start: Cloudflare Workers (Recommended)

**Fastest path to get it working:**

1. **Sign up**: https://workers.cloudflare.com/ (free, no credit card needed)
2. **Create Worker**: Click "Start with Hello World!" → Delete the default code → Paste the code from Option A above
3. **Deploy**: Click "Deploy" button → Copy your worker URL
4. **Rebuild your app**:
   ```bash
   VITE_APP_BACKEND_V2_POST_URL=https://YOUR-WORKER-NAME.YOUR-SUBDOMAIN.workers.dev/api/v2/post/ \
   VITE_APP_BACKEND_V2_GET_URL=https://YOUR-WORKER-NAME.YOUR-SUBDOMAIN.workers.dev/api/v2/ \
   yarn build
   ```
   (Replace `YOUR-WORKER-NAME` and `YOUR-SUBDOMAIN` with your actual worker URL)
5. **Upload** the new build to Hostinger

That's it! Your sharing feature will now work.

---

## Testing

After deploying, test by:
1. Opening your Excalidraw app
2. Creating a drawing
3. Clicking "Share" → "Shareable Link"
4. It should work without CORS errors!

---

## Notes

- **Free tier limits**: Cloudflare Workers free tier allows 100,000 requests/day (plenty for personal use)
- **Security**: The proxy code above allows all origins (`*`). For production, you might want to restrict it to your domain
- **Performance**: Cloudflare Workers run on the edge network, so they're very fast globally

