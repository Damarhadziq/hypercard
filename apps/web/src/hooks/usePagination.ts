import { useMemo, useState } from 'react';

export default function usePagination<T>(items: T[], initialPageSize = 10) {
  const [requestedPage, setRequestedPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(requestedPage, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return {
    page,
    pageSize,
    totalPages,
    paginatedItems,
    setPage: (nextPage: number) => setRequestedPage(Math.max(1, Math.min(nextPage, totalPages))),
    setPageSize: (size: number) => {
      setPageSizeState(size);
      setRequestedPage(1);
    },
  };
}
