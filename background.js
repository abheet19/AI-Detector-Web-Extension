// ---- 1️) Life-cycle events ----
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
      console.log("AI Detector installed for the first time! 🎉");
    } else if (details.reason === "update") {
      console.log("AI Detector updated to a new version.");
    }
  });
  
  // ---- 2️) Basic message listener ----
  // popup.js -> background.js communication test
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Background received message:", message);
  
    if (message.type === "PING") {
      sendResponse({ status: "PONG", version: chrome.runtime.getManifest().version });
    }
  
    // returning true keeps sendResponse channel open for async work
    return true;
  });
  
  // ---- 3️) Future placeholder: fetch to backend ----