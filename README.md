# TerraRotate AI — TerraVyn

**NASA Space Apps Challenge 2026**  
**Selected challenge:** Field Shift: Adapting Farms with NASA Data  
**Team:** TerraVyn  
**Team member:** Sumitra Mahalingam

A Next.js decision-support prototype for exploring crop rotation choices using NASA POWER historical weather observations, farmer-entered field information, preliminary crop traits, and farmer priorities.

## Live demo workflow

1. **Farm setup:** Select location, existing crop rotation, soil texture, water access, season, and main farming goal.
2. **Analyze My Farm:** Start a three-strategy comparison; NASA POWER is loaded separately in the background.
3. **Rotation simulator:** Compare the entered baseline with two alternative rotations; adjust preference weights.
4. **Decision report:** View the three options, scores, evidence, known risks, missing data, and download JSON.
5. **Earth intelligence:** Explore historical rainfall and heat observations where NASA POWER is available.

**Scientific limitation:** Scores are heuristic and crop-trait inputs are illustrative. The application does not predict yields or establish measured water savings. NASA POWER provides gridded climate estimates, not field-level soil measurements. The tool supports—not replaces—farmer judgment and local agronomy expertise.

## Deploy on Vercel from GitHub

This repository is **Next.js**, not a Python Streamlit project. Keep the `package.json` file at the repository root.

1. Create a **new GitHub repository**, e.g., `terrarotate-vercel`, and upload **all files and folders from this ZIP**, not the enclosing folder itself.
2. At https://vercel.com/new, import the new repository.
3. Set **Framework Preset: Next.js** and **Root Directory: `./`** (assuming `package.json` is in the root).
4. Leave build/install commands at their defaults; deploy.
5. The climate API route requests NASA POWER over HTTPS. It does not use a paid API key. If the service is unavailable, the site labels synthetic chart data and does not apply a climate score adjustment.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000. `npm run build` checks the production build.

## API

`GET /api/climate?lat=12.9165&lon=79.1325` requests NASA POWER daily T2M, T2M_MAX and PRECTOTCORR for the 2020–2025 completed-year baseline and requests available 2026 observations separately, returning historic averages plus a clearly labeled year-to-date snapshot.

## Sources

NASA POWER: https://power.larc.nasa.gov/docs/services/api/temporal/daily/

## Current-season data treatment

Completed calendar years (2020–2025) are the historical reference. The app separately requests 2026 observations up to approximately seven days before the present date, reports the most recent valid observation date, and never equates 2026 year-to-date rainfall with a completed annual total. When current-year observations are unavailable, the app explicitly says so without substituting fabricated data.


## Farmer voice assistant (browser-based)
Use the floating **Ask TerraVyn · Voice** button to ask English or Tamil questions and listen to the answers. The question/answer engine is transparent rule-based text grounded in the selected farm profile and scenario scores, **not an LLM or a remote chatbot**. Browser SpeechRecognition and speechSynthesis are used where available; Chrome is a good first test, and some platforms do not offer a Tamil recognition or speech voice. Text entry remains available. Depending on the browser, speech recognition may use browser-provider speech processing.

## Additional NASA resources
- **NASA POWER:** live numerical rainfall/temperature integration, used as climate context.
- **MODIS Terra NDVI via NASA GIBS:** experimental map image for the selected coordinates and date. The image is a regional visual overlay only; numerical NDVI is **not** extracted or used for crop ranking. Some dates/locations may not return a layer.
- **GPM IMERG precipitation**, **SMAP soil moisture**, **Landsat vegetation:** linked official sources for exploration; **not yet processed into ranking features**.

Always distinguish satellite imagery, regional grids, and ground measurements. Scores remain preliminary crop-trait heuristics and require local agronomic validation.
