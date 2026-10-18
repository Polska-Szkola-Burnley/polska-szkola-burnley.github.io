(function () {
  "use strict";

  var btn = document.getElementById("show-calendar");
  if (!btn) return;

  btn.addEventListener("click", function () {
    var ph = document.getElementById("calendar-placeholder");
    if (!ph || ph.dataset.loaded === "true") return;

    var src = btn.getAttribute("data-src");
    if (!src) return;

    var iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.style.position = "absolute";
    iframe.style.top = "0";
    iframe.style.left = "0";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "0";
    iframe.frameBorder = "0";
    iframe.scrolling = "no";
    iframe.setAttribute("loading", "lazy");
    iframe.setAttribute("title", "Kalendarz Google");

    ph.appendChild(iframe);
    ph.dataset.loaded = "true";
    btn.setAttribute("disabled", "disabled");
    btn.setAttribute("aria-disabled", "true");
  });
})();
