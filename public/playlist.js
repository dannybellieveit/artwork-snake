(function() {
    var AUDIO_EXT = /\.(mp3|wav|flac|ogg|m4a|aac)$/i;
    var IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;
    var COVER_NAME = /^(cover|folder|artwork)\./i;
    var WEBLOC_EXT = /\.webloc$/i;
    function fmtTime(sec) {
        if (!isFinite(sec) || sec < 0) return "0:00";
        var m = Math.floor(sec / 60);
        var s = Math.floor(sec % 60).toString().padStart(2, "0");
        return m + ":" + s;
    }
    function fmtTimeLong(sec) {
        if (!isFinite(sec) || sec <= 0) return null;
        var h = Math.floor(sec / 3600);
        var m = Math.floor(sec % 3600 / 60);
        var s = Math.floor(sec % 60).toString().padStart(2, "0");
        if (h > 0) return h + ":" + String(m).padStart(2, "0") + ":" + s;
        return m + ":" + s;
    }
    function fmtBytes(bytes) {
        if (!bytes) return "";
        var mb = bytes / (1024 * 1024);
        if (mb < 1) return Math.round(bytes / 1024) + " KB";
        return mb.toFixed(1) + " MB";
    }
    function stripExt(name) {
        return name.replace(/\.[^.]+$/, "");
    }
    var ORDER_PREFIX = /^\s*(\d+)\s*[-–—:]?\s*/;
    function orderKey(name) {
        var match = name.match(ORDER_PREFIX);
        return match ? Number(match[1]) : Infinity;
    }
    function sortTracks(tracks) {
        tracks.sort(function(a, b) {
            var keyA = orderKey(a.name);
            var keyB = orderKey(b.name);
            if (keyA !== keyB) return keyA - keyB;
            return a.name.localeCompare(b.name);
        });
    }
    function trackTitle(track) {
        return stripExt(track.name).replace(ORDER_PREFIX, "");
    }
    function escapeHtml(str) {
        var div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }
    function gradientFor(seed) {
        var hash = 0;
        for (var i = 0; i < seed.length; i++) {
            hash = hash * 31 + seed.charCodeAt(i) >>> 0;
        }
        var hue1 = hash % 360;
        var hue2 = (hue1 + 40 + hash % 60) % 360;
        return "linear-gradient(135deg, hsl(" + hue1 + ",70%,65%) 0%, hsl(" + hue2 + ",70%,55%) 100%)";
    }
    function fileUrl(token, name) {
        return "/share-proxy/" + token + "?file=" + encodeURIComponent(name);
    }
    function getToken() {
        var qs = new URLSearchParams(location.search);
        return qs.get("token") || (location.pathname.match(/^\/playlist\/([^/]+)$/) || [])[1];
    }
    function weblocUrl(xmlText) {
        var doc = (new DOMParser).parseFromString(xmlText, "application/xml");
        var keys = doc.getElementsByTagName("key");
        for (var i = 0; i < keys.length; i++) {
            if (keys[i].textContent === "URL") {
                var value = keys[i].nextElementSibling;
                return value ? value.textContent : null;
            }
        }
        return null;
    }
    function spotifyTrackId(url) {
        var match = (url || "").match(/track\/(\w+)/);
        return match ? match[1] : null;
    }
    function resolveWeblocs(token, weblocs) {
        return Promise.all(weblocs.map(function(w) {
            return fetch(fileUrl(token, w.name)).then(function(res) {
                if (!res.ok) throw new Error("HTTP " + res.status);
                return res.text();
            }).then(function(xmlText) {
                var id = spotifyTrackId(weblocUrl(xmlText));
                if (!id) throw new Error("not a Spotify track link");
                return {
                    name: w.name,
                    type: "spotify",
                    spotifyId: id
                };
            }).catch(function(err) {
                console.warn('Skipping webloc "' + w.name + '": ' + err.message);
                return null;
            });
        })).then(function(results) {
            return results.filter(Boolean);
        });
    }
    async function fetchEntries(token) {
        var res = await fetch("/list-proxy/" + token);
        if (!res.ok) throw new Error("HTTP " + res.status);
        var xmlText = await res.text();
        var doc = (new DOMParser).parseFromString(xmlText, "application/xml");
        var responses = [ ...doc.getElementsByTagName("*") ].filter(function(n) {
            return n.localName === "response";
        });
        function isCollection(r) {
            var rt = r.getElementsByTagNameNS("*", "resourcetype")[0];
            return !!(rt && rt.getElementsByTagNameNS("*", "collection")[0]);
        }
        var folderName = null;
        var root = responses.find(function(r) {
            var href = r.getElementsByTagNameNS("*", "href")[0]?.textContent || "";
            return href.endsWith("/webdav/");
        });
        if (root && isCollection(root)) {
            var nameNode = root.getElementsByTagNameNS("*", "displayname")[0];
            if (nameNode && nameNode.textContent) folderName = nameNode.textContent;
        }
        var entries = responses.filter(function(r) {
            return !isCollection(r);
        }).map(function(r) {
            var href = r.getElementsByTagNameNS("*", "href")[0]?.textContent || "";
            var displayNode = r.getElementsByTagNameNS("*", "displayname")[0];
            var name = href && !href.endsWith("/webdav/") ? decodeURIComponent(href.split("/").filter(Boolean).pop()) : displayNode && displayNode.textContent || "";
            var lenNode = r.getElementsByTagNameNS("*", "getcontentlength")[0];
            return {
                name: name,
                bytes: lenNode ? Number(lenNode.textContent || 0) : 0
            };
        }).filter(function(e) {
            return e.name;
        });
        return {
            entries: entries,
            folderName: folderName
        };
    }
    function downloadsRequested() {
        return !new URLSearchParams(location.search).has("nd");
    }
    function discographyRequested() {
        return !new URLSearchParams(location.search).has("ndis");
    }
    async function render(token, entries, folderName) {
        var app = document.getElementById("playlist-app");
        var audioEntries = entries.filter(function(e) {
            return AUDIO_EXT.test(e.name);
        });
        var weblocEntries = entries.filter(function(e) {
            return WEBLOC_EXT.test(e.name);
        });
        var images = entries.filter(function(e) {
            return IMAGE_EXT.test(e.name);
        });
        var downloadsEnabled = downloadsRequested();
        var spotifyTracks = await resolveWeblocs(token, weblocEntries);
        var audioTracks = audioEntries.map(function(e) {
            return {
                name: e.name,
                bytes: e.bytes,
                type: "audio"
            };
        });
        var tracks = audioTracks.concat(spotifyTracks);
        sortTracks(tracks);
        if (tracks.length === 0) {
            app.innerHTML = '<div id="playlist-state">No audio files found in this folder.</div>';
            return;
        }
        var title = folderName || (tracks.length === 1 ? trackTitle(tracks[0]) : "Danny Casio");
        document.title = title;
        var cover = images.find(function(i) {
            return COVER_NAME.test(i.name);
        }) || images[0];
        var coverUrl = cover ? fileUrl(token, cover.name) : null;
        var coverStyle = coverUrl ? "background-image:url('" + coverUrl + "')" : "background:" + gradientFor(token);
        var totalBytes = tracks.reduce(function(sum, t) {
            return sum + (t.bytes || 0);
        }, 0);
        var html = "";
        html += '<div class="pl-header">';
        html += '  <div class="pl-cover" style="' + coverStyle + '"></div>';
        html += '  <div class="pl-title-block">';
        html += "    <h1>" + escapeHtml(title) + "</h1>";
        html += '    <p id="pl-summary">' + tracks.length + " track" + (tracks.length === 1 ? "" : "s") + '<span id="pl-total-duration-group"> · <span id="pl-total-duration">0:00</span></span>' + (downloadsEnabled && totalBytes ? " · " + fmtBytes(totalBytes) : "") + "</p>";
        if (downloadsEnabled) {
            html += '    <a class="pl-download-all" href="https://transfer.dannycasio.com/s/' + token + '/download?accept=zip">Download all (ZIP)</a>';
        }
        html += "  </div>";
        html += "</div>";
        html += '<ul class="pl-tracks" id="pl-track-list"></ul>';
        app.innerHTML = html;
        var list = document.getElementById("pl-track-list");
        tracks.forEach(function(track, i) {
            var li = document.createElement("li");
            li.className = "pl-track";
            li.tabIndex = 0;
            li.dataset.index = i;
            var isSpotify = track.type === "spotify";
            var title = trackTitle(track);
            li.innerHTML = '<span class="pl-track-index">' + (i + 1) + "</span>" + '<span class="pl-track-playing-icon" aria-hidden="true">♪</span>' + '<span class="pl-track-name">' + escapeHtml(title) + "</span>" + (isSpotify ? '<span class="pl-track-tag">Spotify</span>' + '<a class="pl-track-download" href="https://open.spotify.com/track/' + track.spotifyId + '" target="_blank" rel="noopener" aria-label="Open ' + escapeHtml(title) + ' on Spotify"><svg viewBox="0 0 24 24"><path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14zm5 16H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2z"/></svg></a>' : '<span class="pl-track-duration">0:00</span>' + (downloadsEnabled ? '<a class="pl-track-download" href="' + fileUrl(token, track.name) + '" aria-label="Download ' + escapeHtml(title) + '"><svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg></a>' : ""));
            list.appendChild(li);
            if (downloadsEnabled && !isSpotify) {
                var downloadLink = li.querySelector(".pl-track-download");
                var durationEl = li.querySelector(".pl-track-duration");
                var showSize = function() {
                    durationEl.dataset.showingSize = "true";
                    durationEl.textContent = fmtBytes(track.bytes);
                };
                var showDuration = function() {
                    durationEl.dataset.showingSize = "false";
                    durationEl.textContent = durationEl.dataset.durationText || "";
                };
                downloadLink.addEventListener("mouseenter", showSize);
                downloadLink.addEventListener("mouseleave", showDuration);
                downloadLink.addEventListener("focus", showSize);
                downloadLink.addEventListener("blur", showDuration);
            }
        });
        initPlayer(token, tracks, coverUrl || null, coverStyle);
        probeDurations(token, tracks);
    }
    function probeOne(token, track) {
        return new Promise(function(resolve) {
            var probe = new Audio;
            probe.preload = "metadata";
            var settled = false;
            function done(duration) {
                if (settled) return;
                settled = true;
                resolve(isFinite(duration) ? duration : null);
            }
            probe.addEventListener("loadedmetadata", function() {
                if (isFinite(probe.duration)) {
                    done(probe.duration);
                    return;
                }
                probe.addEventListener("durationchange", function onChange() {
                    if (!isFinite(probe.duration)) return;
                    probe.removeEventListener("durationchange", onChange);
                    done(probe.duration);
                });
                probe.currentTime = 1e101;
            });
            probe.addEventListener("error", function() {
                done(NaN);
            });
            probe.src = fileUrl(token, track.name);
        });
    }
    function animateDuration(span, targetSeconds, formatFn) {
        formatFn = formatFn || fmtTime;
        var durationMs = 600;
        var start = null;
        function step(ts) {
            if (start === null) start = ts;
            var progress = Math.min((ts - start) / durationMs, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            if (span.dataset.showingSize !== "true") {
                span.textContent = formatFn(targetSeconds * eased) || "0:00";
            }
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }
    async function probeDurations(token, tracks) {
        var list = document.getElementById("pl-track-list");
        var rows = list.children;
        var durations = new Array(tracks.length).fill(null);
        await Promise.all(tracks.map(async function(track, i) {
            if (track.type !== "audio") return;
            var duration = await probeOne(token, track);
            if (duration === null) return;
            durations[i] = duration;
            var span = rows[i].querySelector(".pl-track-duration");
            span.dataset.durationText = fmtTime(duration);
            animateDuration(span, duration);
        }));
        var totalDurationGroup = document.getElementById("pl-total-duration-group");
        var anyKnown = durations.some(function(d) {
            return d !== null;
        });
        if (!anyKnown) {
            if (totalDurationGroup) totalDurationGroup.remove();
            return;
        }
        var totalKnown = durations.reduce(function(sum, d) {
            return sum + (d || 0);
        }, 0);
        animateDuration(document.getElementById("pl-total-duration"), totalKnown, fmtTimeLong);
    }
    function initPlayer(token, tracks, coverUrl, coverStyle) {
        var audio = document.getElementById("pl-audio");
        var bar = document.getElementById("pl-player");
        var playBtn = document.getElementById("pl-play");
        var prevBtn = document.getElementById("pl-prev");
        var nextBtn = document.getElementById("pl-next");
        var waveformEl = document.getElementById("pl-waveform");
        var timeCurrent = document.getElementById("pl-time-current");
        var timeTotal = document.getElementById("pl-time-total");
        var nameEl = document.getElementById("pl-player-name");
        var artEl = document.getElementById("pl-player-art");
        var listEl = document.getElementById("pl-track-list");
        var current = -1;
        var ws = null;
        var albumTitle = document.title;
        var single = tracks.length <= 1;
        if (single) {
            prevBtn.style.display = "none";
            nextBtn.style.display = "none";
        }
        if (coverUrl) {
            artEl.style.backgroundImage = "url('" + coverUrl + "')";
        } else {
            artEl.style.background = coverStyle.replace("background:", "");
        }
        var squareArtworkUrl = null;
        if (coverUrl) {
            (function() {
                var img = new Image;
                img.onload = function() {
                    var side = Math.min(img.naturalWidth, img.naturalHeight);
                    var outSize = 512;
                    var canvas = document.createElement("canvas");
                    canvas.width = outSize;
                    canvas.height = outSize;
                    canvas.getContext("2d").drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, outSize, outSize);
                    try {
                        squareArtworkUrl = canvas.toDataURL("image/jpeg", .85);
                    } catch (e) {
                        return;
                    }
                    if (mediaSessionReady) setMediaSessionMetadata();
                };
                img.src = coverUrl;
            })();
        }
        function highlight() {
            [ ...listEl.children ].forEach(function(li, i) {
                li.classList.toggle("playing", i === current);
            });
        }
        function setMediaSessionHandler(action, handler) {
            if (!("mediaSession" in navigator)) return;
            try {
                navigator.mediaSession.setActionHandler(action, handler);
            } catch (e) {}
        }
        function setupMediaSessionHandlers() {
            setMediaSessionHandler("play", function() {
                audio.play().catch(function() {});
            });
            setMediaSessionHandler("pause", function() {
                audio.pause();
            });
            if (!single) {
                setMediaSessionHandler("previoustrack", function() {
                    var idx = nextAudioIndex(current, -1);
                    if (idx !== null) load(idx, true);
                });
                setMediaSessionHandler("nexttrack", function() {
                    var idx = nextAudioIndex(current, 1);
                    if (idx !== null) load(idx, true);
                });
            }
            setMediaSessionHandler("seekbackward", null);
            setMediaSessionHandler("seekforward", null);
        }
        function setMediaSessionMetadata() {
            if (!("mediaSession" in navigator)) return;
            var track = tracks[current];
            navigator.mediaSession.metadata = new MediaMetadata({
                title: trackTitle(track),
                artist: albumTitle,
                album: albumTitle,
                artwork: squareArtworkUrl ? [ {
                    src: squareArtworkUrl,
                    sizes: "512x512",
                    type: "image/jpeg"
                } ] : coverUrl ? [ {
                    src: coverUrl
                } ] : []
            });
        }
        var mediaSessionReady = false;
        if ("mediaSession" in navigator) {
            audio.addEventListener("loadedmetadata", function once() {
                audio.removeEventListener("loadedmetadata", once);
                setupMediaSessionHandlers();
                mediaSessionReady = true;
                setMediaSessionMetadata();
            });
        }
        function ensureWaveSurfer() {
            if (ws || typeof WaveSurfer === "undefined") return ws;
            try {
                var styles = getComputedStyle(document.documentElement);
                ws = WaveSurfer.create({
                    container: waveformEl,
                    media: audio,
                    height: 40,
                    barWidth: 2,
                    barGap: 2,
                    waveColor: "rgba(255,255,255,0.3)",
                    progressColor: (styles.getPropertyValue("--btn") || "#5AB4E5").trim()
                });
                ws.on("error", function() {
                    waveformEl.innerHTML = "";
                });
            } catch (e) {
                ws = null;
            }
            return ws;
        }
        function computePeaks(url) {
            return fetch(url).then(function(res) {
                return res.arrayBuffer();
            }).then(function(buf) {
                var ctx = new (window.AudioContext || window.webkitAudioContext);
                return ctx.decodeAudioData(buf).finally(function() {
                    ctx.close();
                });
            }).then(function(audioBuffer) {
                var channel = audioBuffer.getChannelData(0);
                var peakCount = 600;
                var blockSize = Math.floor(channel.length / peakCount) || 1;
                var peaks = new Array(peakCount);
                for (var i = 0; i < peakCount; i++) {
                    var max = 0;
                    var start = i * blockSize;
                    for (var j = 0; j < blockSize; j++) {
                        var v = Math.abs(channel[start + j] || 0);
                        if (v > max) max = v;
                    }
                    peaks[i] = max;
                }
                return {
                    peaks: [ peaks ],
                    duration: audioBuffer.duration
                };
            });
        }
        var loadToken = 0;
        var spotifyFrame = document.getElementById("pl-spotify-embed");
        function load(index, autoplay) {
            current = (index + tracks.length) % tracks.length;
            var track = tracks[current];
            nameEl.textContent = trackTitle(track);
            bar.classList.add("visible");
            highlight();
            if (track.type === "spotify") {
                loadSpotify(track);
            } else {
                loadAudio(track, autoplay);
            }
        }
        function nextAudioIndex(from, step) {
            var i = from;
            for (var n = 0; n < tracks.length; n++) {
                i = (i + step + tracks.length) % tracks.length;
                if (tracks[i].type === "audio") return i;
            }
            return null;
        }
        function loadSpotify(track) {
            ++loadToken;
            audio.pause();
            bar.classList.add("spotify-mode");
            if (spotifyFrame) {
                spotifyFrame.src = "https://open.spotify.com/embed/track/" + track.spotifyId + "?utm_source=generator&autoplay=1";
            }
        }
        function loadAudio(track, autoplay) {
            bar.classList.remove("spotify-mode");
            if (spotifyFrame) spotifyFrame.src = "";
            var url = fileUrl(token, track.name);
            var thisLoad = ++loadToken;
            var instance = ensureWaveSurfer();
            audio.src = url;
            var absoluteUrl = audio.src;
            if (autoplay) audio.play().catch(function() {});
            if (mediaSessionReady) setMediaSessionMetadata();
            if (instance) {
                computePeaks(absoluteUrl).then(function(result) {
                    if (thisLoad !== loadToken) return;
                    instance.load(absoluteUrl, result.peaks, result.duration).catch(function() {});
                }).catch(function() {});
            }
        }
        listEl.addEventListener("click", function(e) {
            var li = e.target.closest(".pl-track");
            if (!li) return;
            load(Number(li.dataset.index), true);
            li.blur();
        });
        listEl.addEventListener("keydown", function(e) {
            if (e.key !== "Enter" && e.key !== " ") return;
            var li = e.target.closest(".pl-track");
            if (!li) return;
            e.preventDefault();
            load(Number(li.dataset.index), true);
        });
        playBtn.addEventListener("click", function() {
            if (current === -1) {
                load(0, true);
                return;
            }
            if (tracks[current].type === "spotify") return;
            if (audio.paused) audio.play().catch(function() {}); else audio.pause();
        });
        prevBtn.addEventListener("click", function() {
            load(current - 1, true);
        });
        nextBtn.addEventListener("click", function() {
            load(current + 1, true);
        });
        audio.addEventListener("play", function() {
            playBtn.dataset.playing = "true";
            playBtn.setAttribute("aria-label", "Pause");
            if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
        });
        audio.addEventListener("pause", function() {
            playBtn.dataset.playing = "false";
            playBtn.setAttribute("aria-label", "Play");
            if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
        });
        audio.addEventListener("ended", function() {
            if (single) return;
            var idx = nextAudioIndex(current, 1);
            if (idx !== null) load(idx, true);
        });
        function applyKnownDuration(duration) {
            timeTotal.textContent = fmtTime(duration);
            var row = listEl.children[current];
            if (row) row.querySelector(".pl-track-duration").textContent = fmtTime(duration);
        }
        audio.addEventListener("loadedmetadata", function() {
            if (isFinite(audio.duration)) applyKnownDuration(audio.duration);
        });
        audio.addEventListener("durationchange", function() {
            if (isFinite(audio.duration)) applyKnownDuration(audio.duration);
        });
        audio.addEventListener("timeupdate", function() {
            timeCurrent.textContent = fmtTime(audio.currentTime);
        });
        document.addEventListener("keydown", function(e) {
            if (e.code !== "Space") return;
            if (e.repeat || e.defaultPrevented) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            var tag = (e.target.tagName || "").toLowerCase();
            if ([ "input", "textarea", "select", "button", "a", "summary" ].indexOf(tag) !== -1) return;
            if (e.target.isContentEditable) return;
            e.preventDefault();
            playBtn.click();
        });
    }
    async function main() {
        if (!discographyRequested()) {
            var discographyLink = document.getElementById("pl-discography-link");
            if (discographyLink) discographyLink.remove();
        }
        var token = getToken();
        var app = document.getElementById("playlist-app");
        if (!token) {
            app.innerHTML = '<div id="playlist-state">No playlist token provided.</div>';
            return;
        }
        try {
            var result = await fetchEntries(token);
            await render(token, result.entries, result.folderName);
        } catch (err) {
            console.error(err);
            app.innerHTML = '<div id="playlist-state">Error loading playlist.</div>';
        }
    }
    document.addEventListener("DOMContentLoaded", main);
})();