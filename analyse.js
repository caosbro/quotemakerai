module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image, apiKey: bodyApiKey } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY || (typeof bodyApiKey === 'string' ? bodyApiKey.trim() : '');
    if (!apiKey) return res.status(500).json({ error: 'AI service is not configured. Open AI Setup and enter your Gemini API key.' });
    if (!image || typeof image !== 'string' || !/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(image)) {
      return res.status(400).json({ error: 'The photo could not be prepared. Please try taking the photo again.' });
    }
    if (image.length > 6_000_000) return res.status(413).json({ error: 'Photo is too large. Please try a smaller photo.' });

    const match = image.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i);
    const mimeType = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
    const data = match[2];
    const instructions = `You are estimating waste for a UK house-clearance company. Inspect this single ordinary iPhone photo carefully. It may be wide, close-up, poorly framed, distant, mixed, or partly obscured. Identify visible waste and make a conservative estimate. Never refuse because the photo is imperfect. If little or no waste is visible, return zero quantities with an explanation. Never say that a valid rubbish photo is required.
Return ONLY valid JSON with exactly these fields:
{"summary":"short description","mixed_tonnes":0,"wood_tonnes":0,"soil_tonnes":0,"rubble_tonnes":0,"mattresses":0,"fridges":0,"confidence":"low|medium|high","notes":"brief assumptions"}
Use tonnes to one decimal place for bulk categories and whole numbers for mattresses/fridges. If a category is not visible, return 0. Do not invent hidden rubbish. Do not calculate a price.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    let response;
    try {
      response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent', {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: instructions }, { inline_data: { mime_type: mimeType, data } }] }],
          generationConfig: { maxOutputTokens: 500, responseMimeType: 'application/json' }
        })
      });
    } finally { clearTimeout(timeout); }
    const dataResp = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(502).json({ error: dataResp?.error?.message || `Gemini returned ${response.status}.` });
    const text = dataResp?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(502).json({ error: 'AI returned no usable rubbish estimate.' });
    let result;
    try { result = JSON.parse(jsonMatch[0]); } catch { return res.status(502).json({ error: 'AI returned invalid estimate data.' }); }
    return res.status(200).json(result);
  } catch (error) {
    if (error?.name === 'AbortError') return res.status(504).json({ error: 'The AI service took too long to respond. Please try the photo again.' });
    console.error('analyse-gemini-single-photo error:', error);
    return res.status(500).json({ error: error?.message || 'Unable to analyse photo.' });
  }
};
