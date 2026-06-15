import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const API_ROOT = 'https://wilayah.id/api';
const OUTPUT_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../apps/web/src/lib/indonesiaLocations.generated.json',
);
const CONCURRENCY = 16;

async function fetchData(path) {
  const response = await fetch(`${API_ROOT}/${path}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`);
  }

  const payload = await response.json();
  return payload.data;
}

async function mapWithConcurrency(items, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => worker()),
  );
  return results;
}

const provinces = await fetchData('provinces.json');
const regencyGroups = await mapWithConcurrency(provinces, async (province) => ({
  province,
  regencies: await fetchData(`regencies/${province.code}.json`),
}));
const regencies = regencyGroups.flatMap(({ province, regencies: provinceRegencies }) =>
  provinceRegencies.map((regency) => ({ ...regency, provinceCode: province.code })),
);
const districtGroups = await mapWithConcurrency(regencies, async (regency) => ({
  regency,
  districts: await fetchData(`districts/${regency.code}.json`),
}));

const provinceNames = provinces.map((province) => province.name);
const citiesByProvince = Object.fromEntries(
  regencyGroups.map(({ province, regencies: provinceRegencies }) => [
    province.name,
    provinceRegencies.map((regency) => regency.name),
  ]),
);
const districtsByLocation = Object.fromEntries(
  districtGroups.map(({ regency, districts }) => [
    `${regency.provinceCode}::${regency.name}`,
    districts.map((district) => district.name),
  ]),
);
const provinceCodes = Object.fromEntries(
  provinces.map((province) => [province.name, province.code]),
);

const output = {
  meta: {
    source: 'https://wilayah.id',
    updatedAt: '2025-07-04',
    provinceCount: provinceNames.length,
    regencyCount: regencies.length,
    districtCount: districtGroups.reduce((total, group) => total + group.districts.length, 0),
  },
  provinces: provinceNames,
  provinceCodes,
  citiesByProvince,
  districtsByLocation,
};

await mkdir(dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(output)}\n`, 'utf8');
console.log(JSON.stringify(output.meta));
