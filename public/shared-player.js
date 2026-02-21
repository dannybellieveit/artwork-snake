/**
 * Minimal Background Audio Player
 * Keeps music playing seamlessly across page navigations
 * Completely transparent - no visible UI
 */

(() => {
  const audioKey = 'audioState';

  const audio = new Audio();

  function clearSaveInterval() {
    if (saveInterval) {
      clearInterval(saveInterval);
      saveInterval = null;
    }
  }

  // Restore audio state on page load
  function restoreAudio() {
    const state = sessionStorage.getItem(audioKey);
    if (!state) return;

    try {
      const { src, currentTime } = JSON.parse(state);
      if (!src) return;
      audio.src = src;
      // Wait for metadata before seeking — setting currentTime earlier silently fails
      audio.addEventListener('loadedmetadata', function onMeta() {
        audio.removeEventListener('loadedmetadata', onMeta);
        audio.currentTime = currentTime || 0;
      });
      audio.play().catch(() => {});
    } catch (e) {
      sessionStorage.removeItem(audioKey);
    }
  }

  // Save audio state before navigation
  function saveAudio() {
    if (audio.src && !audio.paused) {
      sessionStorage.setItem(audioKey, JSON.stringify({
        src: audio.src,
        currentTime: audio.currentTime
      }));
    }
  }

  // Save state periodically while playing
  let saveInterval = null;
  audio.addEventListener('play', () => {
    if (!saveInterval) {
      saveInterval = setInterval(saveAudio, 500);
    }
  });

  audio.addEventListener('pause', () => {
    clearSaveInterval();
  });

  // Clear stale state when audio finishes naturally
  audio.addEventListener('ended', () => {
    clearSaveInterval();
    sessionStorage.removeItem(audioKey);
  });

  // Restore on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreAudio);
  } else {
    restoreAudio();
  }

  // Expose play/pause controls
  window.playAudio = (src) => {
    audio.src = src;
    audio.play().catch(() => {});
  };

  window.pauseAudio = () => {
    audio.pause();
  };

  // Save before unload
  window.addEventListener('beforeunload', saveAudio);
})();
