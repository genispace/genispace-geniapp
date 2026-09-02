import chinaGeoJson from './china.json';
import usaGeoJson from './usa.json';
import europeGeoJson from './europe.json';

export type BundledMapGeo = Record<string, unknown>;

export function getBundledChinaGeo(): BundledMapGeo {
  return chinaGeoJson as BundledMapGeo;
}

export function getBundledUsaGeo(): BundledMapGeo {
  return usaGeoJson as BundledMapGeo;
}

export function getBundledEuropeGeo(): BundledMapGeo {
  return europeGeoJson as BundledMapGeo;
}
