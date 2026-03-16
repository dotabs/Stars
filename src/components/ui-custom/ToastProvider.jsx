import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { ToastContext } from '@/components/ui-custom/toast-context';

function getToastIcon(variant) {
  if (variant === 'success') {
    return CheckCircle2;
  }

  if (variant === 'destructive') {
    return TriangleAlert;
  }

  return Info;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    if (!toasts.length) {
      return () => {};
    }

    const timeoutIds = toasts.map((toast) =>
      window.setTimeout(() => {
        setToasts((current) => current.filter((entry) => entry.id !== toast.id));
      }, toast.duration)
    );

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [toasts]);

  const value = useMemo(
    () => ({
      toast({ title, description = '', variant = 'default', duration = 2800 }) {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setToasts((current) => [...current, { id, title, description, variant, duration }]);
      },
    }),
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-full max-w-sm flex-col gap-3 px-4 sm:bottom-6 sm:right-6 sm:px-0">
        {toasts.map((toast) => {
          const Icon = getToastIcon(toast.variant);

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto overflow-hidden rounded-[1.35rem] border px-4 py-4 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl ${
                toast.variant === 'success'
                  ? 'border-emerald-500/25 bg-[rgba(12,29,22,0.92)]'
                  : toast.variant === 'destructive'
                    ? 'border-red-500/25 bg-[rgba(34,14,16,0.92)]'
                    : 'border-white/10 bg-[rgba(16,13,18,0.92)]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 rounded-full p-2 ${
                    toast.variant === 'success'
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : toast.variant === 'destructive'
                        ? 'bg-red-500/15 text-red-200'
                        : 'bg-[#d26d47]/15 text-[#f4b684]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">{toast.title}</p>
                  {toast.description ? (
                    <p className="mt-1 text-sm leading-5 text-white/65">{toast.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setToasts((current) => current.filter((entry) => entry.id !== toast.id));
                  }}
                  className="rounded-full p-1 text-white/45 transition-colors hover:text-white"
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
