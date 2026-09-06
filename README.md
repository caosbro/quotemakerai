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

## Customer quote links and Vercel login
The customer page is a separate public file at `/customer.html`. The quote-maker app creates links in the form `https://YOUR-DOMAIN/customer.html#quote=...`.

If Vercel asks customers to log in, that is Vercel Project/Deployment Protection, not the customer page code. Vercel Authentication/SSO or password protection must be disabled for the deployment that serves `customer.html`. Do not use a protected preview URL for customer links; use the public production domain.

Once the production deployment is public, customers can open `/customer.html#quote=...` without a Vercel account or login.
