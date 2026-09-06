// Detection now runs fully client-side inside the popup (see detector.js),
// so the service worker no longer proxies anything to a backend. It's kept
// around only for extension lifecycle logging.
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("AI Detector installed for the first time!");
  } else if (details.reason === "update") {
    console.log("AI Detector updated to a new version.");
  }
});
