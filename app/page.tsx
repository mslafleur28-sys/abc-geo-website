'use client';

import { useAbbyChat } from '@/components/AbbyChatContext';
import AbbyRiveAvatar from '@/components/AbbyRiveAvatar';
import Image from 'next/image';
import { useEffect, useState } from 'react';

const SUGGESTIONS = [
  'What is the A + B = GEO framework?',
  'Where can I try INSTASTACK?',
  'How do I write answer-first content for AI Overviews?',
  'What tools does abcGEO offer?',
  'How do I earn ChatGPT citations?',
] as const;

const BUBBLE_OFFSETS = [
  'md:translate-x-2 md:-translate-y-1',
  'md:translate-x-8 md:translate-y-2',
  'md:translate-x-0 md:translate-y-1',
  'md:translate-x-10 md:-translate-y-0.5',
  'md:translate-x-3 md:translate-y-3',
] as const;

type PoseId = 'idle' | 'wave' | 'think' | 'point';

const POSES: Record<PoseId, { src: string; alt: string }> = {
  idle: { src: '/abby-fullbody.png', alt: 'Abby standing and smiling' },
  wave: { src: '/abby-wave.png', alt: 'Abby waving hello' },
  think: {
    src: '/abby-think.png',
    alt: 'Abby thinking with finger on chin',
  },
  point: {
    src: '/abby-point.png',
    alt: 'Abby pointing toward a question',
  },
};

const IDLE_CYCLE: PoseId[] = ['wave', 'idle', 'think', 'idle'];
const CYCLE_MS = 3200;

export default function HomePage() {
  const { askAbby, pointAbby, waveAbby } = useAbbyChat();
  const [cycleIndex, setCycleIndex] = useState(0);
  const [hoveringBubble, setHoveringBubble] = useState(false);
  const [pointNonce, setPointNonce] = useState(0);
  const [riveReady, setRiveReady] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/abby.riv', { method: 'HEAD' })
      .then((res) => {
        if (!cancelled) setRiveReady(res.ok);
      })
      .catch(() => {
        if (!cancelled) setRiveReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (riveReady) waveAbby();
  }, [riveReady, waveAbby]);

  useEffect(() => {
    if (hoveringBubble || riveReady) return;
    const id = window.setInterval(() => {
      setCycleIndex((i) => (i + 1) % IDLE_CYCLE.length);
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, [hoveringBubble, riveReady]);

  const activePose: PoseId = hoveringBubble
    ? 'point'
    : IDLE_CYCLE[cycleIndex];

  function onBubbleEnter() {
    setHoveringBubble(true);
    setPointNonce((n) => n + 1);
    pointAbby();
  }

  function onBubbleLeave() {
    setHoveringBubble(false);
  }

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-gradient-to-b from-abby-cream via-abby-soft to-abby-cream">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_10%_-10%,rgba(0,180,216,0.18),transparent_55%),radial-gradient(ellipse_60%_40%_at_90%_10%,rgba(255,107,74,0.16),transparent_50%),radial-gradient(ellipse_50%_60%_at_50%_100%,rgba(0,201,167,0.08),transparent_60%)]"
      />

      <div className="relative mx-auto grid min-h-[100svh] max-w-6xl grid-cols-1 items-end gap-6 px-5 pb-28 pt-10 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:items-center md:gap-4 md:px-8 md:pb-12 lg:gap-8">
        <div className="relative z-10 order-2 flex flex-col justify-end md:order-1 md:min-h-[min(78vh,720px)] md:justify-center">
          <p className="animate-abby-fade-up font-display text-[clamp(2.75rem,8vw,4.75rem)] font-extrabold leading-[0.92] tracking-[-0.04em] text-abby-ink">
            abcGEO
          </p>
          <p className="mt-3 max-w-md animate-abby-fade-up text-[1.05rem] leading-snug text-abby-muted [animation-delay:80ms] fill-mode-both">
            Meet Abby — ask her how to navigate the site or apply Generative
            Engine Optimization.
          </p>

          <ul className="mt-7 flex max-w-xl flex-col gap-2.5 md:mt-9">
            {SUGGESTIONS.map((question, index) => (
              <li
                key={question}
                className={`animate-abby-fade-up ${BUBBLE_OFFSETS[index]}`}
                style={{ animationDelay: `${140 + index * 70}ms` }}
              >
                <button
                  type="button"
                  onClick={() => askAbby(question)}
                  onMouseEnter={onBubbleEnter}
                  onMouseLeave={onBubbleLeave}
                  onFocus={onBubbleEnter}
                  onBlur={onBubbleLeave}
                  className="group w-full rounded-[1.35rem] border border-abby-sky/25 bg-white/85 px-4 py-3 text-left text-[0.95rem] font-medium leading-snug text-abby-ink shadow-[0_10px_28px_rgba(0,180,216,0.1)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-abby-coral/40 hover:bg-white hover:shadow-[0_14px_32px_rgba(255,107,74,0.16)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-abby-coral md:w-auto md:max-w-[22rem]"
                >
                  <span className="mr-2 inline-block text-abby-sky transition-colors duration-300 group-hover:text-abby-coral">
                    ✦
                  </span>
                  {question}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative order-1 flex justify-center md:order-2 md:justify-end">
          <div className="pointer-events-none absolute -right-8 top-10 h-56 w-56 rounded-full bg-abby-sky/15 blur-3xl md:h-72 md:w-72" />
          <div className="pointer-events-none absolute bottom-8 left-4 h-44 w-44 rounded-full bg-abby-coral/15 blur-3xl" />

          <div
            className="relative z-[1] w-[min(78vw,340px)] animate-abby-float md:w-[min(42vw,440px)]"
            aria-live="polite"
          >
            <div className="relative aspect-[3/4] w-full">
              {riveReady ? (
                <AbbyRiveAvatar
                  variant="hero"
                  waveOnMount
                  pointNonce={pointNonce}
                  className="absolute inset-0 drop-shadow-[0_28px_48px_rgba(26,32,44,0.18)]"
                  alt="Abby, abcGEO site guide"
                />
              ) : (
                (Object.keys(POSES) as PoseId[]).map((poseId) => {
                  const pose = POSES[poseId];
                  const visible = poseId === activePose;
                  return (
                    <Image
                      key={poseId}
                      src={pose.src}
                      alt={visible ? pose.alt : ''}
                      width={720}
                      height={960}
                      priority={poseId === 'wave' || poseId === 'idle'}
                      aria-hidden={!visible}
                      className={`absolute inset-0 h-full w-full object-contain drop-shadow-[0_28px_48px_rgba(26,32,44,0.18)] transition-opacity duration-700 ease-in-out ${
                        poseId === 'point' ? '-scale-x-100' : ''
                      } ${visible ? 'opacity-100' : 'opacity-0'}`}
                    />
                  );
                })
              )}
            </div>
            <span className="sr-only">
              {riveReady
                ? 'Abby interactive avatar'
                : `Abby ${POSES[activePose].alt.toLowerCase()}`}
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
