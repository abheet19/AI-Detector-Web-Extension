// popup.js
// Day 1: local mock AI-detector prototype logic

// 1) helper: simple heuristic mock detector
function mockAIDetector(text) {
    // Normalize whitespace and short-circuit empty text
    const clean = text.trim();
    if (!clean) {
      return { score: null, reason: "No text provided." };
    }
  
    // Heuristic features (toy):
    // - average sentence length
    // - ratio of common AI markers (lots of transitional phrases)
    // - percentage of "rare" punctuation sequences (mock)
    const sentences = clean.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = clean.split(/\s+/).filter(w => w.length > 0);
    const avgSentenceLen = sentences.length ? words.length / sentences.length : words.length;
    const longWordRatio = words.filter(w => w.length > 8).length / Math.max(1, words.length);
  
    // Simple heuristic scoring (0..1), higher = more likely AI
    // - Longer average sentences push score slightly up (AI tends to create longer, well-formed sentences)
    // - High longWordRatio reduces score (humans sometimes use longer, unusual words less consistently)
    // This is just a toy formula for prototyping.
    let score = 0.25;
  
    // avgSentenceLen contribution (normalized)
    // assume typical human avg sentence length between 8 and 20 words
    const asn = Math.min(Math.max((avgSentenceLen - 8) / (20 - 8), 0), 1);
    score += asn * 0.45;
  
    // longWordRatio contribution (reduces AI-likelihood if high)
    score -= Math.min(longWordRatio, 0.4) * 0.2;
  
    // small random noise so it doesn't always return same number for similar text (makes testing feel realistic)
    score = Math.min(Math.max(score + (Math.random() - 0.5) * 0.05, 0), 1);
  
    // decide short explanation
    const reason = `avgSentenceLen=${avgSentenceLen.toFixed(1)}, longWordRatio=${(longWordRatio*100).toFixed(0)}%`;
  
    return { score, reason };
  }
  
  // 2) DOM wiring
  document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("inputText");
    const detectBtn = document.getElementById("detectBtn");
    const scoreEl = document.getElementById("score");
    const explainEl = document.getElementById("explain");
    const modeSelect = document.getElementById("mode");
  
    detectBtn.addEventListener("click", () => {
      const text = input.value;
      const mode = modeSelect.value;
  
      // Quick-mode uses local mock
      if (mode === "quick") {
        const { score, reason } = mockAIDetector(text);
  
        if (score === null) {
          scoreEl.textContent = "";
          explainEl.textContent = reason;
          return;
        }
  
        // Convert score to percentage and label
        const pct = Math.round(score * 100);
        let label;
        if (score > 0.75) label = "Likely AI-generated";
        else if (score > 0.45) label = "Possibly AI-generated";
        else label = "Likely human-written";
  
        scoreEl.textContent = `${label} — ${pct}%`;
        explainEl.textContent = `Reason: ${reason}`;
        console.log("Mock detection result:", { score, pct, reason });
      } else {
        // Placeholder for later 'detailed' mode which would call backend / model
        scoreEl.textContent = "Detailed mode not available in prototype.";
        explainEl.textContent = "Will call the backend in later days.";
      }
    });
  });