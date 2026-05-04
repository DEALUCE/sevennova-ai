// POST /api/zoning  { "address": "123 Main St, Los Angeles, CA" }
// Cloudflare Pages Function — no separate server needed

export async function onRequestPost(context) {
  const { request } = context;

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const address = (body.address || '').trim();
  if (!address) return json({ error: 'Address is required' }, 400);

  try {
    // 1. Geocode
    const geo = await geocode(address);
    if (!geo.lat) return json({ error: 'Could not locate address. Try: 904 S Ardmore Ave, Los Angeles, CA 90006' }, 400);

    // 2. Assessor: search → AIN → detail (pass geocoded coords as fallback anchor)
    const ain    = await assessorSearch(address, geo.lat, geo.lng);
    const parcel = ain ? await assessorDetail(ain) : {};

    const lat = parcel.lat || geo.lat;
    const lng = parcel.lng || geo.lng;

    // 3. TOC tier
    const toc = calcTOC(lat, lng);

    // 4. Zoning
    const zoneStr  = parcel.zoning_pdb || '';
    const zoneInfo = parseZone(zoneStr);

    // 5. Opportunity zone
    const zip     = parcel.zip || geo.zip || '';
    const oppZone = LA_OZ_ZIPS.has(zip.split('-')[0]);

    // 6. Development potential
    const dev = calcDevelopment(parcel, toc, zoneInfo);

    // 7. SB9 + ADU
    const sb9 = calcSB9(parcel, zoneInfo, lat, lng);
    const adu = calcADU(parcel, zoneInfo);

    // 8. Grants + live + next steps
    const profile = buildProfile(geo, parcel, toc, zoneInfo, oppZone);
    const { qualified, potential, ineligible } = evaluateGrants(profile);
    const liveGrants = await fetchLiveGrants();
    const nextSteps  = buildNextSteps(profile);

    return json({
      generated:   new Date().toLocaleString('en-US', { month:'long', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' }),
      address:     parcel.site_address || geo.matched_address || address,
      full_address: [parcel.site_address, parcel.city, zip].filter(Boolean).join(', '),
      coordinates: { lat, lng },
      parcel: {
        apn:           parcel.apn || 'Not found',
        ain:           parcel.ain || '',
        use_type:      parcel.use_type || '',
        use_code:      parcel.use_code || '',
        parcel_type:   parcel.parcel_type || '',
        status:        parcel.parcel_status || '',
        year_built:    parcel.year_built || '',
        effective_year: parcel.effective_year || '',
        sqft_building: parcel.sqft_main || 0,
        sqft_lot:      parcel.sqft_lot || 0,
        lot_acres:     parcel.lot_acres || 0,
        lot_dimensions: `${parcel.land_width || 0}' x ${parcel.land_depth || 0}'`,
        lot_corner:    parcel.lot_corner || false,
        bedrooms:      parcel.bedrooms || '',
        bathrooms:     parcel.bathrooms || '',
        num_units:     parcel.num_units || 1,
        cluster:       parcel.cluster_name || '',
        legal_desc:    parcel.legal_desc || '',
        exemption:     parcel.exemption || 'None',
        sewer:         parcel.lot_sewer || false,
      },
      valuation: {
        land_value:        parcel.land_value || 0,
        improvement_value: parcel.imp_value || 0,
        total_assessed:    parcel.total_value || 0,
        tax_status:        parcel.tax_status || '',
        roll_year:         '2025',
        note: 'LA County Assessor assessed values (Prop 13 base; may be below market)',
      },
      zoning: {
        code:               zoneStr || 'N/A',
        description:        zoneInfo.description || '',
        multifamily_eligible: zoneInfo.multifamily || false,
        source:             'LA County Assessor (ZoningPDB)',
      },
      overlays: {
        toc_tier:            toc.tier,
        toc_eligible:        toc.eligible,
        nearest_metro_line:  toc.line || 'N/A',
        nearest_metro_station: toc.station || 'N/A',
        distance_to_metro:   toc.eligible ? `${toc.dist} miles` : 'Not within TOC radius',
        opportunity_zone:    oppZone,
        low_income_area:     oppZone,
        ab2097_zero_parking: toc.eligible,
      },
      development_potential: dev,
      sb9: sb9,
      adu: adu,
      grants: {
        qualified:    qualified.map(grantToObj),
        potential:    potential.map(grantToObj),
        not_eligible: ineligible.map(grantToObj),
        live:         liveGrants,
        summary: { total_qualified: qualified.length, total_potential: potential.length, total_ineligible: ineligible.length, live_count: liveGrants.length },
      },
      next_steps: nextSteps,
      data_sources: [
        'US Census Bureau Geocoder (free)',
        'LA County Assessor Portal',
        'LA Metro station proximity (TOC - 100+ stations)',
        'HUD Opportunity Zone registry (zip screen)',
        'Grants.gov live API',
        'CA SB 9 eligibility rules',
        'LA ADU ordinance',
      ],
    });
  } catch (e) {
    return json({ error: `Server error: ${e.message}` }, 500);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// ── Geocode (Census Bureau) ───────────────────────────────────────────────────

async function geocode(address) {
  try {
    const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(address)}&benchmark=2020&format=json`;
    const r   = await fetch(url, { signal: AbortSignal.timeout(12000) });
    const d   = await r.json();
    const m   = d?.result?.addressMatches?.[0];
    if (!m) return {};
    const ac = m.addressComponents || {};
    return {
      matched_address: m.matchedAddress || address,
      lat:   parseFloat(m.coordinates.y),
      lng:   parseFloat(m.coordinates.x),
      city:  ac.city || '',
      zip:   ac.zip  || '',
      state: ac.state || 'CA',
    };
  } catch { return {}; }
}

// ── LA County Assessor ────────────────────────────────────────────────────────

async function assessorSearch(address, geoLat, geoLng) {
  try {
    const cleaned  = address.replace(/\b(apt|unit|#|ste|suite)\s*\w+/gi, '').replace(/\s+/g,' ').trim();
    const withCity = /los angeles|LA\b|CA\b/i.test(cleaned) ? cleaned : `${cleaned}, Los Angeles, CA`;
    const zip      = (address.match(/\b(\d{5})\b/) || [])[1] || '';

    // Run two searches in parallel: full address + adjacent number (num+2) fallback
    const numMatch  = cleaned.match(/^(\d+)\s+/);
    const streetNum = numMatch ? parseInt(numMatch[1]) : 0;
    const streetBody = cleaned.replace(/^\d+\s*/,'').replace(/,.*$/,'').trim();
    const adjAddr   = streetNum ? `${streetNum + 2} ${streetBody}, Los Angeles, CA` : '';

    const [r1, r2] = await Promise.all([
      fetch(`https://portal.assessor.lacounty.gov/api/search?search=${encodeURIComponent(withCity)}`, { headers:{'User-Agent':'Mozilla/5.0'}, signal:AbortSignal.timeout(10000) }).then(r=>r.json()).catch(()=>({})),
      adjAddr && adjAddr !== withCity
        ? fetch(`https://portal.assessor.lacounty.gov/api/search?search=${encodeURIComponent(adjAddr)}`, { headers:{'User-Agent':'Mozilla/5.0'}, signal:AbortSignal.timeout(10000) }).then(r=>r.json()).catch(()=>({}))
        : Promise.resolve({}),
    ]);

    // Merge results, deduplicate by AIN
    const seen = new Set();
    const all  = [];
    for (const p of [...(r1?.Parcels||[]), ...(r2?.Parcels||[])]) {
      if (!seen.has(p.AIN)) { seen.add(p.AIN); all.push(p); }
    }
    if (!all.length) return '';

    const best = bestParcelMatch(address, all);
    if (best) return best.AIN;

    // Last resort: pick the non-unit parcel with zip match + best street name overlap
    const clean = all.filter(p => !/\bNO\s+\d+|\bUNIT\s+\d+|\bAPT\s+\d+/.test((p.SitusStreet||'').toUpperCase()));
    const zipMatch = clean.filter(p => zip && (p.SitusZipCode||'').startsWith(zip));
    const pool = zipMatch.length ? zipMatch : clean;
    return pool[0]?.AIN || all[0]?.AIN || '';
  } catch { return ''; }
}

function bestParcelMatch(input, parcels) {
  const norm = s => s.toUpperCase()
    .replace(/\b(AVENUE|AVE|STREET|STR|BLVD|BOULEVARD|ROAD|RD|DRIVE|DR|LANE|LN|WAY|COURT|CT|PLACE|PL|TERRACE|TER|HWY|FWY)\b/g, '')
    .replace(/[^A-Z0-9\s]/g, '').replace(/\s+/g,' ').trim();
  const numOf = s => s.match(/^\d+/)?.[0] || '';

  // Use only the street part (before comma) for word matching — prevents
  // city name words like "LOS", "ANGELES" from matching "LOS ANGELES ST"
  const streetPart = input.replace(/,.*$/, '').trim();
  const inNorm   = norm(streetPart);
  const inNum    = numOf(inNorm);
  const inWords  = inNorm.split(/\s+/).filter(w => w && w !== inNum);
  const zipMatch = (input.match(/\b(\d{5})\b/) || [])[1] || '';
  // Detect if input has explicit unit — "Apt", "#", "Unit", "Suite"
  const hasUnit  = /\b(apt|unit|#|ste|suite|no)\b/i.test(input);

  let best = null, bestScore = -1;
  for (const p of parcels) {
    const raw   = (p.SitusStreet || '').toUpperCase();
    const situs = norm(raw);
    const situsNum = numOf(situs);
    const situsWords = situs.split(/\s+/).filter(w => w && w !== situsNum);

    // Skip unit-number parcels (e.g. "746 S LOS ANGELES ST, NO 904")
    // unless the input itself includes a unit indicator
    if (!hasUnit && /\bNO\s+\d+|\bAPT\s+\d+|\bUNIT\s+\d+/.test(raw)) continue;

    let score = 0;
    if (situsNum && situsNum === inNum) score += 25;
    for (const w of inWords) {
      if (situsWords.includes(w)) score += 20;   // word match weighted higher than number match
    }
    // Bonus: zip code match
    if (zipMatch && (p.SitusZipCode || '').startsWith(zipMatch)) score += 15;
    if (score > bestScore) { bestScore = score; best = p; }
  }
  return best;
}

async function assessorDetail(ain) {
  try {
    const url = `https://portal.assessor.lacounty.gov/api/parceldetail?ain=${ain}`;
    const r   = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }, signal: AbortSignal.timeout(10000) });
    const d   = await r.json();
    const p   = d?.Parcel || {};
    if (!p.AIN) return {};

    const ain_ = p.AIN;
    const apn  = ain_.length >= 10 ? `${ain_.slice(0,4)}-${ain_.slice(4,7)}-${ain_.slice(7)}` : ain_;
    const lv   = parseInt(p.CurrentRoll_LandValue || 0);
    const iv   = parseInt(p.CurrentRoll_ImpValue  || 0);

    return {
      ain, apn,
      lat:           parseFloat(p.Latitude  || 0),
      lng:           parseFloat(p.Longitude || 0),
      site_address:  p.SitusStreet || '',
      city:          p.SitusCity   || '',
      zip:           (p.SitusZipCode || '').split('-')[0],
      use_type:      p.UseType     || '',
      use_code:      p.UseCode     || '',
      parcel_type:   p.ParcelType  || '',
      parcel_status: p.ParcelStatus || '',
      zoning_pdb:    (p.ZoningPDB  || '').trim(),
      year_built:    p.YearBuilt   || '',
      effective_year: p.EffectiveYear || '',
      sqft_main:     parseInt(p.SqftMain     || 0),
      sqft_lot:      parseInt(p.SqftLot      || 0),
      lot_acres:     Math.round(parseInt(p.SqftLot || 0) / 43560 * 1000) / 1000,
      land_width:    parseInt(p.LandWidth    || 0),
      land_depth:    parseInt(p.LandDepth    || 0),
      num_units:     parseInt(p.NumOfUnits   || 0),
      bedrooms:      parseInt(p.NumOfBeds    || 0),
      bathrooms:     parseInt(p.NumOfBaths   || 0),
      land_value:    lv,
      imp_value:     iv,
      total_value:   lv + iv,
      tax_status:    p.TaxStatus     || '',
      cluster_name:  p.ClusterName   || '',
      legal_desc:    p.LegalDescription || '',
      exemption:     p.Exemption     || 'None',
      lot_sewer:     p.LotSewer === 'Y',
      lot_corner:    p.LotCorner === 'Y',
    };
  } catch { return {}; }
}

// ── TOC (Metro station proximity) ─────────────────────────────────────────────
// Full LA Metro system: Red, Purple, Blue, Expo, Green, Gold/L, Crenshaw/K, Orange BRT, Silver BRT
// Format: [lat, lng, line_name, toc_tier, station_name]

const METRO_STATIONS = [
  // Red Line (B Line)
  [34.0481,-118.2582,'B (Red)','Union Station',4],
  [34.0535,-118.2443,'B (Red)','Pershing Square',4],
  [34.0484,-118.2585,'B (Red)','Civic Center/Grand Park',4],
  [34.0594,-118.2781,'B (Red)','7th St/Metro Center',4],
  [34.0535,-118.2969,'B (Red)','Westlake/MacArthur Park',4],
  [34.0594,-118.3076,'B (Red)','Wilshire/Vermont',4],
  [34.0661,-118.3079,'B (Red)','Vermont/Beverly',3],
  [34.0765,-118.3079,'B (Red)','Vermont/Santa Monica',3],
  [34.0981,-118.3290,'B (Red)','Hollywood/Vine',3],
  [34.1023,-118.3378,'B (Red)','Hollywood/Highland',3],
  [34.1138,-118.3521,'B (Red)','Hollywood/Cahuenga',3],
  [34.1342,-118.3516,'B (Red)','Universal City/Studio City',2],
  [34.1671,-118.3762,'B (Red)','North Hollywood',2],

  // Purple Line (D Line)
  [34.0490,-118.2533,'D (Purple)','Pershing Square',4],
  [34.0490,-118.2597,'D (Purple)','7th St/Metro Center',4],
  [34.0536,-118.2724,'D (Purple)','Westlake/MacArthur Park',4],
  [34.0591,-118.2921,'D (Purple)','Wilshire/Vermont',4],
  [34.0580,-118.3028,'D (Purple)','Wilshire/Normandie',4],
  [34.0583,-118.3138,'D (Purple)','Wilshire/Western',4],
  [34.0558,-118.3376,'D (Purple)','Wilshire/Crenshaw',4],
  [34.0530,-118.3524,'D (Purple)','Wilshire/La Brea',4],
  // Purple Line Extension (Phase 2 - opened 2025)
  [34.0530,-118.3863,'D (Purple)','Wilshire/Fairfax',4],
  [34.0530,-118.4021,'D (Purple)','Wilshire/La Cienega',4],
  [34.0657,-118.4168,'D (Purple)','Wilshire/Rodeo',4],
  // Phase 3 (under construction - future TOC eligibility planning)
  // [34.0601,-118.4233,'D (Purple)','Century City/Constellation',4],
  // [34.0530,-118.4452,'D (Purple)','Westwood/UCLA',4],

  // Blue Line (A Line)
  [34.0481,-118.2582,'A (Blue)','Union Station',4],
  [34.0535,-118.2443,'A (Blue)','7th St/Metro Center',4],
  [34.0432,-118.2673,'A (Blue)','Grand/LATTC',3],
  [34.0301,-118.2673,'A (Blue)','San Pedro St',3],
  [34.0213,-118.2673,'A (Blue)','Washington',3],
  [34.0113,-118.2673,'A (Blue)','Vernon',2],
  [33.9993,-118.2673,'A (Blue)','Slauson',2],
  [33.9874,-118.2673,'A (Blue)','Florence',2],
  [33.9741,-118.2673,'A (Blue)','Firestone',2],
  [33.9652,-118.2673,'A (Blue)','103rd St/Watts Towers',2],
  [33.9527,-118.2497,'A (Blue)','Willowbrook/Rosa Parks',2],
  [33.9387,-118.2497,'A (Blue)','Long Beach Bl',2],
  [33.9185,-118.2226,'A (Blue)','Compton',2],
  [33.9065,-118.2128,'A (Blue)','Artesia',2],
  [33.8750,-118.1937,'A (Blue)','Del Amo',2],
  [33.8449,-118.1937,'A (Blue)','Wardlow',2],
  [33.8200,-118.1937,'A (Blue)','Willow',2],
  [33.8038,-118.1937,'A (Blue)','Pacific Coast Hwy',2],
  [33.7920,-118.1913,'A (Blue)','Anaheim St',2],
  [33.7726,-118.1937,'A (Blue)','5th St',2],
  [33.7676,-118.1937,'A (Blue)','1st St',2],
  [33.7660,-118.1892,'A (Blue)','Downtown Long Beach',2],

  // Expo Line (E Line)
  [34.0535,-118.2443,'E (Expo)','7th St/Metro Center',4],
  [34.0432,-118.2673,'E (Expo)','Grand/LATTC',4],
  [34.0301,-118.2673,'E (Expo)','23rd St',3],
  [34.0213,-118.3074,'E (Expo)','Expo/Vermont',3],
  [34.0213,-118.3350,'E (Expo)','Expo/Western',3],
  [34.0213,-118.3585,'E (Expo)','Expo/Crenshaw',3],
  [34.0213,-118.3827,'E (Expo)','Expo/La Brea',3],
  [34.0253,-118.3469,'E (Expo)','Farmdale',3],
  [34.0172,-118.2892,'E (Expo)','Jefferson/USC',3],
  [34.0213,-118.4096,'E (Expo)','Palms',3],
  [34.0209,-118.3970,'E (Expo)','Culver City',3],
  [34.0141,-118.4260,'E (Expo)','Westwood/Rancho Park',3],
  [34.0085,-118.4536,'E (Expo)','Sepulveda',3],
  [34.0117,-118.4929,'E (Expo)','Bundy',3],
  [34.0152,-118.4993,'E (Expo)','26th St/Bergamot',2],
  [34.0153,-118.5068,'E (Expo)','17th St/SMC',2],
  [34.0175,-118.5146,'E (Expo)','Downtown Santa Monica',2],

  // Green Line (C Line)
  [33.9167,-118.2004,'C (Green)','Norwalk',2],
  [33.9167,-118.2297,'C (Green)','Lakewood',2],
  [33.9167,-118.2593,'C (Green)','Bellflower',2],
  [33.9167,-118.2888,'C (Green)','Long Beach Bl',2],
  [33.9167,-118.3117,'C (Green)','Avalon',2],
  [33.9167,-118.3340,'C (Green)','Harbor Freeway',2],
  [33.9167,-118.3540,'C (Green)','Hawthorne/Lennox',2],
  [33.9202,-118.3740,'C (Green)','El Segundo',2],
  [33.9202,-118.3917,'C (Green)','Douglas',2],
  [33.9167,-118.4064,'C (Green)','Mariposa',2],
  [33.9254,-118.4059,'C (Green)','Nash/Douglas',2],
  [33.9254,-118.3800,'C (Green)','Aviation/LAX',2],
  [33.9527,-118.2497,'C (Green)','Willowbrook/Rosa Parks',2],
  [33.9352,-118.2497,'C (Green)','Dominguez',2],

  // Gold Line / L Line (Eastside + Pasadena)
  [34.0481,-118.2582,'L (Gold)','Union Station',4],
  [34.0498,-118.2387,'L (Gold)','Little Tokyo/Arts District',4],
  [34.0519,-118.2187,'L (Gold)','Pico/Aliso',3],
  [34.0455,-118.1973,'L (Gold)','Indiana',3],
  [34.0328,-118.1849,'L (Gold)','Maravilla',3],
  [34.0258,-118.1700,'L (Gold)','East LA Civic Center',2],
  [34.0188,-118.1614,'L (Gold)','Atlantic',2],
  [34.0188,-118.1484,'L (Gold)','Pomona/Atlantic',2],
  [34.0188,-118.1232,'L (Gold)','Pomona',2],
  [34.0660,-118.1964,'L (Gold)','South Pasadena',2],
  [34.0781,-118.1536,'L (Gold)','Highland Park',2],
  [34.0938,-118.1277,'L (Gold)','Mission',2],
  [34.1023,-118.1104,'L (Gold)','Lake',2],
  [34.1253,-118.1024,'L (Gold)','Memorial Park',2],
  [34.1477,-118.1030,'L (Gold)','Del Mar',2],
  [34.1542,-118.1220,'L (Gold)','Fillmore',2],
  [34.1542,-118.1377,'L (Gold)','Sierra Madre Villa',2],
  [34.1619,-118.1519,'L (Gold)','Arcadia',2],
  [34.0660,-118.2290,'L (Gold)','Chinatown',3],

  // Crenshaw/LAX Line (K Line)
  [34.0113,-118.3395,'K (Crenshaw)','Expo/Crenshaw',3],
  [34.0007,-118.3395,'K (Crenshaw)','Leimert Park',3],
  [33.9874,-118.3395,'K (Crenshaw)','Hyde Park',2],
  [33.9741,-118.3395,'K (Crenshaw)','Fairview Heights',2],
  [33.9652,-118.3395,'K (Crenshaw)','West Angeles Cathedral',2],
  [33.9527,-118.3395,'K (Crenshaw)','Crenshaw/LAX Transit Hub',2],
  [33.9387,-118.3750,'K (Crenshaw)','Aviation/Century',2],
  [33.9254,-118.3750,'K (Crenshaw)','Aviation/LAX',2],
  [33.9202,-118.3917,'K (Crenshaw)','96th St/Manchester',2],
  [33.9254,-118.4059,'K (Crenshaw)','Westchester/Veterans',2],
  [33.9167,-118.4064,'K (Crenshaw)','APM Connection',2],

  // Orange Line BRT (G Line) - Van Nuys
  [34.1671,-118.3762,'G (Orange)','North Hollywood',2],
  [34.1698,-118.3955,'G (Orange)','Laurel Canyon',2],
  [34.1698,-118.4132,'G (Orange)','Valley College',2],
  [34.1748,-118.4418,'G (Orange)','Woodman',2],
  [34.1748,-118.4653,'G (Orange)','Van Nuys',2],
  [34.1748,-118.4902,'G (Orange)','Sepulveda',2],
  [34.1748,-118.5101,'G (Orange)','Balboa',2],
  [34.1748,-118.5359,'G (Orange)','Tampa',2],
  [34.1748,-118.5600,'G (Orange)','Pierce College',2],
  [34.1748,-118.5876,'G (Orange)','De Soto',2],
  [34.1748,-118.6002,'G (Orange)','Canoga',2],
  [34.1748,-118.6184,'G (Orange)','Sherman Way',2],

  // Silver Line BRT
  [34.0481,-118.2582,'Silver','Union Station',3],
  [34.0244,-118.2133,'Silver','Cal State LA',2],
  [34.0244,-118.1850,'Silver','El Monte',2],
];

const TOC_RADII = { 4:0.25, 3:0.33, 2:0.5, 1:0.75 };

function haversine(lat1,lng1,lat2,lng2) {
  const R=3958.8, dl=rad(lat2-lat1), dg=rad(lng2-lng1);
  const a=Math.sin(dl/2)**2 + Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dg/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function rad(d){ return d*Math.PI/180; }

function calcTOC(lat, lng) {
  let bestTier=0, bestDist=9999, bestLine='', bestStation='';
  for (const [slat,slng,line,station,tier] of METRO_STATIONS) {
    const dist   = haversine(lat,lng,slat,slng);
    const radius = TOC_RADII[tier] || 0.5;
    if (dist <= radius && (tier > bestTier || (tier === bestTier && dist < bestDist))) {
      bestTier=tier; bestDist=dist; bestLine=line; bestStation=station;
    }
  }
  return { tier:bestTier, eligible:bestTier>0, line:bestLine, station:bestStation, dist:Math.round(bestDist*100)/100 };
}

// ── Zone parser ───────────────────────────────────────────────────────────────

const ZONE_PATTERNS = [
  [/R5/,    'High-Density Multifamily (R5)',      true,  0.125],
  [/R4/,    'High-Density Multifamily (R4)',      true,  0.200],
  [/R3/,    'Medium-Density Multifamily (R3)',    true,  0.333],
  [/R2/,    'Two-Family Residential (R2)',        true,  0.500],
  [/RD/,    'Restricted Density Residential',    true,  0.333],
  [/RAS/,   'Residential Accessory Services',    true,  0.333],
  [/RAP/,   'Restricted Apt Parking',            true,  0.333],
  [/RA-?1/, 'Suburban (RA-1)',                   false, 2.000],
  [/RE/,    'Residential Estate',                false, 1.000],
  [/RS/,    'Suburban Residential',              false, 1.000],
  [/R1/,    'Single Family Residential (R1)',    false, 1.000],
  [/A1|A2/, 'Agricultural / Rural',             false, 2.000],
  [/C[12]/, 'Neighborhood Commercial',          false, 0.500],
  [/C[24]/, 'Commercial/Mixed-Use',             false, 0.333],
  [/C5/,    'Commercial (C5)',                  false, 0.333],
  [/CM/,    'Commercial Manufacturing',         false, 0.333],
  [/CR/,    'Commercial Recreation',            false, 0.333],
  [/MR1/,   'Light Industrial (MR1)',           false, 0.500],
  [/M1/,    'Limited Manufacturing (M1)',       false, 0.500],
  [/M2/,    'Light Industrial (M2)',            false, 0.500],
  [/M3/,    'Heavy Industrial (M3)',            false, 0.500],
  [/P/,     'Parking',                          false, 1.000],
  [/OS/,    'Open Space',                       false, 1.000],
  [/PF/,    'Public Facilities',                false, 1.000],
];

function parseZone(zone) {
  const z = zone.toUpperCase();
  for (const [re, desc, mf, df] of ZONE_PATTERNS) {
    if (re.test(z)) return { description:desc, multifamily:mf, density_factor:df };
  }
  return { description:'Unknown / Verify at ZIMAS', multifamily:false, density_factor:1.0 };
}

// ── Opportunity Zone (zip screen) ─────────────────────────────────────────────

const LA_OZ_ZIPS = new Set([
  '90001','90002','90003','90004','90006','90007','90008','90010','90011','90012',
  '90013','90014','90015','90016','90017','90018','90019','90021','90023',
  '90026','90029','90031','90033','90037','90038','90044','90047','90057',
  '90059','90061','90062','90063','90065','90068','90220','90221','90222',
  '90247','90250','90255','90270','90280','90301','90302','90303','90304',
  '90305','90640','91030','91040','91201','91204','91205','91342','91352',
  '91401','91402','91403','91405','91406','91411','91501','91502','91601',
  '91602','91605','91606',
]);

// ── Development potential ─────────────────────────────────────────────────────

function calcDevelopment(parcel, toc, zoneInfo) {
  const lot  = parcel.sqft_lot || 0;
  const isMF = zoneInfo.multifamily || false;
  const df   = zoneInfo.density_factor || 1.0;

  if (!lot) return { note:'Lot size unavailable' };

  const base     = isMF ? Math.max(1, Math.floor(lot / 1000 * df)) : 1;
  const tocMults = {0:1.0,1:1.22,2:1.33,3:1.50,4:1.70};
  const tocMult  = tocMults[toc.tier] || 1.0;
  const tocUnits = toc.eligible ? Math.floor(base * tocMult) : 0;
  const miipUnits= isMF ? Math.floor(base * 2.2) : 0;
  const maxUnits = Math.max(base, tocUnits, miipUnits);

  return {
    base_units_by_right:  base,
    toc_units:            tocUnits,
    miip_units:           miipUnits,
    max_potential_units:  maxUnits,
    toc_density_bonus:    toc.eligible ? `${Math.round((tocMult-1)*100)}%` : 'N/A',
    miip_available:       isMF,
    ab2097_zero_parking:  toc.eligible,
    far_boost_available:  toc.eligible || isMF ? '55%' : '0%',
    approval_path:        toc.eligible || isMF ? 'Ministerial (by-right)' : 'Discretionary',
  };
}

// ── SB 9 (Urban Lot Split / Duplex) ──────────────────────────────────────────

function calcSB9(parcel, zoneInfo, lat, lng) {
  const zone   = (parcel.zoning_pdb || '').toUpperCase();
  const sqft   = parcel.sqft_lot || 0;
  const isSFR  = !zoneInfo.multifamily && /R1|RS|RE|SFR|RA/.test(zone);
  const minLot = 1200; // CA SB9 minimum resulting lot size

  if (!isSFR) {
    return {
      eligible: false,
      reason: 'Parcel not in single-family zone — SB 9 only applies to R1/RS/RE/RA zones',
      duplex_units: 0,
      lot_split_eligible: false,
    };
  }

  if (sqft < 2400) {
    return {
      eligible: true,
      reason: 'Single-family zone but lot may be too small for lot split (min 1,200 sqft per resulting parcel)',
      duplex_units: 2,
      lot_split_eligible: false,
      notes: 'Duplex allowed by-right. Lot split requires 2,400 sqft minimum lot.',
    };
  }

  const resultingLotA = Math.floor(sqft * 0.4);
  const resultingLotB = sqft - resultingLotA;
  const splitOk = resultingLotA >= minLot && resultingLotB >= minLot;

  return {
    eligible: true,
    reason: 'SB 9 applies — single-family zone in urban area',
    duplex_units: 2,
    lot_split_eligible: splitOk,
    resulting_lots: splitOk ? [
      `Lot A: ~${resultingLotA.toLocaleString()} sqft`,
      `Lot B: ~${resultingLotB.toLocaleString()} sqft`,
    ] : null,
    max_units_with_split: splitOk ? 4 : 2,
    approval_path: 'Ministerial (by-right) — no public hearing required',
    notes: splitOk
      ? `Lot split allowed: each resulting lot is >= 1,200 sqft. Up to 2 units per lot = 4 total units.`
      : 'Duplex allowed by-right. Lot split not feasible at this lot size.',
    owner_occupancy: 'Owner must occupy one unit for 3 years after lot split.',
    restrictions: 'Cannot demolish rent-controlled or affordable units. Cannot evict existing tenants.',
  };
}

// ── ADU Eligibility ───────────────────────────────────────────────────────────

function calcADU(parcel, zoneInfo) {
  const sqft   = parcel.sqft_lot || 0;
  const units  = parcel.num_units || 1;
  const zone   = (parcel.zoning_pdb || '').toUpperCase();
  const isSFR  = !zoneInfo.multifamily && /R1|RS|RE|SFR|RA/.test(zone);
  const isMF   = zoneInfo.multifamily;

  if (!isSFR && !isMF) {
    return { eligible: false, reason: 'ADU eligibility uncertain — commercial or industrial zoning' };
  }

  const jadu_eligible = isSFR && sqft >= 500;
  const adu_sqft_max  = Math.min(850, Math.floor(sqft * 0.5));
  const detached_ok   = sqft >= 800;

  let count_allowed = 1;
  if (isSFR) count_allowed = 2; // 1 ADU + 1 JADU
  if (isMF)  count_allowed = Math.max(2, Math.floor(units * 0.25));

  return {
    eligible: true,
    adu_count_allowed: count_allowed,
    detached_adu: detached_ok,
    max_adu_sqft: adu_sqft_max,
    jadu_eligible: jadu_eligible,
    jadu_max_sqft: jadu_eligible ? 500 : 0,
    permit_type: 'Ministerial (by-right) — no discretionary review',
    setbacks: '4 ft rear and side setbacks for detached ADU',
    parking_required: false,
    rental_income_estimate: `$${Math.round(adu_sqft_max * 2.8).toLocaleString()}–$${Math.round(adu_sqft_max * 3.5).toLocaleString()}/mo (LA market estimate)`,
    notes: 'AB 68, AB 2221, SB 897 (2023): ADU rules apply statewide. Owner-occupancy requirement was removed in 2020.',
  };
}

// ── Grant engine ──────────────────────────────────────────────────────────────

function buildProfile(geo, parcel, toc, zoneInfo, oppZone) {
  const isMF = zoneInfo.multifamily || false;
  // Brownfield: industrial/manufacturing use codes, or M-zoned parcels
  const useCode = (parcel.use_code || '').toString();
  const zoneUpper = (parcel.zoning_pdb || '').toUpperCase();
  const isBrownfield = /^[4-9]/.test(useCode) || /M[123]|CM|MR/.test(zoneUpper);

  return {
    state:            'CA',
    city:             geo.city || 'Los Angeles',
    zip:              parcel.zip || geo.zip || '',
    zoning:           parcel.zoning_pdb || '',
    zoned_multifamily: isMF,
    low_income_area:  oppZone,
    brownfield:       isBrownfield,
    near_transit:     toc.eligible,
    opportunity_zone: oppZone,
    rural:            false,
    toc_tier:         toc.tier,
    ab2097_exempt:    toc.eligible,
    miip_eligible:    isMF,
    lot_size_sqft:    parcel.sqft_lot || 0,
    lot_size_acres:   parcel.lot_acres || 0,
    project_type:     isMF ? 'affordable_housing' : 'mixed_use',
  };
}

// ── Grants.gov live search ────────────────────────────────────────────────────

async function fetchLiveGrants() {
  const queries = [
    'affordable multifamily housing construction',
    'transit oriented development affordable housing',
    'low income housing community development',
  ];
  const seen = new Set(), results = [];
  for (const kw of queries) {
    try {
      const r = await fetch('https://apply07.grants.gov/grantsws/rest/opportunities/search/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: kw, oppStatuses: 'forecasted|posted', rows: 5, startRecordNum: 0, sortBy: 'openDate|desc' }),
        signal: AbortSignal.timeout(8000),
      });
      const d = await r.json();
      for (const opp of (d.oppHits || [])) {
        const id = opp.id || opp.number || opp.title;
        if (id && !seen.has(id)) { seen.add(id); results.push(opp); }
      }
    } catch { /* skip on timeout */ }
  }
  return results.slice(0, 12).map(o => ({
    title:     o.title || 'N/A',
    agency:    o.agencyName || 'N/A',
    status:    o.oppStatus || 'N/A',
    close_date: o.closeDate || '',
    ref:       o.number || '',
    award:     o.awardCeiling ? `$${parseInt(o.awardCeiling).toLocaleString()}` : '',
    url:       o.number ? `https://www.grants.gov/search-grants?oppNum=${o.number}` : 'https://www.grants.gov/search-grants',
  }));
}

// ── Next steps ────────────────────────────────────────────────────────────────

function buildNextSteps(profile) {
  const steps = [];
  steps.push({ priority: 1, title: 'CA LIHTC (Tax Credits)', body: 'Apply to California TCAC for combined federal + state tax credits. Generates 60–90% of eligible development costs in equity.', url: 'https://www.treasurer.ca.gov/ctcac/' });
  steps.push({ priority: 2, title: 'CA HCD Programs (apply in parallel)', body: 'MHP (rolling, year-round) + AHSC (annual NOFA, fall release) + IIG (periodic NOFA, rewards TOD sites).', url: 'https://www.hcd.ca.gov/grants-and-funding' });
  if (profile.near_transit) steps.push({ priority: 3, title: 'LA TOC + MIIP (by-right)', body: 'By-right density bonus — no public hearing needed. TOC Tier ' + profile.toc_tier + ' enables up to 70% more units + 55% FAR boost.', url: 'https://planning.lacity.gov/plans-policies/toc-guidelines' });
  steps.push({ priority: 4, title: 'Local CDBG / HOME funds', body: 'Contact HCIDLA (City of LA) or LACDA (county). These are the fastest-moving local funds.', url: 'https://hcidla2.lacity.org' });
  steps.push({ priority: 5, title: 'Grants.gov alerts', body: 'Set email alerts for: "affordable housing", "multifamily", "transit oriented". New NOFAs post regularly.', url: 'https://www.grants.gov/search-grants' });
  if (profile.opportunity_zone) steps.push({ priority: 6, title: 'Opportunity Zone Equity', body: 'Your parcel is in a Qualified Opportunity Zone — use this to attract capital gains equity investment.', url: 'https://opportunityzones.hud.gov/' });
  return steps;
}

const GRANTS = [
  { name:'HOME Investment Partnerships (HOME)', agency:'HUD', level:'federal', category:'Affordable Housing',
    description:'Block grant for affordable housing construction, rehab, and acquisition.',
    url:'https://www.hud.gov/program_offices/comm_planning/home',
    max_award:'$500K–$5M per project', deadline:'Annual cycle through local Participating Jurisdictions.',
    criteria:{ project_type:['affordable_housing','mixed_income'] } },
  { name:'Community Development Block Grant (CDBG)', agency:'HUD', level:'federal', category:'Community Development',
    description:'Flexible grant for housing serving low/moderate income persons.',
    url:'https://www.hud.gov/program_offices/comm_planning/cdbg',
    max_award:'$100K–$2M per project', deadline:'Annual cycle; apply to local entitlement city.',
    criteria:{ low_income_area:true, project_type:['affordable_housing','mixed_income'] } },
  { name:'Choice Neighborhoods Initiative (CNI)', agency:'HUD', level:'federal', category:'Neighborhood Revitalization',
    description:'Transforms distressed neighborhoods. Up to $50M implementation grants.',
    url:'https://www.hud.gov/cn', max_award:'Up to $50,000,000', deadline:'Competitive NOFA; check Grants.gov.',
    criteria:{ low_income_area:true, project_type:['affordable_housing'] } },
  { name:'FTA Transit-Oriented Development Planning', agency:'FTA/DOT', level:'federal', category:'TOD',
    description:'Funds integrated TOD planning around transit stations.',
    url:'https://www.transit.dot.gov/TOD', max_award:'Up to $2,000,000', deadline:'Competitive NOFA; check Grants.gov.',
    criteria:{ near_transit:true, project_type:['affordable_housing','mixed_income','mixed_use'] } },
  { name:'Opportunity Zone Tax Incentive', agency:'IRS/Treasury', level:'federal', category:'Tax Incentive',
    description:'Capital gains deferral for investments in federally designated Opportunity Zones.',
    url:'https://www.irs.gov/credits-deductions/opportunity-zones',
    max_award:'Tax incentive; attracts $1M–$20M+ in equity', deadline:'Permanent program; no deadline.',
    criteria:{ opportunity_zone:true } },
  { name:'CA HCD Infill Infrastructure Grant (IIG)', agency:'California HCD', level:'state', category:'Infill Development',
    description:'Funds infrastructure for infill affordable housing. Prioritizes transit-adjacent sites.',
    url:'https://www.hcd.ca.gov/grants-and-funding/grants-and-loans/infill-infrastructure-grant-program',
    max_award:'Up to $30,000,000', deadline:'Competitive NOFA; check hcd.ca.gov.',
    criteria:{ state:['CA'], project_type:['affordable_housing','mixed_income'], near_transit:null } },
  { name:'CA HCD Multifamily Housing Program (MHP)', agency:'California HCD', level:'state', category:'Affordable Housing',
    description:'0–3% construction/permanent loans for affordable rental housing. Rolling applications.',
    url:'https://www.hcd.ca.gov/grants-and-funding/grants-and-loans/multifamily-housing-program',
    max_award:'Up to $7,000,000', deadline:'Rolling applications year-round.',
    criteria:{ state:['CA'], project_type:['affordable_housing'] } },
  { name:'CA Affordable Housing & Sustainable Communities (AHSC)', agency:'CA HCD/SGC', level:'state', category:'TOD Affordable Housing',
    description:'Funds affordable housing + GHG-reducing transport near transit. Cap-and-trade funded.',
    url:'https://sgc.ca.gov/programs/ahsc/', max_award:'Up to $30,000,000',
    deadline:'Annual NOFA; typically released late fall.',
    criteria:{ state:['CA'], near_transit:true, project_type:['affordable_housing'], low_income_area:null } },
  { name:'CA LIHTC — State Tax Credit (TCAC)', agency:'CA Tax Credit Allocation Committee', level:'state', category:'Tax Credit/Equity',
    description:'State LIHTC paired with federal 9% credits — #1 financing tool for CA affordable multifamily.',
    url:'https://www.treasurer.ca.gov/ctcac/', max_award:'Generates $1M–$20M+ equity per project',
    deadline:'Multiple competitive rounds per year.',
    criteria:{ state:['CA'], project_type:['affordable_housing'] } },
  { name:'CA Transformative Climate Communities (TCC)', agency:'CA Strategic Growth Council', level:'state', category:'Community Revitalization',
    description:'Large investment in disadvantaged communities targeting top 25% CalEnviroScreen tracts.',
    url:'https://sgc.ca.gov/programs/tcc/', max_award:'Up to $35,000,000',
    deadline:'Periodic NOFAs every 2–3 years.',
    criteria:{ state:['CA'], low_income_area:true, project_type:['affordable_housing','mixed_income'], near_transit:null } },
  { name:'LA City TOC Incentive Program', agency:'LA Dept. of City Planning', level:'local', category:'Density Bonus',
    description:'Density bonus up to 70%, 55% FAR boost, zero parking (AB 2097). Requires 15–25% affordable units.',
    url:'https://planning.lacity.gov/plans-policies/toc-guidelines',
    max_award:'By-right density bonus (not cash)', deadline:'By-right; apply with building permit.',
    criteria:{ state:['CA'], near_transit:true, project_type:['affordable_housing','mixed_income'] } },
  { name:'LA City Mixed Income Incentive Program (MIIP)', agency:'LA Dept. of City Planning', level:'local', category:'Density Bonus',
    description:'120% density bonus + 55% FAR for 20%+ affordable units. Ministerial (by-right) approval.',
    url:'https://planning.lacity.gov/plans-policies/housing-element/miip',
    max_award:'By-right bonus — saves 12–18 months approval', deadline:'By-right; no NOFA needed.',
    criteria:{ state:['CA'], zoned_multifamily:true, project_type:['affordable_housing','mixed_income'] } },
  { name:'LA City Proposition HHH', agency:'LA HCIDLA', level:'local', category:'Affordable Housing Loans',
    description:'$1.2B voter-approved bond. Low-interest loans for permanent supportive + affordable housing.',
    url:'https://hcidla2.lacity.org/proposition-hhh',
    max_award:'Up to $140,000/unit (loan)', deadline:'Competitive NOFA from HCIDLA.',
    criteria:{ state:['CA'], project_type:['affordable_housing'] } },
  { name:'Metro TOD Planning Grant', agency:'LA Metro', level:'local', category:'TOD Planning',
    description:'Funds planning for affordable housing + TOD near Metro stations.',
    url:'https://www.metro.net/projects/tod/', max_award:'Up to $500,000',
    deadline:'Periodic NOFAs; contact LA Metro.',
    criteria:{ state:['CA'], near_transit:true, project_type:['affordable_housing','mixed_income'] } },
  // Additional programs from grant_finder.py
  { name:'CA HCD No Place Like Home (NPLH)', agency:'California HCD', level:'state', category:'Supportive Housing',
    description:'Funds permanent supportive housing for people experiencing homelessness with serious mental illness. County-sponsored applications.',
    url:'https://www.hcd.ca.gov/grants-and-funding/grants-and-loans/no-place-like-home',
    max_award:'Up to $30,000,000', deadline:'Competitive NOFA; county must sponsor application.',
    criteria:{ state:['CA'], project_type:['affordable_housing'] } },
  { name:'CA HCD Homekey Program', agency:'California HCD', level:'state', category:'Acquisition/Conversion',
    description:'Fast-track grants for purchase and conversion of hotels, motels, offices into permanent affordable housing. Large awards, quick rounds.',
    url:'https://www.hcd.ca.gov/grants-and-funding/grants-and-loans/homekey',
    max_award:'Up to $50,000,000+', deadline:'Competitive rounds; check HCD website for current round.',
    criteria:{ state:['CA'], project_type:['affordable_housing'] } },
  { name:'CA CalHFA Mixed-Income Loan Program (MILP)', agency:'California Housing Finance Agency', level:'state', category:'Mixed-Income Housing',
    description:'Permanent financing for mixed-income multifamily rental housing. Low-interest loans with flexible terms.',
    url:'https://www.calhfa.ca.gov/multifamily/',
    max_award:'Up to $30M+ depending on project', deadline:'Rolling applications; contact CalHFA Multifamily Division.',
    criteria:{ state:['CA'], project_type:['affordable_housing','mixed_income'] } },
  { name:'LA County CDBG/HOME — LACDA Housing Program', agency:'LA County Development Authority', level:'local', category:'Community Development',
    description:'Locally administered HUD HOME and CDBG funds for affordable housing in LA County. City of LA projects apply to HCIDLA.',
    url:'https://www.lacda.org/programs/community-development',
    max_award:'Typically $500K–$3M per project', deadline:'Annual NOFA through HCIDLA or LACDA.',
    criteria:{ state:['CA'], project_type:['affordable_housing','mixed_income'], low_income_area:true } },
  { name:'LA City HCIDLA — Affordable Housing Trust Fund (AHTF)', agency:'City of LA — HCIDLA', level:'local', category:'Affordable Housing',
    description:'City of LA affordable housing trust fund. Low-interest loans + grants for affordable multifamily. Priority for transit-adjacent projects.',
    url:'https://hcidla2.lacity.org/affordable-housing-trust-fund',
    max_award:'Typically $1M–$5M per project', deadline:'NOFA-based; contact HCIDLA (213) 808-8888.',
    criteria:{ state:['CA'], project_type:['affordable_housing'], low_income_area:null, near_transit:null } },
  { name:'CA IIG Active Transportation (AHSC)', agency:'California SGC/Caltrans', level:'state', category:'Active Transportation/TOD',
    description:'Funds bike lanes, sidewalks, and paths near affordable housing + transit. Paired with AHSC housing grants.',
    url:'https://sgc.ca.gov/programs/ahsc/',
    max_award:'Up to $7,000,000', deadline:'Tied to AHSC NOFA cycle; apply simultaneously.',
    criteria:{ state:['CA'], near_transit:true, low_income_area:null } },
  { name:'DOT RAISE Grant (formerly BUILD/TIGER)', agency:'U.S. DOT', level:'federal', category:'Infrastructure',
    description:'Funds surface transportation infrastructure enabling TOD and multifamily development. Roads, utilities, site improvements.',
    url:'https://www.transportation.gov/RAISEgrants',
    max_award:'Up to $25,000,000', deadline:'Annual NOFA; minimum $1M award.',
    criteria:{ near_transit:null, zoned_multifamily:null } },
  { name:'HUD Section 202 — Supportive Housing for the Elderly', agency:'HUD', level:'federal', category:'Senior Affordable Housing',
    description:'Capital Advance grants for affordable housing for very low-income elderly (62+). No repayment if 40-year occupancy met.',
    url:'https://www.hud.gov/program_offices/housing/mfh/progdesc/eld202',
    max_award:'Varies by location and unit count', deadline:'Annual NOFA; nonprofit sponsors only.',
    criteria:{ project_type:['affordable_housing'], low_income_area:null } },
  { name:'HUD Section 811 — Supportive Housing for Disabilities', agency:'HUD', level:'federal', category:'Supportive Housing',
    description:'Affordable integrated housing for very low-income adults with disabilities. Capital Advance + PRAC contracts.',
    url:'https://www.hud.gov/program_offices/housing/mfh/progdesc/disab811',
    max_award:'Typically $50K–$150K per unit', deadline:'Annual NOFA; nonprofit sponsors only.',
    criteria:{ project_type:['affordable_housing'] } },
  { name:'HUD Lead Hazard Reduction Grant', agency:'HUD Office of Lead Hazard Control', level:'federal', category:'Environmental Health',
    description:'Funds lead-based paint hazard reduction in low-income housing. Relevant for older buildings.',
    url:'https://www.hud.gov/program_offices/healthy_homes/lbp/ohhlhc',
    max_award:'Up to $4,000,000', deadline:'Annual NOFA; competitive.',
    criteria:{ low_income_area:true, project_type:['affordable_housing'] } },
  { name:'EPA Brownfields Assessment Grant', agency:'EPA', level:'federal', category:'Brownfield Remediation',
    description:'Funds Phase I/II environmental site assessments. Community-wide grants up to $500K. No match required.',
    url:'https://www.epa.gov/brownfields/brownfields-grant-types',
    max_award:'Up to $500,000', deadline:'Annual NOFA; typically October–November. EPA Region 9 for CA.',
    criteria:{ brownfield:true } },
  { name:'EPA Brownfields Cleanup Grant', agency:'EPA', level:'federal', category:'Brownfield Remediation',
    description:'Funds actual cleanup at specific brownfield sites. 20% cost-share required. Enables housing on remediated land.',
    url:'https://www.epa.gov/brownfields/brownfields-grant-types',
    max_award:'Up to $500,000 (20% match required)', deadline:'Annual NOFA; typically October–November.',
    criteria:{ brownfield:true } },
  { name:'CA Brownfields Cleanup — DTSC', agency:'California DTSC', level:'state', category:'Brownfield Remediation',
    description:'Low-interest loans and technical assistance for brownfield cleanup in CA. Pairs with EPA grants.',
    url:'https://dtsc.ca.gov/brownfields/',
    max_award:'Up to $1,000,000', deadline:'Rolling; contact DTSC Region 4 (SoCal).',
    criteria:{ state:['CA'], brownfield:true } },
  { name:'USDA Section 515 Rural Rental Housing', agency:'USDA Rural Development', level:'federal', category:'Rural Housing',
    description:'Direct low-interest loans for affordable multifamily in rural areas (pop < 10,000).',
    url:'https://www.rd.usda.gov/programs-services/multi-family-housing-programs/multi-family-housing-direct-loans',
    max_award:'Covers up to 100% of costs', deadline:'Rolling; contact local USDA Rural Development office.',
    criteria:{ rural:true, project_type:['affordable_housing'] } },
];

function evaluateGrants(profile) {
  const qualified=[], potential=[], ineligible=[];
  for (const g of GRANTS) {
    let score=0; const reasons=[], disq=[];
    for (const [k,req] of Object.entries(g.criteria)) {
      const val   = profile[k];
      const label = k.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
      if (k==='state') {
        if (Array.isArray(req) && req.includes(val)) { score+=30; reasons.push(`State: ${val}`); }
        else disq.push(`Requires state in ${JSON.stringify(req)}`);
        continue;
      }
      if (k==='project_type') {
        if (Array.isArray(req) && req.includes(val)) { score+=20; reasons.push(`Project type '${val}' qualifies`); }
        else disq.push(`Project type mismatch: requires ${JSON.stringify(req)}`);
        continue;
      }
      if (req===true)  { if (val) { score+=15; reasons.push(`${label}: qualifies`); } else disq.push(`Requires ${label} = Yes`); }
      else if (req===false) { if (!val) { score+=10; reasons.push(`${label}: not required`); } else disq.push(`Requires ${label} = No`); }
      else if (req===null && val) { score+=5; reasons.push(`Bonus: ${label} increases competitiveness`); }
    }
    const eligible = disq.length===0;
    const entry = { ...g, eligible, score: eligible ? score : 0, match_reasons:reasons, disqualifiers:disq };
    if (eligible) (score>=20 ? qualified : potential).push(entry);
    else ineligible.push(entry);
  }
  qualified.sort((a,b)=>b.score-a.score);
  return { qualified, potential, ineligible };
}

function grantToObj(g) {
  return { name:g.name, agency:g.agency, level:g.level, category:g.category,
    description:g.description, url:g.url, max_award:g.max_award, deadline:g.deadline,
    score:g.score, match_reasons:g.match_reasons, disqualifiers:g.disqualifiers };
}
