module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { image, apiKey: bodyApiKey } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY || (typeof bodyApiKey === 'string' ? bodyApiKey.trim() : '');
    if (!apiKey) return res.status(500).json({ error: 'AI service is not configured. Open AI Setup and enter your Gemini API key for this browser session.' });
    if (!image || typeof image !== 'string' || !/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(image)) {
      return res.status(400).json({ error: 'A valid rubbish photo is required.' });
    }
    if (image.length > 6_000_000) return res.status(413).json({ error: 'Photo is too large. Please take/upload a smaller photo.' });

    const match = image.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i);
    const mimeType = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
    const base64Data = match[2];
    const instructions = `You are the photo-estimation assistant for Evans Property Clearance in the UK.
Inspect the rubbish photo carefully. Only identify items that are reasonably visible. Estimate the quantity/weight that a professional house-clearance and waste-removal company would need to remove.
Return ONLY valid JSON with exactly these fields:
{"summary":"short description","mixed_tonnes":0,"wood_tonnes":0,"soil_tonnes":0,"rubble_tonnes":0,"mattresses":0,"fridges":0,"confidence":"low|medium|high","notes":"brief assumptions"}
Use tonnes to one decimal place for bulk categories and whole numbers for mattresses/fridges. If a category is not visible, return 0. Do not invent hidden rubbish. Be conservative if unclear. Do not calculate a price.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    let response;
    try {
      response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: base64Data } },
              { text: instructions }
            ]
          }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 500, responseMimeType: 'application/json' }
        })
      });
    } finally { clearTimeout(timeout); }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const msg = data?.error?.message || `Gemini returned ${response.status}.`;
      return res.status(502).json({ error: msg });
    }
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(502).json({ error: 'AI returned no usable rubbish estimate.' });
    let result;
    try { result = JSON.parse(jsonMatch[0]); }
    catch { return res.status(502).json({ error: 'AI returned invalid estimate data.' }); }
    return res.status(200).json(result);
  } catch (error) {
    if (error?.name === 'AbortError') return res.status(504).json({ error: 'The AI service took too long to respond. Please try the photo again.' });
    console.error('analyse-gemini error:', error);
    return res.status(500).json({ error: error?.message || 'Unable to analyse photo.' });
  }
};
