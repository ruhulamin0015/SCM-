# SmartChain AI - Deployment Guide

## 🚀 Live Deployment (Netlify & Vercel)

This application is optimized for deployment as a high-performance Single Page Application (SPA).

### ⚡ Vercel Deployment
1. Import this repository into **Vercel**.
2. **Framework Preset:** Vite (automatically detected).
3. **Build Command:** `npm run build`
4. **Output Directory:** `dist`
5. **Environment Variables:** Add `GEMINI_API_KEY` (Your Google AI Studio API key).

### 🌍 Netlify Deployment
The project includes a `netlify.toml` with the following:
- **Build Command:** `npm run build`
- **Publish Directory:** `dist`

### 🔑 Environment Variables
You MUST add the following key to your deployment platform:
- `GEMINI_API_KEY`: Required for Demand Forecasting and Document AI analysis.

### 🛡️ Firebase Security & Auth (CRITICAL)
For Google Login to work on your live URL:
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project: `gen-lang-client-0567822539`.
3. Navigate to **Authentication** > **Settings** > **Authorized Domains**.
4. Add your deployment domain (e.g., `your-app.vercel.app` or `your-app.netlify.app`).

## 🧠 Features
- **AI Forecasting:** Predicts future demand using Gemini-3-Flash.
- **Document AI:** Upload PDFs/Excel to analyze price deltas against history.
- **Real-time Inventory:** Live synchronization via Firestore.
- **Sophisticated Dark UI:** Custom "Enterprise" aesthetic for professional supply chain management.
