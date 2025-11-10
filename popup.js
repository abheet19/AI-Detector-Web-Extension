//  DOM references
const input = document.getElementById("inputText");
const detectBtn = document.getElementById("detectBtn");
const scoreEl = document.getElementById("score");
const explainEl = document.getElementById("explain");

detectBtn.addEventListener("click", () => {
  const text = input.value.trim();
  if (!text) {
    explainEl.textContent = "Please enter some text first.";
    return;
  }

  // 2️ show loading state
  scoreEl.textContent = "Detecting...";
  explainEl.textContent = "";

  // 3️ send message to background
  chrome.runtime.sendMessage({ type: "DETECT_TEXT", text }, (response) => {
    if (chrome.runtime.lastError) {
      scoreEl.textContent = "Error: " + chrome.runtime.lastError.message;
      return;
    }

    if (response.error) {
      scoreEl.textContent = "Error: " + response.error;
      return;
    }

    // 4️ update UI with result
    scoreEl.textContent = `${response.label} — ${response.pct}%`;
    explainEl.textContent = "Result fetched from backend mock.";
  });
});