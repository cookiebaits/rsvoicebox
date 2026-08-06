import React, { useState, useRef, useEffect } from 'react';
import { Mic, Upload, Trash2, Sliders, Activity, FileAudio, Check, Plus, Search, Tag, Sparkles, Volume2, Shield } from 'lucide-react';
import { VoiceModel } from '../types';
import { cloneVoiceSample, deleteVoiceModel } from '../services/api';

interface ModelVaultProps {
  voiceModels: VoiceModel[];
  onModelsUpdated: () => void;
  onSelectModelForStudio: (modelId: string) => void;
}

export const ModelVault: React.FC<ModelVaultProps> = ({
  voiceModels,
  onModelsUpdated,
  onSelectModelForStudio,
}) => {
  // Modal / Creator State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modelName, setModelName] = useState('');
  const [description, setDescription] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'neutral'>('male');
  const [ageGroup, setAgeGroup] = useState<'young' | 'adult' | 'mature'>('adult');
  const [tags, setTags] = useState('Custom Clone, RuinScams Vocal Clone');

  // Audio Upload & Recording State
  const [audioBase64, setAudioBase64] = useState<string>('');
  const [audioFileName, setAudioFileName] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isCloning, setIsCloning] = useState(false);
  const [cloneError, setCloneError] = useState('');

  // MediaRecorder & Canvas Visualizer Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<any>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'custom' | 'preselected'>('all');

  // Handle Drag & Drop File Upload
  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('audio/')) {
      setCloneError('Please upload a valid audio file (WAV, MP3, M4A, WebM).');
      return;
    }

    setAudioFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAudioBase64(reader.result);
        setCloneError('');
      }
    };
    reader.readAsDataURL(file);
  };

  // Start Live Microphone Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // AudioContext for visualizer
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const drawVisualizer = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        analyser.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 0.7;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;
          ctx.fillStyle = '#10b981';
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
          x += barWidth + 2;
        }

        animationFrameRef.current = requestAnimationFrame(drawVisualizer);
      };

      drawVisualizer();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            setAudioBase64(reader.result);
            setAudioFileName(`microphone_sample_${Date.now()}.webm`);
          }
        };
        reader.readAsDataURL(blob);

        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setCloneError('Microphone access denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // Clone Voice Trigger
  const handleCloneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelName.trim()) {
      setCloneError('Please enter a name for your custom voice model.');
      return;
    }
    if (!audioBase64) {
      setCloneError('Please upload or record an audio sample first.');
      return;
    }

    setIsCloning(true);
    setCloneError('');
    try {
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
      await cloneVoiceSample({
        name: modelName.trim(),
        description: description.trim() || 'Custom RuinScams Vocal Clone Turbo cloned voice profile.',
        gender,
        ageGroup,
        tags: tagList,
        audioBase64,
      });

      onModelsUpdated();
      setShowCreateModal(false);
      resetForm();
    } catch (err: any) {
      setCloneError(err.message || 'Failed to clone voice.');
    } finally {
      setIsCloning(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this cloned voice model?')) {
      await deleteVoiceModel(id);
      onModelsUpdated();
    }
  };

  const resetForm = () => {
    setModelName('');
    setDescription('');
    setAudioBase64('');
    setAudioFileName('');
    setCloneError('');
    setRecordingTime(0);
  };

  // Filter models
  const filteredModels = voiceModels.filter((model) => {
    const matchesSearch =
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    if (categoryFilter === 'custom') return matchesSearch && model.isCloned;
    if (categoryFilter === 'preselected') return matchesSearch && !model.isCloned;
    return matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Vault Header Bar */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Sliders className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-white tracking-tight">Voice Model Vault</h2>
          </div>
          <p className="text-[11px] text-slate-400">
            Manage audio samples, vector embeddings, and trained neural voice profiles.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow transition-all flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Clone Custom Voice</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-[#161b22] border border-[#30363d] p-2 rounded-lg">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search models or tags..."
            className="w-full bg-[#0d1117] border border-[#30363d] rounded pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1 w-full sm:w-auto">
          {[
            { id: 'all', label: 'All Voices' },
            { id: 'custom', label: 'Trained Custom' },
            { id: 'preselected', label: 'Preset Library' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id as any)}
              className={`px-2.5 py-1 rounded text-xs transition-all ${
                categoryFilter === cat.id
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1c2128]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Models Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredModels.map((model) => (
          <div
            key={model.id}
            className="bg-[#161b22] border border-[#30363d] hover:border-slate-500 rounded-lg p-4 shadow-sm space-y-3 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div>
                  <h3 className="text-xs font-semibold text-white">{model.name}</h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {model.gender} • {model.ageGroup} • {model.accent || 'Neutral'}
                  </span>
                </div>
                {model.isCloned ? (
                  <span className="text-[9px] bg-green-900/50 text-green-400 px-1 rounded border border-green-800 font-mono font-bold">
                    TRAINED
                  </span>
                ) : (
                  <span className="text-[9px] bg-[#30363d] text-slate-300 px-1 rounded font-mono">
                    PRESET
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-400 line-clamp-2 mb-2 leading-relaxed">{model.description}</p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-3">
                {model.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 rounded bg-[#0d1117] border border-[#30363d] text-slate-300 text-[10px] font-mono"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* RuinScams Vocal Clone Profile Metrics Breakdown */}
              {model.vocalflowProfile && (
                <div className="bg-[#0d1117] border border-[#30363d] rounded p-2.5 space-y-1.5 text-[11px] font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Pitch Fundamental:</span>
                    <span className="text-blue-400 font-bold">
                      {model.vocalflowProfile.fundamentalPitchHz} Hz
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Cadence:</span>
                    <span className="text-slate-200">
                      {model.vocalflowProfile.speechCadenceWpm} WPM
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Warmth / Clarity:</span>
                    <span className="text-slate-200">
                      {model.vocalflowProfile.warmthScore} / {model.vocalflowProfile.clarityScore}
                    </span>
                  </div>

                  {/* Embedding Vector Preview Bar */}
                  <div className="pt-1 border-t border-[#30363d]">
                    <span className="text-[9px] text-slate-500 block mb-1 uppercase tracking-wider">Vector Embedding Preview</span>
                    <div className="flex items-center gap-1 h-2.5">
                      {model.vocalflowProfile.embeddingVectorPreview.map((v, idx) => (
                        <div
                          key={idx}
                          className="flex-1 rounded-xs bg-blue-500/70"
                          style={{ height: `${Math.max(20, Math.abs(v) * 100)}%` }}
                          title={`Dim ${idx}: ${v}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="pt-2 border-t border-[#30363d] flex items-center justify-between gap-2">
              <button
                onClick={() => onSelectModelForStudio(model.id)}
                className="flex-1 py-1.5 rounded bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <Volume2 className="w-3.5 h-3.5" />
                Use in Workspace
              </button>

              {model.isCloned && (
                <button
                  onClick={() => handleDelete(model.id)}
                  className="p-1.5 rounded bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-800 text-xs transition-colors"
                  title="Delete cloned model"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Clone Voice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg w-full max-w-lg p-5 shadow-2xl text-slate-200 space-y-4 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-bold text-white">Clone Custom Voice Profile</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCloneSubmit} className="space-y-3">
              {cloneError && (
                <div className="p-2.5 rounded bg-red-900/30 border border-red-800 text-red-300 text-xs font-mono">
                  {cloneError}
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Voice Profile Name</label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="e.g. Alex — Studio Mic Sample"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="neutral">Neutral</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Age Group</label>
                  <select
                    value={ageGroup}
                    onChange={(e) => setAgeGroup(e.target.value as any)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="young">Young</option>
                    <option value="adult">Adult</option>
                    <option value="mature">Mature</option>
                  </select>
                </div>
              </div>

              {/* Audio Source Tabs: Upload or Record */}
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold text-slate-500">Audio Sample Input</label>

                <div className="grid grid-cols-2 gap-2">
                  {/* Record Mic */}
                  <div className="bg-[#0d1117] border border-[#30363d] rounded p-2.5 flex flex-col items-center justify-center gap-2 text-center">
                    <canvas ref={canvasRef} className="w-full h-8 bg-[#161b22] rounded" />
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs font-medium flex items-center gap-1.5"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        Record Mic
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="px-2.5 py-1 rounded bg-red-600 text-white font-bold text-xs flex items-center gap-1.5 animate-pulse"
                      >
                        Stop ({recordingTime}s)
                      </button>
                    )}
                  </div>

                  {/* File Upload Drop Area */}
                  <label className="bg-[#0d1117] border border-dashed border-[#30363d] hover:border-blue-500 rounded p-2.5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-slate-400 mb-1" />
                    <span className="text-xs text-slate-200 font-medium">Upload File</span>
                    <span className="text-[10px] text-slate-500 font-mono">WAV, MP3, M4A</span>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                </div>

                {audioFileName && (
                  <div className="p-2 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs flex items-center justify-between font-mono">
                    <span className="truncate">Sample: {audioFileName}</span>
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Tags (Comma Separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Custom Clone, Podcast, Warm"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={isCloning}
                className="w-full h-[36px] bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded transition-colors flex items-center justify-center gap-2"
              >
                <Activity className={`w-4 h-4 ${isCloning ? 'animate-spin' : ''}`} />
                {isCloning ? 'Analyzing Audio Vectors...' : 'TRAIN & CLONE VOICE MODEL'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
