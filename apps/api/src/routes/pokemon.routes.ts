import { Router } from 'express';

const router = Router();
const POKEMON_TCG_API_URL = 'https://api.pokemontcg.io/v2';
const ALLOWED_QUERY_PARAMS = new Set(['q', 'page', 'pageSize', 'orderBy', 'select']);

async function proxyPokemonRequest(resource: 'cards' | 'sets', query: Record<string, unknown>) {
  const url = new URL(`${POKEMON_TCG_API_URL}/${resource}`);

  for (const [key, value] of Object.entries(query)) {
    if (!ALLOWED_QUERY_PARAMS.has(key) || typeof value !== 'string') continue;
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    signal: AbortSignal.timeout(20_000),
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const error = new Error(`Pokemon TCG API merespons ${response.status}`) as Error & { status?: number };
    error.status = response.status >= 500 ? 502 : response.status;
    throw error;
  }

  return response.json();
}

router.get('/cards', async (req, res) => {
  const result = await proxyPokemonRequest('cards', req.query);
  res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.json(result);
});

router.get('/sets', async (req, res) => {
  const result = await proxyPokemonRequest('sets', req.query);
  res.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.json(result);
});

export default router;
