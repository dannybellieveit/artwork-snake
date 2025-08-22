import fs from 'fs';
import path from 'path';
import { parseStringPromise, processors } from 'xml2js';

export async function getServerSideProps({ params, req, res }) {
  const token = params.token || '';
  let title = 'File Share';

  // 1) Work out the file name (single-file shares)
  try {
    const url = `https://transfer.dannycasio.com/s/${encodeURIComponent(token)}/files?format=xml`;
    const upstream = await fetch(url);
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

    if (files.length === 1) {
      const name = decodeURIComponent(files[0].split('/').filter(Boolean).pop());
      title = name;
    } else if (files.length > 1) {
      // better multi-file title
      const first = decodeURIComponent(files[0].split('/').filter(Boolean).pop());
      title = `${first} + ${files.length - 1} more`;
    }
  } catch (err) {
    console.error('Share parse error:', err);
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
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
res.setHeader('Pragma', 'no-cache');
res.setHeader('x-ssr-drop', '1');
res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');

  res.end(out);

  // Next.js requires a props return even if we wrote the response
  return { props: {} };
}

export default function DropToken() {
  return null; // getServerSideProps streams the HTML
}
