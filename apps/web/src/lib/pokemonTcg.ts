import { API_ROOT } from '../services/config';

export interface PokemonTcgCard {
  id: string;
  name: string;
  number: string;
  set: {
    id: string;
    name: string;
    releaseDate?: string;
  };
  images: {
    small: string;
    large: string;
  };
}

export interface PokemonTcgSet {
  id: string;
  name: string;
  series: string;
  releaseDate?: string;
  printedTotal?: number;
  total?: number;
}

interface PokemonTcgResponse {
  data: PokemonTcgCard[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}

interface PokemonTcgSetsResponse {
  data: PokemonTcgSet[];
}

export interface PokemonTcgSearchResult {
  data: PokemonTcgCard[];
  page: number;
  pageSize: number;
  totalCount: number;
}

const API_URL = `${API_ROOT}/pokemon/cards`;
const SETS_URL = `${API_ROOT}/pokemon/sets`;
const PAGE_SIZE = 24;
const REQUEST_TIMEOUT_MS = 12000;
const searchCache = new Map<string, PokemonTcgSearchResult>();
const pendingSearches = new Map<string, Promise<PokemonTcgSearchResult>>();
let setCache: PokemonTcgSet[] | null = null;

export const FALLBACK_POKEMON_SETS: PokemonTcgSet[] = [
  { id: 'fallback-chaos-rising', name: 'Chaos Rising', series: 'Mega Evolution', releaseDate: '2026/05/22' },
  { id: 'fallback-perfect-order', name: 'Perfect Order', series: 'Mega Evolution', releaseDate: '2026/03/27' },
  { id: 'fallback-ascended-heroes', name: 'Ascended Heroes', series: 'Mega Evolution', releaseDate: '2026/01/30' },
  { id: 'fallback-phantasmal-flames', name: 'Phantasmal Flames', series: 'Mega Evolution', releaseDate: '2025/11/14' },
  { id: 'fallback-mega-evolution', name: 'Mega Evolution', series: 'Mega Evolution', releaseDate: '2025/09/26' },
  { id: 'fallback-white-flare', name: 'White Flare', series: 'Scarlet & Violet', releaseDate: '2025/07/18' },
  { id: 'fallback-black-bolt', name: 'Black Bolt', series: 'Scarlet & Violet', releaseDate: '2025/07/18' },
  { id: 'fallback-destined-rivals', name: 'Destined Rivals', series: 'Scarlet & Violet', releaseDate: '2025/05/30' },
  { id: 'fallback-journey-together', name: 'Journey Together', series: 'Scarlet & Violet', releaseDate: '2025/03/28' },
  { id: 'fallback-prismatic-evolutions', name: 'Prismatic Evolutions', series: 'Scarlet & Violet', releaseDate: '2025/01/17' },
  { id: 'fallback-surging-sparks', name: 'Surging Sparks', series: 'Scarlet & Violet', releaseDate: '2024/11/08' },
  { id: 'fallback-stellar-crown', name: 'Stellar Crown', series: 'Scarlet & Violet', releaseDate: '2024/09/13' },
  { id: 'fallback-shrouded-fable', name: 'Shrouded Fable', series: 'Scarlet & Violet', releaseDate: '2024/08/02' },
  { id: 'fallback-twilight-masquerade', name: 'Twilight Masquerade', series: 'Scarlet & Violet', releaseDate: '2024/05/24' },
  { id: 'fallback-temporal-forces', name: 'Temporal Forces', series: 'Scarlet & Violet', releaseDate: '2024/03/22' },
  { id: 'fallback-paldean-fates', name: 'Paldean Fates', series: 'Scarlet & Violet', releaseDate: '2024/01/26' },
  { id: 'fallback-paradox-rift', name: 'Paradox Rift', series: 'Scarlet & Violet', releaseDate: '2023/11/03' },
  { id: 'fallback-151', name: 'Scarlet & Violet 151', series: 'Scarlet & Violet', releaseDate: '2023/09/22' },
  { id: 'fallback-obsidian-flames', name: 'Obsidian Flames', series: 'Scarlet & Violet', releaseDate: '2023/08/11' },
  { id: 'fallback-paldea-evolved', name: 'Paldea Evolved', series: 'Scarlet & Violet', releaseDate: '2023/06/09' },
  { id: 'fallback-scarlet-violet', name: 'Scarlet & Violet', series: 'Scarlet & Violet', releaseDate: '2023/03/31' },
];

const INDONESIAN_SET_ALIASES: Record<string, string> = {
  'evolusi prismatik': 'Prismatic Evolutions',
  'prisma evolusi': 'Prismatic Evolutions',
  'gemilang terastal': 'Prismatic Evolutions',
  'topeng senja': 'Twilight Masquerade',
  'topeng oger': 'Twilight Masquerade',
  'api obsidian': 'Obsidian Flames',
  'evolusi paldea': 'Paldea Evolved',
  'retakan paradoks': 'Paradox Rift',
  'kekuatan temporal': 'Temporal Forces',
  'mahkota stellar': 'Stellar Crown',
  'mahkota bintang': 'Stellar Crown',
  'percikan surging': 'Surging Sparks',
  'percikan listrik': 'Surging Sparks',
  'fabel terselubung': 'Shrouded Fable',
  'legenda terselubung': 'Shrouded Fable',
  'perjalanan bersama': 'Journey Together',
  'rival takdir': 'Destined Rivals',
  'takdir rival': 'Destined Rivals',
  'baut hitam': 'Black Bolt',
  'kobaran putih': 'White Flare',
  'mega evolusi': 'Mega Evolution',
  'pahlawan meningkat': 'Ascended Heroes',
  'kekacauan bangkit': 'Chaos Rising',
};

const SET_INDONESIAN_LABELS: Record<string, string> = Object.entries(INDONESIAN_SET_ALIASES).reduce<Record<string, string>>(
  (acc, [alias, setName]) => {
    acc[setName] = acc[setName] ? `${acc[setName]}, ${alias}` : alias;
    return acc;
  },
  {},
);

function normalizeSetAlias(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b(indo|indonesia|id|versi|version|pokemon|tcg|kartu)\b/g, ' ')
    .replace(/[^\p{L}\p{N}\s&'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveSetName(setName?: string) {
  const normalizedSetName = normalizeSetAlias(setName ?? '');
  if (!normalizedSetName) return '';
  return INDONESIAN_SET_ALIASES[normalizedSetName] ?? setName!.trim();
}

function getTimeoutSignal(parentSignal?: AbortSignal) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  if (parentSignal) {
    if (parentSignal.aborted) controller.abort();
    parentSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  return {
    signal: controller.signal,
    cancel: () => window.clearTimeout(timer),
  };
}

function buildSetTerms(setName: string) {
  const exactTerm = `set.name:"${setName.replace(/"/g, '\\"')}"`;
  const wordTerms = setName
    .replace(/[^\p{L}\p{N}\s&'-]/gu, ' ')
    .split(/\s+/)
    .filter((term) => term.length > 1 && !['scarlet', 'violet', 'mega', 'evolution'].includes(term.toLowerCase()))
    .map((term) => `set.name:${term}*`);

  return wordTerms.length > 0 ? `(${exactTerm} OR ${wordTerms.join(' ')})` : exactTerm;
}

export function getSetLocalLabel(setName: string) {
  return SET_INDONESIAN_LABELS[setName] ?? '';
}

export async function fetchPokemonSets(signal?: AbortSignal) {
  if (setCache) return setCache;

  const params = new URLSearchParams({
    orderBy: '-releaseDate',
    select: 'id,name,series,releaseDate,printedTotal,total',
  });
  const timeout = getTimeoutSignal(signal);
  const response = await fetch(`${SETS_URL}?${params.toString()}`, { signal: timeout.signal });
  try {
    if (!response.ok) {
      throw new Error(`Pokemon TCG API merespons ${response.status}`);
    }
  } finally {
    timeout.cancel();
  }

  const result = await response.json() as PokemonTcgSetsResponse;
  const setsByName = new Map<string, PokemonTcgSet>();
  [...result.data, ...FALLBACK_POKEMON_SETS].forEach((set) => {
    setsByName.set(set.name, set);
  });
  setCache = Array.from(setsByName.values()).sort((left, right) => {
    const leftDate = left.releaseDate ? new Date(left.releaseDate).getTime() : 0;
    const rightDate = right.releaseDate ? new Date(right.releaseDate).getTime() : 0;
    return rightDate - leftDate;
  });
  return setCache;
}

export async function searchPokemonCards(
  query: string,
  options: { setName?: string; page?: number; pageSize?: number } = {},
  signal?: AbortSignal,
) {
  const normalizedQuery = query.trim().toLowerCase();
  const resolvedSetName = resolveSetName(options.setName);
  const normalizedSetName = normalizeSetAlias(resolvedSetName);
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? PAGE_SIZE;
  const nameTerms = query
    .trim()
    .replace(/[^\p{L}\p{N}\s.'-]/gu, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => `name:${term}*`)
    .join(' ');
  const setTerm = resolvedSetName
    ? buildSetTerms(resolvedSetName)
    : '';
  const terms = [nameTerms, setTerm].filter(Boolean).join(' ');

  if (!terms) {
    return {
      data: [],
      page,
      pageSize,
      totalCount: 0,
    };
  }
  if (!nameTerms) {
    return {
      data: [],
      page,
      pageSize,
      totalCount: 0,
    };
  }

  const cacheKey = `${normalizedQuery}|${normalizedSetName}|${page}|${pageSize}`;
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }

  const pendingSearch = pendingSearches.get(cacheKey);
  if (pendingSearch) return pendingSearch;

  const request = fetchPokemonCardsPage(terms, page, pageSize, signal)
    .then((result) => {
      searchCache.set(cacheKey, result);
      return result;
    })
    .finally(() => {
      pendingSearches.delete(cacheKey);
    });

  pendingSearches.set(cacheKey, request);
  return request;
}

async function fetchPokemonCardsPage(terms: string, page: number, pageSize: number, signal?: AbortSignal) {
  const params = new URLSearchParams({
    q: terms,
    page: String(page),
    pageSize: String(pageSize),
    orderBy: '-set.releaseDate',
    select: 'id,name,number,set,images',
  });

  const timeout = getTimeoutSignal(signal);
  const response = await fetch(`${API_URL}?${params.toString()}`, { signal: timeout.signal });
  try {
    if (!response.ok) {
      throw new Error(`Pokemon TCG API merespons ${response.status}`);
    }
  } finally {
    timeout.cancel();
  }

  const result = await response.json() as PokemonTcgResponse;
  return {
    data: result.data,
    page: result.page,
    pageSize: result.pageSize,
    totalCount: result.totalCount,
  };
}
