<div align="center">

<br>

# AI Detector

### **A lightweight, on-device guess at "did an LLM write this?"**

<br>

<sub>A personal project by <b><a href="https://github.com/abheet19">Abheet</a></b> — a Chrome extension prototype. Heuristic demo, not a production classifier.</sub>

<br>

</div>

> [!NOTE]
> **Nothing leaves your machine.** Detection runs as plain JavaScript in the popup (or the demo
> page below) — no network calls, no API key, no server. See [how detection works](#how-detection-works)
> for the honest version of what that buys you.

---

## Contents

- [What it is](#what-it-is)
- [Tech stack](#tech-stack)
- [How detection works](#how-detection-works)
- [Design](#design)
- [Screenshots](#screenshots)
- [Run it](#run-it)
- [Project layout](#project-layout)

---

## What it is

A Chrome extension popup (and a standalone demo page using the same code) where you paste text and
get back a 0-100 "likely AI-generated" score plus a plain-English explanation of which signals fired.
Earlier versions of this repo faked the score with a Flask mock server (`mock_api.py`, since removed);
the detector is now a real, if simple, piece of client-side analysis — see below for exactly what it
does and doesn't do.

## Tech stack

| Layer | Choice |
|---|---|
| Extension | Chrome Manifest V3 (`manifest.json`, popup + service worker) |
| Detection logic | Vanilla JavaScript, zero dependencies (`detector.js`) |
| UI | Plain HTML/CSS, no framework, no build step |
| Demo page | Static HTML, deployed to GitHub Pages via GitHub Actions |

## How detection works

`detector.js` is the single shared module — both `popup.js` (extension) and `demo/app.js` (web demo)
call its one function, `AIDetector.analyzeText(text)`. It scores four surface-level signals and sums
them into a 0-100 estimate:

1. **Sentence-length uniformity ("burstiness").** Human writing tends to mix short and long sentences;
   a lot of LLM output is comparatively even. Measured as the coefficient of variation across sentence
   word-counts — low variation scores higher.
2. **Stock LLM phrases.** A small hardcoded list of tells — *"as an AI language model"*, *"in conclusion"*,
   *"it's important to note"*, *"delve into"*, and a couple dozen others.
3. **Transition-word overuse.** Rate of *furthermore / moreover / additionally / however / therefore /
   consequently* per sentence.
4. **Vocabulary repetition and punctuation variety.** Type-token ratio (unique words ÷ total words) and
   how many distinct punctuation marks show up.

Each contributes a bounded number of points (30 / 30 / 15 / 15+10) and the popup's `explain` field
lists exactly which signals fired, in plain language.

**Honesty check:** this is a lightweight heuristic built for a side-project demo, not a trained
classifier and not a research-grade detector. It has no idea about model-specific token statistics,
perplexity, or watermarking, it can be fooled by a careful human who over-formalizes their writing,
and it can miss a lightly-edited LLM draft. Treat the score as a rough prior worth a second glance, not
a verdict.

## Design

Dark glass UI with its own **rose/alert** palette, deliberately distinct from this author's other
projects (ShieldAI's steel-blue, Smart-Rephraser-Lite's violet, Textify's copper, HealthFlow's emerald)
— a "something here needs your attention" family fits a detector product:

```
#0D0A0C ground · #F76B8A rose (bright) · #E8496C rose (mid) · #B02E4C rose (deep) · #F5E7EB bone text
```

Same tokens drive both the extension popup (`popup.css`) and the demo page (`demo/styles.css`).

## Screenshots

<!-- placeholders — swap in real captures -->

| Popup | Demo page |
|---|---|
| ![Popup screenshot](docs/screenshots/popup.png) | ![Demo screenshot](docs/screenshots/demo.png) |

## Run it

**Extension, loaded locally**

1. Clone this repo.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the repo folder.
5. Click the extension icon, paste some text, hit **Detect**.

**Live demo page**

`https://abheet19.github.io/AI-Detector-Web-Extension/`

The page and its deploy workflow (`.github/workflows/deploy-pages.yml`) are in place, but GitHub Pages
still needs the one manual step of setting **Settings → Pages → Source → GitHub Actions** in this
repo — that can't be done from a `git push`, so until it's flipped on the link above will 404.

## Project layout

```
manifest.json          Chrome Manifest V3 config
background.js          Service worker (lifecycle logging only — no network calls)
popup.html / popup.js  Extension popup UI, calls detector.js directly
popup.css              Popup styling (rose palette)
detector.js            Shared heuristic detector — the one piece of real logic
demo/                  Standalone static page, same detector.js, deployed to Pages
.github/workflows/     GitHub Pages deploy workflow
```
