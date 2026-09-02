(function () {
  const canonicalOrigin = "https://starhao-8f494.web.app";
  const githubHost = "zeronsr2000-ai.github.io";
  const githubBasePath = "/starhao";

  if (window.location.hostname !== githubHost) return;
  if (!window.location.pathname.startsWith(githubBasePath)) return;

  const canonicalPath = window.location.pathname.slice(githubBasePath.length) || "/";
  window.location.replace(`${canonicalOrigin}${canonicalPath}${window.location.search}${window.location.hash}`);
})();
