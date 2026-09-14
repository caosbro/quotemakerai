module.exports = async function handler(req,res){
  if(req.method!=='GET'&&req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  try{
    const body=req.method==='POST'?(req.body||{}):{};
    const params=req.method==='GET'?req.query:body;
    const area=String(params.area||'').trim();
    const radius=Math.min(50000,Math.max(1000,Number(params.radius)||20000));
    const categories=String(params.categories||'estate_agent').split(',').map(s=>s.trim()).filter(Boolean).slice(0,8);
    if(!area) return res.status(400).json({error:'Enter a town, city or postcode'});
    const geoUrl='https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=gb&q='+encodeURIComponent(area);
    const geo=await fetch(geoUrl,{headers:{'User-Agent':'Evans-Property-Clearance-lead-finder/1.0 contact:evanspropertyclearance@gmail.com','Accept':'application/json'}});
    if(!geo.ok) throw new Error('Location lookup unavailable');
    const places=await geo.json();
    if(!places.length) return res.status(404).json({error:'Could not find that UK area'});
    const lat=Number(places[0].lat),lon=Number(places[0].lon);
    const tagParts={
      estate_agent:'nwr["office"="estate_agent"](around:R,LAT,LON);',
      solicitor:'nwr["office"="lawyer"](around:R,LAT,LON);',
      funeral_director:'nwr["shop"="funeral_directors"](around:R,LAT,LON);',
      property_manager:'nwr["office"="property_management"](around:R,LAT,LON);',
      letting_agent:'nwr["office"="estate_agent"](around:R,LAT,LON);',
      removal_company:'nwr["office"="moving_company"](around:R,LAT,LON);',
      auction_house:'nwr["shop"="auction_house"](around:R,LAT,LON);',
      accountant:'nwr["office"="accountant"](around:R,LAT,LON);'
    };
    const blocks=categories.map(c=>tagParts[c]).filter(Boolean).join('\n');
    if(!blocks) return res.status(400).json({error:'No valid lead categories selected'});
    const query=`[out:json][timeout:25];(${blocks.replaceAll('R',String(radius)).replaceAll('LAT',String(lat)).replaceAll('LON',String(lon))});out center tags;`;
    const overpass=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'text/plain','User-Agent':'Evans-Property-Clearance-lead-finder/1.0'},body:query});
    if(!overpass.ok) throw new Error('Free map search is busy. Please try again in a moment.');
    const data=await overpass.json();
    const wanted=categories;
    const categoryLabel={estate_agent:'Estate agent',solicitor:'Solicitor / legal',funeral_director:'Funeral director',property_manager:'Property management',letting_agent:'Letting agent',removal_company:'Removal company',auction_house:'Auction house',accountant:'Accountant'};
    const results=[]; const seen=new Set();
    for(const el of (data.elements||[])){
      const t=el.tags||{}; const name=t.name||t['name:en']; if(!name) continue;
      const key=(name+'|'+(t['addr:street']||'')+'|'+(t.phone||t['contact:phone']||'')).toLowerCase(); if(seen.has(key)) continue; seen.add(key);
      const hay=(name+' '+Object.values(t).join(' ')).toLowerCase();
      let cat=wanted.find(c=>c==='estate_agent'&&t.office==='estate_agent')||wanted.find(c=>c==='solicitor'&&t.office==='lawyer')||wanted.find(c=>c==='funeral_director'&&t.shop==='funeral_directors')||wanted.find(c=>c==='property_manager'&&t.office==='property_management')||wanted.find(c=>c==='removal_company'&&t.office==='moving_company')||wanted.find(c=>c==='auction_house'&&t.shop==='auction_house')||wanted.find(c=>c==='accountant'&&t.office==='accountant')||'estate_agent';
      if(wanted.includes('letting_agent')&&t.office==='estate_agent'&&/letting|rental|landlord|property/i.test(hay)) cat='letting_agent';
      let score=50; if(/probate|estate planning|wills|wills & probate|deceased|executors/i.test(hay)) score+=35; if(/property|estate|letting|rental|auction|funeral/i.test(hay)) score+=10; if(t.phone||t['contact:phone']) score+=3; if(t.website||t['contact:website']) score+=2;
      const street=t['addr:street']||'', locality=t['addr:city']||t['addr:town']||t['addr:suburb']||'', postcode=t['addr:postcode']||'';
      const address=[t['addr:housenumber'],street,locality,postcode].filter(Boolean).join(', ');
      results.push({id:'osm-'+el.type+'-'+el.id,name,category:categoryLabel[cat]||'Local business',phone:t.phone||t['contact:phone']||'',email:t.email||t['contact:email']||'',website:t.website||t['contact:website']||'',address,lat:el.lat??el.center?.lat??lat,lon:el.lon??el.center?.lon??lon,score,source:'OpenStreetMap'});
    }
    results.sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
    return res.status(200).json({area,center:{lat,lon},count:results.length,leads:results.slice(0,100)});
  }catch(e){return res.status(500).json({error:e?.message||'Lead search failed'});}
}
