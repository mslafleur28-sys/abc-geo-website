'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';

type AskHandler = (question: string) => void;

type MotionListener = {
  onWave?: () => void;
  onPoint?: () => void;
  onThinking?: (value: boolean) => void;
};

type AbbyChatContextValue = {
  askAbby: (question: string) => void;
  registerAskHandler: (handler: AskHandler | null) => void;
  /** Fire Abby's wave trigger (welcome / first open). */
  waveAbby: () => void;
  /** Fire Abby's point trigger (suggestion bubbles). */
  pointAbby: () => void;
  /** Sync isThinking boolean on the AbbyState machine. */
  setAbbyThinking: (value: boolean) => void;
  subscribeMotion: (listener: MotionListener) => () => void;
};

const AbbyChatContext = createContext<AbbyChatContextValue | null>(null);

export function AbbyChatProvider({ children }: { children: ReactNode }) {
  const handlerRef = useRef<AskHandler | null>(null);
  const listenersRef = useRef(new Set<MotionListener>());

  const registerAskHandler = useCallback((handler: AskHandler | null) => {
    handlerRef.current = handler;
  }, []);

  const subscribeMotion = useCallback((listener: MotionListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const waveAbby = useCallback(() => {
    listenersRef.current.forEach((l) => l.onWave?.());
  }, []);

  const pointAbby = useCallback(() => {
    listenersRef.current.forEach((l) => l.onPoint?.());
  }, []);

  const setAbbyThinking = useCallback((value: boolean) => {
    listenersRef.current.forEach((l) => l.onThinking?.(value));
  }, []);

  const askAbby = useCallback(
    (question: string) => {
      const text = question.trim();
      if (!text) return;
      pointAbby();
      handlerRef.current?.(text);
    },
    [pointAbby],
  );

  const value = useMemo(
    () => ({
      askAbby,
      registerAskHandler,
      waveAbby,
      pointAbby,
      setAbbyThinking,
      subscribeMotion,
    }),
    [
      askAbby,
      registerAskHandler,
      waveAbby,
      pointAbby,
      setAbbyThinking,
      subscribeMotion,
    ],
  );

  return (
    <AbbyChatContext.Provider value={value}>{children}</AbbyChatContext.Provider>
  );
}

export function useAbbyChat() {
  const ctx = useContext(AbbyChatContext);
  if (!ctx) {
    throw new Error('useAbbyChat must be used within AbbyChatProvider');
  }
  return ctx;
}
