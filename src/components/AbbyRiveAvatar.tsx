'use client';

/**
 * Abby Rive avatar
 * ----------------
 * Expects `/public/abby.riv` with state machine `AbbyState` and inputs:
 *   - isThinking (boolean)
 *   - wave (trigger)
 *   - point (trigger)
 * If the file is missing or fails to load, falls back to PNG avatars.
 */

import { useAbbyChat } from '@/components/AbbyChatContext';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import Image from 'next/image';
import { useEffect, useState } from 'react';

const RIVE_SRC = '/abby.riv';
const STATE_MACHINE = 'AbbyState';
const FALLBACK_AVATAR = '/abby-avatar.png';
const FALLBACK_FULL = '/abby-fullbody.png';

type AbbyRiveAvatarProps = {
  variant?: 'hero' | 'launcher' | 'thumb';
  className?: string;
  /** Fire wave once when this instance mounts / Rive loads. */
  waveOnMount?: boolean;
  /** Local thinking override (also synced via context). */
  isThinking?: boolean;
  /** Local point bump — increment to fire point on this instance. */
  pointNonce?: number;
  alt?: string;
};

export default function AbbyRiveAvatar({
  variant = 'launcher',
  className = '',
  waveOnMount = false,
  isThinking = false,
  pointNonce = 0,
  alt = 'Abby',
}: AbbyRiveAvatarProps) {
  const { subscribeMotion } = useAbbyChat();
  const [failed, setFailed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [srcEnabled, setSrcEnabled] = useState(false);

  // Probe for abby.riv before mounting the runtime (avoids noisy console errors).
  useEffect(() => {
    let cancelled = false;
    fetch(RIVE_SRC, { method: 'HEAD' })
      .then((res) => {
        if (cancelled) return;
        if (res.ok) setSrcEnabled(true);
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!checked) {
    return (
      <FallbackImage
        variant={variant}
        className={className}
        alt={alt}
      />
    );
  }

  if (failed || !srcEnabled) {
    return (
      <FallbackImage
        variant={variant}
        className={className}
        alt={alt}
      />
    );
  }

  return (
    <AbbyRiveCanvas
      variant={variant}
      className={className}
      waveOnMount={waveOnMount}
      isThinking={isThinking}
      pointNonce={pointNonce}
      alt={alt}
      subscribeMotion={subscribeMotion}
      onFail={() => setFailed(true)}
    />
  );
}

function AbbyRiveCanvas({
  variant,
  className,
  waveOnMount,
  isThinking,
  pointNonce,
  alt,
  subscribeMotion,
  onFail,
}: AbbyRiveAvatarProps & {
  subscribeMotion: ReturnType<typeof useAbbyChat>['subscribeMotion'];
  onFail: () => void;
}) {
  const { rive, RiveComponent } = useRive({
    src: RIVE_SRC,
    stateMachines: STATE_MACHINE,
    autoplay: true,
    onLoadError: () => onFail(),
  });

  const isThinkingInput = useStateMachineInput(
    rive,
    STATE_MACHINE,
    'isThinking',
  );
  const waveInput = useStateMachineInput(rive, STATE_MACHINE, 'wave');
  const pointInput = useStateMachineInput(rive, STATE_MACHINE, 'point');

  // Boolean thinking input
  useEffect(() => {
    if (!isThinkingInput) return;
    isThinkingInput.value = Boolean(isThinking);
  }, [isThinking, isThinkingInput]);

  // Wave on mount / when rive + input ready
  useEffect(() => {
    if (!waveOnMount || !waveInput) return;
    try {
      waveInput.fire();
    } catch {
      // ignore if input is not a trigger
    }
  }, [waveOnMount, waveInput]);

  // Local point nonce (welcome bubble hover)
  useEffect(() => {
    if (!pointNonce || !pointInput) return;
    try {
      pointInput.fire();
    } catch {
      // ignore
    }
  }, [pointNonce, pointInput]);

  // Context motion bus (askAbby point, global wave/thinking)
  useEffect(() => {
    return subscribeMotion({
      onWave: () => {
        try {
          waveInput?.fire();
        } catch {
          /* ignore */
        }
      },
      onPoint: () => {
        try {
          pointInput?.fire();
        } catch {
          /* ignore */
        }
      },
      onThinking: (value) => {
        if (!isThinkingInput) return;
        isThinkingInput.value = Boolean(value);
      },
    });
  }, [subscribeMotion, waveInput, pointInput, isThinkingInput]);

  const sizeClass =
    variant === 'hero'
      ? 'h-full w-full'
      : variant === 'thumb'
        ? 'h-full w-full'
        : 'h-full w-full';

  return (
    <div
      className={`relative overflow-hidden ${sizeClass} ${className}`}
      role="img"
      aria-label={alt}
    >
      <RiveComponent className="h-full w-full" />
    </div>
  );
}

function FallbackImage({
  variant,
  className,
  alt,
}: {
  variant: NonNullable<AbbyRiveAvatarProps['variant']>;
  className: string;
  alt: string;
}) {
  const src = variant === 'hero' ? FALLBACK_FULL : FALLBACK_AVATAR;
  if (variant === 'hero') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={`h-full w-full object-contain ${className}`}
      />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={variant === 'thumb' ? 56 : 64}
      height={variant === 'thumb' ? 56 : 64}
      className={`h-full w-full object-cover ${className}`}
      priority
    />
  );
}
