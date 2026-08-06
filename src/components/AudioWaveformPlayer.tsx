import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Download, Volume2, VolumeX, RotateCcw, Share2, Check } from 'lucide-react';

interface AudioWaveformPlayerProps {
  audioUrl: string;
  title?: string;
  scriptText?: string;
  voiceModelName?: string;
  durationSeconds?: number;
  autoPlay?: boolean;
  onAutoPlayed?: () => void;
  onDownload?: () => void;
}

export const AudioWaveformPlayer: React.FC<AudioWaveformPlayerProps> = ({
  audioUrl,
  title,
  scriptText,
  voiceModelName,
  durationSeconds,
  autoPlay,
  onAutoPlayed,
  onDownload,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load browser speech synthesis voices when ready
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => {
        const v = window.speechSynthesis.getVoices();
        if (v.length > 0) setAvailableVoices(v);
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Fallback speech synthesis engine using Web Speech API with model-specific voice tuning
  const speakWithSpeechSynthesis = (textToSpeak: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    let pitch = 1.0;
    let rate = 1.0;
    const modelLower = (voiceModelName || title || '').toLowerCase();

    if (modelLower.includes('obama')) {
      pitch = 0.82;
      rate = 0.92;
    } else if (modelLower.includes('freeman')) {
      pitch = 0.65;
      rate = 0.82;
    } else if (modelLower.includes('trump')) {
      pitch = 1.15;
      rate = 1.08;
    } else if (modelLower.includes('attenborough')) {
      pitch = 0.95;
      rate = 0.88;
    } else if (modelLower.includes('arnold')) {
      pitch = 0.72;
      rate = 1.0;
    } else if (modelLower.includes('walken')) {
      pitch = 1.05;
      rate = 0.9;
    } else if (modelLower.includes('biden')) {
      pitch = 0.92;
      rate = 0.88;
    } else if (modelLower.includes('clinton')) {
      pitch = 0.88;
      rate = 0.94;
    } else if (modelLower.includes('bush')) {
      pitch = 1.02;
      rate = 0.98;
    } else if (modelLower.includes('jackson')) {
      pitch = 0.82;
      rate = 1.08;
    } else if (modelLower.includes('keanu')) {
      pitch = 0.8;
      rate = 0.88;
    } else if (modelLower.includes('oprah')) {
      pitch = 1.25;
      rate = 0.95;
    }

    utterance.pitch = Math.max(0.4, Math.min(1.8, pitch));
    utterance.rate = Math.max(0.5, Math.min(2.0, rate * playbackSpeed));

    const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const enVoices = voices.filter((v) => v.lang.startsWith('en'));
      const maleVoice = enVoices.find((v) => /david|mark|alex|daniel|george|male/i.test(v.name));
      const femaleVoice = enVoices.find((v) => /zira|samantha|victoria|female/i.test(v.name));
      const ukVoice = enVoices.find((v) => /uk|british|daniel|oliver/i.test(v.name));

      if ((modelLower.includes('oprah') || modelLower.includes('kore')) && femaleVoice) {
        utterance.voice = femaleVoice;
      } else if (modelLower.includes('attenborough') && ukVoice) {
        utterance.voice = ukVoice;
      } else if (maleVoice) {
        utterance.voice = maleVoice;
      } else if (enVoices.length > 0) {
        utterance.voice = enVoices[0];
      }
    }

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
    return true;
  };

  const playAudio = () => {
    const audio = audioRef.current;
    if (isPlaying) {
      if (audio) audio.pause();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
      return;
    }

    // Try HTML5 <audio> element first
    if (audio && audioUrl) {
      audio.currentTime = 0;
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.warn('HTML5 audio play blocked/failed, using Web Speech API fallback:', err);
          const text =
            scriptText ||
            title ||
            'As a prominent figure of the free world, I believe we are responsible for being philanthropists.';
          speakWithSpeechSynthesis(text);
        });
    } else {
      const text =
        scriptText ||
        title ||
        'As a prominent figure of the free world, I believe we are responsible for being philanthropists.';
      speakWithSpeechSynthesis(text);
    }
  };

  // Trigger autoPlay ONLY ONCE if requested for newly generated clip
  useEffect(() => {
    if (autoPlay) {
      const timer = setTimeout(() => {
        playAudio();
        onAutoPlayed?.();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [autoPlay]);

  // Synchronize audio metadata
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  // Render static & animated waveform canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const barCount = 64;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // Generate pseudo waveform amplitudes based on audio index
    const amplitudes: number[] = [];
    for (let i = 0; i < barCount; i++) {
      const seed = Math.sin(i * 12.9898) * 43758.5453;
      amplitudes.push(0.2 + (Math.abs(seed) % 0.8));
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const barWidth = (width / barCount) * 0.65;
      const barGap = (width / barCount) * 0.35;
      const progressRatio = duration > 0 ? currentTime / duration : 0;

      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + barGap);
        const barRatio = i / barCount;
        const isPast = barRatio <= progressRatio;

        // Animate slightly when playing
        let amp = amplitudes[i];
        if (isPlaying && Math.abs(barRatio - progressRatio) < 0.1) {
          amp = Math.min(1.0, amp + Math.sin(Date.now() * 0.01 + i) * 0.2);
        }

        const barHeight = Math.max(4, amp * (height * 0.85));
        const y = (height - barHeight) / 2;

        if (isPast) {
          const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
          gradient.addColorStop(0, '#3b82f6'); // Blue 500
          gradient.addColorStop(1, '#1d4ed8'); // Blue 700
          ctx.fillStyle = gradient;
        } else {
          ctx.fillStyle = '#30363d'; // High density border tone
        }

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }

      if (isPlaying) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, currentTime, duration]);

  const togglePlay = playAudio;

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio || duration <= 0) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = ratio * duration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3.5 shadow-sm text-slate-200 flex flex-col gap-2.5">
      <audio ref={audioRef} src={audioUrl || undefined} preload="metadata" />

      {/* Title & Metadata */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-semibold text-white truncate">{title || 'Speech Clip Output'}</h4>
          <span className="text-[10px] text-slate-500 font-mono">
            {formatTime(currentTime)} / {formatTime(duration)} • {playbackSpeed}x
          </span>
        </div>

        {/* Speed presets */}
        <div className="flex items-center gap-1 bg-[#0d1117] p-0.5 rounded border border-[#30363d] text-[10px]">
          {[0.8, 1.0, 1.25, 1.5].map((s) => (
            <button
              key={s}
              onClick={() => handleSpeedChange(s)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                playbackSpeed === s ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Waveform Canvas */}
      <div
        onClick={handleScrub}
        className="relative h-11 bg-[#0d1117] rounded p-1.5 cursor-pointer border border-[#30363d] hover:border-slate-500 transition-colors flex items-center justify-center"
      >
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center gap-1.5">
          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center font-bold shadow transition-transform active:scale-95"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current translate-x-0.5" />}
          </button>

          {/* Replay */}
          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                setCurrentTime(0);
              }
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-[#1c2128] transition-colors"
            title="Replay from start"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Mute */}
          <button
            onClick={toggleMute}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-[#1c2128] transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Share */}
          <button
            onClick={handleShare}
            className="px-2.5 py-1 rounded bg-[#0d1117] hover:bg-[#1c2128] text-slate-300 text-[11px] font-medium flex items-center gap-1 transition-colors border border-[#30363d]"
          >
            {copied ? <Check className="w-3 h-3 text-blue-400" /> : <Share2 className="w-3 h-3" />}
            {copied ? 'Copied' : 'Share'}
          </button>

          {/* Download */}
          <a
            href={audioUrl}
            download={`vocalflow_${Date.now()}.wav`}
            onClick={() => onDownload && onDownload()}
            className="px-2.5 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[11px] font-medium flex items-center gap-1 transition-all"
          >
            <Download className="w-3 h-3" />
            WAV
          </a>
        </div>
      </div>
    </div>
  );
};
