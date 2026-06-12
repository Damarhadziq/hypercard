import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface SideDrawerProps {
  children: ReactNode | ((requestClose: () => void) => ReactNode);
  onClose: () => void;
  onBeforeClose?: () => boolean | Promise<boolean>;
  widthClassName?: string;
}

export default function SideDrawer({ children, onClose, onBeforeClose, widthClassName = 'md:max-w-3xl' }: SideDrawerProps) {
  const [isClosing, setIsClosing] = useState(false);

  const requestClose = useCallback(async () => {
    if (isClosing) return;

    const canClose = await onBeforeClose?.();
    if (canClose === false) return;

    setIsClosing(true);
    window.setTimeout(onClose, 190);
  }, [isClosing, onBeforeClose, onClose]);

  return createPortal(
    <div className={`premium-dark fixed left-0 top-0 z-[999] flex h-screen min-h-screen w-screen justify-end bg-[#050506]/45 backdrop-blur-[4px] ${isClosing ? 'animate-drawer-backdrop-out' : 'animate-fade-in'}`}>
      <button
        type="button"
        className="hidden flex-1 cursor-pointer md:block"
        onClick={requestClose}
        aria-label="Tutup panel"
      />
      <aside className={`side-drawer-panel isolate h-[100dvh] min-h-0 w-[100dvw] max-w-none overflow-x-hidden overflow-y-auto border-l border-finance-200 bg-finance-50 shadow-[-18px_0_40px_rgba(0,0,0,0.42)] md:h-screen md:min-h-screen md:w-full ${isClosing ? 'animate-drawer-out' : 'animate-drawer-in'} ${widthClassName}`}>
        {typeof children === 'function' ? children(requestClose) : children}
      </aside>
    </div>,
    document.body,
  );
}
