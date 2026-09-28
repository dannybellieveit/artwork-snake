(function() {
    var hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    var dropdowns = document.querySelectorAll(".nav-dropdown");
    var closeTimers = new Map;
    dropdowns.forEach(function(dropdown) {
        dropdown.addEventListener("toggle", function() {
            if (!dropdown.open) return;
            dropdowns.forEach(function(other) {
                if (other !== dropdown) other.open = false;
            });
        });
        dropdown.addEventListener("mouseenter", function() {
            if (!hoverQuery.matches) return;
            clearTimeout(closeTimers.get(dropdown));
            dropdown.open = true;
        });
        dropdown.addEventListener("mouseleave", function() {
            if (!hoverQuery.matches) return;
            closeTimers.set(dropdown, setTimeout(function() {
                dropdown.open = false;
            }, 250));
        });
    });
    window.addEventListener("pageshow", function(e) {
        if (!e.persisted) return;
        dropdowns.forEach(function(dropdown) {
            dropdown.open = false;
        });
    });
})();