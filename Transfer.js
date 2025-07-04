(function() {
  const { useState, useEffect } = React;

  function TransferApp() {
    const [shares, setShares] = useState([]);
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);
    const user = window.REACT_APP_NC_USER || '';
    const pass = window.REACT_APP_NC_PASS || '';

    const authHeader = 'Basic ' + btoa(user + ':' + pass);

    async function loadShares() {
      if (!user || !pass) return;
      try {
        const resp = await fetch('https://transfer.dannycasio.com/ocs/v2.php/apps/files_sharing/api/v1/shares?path=/Guest%20Uploads&reshares=true&subfiles=true', {
          headers: {
            'Authorization': authHeader,
            'OCS-APIREQUEST': 'true'
          }
        });
        const data = await resp.json();
        setShares((data && data.ocs && data.ocs.data) || []);
      } catch (err) {
        console.error(err);
        setError('Failed to load files');
      }
    }

    useEffect(() => {
      loadShares();
    }, []);

    const handleDrop = async e => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file) return;
      if (!user || !pass) {
        setError('Missing credentials');
        return;
      }
      setUploading(true);
      setError('');

      const uploadUrl = `https://transfer.dannycasio.com/remote.php/dav/files/${encodeURIComponent(user)}/Guest%20Uploads/${encodeURIComponent(file.name)}`;
      try {
        await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Authorization': authHeader },
          body: file
        });
        await fetch('https://transfer.dannycasio.com/ocs/v2.php/apps/files_sharing/api/v1/shares', {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'OCS-APIREQUEST': 'true',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ path: `/Guest Uploads/${file.name}`, shareType: 3 })
        });
        await loadShares();
      } catch (err) {
        console.error(err);
        setError('Upload failed');
      } finally {
        setUploading(false);
      }
    };

    const handleDragOver = e => e.preventDefault();

    return React.createElement('div', { className: 'transfer-container' },
      React.createElement('div', { className: 'drop-zone', onDrop: handleDrop, onDragOver: handleDragOver },
        uploading ? 'Uploading...' : 'Drag and drop a file here'
      ),
      error && React.createElement('div', { className: 'error' }, error),
      React.createElement('div', { className: 'share-list' },
        shares.map(share => React.createElement('div', { key: share.id, className: 'share-item' },
          share.mimetype && share.mimetype.startsWith('audio/') &&
            React.createElement('audio', { controls: true, src: share.url }),
          React.createElement('a', { href: share.url, target: '_blank', rel: 'noopener noreferrer' }, share.name || share.url)
        ))
      )
    );
  }

  ReactDOM.render(React.createElement(TransferApp), document.getElementById('root'));
})();
