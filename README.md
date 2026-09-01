# Evans Property Clearance – AI Estimate (Gemini Free Tier)

Vercel-ready static app with a Node.js Serverless Function at `/api/analyse`.

## AI provider
The AI rubbish-photo estimator now uses Google Gemini instead of OpenAI. Gemini provides a free tier for eligible models, including free input/output token pricing on supported models. See Google’s current pricing for limits and availability.

## Setup
1. Deploy this ZIP to Vercel.
2. If you do not want to use Vercel Environment Variables, open **AI RUBBISH ESTIMATE** in the app and enter a Gemini API key when prompted.
3. The key is kept only in the current browser session and sent over HTTPS to the server function.

For a more secure permanent setup, Vercel Environment Variables can use `GEMINI_API_KEY`. Do not put the key into the website files or a public repository.

## AI estimate
The app compresses the rubbish photo and sends it to Gemini for image understanding. Gemini returns visible waste categories and estimated quantities; the browser then calculates the customer quote using Evans Property Clearance’s existing pricing rules.

## AI V2 live check
After deployment, open `/api/ai-estimate-v2` in a browser. A working deployment should return JSON containing `"version":"EPC-AI-V2-20260903"`. This is a GET health check; the quote maker uses POST for the actual image analysis.
