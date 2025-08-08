import { isValidToken } from '../../../lib/validation';

export default async function handler(req, res) {
  const { token } = req.query;
  if (!token) {
    res.status(400).send('Missing token');
    return;
  }

  if (!isValidToken(token)) {
    res.status(400).send('Invalid token');
    return;
  }

  const url = `https://transfer.dannycasio.com/s/${encodeURIComponent(token)}/files?format=xml`;

  try {
    console.time('api-fetch');
    const upstream = await fetch(url);
    const body = await upstream.text();
    console.timeEnd('api-fetch');
    res.status(upstream.status)
       .setHeader('Content-Type', 'application/xml')
       .send(body);
  } catch (err) {
    console.error(err);
    res.status(500).send('Proxy error');
  }
}
