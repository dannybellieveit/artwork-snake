import axios from 'axios';

export default function Stream() {
  return null;
}

export async function getServerSideProps({ params, req, res }) {
  const { token } = params;
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://${req.headers.host}`;
    const { data } = await axios.get(`${baseUrl}/api/drop/v1/files/${token}`);
    const range = req.headers.range || '';
    const fileRes = await axios.get(data.downloadUrl, {
      responseType: 'stream',
      headers: {
        Range: range,
      },
      auth: data.auth,
    });

    res.statusCode = fileRes.status;
    res.setHeader('Accept-Ranges', 'bytes');
    for (const [key, value] of Object.entries(fileRes.headers)) {
      if (typeof value !== 'undefined') {
        res.setHeader(key, value);
      }
    }
    fileRes.data.pipe(res);
    res.on('close', () => fileRes.data.destroy());
    return { props: {} };
  } catch (err) {
    res.statusCode = err.response?.status || 500;
    res.end('Error streaming');
    return { props: {} };
  }
}
