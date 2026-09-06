export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const type = String(req.query?.type || 'probate solicitors');
    const location = String(req.query?.location || '').trim();
    if (!location) return res.status(400).json({ error: 'Location required' });

    const map = {
      'probate solicitors': 'office="lawyer"',
      'estate agents': 'office="estate_agent"',
      'funeral directors': 'amenity="funeral_hall"',
      'letting agents': 'office="estate_agent"',
      'care homes': 'amenity="social_facility"',
      'property management companies': 'office="property_management"',
      'house clearance referrals': 'office="estate_agent"'
    };
    const tag = map[type] || 'office';

    const geoUrl = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=gb&q=' + encodeURIComponent(location + ', United Kingdom');
    const geoResponse = await fetch(geoUrl, { headers: { 'User-Agent': 'Evans-Clearance-Lead-Finder/1.0' } });
    if (!geoResponse.ok) throw new Error('Geocoding failed');
    const geoData = await geoResponse.json();
    if (!geoData.length) return res.status(404).json({ error: 'Area not found' });

    const lat = Number(geoData[0].lat), lon = Number(geoData[0].lon);
    const query = `[out:json][timeout:25];(nwr[${tag}](around:8000,${lat},${lon}););out center tags;`;
    const endpoints = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter'
    ];
    let data;
    let lastError;
    for (const endpoint of endpoints) {
      try {
        const r = await fetch(endpoint, {
          method: 'POST',
          body: query,
          headers: { 'Content-Type': 'text/plain;charset=UTF-8', 'User-Agent': 'Evans-Clearance-Lead-Finder/1.0' }
        });
        if (!r.ok) throw new Error(`Overpass returned ${r.status}`);
        data = await r.json();
        break;
      } catch (e) { lastError = e; }
    }
    if (!data) throw lastError || new Error('Lead service unavailable');

    return res.status(200).json({
      location: geoData[0].display_name,
      elements: Array.isArray(data.elements) ? data.elements : []
    });
  } catch (error) {
    return res.status(502).json({ error: 'Lead search temporarily unavailable' });
  }
}
