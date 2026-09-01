module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { image, images: bodyImages, apiKey: bodyApiKey } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY || (typeof bodyApiKey === 'string' ? bodyApiKey.trim() : '');
    if (!apiKey) return res.status(500).json({ error: 'AI service is not configured. Open AI Setup and enter your Gemini API key.' });
    const images = Array.isArray(bodyImages) && bodyImages.length ? bodyImages : (image ? [image] : []);
    if (!images.length || images.length > 6) return res.status(400).json({ error: 'Please provide between 1 and 6 photos.' });
    for (const item of images) {
      if (typeof item !== 'string' || !/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(item)) return res.status(400).json({ error: 'One of the photos could not be prepared. Please try again.' });
      if (item.length > 4_000_000) return res.status(413).json({ error: 'One of the photos is too large. Please choose smaller photos.' });
    }
    const parts = [{ text: `You are estimating waste for a UK house-clearance company. Inspect ALL supplied iPhone photos together as different views of the same property/job. Combine the evidence and do not double-count the same rubbish appearing in multiple photos. Be conservative. Photos may be wide, close-up, poorly framed, distant, mixed, or partly obscured. Never refuse because a photo is imperfect. If little or no waste is visible, return zero quantities with an explanation. Never say that a valid rubbish photo is required.
Return ONLY valid JSON with exactly these fields:
{"summary":"short description","mixed_tonnes":0,"wood_tonnes":0,"soil_tonnes":0,"rubble_tonnes":0,"mattresses":0,"fridges":0,"confidence":"low|medium|high","notes":"brief assumptions"}
Use tonnes to one decimal place for bulk categories and whole numbers for mattresses/fridges. If a category is not visible, return 0. Do not invent hidden rubbish. Do not calculate a price or disposal cost.` }];
    for (const imageData of images) {
      const match = imageData.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i);
      const mimeType = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
      parts.push({ inline_data: { mime_type: mimeType, data: match[2] } });
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    let response;
    try {
      response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent', {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({ contents: [{ parts }], generationConfig: { maxOutputTokens: 500, responseMimeType: 'application/json' } })
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
    if (error?.name === 'AbortError') return res.status(504).json({ error: 'The AI service took too long to respond. Please try the photos again.' });
    console.error('analyse-gemini-multi-photo error:', error);
    return res.status(500).json({ error: error?.message || 'Unable to analyse photos.' });
  }
};
