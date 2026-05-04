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

    // 2. Assessor: search → AIN → detail
    const ain    = await assessorSearch(address);
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

    // 7. Grants
    const profile            = buildProfile(geo, parcel, toc, zoneInfo, oppZone);
    const { qualified, potential, ineligible } = evaluateGrants(profile);

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
        lot_dimensions: `${parcel.land_width || 0}' × ${parcel.land_depth || 0}'`,
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
        distance_to_metro:   toc.eligible ? `${toc.dist} miles` : 'Not within TOC radius',
        opportunity_zone:    oppZone,
        low_income_area:     oppZone,
        ab2097_zero_parking: toc.eligible,
      },
      development_potential: dev,
      grants: {
        qualified:    qualified.map(grantToObj),
        potential:    potential.map(grantToObj),
        not_eligible: ineligible.map(grantToObj),
        summary: { total_qualified: qualified.length, total_potential: potential.length, total_ineligible: ineligible.length },
      },
      data_sources: [
        'US Census Bureau Geocoder (free)',
        'LA County Assessor Portal',
        'LA Metro station proximity (TOC)',
        'HUD Opportunity Zone registry (zip screen)',
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

async function assessorSearch(address) {
  try {
    const url = `https://portal.assessor.lacounty.gov/api/search?search=${encodeURIComponent(address)}`;
    const r   = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) });
    const d   = await r.json();
    return d?.Parcels?.[0]?.AIN || '';
  } catch { return ''; }
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

const METRO_STATIONS = [
  [34.0595,-118.3076,'Purple',4],[34.0581,-118.3246,'Purple',4],[34.0580,-118.3396,'Purple',4],
  [34.0558,-118.3558,'Purple',4],[34.0530,-118.3710,'Purple',4],[34.0535,-118.2443,'Red/Purple',4],
  [34.0981,-118.3290,'Red',3],[34.0843,-118.3079,'Red',3],[34.0677,-118.3079,'Red',3],
  [34.0172,-118.2892,'Expo',2],[34.0213,-118.3074,'Expo',2],[34.0253,-118.3469,'Expo',3],
  [34.0209,-118.3970,'Expo',3],[33.9167,-118.2004,'Green',2],[34.1023,-118.1278,'Gold',2],
  [34.0660,-118.1964,'Gold',2],[34.0443,-118.2522,'Blue',2],[34.0113,-118.3395,'Crenshaw',2],
  [33.9833,-118.3416,'Crenshaw',2],
];
const TOC_RADII = { 4:0.25, 3:0.33, 2:0.5, 1:0.75 };

function haversine(lat1,lng1,lat2,lng2) {
  const R=3958.8, dl=rad(lat2-lat1), dg=rad(lng2-lng1);
  const a=Math.sin(dl/2)**2 + Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dg/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function rad(d){ return d*Math.PI/180; }

function calcTOC(lat, lng) {
  let bestTier=0, bestDist=9999, bestLine='';
  for (const [slat,slng,line,tier] of METRO_STATIONS) {
    const dist   = haversine(lat,lng,slat,slng);
    const radius = TOC_RADII[tier] || 0.5;
    if (dist <= radius && (tier > bestTier || (tier === bestTier && dist < bestDist))) {
      bestTier=tier; bestDist=dist; bestLine=line;
    }
  }
  return { tier:bestTier, eligible:bestTier>0, line:bestLine, dist:Math.round(bestDist*100)/100 };
}

// ── Zone parser ───────────────────────────────────────────────────────────────

const ZONE_PATTERNS = [
  [/R5/,  'High-Density Multifamily', true,  0.125],
  [/R4/,  'High-Density Multifamily', true,  0.200],
  [/R3/,  'Medium-Density Multifamily', true, 0.333],
  [/R2/,  'Two-Family Residential',   true,  0.500],
  [/RD/,  'Restricted Density',       true,  0.333],
  [/RAS/, 'Residential/Accessory',    true,  0.333],
  [/RAP/, 'Restricted Apt',           true,  0.333],
  [/C[24]/, 'Commercial/Mixed-Use',   false, 0.333],
  [/M1/,  'Industrial',               false, 0.500],
  [/R1|SFR/, 'Single Family',         false, 1.000],
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
  '90001','90002','90003','90004','90006','90007','90008','90011','90012',
  '90013','90014','90015','90016','90017','90018','90019','90021','90023',
  '90026','90031','90033','90037','90044','90047','90059','90061','90062',
  '90063','90065','90220','90221','90222','90247','90250','90255','90270',
  '90280','90301','90302','90303','90304','90305','90640','91030','91040',
  '91342','91352','91401','91402','91403','91405','91406','91411','91501',
  '91502','91601','91602','91605','91606',
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

// ── Grant engine ──────────────────────────────────────────────────────────────

function buildProfile(geo, parcel, toc, zoneInfo, oppZone) {
  const isMF = zoneInfo.multifamily || false;
  return {
    state:            'CA',
    city:             geo.city || 'Los Angeles',
    zip:              parcel.zip || geo.zip || '',
    zoning:           parcel.zoning_pdb || '',
    zoned_multifamily: isMF,
    low_income_area:  oppZone,
    brownfield:       false,
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
