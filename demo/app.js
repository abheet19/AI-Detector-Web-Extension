// Wires the shared AIDetector module (detector.js) to this standalone page.
// Same logic as popup.js — this is the plain-webpage twin of the extension popup.
const input = document.getElementById("inputText");
const detectBtn = document.getElementById("detectBtn");
const scoreEl = document.getElementById("score");
const explainEl = document.getElementById("explain");

detectBtn.addEventListener("click", () => {
  const text = input.value.trim();
  if (!text) {
    scoreEl.textContent = "";
    explainEl.textContent = "Please enter some text first.";
    return;
  }

  const result = AIDetector.analyzeText(text);

  if (result.score === 0 && (result.label === "No text" || result.label === "Not enough text")) {
    scoreEl.textContent = "";
    explainEl.textContent = result.explanation;
    return;
  }

  scoreEl.textContent = `${result.label} — ${result.score}%`;
  explainEl.textContent = result.explanation;
});
