(function() {
  const { useState } = React;

  function Uploader() {
    const [link, setLink] = useState('');
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);

    const user = window.REACT_APP_NC_USER || (typeof process !== 'undefined' ? process.env.REACT_APP_NC_USER : '');
    const pass = window.REACT_APP_NC_PASS || (typeof process !== 'undefined' ? process.env.REACT_APP_NC_PASS : '');

    const handleDrop = async (e) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file) return;
      if (!user || !pass) {
        setError('Missing credentials');
        return;
      }
      setUploading(true);
      setError('');
      setLink('');

      const credentials = btoa(`${user}:${pass}`);
      const uploadUrl = `https://transfer.dannycasio.com/remote.php/dav/files/${encodeURIComponent(user)}/Guest%20Uploads/${encodeURIComponent(file.name)}`;

      try {
        await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Basic ${credentials}`
          },
          body: file
        });

        const shareResp = await fetch('https://transfer.dannycasio.com/ocs/v2.php/apps/files_sharing/api/v1/shares', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'OCS-APIREQUEST': 'true',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            path: `/Guest Uploads/${file.name}`,
            shareType: 3
          })
        });
        const data = await shareResp.json();
        if (data && data.ocs && data.ocs.data && data.ocs.data.url) {
          setLink(data.ocs.data.url);
        } else {
          setError('Failed to get share link');
        }
      } catch (err) {
        console.error(err);
        setError('Upload failed');
      } finally {
        setUploading(false);
      }
    };

    const handleDragOver = (e) => e.preventDefault();

    return React.createElement('div', { className: 'uploader-container' },
      React.createElement('div', { className: 'drop-zone', onDrop: handleDrop, onDragOver: handleDragOver },
        uploading ? 'Uploading...' : 'Drag and drop a file here'
      ),
      link && React.createElement('div', { className: 'upload-link' },
        React.createElement('a', { href: link, target: '_blank', rel: 'noopener noreferrer' }, link)
      ),
      error && React.createElement('div', { className: 'error' }, error)
    );
  }

  ReactDOM.render(React.createElement(Uploader), document.getElementById('root'));
})();
