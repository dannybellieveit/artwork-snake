import { Readable } from 'stream';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { isValidToken, isValidFile } from '../../../lib/validation';

export default async function handler(req, res) {
  const { token } = req.query;
  const file = req.query.file;
  if (!token || !file) {
    res.status(400).send('Missing token or file');
    return;
  }

  if (!isValidToken(token)) {
    res.status(400).send('Invalid token');
    return;
  }

  if (!isValidFile(file)) {
    res.status(400).send('Invalid file');
    return;
  }

  const range = req.headers['range'];
  const url = `https://transfer.dannycasio.com/s/${encodeURIComponent(token)}/download?path=%2F&files=${encodeURIComponent(file)}`;
  const headers = range ? { Range: range } : {};
  const upstream = await fetch(url, { headers });

  res.status(upstream.status);
  ['content-type', 'content-length', 'accept-ranges'].forEach(h => {
    const val = upstream.headers.get(h);
    if (val) res.setHeader(h, val);
  });
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (!upstream.body) {
    res.end();
    return;
  }

  const pump = promisify(pipeline);
  await pump(Readable.fromWeb(upstream.body), res);
}
