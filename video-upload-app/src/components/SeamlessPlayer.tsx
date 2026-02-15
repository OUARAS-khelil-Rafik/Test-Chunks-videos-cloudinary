'use client';

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipForward,
  SkipBack,
} from 'lucide-react';

interface Part {
  secureUrl: string;
  duration: number;
}

interface SeamlessPlayerProps {
  /** For single-part or main video */
  url: string;
  /** Multi-part segments (optional) */
  parts?: Part[];
  /** Total duration across all parts (seconds) */
  totalDuration: number;
}

/**
 * A video player that treats multiple video parts as one seamless video.
 * - Unified progress bar spanning total duration
 * - Auto-advances between parts with no visible transition indicator
 * - Seeking jumps to the correct part & position
 */
export default function SeamlessPlayer({
  url,
  parts,
  totalDuration,
}: SeamlessPlayerProps) {
  /* ─── Derived source list ─── */
  const sources: Part[] = useMemo(() => {
    if (parts && parts.length > 1) return parts;
    return [{ secureUrl: url, duration: totalDuration }];
  }, [url, parts, totalDuration]);

  /** Cumulative start-time for each part: [0, dur0, dur0+dur1, …] */
  const offsets = useMemo(() => {
    const arr: number[] = [0];
    for (let i = 0; i < sources.length; i++) {
      arr.push(arr[i] + sources[i].duration);
    }
    return arr;
  }, [sources]);

  /* ─── Refs ─── */
  const videoRef = useRef<HTMLVideoElement>(null);
  const nextVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

  /* ─── State ─── */
  const [partIndex, setPartIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // unified time
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [seeking, setSeeking] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  /* ─── Helpers ─── */
  const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));

  const formatTime = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0)
      return `${h}:${m.toString().padStart(2, '0')}:${sec
        .toString()
        .padStart(2, '0')}`;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  /** Find which part a given unified time falls in */
  const partForTime = useCallback(
    (t: number) => {
      for (let i = sources.length - 1; i >= 0; i--) {
        if (t >= offsets[i]) return i;
      }
      return 0;
    },
    [sources, offsets]
  );

  /* ─── Controls visibility ─── */
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  }, [playing]);

  /* ─── Preload next part ─── */
  useEffect(() => {
    const nextIdx = partIndex + 1;
    if (nextIdx < sources.length && nextVideoRef.current) {
      nextVideoRef.current.src = sources[nextIdx].secureUrl;
      nextVideoRef.current.load();
    }
  }, [partIndex, sources]);

  /* ─── Load current part source ─── */
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const src = sources[partIndex].secureUrl;
    if (vid.src !== src) {
      vid.src = src;
      vid.load();
    }
  }, [partIndex, sources]);

  /* ─── Time update → unified time ─── */
  const handleTimeUpdate = useCallback(() => {
    if (seeking || transitioning) return;
    const vid = videoRef.current;
    if (!vid) return;
    const unified = offsets[partIndex] + vid.currentTime;
    setCurrentTime(unified);

    // buffered progress
    if (vid.buffered.length > 0) {
      const bufEnd = vid.buffered.end(vid.buffered.length - 1);
      setBuffered(offsets[partIndex] + bufEnd);
    }
  }, [partIndex, offsets, seeking, transitioning]);

  /* ─── Part ended → advance ─── */
  const handleEnded = useCallback(() => {
    if (partIndex < sources.length - 1) {
      setTransitioning(true);
      const nextIdx = partIndex + 1;
      setPartIndex(nextIdx);

      // Wait a tick for new source to load, then play
      requestAnimationFrame(() => {
        const vid = videoRef.current;
        if (vid) {
          vid.currentTime = 0;
          vid.play().catch(() => {});
        }
        setTransitioning(false);
      });
    } else {
      // Last part ended → stop
      setPlaying(false);
    }
  }, [partIndex, sources.length]);

  /* ─── Play / Pause ─── */
  const togglePlay = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (playing) {
      vid.pause();
      setPlaying(false);
    } else {
      vid.play().catch(() => {});
      setPlaying(true);
    }
    resetHideTimer();
  }, [playing, resetHideTimer]);

  /* ─── Seek (click on progress bar) ─── */
  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const bar = progressRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      const targetTime = ratio * totalDuration;

      setSeeking(true);
      const targetPart = partForTime(targetTime);
      const localTime = targetTime - offsets[targetPart];

      if (targetPart !== partIndex) {
        setPartIndex(targetPart);
        // Need to wait for source change
        requestAnimationFrame(() => {
          const vid = videoRef.current;
          if (vid) {
            vid.currentTime = localTime;
            if (playing) vid.play().catch(() => {});
          }
          setCurrentTime(targetTime);
          setSeeking(false);
        });
      } else {
        const vid = videoRef.current;
        if (vid) vid.currentTime = localTime;
        setCurrentTime(targetTime);
        setSeeking(false);
      }
      resetHideTimer();
    },
    [totalDuration, partForTime, offsets, partIndex, playing, resetHideTimer]
  );

  /* ─── Skip ±10s ─── */
  const skip = useCallback(
    (delta: number) => {
      const target = clamp(currentTime + delta, 0, totalDuration);
      const targetPart = partForTime(target);
      const localTime = target - offsets[targetPart];

      if (targetPart !== partIndex) {
        setSeeking(true);
        setPartIndex(targetPart);
        requestAnimationFrame(() => {
          const vid = videoRef.current;
          if (vid) {
            vid.currentTime = localTime;
            if (playing) vid.play().catch(() => {});
          }
          setCurrentTime(target);
          setSeeking(false);
        });
      } else {
        const vid = videoRef.current;
        if (vid) vid.currentTime = localTime;
        setCurrentTime(target);
      }
      resetHideTimer();
    },
    [currentTime, totalDuration, partForTime, offsets, partIndex, playing, resetHideTimer]
  );

  /* ─── Volume ─── */
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (videoRef.current) videoRef.current.volume = v;
    if (v > 0) setMuted(false);
  };

  const toggleMute = () => {
    const vid = videoRef.current;
    if (!vid) return;
    setMuted((m) => {
      vid.muted = !m;
      return !m;
    });
  };

  /* ─── Fullscreen ─── */
  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  /* ─── Keyboard shortcuts ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skip(10);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skip(-10);
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, skip]);

  /* ─── Progress percentages ─── */
  const progressPct = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;
  const bufferedPct = totalDuration > 0 ? (buffered / totalDuration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative bg-black w-full aspect-video group select-none"
      onMouseMove={resetHideTimer}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      {/* Current video */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        playsInline
        onClick={togglePlay}
      />

      {/* Hidden preload element for next part */}
      <video ref={nextVideoRef} className="hidden" preload="auto" muted />

      {/* Big play button overlay (when paused) */}
      {!playing && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20"
        >
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <Play className="w-8 h-8 text-black ml-1" />
          </div>
        </button>
      )}

      {/* Bottom controls bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 pt-8 pb-3 transition-opacity duration-300 ${
          showControls || !playing ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress bar */}
        <div
          ref={progressRef}
          className="relative h-1 hover:h-2 transition-all cursor-pointer mb-3 group/bar"
          onClick={handleSeek}
        >
          {/* Background */}
          <div className="absolute inset-0 bg-white/30 rounded-full" />
          {/* Buffered */}
          <div
            className="absolute inset-y-0 left-0 bg-white/50 rounded-full"
            style={{ width: `${bufferedPct}%` }}
          />
          {/* Played */}
          <div
            className="absolute inset-y-0 left-0 bg-blue-500 rounded-full"
            style={{ width: `${progressPct}%` }}
          />
          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full opacity-0 group-hover/bar:opacity-100 transition-opacity"
            style={{ left: `${progressPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-white text-sm">
          <div className="flex items-center space-x-3">
            {/* Play / Pause */}
            <button onClick={togglePlay} className="hover:scale-110 transition-transform">
              {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>

            {/* Skip back 10s */}
            <button onClick={() => skip(-10)} className="hover:scale-110 transition-transform">
              <SkipBack className="w-4 h-4" />
            </button>

            {/* Skip forward 10s */}
            <button onClick={() => skip(10)} className="hover:scale-110 transition-transform">
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Volume */}
            <div className="flex items-center space-x-1">
              <button onClick={toggleMute} className="hover:scale-110 transition-transform">
                {muted || volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 accent-blue-500 cursor-pointer"
              />
            </div>

            {/* Time */}
            <span className="tabular-nums">
              {formatTime(currentTime)} / {formatTime(totalDuration)}
            </span>
          </div>

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} className="hover:scale-110 transition-transform">
            {isFullscreen ? (
              <Minimize className="w-5 h-5" />
            ) : (
              <Maximize className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
