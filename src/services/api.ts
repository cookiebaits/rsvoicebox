import { VoiceModel, GeneratedClip, ProxyStatus, SpeechSynthRequest, UserSession } from '../types';
import { audioEngine } from './audioEngine';

// Key for client-side localStorage persistence in static mode
const STORAGE_MODELS_KEY = 'vocalflow_custom_voice_models_v1';
const STORAGE_CLIPS_KEY = 'vocalflow_generated_clips_v1';
const STORAGE_SESSION_KEY = 'vocalflow_active_session_v1';

// Initial preselected voice library for static mode or fallback
const PRESELECTED_LIBRARY: VoiceModel[] = [
  {
    id: 'pres-barack-obama',
    name: 'Barack Obama — Audacity & Cadence',
    description: 'Signature cadenced baritone with measured dramatic pauses, vocal resonance, and rhythmic rhetoric.',
    category: 'preselected',
    gender: 'male',
    ageGroup: 'adult',
    accent: 'Chicago / General American',
    baseVoiceName: 'Zephyr',
    sampleAudioUrl: 'https://drive.google.com/drive/folders/1ymyE2f2Y7gNf7PIzYe_UHp7JpcmeuHif?usp=sharing',
    tags: ['President', 'Obama', 'Living', 'Baritone', 'Orator'],
    isCloned: false,
    vocalflowProfile: {
      fundamentalPitchHz: 110,
      pitchRangeHz: [85, 175],
      speechCadenceWpm: 135,
      warmthScore: 98,
      clarityScore: 95,
      resonantFormants: [450, 1450, 2400, 3400],
      embeddingVectorPreview: [0.29, -0.51, 0.84, 0.17, -0.33, 0.72, 0.14, -0.18],
      noiseFloorDb: -64,
      recommendedSpeed: 0.92,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pres-donald-trump',
    name: 'Donald Trump — Executive Address',
    description: 'Distinctive Queens accent with assertive volume, declarative rhythmic delivery, and signature emphasis.',
    category: 'preselected',
    gender: 'male',
    ageGroup: 'mature',
    accent: 'Queens NY / Executive',
    baseVoiceName: 'Puck',
    sampleAudioUrl: 'https://drive.google.com/drive/folders/1ymyE2f2Y7gNf7PIzYe_UHp7JpcmeuHif?usp=sharing',
    tags: ['President', 'Trump', 'Living', 'Executive', 'Loud'],
    isCloned: false,
    vocalflowProfile: {
      fundamentalPitchHz: 132,
      pitchRangeHz: [100, 190],
      speechCadenceWpm: 142,
      warmthScore: 55,
      clarityScore: 85,
      resonantFormants: [500, 1600, 2600, 3600],
      embeddingVectorPreview: [-0.62, 0.71, -0.15, 0.44, -0.88, 0.22, 0.91, -0.34],
      noiseFloorDb: -58,
      recommendedSpeed: 1.0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pres-joe-biden',
    name: 'Joe Biden — Scranton Empathy',
    description: 'Measured, folksy older statesman delivery with empathetic warmth, gentle rasp, and breathy cadence.',
    category: 'preselected',
    gender: 'male',
    ageGroup: 'mature',
    accent: 'Scranton PA / General American',
    baseVoiceName: 'Fenrir',
    sampleAudioUrl: 'https://drive.google.com/drive/folders/1ymyE2f2Y7gNf7PIzYe_UHp7JpcmeuHif?usp=sharing',
    tags: ['President', 'Biden', 'Living', 'Folksy', 'Warm'],
    isCloned: false,
    vocalflowProfile: {
      fundamentalPitchHz: 108,
      pitchRangeHz: [80, 160],
      speechCadenceWpm: 130,
      warmthScore: 85,
      clarityScore: 75,
      resonantFormants: [480, 1500, 2500, 3500],
      embeddingVectorPreview: [0.15, -0.22, 0.68, 0.45, 0.12, -0.55, 0.38, 0.61],
      noiseFloorDb: -62,
      recommendedSpeed: 0.95,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pres-george-w-bush',
    name: 'George W. Bush — Texas Baritone',
    description: 'Warm Texas drawl with conversational tone, slightly rhythmic cadence, and friendly mid-range projection.',
    category: 'preselected',
    gender: 'male',
    ageGroup: 'mature',
    accent: 'Texas / Midland American',
    baseVoiceName: 'Charon',
    sampleAudioUrl: 'https://drive.google.com/drive/folders/1ymyE2f2Y7gNf7PIzYe_UHp7JpcmeuHif?usp=sharing',
    tags: ['President', 'Bush', 'Living', 'Texas', 'Drawl'],
    isCloned: false,
    vocalflowProfile: {
      fundamentalPitchHz: 130,
      pitchRangeHz: [95, 185],
      speechCadenceWpm: 155,
      warmthScore: 82,
      clarityScore: 88,
      resonantFormants: [510, 1550, 2550, 3550],
      embeddingVectorPreview: [0.42, 0.15, -0.31, -0.66, 0.55, -0.19, 0.72, 0.11],
      noiseFloorDb: -65,
      recommendedSpeed: 1.0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pres-bill-clinton',
    name: 'Bill Clinton — Hope Arkansas Baritone',
    description: 'Smooth, charismatic Arkansas baritone with warm conversational drawl, persuasive cadence, and storytelling style.',
    category: 'preselected',
    gender: 'male',
    ageGroup: 'mature',
    accent: 'Hope Arkansas / Southern Baritone',
    baseVoiceName: 'Fenrir',
    sampleAudioUrl: 'https://drive.google.com/drive/folders/1ymyE2f2Y7gNf7PIzYe_UHp7JpcmeuHif?usp=sharing',
    tags: ['President', 'Clinton', 'Living', 'Arkansas', 'Charismatic'],
    isCloned: false,
    vocalflowProfile: {
      fundamentalPitchHz: 102,
      pitchRangeHz: [75, 160],
      speechCadenceWpm: 140,
      warmthScore: 96,
      clarityScore: 90,
      resonantFormants: [460, 1420, 2420, 3450],
      embeddingVectorPreview: [0.18, 0.42, 0.79, -0.21, 0.62, -0.14, 0.85, 0.22],
      noiseFloorDb: -65,
      recommendedSpeed: 0.96,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'celeb-morgan-freeman',
    name: 'Morgan Freeman — Deep Resonant Narrator',
    description: 'Unmistakable deep, warm, authoritative baritone with legendary cinematic narration warmth and gravitas.',
    category: 'preselected',
    gender: 'male',
    ageGroup: 'mature',
    accent: 'Memphis / Cinematic Deep Baritone',
    baseVoiceName: 'Fenrir',
    tags: ['Celebrity', 'Freeman', 'Living', 'Narrator', 'Deep'],
    isCloned: false,
    vocalflowProfile: {
      fundamentalPitchHz: 85,
      pitchRangeHz: [60, 120],
      speechCadenceWpm: 110,
      warmthScore: 99,
      clarityScore: 98,
      resonantFormants: [380, 1250, 2150, 3050],
      embeddingVectorPreview: [0.88, -0.72, 0.95, 0.12, -0.45, 0.82, 0.09, -0.31],
      noiseFloorDb: -68,
      recommendedSpeed: 0.88,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'celeb-arnold-schwarzenegger',
    name: 'Arnold Schwarzenegger — Action Icon Baritone',
    description: 'Bold, rhythmic action hero voice with iconic Austrian accent, commanding volume, and legendary movie delivery.',
    category: 'preselected',
    gender: 'male',
    ageGroup: 'mature',
    accent: 'Austrian / Action Hero Baritone',
    baseVoiceName: 'Puck',
    tags: ['Celebrity', 'Arnold', 'Living', 'Action Hero', 'Austrian'],
    isCloned: false,
    vocalflowProfile: {
      fundamentalPitchHz: 105,
      pitchRangeHz: [75, 165],
      speechCadenceWpm: 118,
      warmthScore: 65,
      clarityScore: 82,
      resonantFormants: [520, 1520, 2520, 3520],
      embeddingVectorPreview: [-0.45, 0.78, -0.22, 0.55, -0.68, 0.38, 0.82, -0.11],
      noiseFloorDb: -58,
      recommendedSpeed: 1.0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'celeb-david-attenborough',
    name: 'David Attenborough — Natural History Narrator',
    description: 'Revered British natural history narrator with gentle, wonder-filled, whispery cadence and crystal-clear articulation.',
    category: 'preselected',
    gender: 'male',
    ageGroup: 'mature',
    accent: 'RP British Broadcasting',
    baseVoiceName: 'Zephyr',
    tags: ['Celebrity', 'Attenborough', 'Living', 'British', 'Nature'],
    isCloned: false,
    vocalflowProfile: {
      fundamentalPitchHz: 115,
      pitchRangeHz: [85, 180],
      speechCadenceWpm: 125,
      warmthScore: 96,
      clarityScore: 98,
      resonantFormants: [490, 1490, 2490, 3490],
      embeddingVectorPreview: [0.15, 0.32, -0.48, 0.72, 0.22, -0.75, 0.48, 0.31],
      noiseFloorDb: -66,
      recommendedSpeed: 0.9,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'celeb-christopher-walken',
    name: 'Christopher Walken — Rhythmic Cadence Legend',
    description: 'Iconic Queens staccato delivery with unpredictable speech rhythms, dramatic pauses, and eccentric cadence.',
    category: 'preselected',
    gender: 'male',
    ageGroup: 'mature',
    accent: 'Queens NY Staccato',
    baseVoiceName: 'Charon',
    tags: ['Celebrity', 'Walken', 'Living', 'Staccato', 'Iconic'],
    isCloned: false,
    vocalflowProfile: {
      fundamentalPitchHz: 112,
      pitchRangeHz: [80, 180],
      speechCadenceWpm: 105,
      warmthScore: 75,
      clarityScore: 88,
      resonantFormants: [505, 1505, 2505, 3505],
      embeddingVectorPreview: [-0.28, 0.65, 0.34, -0.58, 0.41, 0.79, -0.22, 0.48],
      noiseFloorDb: -60,
      recommendedSpeed: 0.92,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'celeb-samuel-l-jackson',
    name: 'Samuel L. Jackson — Bold Expressive Voice',
    description: 'Powerful, intense, highly expressive voice with sharp emphasis, commanding volume, and legendary punch.',
    category: 'preselected',
    gender: 'male',
    ageGroup: 'mature',
    accent: 'Chattanooga / Bold American',
    baseVoiceName: 'Puck',
    tags: ['Celebrity', 'Jackson', 'Living', 'Bold', 'Dramatic'],
    isCloned: false,
    vocalflowProfile: {
      fundamentalPitchHz: 118,
      pitchRangeHz: [85, 195],
      speechCadenceWpm: 165,
      warmthScore: 70,
      clarityScore: 95,
      resonantFormants: [515, 1515, 2515, 3515],
      embeddingVectorPreview: [-0.42, 0.84, -0.15, 0.51, -0.61, 0.42, 0.88, -0.08],
      noiseFloorDb: -57,
      recommendedSpeed: 1.05,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'celeb-keanu-reeves',
    name: 'Keanu Reeves — Chill Action Tone',
    description: 'Cool, relaxed, grounded baritone with serene conversational tone and thoughtful delivery.',
    category: 'preselected',
    gender: 'male',
    ageGroup: 'adult',
    accent: 'West Coast / Canadian Cool',
    baseVoiceName: 'Zephyr',
    tags: ['Celebrity', 'Keanu', 'Living', 'Cool', 'Grounded'],
    isCloned: false,
    vocalflowProfile: {
      fundamentalPitchHz: 100,
      pitchRangeHz: [75, 145],
      speechCadenceWpm: 115,
      warmthScore: 85,
      clarityScore: 85,
      resonantFormants: [475, 1475, 2475, 3475],
      embeddingVectorPreview: [0.12, -0.38, 0.72, 0.31, -0.15, 0.68, 0.25, -0.12],
      noiseFloorDb: -63,
      recommendedSpeed: 0.94,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'celeb-oprah-winfrey',
    name: 'Oprah Winfrey — Inspiring Warm Broadcaster',
    description: 'Resonant, highly inspiring broadcast voice with warm empathetic inflection and powerful public speaking resonance.',
    category: 'preselected',
    gender: 'female',
    ageGroup: 'mature',
    accent: 'General American Broadcast',
    baseVoiceName: 'Kore',
    tags: ['Celebrity', 'Oprah', 'Living', 'Inspiring', 'Broadcast'],
    isCloned: false,
    vocalflowProfile: {
      fundamentalPitchHz: 195,
      pitchRangeHz: [140, 280],
      speechCadenceWpm: 150,
      warmthScore: 97,
      clarityScore: 97,
      resonantFormants: [600, 1600, 2600, 3600],
      embeddingVectorPreview: [-0.22, 0.58, 0.28, -0.72, 0.49, -0.12, 0.88, 0.24],
      noiseFloorDb: -65,
      recommendedSpeed: 0.98,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
export async function fetchProxyStatus(): Promise<ProxyStatus> {
  try {
    const res = await fetch('/api/system/proxy-status');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // Fallback if running on static host like GitHub Pages
  }

  return {
    isCloudflareProxy: false,
    visitorIp: '127.0.0.1 (Client)',
    proto: window.location.protocol.replace(':', ''),
    isDokployContainer: false,
    host: window.location.host,
    isGitHubPagesMode: window.location.hostname.includes('github.io') || !window.location.port,
    timestamp: new Date().toISOString(),
  };
}

export async function loginUser(username: string, password?: string): Promise<UserSession> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(data.user));
      return data.user;
    }
  } catch (err) {
    // Client fallback
  }

  const session: UserSession = {
    id: `usr_${Date.now()}`,
    username: username || 'Studio Operator',
    email: `${(username || 'engineer').toLowerCase()}@vocalflow.ai`,
    role: 'creator',
    token: `gh_session_${Math.random().toString(36).substring(2, 10)}`,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getActiveSession(): UserSession | null {
  try {
    const saved = localStorage.getItem(STORAGE_SESSION_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return null;
}

export function logoutUser(): void {
  localStorage.removeItem(STORAGE_SESSION_KEY);
}

export async function fetchVoiceModels(): Promise<VoiceModel[]> {
  try {
    const res = await fetch('/api/voice/models');
    if (res.ok) {
      const serverModels: VoiceModel[] = await res.json();
      // Merge with custom client local models if any
      const localCustom = getLocalCustomModels();
      const combined = [...serverModels];
      for (const loc of localCustom) {
        if (!combined.some((m) => m.id === loc.id)) {
          combined.unshift(loc);
        }
      }
      return combined;
    }
  } catch (e) {
    // Static mode
  }

  const localCustom = getLocalCustomModels();
  return [...localCustom, ...PRESELECTED_LIBRARY];
}

function getLocalCustomModels(): VoiceModel[] {
  try {
    const saved = localStorage.getItem(STORAGE_MODELS_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return [];
}

function saveLocalCustomModel(model: VoiceModel): void {
  const list = getLocalCustomModels();
  list.unshift(model);
  localStorage.setItem(STORAGE_MODELS_KEY, JSON.stringify(list));
}

export async function cloneVoiceSample(params: {
  name: string;
  description?: string;
  gender?: 'female' | 'male' | 'neutral';
  ageGroup?: 'young' | 'adult' | 'mature';
  tags?: string[];
  audioBase64: string;
}): Promise<VoiceModel> {
  try {
    const res = await fetch('/api/voice/clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (res.ok) {
      const newModel = await res.json();
      saveLocalCustomModel(newModel);
      return newModel;
    }
  } catch (e) {
    // Client offline static fallback
  }

  // Client-side simulation of RuinScams Vocal Clone Turbo cloning
  const pitchHz = params.gender === 'female' ? 210 : params.gender === 'male' ? 120 : 160;
  const newModel: VoiceModel = {
    id: `clone_local_${Date.now()}`,
    name: params.name,
    description: params.description || 'Custom RuinScams Vocal Clone Turbo cloned voice profile created offline.',
    category: 'custom',
    gender: params.gender || 'neutral',
    ageGroup: params.ageGroup || 'adult',
    accent: 'Custom Cloned Sample',
    baseVoiceName: pitchHz < 140 ? 'Zephyr' : pitchHz > 200 ? 'Kore' : 'Puck',
    sampleAudioUrl: params.audioBase64.length < 400000 ? params.audioBase64 : undefined,
    transcriptSample: 'Sample transcript captured during local RuinScams Vocal Clone voice training session.',
    tags: params.tags || ['Custom Clone', 'RuinScams Vocal Clone Turbo'],
    isCloned: true,
    vocalProfile: {
      fundamentalPitchHz: pitchHz,
      pitchRangeHz: [pitchHz - 30, pitchHz + 40],
      speechCadenceWpm: 150,
      warmthScore: 88,
      clarityScore: 94,
      resonantFormants: [520, 1600, 2600, 3600],
      embeddingVectorPreview: Array.from({ length: 8 }, () => Number((Math.random() * 1.8 - 0.9).toFixed(2))),
      noiseFloorDb: -64,
      recommendedSpeed: 1.0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveLocalCustomModel(newModel);
  return newModel;
}

export async function deleteVoiceModel(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/voice/models/${id}`, { method: 'DELETE' });
    if (res.ok) {
      // remove local if present
      const list = getLocalCustomModels().filter((m) => m.id !== id);
      localStorage.setItem(STORAGE_MODELS_KEY, JSON.stringify(list));
      return true;
    }
  } catch (e) {}

  const list = getLocalCustomModels().filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_MODELS_KEY, JSON.stringify(list));
  return true;
}

export async function synthesizeSpeech(req: SpeechSynthRequest): Promise<GeneratedClip> {
  let serverClip: GeneratedClip | null = null;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 115000);

  try {
    const res = await fetch('/api/voice/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal: controller.signal,
    });
    if (res.ok) {
      serverClip = await res.json();
    }
  } catch (e) {
    console.warn('Backend synthesis timeout or network error, falling back to local DSP engine.');
  } finally {
    clearTimeout(timeoutId);
  }

  // If server clip exists AND has an audioUrl, return it!
  if (serverClip && serverClip.audioUrl) {
    saveLocalClip(serverClip);
    return serverClip;
  }

  // Generate Web Audio DSP synthesized buffer client-side
  const allModels = await fetchVoiceModels();
  const selectedModel = allModels.find((m) => m.id === req.voiceModelId) || allModels[0];
  const basePitch = selectedModel.vocalProfile?.fundamentalPitchHz || 140;

  const { audioUrl, duration } = await audioEngine.generateOfflineSpeechBuffer(
    req.text,
    req.pitchShift || 0,
    req.speed || 1.0,
    basePitch
  );

  const clip: GeneratedClip = {
    id: serverClip?.id || `clip_local_${Date.now()}`,
    title: req.text.length > 35 ? `${req.text.substring(0, 35)}...` : req.text,
    scriptText: req.text,
    voiceModelId: selectedModel.id,
    voiceModelName: selectedModel.name,
    audioUrl: audioUrl,
    durationSeconds: duration,
    sampleRate: 24000,
    settings: {
      pitchShift: req.pitchShift || 0,
      speed: req.speed || 1.0,
    },
    createdAt: new Date().toISOString(),
  };

  saveLocalClip(clip);
  return clip;
}

export async function fetchClipHistory(): Promise<GeneratedClip[]> {
  try {
    const res = await fetch('/api/voice/clips');
    if (res.ok) {
      const serverClips: GeneratedClip[] = await res.json();
      const localClips = getLocalClips();
      const combined = [...serverClips];
      for (const loc of localClips) {
        if (!combined.some((c) => c.id === loc.id)) {
          combined.push(loc);
        }
      }
      return combined;
    }
  } catch (e) {}

  return getLocalClips();
}

function getLocalClips(): GeneratedClip[] {
  try {
    const saved = localStorage.getItem(STORAGE_CLIPS_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return [];
}

function saveLocalClip(clip: GeneratedClip): void {
  try {
    const list = getLocalClips();
    list.unshift(clip);
    // Keep only the most recent 5 clips in localStorage to avoid QuotaExceededError with base64 data
    if (list.length > 5) {
      list.length = 5;
    }
    localStorage.setItem(STORAGE_CLIPS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Could not save clip locally, storage might be full.', e);
  }
}

export async function deleteClip(id: string): Promise<boolean> {
  try {
    await fetch(`/api/voice/clips/${id}`, { method: 'DELETE' });
  } catch (e) {}

  const list = getLocalClips().filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_CLIPS_KEY, JSON.stringify(list));
  return true;
}

export async function scriptAssist(currentScript: string, prompt?: string): Promise<{ enhancedScript: string; notes?: string }> {
  try {
    const res = await fetch('/api/voice/script-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentScript, prompt }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {}

  // Fallback enhancement
  return {
    enhancedScript: currentScript ? `${currentScript} [pause=300ms]` : 'Hello! Welcome to RuinScams Vocal Clone Turbo voice studio. High fidelity voice cloning.',
    notes: 'Script formatted with pause markers for high clarity.',
  };
}

export async function remakeVoiceModel(prompt: string, baseModelId?: string, name?: string): Promise<VoiceModel> {
  const res = await fetch('/api/voice/remake', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, baseModelId, name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to remake voice model.');
  }
  return await res.json();
}
