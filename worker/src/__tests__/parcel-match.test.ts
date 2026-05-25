// parcel-match.test.ts — verifies bestParcelMatch correctly identifies
// 904 S Ardmore as 906 S ARDMORE AVE (AIN 5094021015), not a Burbank
// parcel that happened to share the house number + direction prefix.

import { describe, it, expect } from 'vitest'
// @ts-expect-error — plain JS module
import { bestParcelMatch } from '../../../functions/api/zoning.js'

// Real Assessor-search response shape (subset of the noise the API actually returns).
const ARDMORE_SEARCH_RESULTS = [
  { AIN: '5145029080', SitusStreet: '746 S LOS ANGELES ST, NO   904', SitusCity: 'LOS ANGELES CA',  SitusZipCode: '90014-0000' },
  { AIN: '5093025092', SitusStreet: '727 S ARDMORE AVE, NO 904',      SitusCity: 'LOS ANGELES CA',  SitusZipCode: '90005-4369' },
  { AIN: '5588026085', SitusStreet: '4455 LOS FELIZ BLVD, NO 904',    SitusCity: 'LOS ANGELES CA',  SitusZipCode: '90027-2138' },
  { AIN: '2453040002', SitusStreet: '904 S SAN FERNANDO BLVD',         SitusCity: 'BURBANK CA',     SitusZipCode: '91502-1535' },
  { AIN: '3056007016', SitusStreet: 'VAC/VIC ANGELES FOREST/2/3 MI',  SitusCity: 'PALMDALE CA',    SitusZipCode: '93550-0000' },
  { AIN: '2245008114', SitusStreet: '5455 SYLMAR AVE, 904',            SitusCity: 'LOS ANGELES CA', SitusZipCode: '91401-5114' },
  { AIN: '2456007009', SitusStreet: '904 E SAN JOSE AVE',              SitusCity: 'BURBANK CA',     SitusZipCode: '91501-1320' },
  // Adjacent-number fallback search (num+2) finds the actual Ardmore parcel:
  { AIN: '5094021015', SitusStreet: '906 S ARDMORE AVE',               SitusCity: 'LOS ANGELES CA', SitusZipCode: '90006-1305' },
]

describe('bestParcelMatch — 904 S Ardmore Ave', () => {
  const picked = bestParcelMatch('904 S Ardmore Ave, Los Angeles, CA 90005', ARDMORE_SEARCH_RESULTS)
  it('picks the actual Ardmore parcel (AIN 5094021015), not Burbank San Fernando', () => {
    expect(picked).toBeTruthy()
    expect(picked.AIN).toBe('5094021015')
  })
  it('does NOT pick AIN 2453040002 (Burbank, wrong street + wrong city)', () => {
    expect(picked.AIN).not.toBe('2453040002')
  })
  it('does NOT pick a unit-suffix parcel (e.g. 727 S Ardmore Ave NO 904)', () => {
    expect(picked.AIN).not.toBe('5093025092')
  })
})

describe('bestParcelMatch — direction-letter / city / zip sanity', () => {
  it('direction-letter "S" alone does NOT score as a street-name match', () => {
    // Input "904 S Ardmore Ave" vs parcel "904 S Random St" — the "S" alone
    // should not let the wrong street win.
    const parcels = [
      { AIN: 'WRONG', SitusStreet: '904 S RANDOM ST', SitusCity: 'LOS ANGELES CA', SitusZipCode: '90005-0000' },
      { AIN: 'RIGHT', SitusStreet: '906 S ARDMORE AVE', SitusCity: 'LOS ANGELES CA', SitusZipCode: '90006-0000' },
    ]
    const picked = bestParcelMatch('904 S Ardmore Ave, Los Angeles, CA 90005', parcels)
    expect(picked.AIN).toBe('RIGHT')
  })
  it('city mismatch (Burbank vs LA) is penalized', () => {
    const parcels = [
      { AIN: 'BURBANK', SitusStreet: '904 ARDMORE AVE', SitusCity: 'BURBANK CA',     SitusZipCode: '91502-0000' },
      { AIN: 'LA',      SitusStreet: '906 ARDMORE AVE', SitusCity: 'LOS ANGELES CA', SitusZipCode: '90006-0000' },
    ]
    const picked = bestParcelMatch('904 Ardmore Ave, Los Angeles, CA', parcels)
    expect(picked.AIN).toBe('LA')
  })
  it('exact match (correct number + correct name + correct zip) still wins cleanly', () => {
    const parcels = [
      { AIN: 'ADJACENT', SitusStreet: '906 S ARDMORE AVE', SitusCity: 'LOS ANGELES CA', SitusZipCode: '90006-0000' },
      { AIN: 'EXACT',    SitusStreet: '904 S ARDMORE AVE', SitusCity: 'LOS ANGELES CA', SitusZipCode: '90005-0000' },
    ]
    const picked = bestParcelMatch('904 S Ardmore Ave, Los Angeles, CA 90005', parcels)
    expect(picked.AIN).toBe('EXACT')
  })
  it('parcels with zero street-name overlap are hard-rejected', () => {
    // Even with matching house number + matching direction, a totally different
    // street must not be picked.
    const parcels = [
      { AIN: 'WRONGSTREET', SitusStreet: '904 S MAIN ST',       SitusCity: 'LOS ANGELES CA', SitusZipCode: '90005-0000' },
      { AIN: 'OTHERSTREET', SitusStreet: '904 S BROADWAY',      SitusCity: 'LOS ANGELES CA', SitusZipCode: '90005-0000' },
    ]
    const picked = bestParcelMatch('904 S Ardmore Ave, Los Angeles, CA 90005', parcels)
    // Both fail the street-name hard filter → no match returned.
    expect(picked).toBeNull()
  })
})
