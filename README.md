<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1_aNlEKNlZcK8m-Tc-Dij4Z2Sim8VRiy1

## Run Locally

**Prerequisites:**  Node.js

**Development requirements:**
- Node >= 16
- TypeScript ~5.3.0 (see note below)

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

> Note: This repository pins TypeScript to `~5.3.0` to remain compatible with the project ESLint tooling (see PRs #2 and #3 for context).