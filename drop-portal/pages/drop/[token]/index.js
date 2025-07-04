import axios from 'axios';
import Link from 'next/link';

export async function getServerSideProps({ params, req }) {
  const { token } = params;
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://${req.headers.host}`;
    const { data } = await axios.get(`${baseUrl}/api/drop/v1/files/${token}`);
    return { props: { meta: data } };
  } catch (err) {
    return { props: { error: err.response?.data?.error || 'Failed to fetch metadata' } };
  }
}

export default function DropPage({ meta, error }) {
  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-2">{meta.name}</h1>
      {meta.description && <p className="mb-2">{meta.description}</p>}
      <Link href={`/drop/${meta.token}/download`} className="bg-blue-500 text-white px-4 py-2 rounded">
        Download
      </Link>
      {meta.mime?.startsWith('audio/') && (
        <div className="mt-4">
          <audio controls src={`/drop/${meta.token}/stream`} className="w-full" />
        </div>
      )}
    </div>
  );
}
