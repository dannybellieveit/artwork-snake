import fs from 'fs';
import path from 'path';

export async function getServerSideProps({ params, res }) {
  const token = params.token || '';
  let title = 'File Share';

  try {
    const url = `https://transfer.dannycasio.com/s/${encodeURIComponent(token)}/files?format=xml`;
    const upstream = await fetch(url);
    const xml = await upstream.text();
    const matches = [...xml.matchAll(/<[^>]*href[^>]*>([^<]+)<\/[^>]*href>/g)].map(m => m[1]);
    const files = matches.filter(h => !h.endsWith('/webdav/') && !h.endsWith('/'));
    if (files.length === 1) {
      const name = decodeURIComponent(files[0].split('/').filter(Boolean).pop());
      title = name;
    }
  } catch (err) {
    console.error(err);
  }

  const filePath = path.join(process.cwd(), 'public/drop/index.html');
  let html = fs.readFileSync(filePath, 'utf8');
  html = html.replace('<title>File Share</title>', `<title>${title}</title>\n<meta property="og:title" content="${title}">`);

  res.setHeader('Content-Type', 'text/html');
  res.write(html);
  res.end();

  return { props: {} };
}

export default function DropToken() { return null; }
