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
  
    if (message.type === "DETECT_TEXT") {
      // Extract text
      const {text} =message;
       // Run async network call
      detectAI(text).then((result) => sendResponse(result));
      return true;
    }
    else if (message.type === "PING") {
      sendResponse({ status: "PONG", version: chrome.runtime.getManifest().version });
    }
  
  
    // returning true keeps sendResponse channel open for async work
    return true;
  });

  async function detectAI(text) {
    if (!text || !text.trim()) {
      return { error: "No text provided." };
    }
  
    try {
      const res = await fetch("http://localhost:5050/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
  
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
  
      // data = { score: 0.xx }
      const pct = Math.round(data.score * 100);
      let label;
      if (data.score > 0.75) label = "Likely AI-generated";
      else if (data.score > 0.45) label = "Possibly AI-generated";
      else label = "Likely human-written";
  
      return { pct, label };
    } catch (err) {
      console.error("Backend error:", err);
      return { error: err.message || "Network error" };
    }
  }
  
  // ---- 3️) Future placeholder: fetch to backend ----