'use client';

import { useAbbyChat } from '@/components/AbbyChatContext';
import AbbyRiveAvatar from '@/components/AbbyRiveAvatar';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import Image from 'next/image';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';

const transport = new DefaultChatTransport({ api: '/api/chat' });
const ABBY_AVATAR = '/abby-avatar.png';

function messageText(parts: { type: string; text?: string }[]): string {
  return parts
    .filter((part) => part.type === 'text' && part.text)
    .map((part) => part.text as string)
    .join('');
}

export default function Chatbot() {
  const { registerAskHandler, setAbbyThinking, waveAbby } = useAbbyChat();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sendPulse, setSendPulse] = useState(false);
  const [hasWaved, setHasWaved] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef('ready');

  const { messages, sendMessage, status, error, stop } = useChat({
    transport,
  });

  const isLoading = status === 'submitted' || status === 'streaming';
  statusRef.current = status;

  useEffect(() => {
    setAbbyThinking(isLoading);
  }, [isLoading, setAbbyThinking]);

  useEffect(() => {
    if (!open || hasWaved) return;
    waveAbby();
    setHasWaved(true);
  }, [open, hasWaved, waveAbby]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, open, status]);

  useEffect(() => {
    if (!sendPulse) return;
    const timer = window.setTimeout(() => setSendPulse(false), 420);
    return () => window.clearTimeout(timer);
  }, [sendPulse]);

  const askFromOutside = useCallback(
    (question: string) => {
      const text = question.trim();
      if (!text) return;
      setOpen(true);
      setProfileOpen(false);
      setSendPulse(true);
      const current = statusRef.current;
      if (current === 'submitted' || current === 'streaming') return;
      void sendMessage({ text });
    },
    [sendMessage],
  );

  useEffect(() => {
    registerAskHandler(askFromOutside);
    return () => registerAskHandler(null);
  }, [askFromOutside, registerAskHandler]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    setSendPulse(true);
    await sendMessage({ text });
  }

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col items-end gap-3 font-body">
      {/* Chat panel — smooth expand / collapse */}
      <section
        id="abby-chat"
        role="dialog"
        aria-label="Abby site guide chat"
        aria-hidden={!open}
        className={`origin-bottom-right w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-[18px] border border-abby-ink/10 bg-white shadow-[0_18px_48px_rgba(26,32,44,0.16)] transition-all duration-300 ease-out ${
          open
            ? 'pointer-events-auto mb-0 max-h-[min(520px,calc(100vh-6.5rem))] translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none mb-0 max-h-0 translate-y-3 scale-95 border-transparent opacity-0 shadow-none'
        } ${sendPulse ? 'animate-abby-send-bounce' : ''}`}
      >
        <div className="flex h-[min(520px,calc(100vh-6.5rem))] w-full flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-abby-ink/10 bg-[radial-gradient(ellipse_80%_120%_at_0%_0%,rgba(0,180,216,0.16),transparent_55%),radial-gradient(ellipse_70%_100%_at_100%_0%,rgba(255,107,74,0.14),transparent_50%),#FAF9F6] px-4 py-3">
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="group flex min-w-0 items-center gap-3 text-left transition-transform duration-200 hover:scale-[1.02]"
              aria-label="Open Abby profile"
            >
              <span className="relative shrink-0">
                <span
                  className={`block h-11 w-11 overflow-hidden rounded-full ring-2 ring-white transition-shadow duration-300 ${
                    isLoading
                      ? 'animate-abby-pulse-glow'
                      : 'shadow-[0_0_0_1px_rgba(0,180,216,0.25)]'
                  }`}
                >
                  <AbbyRiveAvatar
                    variant="thumb"
                    isThinking={isLoading}
                    className="rounded-full"
                    alt="Abby"
                  />
                </span>
                <span
                  className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-400"
                  title="Online"
                  aria-hidden
                />
              </span>
              <span className="min-w-0">
                <span className="block text-[0.72rem] font-semibold uppercase tracking-[0.04em] text-abby-sky-ink">
                  abcGEO guide
                </span>
                <span className="font-display text-[1.25rem] font-bold tracking-[-0.02em] text-abby-ink transition-colors group-hover:text-abby-coral">
                  Abby
                </span>
              </span>
            </button>

            <button
              type="button"
              className="rounded-full px-2 py-1 text-2xl leading-none text-abby-muted transition-colors duration-200 hover:bg-abby-ink/5 hover:text-abby-ink"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              ×
            </button>
          </header>

          <div
            ref={listRef}
            className="flex flex-1 flex-col gap-3 overflow-y-auto bg-gradient-to-b from-abby-cream to-abby-soft p-4"
          >
            {messages.length === 0 && (
              <div className="animate-abby-fade-up flex items-start gap-3 rounded-2xl border border-abby-ink/10 bg-white p-3 shadow-sm">
                <Image
                  src={ABBY_AVATAR}
                  alt=""
                  width={56}
                  height={56}
                  className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-abby-sky/20"
                />
                <div>
                  <p className="font-display text-base font-bold tracking-[-0.02em] text-abby-ink">
                    Welcome — I&apos;m Abby
                  </p>
                  <p className="mt-1 text-sm leading-snug text-abby-muted">
                    Ask me how to navigate abcGEO, or how to apply the{' '}
                    <span className="font-semibold text-abby-sky-ink">
                      A + B = GEO
                    </span>{' '}
                    framework to earn AI citations.
                  </p>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[92%] rounded-[14px] px-3.5 py-2.5 transition-transform duration-200 ${
                  message.role === 'user'
                    ? 'ml-auto border border-abby-sky/25 bg-abby-sky/10'
                    : 'border border-abby-ink/10 bg-white'
                }`}
              >
                <span className="block text-[0.7rem] font-semibold uppercase tracking-[0.03em] text-abby-muted">
                  {message.role === 'user' ? 'You' : 'Abby'}
                </span>
                <p className="mt-0.5 whitespace-pre-wrap text-[0.92rem] leading-snug text-abby-ink">
                  {messageText(message.parts)}
                </p>
              </div>
            ))}

            {status === 'submitted' && (
              <p className="text-sm text-abby-muted" role="status">
                Abby is thinking…
              </p>
            )}
            {error && (
              <p className="text-sm text-red-500" role="alert">
                Something went wrong. Try again in a moment.
              </p>
            )}
          </div>

          <form
            className="flex gap-2 border-t border-abby-ink/10 bg-white p-3"
            onSubmit={onSubmit}
          >
            <label className="sr-only" htmlFor="abby-input">
              Message Abby
            </label>
            <input
              id="abby-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about GEO or site pages…"
              disabled={status !== 'ready' && status !== 'error'}
              autoComplete="off"
              className="flex-1 rounded-full border border-abby-ink/15 bg-abby-cream px-4 py-2.5 text-[0.92rem] text-abby-ink outline-none transition-shadow duration-200 focus:border-abby-sky focus:shadow-[0_0_0_3px_rgba(0,180,216,0.16)]"
            />
            {isLoading ? (
              <button
                type="button"
                onClick={() => stop()}
                className="rounded-full bg-abby-ink px-4 py-2.5 font-display text-sm font-bold text-white transition-transform duration-200 hover:scale-[1.03]"
              >
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="rounded-full bg-abby-ink px-4 py-2.5 font-display text-sm font-bold text-white transition-all duration-200 hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
              >
                Send
              </button>
            )}
          </form>
        </div>
      </section>

      {/* Avatar launcher */}
      <div className="group relative">
        <span
          role="tooltip"
          className={`pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-abby-ink px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 ${
            open ? 'invisible' : ''
          }`}
        >
          Talk with Abby
          <span className="absolute left-full top-1/2 -ml-1 -translate-y-1/2 border-4 border-transparent border-l-abby-ink" />
        </span>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="abby-chat"
          aria-label={open ? 'Close Abby chat' : 'Talk with Abby'}
          title="Talk with Abby"
          className={`relative h-16 w-16 overflow-visible rounded-full transition-transform duration-300 ease-out hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-abby-coral ${
            sendPulse ? 'animate-abby-send-bounce' : ''
          } ${isLoading ? 'animate-abby-pulse-glow' : ''}`}
        >
          <span className="block h-full w-full overflow-hidden rounded-full shadow-[0_12px_32px_rgba(255,107,74,0.28)] ring-2 ring-white">
            <AbbyRiveAvatar
              variant="launcher"
              waveOnMount
              isThinking={isLoading}
              className="rounded-full"
              alt="Abby"
            />
          </span>
          {!open && (
            <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" />
          )}
        </button>
      </div>

      {/* Profile modal */}
      <div
        className={`fixed inset-0 z-[10000] flex items-center justify-center p-4 transition-all duration-300 ${
          profileOpen
            ? 'pointer-events-auto bg-abby-ink/45 opacity-100 backdrop-blur-[2px]'
            : 'pointer-events-none bg-abby-ink/0 opacity-0'
        }`}
        onClick={() => setProfileOpen(false)}
        role="presentation"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Abby profile"
          aria-hidden={!profileOpen}
          className={`w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-300 ease-out ${
            profileOpen
              ? 'translate-y-0 scale-100 opacity-100'
              : 'translate-y-4 scale-95 opacity-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative aspect-square w-full bg-abby-cream">
            <Image
              src={ABBY_AVATAR}
              alt="Abby"
              fill
              className="object-cover"
              sizes="24rem"
              priority
            />
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="font-display text-lg font-bold text-abby-ink">Abby</p>
              <p className="text-sm text-abby-muted">
                Your abcGEO site guide · A + B = GEO
              </p>
            </div>
            <button
              type="button"
              onClick={() => setProfileOpen(false)}
              className="rounded-full bg-abby-ink px-4 py-2 font-display text-sm font-bold text-white transition-transform duration-200 hover:scale-[1.03]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
