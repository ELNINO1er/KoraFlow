"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { X, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "danger";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toast: (t: Omit<ToastItem, "id">) => void;
}

const ToastContext = React.createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return React.useContext(ToastContext);
}

// Source d'id monotone (évite Date.now()/Math.random() interdits en rendu).
let toastCounter = 0;

const ICONS: Record<ToastVariant, React.ElementType> = {
  default: Info,
  success: CheckCircle2,
  danger: AlertTriangle,
};

const TONE: Record<ToastVariant, string> = {
  default: "text-accent",
  success: "text-success",
  danger: "text-danger",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback((t: Omit<ToastItem, "id">) => {
    toastCounter += 1;
    setItems((prev) => [...prev, { id: toastCounter, ...t }]);
  }, []);

  const remove = React.useCallback((id: number) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right" duration={5000}>
        {children}
        {items.map((item) => {
          const Icon = ICONS[item.variant ?? "default"];
          return (
            <ToastPrimitive.Root
              key={item.id}
              duration={item.duration}
              onOpenChange={(open) => {
                if (!open) remove(item.id);
              }}
              className={cn(
                "flex items-start gap-3 rounded-xl border border-border bg-surface p-4 shadow-e3",
                "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-right-full data-[swipe=end]:animate-out",
              )}
            >
              <Icon className={cn("mt-0.5 size-5 shrink-0", TONE[item.variant ?? "default"])} />
              <div className="flex-1">
                <ToastPrimitive.Title className="text-sm font-semibold text-foreground">
                  {item.title}
                </ToastPrimitive.Title>
                {item.description ? (
                  <ToastPrimitive.Description className="mt-0.5 text-sm text-muted-foreground">
                    {item.description}
                  </ToastPrimitive.Description>
                ) : null}
              </div>
              <ToastPrimitive.Close
                aria-label="Fermer"
                className="rounded-md p-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-4" />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          );
        })}
        <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[60] flex w-full max-w-sm flex-col gap-2 p-4 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
