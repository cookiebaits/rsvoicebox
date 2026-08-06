import React, { useState } from 'react';
import { Layers, Trash2, Search, Sliders, Volume2, Calendar, FileText, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { GeneratedClip, ActiveSynthesisJob } from '../types';
import { deleteClip } from '../services/api';
import { AudioWaveformPlayer } from './AudioWaveformPlayer';

interface ClipLibraryProps {
  clips: GeneratedClip[];
  activeJob?: ActiveSynthesisJob | null;
  autoPlayClipId?: string | null;
  onAutoPlayed?: () => void;
  onClipsUpdated: () => void;
}

export const ClipLibrary: React.FC<ClipLibraryProps> = ({
  clips,
  activeJob,
  autoPlayClipId,
  onAutoPlayed,
  onClipsUpdated,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleDelete = async (id: string) => {
    if (confirm('Delete this generated speech clip?')) {
      await deleteClip(id);
      onClipsUpdated();
    }
  };

  const now = Date.now();
  const filteredClips = clips.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.scriptText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.voiceModelName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Layers className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-white tracking-tight">Audio Clip Vault</h2>
          </div>
          <p className="text-[11px] text-slate-400">
            All synthesized audio clips stored in session memory for instant playback, waveform analysis & export.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clips or scripts..."
            className="w-full bg-[#0d1117] border border-[#30363d] rounded pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Active Synthesis Progress Banner */}
      {activeJob && (
        <div className="bg-gradient-to-r from-blue-950/60 via-[#161b22] to-indigo-950/60 border border-blue-500/40 rounded-lg p-4 shadow-lg space-y-3 relative overflow-hidden animate-pulse">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shrink-0">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-mono border border-blue-500/30 font-semibold">
                    {activeJob.voiceModelName}
                  </span>
                  <span className="text-[10px] text-blue-400 font-mono font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    SYNTHESIZING AUDIO CLIP
                  </span>
                </div>
                <h3 className="text-xs font-semibold text-white mt-0.5 truncate max-w-md">
                  {activeJob.title}
                </h3>
              </div>
            </div>

            <div className="text-right">
              <span className="text-sm font-bold font-mono text-blue-400">{activeJob.progress}%</span>
              <p className="text-[10px] text-slate-400">{activeJob.statusText}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="w-full bg-[#0d1117] h-2 rounded-full overflow-hidden border border-[#30363d] p-0.5">
              <div
                className="bg-gradient-to-r from-blue-600 to-cyan-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(8, activeJob.progress)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>Script: "{activeJob.scriptText.substring(0, 45)}..."</span>
              <span>24kHz PCM Waveform</span>
            </div>
          </div>
        </div>
      )}

      {/* Clips List */}
      {filteredClips.length === 0 ? (
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-8 text-center space-y-3">
          <Volume2 className="w-8 h-8 text-slate-500 mx-auto" />
          <h3 className="text-xs font-semibold text-white">No Generated Clips Found</h3>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            Head over to the Studio tab to synthesize speech clips using custom cloned or preselected voice models.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClips.map((clip) => {
            const ageMs = now - new Date(clip.createdAt).getTime();
            const remainingSec = Math.max(0, Math.floor((300000 - ageMs) / 1000));
            const remainingMins = Math.floor(remainingSec / 60);
            const remainingSecs = remainingSec % 60;

            return (
              <div
                key={clip.id}
                className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-mono border border-blue-500/30">
                        {clip.voiceModelName}
                      </span>
                      <span className="text-[10px] text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-mono">
                        Expires in {remainingMins}m {remainingSecs}s
                      </span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3" />
                        {new Date(clip.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h3 className="text-xs font-semibold text-white leading-snug">{clip.title}</h3>
                  </div>

                  <button
                    onClick={() => handleDelete(clip.id)}
                    className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-[#1c2128] transition-colors"
                    title="Delete Clip"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Full Script */}
                <p className="text-xs text-slate-300 bg-[#0d1117] p-2.5 rounded border border-[#30363d] leading-relaxed">
                  "{clip.scriptText}"
                </p>

                {/* Settings Tags */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                  <span className="bg-[#0d1117] px-2 py-0.5 rounded border border-[#30363d]">
                    Pitch: {clip.settings.pitchShift > 0 ? `+${clip.settings.pitchShift}` : clip.settings.pitchShift}st
                  </span>
                  <span className="bg-[#0d1117] px-2 py-0.5 rounded border border-[#30363d]">
                    Speed: {clip.settings.speed}x
                  </span>
                  <span className="bg-[#0d1117] px-2 py-0.5 rounded border border-[#30363d] capitalize">
                    Tone: {clip.settings.emotion}
                  </span>
                </div>

                {/* Waveform Player */}
                <AudioWaveformPlayer
                  audioUrl={clip.audioUrl}
                  title={clip.title}
                  scriptText={clip.scriptText}
                  voiceModelName={clip.voiceModelName}
                  durationSeconds={clip.durationSeconds}
                  autoPlay={clip.id === autoPlayClipId}
                  onAutoPlayed={onAutoPlayed}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
