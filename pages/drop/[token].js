import fs from 'fs';
import path from 'path';
import { parseStringPromise, processors } from 'xml2js';

export async function getServerSideProps({ params, res }) {
  const token = params.token || '';
  let title = 'File Share';

  try {
    const url = `https://transfer.dannycasio.com/s/${encodeURIComponent(token)}/files?format=xml`;
    const upstream = await fetch(url);
    const xml = await upstream.text();
    const parsed = await parseStringPromise(xml, {
      explicitArray: false,
      tagNameProcessors: [processors.stripPrefix]
    });
    const responses = Array.isArray(parsed.multistatus?.response)
      ? parsed.multistatus.response
      : [parsed.multistatus?.response].filter(Boolean);
      const hrefs = responses.map(r => r.href).filter(Boolean);
    const files = hrefs.filter(h => !h.endsWith('/webdav/') && !h.endsWith('/'));
    if (files.length === 1) {
      const name = decodeURIComponent(files[0].split('/').filter(Boolean).pop());
      title = name;
    }
  } catch (err) {
    console.error(err);
  }

  const filePath = path.join(process.cwd(), 'public/drop/index.html');
  let html = '';
  try {
    html = await fs.promises.readFile(filePath, 'utf8');
  } catch (err) {
    console.error(err);
  }
  
 const esc = s => String(s)
  .replace(/&/g,'&amp;')
  .replace(/"/g,'&quot;')
  .replace(/</g,'&lt;')
  .replace(/>/g,'&gt;');

let out = html;

// <title>
out = out.replace(/<title>.*?<\/title>/i, `<title>${esc(title)}</title>`);

// og:title (overwrite if present, otherwise inject before </head>)
if (out.match(/<meta\s+property=["']og:title["'][^>]*>/i)) {
  out = out.replace(
    /<meta\s+property=["']og:title["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta property="og:title" content="${esc(title)}">`
  );
} else {
  out = out.replace(/<\/head>/i,
    `  <meta property="og:title" content="${esc(title)}">\n</head>`);
}

// (optional) twitter:title for broader compatibility
if (out.match(/<meta\s+name=["']twitter:title["'][^>]*>/i)) {
  out = out.replace(
    /<meta\s+name=["']twitter:title["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta name="twitter:title" content="${esc(title)}">`
  );
} else {
  out = out.replace(/<\/head>/i,
    `  <meta name="twitter:title" content="${esc(title)}">\n</head>`);
}

// send `out` (not the original `html`)
res.setHeader('Content-Type', 'text/html; charset=utf-8');
res.end(out);



  res.setHeader('Content-Type', 'text/html');
  res.write(html);
  res.end();

  return { props: {} };
}

export default function DropToken() { return null; }
