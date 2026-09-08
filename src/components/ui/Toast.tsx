'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ToastTone = 'success' | 'info' | 'error';

export type ToastItem = {
  id: string;
  title: string;
  description?: string;
  tone?: ToastTone;
};

type ToastContextValue = {
  toasts: ToastItem[];
  toast: (item: Omit<ToastItem, 'id'> & { id?: string }) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneClasses: Record<ToastTone, string> = {
  success: 'border-[#00C9A7]/40 bg-[#F0FDF9] text-abby-ink',
  info: 'border-[rgba(0,180,216,0.35)] bg-[#F0FBFE] text-abby-ink',
  error: 'border-[#EF4444]/35 bg-[#FEF2F2] text-abby-ink',
};

const toneDot: Record<ToastTone, string> = {
  success: 'bg-[#00C9A7]',
  info: 'bg-abby-sky',
  error: 'bg-[#EF4444]',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((item: Omit<ToastItem, 'id'> & { id?: string }) => {
    const id = item.id ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [
      ...current,
      {
        id,
        title: item.title,
        description: item.description,
        tone: item.tone ?? 'success',
      },
    ]);
  }, []);

  const value = useMemo(
    () => ({ toasts, toast, dismiss }),
    [toasts, toast, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  const labelId = useId();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex flex-col items-end gap-3 p-4 sm:p-6"
      aria-live="polite"
      aria-relevant="additions"
    >
      <h2 id={labelId} className="sr-only">
        Notifications
      </h2>
      <ul aria-labelledby={labelId} className="flex w-full max-w-sm flex-col gap-3">
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={onDismiss} />
        ))}
      </ul>
    </div>
  );
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const tone = item.tone ?? 'success';

  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(item.id), 4200);
    return () => window.clearTimeout(timer);
  }, [item.id, onDismiss]);

  return (
    <li
      role="status"
      className={[
        'pointer-events-auto animate-abby-fade-up rounded-xl border p-4 shadow-lg',
        toneClasses[tone],
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <span
          className={['mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', toneDot[tone]].join(
            ' ',
          )}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{item.title}</p>
          {item.description ? (
            <p className="mt-1 text-sm text-abby-muted">{item.description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(item.id)}
          className="rounded-md px-1.5 py-0.5 text-sm text-abby-muted transition hover:bg-black/5 hover:text-abby-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-abby-sky"
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
    </li>
  );
}
