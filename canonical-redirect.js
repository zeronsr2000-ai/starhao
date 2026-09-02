(function () {
  const canonicalOrigin = "https://zeronsr2000-ai.github.io";
  const canonicalBasePath = "/starhao";
  const firebaseHost = "starhao-8f494.web.app";

  if (window.location.hostname !== firebaseHost) return;

  const canonicalPath = window.location.pathname === "/" ? "/" : window.location.pathname;
  window.location.replace(`${canonicalOrigin}${canonicalBasePath}${canonicalPath}${window.location.search}${window.location.hash}`);
})();
