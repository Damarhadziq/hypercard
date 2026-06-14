export const PROVINCES = [
  'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Kepulauan Riau',
  'Jambi', 'Sumatera Selatan', 'Kepulauan Bangka Belitung', 'Bengkulu',
  'Lampung', 'DKI Jakarta', 'Banten', 'Jawa Barat', 'Jawa Tengah',
  'DI Yogyakarta', 'Jawa Timur', 'Bali', 'Nusa Tenggara Barat',
  'Nusa Tenggara Timur', 'Kalimantan Barat', 'Kalimantan Tengah',
  'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara',
  'Sulawesi Utara', 'Gorontalo', 'Sulawesi Tengah', 'Sulawesi Barat',
  'Sulawesi Selatan', 'Sulawesi Tenggara', 'Maluku', 'Maluku Utara',
  'Papua Barat', 'Papua Barat Daya', 'Papua', 'Papua Selatan',
  'Papua Tengah', 'Papua Pegunungan',
] as const;

export const CITIES_BY_PROVINCE: Record<string, string[]> = {
  Aceh: ['Banda Aceh', 'Lhokseumawe'],
  'Sumatera Utara': ['Medan', 'Binjai', 'Pematangsiantar'],
  'Sumatera Barat': ['Padang', 'Bukittinggi'],
  Riau: ['Pekanbaru', 'Dumai'],
  'Kepulauan Riau': ['Batam', 'Tanjungpinang'],
  Jambi: ['Jambi'],
  'Sumatera Selatan': ['Palembang', 'Lubuklinggau'],
  'Kepulauan Bangka Belitung': ['Pangkalpinang'],
  Bengkulu: ['Bengkulu'],
  Lampung: ['Bandar Lampung', 'Metro'],
  'DKI Jakarta': ['Jakarta Barat', 'Jakarta Pusat', 'Jakarta Selatan', 'Jakarta Timur', 'Jakarta Utara'],
  Banten: ['Kota Tangerang', 'Tangerang Selatan', 'Kabupaten Tangerang', 'Serang', 'Cilegon'],
  'Jawa Barat': ['Bandung', 'Bekasi', 'Bogor', 'Depok', 'Cimahi', 'Cirebon', 'Sukabumi', 'Tasikmalaya'],
  'Jawa Tengah': ['Semarang', 'Surakarta', 'Magelang', 'Salatiga', 'Kabupaten Semarang', 'Tegal', 'Pekalongan'],
  'DI Yogyakarta': ['Kota Yogyakarta', 'Sleman', 'Bantul', 'Kulon Progo', 'Gunungkidul'],
  'Jawa Timur': ['Surabaya', 'Malang', 'Sidoarjo', 'Gresik', 'Kediri', 'Madiun', 'Mojokerto'],
  Bali: ['Denpasar', 'Badung', 'Gianyar'],
  'Nusa Tenggara Barat': ['Mataram', 'Lombok Barat'],
  'Nusa Tenggara Timur': ['Kupang'],
  'Kalimantan Barat': ['Pontianak', 'Singkawang'],
  'Kalimantan Tengah': ['Palangka Raya'],
  'Kalimantan Selatan': ['Banjarmasin', 'Banjarbaru'],
  'Kalimantan Timur': ['Samarinda', 'Balikpapan'],
  'Kalimantan Utara': ['Tarakan', 'Tanjung Selor'],
  'Sulawesi Utara': ['Manado', 'Bitung'],
  Gorontalo: ['Gorontalo'],
  'Sulawesi Tengah': ['Palu'],
  'Sulawesi Barat': ['Mamuju'],
  'Sulawesi Selatan': ['Makassar', 'Parepare'],
  'Sulawesi Tenggara': ['Kendari', 'Baubau'],
  Maluku: ['Ambon'],
  'Maluku Utara': ['Ternate', 'Tidore Kepulauan'],
  'Papua Barat': ['Manokwari'],
  'Papua Barat Daya': ['Sorong'],
  Papua: ['Jayapura'],
  'Papua Selatan': ['Merauke'],
  'Papua Tengah': ['Nabire'],
  'Papua Pegunungan': ['Wamena'],
};

export const DISTRICTS_BY_CITY: Record<string, string[]> = {
  Semarang: ['Banyumanik', 'Candisari', 'Gajahmungkur', 'Mijen', 'Ngaliyan', 'Pedurungan', 'Semarang Barat', 'Semarang Selatan', 'Semarang Tengah', 'Tembalang'],
  Sleman: ['Berbah', 'Depok', 'Gamping', 'Godean', 'Kalasan', 'Mlati', 'Ngaglik', 'Ngemplak', 'Prambanan', 'Sleman'],
  'Kota Yogyakarta': ['Danurejan', 'Gondokusuman', 'Gondomanan', 'Jetis', 'Kotagede', 'Mantrijeron', 'Mergangsan', 'Umbulharjo'],
  'Jakarta Barat': ['Cengkareng', 'Grogol Petamburan', 'Kalideres', 'Kebon Jeruk', 'Kembangan', 'Palmerah', 'Tambora', 'Taman Sari'],
  Surabaya: ['Asemrowo', 'Benowo', 'Bubutan', 'Dukuh Pakis', 'Genteng', 'Lakarsantri', 'Rungkut', 'Sambikerep', 'Sukolilo', 'Tegalsari'],
  Bandung: ['Andir', 'Antapani', 'Arcamanik', 'Buahbatu', 'Coblong', 'Lengkong', 'Sukajadi'],
  Medan: ['Medan Barat', 'Medan Baru', 'Medan Kota', 'Medan Selayang', 'Medan Timur'],
  Makassar: ['Biringkanaya', 'Panakkukang', 'Rappocini', 'Tamalate', 'Ujung Pandang'],
  Denpasar: ['Denpasar Barat', 'Denpasar Selatan', 'Denpasar Timur', 'Denpasar Utara'],
};

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
