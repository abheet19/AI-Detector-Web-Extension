// detector.js — shared, plain-JS heuristic AI-text detector.
//
// Loaded as a plain <script> (no bundler, no module system) so it can sit
// inside a Chrome Manifest V3 extension's CSP untouched, and also required()
// from Node for quick sanity checks. It attaches a single global,
// `AIDetector`, with one entry point: `AIDetector.analyzeText(text)`.
//
// This is a lightweight heuristic, not a trained classifier. It looks at four
// surface-level signals that tend to differ between typical LLM output and
// typical human writing, scores each 0-N, and sums them into a 0-100
// "likely AI-generated" estimate:
//
//   1. Sentence-length uniformity ("burstiness"): human writing tends to mix
//      short and long sentences; a lot of LLM output is comparatively even.
//   2. Stock LLM phrases: a small hardcoded list of tells ("as an AI language
//      model", "in conclusion", "it's important to note", ...).
//   3. Overuse of formal transition words (furthermore/moreover/additionally/
//      however/therefore) relative to sentence count.
//   4. Vocabulary repetition (low type-token ratio) and punctuation variety.
//
// None of these is proof of anything on its own — a careful human writer can
// trip several of them, and a lightly-edited LLM draft can dodge all of them.
// Treat the score as a rough prior, not a verdict.

(function (root) {
  "use strict";

  var STOCK_PHRASES = [
    "as an ai language model",
    "as a large language model",
    "i am an ai",
    "i'm an ai",
    "in conclusion",
    "in summary",
    "to summarize",
    "it's important to note",
    "it is important to note",
    "it's worth noting",
    "it is worth noting",
    "on the other hand",
    "overall, it is clear",
    "in today's world",
    "in today's digital age",
    "plays a crucial role",
    "plays a significant role",
    "delve into",
    "let's dive in",
    "in this article, we will",
    "i hope this helps",
    "i cannot provide",
    "as of my last knowledge update",
    "i don't have access to real-time"
  ];

  var TRANSITION_WORDS = [
    "furthermore",
    "moreover",
    "additionally",
    "however",
    "therefore",
    "consequently",
    "nevertheless",
    "in addition"
  ];

  function splitSentences(text) {
    return text
      .split(/(?<=[.!?])\s+|\n+/)
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
  }

  function words(text) {
    var m = text.toLowerCase().match(/[a-z']+/g);
    return m || [];
  }

  function mean(arr) {
    if (!arr.length) return 0;
    var sum = 0;
    for (var i = 0; i < arr.length; i++) sum += arr[i];
    return sum / arr.length;
  }

  function stdev(arr, avg) {
    if (arr.length < 2) return 0;
    var sq = 0;
    for (var i = 0; i < arr.length; i++) sq += Math.pow(arr[i] - avg, 2);
    return Math.sqrt(sq / arr.length);
  }

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function countOccurrences(haystack, needle) {
    // whole-word, case-insensitive count of `needle` inside `haystack`.
    var re = new RegExp("\\b" + needle.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + "\\b", "gi");
    var m = haystack.match(re);
    return m ? m.length : 0;
  }

  function analyzeText(text) {
    text = (text || "").trim();

    if (!text) {
      return {
        score: 0,
        label: "No text",
        explanation: "Paste some text first.",
        signals: []
      };
    }

    var sentences = splitSentences(text);
    var allWords = words(text);
    var wordCount = allWords.length;

    if (wordCount < 8 || sentences.length < 2) {
      return {
        score: 0,
        label: "Not enough text",
        explanation:
          "Add a bit more text (a couple of full sentences) for a meaningful estimate.",
        signals: []
      };
    }

    var signals = [];

    // ---- 1. Sentence-length uniformity (burstiness) ----
    var sentenceLengths = sentences.map(function (s) { return words(s).length; }).filter(function (n) { return n > 0; });
    var lenMean = mean(sentenceLengths);
    var lenStdev = stdev(sentenceLengths, lenMean);
    var cv = lenMean > 0 ? lenStdev / lenMean : 0; // coefficient of variation
    // Low CV (< ~0.3) => very uniform sentence lengths => AI-ish.
    // High CV (> ~0.7) => bursty, human-like variation.
    var uniformityScore = clamp(30 * (1 - cv / 0.7), 0, 30);
    if (uniformityScore > 12) {
      signals.push(
        "Sentence lengths are unusually uniform (little variation between " +
        "shortest and longest sentences), a pattern common in AI-generated text."
      );
    }

    // ---- 2. Stock LLM phrases ----
    var lowerText = text.toLowerCase();
    var matchedPhrases = STOCK_PHRASES.filter(function (p) { return lowerText.indexOf(p) !== -1; });
    var phraseScore = clamp(matchedPhrases.length * 15, 0, 30);
    if (matchedPhrases.length) {
      signals.push(
        "Contains common AI stock phrase" + (matchedPhrases.length > 1 ? "s" : "") +
        ": \"" + matchedPhrases.slice(0, 3).join("\", \"") + "\"."
      );
    }

    // ---- 3. Transition-word overuse ----
    var transitionCount = TRANSITION_WORDS.reduce(function (acc, w) {
      return acc + countOccurrences(text, w);
    }, 0);
    var transitionRate = transitionCount / sentences.length;
    var transitionScore = clamp(transitionRate * 60, 0, 15);
    if (transitionScore > 6) {
      signals.push(
        "Overuses formal transition words (furthermore/moreover/additionally/" +
        "however/therefore) — " + transitionCount + " instance" +
        (transitionCount === 1 ? "" : "s") + " across " + sentences.length + " sentences."
      );
    }

    // ---- 4. Vocabulary repetition (type-token ratio) ----
    var uniqueWords = new Set(allWords);
    var ttr = uniqueWords.size / wordCount;
    var repetitionScore = ttr < 0.6 ? clamp(15 * (0.6 - ttr) / 0.6, 0, 15) : 0;
    if (repetitionScore > 6) {
      signals.push(
        "Fairly repetitive vocabulary (" + Math.round(ttr * 100) +
        "% of words are unique) — natural writing usually varies word choice more."
      );
    }

    // ---- 5. Punctuation variety ----
    var punctMatches = text.match(/[,;:!?"'()\-]/g) || [];
    var punctVariety = new Set(punctMatches).size;
    var punctScore = clamp(10 * (1 - punctVariety / 6), 0, 10);
    if (punctScore > 5) {
      signals.push(
        "Limited punctuation variety (only " + punctVariety +
        " distinct mark" + (punctVariety === 1 ? "" : "s") + " used)."
      );
    }

    var avgWordLen = mean(allWords.map(function (w) { return w.length; }));

    var score = Math.round(
      uniformityScore + phraseScore + transitionScore + repetitionScore + punctScore
    );
    score = clamp(score, 0, 100);

    var label;
    if (score >= 65) label = "Likely AI-generated";
    else if (score >= 35) label = "Possibly AI-generated";
    else label = "Likely human-written";

    var explanation = signals.length
      ? signals.join(" ")
      : "No strong AI-style patterns detected — sentence lengths vary naturally " +
        "and no stock phrases were found.";

    return {
      score: score,
      label: label,
      explanation: explanation,
      signals: signals,
      metrics: {
        sentenceCount: sentences.length,
        wordCount: wordCount,
        avgWordLength: Math.round(avgWordLen * 10) / 10,
        sentenceLengthCV: Math.round(cv * 100) / 100,
        typeTokenRatio: Math.round(ttr * 100) / 100,
        punctuationVariety: punctVariety,
        stockPhraseMatches: matchedPhrases,
        transitionWordCount: transitionCount
      }
    };
  }

  var AIDetector = { analyzeText: analyzeText };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = AIDetector;
  }
  if (root) {
    root.AIDetector = AIDetector;
  }
})(typeof self !== "undefined" ? self : (typeof window !== "undefined" ? window : this));
