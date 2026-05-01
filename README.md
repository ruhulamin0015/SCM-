# SmartChain AI - Deployment Guide

## 🚀 Live Deployment (Netlify)

This application is ready to be deployed to Netlify as a high-performance SPA.

### 1. Build Configuration
The project uses the following settings (already configured in `netlify.toml`):
- **Build Command:** `npm run build`
- **Publish Directory:** `dist`

### 2. Environment Variables
You MUST add the following keys to your Netlify environment variables:
- `GEMINI_API_KEY`: Your Google AI Studio API key (for demand forecasting and Document AI).

### 3. Firebase Setup (CRITICAL)
For Google Login to work on your live URL:
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project: `gen-lang-client-0567822539`.
3. Navigate to **Authentication** > **Settings** > **Authorized Domains**.
4. Add your Netlify domain (e.g., `your-app-name.netlify.app`).

## 🧠 Features
- **AI Forecasting:** Predicts future demand using Gemini-3-Flash.
- **Document AI:** Upload PDFs/Excel to analyze price deltas against history.
- **Real-time Inventory:** Live synchronization via Firestore.
- **Sophisticated Dark UI:** Custom "Enterprise" aesthetic for professional supply chain management.
