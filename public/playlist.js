(function () {
  var AUDIO_EXT = /\.(mp3|wav|flac|ogg|m4a|aac)$/i;
  var IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;
  var COVER_NAME = /^(cover|folder|artwork)\./i;

  function fmtTime(sec) {
    if (!isFinite(sec) || sec < 0) return '0:00';
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60).toString().padStart(2, '0');
    return m + ':' + s;
  }

  function fmtBytes(bytes) {
    if (!bytes) return '';
    var mb = bytes / (1024 * 1024);
    if (mb < 1) return Math.round(bytes / 1024) + ' KB';
    return mb.toFixed(1) + ' MB';
  }

  function stripExt(name) {
    return name.replace(/\.[^.]+$/, '');
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Deterministic gradient from the token, so a given playlist always looks the same
  function gradientFor(seed) {
    var hash = 0;
    for (var i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    var hue1 = hash % 360;
    var hue2 = (hue1 + 40 + (hash % 60)) % 360;
    return 'linear-gradient(135deg, hsl(' + hue1 + ',70%,65%) 0%, hsl(' + hue2 + ',70%,55%) 100%)';
  }

  // Plain WebDAV GET with the share token as the Basic Auth username (blank
  // password), embedded directly in the URL so <audio>/<img> src can use it
  // without needing custom headers. This is the reliable, direct path to a
  // file's bytes — the /s/TOKEN/download convenience redirect proved flaky
  // under load for folder shares.
  function fileUrl(token, name) {
    return 'https://' + token + ':@transfer.dannycasio.com/public.php/webdav/' + encodeURIComponent(name);
  }

  function getToken() {
    var qs = new URLSearchParams(location.search);
    return qs.get('token') || (location.pathname.match(/^\/playlist\/([^/]+)$/) || [])[1];
  }

  async function fetchEntries(token) {
    // The real, already-live listing endpoint (a Cloudflare Worker route),
    // not part of this repo's dead pages/api code.
    var res = await fetch('/list-proxy/' + token);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var xmlText = await res.text();
    var doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    var responses = [...doc.getElementsByTagName('*')].filter(function (n) { return n.localName === 'response'; });

    var folderName = null;
    var root = responses.find(function (r) {
      var href = r.getElementsByTagNameNS('*', 'href')[0]?.textContent || '';
      return href.endsWith('/webdav/');
    });
    if (root) {
      var nameNode = root.getElementsByTagNameNS('*', 'displayname')[0];
      if (nameNode && nameNode.textContent) folderName = nameNode.textContent;
    }

    var entries = responses
      .map(function (r) {
        var href = r.getElementsByTagNameNS('*', 'href')[0]?.textContent || '';
        return { href: href, node: r };
      })
      .filter(function (e) { return e.href && !e.href.endsWith('/webdav/') && !e.href.endsWith('/'); })
      .map(function (e) {
        var name = decodeURIComponent(e.href.split('/').filter(Boolean).pop());
        var lenNode = e.node.getElementsByTagNameNS('*', 'getcontentlength')[0];
        return { name: name, bytes: lenNode ? Number(lenNode.textContent || 0) : 0 };
      });

    return { entries: entries, folderName: folderName };
  }

  function render(token, entries, folderName) {
    var app = document.getElementById('playlist-app');
    var tracks = entries.filter(function (e) { return AUDIO_EXT.test(e.name); });
    var images = entries.filter(function (e) { return IMAGE_EXT.test(e.name); });

    if (tracks.length === 0) {
      app.innerHTML = '<div id="playlist-state">No audio files found in this folder.</div>';
      return;
    }

    var title = folderName || 'Danny Casio';
    document.title = title;

    var cover = images.find(function (i) { return COVER_NAME.test(i.name); }) || images[0];
    var coverUrl = cover ? fileUrl(token, cover.name) : null;
    var coverStyle = coverUrl
      ? 'background-image:url(\'' + coverUrl + '\')'
      : 'background:' + gradientFor(token);

    var totalBytes = tracks.reduce(function (sum, t) { return sum + t.bytes; }, 0);

    var html = '';
    html += '<div class="pl-header">';
    html += '  <div class="pl-cover" style="' + coverStyle + '"></div>';
    html += '  <div class="pl-title-block">';
    html += '    <h1>' + escapeHtml(title) + '</h1>';
    html += '    <p id="pl-summary">' + tracks.length + ' track' + (tracks.length === 1 ? '' : 's') + (totalBytes ? ' · ' + fmtBytes(totalBytes) : '') + '</p>';
    html += '    <a class="pl-download-all" href="https://transfer.dannycasio.com/s/' + token + '/download?accept=zip">Download all (ZIP)</a>';
    html += '  </div>';
    html += '</div>';
    html += '<ul class="pl-tracks" id="pl-track-list"></ul>';
    app.innerHTML = html;

    var list = document.getElementById('pl-track-list');
    tracks.forEach(function (track, i) {
      var li = document.createElement('li');
      li.className = 'pl-track';
      li.tabIndex = 0;
      li.dataset.index = i;
      li.innerHTML =
        '<span class="pl-track-index">' + (i + 1) + '</span>' +
        '<span class="pl-track-playing-icon" aria-hidden="true">♪</span>' +
        '<span class="pl-track-name">' + escapeHtml(stripExt(track.name)) + '</span>' +
        '<span class="pl-track-duration">' + fmtBytes(track.bytes) + '</span>' +
        '<a class="pl-track-download" href="' + fileUrl(token, track.name) + '" aria-label="Download ' + escapeHtml(stripExt(track.name)) + '">⬇</a>';
      list.appendChild(li);
    });

    initPlayer(token, tracks, coverUrl || null, coverStyle);
  }

  function initPlayer(token, tracks, coverUrl, coverStyle) {
    var audio = document.getElementById('pl-audio');
    var bar = document.getElementById('pl-player');
    var playBtn = document.getElementById('pl-play');
    var prevBtn = document.getElementById('pl-prev');
    var nextBtn = document.getElementById('pl-next');
    var seek = document.getElementById('pl-seek');
    var timeCurrent = document.getElementById('pl-time-current');
    var timeTotal = document.getElementById('pl-time-total');
    var nameEl = document.getElementById('pl-player-name');
    var artEl = document.getElementById('pl-player-art');
    var listEl = document.getElementById('pl-track-list');

    var current = -1;
    var seeking = false;

    if (coverUrl) {
      artEl.style.backgroundImage = "url('" + coverUrl + "')";
    } else {
      artEl.style.background = coverStyle.replace('background:', '');
    }

    function highlight() {
      [...listEl.children].forEach(function (li, i) {
        li.classList.toggle('playing', i === current);
      });
    }

    function load(index, autoplay) {
      current = (index + tracks.length) % tracks.length;
      var track = tracks[current];
      audio.src = fileUrl(token, track.name);
      nameEl.textContent = stripExt(track.name);
      bar.classList.add('visible');
      highlight();
      if (autoplay) audio.play();
    }

    listEl.addEventListener('click', function (e) {
      var li = e.target.closest('.pl-track');
      if (!li) return;
      load(Number(li.dataset.index), true);
    });
    listEl.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var li = e.target.closest('.pl-track');
      if (!li) return;
      e.preventDefault();
      load(Number(li.dataset.index), true);
    });

    playBtn.addEventListener('click', function () {
      if (current === -1) { load(0, true); return; }
      if (audio.paused) audio.play(); else audio.pause();
    });
    prevBtn.addEventListener('click', function () { load(current - 1, true); });
    nextBtn.addEventListener('click', function () { load(current + 1, true); });

    audio.addEventListener('play', function () { playBtn.textContent = '❚❚'; });
    audio.addEventListener('pause', function () { playBtn.textContent = '▶'; });
    audio.addEventListener('ended', function () { load(current + 1, true); });

    function applyKnownDuration(duration) {
      seek.max = duration;
      timeTotal.textContent = fmtTime(duration);
      var row = listEl.children[current];
      if (row) row.querySelector('.pl-track-duration').textContent = fmtTime(duration);
    }

    audio.addEventListener('loadedmetadata', function () {
      if (isFinite(audio.duration)) applyKnownDuration(audio.duration);
    });
    // Chrome/streamed-audio quirk: duration can read Infinity at first and
    // only resolve once enough of the file has loaded — no forced seek here
    // (that causes an audible jump), just pick it up if it naturally settles.
    audio.addEventListener('durationchange', function () {
      if (isFinite(audio.duration)) applyKnownDuration(audio.duration);
    });
    audio.addEventListener('timeupdate', function () {
      if (seeking) return;
      seek.value = audio.currentTime;
      timeCurrent.textContent = fmtTime(audio.currentTime);
    });
    seek.addEventListener('input', function () {
      seeking = true;
      timeCurrent.textContent = fmtTime(Number(seek.value));
    });
    seek.addEventListener('change', function () {
      audio.currentTime = Number(seek.value);
      seeking = false;
    });
  }

  async function main() {
    var token = getToken();
    var app = document.getElementById('playlist-app');
    if (!token) {
      app.innerHTML = '<div id="playlist-state">No playlist token provided.</div>';
      return;
    }
    try {
      var result = await fetchEntries(token);
      render(token, result.entries, result.folderName);
    } catch (err) {
      console.error(err);
      app.innerHTML = '<div id="playlist-state">Error loading playlist.</div>';
    }
  }

  document.addEventListener('DOMContentLoaded', main);
})();
