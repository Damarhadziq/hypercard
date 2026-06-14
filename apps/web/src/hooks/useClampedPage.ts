import { useEffect, type Dispatch, type SetStateAction } from 'react';

export default function useClampedPage(
  page: number,
  totalPages: number,
  setPage: Dispatch<SetStateAction<number>>,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled || page <= totalPages) return;

    const frame = window.requestAnimationFrame(() => {
      setPage(totalPages);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [enabled, page, setPage, totalPages]);
}
