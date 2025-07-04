import axios from 'axios';

export default async function handler(req, res) {
  const {
    NEXTCLOUD_BASE_URL,
    NEXTCLOUD_USER,
    NEXTCLOUD_PASSWORD,
  } = process.env;

  const { id } = req.query;

  if (!NEXTCLOUD_BASE_URL || !NEXTCLOUD_USER || !NEXTCLOUD_PASSWORD) {
    res.status(500).json({ error: 'Nextcloud configuration missing' });
    return;
  }

  try {
    const api = axios.create({
      baseURL: NEXTCLOUD_BASE_URL,
      auth: {
        username: NEXTCLOUD_USER,
        password: NEXTCLOUD_PASSWORD,
      },
      headers: { 'OCS-APIRequest': 'true' },
    });

    const shareRes = await api.get(`/ocs/v2.php/apps/files_sharing/api/v1/shares/${id}?format=json`);
    const data = shareRes.data?.ocs?.data;
    if (!data) {
      res.status(404).json({ error: 'Share not found' });
      return;
    }

    const fileInfo = Array.isArray(data) ? data[0] : data;
    const downloadUrl = `${NEXTCLOUD_BASE_URL}/public-files/${fileInfo.token}`;

    res.status(200).json({
      token: fileInfo.token,
      name: fileInfo.name,
      mime: fileInfo.mimetype,
      description: fileInfo.note || '',
      downloadUrl,
      auth: { username: NEXTCLOUD_USER, password: NEXTCLOUD_PASSWORD },
    });
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: 'Unable to fetch share information' });
  }
}
