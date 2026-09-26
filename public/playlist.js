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

  // For a playlist total, which can run past an hour
  function fmtTimeLong(sec) {
    if (!isFinite(sec) || sec <= 0) return null;
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = Math.floor(sec % 60).toString().padStart(2, '0');
    if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + s;
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

  // Same-origin proxy (the live share-proxy Worker) that does an
  // authenticated WebDAV GET server-side. Chrome blocks embedded
  // user:pass@ credentials in URLs for subresource loads like <audio>/
  // <img> src, so the auth has to happen on the server, not in the URL.
  function fileUrl(token, name) {
    return '/share-proxy/' + token + '?file=' + encodeURIComponent(name);
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

  // Soft toggle only — not real access control. Nextcloud's own "hide
  // download" doesn't block WebDAV GET either, so this just hides the
  // button for people who wouldn't otherwise think to look.
  function downloadsRequested() {
    return !new URLSearchParams(location.search).has('nd');
  }

  function render(token, entries, folderName) {
    var app = document.getElementById('playlist-app');
    var tracks = entries.filter(function (e) { return AUDIO_EXT.test(e.name); });
    var images = entries.filter(function (e) { return IMAGE_EXT.test(e.name); });
    var downloadsEnabled = downloadsRequested();

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
    html += '    <p id="pl-summary">' + tracks.length + ' track' + (tracks.length === 1 ? '' : 's') +
      '<span id="pl-total-duration-group"> · <span id="pl-total-duration">0:00</span></span>' +
      (totalBytes ? ' · ' + fmtBytes(totalBytes) : '') + '</p>';
    if (downloadsEnabled) {
      html += '    <a class="pl-download-all" href="https://transfer.dannycasio.com/s/' + token + '/download?accept=zip">Download all (ZIP)</a>';
    }
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
        '<span class="pl-track-duration">0:00</span>' +
        (downloadsEnabled
          ? '<a class="pl-track-download" href="' + fileUrl(token, track.name) + '" aria-label="Download ' + escapeHtml(stripExt(track.name)) + '"><svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg></a>'
          : '');
      list.appendChild(li);

      // Duration column shows length by default; swap to file size only
      // while the download button is hovered/focused, then swap back.
      if (downloadsEnabled) {
        var downloadLink = li.querySelector('.pl-track-download');
        var durationEl = li.querySelector('.pl-track-duration');
        var showSize = function () {
          durationEl.dataset.showingSize = 'true';
          durationEl.textContent = fmtBytes(track.bytes);
        };
        var showDuration = function () {
          durationEl.dataset.showingSize = 'false';
          durationEl.textContent = durationEl.dataset.durationText || '';
        };
        downloadLink.addEventListener('mouseenter', showSize);
        downloadLink.addEventListener('mouseleave', showDuration);
        downloadLink.addEventListener('focus', showSize);
        downloadLink.addEventListener('blur', showDuration);
      }
    });

    initPlayer(token, tracks, coverUrl || null, coverStyle);
    probeDurations(token, tracks);
  }

  // Fills in each track's real duration and the header's total length. All
  // tracks are probed in parallel — a live concurrency test against the
  // share-proxy confirmed the server handles a full playlist's worth of
  // simultaneous requests fine now, so this no longer needs to be sequential.
  function probeOne(token, track) {
    return new Promise(function (resolve) {
      var probe = new Audio();
      probe.preload = 'metadata';
      var settled = false;

      function done(duration) {
        if (settled) return;
        settled = true;
        resolve(isFinite(duration) ? duration : null);
      }

      probe.addEventListener('loadedmetadata', function () {
        if (isFinite(probe.duration)) { done(probe.duration); return; }
        // Chrome/streamed-audio quirk: duration reads Infinity until you
        // seek near the end, which forces it to resolve the real length.
        probe.addEventListener('durationchange', function onChange() {
          if (!isFinite(probe.duration)) return;
          probe.removeEventListener('durationchange', onChange);
          done(probe.duration);
        });
        probe.currentTime = 1e101;
      });
      probe.addEventListener('error', function () { done(NaN); });
      probe.src = fileUrl(token, track.name);
    });
  }

  // Counts a duration span up from 0:00 to its real value instead of just
  // snapping in — a blank cell popping straight to "4:36" reads as a
  // layout glitch, a quick tick-up reads as the number arriving.
  function animateDuration(span, targetSeconds, formatFn) {
    formatFn = formatFn || fmtTime;
    var durationMs = 600;
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var progress = Math.min((ts - start) / durationMs, 1);
      var eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      // Don't stomp on the file-size text if the download button happens
      // to be hovered/focused right as this probe resolves or mid-count.
      if (span.dataset.showingSize !== 'true') {
        span.textContent = formatFn(targetSeconds * eased) || '0:00';
      }
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  async function probeDurations(token, tracks) {
    var list = document.getElementById('pl-track-list');
    var rows = list.children;
    var durations = new Array(tracks.length).fill(null);

    await Promise.all(tracks.map(async function (track, i) {
      var duration = await probeOne(token, track);
      if (duration === null) return;
      durations[i] = duration;
      var span = rows[i].querySelector('.pl-track-duration');
      span.dataset.durationText = fmtTime(duration);
      animateDuration(span, duration);
    }));

    var totalDurationGroup = document.getElementById('pl-total-duration-group');
    var anyKnown = durations.some(function (d) { return d !== null; });
    if (!anyKnown) {
      // Nothing probed successfully — drop the "· 0:00" placeholder rather
      // than leave a permanently-wrong total sitting there.
      if (totalDurationGroup) totalDurationGroup.remove();
      return;
    }
    var totalKnown = durations.reduce(function (sum, d) { return sum + (d || 0); }, 0);
    animateDuration(document.getElementById('pl-total-duration'), totalKnown, fmtTimeLong);
  }

  function initPlayer(token, tracks, coverUrl, coverStyle) {
    var audio = document.getElementById('pl-audio');
    var bar = document.getElementById('pl-player');
    var playBtn = document.getElementById('pl-play');
    var prevBtn = document.getElementById('pl-prev');
    var nextBtn = document.getElementById('pl-next');
    var waveformEl = document.getElementById('pl-waveform');
    var timeCurrent = document.getElementById('pl-time-current');
    var timeTotal = document.getElementById('pl-time-total');
    var nameEl = document.getElementById('pl-player-name');
    var artEl = document.getElementById('pl-player-art');
    var listEl = document.getElementById('pl-track-list');

    var current = -1;
    var ws = null;
    var albumTitle = document.title;

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

    // Without explicit previoustrack/nexttrack handlers, iOS's lock-screen
    // and Control Center controls default to podcast-style ±10/±30s skip
    // buttons instead of track-skip buttons. Confirmed via an isolated
    // test page (mstest.html) against real iPhone hardware: handlers must
    // be registered AFTER the first track's audio has actually loaded, not
    // before (registering too early doesn't reliably take effect for the
    // button type) — but registering them more than once, ever, resets
    // iOS's lock-screen title/artwork back to blank. So this runs exactly
    // once, the first time a track's metadata loads, and never again.
    // Safari can throw on an unsupported action name, so each call is
    // wrapped individually.
    function setMediaSessionHandler(action, handler) {
      if (!('mediaSession' in navigator)) return;
      try { navigator.mediaSession.setActionHandler(action, handler); } catch (e) {}
    }
    function setupMediaSessionHandlers() {
      setMediaSessionHandler('play', function () { audio.play().catch(function () {}); });
      setMediaSessionHandler('pause', function () { audio.pause(); });
      setMediaSessionHandler('previoustrack', function () { load(current - 1, true); });
      setMediaSessionHandler('nexttrack', function () { load(current + 1, true); });
      setMediaSessionHandler('seekbackward', null);
      setMediaSessionHandler('seekforward', null);
    }
    if ('mediaSession' in navigator) {
      audio.addEventListener('loadedmetadata', setupMediaSessionHandlers, { once: true });
    }

    // Created lazily on first load(), after the bar is made visible — the
    // waveform container has zero width while #pl-player is display:none,
    // and wavesurfer needs a real width to render into.
    function ensureWaveSurfer() {
      if (ws || typeof WaveSurfer === 'undefined') return ws;
      try {
        var styles = getComputedStyle(document.documentElement);
        ws = WaveSurfer.create({
          container: waveformEl,
          media: audio,
          height: 40,
          barWidth: 2,
          barGap: 2,
          waveColor: 'rgba(255,255,255,0.3)',
          progressColor: (styles.getPropertyValue('--btn') || '#5AB4E5').trim()
        });
        // Degrade to a blank waveform strip (not a broken player) if the
        // CDN script failed to load, or wavesurfer can't decode a track.
        ws.on('error', function () { waveformEl.innerHTML = ''; });
      } catch (e) {
        ws = null;
      }
      return ws;
    }

    function load(index, autoplay) {
      current = (index + tracks.length) % tracks.length;
      var track = tracks[current];
      var url = fileUrl(token, track.name);
      nameEl.textContent = stripExt(track.name);
      bar.classList.add('visible');
      highlight();

      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: stripExt(track.name),
          artist: albumTitle,
          album: albumTitle,
          artwork: coverUrl ? [{ src: coverUrl, sizes: '512x512', type: '' }] : []
        });
      }

      var instance = ensureWaveSurfer();
      if (instance) {
        instance.load(url).then(function () {
          if (autoplay) audio.play().catch(function () {});
        }).catch(function () {}); // AbortError from rapid next/prev clicks
      } else {
        audio.src = url;
        if (autoplay) audio.play().catch(function () {});
      }
    }

    listEl.addEventListener('click', function (e) {
      var li = e.target.closest('.pl-track');
      if (!li) return;
      load(Number(li.dataset.index), true);
      // Mobile Safari can grant :focus-visible on a tap, which then has no
      // mouseout/blur equivalent to clear it — the row stays visually
      // "stuck" highlighted alongside whichever one is actually .playing.
      li.blur();
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
      if (audio.paused) audio.play().catch(function () {}); else audio.pause();
    });
    prevBtn.addEventListener('click', function () { load(current - 1, true); });
    nextBtn.addEventListener('click', function () { load(current + 1, true); });

    audio.addEventListener('play', function () {
      playBtn.dataset.playing = 'true';
      playBtn.setAttribute('aria-label', 'Pause');
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    });
    audio.addEventListener('pause', function () {
      playBtn.dataset.playing = 'false';
      playBtn.setAttribute('aria-label', 'Play');
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    });
    audio.addEventListener('ended', function () { load(current + 1, true); });

    function applyKnownDuration(duration) {
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
      timeCurrent.textContent = fmtTime(audio.currentTime);
    });

    // Space toggles play/pause anywhere on the page, except where the
    // browser already synthesizes its own click on Space (buttons, links,
    // the footer's <summary> dropdowns) or where the track-list keydown
    // handler above already handled it (it calls preventDefault()).
    document.addEventListener('keydown', function (e) {
      if (e.code !== 'Space') return;
      if (e.repeat || e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var tag = (e.target.tagName || '').toLowerCase();
      if (['input', 'textarea', 'select', 'button', 'a', 'summary'].indexOf(tag) !== -1) return;
      if (e.target.isContentEditable) return;
      e.preventDefault();
      playBtn.click();
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
