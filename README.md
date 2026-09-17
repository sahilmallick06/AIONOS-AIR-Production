## 🌐 Live Website

**AIONOS AIR — Resolution Control**

[Open the Live Website](https://aionos-air-production.onrender.com)





<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.
https://ai.studio/apps/35e8e8e1-e598-459c-bcca-2558e32ebbf1

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env](.env) to your Gemini API key
3. Run in development:
   `npm run dev`

## Production Deployment

### Standard Production Run
1. Build the frontend and backend bundle:
   ```bash
   npm run build
   ```
2. Start the production server:
   ```bash
   NODE_ENV=production PORT=3000 npm start
   ```
   The production server binds to `0.0.0.0:${PORT}` and serves the Vite frontend bundle from `dist/` alongside all Express `/api` endpoints.

### Docker Deployment
Build and run the container:
```bash
docker build -t aionos-air .
docker run -p 3000:3000 -e GEMINI_API_KEY="your_api_key" aionos-air
```

### Environment Variables
- `PORT`: Server listening port (default: `3000`).
- `GEMINI_API_KEY`: Server-side secret for Google Gemini API integration.
- `GEMINI_MODEL`: Model version to use (default: `gemini-3.5-flash-lite`, with auto-fallback to `gemini-3.1-flash-lite` and `gemini-flash-lite-latest`).
