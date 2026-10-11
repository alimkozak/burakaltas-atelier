/* Light / dark theme. Loaded in <head>, before the stylesheets, so a page never flashes the wrong palette.
   Light is the default; the visitor's choice is kept in this browser (see setTheme in app.js). */
(function () {
  var dark = false;
  try { dark = localStorage.getItem("ba-theme") === "dark"; } catch (e) {}
  document.documentElement.classList.toggle("noir", dark);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? "#0e0c0a" : "#f7f2eb";
})();
