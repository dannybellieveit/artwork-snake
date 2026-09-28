(() => {
    const KEY = "bgAudio";
    const bg = new Audio;
    let tracked = null;
    let interval = null;
    function save() {
        if (tracked && !tracked.paused && tracked.src) {
            sessionStorage.setItem(KEY, JSON.stringify({
                src: tracked.src,
                time: tracked.currentTime
            }));
        }
    }
    function startSaving() {
        if (!interval) interval = setInterval(save, 500);
    }
    function stopSaving() {
        if (interval) {
            clearInterval(interval);
            interval = null;
        }
    }
    function track(el) {
        if (tracked === el) return;
        if (tracked === bg && el !== bg) bg.pause();
        tracked = el;
        startSaving();
    }
    document.addEventListener("play", e => {
        if (!(e.target instanceof HTMLAudioElement)) return;
        if (e.target !== bg && !bg.paused) bg.pause();
        track(e.target);
    }, true);
    document.addEventListener("pause", e => {
        if (e.target === tracked) stopSaving();
    }, true);
    document.addEventListener("ended", e => {
        if (e.target === tracked) {
            stopSaving();
            sessionStorage.removeItem(KEY);
            tracked = null;
        }
    }, true);
    function restore() {
        const raw = sessionStorage.getItem(KEY);
        if (!raw) return;
        try {
            const {src: src, time: time} = JSON.parse(raw);
            if (!src) return;
            const match = Array.from(document.querySelectorAll("audio")).find(a => a.src === src);
            const target = match || bg;
            if (!match) target.src = src;
            function seekAndPlay() {
                target.currentTime = time || 0;
                target.play().catch(() => {});
                track(target);
            }
            if (target.readyState >= 1) {
                seekAndPlay();
            } else {
                target.addEventListener("loadedmetadata", function once() {
                    target.removeEventListener("loadedmetadata", once);
                    seekAndPlay();
                });
            }
        } catch (e) {
            sessionStorage.removeItem(KEY);
        }
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", restore);
    } else {
        restore();
    }
    window.addEventListener("beforeunload", save);
})();