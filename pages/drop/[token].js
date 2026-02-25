import fs from 'fs';
import path from 'path';
import { parseStringPromise, processors } from 'xml2js';

export async function getServerSideProps({ params, req, res }) {
  const token = params.token || '';
  let title = 'File Share';
  const diagnostics = {
    timestamp: new Date().toISOString(),
    token,
    userAgent: req.headers['user-agent'] || 'unknown',
    steps: []
  };

  // 1) Work out the file name (single-file shares)
  try {
    const url = `https://transfer.dannycasio.com/s/${encodeURIComponent(token)}/files?format=xml`;
    diagnostics.steps.push({ step: 'fetch_url', url });
    console.log('[LINK_PREVIEW_DEBUG]', 'Fetching:', url);

    // Add timeout and User-Agent
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const upstream = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NextJS-Drop-SSR/1.0; +https://dannycasio.com)'
      }
    });
    clearTimeout(timeoutId);

    diagnostics.steps.push({
      step: 'fetch_response',
      status: upstream.status,
      ok: upstream.ok,
      headers: Object.fromEntries(upstream.headers.entries())
    });
    console.log('[LINK_PREVIEW_DEBUG]', 'Response status:', upstream.status);

    if (!upstream.ok) {
      throw new Error(`HTTP ${upstream.status}: ${upstream.statusText}`);
    }

    const xml = await upstream.text();
    diagnostics.steps.push({ step: 'fetch_complete', xmlLength: xml.length });
    console.log('[LINK_PREVIEW_DEBUG]', 'XML length:', xml.length, 'bytes');

    const parsed = await parseStringPromise(xml, {
      explicitArray: false,
      tagNameProcessors: [processors.stripPrefix],
    });
    diagnostics.steps.push({ step: 'xml_parsed', hasMultistatus: !!parsed.multistatus });
    console.log('[LINK_PREVIEW_DEBUG]', 'Parsed XML structure:', Object.keys(parsed));

    const responses = Array.isArray(parsed.multistatus?.response)
      ? parsed.multistatus.response
      : [parsed.multistatus?.response].filter(Boolean);

    diagnostics.steps.push({ step: 'responses_extracted', count: responses.length });
    console.log('[LINK_PREVIEW_DEBUG]', 'Responses found:', responses.length);

    const hrefs = (responses || []).map(r => r.href).filter(Boolean);
    diagnostics.steps.push({ step: 'hrefs_extracted', hrefs });
    console.log('[LINK_PREVIEW_DEBUG]', 'HREFs:', hrefs);

    const files = hrefs.filter(h => !h.endsWith('/webdav/') && !h.endsWith('/'));
    diagnostics.steps.push({ step: 'files_filtered', count: files.length, files });
    console.log('[LINK_PREVIEW_DEBUG]', 'Files after filtering:', files);

    if (files.length === 1) {
      const name = decodeURIComponent(files[0].split('/').filter(Boolean).pop());
      title = name;
      diagnostics.steps.push({ step: 'title_set_single', title });
      console.log('[LINK_PREVIEW_DEBUG]', 'Single file title:', title);
    } else if (files.length > 1) {
      // better multi-file title
      const first = decodeURIComponent(files[0].split('/').filter(Boolean).pop());
      title = `${first} + ${files.length - 1} more`;
      diagnostics.steps.push({ step: 'title_set_multiple', title });
      console.log('[LINK_PREVIEW_DEBUG]', 'Multiple files title:', title);
    } else {
      diagnostics.steps.push({ step: 'no_files_found' });
      console.log('[LINK_PREVIEW_DEBUG]', 'No files found, using default title');
    }
  } catch (err) {
    const errorInfo = {
      step: 'error',
      message: err.message,
      name: err.name,
      stack: err.stack?.split('\n').slice(0, 3).join('\n')
    };
    diagnostics.steps.push(errorInfo);
    console.error('[LINK_PREVIEW_DEBUG] Error:', errorInfo);
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
