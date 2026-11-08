import { useEffect, useLayoutEffect, useRef } from "react";
import { Sidebar } from "./Sidebar";

const DESKTOP_QUERY = "(min-width: 1024px)";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP_QUERY);
    const closeOnDesktop = () => {
      if (desktop.matches) onClose();
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      data-drawer
      aria-label="Menu"
      onClose={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="drawer m-0 h-dvh max-h-none w-[85vw] max-w-80 bg-sidebar p-0 text-ink"
    >
      {open && <Sidebar onNavigate={onClose} />}
    </dialog>
  );
}
