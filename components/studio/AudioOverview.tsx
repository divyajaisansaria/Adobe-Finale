"use client";

import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, FastForward } from "lucide-react";

// Helper function to format time from seconds to MM:SS
const formatTime = (timeInSeconds: number) => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
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

  // --- NEW: Refs and State for Web Audio API ---
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(0));
  const animationFrameRef = useRef<number>();

  // This effect handles the audio element's native events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateCurrentTime = () => setCurrentTime(audio.currentTime);
    const setAudioDuration = () => setDuration(audio.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateCurrentTime);
    audio.addEventListener("loadedmetadata", setAudioDuration);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handlePause);

    return () => {
      audio.removeEventListener("timeupdate", updateCurrentTime);
      audio.removeEventListener("loadedmetadata", setAudioDuration);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handlePause);
    };
  }, [audioUrl]);

  // --- NEW: Function to set up the Web Audio API ---
  const setupAudioContext = () => {
    if (audioRef.current && !audioContextRef.current) {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = context.createAnalyser();
      analyser.fftSize = 64; // Determines number of data points (fftSize / 2)

      const source = context.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(context.destination);

      audioContextRef.current = context;
      analyserRef.current = analyser;
      sourceRef.current = source;
      setFrequencyData(new Uint8Array(analyser.frequencyBinCount));
    }
  };

  // --- NEW: Animation loop to update visualizer ---
  const runAnimation = () => {
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      setFrequencyData(dataArray);
      animationFrameRef.current = requestAnimationFrame(runAnimation);
    }
  };

  // Effect to start/stop the animation loop based on play state
  useEffect(() => {
    if (isPlaying) {
      audioContextRef.current?.resume(); // Resume context if suspended
      runAnimation();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  const togglePlayPause = () => {
    // Lazy-initialize audio context on first play to comply with browser policies
    if (!audioContextRef.current) {
      setupAudioContext();
    }

    if (audioRef.current) {
      isPlaying ? audioRef.current.pause() : audioRef.current.play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Number(e.target.value);
    }
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rate = Number(e.target.value);
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  // --- NEW: Calculate progress for the styled progress bar ---
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const speedProgressPercent = ((playbackRate - 0.5) / 1.5) * 100;

  // Conditional Rendering
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-48 text-gray-400">
        Generating podcast, please wait.
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

  return (
    <div className="p-8 flex flex-col items-center gap-6">
      <audio ref={audioRef} src={audioUrl} preload="metadata" crossOrigin="anonymous" />

      {/* --- UPDATED: Dynamic Audio Visualizer --- */}
      <div className="flex justify-center w-full">
        <div className="flex items-end gap-1 h-28">
          {Array.from(frequencyData).map((freqValue, i) => (
            <div
              key={i}
              className="w-1.5 rounded-full bg-cyan-400/80 transition-all duration-75"
              style={{ height: `${(freqValue / 255) * 100}%` }}
            />
          ))}
        </div>
      </div>


      <button
        onClick={togglePlayPause}
        className="w-14 h-14 bg-cyan-500/90 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-cyan-400 transition-transform hover:scale-110"
      >
        {isPlaying ? <Pause size={22} /> : <Play size={22} className="ml-1" />}
      </button>

      {/* --- UPDATED: Styled Progress Bar --- */}
      <div className="flex items-center gap-3 w-full">
        <span className="text-xs text-gray-400 w-10 text-right">{formatTime(currentTime)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          className="progress-bar"
          style={{ '--progress-percent': `${progressPercent}%` } as React.CSSProperties}
        />
        <span className="text-xs text-gray-400 w-10">{formatTime(duration)}</span>
      </div>

      <div className="flex items-center gap-3 w-full">
        <FastForward className="w-4 h-4 text-gray-500" />
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.25}
          value={playbackRate}
          onChange={handleSpeedChange}
          className="progress-bar"
          style={{ '--progress-percent': `${speedProgressPercent}%` } as React.CSSProperties}
        />
        <span className="text-sm font-mono text-gray-300 w-12 text-center">
          {playbackRate.toFixed(2)}x
        </span>
      </div>
    </div>
  );
}