import fs from 'fs';
import path from 'path';
import { parseStringPromise, processors } from 'xml2js';

// Strategy 1: Public share XML endpoint (current method)
async function strategy1_PublicShareXML(token, diagnostics) {
  diagnostics.steps.push({ strategy: 1, name: 'PublicShareXML', started: true });
  console.log('[LINK_PREVIEW_DEBUG] Strategy 1: Public share XML endpoint');

  const url = `https://transfer.dannycasio.com/s/${encodeURIComponent(token)}/files?format=xml`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  const upstream = await fetch(url, {
    signal: controller.signal,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NextJS-Drop-SSR/1.0; +https://dannycasio.com)'
    }
  });
  clearTimeout(timeoutId);

  if (!upstream.ok) {
    throw new Error(`HTTP ${upstream.status}: ${upstream.statusText}`);
  }

  const xml = await upstream.text();
  const parsed = await parseStringPromise(xml, {
    explicitArray: false,
    tagNameProcessors: [processors.stripPrefix],
  });

  const responses = Array.isArray(parsed.multistatus?.response)
    ? parsed.multistatus.response
    : [parsed.multistatus?.response].filter(Boolean);

  const hrefs = (responses || []).map(r => r.href).filter(Boolean);
  const files = hrefs.filter(h => !h.endsWith('/webdav/') && !h.endsWith('/'));

  if (files.length === 0) {
    throw new Error('No files found in XML response');
  }

  if (files.length === 1) {
    return decodeURIComponent(files[0].split('/').filter(Boolean).pop());
  } else {
    const first = decodeURIComponent(files[0].split('/').filter(Boolean).pop());
    return `${first} + ${files.length - 1} more`;
  }
}

// Strategy 2: Public WebDAV with auth
async function strategy2_WebDAVWithAuth(token, diagnostics) {
  diagnostics.steps.push({ strategy: 2, name: 'WebDAVWithAuth', started: true });
  console.log('[LINK_PREVIEW_DEBUG] Strategy 2: Public WebDAV with auth');

  const url = 'https://transfer.dannycasio.com/public.php/webdav/';
  const auth = 'Basic ' + Buffer.from(token + ':').toString('base64');

  const propfindBody = `<?xml version="1.0"?>
    <d:propfind xmlns:d="DAV:">
      <d:prop><d:displayname/></d:prop>
    </d:propfind>`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  const response = await fetch(url, {
    method: 'PROPFIND',
    signal: controller.signal,
    headers: {
      'Authorization': auth,
      'Depth': '1',
      'Content-Type': 'application/xml',
      'User-Agent': 'Mozilla/5.0 (compatible; NextJS-Drop-SSR/1.0; +https://dannycasio.com)'
    },
    body: propfindBody
  });
  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const xml = await response.text();

  // Extract displaynames using regex
  const names = [];
  const regex = /<(?:d:)?displayname[^>]*>(.*?)<\/(?:d:)?displayname>/gi;
  let match;

  while ((match = regex.exec(xml)) !== null) {
    let name = match[1].trim();
    if (name && !name.startsWith('/')) {
      // Decode HTML entities
      name = name.replace(/&amp;/g, '&')
                 .replace(/&lt;/g, '<')
                 .replace(/&gt;/g, '>')
                 .replace(/&quot;/g, '"')
                 .replace(/&#39;/g, "'");
      names.push(name);
    }
  }

  if (names.length === 0) {
    throw new Error('No displaynames found in PROPFIND response');
  }

  if (names.length === 1) {
    return names[0];
  } else {
    return `${names[0]} + ${names.length - 1} more`;
  }
}

// Strategy 3: Download endpoint header extraction
async function strategy3_DownloadHeader(token, diagnostics) {
  diagnostics.steps.push({ strategy: 3, name: 'DownloadHeader', started: true });
  console.log('[LINK_PREVIEW_DEBUG] Strategy 3: Download endpoint header extraction');

  const url = `https://transfer.dannycasio.com/s/${encodeURIComponent(token)}/download`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  const response = await fetch(url, {
    method: 'HEAD',
    signal: controller.signal,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NextJS-Drop-SSR/1.0; +https://dannycasio.com)'
    },
    redirect: 'manual' // Don't follow redirects
  });
  clearTimeout(timeoutId);

  const contentDisposition = response.headers.get('content-disposition');

  if (!contentDisposition) {
    throw new Error('No Content-Disposition header found');
  }

  // Parse filename from Content-Disposition header
  // Format: attachment; filename="filename.ext" or filename*=UTF-8''filename.ext
  const filenameMatch = contentDisposition.match(/filename\*?=['"]?([^'";\n]+)['"]?/i);

  if (!filenameMatch || !filenameMatch[1]) {
    throw new Error('Could not parse filename from Content-Disposition');
  }

  let filename = filenameMatch[1];

  // Handle RFC 5987 encoding (filename*=UTF-8''...)
  if (filename.includes("UTF-8''")) {
    filename = decodeURIComponent(filename.split("UTF-8''")[1]);
  }

  return filename;
}

// Strategy 4: Use existing list-proxy API
async function strategy4_ListProxyAPI(token, diagnostics) {
  diagnostics.steps.push({ strategy: 4, name: 'ListProxyAPI', started: true });
  console.log('[LINK_PREVIEW_DEBUG] Strategy 4: List proxy API');

  const url = `https://dannycasio.com/api/list-proxy/${encodeURIComponent(token)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NextJS-Drop-SSR/1.0; +https://dannycasio.com)'
    }
  });
  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const xml = await response.text();
  const parsed = await parseStringPromise(xml, {
    explicitArray: false,
    tagNameProcessors: [processors.stripPrefix],
  });

  const responses = Array.isArray(parsed.multistatus?.response)
    ? parsed.multistatus.response
    : [parsed.multistatus?.response].filter(Boolean);

  const hrefs = (responses || []).map(r => r.href).filter(Boolean);
  const files = hrefs.filter(h => !h.endsWith('/webdav/') && !h.endsWith('/'));

  if (files.length === 0) {
    throw new Error('No files found');
  }

  if (files.length === 1) {
    return decodeURIComponent(files[0].split('/').filter(Boolean).pop());
  } else {
    const first = decodeURIComponent(files[0].split('/').filter(Boolean).pop());
    return `${first} + ${files.length - 1} more`;
  }
}

// Try all strategies in order until one succeeds
async function fetchFilename(token, diagnostics) {
  const strategies = [
    strategy1_PublicShareXML,
    strategy2_WebDAVWithAuth,
    strategy3_DownloadHeader,
    strategy4_ListProxyAPI
  ];

  for (const strategy of strategies) {
    try {
      const result = await strategy(token, diagnostics);
      diagnostics.steps.push({
        strategy: strategies.indexOf(strategy) + 1,
        success: true,
        result
      });
      console.log(`[LINK_PREVIEW_DEBUG] Strategy ${strategies.indexOf(strategy) + 1} succeeded:`, result);
      return result;
    } catch (err) {
      diagnostics.steps.push({
        strategy: strategies.indexOf(strategy) + 1,
        failed: true,
        error: err.message
      });
      console.log(`[LINK_PREVIEW_DEBUG] Strategy ${strategies.indexOf(strategy) + 1} failed:`, err.message);
      // Continue to next strategy
    }
  }

  // All strategies failed
  throw new Error('All filename fetch strategies failed');
}

export async function getServerSideProps({ params, req, res }) {
  const token = params.token || '';
  let title = 'File Share';
  const diagnostics = {
    timestamp: new Date().toISOString(),
    token,
    userAgent: req.headers['user-agent'] || 'unknown',
    steps: []
  };

  // Try to fetch filename using multi-strategy approach
  try {
    title = await fetchFilename(token, diagnostics);
  } catch (err) {
    console.error('[LINK_PREVIEW_DEBUG] All strategies failed:', err.message);
    diagnostics.steps.push({ allFailed: true, error: err.message });
  }

  // 2) Read template
  const filePath = path.join(process.cwd(), 'public', 'drop', 'index.html');
  let html = '';
  try {
    html = await fs.promises.readFile(filePath, 'utf8');
  } catch (err) {
    console.error('Template read error:', err);
  }

  // 3) Build absolute URLs + escape helper
  const esc = s =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const proto =
    req.headers['x-forwarded-proto']?.toString().split(',')[0] || 'https';
  const host =
    req.headers['x-forwarded-host']?.toString().split(',')[0] ||
    req.headers.host ||
    'dannycasio.com';

  const absoluteUrl = `${proto}://${host}/drop/${encodeURIComponent(token)}${
    req.url.includes('?') ? '&' : '?'
  }v=${Date.now()}`;

  const imageUrl = `${proto}://${host}/default-share.png`; // ensure this exists (≈1200x630)

  // 4) Build a fresh <head> block and inject it just before </head>
  const headOG = `
  <title>${esc(title)}</title>
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="Download your shared file">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${esc(absoluteUrl)}">
  <meta property="og:image" content="${esc(imageUrl)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:image" content="${esc(imageUrl)}">
`;

  // Strip any existing title/og/twitter, then inject our block
  let out = html
    .replace(/<title>.*?<\/title>/is, '')
    .replace(/<meta[^>]+og:title[^>]*>/gi, '')
    .replace(/<meta[^>]+og:description[^>]*>/gi, '')
    .replace(/<meta[^>]+og:type[^>]*>/gi, '')
    .replace(/<meta[^>]+og:url[^>]*>/gi, '')
    .replace(/<meta[^>]+og:image[^>]*>/gi, '')
    .replace(/<meta[^>]+twitter:[^>]*>/gi, '')
    .replace(/<\/head>/i, `${headOG}\n</head>`);

  // 5) Send exactly one response, no cache
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('x-ssr-drop', '1');

  // Add diagnostics header (base64 encoded to avoid header issues)
  try {
    const diagnosticsJson = JSON.stringify(diagnostics);
    const diagnosticsBase64 = Buffer.from(diagnosticsJson).toString('base64');
    res.setHeader('X-Link-Preview-Debug', diagnosticsBase64);
    console.log('[LINK_PREVIEW_DEBUG] Final title:', title);
    console.log('[LINK_PREVIEW_DEBUG] Diagnostics:', diagnosticsJson);
  } catch (e) {
    console.error('[LINK_PREVIEW_DEBUG] Failed to encode diagnostics:', e);
  }

  res.end(out);

  // Next.js requires a props return even if we wrote the response
  return { props: {} };
}

export default function DropToken() {
  return null; // getServerSideProps streams the HTML
}
