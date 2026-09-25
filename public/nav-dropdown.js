// Desktop with a real mouse: open/close footer dropdowns on hover.
// Touch devices (no hover) keep the native tap-to-toggle <details>
// behaviour — but native <details> doesn't close its siblings on its
// own, so two could end up open (and overlapping) at once on mobile.
// The 'toggle' event fires for both hover-driven and tap-driven opens,
// so closing siblings there covers both input types with one listener.
(function () {
  var hoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
  var dropdowns = document.querySelectorAll('.nav-dropdown');
  var closeTimers = new Map();

  dropdowns.forEach(function (dropdown) {
    dropdown.addEventListener('toggle', function () {
      if (!dropdown.open) return;
      dropdowns.forEach(function (other) {
        if (other !== dropdown) other.open = false;
      });
    });

    dropdown.addEventListener('mouseenter', function () {
      if (!hoverQuery.matches) return;
      clearTimeout(closeTimers.get(dropdown));
      dropdown.open = true;
    });
    dropdown.addEventListener('mouseleave', function () {
      if (!hoverQuery.matches) return;
      closeTimers.set(dropdown, setTimeout(function () {
        dropdown.open = false;
      }, 250));
    });
  });
})();
