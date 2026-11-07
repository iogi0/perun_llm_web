import { useLayoutEffect, useRef } from "react";

interface ConfirmDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({ open, onCancel, onConfirm }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const buttonClass =
    "min-h-11 cursor-pointer rounded-[10px] px-4 font-medium lg:min-h-10 pointer-coarse:min-h-11";

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="confirm-title"
      onClose={onCancel}
      className="m-auto w-[calc(100vw-2rem)] max-w-sm rounded-[16px] border border-line bg-surface p-5 text-ink"
    >
      <h2 id="confirm-title" className="text-[18px] font-medium">
        Delete conversation?
      </h2>
      <p className="mt-1 text-ink-muted">This can&apos;t be undone.</p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className={`${buttonClass} border border-line hover:bg-bubble`}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`${buttonClass} bg-danger text-canvas`}
        >
          Delete
        </button>
      </div>
    </dialog>
  );
}
