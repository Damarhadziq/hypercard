import locations from './indonesiaLocations.generated.json';

export const PROVINCES = locations.provinces;
export const CITIES_BY_PROVINCE = locations.citiesByProvince as Record<string, string[]>;

const PROVINCE_CODES = locations.provinceCodes as Record<string, string>;
const DISTRICTS_BY_LOCATION = locations.districtsByLocation as Record<string, string[]>;
const PROVINCE_ALIASES: Record<string, string> = {
  'DI Yogyakarta': 'Daerah Istimewa Yogyakarta',
};

function normalizeRegencyName(value: string) {
  return value
    .replace(/^Kota Administrasi\s+/i, '')
    .replace(/^Kabupaten Administrasi\s+/i, '')
    .replace(/^Kota\s+/i, '')
    .replace(/^Kabupaten\s+/i, '')
    .trim()
    .toLocaleLowerCase('id-ID');
}

export function getCitiesByProvince(province: string) {
  const officialProvince = PROVINCE_ALIASES[province] ?? province;
  return CITIES_BY_PROVINCE[officialProvince] ?? [];
}

export function getDistrictsByLocation(province: string, city: string) {
  const officialProvince = PROVINCE_ALIASES[province] ?? province;
  const provinceCode = PROVINCE_CODES[officialProvince];
  if (!provinceCode || !city) return [];

  const officialCities = CITIES_BY_PROVINCE[officialProvince] ?? [];
  const officialCity = officialCities.find((candidate) => candidate === city)
    ?? officialCities.find(
      (candidate) => normalizeRegencyName(candidate) === normalizeRegencyName(city),
    );

  return officialCity
    ? DISTRICTS_BY_LOCATION[`${provinceCode}::${officialCity}`] ?? []
    : [];
}

export const LOCATION_DATA_META = locations.meta;

export function splitStoredAddress(address = '') {
  const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length < 4) {
    return { detail: address, district: '', city: '', province: '' };
  }

  return {
    detail: parts.slice(0, -3).join(', '),
    district: parts.at(-3) ?? '',
    city: parts.at(-2) ?? '',
    province: parts.at(-1) ?? '',
  };
}

export function joinAddress(parts: { detail?: string; district?: string; city?: string; province?: string }) {
  return [parts.detail, parts.district, parts.city, parts.province]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
}
