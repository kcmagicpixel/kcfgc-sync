import { type ReactNode, useState } from "react";
import {
  Button,
  Dialog,
  DialogTrigger,
  Heading,
  Modal,
  ModalOverlay,
} from "react-aria-components";

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "destructive" | "default";
  onConfirm: () => void | Promise<void>;
  children: ReactNode;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  variant = "destructive",
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <DialogTrigger>
      {children}
      <ModalOverlay className="fixed inset-0 z-50 bg-black/40">
        <Modal className="fixed inset-0 z-50 flex items-center justify-center">
          <Dialog className="w-full max-w-sm border border-foreground bg-card p-6 shadow-xs outline-none">
            {({ close }) => (
              <>
                <Heading
                  slot="title"
                  className="text-lg font-bold text-foreground"
                >
                  {title}
                </Heading>
                <p className="mt-2 text-sm text-muted-foreground">
                  {description}
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    onPress={close}
                    className="cursor-pointer border border-foreground bg-background px-4 py-2 text-sm font-medium text-foreground shadow-xs hover:bg-accent pressed:translate-x-px pressed:translate-y-px pressed:shadow-none"
                  >
                    Cancel
                  </Button>
                  <Button
                    onPress={async () => {
                      setConfirming(true);
                      try {
                        await onConfirm();
                        close();
                      } finally {
                        setConfirming(false);
                      }
                    }}
                    isDisabled={confirming}
                    className={`cursor-pointer border px-4 py-2 text-sm font-medium shadow-xs pressed:translate-x-px pressed:translate-y-px pressed:shadow-none disabled:opacity-50 ${
                      variant === "destructive"
                        ? "border-destructive bg-destructive/10 text-destructive hover:bg-destructive/20"
                        : "border-foreground bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    {confirming ? "..." : confirmLabel}
                  </Button>
                </div>
              </>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}
