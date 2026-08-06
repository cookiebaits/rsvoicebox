import React, { useState } from 'react';
import { Mic, Sparkles, Sliders, Play, Volume2, Wand2, RefreshCw, Layers, Zap, Info, Activity, Radio, Cpu, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { VoiceModel, GeneratedClip, ActiveSynthesisJob } from '../types';
import { synthesizeSpeech, scriptAssist, remakeVoiceModel } from '../services/api';
import { AudioWaveformPlayer } from './AudioWaveformPlayer';

interface VoiceStudioProps {
  voiceModels: VoiceModel[];
  onStartSynthesis?: (job: ActiveSynthesisJob) => void;
  onClipGenerated: (clip: GeneratedClip) => void;
  onSynthesisError?: (errorMsg: string) => void;
  onVoiceModelsUpdated?: () => void;
}

export const VoiceStudio: React.FC<VoiceStudioProps> = ({
  voiceModels,
  onStartSynthesis,
  onClipGenerated,
  onSynthesisError,
  onVoiceModelsUpdated,
}) => {
  const [scriptText, setScriptText] = useState(
    "As a prominent figure of the free world, I believe we are responsible for being philanthropists."
  );
  const [selectedModelId, setSelectedModelId] = useState<string>(
    voiceModels.length > 0 ? voiceModels[0].id : 'pres-barack-obama'
  );

  // Audio Fine-Tuning Controls
  const [pitchShift, setPitchShift] = useState<number>(0); // -12 to +12
  const [speed, setSpeed] = useState<number>(1.0); // 0.5 to 2.0

  // Remake Voice with Prompt UI states
  const [showRemakeModal, setShowRemakeModal] = useState<boolean>(false);
  const [remakePrompt, setRemakePrompt] = useState<string>('');
  const [customRemakeName, setCustomRemakeName] = useState<string>('');
  const [isRemaking, setIsRemaking] = useState<boolean>(false);

  // UI States
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [isEnhancingScript, setIsEnhancingScript] = useState<boolean>(false);
  const [currentClip, setCurrentClip] = useState<GeneratedClip | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const activeModel = voiceModels.find((m) => m.id === selectedModelId) || voiceModels[0];

  // Calculate estimated duration
  const words = scriptText.trim().split(/\s+/).filter(Boolean).length;
  const estimatedWpm = activeModel?.vocalflowProfile?.speechCadenceWpm || 150;
  const estimatedDurationSecs = Math.max(1, Number(((words / (estimatedWpm / 60)) / speed).toFixed(1)));

  // SSML / Tag Quick Inserter
  const insertTag = (tag: string) => {
    setScriptText((prev) => `${prev} ${tag} `);
  };

  // Enhance script with Gemini AI
  const handleEnhanceScript = async () => {
    setIsEnhancingScript(true);
    try {
      const res = await scriptAssist(scriptText, 'Add natural pauses, emphasis, and improve conversational rhythm for voice synthesis.');
      if (res.enhancedScript) {
        setScriptText(res.enhancedScript);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsEnhancingScript(false);
    }
  };

  // Remake / Clone Voice with Prompt
  const handleRemakeVoice = async () => {
    if (!remakePrompt.trim()) {
      setErrorMsg('Please enter a description prompt to remake the voice.');
      return;
    }

    setIsRemaking(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const remade = await remakeVoiceModel(remakePrompt, activeModel.id, customRemakeName || undefined);
      if (onVoiceModelsUpdated) {
        onVoiceModelsUpdated();
      }
      setSelectedModelId(remade.id);
      setShowRemakeModal(false);
      setRemakePrompt('');
      setCustomRemakeName('');
      setSuccessMsg(`Successfully remade voice profile: "${remade.name}"!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to remake voice profile.');
    } finally {
      setIsRemaking(false);
    }
  };

  // Generate Speech Synthesis Clip
  const handleSynthesize = async () => {
    if (!scriptText.trim()) {
      setErrorMsg('Please enter a script to generate speech.');
      return;
    }

    const jobId = `job_${Date.now()}`;
    const job: ActiveSynthesisJob = {
      id: jobId,
      voiceModelId: selectedModelId,
      voiceModelName: activeModel?.name || 'Pretuned Voice',
      title: scriptText.length > 35 ? `${scriptText.substring(0, 35)}...` : scriptText,
      scriptText,
      progress: 10,
      statusText: `Initializing Gemini 2.0 AI...`,
      startTime: Date.now(),
    };

    if (onStartSynthesis) {
      onStartSynthesis(job);
    }

    setIsSynthesizing(true);
    setErrorMsg('');
    try {
      const clip = await synthesizeSpeech({
        text: scriptText,
        voiceModelId: selectedModelId,
        pitchShift,
        speed,
        engine: 'gemini',
      });

      setCurrentClip(clip);
      onClipGenerated(clip);
    } catch (err: any) {
      const msg = err.message || 'Speech synthesis failed.';
      setErrorMsg(msg);
      if (onSynthesisError) {
        onSynthesisError(msg);
      }
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Studio Header */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <Mic className="w-4 h-4 text-blue-500" />
              Living Presidents & Celebrities Synthesis Studio
            </h2>
          </div>
          <p className="text-[11px] text-slate-400">
            Synthesize authentic neural audio using living US Presidents and living celebrity voice models with RuinScams Vocal Clone-Turbo acoustic analyzer.
          </p>
        </div>

        <button
          onClick={() => setShowRemakeModal(!showRemakeModal)}
          className="px-3 py-1.5 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
        >
          <Wand2 className="w-3.5 h-3.5 text-purple-400" />
          Remake Voice with Prompt
        </button>
      </div>

      {successMsg && (
        <div className="p-3 rounded bg-green-900/40 border border-green-700 text-green-300 text-xs font-mono flex items-center gap-2">
          <Check className="w-4 h-4 text-green-400" />
          {successMsg}
        </div>
      )}

      {/* Remake Voice Modal / Card */}
      {showRemakeModal && (
        <div className="bg-[#161b22] border border-purple-500/40 rounded-lg p-4 shadow-lg space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Remake / Re-tune Voice Profile: <span className="text-purple-300 font-mono">{activeModel?.name}</span>
            </h3>
            <button
              onClick={() => setShowRemakeModal(false)}
              className="text-slate-400 hover:text-white text-xs font-mono"
            >
              ✕ Close
            </button>
          </div>

          <p className="text-[11px] text-slate-400">
            Type natural language instructions to remake this voice profile (e.g., adjust pitch, accent, speed, or vocal archetype). RuinScams Vocal Clone-Turbo will extract acoustic parameters and train a new model.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Custom Name (Optional)
              </label>
              <input
                type="text"
                value={customRemakeName}
                onChange={(e) => setCustomRemakeName(e.target.value)}
                placeholder={`e.g., ${activeModel?.name.split('—')[0].trim()} (Trailer Edition)`}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Quick Preset Prompt Presets
              </label>
              <div className="flex flex-wrap gap-1">
                {[
                  'Dramatic Movie Trailer Baritone with deep bass',
                  'Futuristic High-Tech AI with high clarity',
                  'Energetic Sports Announcer fast cadence',
                  'Whispering Midnight Radio Host smooth warmth',
                  'British Accent Formal Academic Narrator',
                ].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setRemakePrompt(preset)}
                    className="px-2 py-0.5 rounded bg-[#0d1117] hover:bg-purple-950/40 text-purple-300 border border-purple-500/20 text-[10px] transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Voice Remake Description Prompt
            </label>
            <textarea
              value={remakePrompt}
              onChange={(e) => setRemakePrompt(e.target.value)}
              rows={3}
              placeholder="Describe how to remake this voice model (e.g. 'Make it sound like a deep gravelly movie trailer narrator with slow measured pace and British accent')..."
              className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors font-sans"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setShowRemakeModal(false)}
              className="px-3 py-1.5 rounded bg-[#0d1117] hover:bg-[#1c2128] text-slate-300 text-xs font-medium border border-[#30363d]"
            >
              Cancel
            </button>
            <button
              onClick={handleRemakeVoice}
              disabled={isRemaking}
              className="px-4 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Wand2 className={`w-3.5 h-3.5 ${isRemaking ? 'animate-spin' : ''}`} />
              {isRemaking ? 'TRAINING REMADE VOICE...' : 'GENERATE REMADE VOICE PROFILE'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Script Editor & Voice Selection (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Script Input Card */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5 tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                Script & Narration Editor
              </label>

              {/* AI Script Assistant Button */}
              <button
                onClick={handleEnhanceScript}
                disabled={isEnhancingScript}
                className="px-2.5 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-medium flex items-center gap-1.5 transition-all"
              >
                <Wand2 className={`w-3.5 h-3.5 ${isEnhancingScript ? 'animate-spin' : ''}`} />
                {isEnhancingScript ? 'Enhancing...' : 'AI Director'}
              </button>
            </div>

            {/* Quick SSML Tag Chips & Presidential Speech Presets */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase">SSML Tags:</span>
                {[
                  { label: '[pause=300ms]', tag: '[pause=300ms]' },
                  { label: '[whisper]', tag: '[whisper]' },
                  { label: '[dramatic]', tag: '[dramatic]' },
                  { label: '[excited]', tag: '[excited]' },
                  { label: '[emphasis]', tag: '[emphasis=strong]' },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => insertTag(item.tag)}
                    className="px-1.5 py-0.5 rounded bg-[#0d1117] hover:bg-[#1c2128] border border-[#30363d] text-slate-300 text-[10px] font-mono transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Living Presidents & Celebrities Sample Speech Selector */}
              <div className="pt-1.5 border-t border-[#30363d]/60 space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-blue-400 font-bold uppercase flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Living Presidents:
                  </span>
                  {[
                    {
                      name: 'Philanthropists Speech',
                      modelId: 'pres-barack-obama',
                      script: 'As a prominent figure of the free world, I believe we are responsible for being philanthropists.',
                    },
                    {
                      name: 'Obama — Audacity of Hope',
                      modelId: 'pres-barack-obama',
                      script: "There's not a liberal America and a conservative America; there's the United States of America. There's not a black America and white America and Latino America; there's the United States of America.",
                    },
                    {
                      name: 'Trump — Executive Address',
                      modelId: 'pres-donald-trump',
                      script: 'We will make America strong again. We will make America proud again. We will make America safe again. And we will make America great again. Thank you, God bless you, and God bless America.',
                    },
                    {
                      name: 'Biden — Scranton Address',
                      modelId: 'pres-joe-biden',
                      script: 'Look, folks. Democracy is not a state of being, it is an act. And each generation must do its part to preserve it, defend it, and strengthen it for tomorrow.',
                    },
                    {
                      name: 'Bush — Texas Briefing',
                      modelId: 'pres-george-w-bush',
                      script: 'America is a nation that comes together in times of trial. We stand united, determined, and confident in the strength and freedom of our people.',
                    },
                    {
                      name: 'Clinton — Hope Arkansas',
                      modelId: 'pres-bill-clinton',
                      script: "There is nothing wrong with America that cannot be cured by what is right with America. Let us give this country the future it deserves.",
                    },
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => {
                        setScriptText(preset.script);
                        if (voiceModels.some((m) => m.id === preset.modelId)) {
                          setSelectedModelId(preset.modelId);
                        }
                      }}
                      className="px-2 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-medium transition-colors"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#30363d]/40">
                  <span className="text-[10px] text-purple-400 font-bold uppercase flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Living Celebrities:
                  </span>
                  {[
                    {
                      name: 'Morgan Freeman — Cinema',
                      modelId: 'celeb-morgan-freeman',
                      script: 'Some birds are not meant to be caged, that is all. Their feathers are just too bright, their songs too sweet and wild.',
                    },
                    {
                      name: 'Arnold — Action Hero',
                      modelId: 'celeb-arnold-schwarzenegger',
                      script: 'Strength does not come from winning. Your struggles develop your strengths. When you go through hardships and decide not to surrender, that is strength.',
                    },
                    {
                      name: 'Attenborough — Nature',
                      modelId: 'celeb-david-attenborough',
                      script: 'It seems to me that the natural world is the greatest source of excitement, the greatest source of visual beauty, the greatest source of intellectual interest.',
                    },
                    {
                      name: 'Christopher Walken — Rhythmic',
                      modelId: 'celeb-christopher-walken',
                      script: 'You know... life is like a dance. You got to listen to the rhythm, feel the beat, and take your time.',
                    },
                    {
                      name: 'Samuel L. Jackson — Bold',
                      modelId: 'celeb-samuel-l-jackson',
                      script: 'You have got to stand up for what you believe in, give it everything you have got, and leave nothing behind!',
                    },
                    {
                      name: 'Keanu Reeves — Chill',
                      modelId: 'celeb-keanu-reeves',
                      script: 'Every struggle in your life has shaped you into the person you are today. Be thankful for the hard times, they can only make you stronger.',
                    },
                    {
                      name: 'Oprah — Inspiration',
                      modelId: 'celeb-oprah-winfrey',
                      script: 'The biggest adventure you can take is to live the life of your dreams. Turn your wounds into wisdom and keep moving forward.',
                    },
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => {
                        setScriptText(preset.script);
                        if (voiceModels.some((m) => m.id === preset.modelId)) {
                          setSelectedModelId(preset.modelId);
                        }
                      }}
                      className="px-2 py-0.5 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-medium transition-colors"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <textarea
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              rows={5}
              placeholder="Enter text to synthesize..."
              className="w-full bg-[#0d1117] border border-[#30363d] rounded p-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors resize-none leading-relaxed font-sans"
            />

            {/* Script Metadata Footer */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
              <span>
                {scriptText.length} chars • <strong className="text-slate-200">{words}</strong> words
              </span>
              <span className="flex items-center gap-1 text-blue-400 font-mono text-[10px]">
                <Zap className="w-3.5 h-3.5" />
                Est. Duration: ~{estimatedDurationSecs}s
              </span>
            </div>
          </div>

          {/* Voice Model Selector Card */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-blue-500" />
                Active Voice Model Profile
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                {voiceModels.length} MODELS READY
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {voiceModels.map((model) => {
                const isSelected = model.id === selectedModelId;
                return (
                  <div
                    key={model.id}
                    onClick={() => setSelectedModelId(model.id)}
                    className={`p-2.5 rounded border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#1c2128] border-blue-500 shadow-sm ring-1 ring-blue-500/50'
                        : 'bg-[#0d1117] border-[#30363d] hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-semibold text-white truncate">{model.name}</h4>
                      {model.isCloned ? (
                        <span className="text-[9px] bg-purple-900/50 text-purple-300 px-1 rounded border border-purple-700 font-mono">
                          CUSTOM
                        </span>
                      ) : (
                        <span className="text-[9px] bg-[#30363d] text-slate-300 px-1 rounded font-mono">
                          PRESET
                        </span>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-400 line-clamp-2 mb-1.5">{model.description}</p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>{model.gender} • {model.accent || 'Neutral'}</span>
                      <span className="text-blue-400 font-bold">
                        {model.vocalflowProfile?.fundamentalPitchHz}Hz
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RuinScams Vocal Clone-Turbo Acoustic Voice Profile Inspector */}
          {activeModel && (
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-green-400 animate-pulse" />
                  Voice Profile & Reference Sample Inspector
                </h3>
                {activeModel.sampleAudioUrl && (
                  <a
                    href={activeModel.sampleAudioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <ExternalLink className="w-3 h-3 text-blue-400" />
                    Reference Audio Drive (Bush / Obama / Trump)
                  </a>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
                <div className="bg-[#0d1117] p-2 rounded border border-[#30363d] space-y-0.5">
                  <span className="text-slate-500 block">PITCH (F0):</span>
                  <span className="text-blue-400 text-xs font-bold block">
                    {activeModel.vocalflowProfile?.fundamentalPitchHz} Hz
                  </span>
                  <span className="text-slate-400 text-[9px]">
                    {activeModel.gender === 'female' ? 'High Treble' : activeModel.vocalflowProfile?.fundamentalPitchHz! < 100 ? 'Deep Bass G1' : 'Baritone C2'}
                  </span>
                </div>

                <div className="bg-[#0d1117] p-2 rounded border border-[#30363d] space-y-0.5">
                  <span className="text-slate-500 block">CADENCE:</span>
                  <span className="text-purple-400 text-xs font-bold block">
                    {activeModel.vocalflowProfile?.speechCadenceWpm} WPM
                  </span>
                  <span className="text-slate-400 text-[9px]">Rhythmic Speed</span>
                </div>

                <div className="bg-[#0d1117] p-2 rounded border border-[#30363d] space-y-0.5">
                  <span className="text-slate-500 block">WARMTH SCORE:</span>
                  <span className="text-amber-400 text-xs font-bold block">
                    {activeModel.vocalflowProfile?.warmthScore}%
                  </span>
                  <span className="text-slate-400 text-[9px]">Resonance Depth</span>
                </div>

                <div className="bg-[#0d1117] p-2 rounded border border-[#30363d] space-y-0.5">
                  <span className="text-slate-500 block">CLARITY INDEX:</span>
                  <span className="text-emerald-400 text-xs font-bold block">
                    {activeModel.vocalflowProfile?.clarityScore}%
                  </span>
                  <span className="text-slate-400 text-[9px]">Formant Separation</span>
                </div>
              </div>

              {/* Formants & Embedding Vector Visualizer */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                  <span>Formant Spectrum (F1 / F2 / F3):</span>
                  <span className="text-blue-300">
                    {activeModel.vocalflowProfile?.resonantFormants?.slice(0, 3).join('Hz / ')}Hz
                  </span>
                </div>

                {/* 8-Band Vector Embedding Visualizer */}
                <div className="space-y-1 bg-[#0d1117] p-2 rounded border border-[#30363d]">
                  <span className="text-[9px] uppercase text-slate-500 font-mono block">
                    Neural Embedding Vector (8 Dimensions):
                  </span>
                  <div className="flex items-end gap-1.5 h-8 pt-1">
                    {(activeModel.vocalflowProfile?.embeddingVectorPreview || [0.2, -0.4, 0.6, 0.1, -0.3, 0.8, 0.4, -0.2]).map((val, idx) => {
                      const heightPercent = Math.max(15, Math.min(100, Math.abs(val) * 100));
                      const isPositive = val >= 0;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                          <div
                            className={`w-full rounded-t transition-all ${
                              isPositive ? 'bg-blue-500 group-hover:bg-blue-400' : 'bg-purple-500 group-hover:bg-purple-400'
                            }`}
                            style={{ height: `${heightPercent}%` }}
                            title={`Dim ${idx + 1}: ${val}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Audio Fine-Tuning & Generator Selector (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Generator Engine Selector Card */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 shadow-sm space-y-3">
            <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              Speech Generation Engine
            </h3>

            <div className="grid grid-cols-1 gap-2">
              <button
                className={`p-2 rounded border text-left flex flex-col justify-between transition-all bg-blue-600/15 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/50 cursor-default`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold">Gemini 2.0 AI</span>
                  <Check className="w-3 h-3 text-blue-400" />
                </div>
                <span className="text-[9px] text-slate-400 leading-tight">Neural Voice Persona & Pitch</span>
              </button>
            </div>
          </div>

          {/* Fine-Tuning Parameters Card */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 shadow-sm space-y-4">
            <h3 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-500" />
              Speech Parameter Fine-Tuning
            </h3>

            {/* Pitch Shift Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400">
                <span>Pitch Shift</span>
                <span className="text-blue-400 font-mono">
                  {pitchShift > 0 ? `+${pitchShift}` : pitchShift}st
                </span>
              </div>
              <input
                type="range"
                min={-12}
                max={12}
                step={1}
                value={pitchShift}
                onChange={(e) => setPitchShift(Number(e.target.value))}
                className="w-full accent-blue-500 h-1 bg-[#30363d] rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>Deep (-12st)</span>
                <span>Normal (0st)</span>
                <span>High (+12st)</span>
              </div>
            </div>

            {/* Speed Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400">
                <span>Speaking Rate</span>
                <span className="text-blue-400 font-mono">{speed}x</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.05}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full accent-blue-500 h-1 bg-[#30363d] rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>0.5x</span>
                <span>1.0x (Normal)</span>
                <span>2.0x</span>
              </div>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded bg-red-900/30 border border-red-800 text-red-300 text-xs font-mono">
                {errorMsg}
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleSynthesize}
              disabled={isSynthesizing}
              className="w-full h-[38px] bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Volume2 className={`w-4 h-4 ${isSynthesizing ? 'animate-bounce' : ''}`} />
              {isSynthesizing ? 'SYNTHESIZING AUDIO...' : 'GENERATE AUDIO CLIPS'}
            </button>
          </div>

          {/* Current Generated Clip Player Output */}
          {currentClip && (
            <div className="space-y-1.5">
              <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-blue-500" />
                Latest Output Preview
              </h4>
              <AudioWaveformPlayer
                audioUrl={currentClip.audioUrl}
                title={`${currentClip.voiceModelName} — ${currentClip.title}`}
                durationSeconds={currentClip.durationSeconds}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

