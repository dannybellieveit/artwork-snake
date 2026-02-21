/**
 * Minimal Background Audio Player
 * Keeps music playing seamlessly across page navigations
 * Completely transparent - no visible UI
 */

(() => {
  const audioKey = 'audioState';

  // Create hidden audio element
  const audio = new Audio();
  audio.crossOrigin = 'anonymous';

  // Restore audio state on page load
  function restoreAudio() {
    const state = sessionStorage.getItem(audioKey);
    if (!state) return;

    try {
      const { src, currentTime } = JSON.parse(state);
      audio.src = src;
      audio.currentTime = currentTime || 0;
      audio.play().catch(() => {});
    } catch (e) {
      console.log('Could not restore audio');
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
    if (saveInterval) {
      clearInterval(saveInterval);
      saveInterval = null;
    }
  });

  // Restore on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreAudio);
  } else {
    restoreAudio();
  }

  // Expose simple play function
  window.playAudio = (src) => {
    audio.src = src;
    audio.play().catch(() => {});
  };

  // Save before unload
  window.addEventListener('beforeunload', saveAudio);
})();
