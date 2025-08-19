"use client";

import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, FastForward, Loader, Clock } from "lucide-react";

// Helper: MM:SS
const formatTime = (timeInSeconds: number) => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export function AudioOverview({
  audioUrl,
  loading,
}: {
  audioUrl?: string | null;
  loading: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Web Audio API (robust version)
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(0));
  const animationFrameRef = useRef<number>();

  // Reset on URL change (avoid stale time/playing state)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.pause();
    } catch {}
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    audio.playbackRate = playbackRate; // preserve speed
    audio.load(); // reload metadata for the new src
  }, [audioUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Native audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateCurrentTime = () => setCurrentTime(audio.currentTime);
    const setAudioDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateCurrentTime);
    audio.addEventListener("loadedmetadata", setAudioDuration);
    audio.addEventListener("durationchange", setAudioDuration);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handlePause);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", updateCurrentTime);
      audio.removeEventListener("loadedmetadata", setAudioDuration);
      audio.removeEventListener("durationchange", setAudioDuration);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handlePause);
      audio.removeEventListener("error", handleError);
    };
  }, [audioUrl]);

  // Setup Web Audio (do NOT connect analyser to destination → avoids echo)
  const setupAudioContext = () => {
    if (audioRef.current && !audioContextRef.current) {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as {
        new (): AudioContext;
      };
      const context = new Ctx();
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024; // keep your UI choice
      analyser.smoothingTimeConstant = 0.8;

      const source = context.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      // ❌ Do NOT: analyser.connect(context.destination)
      // The <audio> element already outputs sound; routing analyser to destination causes double audio.

      audioContextRef.current = context;
      analyserRef.current = analyser;
      sourceRef.current = source;
      setFrequencyData(new Uint8Array(analyser.frequencyBinCount));
    }
  };

  // Visualizer loop
  const runAnimation = () => {
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      setFrequencyData(dataArray); // state drives your gradient bars
      animationFrameRef.current = requestAnimationFrame(runAnimation);
    }
  };

  // Start/stop animation on play state
  useEffect(() => {
    if (isPlaying) {
      audioContextRef.current?.resume().catch(() => {});
      runAnimation();
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    };
  }, [isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      try { sourceRef.current?.disconnect(); } catch {}
      try { analyserRef.current?.disconnect(); } catch {}
      const ctx = audioContextRef.current;
      if (ctx && ctx.state !== "closed") {
        ctx.close().catch(() => {});
      }
      audioContextRef.current = null;
      analyserRef.current = null;
      sourceRef.current = null;
    };
  }, []);

  // Controls
  const togglePlayPause = () => {
    if (!audioContextRef.current) setupAudioContext(); // lazy init on first interaction
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audioContextRef.current?.resume().catch(() => {});
      audio.play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Number(e.target.value);
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rate = Number(e.target.value);
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const safeDuration = Number.isFinite(duration) ? duration : 0;
  const progressPercent = safeDuration > 0 ? (currentTime / safeDuration) * 100 : 0;
  const speedPercent = ((playbackRate - 0.5) / 1.5) * 100;

  // Segments (every 30s)
  const segmentLength = 30;
  const segments = Array.from({ length: Math.ceil(safeDuration / segmentLength) }, (_, i) => i * segmentLength);

  // Loading / Empty
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-48 text-gray-400">
        <Loader className="mr-2 animate-spin" /> Generating podcast...
      </div>
    );
  }
  if (!audioUrl) {
    return (
      <div className="p-6 flex items-center justify-center h-48 text-gray-500">
        No audio generated yet.
      </div>
    );
  }

  // Stretch only first part of spectrum (your UI)
  const usefulData = frequencyData.slice(0, Math.max(0, Math.floor(frequencyData.length / 4)));

  return (
    <div className="p-6 flex flex-col gap-6 bg-gray-800/70 rounded-2xl shadow-xl w-full max-w-2xl mx-auto">
      {/* force a fresh <audio> when src changes */}
      <audio
        key={audioUrl}
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        crossOrigin="anonymous"
      />

      {/* Header */}
      <div className="flex flex-col items-center text-center">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          🎧 Podcast Mode
        </h2>
      </div>

      {/* Visualizer (gradient bars) */}
      <div
        className="grid items-end gap-[2px] h-28 w-full bg-gray-900/80 rounded-lg p-3"
        style={{ gridTemplateColumns: `repeat(${usefulData.length || 1}, 1fr)` }}
      >
        {Array.from(usefulData).map((f, i) => (
          <div
            key={i}
            className="rounded-t-full bg-gradient-to-t from-blue-500 to-cyan-300"
            style={{
              height: `${(f / 255) * 100}%`,
              filter: "drop-shadow(0 0 4px #3b82f6)",
            }}
          />
        ))}
      </div>

      {/* Play / Pause */}
      <div className="flex justify-center">
        <button
          onClick={togglePlayPause}
          className="w-16 h-16 bg-blue-800 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-blue-400 hover:scale-110 transition"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause size={26} /> : <Play size={26} className="ml-1" />}
        </button>
      </div>

      {/* Progress Bar (gradient background) */}
      <div className="flex items-center gap-3 w-full">
        <span className="text-xs text-gray-400 w-10 text-right">{formatTime(currentTime)}</span>
        <input
          type="range"
          min={0}
          max={safeDuration}
          value={Math.min(currentTime, safeDuration)}
          onChange={handleSeek}
          className="flex-1 accent-blue-500 cursor-pointer"
          style={{
            background: `linear-gradient(to right, #06214cff ${progressPercent}%, #02204fff ${progressPercent}%)`,
          }}
        />
        <span className="text-xs text-gray-400 w-10">{formatTime(safeDuration)}</span>
      </div>

      {/* Speed Control */}
      <div className="flex items-center gap-3 w-full">
        <FastForward className="w-4 h-4 text-gray-400" />
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.25}
          value={playbackRate}
          onChange={handleSpeedChange}
          className="flex-1 accent-blue-500 cursor-pointer"
          style={{
            background: `linear-gradient(to right, #032152ff ${speedPercent}%, #062659ff ${speedPercent}%)`,
          }}
        />
        <span className="text-sm font-mono text-gray-300 w-12 text-center">
          {playbackRate.toFixed(2)}x
        </span>
      </div>

      {/* Podcast Segments */}
      <div>
        <h3 className="text-white font-semibold mb-2">Podcast Segments</h3>
        <div className="grid grid-cols-2 gap-2">
          {segments.map((s, idx) => (
            <button
              key={idx}
              onClick={() => {
                const audio = audioRef.current;
                if (audio) audio.currentTime = s;
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 text-gray-200 hover:bg-blue-600 hover:text-white transition"
            >
              <Clock size={14} /> {formatTime(s)}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="text-xs text-gray-500 text-center mt-2">
        Sit Back and Enjoy the Conversation
      </p>
    </div>
  );
}
