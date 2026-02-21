/**
 * Shared Audio Player System
 * Manages persistent audio playback across page navigations
 * Uses sessionStorage to maintain playback state
 */

class SharedAudioPlayer {
  constructor() {
    this.audioElement = null;
    this.miniPlayer = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the shared audio player
   * This should be called on DOMContentLoaded
   */
  init() {
    if (this.isInitialized) return;

    // Create the mini player container
    this.createMiniPlayer();

    // Restore audio state if it exists
    const savedState = this.getSavedState();
    if (savedState && savedState.src) {
      this.restoreAudio(savedState);
    }

    this.isInitialized = true;
  }

  /**
   * Create the floating mini player UI
   */
  createMiniPlayer() {
    // Check if mini player already exists
    if (document.getElementById('shared-mini-player-container')) {
      this.miniPlayer = document.getElementById('shared-mini-player-container');
      return;
    }

    const container = document.createElement('div');
    container.id = 'shared-mini-player-container';
    container.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #3F93C8 0%, #5AB4E5 100%);
      border-top: 2px solid rgba(0,0,0,0.1);
      padding: 12px 16px;
      box-shadow: 0 -2px 8px rgba(0,0,0,0.15);
      z-index: 1000;
      display: none;
      font-family: system-ui, -apple-system, sans-serif;
      max-height: 120px;
      overflow: hidden;
    `;

    container.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; color: white;">
        <button id="mini-play-btn" aria-label="Play" style="
          background: white;
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 18px;
          flex-shrink: 0;
          transition: transform 0.2s;
        ">▶</button>

        <div style="flex: 1; min-width: 0; overflow: hidden;">
          <div id="mini-title" style="
            font-weight: 600;
            font-size: 14px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 4px;
          ">Now Playing</div>

          <div style="display: flex; align-items: center; gap: 8px; font-size: 12px;">
            <span id="mini-time">0:00</span>
            <div id="mini-progress" style="
              flex: 1;
              height: 4px;
              background: rgba(255,255,255,0.3);
              border-radius: 2px;
              cursor: pointer;
              position: relative;
            ">
              <div id="mini-progress-bar" style="
                height: 100%;
                background: white;
                border-radius: 2px;
                width: 0%;
              "></div>
            </div>
            <span id="mini-duration">0:00</span>
          </div>
        </div>

        <button id="mini-close-btn" aria-label="Close player" style="
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 18px;
          flex-shrink: 0;
          transition: background 0.2s;
        ">✕</button>
      </div>
    `;

    document.body.appendChild(container);
    this.miniPlayer = container;

    // Add event listeners
    document.getElementById('mini-play-btn').addEventListener('click', () => this.togglePlay());
    document.getElementById('mini-close-btn').addEventListener('click', () => this.stop());
    document.getElementById('mini-progress').addEventListener('click', (e) => this.seekTo(e));
  }

  /**
   * Play an audio file
   */
  playAudio(src, title = 'Audio File') {
    // Stop existing audio if any
    if (this.audioElement) {
      this.audioElement.pause();
    }

    // Create or reuse audio element
    if (!this.audioElement) {
      this.audioElement = new Audio();
      this.audioElement.addEventListener('timeupdate', () => this.updateProgress());
      this.audioElement.addEventListener('loadedmetadata', () => this.updateProgress());
      this.audioElement.addEventListener('ended', () => this.stop());
    }

    // Set audio source and play
    this.audioElement.src = src;
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.play().catch(err => console.log('Playback failed:', err));

    // Update mini player
    this.updateTitle(title);
    this.showMiniPlayer();

    // Save state
    this.saveState(src, title);
  }

  /**
   * Toggle play/pause
   */
  togglePlay() {
    if (!this.audioElement) return;

    if (this.audioElement.paused) {
      this.audioElement.play();
    } else {
      this.audioElement.pause();
    }
  }

  /**
   * Stop playback
   */
  stop() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    this.hideMiniPlayer();
    sessionStorage.removeItem('audioPlayerState');
  }

  /**
   * Seek to a position
   */
  seekTo(event) {
    if (!this.audioElement) return;

    const progress = document.getElementById('mini-progress');
    const rect = progress.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    this.audioElement.currentTime = percent * this.audioElement.duration;
  }

  /**
   * Update progress bar and time display
   */
  updateProgress() {
    if (!this.audioElement) return;

    const duration = this.audioElement.duration || 0;
    const current = this.audioElement.currentTime || 0;
    const percent = duration > 0 ? (current / duration) * 100 : 0;

    const progressBar = document.getElementById('mini-progress-bar');
    const timeSpan = document.getElementById('mini-time');
    const durationSpan = document.getElementById('mini-duration');
    const playBtn = document.getElementById('mini-play-btn');

    if (progressBar) progressBar.style.width = percent + '%';
    if (timeSpan) timeSpan.textContent = this.formatTime(current);
    if (durationSpan) durationSpan.textContent = this.formatTime(duration);

    // Update play button icon
    if (playBtn) {
      playBtn.textContent = this.audioElement.paused ? '▶' : '❚❚';
      playBtn.setAttribute('aria-label', this.audioElement.paused ? 'Play' : 'Pause');
    }
  }

  /**
   * Format time in MM:SS
   */
  formatTime(seconds) {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }

  /**
   * Update mini player title
   */
  updateTitle(title) {
    const titleEl = document.getElementById('mini-title');
    if (titleEl) titleEl.textContent = title;
  }

  /**
   * Show mini player
   */
  showMiniPlayer() {
    if (this.miniPlayer) {
      this.miniPlayer.style.display = 'block';
    }
  }

  /**
   * Hide mini player
   */
  hideMiniPlayer() {
    if (this.miniPlayer) {
      this.miniPlayer.style.display = 'none';
    }
  }

  /**
   * Save audio state to sessionStorage
   */
  saveState(src, title) {
    sessionStorage.setItem('audioPlayerState', JSON.stringify({
      src,
      title,
      timestamp: Date.now()
    }));
  }

  /**
   * Get saved audio state
   */
  getSavedState() {
    const state = sessionStorage.getItem('audioPlayerState');
    return state ? JSON.parse(state) : null;
  }

  /**
   * Restore audio from saved state
   */
  restoreAudio(state) {
    this.playAudio(state.src, state.title);
  }
}

// Create global instance
window.sharedAudioPlayer = new SharedAudioPlayer();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.sharedAudioPlayer.init();
  });
} else {
  window.sharedAudioPlayer.init();
}
