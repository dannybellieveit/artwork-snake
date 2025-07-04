import axios from 'axios';

export default function Download() {
  return null;
}

export async function getServerSideProps({ params, req, res }) {
  const { token } = params;
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://${req.headers.host}`;
    const { data } = await axios.get(`${baseUrl}/api/drop/v1/files/${token}`);
    const fileRes = await axios.get(data.downloadUrl, {
      responseType: 'stream',
      headers: {
        Accept: 'application/octet-stream',
      },
      auth: data.auth,
    });

    res.setHeader('Content-Disposition', `attachment; filename="${data.name}"`);
    fileRes.data.pipe(res);
    res.statusCode = 200;
    res.on('close', () => fileRes.data.destroy());
    return { props: {} };
  } catch (err) {
    res.statusCode = err.response?.status || 500;
    res.end(err.response?.data || 'Error downloading');
    return { props: {} };
  }
}
