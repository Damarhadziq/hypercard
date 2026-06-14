import { useEffect } from 'react';

export default function useAppScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;

    const scrollContainer = document.querySelector<HTMLElement>('.app-content-scroll');
    if (!scrollContainer) return;

    const previousOverflow = scrollContainer.style.overflowY;
    const previousOverscroll = scrollContainer.style.overscrollBehavior;
    scrollContainer.style.overflowY = 'hidden';
    scrollContainer.style.overscrollBehavior = 'none';

    return () => {
      scrollContainer.style.overflowY = previousOverflow;
      scrollContainer.style.overscrollBehavior = previousOverscroll;
    };
  }, [active]);
}
