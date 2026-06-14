import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Check, ChevronLeft, ChevronRight, LoaderCircle, Search, X } from 'lucide-react';
import { Button, Input } from '@pokemon-finance/ui';
import CleanSelect, { type CleanSelectOption } from './CleanSelect';
import { FALLBACK_POKEMON_SETS, fetchPokemonSets, getSetLocalLabel, searchPokemonCards, type PokemonTcgCard, type PokemonTcgSet } from '../lib/pokemonTcg';

interface PokemonCardPickerProps {
  selectedCard?: PokemonTcgCard | null;
  currentName?: string;
  currentSet?: string;
  currentImage?: string;
  onSelect: (card: PokemonTcgCard) => void;
}

export default function PokemonCardPicker({
  selectedCard,
  currentName,
  currentSet,
  currentImage,
  onSelect,
}: PokemonCardPickerProps) {
  const [query, setQuery] = useState('');
  const [setFilter, setSetFilter] = useState('');
  const [sets, setSets] = useState<PokemonTcgSet[]>(FALLBACK_POKEMON_SETS);
  const [isLoadingSets, setIsLoadingSets] = useState(true);
  const [results, setResults] = useState<PokemonTcgCard[]>([]);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');
  const [lastSearchedSet, setLastSearchedSet] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchRequestIdRef = useRef(0);
  const pageSize = 24;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));

  const setOptions = useMemo<CleanSelectOption[]>(() => [
    { value: '', label: 'Semua set' },
    ...sets.map((set) => {
      const localLabel = getSetLocalLabel(set.name);
      return {
        value: set.name,
        label: set.name,
        description: localLabel || set.series,
      };
    }),
  ], [sets]);

  useEffect(() => {
    const controller = new AbortController();
    fetchPokemonSets(controller.signal)
      .then(setSets)
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingSets(false);
      });

    return () => {
      controller.abort();
      abortControllerRef.current?.abort();
    };
  }, []);

  const runSearch = async (nextPage: number) => {
    const normalizedQuery = query.trim();
    const normalizedSet = setFilter.trim();
    if (normalizedQuery.length < 2) {
      setResults([]);
      setTotalResults(0);
      setPage(1);
      setError('');
      setLastSearchedQuery('');
      setLastSearchedSet('');
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;

    setIsLoading(true);
    setError('');
    setLastSearchedQuery(normalizedQuery);
    setLastSearchedSet(normalizedSet);

    try {
      const result = await searchPokemonCards(
        normalizedQuery,
        { setName: normalizedSet || undefined, page: nextPage, pageSize },
        controller.signal,
      );
      if (searchRequestIdRef.current !== requestId || controller.signal.aborted) return;
      setResults(result.data);
      setTotalResults(result.totalCount);
      setPage(result.page);
    } catch (requestError) {
      if (searchRequestIdRef.current === requestId && (requestError as Error).name !== 'AbortError') {
        setError('Database kartu sedang tidak dapat diakses. Coba lagi.');
      }
    } finally {
      if (searchRequestIdRef.current === requestId) setIsLoading(false);
    }
  };

  const handleSearch = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    await runSearch(1);
  };

  const handlePageChange = async (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || isLoading) return;
    await runSearch(nextPage);
  };

  const handleClearSearch = () => {
    abortControllerRef.current?.abort();
    searchRequestIdRef.current += 1;
    setQuery('');
    setSetFilter('');
    setResults([]);
    setTotalResults(0);
    setPage(1);
    setError('');
    setIsLoading(false);
    setLastSearchedQuery('');
    setLastSearchedSet('');
  };

  const hasCurrentCard = selectedCard || currentName;
  const displayedName = selectedCard?.name || currentName;
  const displayedSet = selectedCard?.set.name || currentSet;
  const displayedImage = selectedCard?.images.small || currentImage;

  return (
    <div className="space-y-3">
      {hasCurrentCard && (
        <div className="flex items-center gap-3 rounded-lg border border-finance-200 bg-finance-50 p-3">
          <div className="h-24 w-16 shrink-0 overflow-hidden rounded-md border border-finance-200 bg-white">
            {displayedImage ? (
              <img src={displayedImage} alt={displayedName} className="h-full w-full object-contain" />
            ) : (
              <div className="flex h-full items-center justify-center text-xl font-bold text-finance-400">
                {displayedName?.charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold text-finance-950">{displayedName}</p>
            <p className="mt-1 truncate text-sm text-finance-500">{displayedSet || 'Set tidak tersedia'}</p>
            <p className="mt-2 text-xs font-semibold text-green-700">Data kartu terpilih</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSearch} className="grid gap-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto]">
        <div className="relative min-w-0 flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-finance-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={hasCurrentCard ? 'Cari untuk mengganti kartu...' : 'Cari nama kartu, contoh: Charizard ex'}
            className="h-11 pl-10 pr-10"
          />
          {query && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-finance-400 hover:bg-finance-100 hover:text-finance-900"
              aria-label="Hapus pencarian kartu"
            >
              <X size={15} />
            </button>
          )}
        </div>
        <div className="min-w-0">
          <CleanSelect
            value={setFilter}
            onChange={setSetFilter}
            options={setOptions}
            placeholder={isLoadingSets ? 'Memuat set...' : 'Semua set'}
            searchable
            searchPlaceholder="Cari set, contoh: 151 / Gemilang Terastal"
          />
        </div>
        <Button type="submit" className="h-11 shrink-0 gap-2 px-4" disabled={isLoading || query.trim().length < 2}>
          <Search size={16} />
          <span>Cari</span>
        </Button>
      </form>

      {isLoading && results.length === 0 && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-finance-500">
          <LoaderCircle size={18} className="animate-spin" />
          Mencari kartu...
        </div>
      )}

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}

      {!isLoading && !error && lastSearchedQuery && results.length === 0 && (
        <p className="py-6 text-center text-sm text-finance-500">Kartu tidak ditemukan.</p>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 rounded-lg border border-finance-100 bg-finance-50/70 px-3 py-2 text-xs text-finance-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {totalResults.toLocaleString('id-ID')} hasil untuk "{lastSearchedQuery}"{lastSearchedSet ? ` di set "${lastSearchedSet}"` : ''}
              {isLoading && <span className="ml-2 inline-flex items-center gap-1 text-finance-400"><LoaderCircle size={13} className="animate-spin" />Memuat</span>}
            </span>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={isLoading || page <= 1}
                onClick={() => void handlePageChange(page - 1)}
                aria-label="Halaman kartu sebelumnya"
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="min-w-16 text-center font-semibold text-finance-800">{page} / {totalPages}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={isLoading || page >= totalPages}
                onClick={() => void handlePageChange(page + 1)}
                aria-label="Halaman kartu berikutnya"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>

          <div className="styled-scrollbar grid max-h-80 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
            {results.map((card) => {
              const isSelected = selectedCard?.id === card.id;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => {
                    onSelect(card);
                    setQuery('');
                    setSetFilter('');
                    setResults([]);
                    setTotalResults(0);
                    setPage(1);
                    setLastSearchedQuery('');
                    setLastSearchedSet('');
                  }}
                  className={`group relative overflow-hidden rounded-lg border bg-white p-2 text-left transition-all hover:border-finance-400 hover:shadow-md active:bg-finance-50 ${
                    isSelected ? 'border-finance-950' : 'border-finance-200'
                  }`}
                >
                  <div className="mx-auto aspect-[2.5/3.5] w-full overflow-hidden rounded bg-finance-50">
                    <img src={card.images.small} alt={card.name} loading="lazy" className="h-full w-full object-contain transition-transform group-hover:scale-[1.03]" />
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs font-bold leading-4 text-finance-950">{card.name}</p>
                  <p className="mt-1 truncate text-[11px] text-finance-500">{card.set.name}</p>
                  {isSelected && (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[#080808]">
                      <Check size={14} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
