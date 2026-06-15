import { useEffect, useMemo, useRef, useState } from 'react';

export default function usePagination<T>(items: T[], initialPageSize = 10) {
  const [requestedPage, setRequestedPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [isLoading, setIsLoading] = useState(false);
  const transitionTimerRef = useRef<number | null>(null);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(requestedPage, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  useEffect(() => () => {
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
    }
  }, []);

  const beginTransition = (update: () => void) => {
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
    }
    setIsLoading(true);
    update();
    transitionTimerRef.current = window.setTimeout(() => {
      setIsLoading(false);
      transitionTimerRef.current = null;
    }, 220);
  };

  return {
    page,
    pageSize,
    totalPages,
    paginatedItems,
    isLoading,
    setPage: (nextPage: number) => beginTransition(() => {
      setRequestedPage(Math.max(1, Math.min(nextPage, totalPages)));
    }),
    setPageSize: (size: number) => {
      beginTransition(() => {
        setPageSizeState(size);
        setRequestedPage(1);
      });
    },
  };
}
