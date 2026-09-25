// Real back-navigation for .back-button links: if you arrived here from
// elsewhere on this site (e.g. /drop/TOKEN or /playlist/TOKEN via the
// footer nav), go back there — token and all — instead of always landing
// on the homepage regardless of where you came from.
// Falls back to the link's own href (the homepage) when the referrer isn't
// this site — opened directly, new tab, bookmark, etc. history.length
// alone can't tell these apart: a freshly opened tab with a typed-in URL
// has the same history.length as one that arrived via an in-site link.
document.addEventListener('DOMContentLoaded', function () {
  var link = document.querySelector('.back-button');
  if (!link) return;
  link.addEventListener('click', function (e) {
    if (document.referrer && new URL(document.referrer).origin === location.origin) {
      e.preventDefault();
      history.back();
    }
  });
});
