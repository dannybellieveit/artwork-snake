document.addEventListener("DOMContentLoaded", function() {
    var link = document.querySelector(".back-button");
    if (!link) return;
    link.addEventListener("click", function(e) {
        if (document.referrer && new URL(document.referrer).origin === location.origin) {
            e.preventDefault();
            history.back();
        }
    });
});