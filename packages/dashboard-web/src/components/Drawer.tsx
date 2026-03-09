import { useEffect, type ReactNode } from "react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Drawer({ open, onClose, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col bg-card">
        <div className="flex items-center border-b border-foreground px-4 py-2">
          <button
            onClick={onClose}
            className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            &larr; Back
          </button>
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto p-4 gap-2">
          {children}
        </div>
      </div>
    </div>
  );
}
