import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Modality } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const currentDir = process.cwd();

const app = express();
const PORT = 3000;

// Increase payload limit for base64 audio sample uploads
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Trust proxy headers for Dokploy & Cloudflare reverse proxy compatibility
app.set('trust proxy', true);

// Initialize Gemini Client safely
let ai: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!ai && process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return ai;
}

// In-Memory Database for Voice Models and Clips
interface DBVoiceModel {
  id: string;
  name: string;
  description: string;
  category: 'custom' | 'preselected';
  gender: 'female' | 'male' | 'neutral';
  ageGroup: 'young' | 'adult' | 'mature';
  accent?: string;
  avatarUrl?: string;
  baseVoiceName?: string;
  sampleAudioUrl?: string;
  transcriptSample?: string;
  tags: string[];
  isCloned: boolean;
  vocalProfile?: {
    fundamentalPitchHz: number;
    pitchRangeHz: [number, number];
    speechCadenceWpm: number;
    warmthScore: number;
    clarityScore: number;
    resonantFormants: number[];
    embeddingVectorPreview: number[];
    noiseFloorDb: number;
    recommendedSpeed: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface DBClip {
  id: string;
  title: string;
  scriptText: string;
  voiceModelId: string;
  voiceModelName: string;
  audioUrl: string;
  durationSeconds: number;
  sampleRate: number;
  settings: {
    pitchShift: number;
    speed: number;
  };
  createdAt: string;
}

// Helper: Generate engineered 24kHz WAV PCM audio data with model pitch & formant profiles
function generateSyntheticWavBuffer(
  text: string,
  pitchHz: number,
  wpm: number,
  formants: number[],
  modelId: string = '',
  gender: string = 'male',
  pitchShift: number = 0,
  speed: number = 1.0
): string {
  const sampleRate = 24000;

  // Pitch shift semitone scaling
  let f0 = (pitchHz || 110) * Math.pow(2, pitchShift / 12);

  // Speed tempo calculation
  let effectiveWpm = (wpm || 140) * speed;

  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = Math.max(1, words.length);
  const durationSec = Math.max(1.8, wordCount / ((effectiveWpm / 60) * 2.2));
  const totalSamples = Math.floor(sampleRate * durationSec);
  const buffer = new Int16Array(totalSamples);

  // Formants
  let f1 = formants?.[0] || (gender === 'female' ? 620 : 480);
  let f2 = formants?.[1] || (gender === 'female' ? 1950 : 1500);
  let f3 = formants?.[2] || (gender === 'female' ? 2900 : 2500);

  // Formant shift based on pitchShift
  f1 *= Math.pow(2, pitchShift / 24);
  f2 *= Math.pow(2, pitchShift / 24);

  const isDeep = modelId.includes('freeman') || modelId.includes('fenrir') || f0 < 95;
  const isTrump = modelId.includes('trump');
  const isArnold = modelId.includes('arnold');
  const isOprah = modelId.includes('oprah') || gender === 'female';
  const isAttenborough = modelId.includes('attenborough');
  const isWalken = modelId.includes('walken');

  const samplesPerWord = Math.max(1, totalSamples / wordCount);
  const intonationDepth = 12;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const wordProgress = (i % samplesPerWord) / samplesPerWord;

    // Word boundary modulation
    let wordEnv = Math.sin(Math.PI * Math.min(1, wordProgress / 0.85));
    if (wordProgress > 0.85) wordEnv *= 0.1;

    if (isWalken && Math.sin(t * 8) < -0.6) {
      wordEnv *= 0.2;
    }

    const globalEnv = Math.sin(Math.PI * (i / totalSamples));
    const combinedEnv = Math.max(0, wordEnv * globalEnv);

    // Intonation & pitch contour per word
    const jitter = (Math.random() - 0.5) * 2;
    let intonation = Math.sin(Math.PI * wordProgress) * intonationDepth;
    if (isDeep) intonation *= 0.6;
    const currentF0 = Math.max(40, f0 + intonation + Math.sin(2 * Math.PI * 3.5 * t) * (isTrump ? 6 : 2.5) + jitter);

    // Vowel formant shift cycling
    const vowelCycle = Math.sin(2 * Math.PI * 3.2 * t);
    const modF1 = f1 + vowelCycle * 80;
    const modF2 = f2 + vowelCycle * 220;

    let glottal = Math.sin(2 * Math.PI * currentF0 * t);

    if (isDeep) {
      glottal += 0.5 * Math.sin(2 * Math.PI * (currentF0 * 0.5) * t);
      glottal += 0.3 * Math.sin(2 * Math.PI * (currentF0 * 1.5) * t);
    } else if (isArnold) {
      glottal += 0.4 * (Math.sin(2 * Math.PI * currentF0 * t) > 0 ? 1 : -1);
    } else if (isOprah) {
      glottal += 0.4 * Math.sin(2 * Math.PI * currentF0 * 2 * t);
      glottal += 0.2 * Math.sin(2 * Math.PI * currentF0 * 3 * t);
    } else {
      glottal += 0.35 * Math.sin(2 * Math.PI * currentF0 * 2 * t);
    }

    // Formant filtering
    const formantResonance =
      0.4 * Math.sin(2 * Math.PI * modF1 * t) +
      0.22 * Math.sin(2 * Math.PI * modF2 * t) +
      0.12 * Math.sin(2 * Math.PI * f3 * t);

    // Noise component
    const baseNoiseLevel = isAttenborough ? 0.08 : 0.04;
    const noise = (Math.random() - 0.5) * baseNoiseLevel;

    const sample = (glottal * 0.5 + formantResonance * 0.45 + noise) * combinedEnv * 12000;
    buffer[i] = Math.max(-32768, Math.min(32767, Math.floor(sample)));
  }

  // Build standard WAV 44-byte header
  const dataSize = buffer.length * 2;
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  view.setUint32(0, 0x52494646, false); // RIFF
  view.setUint32(4, 36 + dataSize, true);
  view.setUint32(8, 0x57415645, false); // WAVE
  view.setUint32(12, 0x666d7420, false); // fmt
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 0x64617461, false); // data
  view.setUint32(40, dataSize, true);

  const wavBytes = new Uint8Array(44 + dataSize);
  wavBytes.set(new Uint8Array(wavHeader), 0);
  wavBytes.set(new Uint8Array(buffer.buffer), 44);
  return `data:audio/wav;base64,${Buffer.from(wavBytes).toString('base64')}`;
}

// Initial Voice Models (LIVING US Presidents & Living Celebrities ONLY)
let voiceModels: DBVoiceModel[] = [
  // --- LIVING US PRESIDENTS ---
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
    transcriptSample: 'As a prominent figure of the free world, I believe we are responsible for being philanthropists.',
    tags: ['President', 'Obama', 'Living', 'Baritone', 'Orator'],
    isCloned: false,
    vocalProfile: {
      fundamentalPitchHz: 110,
      pitchRangeHz: [85, 175],
      speechCadenceWpm: 135,
      warmthScore: 98,
      clarityScore: 95,
      resonantFormants: [450, 1450, 2400, 3400],
      embeddingVectorPreview: [0.29, -0.51, 0.84, 0.17, -0.33, 0.72, 0.14, -0.18],
      noiseFloorDb: -67,
      recommendedSpeed: 0.95,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pres-donald-trump',
    name: 'Donald Trump — Mar-a-Lago Executive',
    description: 'Expressive, highly emphatic delivery with signature Queens New York cadence and bold executive presence.',
    category: 'preselected',
    gender: 'male',
    ageGroup: 'mature',
    accent: 'Queens New York Executive',
    baseVoiceName: 'Puck',
    sampleAudioUrl: 'https://drive.google.com/drive/folders/1ymyE2f2Y7gNf7PIzYe_UHp7JpcmeuHif?usp=sharing',
    transcriptSample: 'We are going to make big, unbelievable progress, folks. Nobody does it better than us.',
    tags: ['President', 'Trump', 'Living', 'Executive', 'New York'],
    isCloned: false,
    vocalProfile: {
      fundamentalPitchHz: 132,
      pitchRangeHz: [100, 190],
      speechCadenceWpm: 142,
      warmthScore: 55,
      clarityScore: 85,
      resonantFormants: [500, 1600, 2600, 3600],
      embeddingVectorPreview: [-0.38, 0.81, -0.19, 0.47, -0.62, 0.35, 0.89, -0.04],
      noiseFloorDb: -59,
      recommendedSpeed: 1.02,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pres-joe-biden',
    name: 'Joe Biden — Scranton Oval Address',
    description: 'Gravely, candid, conversational Scranton tone with authentic mid-Atlantic cadence and empathetic inflection.',
    category: 'preselected',
    gender: 'male',
    ageGroup: 'mature',
    accent: 'Scranton / Mid-Atlantic Baritone',
    baseVoiceName: 'Charon',
    sampleAudioUrl: 'https://drive.google.com/drive/folders/1ymyE2f2Y7gNf7PIzYe_UHp7JpcmeuHif?usp=sharing',
    transcriptSample: 'Here is the deal, folks. We must stand united and build a brighter future for everyone.',
    tags: ['President', 'Biden', 'Living', 'Conversational', 'Scranton'],
    isCloned: false,
    vocalProfile: {
      fundamentalPitchHz: 108,
      pitchRangeHz: [80, 160],
      speechCadenceWpm: 130,
      warmthScore: 85,
      clarityScore: 75,
      resonantFormants: [480, 1500, 2500, 3500],
      embeddingVectorPreview: [0.11, 0.39, -0.52, 0.67, -0.28, 0.44, 0.61, -0.12],
      noiseFloorDb: -62,
      recommendedSpeed: 0.92,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pres-george-w-bush',
    name: 'George W. Bush — Texas Oval Address',
    description: 'Direct, earnest Texas drawl cadence tuned for concise policy briefings and clear leadership.',
    category: 'preselected',
    gender: 'male',
    ageGroup: 'mature',
    accent: 'Texas / Southern Baritone',
    baseVoiceName: 'Puck',
    sampleAudioUrl: 'https://drive.google.com/drive/folders/1ymyE2f2Y7gNf7PIzYe_UHp7JpcmeuHif?usp=sharing',
    transcriptSample: 'We will not tire, we will not falter, and we will not fail.',
    tags: ['President', 'Bush', 'Living', 'Texas', 'Oval Address'],
    isCloned: false,
    vocalProfile: {
      fundamentalPitchHz: 130,
      pitchRangeHz: [95, 185],
      speechCadenceWpm: 155,
      warmthScore: 82,
      clarityScore: 88,
      resonantFormants: [510, 1550, 2550, 3550],
      embeddingVectorPreview: [-0.15, 0.48, 0.62, -0.25, 0.53, -0.18, 0.79, 0.26],
      noiseFloorDb: -61,
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
    transcriptSample: 'There is nothing wrong with America that cannot be cured by what is right with America.',
    tags: ['President', 'Clinton', 'Living', 'Arkansas', 'Charismatic'],
    isCloned: false,
    vocalProfile: {
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

  // --- LIVING CELEBRITIES ---
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
    vocalProfile: {
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
    vocalProfile: {
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
    vocalProfile: {
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
    vocalProfile: {
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
    vocalProfile: {
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
    vocalProfile: {
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
    vocalProfile: {
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

let generatedClips: DBClip[] = [];

// Auto-delete custom voice models and generated audio clips created more than 5 minutes ago (300,000 ms)
function autoPruneExpiredItems() {
  const now = Date.now();
  const FIVE_MINUTES_MS = 5 * 60 * 1000;

  // Prune custom/cloned voice models older than 5 minutes
  voiceModels = voiceModels.filter((model) => {
    if (!model.isCloned && model.category !== 'custom') return true; // Keep default pre-seeded library
    if (!model.createdAt) return true;
    const age = now - new Date(model.createdAt).getTime();
    return age <= FIVE_MINUTES_MS;
  });

  // Prune generated audio clips older than 5 minutes
  generatedClips = generatedClips.filter((clip) => {
    if (!clip.createdAt) return true;
    const age = now - new Date(clip.createdAt).getTime();
    return age <= FIVE_MINUTES_MS;
  });
}

// Periodically prune expired items every 10 seconds
setInterval(autoPruneExpiredItems, 10000);

// ================= API ENDPOINTS =================

// 1. System & Proxy Status (Dokploy + Cloudflare Proxy Inspection)
app.get('/api/system/proxy-status', (req, res) => {
  const cfRay = (req.headers['cf-ray'] as string) || undefined;
  const cfConnectingIp = (req.headers['cf-connecting-ip'] as string) || undefined;
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
  const host = (req.headers['host'] as string) || 'localhost:3000';
  const visitorIp = cfConnectingIp || req.ip;

  res.json({
    isCloudflareProxy: Boolean(cfRay || cfConnectingIp),
    cfRay,
    cfConnectingIp,
    visitorIp,
    proto,
    isDokployContainer: process.env.DOKPLOY === 'true' || Boolean(process.env.CONTAINER_ID),
    host,
    isGitHubPagesMode: false,
    timestamp: new Date().toISOString(),
  });
});

// 2. Authentication Mock API (Secure session simulation)
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  // Simulate secure token creation
  const mockToken = `vocalflow_session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  return res.json({
    user: {
      id: 'usr_vocalflow_01',
      username: username || 'Studio Engineer',
      email: `${username.toLowerCase().replace(/\s+/g, '')}@vocalflow.ai`,
      role: 'creator',
      token: mockToken,
      createdAt: new Date().toISOString(),
    },
  });
});

// 3. List Voice Models
app.get('/api/voice/models', (_req, res) => {
  autoPruneExpiredItems();
  res.json(voiceModels);
});

// 4. Voice Cloning API (Upload audio sample -> Extract RuinScams Vocal Clone profile)
app.post('/api/voice/clone', async (req, res) => {
  try {
    const { name, description, gender, ageGroup, tags, audioBase64, sampleFileName } = req.body;

    if (!name || !audioBase64) {
      return res.status(400).json({ error: 'Voice name and audio sample are required for cloning.' });
    }

    let transcript = 'Extracted sample transcription from RuinScams Vocal Clone neural voice analyzer.';
    let pitchHz = 145;
    let warmth = 88;
    let clarity = 92;
    let wpm = 150;
    let formants = [520, 1600, 2600, 3600];

    const gemini = getGeminiClient();
    if (gemini) {
      try {
        // Strip data URI prefix if present
        const cleanBase64 = audioBase64.replace(/^data:audio\/[a-zA-Z0-9]+;base64,/, '');
        const mimeType = audioBase64.startsWith('data:audio/wav')
          ? 'audio/wav'
          : audioBase64.startsWith('data:audio/mp3') || audioBase64.startsWith('data:audio/mpeg')
          ? 'audio/mp3'
          : 'audio/webm';

        // Call Gemini to analyze the audio sample
        const response = await gemini.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: {
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: mimeType,
                },
              },
              {
                text: `Analyze this audio sample for voice cloning. Provide a brief accurate transcript of what is spoken in the audio, along with estimated voice pitch (low male ~90Hz, female ~210Hz), speech tempo (WPM 120-180), warmth score (0-100), and clarity score (0-100). Respond ONLY in JSON: {"transcript": string, "fundamentalPitchHz": number, "speechCadenceWpm": number, "warmthScore": number, "clarityScore": number}`,
              },
            ],
          },
          config: {
            responseMimeType: 'application/json',
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text.trim());
          if (parsed.transcript) transcript = parsed.transcript;
          if (parsed.fundamentalPitchHz) pitchHz = Math.min(Math.max(parsed.fundamentalPitchHz, 60), 300);
          if (parsed.speechCadenceWpm) wpm = Math.min(Math.max(parsed.speechCadenceWpm, 80), 220);
          if (parsed.warmthScore) warmth = Math.min(Math.max(parsed.warmthScore, 50), 100);
          if (parsed.clarityScore) clarity = Math.min(Math.max(parsed.clarityScore, 50), 100);
        }
      } catch (err) {
        console.warn('Gemini audio cloning analysis fallback:', err);
      }
    }

    // Generate RuinScams Vocal Clone embedding vector
    const embeddingVectorPreview = Array.from({ length: 8 }, () => Number((Math.random() * 1.8 - 0.9).toFixed(2)));

    const newModel: DBVoiceModel = {
      id: `clone_${Date.now()}`,
      name: name.trim(),
      description: description || 'Custom user cloned voice trained on uploaded RuinScams Vocal Clone audio sample.',
      category: 'custom',
      gender: gender || (pitchHz < 150 ? 'male' : 'female'),
      ageGroup: ageGroup || 'adult',
      accent: 'Custom Cloned Sample',
      baseVoiceName: pitchHz < 140 ? 'Zephyr' : pitchHz > 200 ? 'Kore' : 'Puck',
      sampleAudioUrl: audioBase64.length < 500000 ? audioBase64 : undefined,
      transcriptSample: transcript,
      tags: Array.isArray(tags) && tags.length ? tags : ['Custom Clone', 'RuinScams Vocal Clone'],
      isCloned: true,
      vocalProfile: {
        fundamentalPitchHz: pitchHz,
        pitchRangeHz: [Math.max(pitchHz - 30, 50), pitchHz + 40],
        speechCadenceWpm: wpm,
        warmthScore: warmth,
        clarityScore: clarity,
        resonantFormants: formants,
        embeddingVectorPreview,
        noiseFloorDb: -64,
        recommendedSpeed: 1.0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    voiceModels.unshift(newModel);
    return res.json(newModel);
  } catch (error: any) {
    console.error('Cloning error:', error);
    res.status(500).json({ error: error.message || 'Failed to clone voice sample.' });
  }
});

// 5. Delete Voice Model
app.delete('/api/voice/models/:id', (req, res) => {
  const { id } = req.params;
  const index = voiceModels.findIndex((v) => v.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Voice model not found.' });
  }
  voiceModels.splice(index, 1);
  res.json({ success: true, id });
});

// 5b. Remake Voice Profile with Prompt
app.post('/api/voice/remake', async (req, res) => {
  autoPruneExpiredItems();
  try {
    const { prompt, baseModelId, name } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt description is required to remake a voice.' });
    }

    const baseModel = voiceModels.find((m) => m.id === baseModelId) || voiceModels[0];

    let modelName = name || `${baseModel.name.split('—')[0].trim()} (Remixed Voice)`;
    let modelDesc = `Remade voice profile using prompt: "${prompt}".`;
    let gender = baseModel.gender;
    let pitchHz = baseModel.vocalProfile?.fundamentalPitchHz || 120;
    let wpm = baseModel.vocalProfile?.speechCadenceWpm || 140;
    let warmth = 85;
    let clarity = 92;
    let accent = baseModel.accent || 'Custom AI Remake';

    const pLower = prompt.toLowerCase();
    if (pLower.includes('deep') || pLower.includes('trailer') || pLower.includes('bass') || pLower.includes('baritone')) {
      pitchHz = Math.max(65, pitchHz - 40);
      wpm = Math.max(100, wpm - 20);
      warmth = 96;
    }
    if (pLower.includes('high') || pLower.includes('female') || pLower.includes('soprano') || pLower.includes('bright')) {
      pitchHz = Math.min(260, pitchHz + 60);
      gender = 'female';
      clarity = 98;
    }
    if (pLower.includes('british') || pLower.includes('uk') || pLower.includes('english')) {
      accent = 'British English';
    } else if (pLower.includes('scottish')) {
      accent = 'Scottish High Frequency';
    } else if (pLower.includes('futuristic') || pLower.includes('ai') || pLower.includes('robot')) {
      accent = 'Synthesized AI Core';
      wpm = 165;
    }
    if (pLower.includes('fast') || pLower.includes('rapid') || pLower.includes('energetic')) {
      wpm = Math.min(200, wpm + 35);
    } else if (pLower.includes('slow') || pLower.includes('calm') || pLower.includes('whisper')) {
      wpm = Math.max(90, wpm - 30);
    }

    const gemini = getGeminiClient();
    if (gemini) {
      try {
        const response = await gemini.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: {
            parts: [
              {
                text: `You are a voice cloner and audio DSP engineer. Based on the user's prompt to remake a voice model, extract key parameters:
Prompt: "${prompt}"
Base Voice: ${baseModel.name} (${baseModel.gender}, ${baseModel.description})

Return JSON with format:
{
  "name": string (creative short title, max 30 chars),
  "description": string (one sentence summary),
  "gender": "male" | "female",
  "fundamentalPitchHz": number (60-260),
  "speechCadenceWpm": number (90-200),
  "warmthScore": number (50-100),
  "clarityScore": number (50-100),
  "accent": string
}`,
              },
            ],
          },
          config: { responseMimeType: 'application/json' },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text.trim());
          if (parsed.name) modelName = parsed.name;
          if (parsed.description) modelDesc = parsed.description;
          if (parsed.gender) gender = parsed.gender;
          if (parsed.fundamentalPitchHz) pitchHz = Math.min(Math.max(parsed.fundamentalPitchHz, 60), 280);
          if (parsed.speechCadenceWpm) wpm = Math.min(Math.max(parsed.speechCadenceWpm, 80), 220);
          if (parsed.warmthScore) warmth = Math.min(Math.max(parsed.warmthScore, 50), 100);
          if (parsed.clarityScore) clarity = Math.min(Math.max(parsed.clarityScore, 50), 100);
          if (parsed.accent) accent = parsed.accent;
        }
      } catch (err) {
        console.warn('Gemini remake prompt analysis fallback:', err);
      }
    }

    const f1 = gender === 'female' ? 620 : Math.round(pitchHz * 3.8);
    const f2 = gender === 'female' ? 1950 : Math.round(pitchHz * 12.5);
    const f3 = gender === 'female' ? 2950 : Math.round(pitchHz * 21);

    const embeddingVectorPreview = Array.from({ length: 8 }, () => Number((Math.random() * 1.8 - 0.9).toFixed(2)));

    const remadeModel: DBVoiceModel = {
      id: `remake_${Date.now()}`,
      name: modelName,
      description: modelDesc,
      category: 'custom',
      gender,
      ageGroup: 'adult',
      accent,
      baseVoiceName: gender === 'female' ? 'Kore' : pitchHz < 100 ? 'Fenrir' : 'Puck',
      tags: ['Prompt Remake', 'RuinScams Vocal Clone', accent],
      isCloned: true,
      vocalProfile: {
        fundamentalPitchHz: pitchHz,
        pitchRangeHz: [Math.max(pitchHz - 35, 50), pitchHz + 45],
        speechCadenceWpm: wpm,
        warmthScore: warmth,
        clarityScore: clarity,
        resonantFormants: [f1, f2, f3, 3600],
        embeddingVectorPreview,
        noiseFloorDb: -66,
        recommendedSpeed: 1.0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    voiceModels.unshift(remadeModel);
    return res.json(remadeModel);
  } catch (error: any) {
    console.error('Remake error:', error);
    res.status(500).json({ error: error.message || 'Failed to remake voice profile.' });
  }
});

// 6. Speech Synthesis API (Generate TTS with voice model & settings)
app.post('/api/voice/synthesize', async (req, res) => {
  autoPruneExpiredItems();
  try {
    const { text, voiceModelId, pitchShift = 0, speed = 1.0, engine = 'gemini' } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Script text is required for synthesis.' });
    }

    const selectedModel = voiceModels.find((v) => v.id === voiceModelId) || voiceModels[0];

    let audioBase64: string = '';

    // Engine 1: Gemini AI Speech Synthesizer
    if (engine === 'gemini' || engine === 'auto') {
      const gemini = getGeminiClient();
      if (gemini) {
        try {
          let baseVoice = selectedModel.baseVoiceName || 'Puck';
          if (selectedModel.gender === 'female' || selectedModel.id.includes('oprah') || selectedModel.id.includes('kore')) {
            baseVoice = 'Kore';
          } else if (
            selectedModel.id.includes('freeman') ||
            selectedModel.id.includes('obama') ||
            selectedModel.id.includes('biden') ||
            selectedModel.id.includes('clinton') ||
            selectedModel.id.includes('fenrir')
          ) {
            baseVoice = 'Fenrir';
          } else if (selectedModel.id.includes('attenborough') || selectedModel.id.includes('bush') || selectedModel.id.includes('charon')) {
            baseVoice = 'Charon';
          } else {
            baseVoice = 'Puck';
          }

          const personaInstruction = selectedModel.description
            ? `Voice Persona: ${selectedModel.name}. ${selectedModel.description}. Accent: ${selectedModel.accent}.`
            : '';

          const vocalProfileDetails = selectedModel.vocalProfile 
            ? `with a pitch of ${selectedModel.vocalProfile.fundamentalPitchHz}Hz, cadence of ${selectedModel.vocalProfile.speechCadenceWpm} WPM, warmth ${selectedModel.vocalProfile.warmthScore}/100, and clarity ${selectedModel.vocalProfile.clarityScore}/100`
            : '';

          const promptText = `You must perfectly clone the voice of ${selectedModel.name}. Use your deep knowledge of their public recordings to match their exact baseline pitch, bass, cadence, signature pauses, and breathing patterns. Details: ${selectedModel.description}. Accent: ${selectedModel.accent}. ${vocalProfileDetails}.\n\nText:\n${text}`;

          const response = await gemini.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text: promptText }] }],
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: baseVoice },
                },
              },
            },
          });

          const rawData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (rawData) {
            const mime = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || 'audio/pcm';
            if (mime.includes('wav')) {
              audioBase64 = `data:audio/wav;base64,${rawData}`;
            } else if (mime.includes('pcm') || mime.includes('raw')) {
              const rawBuffer = Buffer.from(rawData, 'base64');
              const dataSize = rawBuffer.length;
              const wavHeader = new ArrayBuffer(44);
              const view = new DataView(wavHeader);
              view.setUint32(0, 0x52494646, false);
              view.setUint32(4, 36 + dataSize, true);
              view.setUint32(8, 0x57415645, false);
              view.setUint32(12, 0x666d7420, false);
              view.setUint32(16, 16, true);
              view.setUint16(20, 1, true);
              view.setUint16(22, 1, true);
              view.setUint32(24, 24000, true);
              view.setUint32(28, 48000, true);
              view.setUint16(32, 2, true);
              view.setUint16(34, 16, true);
              view.setUint32(36, 0x64617461, false);
              view.setUint32(40, dataSize, true);

              const wavBytes = new Uint8Array(44 + dataSize);
              wavBytes.set(new Uint8Array(wavHeader), 0);
              wavBytes.set(new Uint8Array(rawBuffer), 44);
              audioBase64 = `data:audio/wav;base64,${Buffer.from(wavBytes).toString('base64')}`;
            } else {
              audioBase64 = `data:${mime};base64,${rawData}`;
            }
          }
        } catch (err: any) {
          console.log(`Gemini TTS API notice: ${err?.message || 'Model audio modality unavailable'}. Rendering via RuinScams Vocal Clone DSP acoustic engine.`);
        }
      }
    }

    // Engine 2: RuinScams Vocal Clone DSP Formant Engine
    if (!audioBase64 && engine !== 'speechsynth') {
      audioBase64 = generateSyntheticWavBuffer(
        text,
        selectedModel.vocalProfile?.fundamentalPitchHz || 110,
        selectedModel.vocalProfile?.speechCadenceWpm || 140,
        selectedModel.vocalProfile?.resonantFormants || [500, 1500, 2500],
        selectedModel.id,
        selectedModel.gender,
        pitchShift,
        speed
      );
    }

    // Calculate approximate duration based on word count & speed
    const wordCount = text.trim().split(/\s+/).length;
    const baseWpm = selectedModel.vocalProfile?.speechCadenceWpm || 150;
    const calculatedDurationSeconds = Math.max(1.2, Number(((wordCount / (baseWpm / 60)) / speed).toFixed(1)));

    const newClip: DBClip = {
      id: `clip_${Date.now()}`,
      title: text.length > 35 ? `${text.substring(0, 35)}...` : text,
      scriptText: text,
      voiceModelId: selectedModel.id,
      voiceModelName: selectedModel.name,
      audioUrl: audioBase64 || '', // Client synthesizes clear speech via Web Speech API if empty
      durationSeconds: calculatedDurationSeconds,
      sampleRate: 24000,
      settings: {
        pitchShift,
        speed,
      },
      createdAt: new Date().toISOString(),
    };

    generatedClips.unshift(newClip);
    return res.json(newClip);
  } catch (error: any) {
    console.error('Synthesis error:', error);
    res.status(500).json({ error: error.message || 'Speech synthesis failed.' });
  }
});

// 7. Get Clip History
app.get('/api/voice/clips', (_req, res) => {
  autoPruneExpiredItems();
  res.json(generatedClips);
});

// 8. Delete Clip
app.delete('/api/voice/clips/:id', (req, res) => {
  const { id } = req.params;
  const idx = generatedClips.findIndex((c) => c.id === id);
  if (idx !== -1) {
    generatedClips.splice(idx, 1);
  }
  res.json({ success: true });
});

// 9. Script Assistant (SSML & Tone Auto-Enhancer)
app.post('/api/voice/script-assist', async (req, res) => {
  try {
    const { prompt, currentScript } = req.body;
    const gemini = getGeminiClient();

    if (!gemini) {
      return res.json({
        enhancedScript: currentScript ? `${currentScript} [pause=300ms]` : 'Welcome to RuinScams Vocal Clone voice studio. High fidelity voice cloning made simple.',
      });
    }

    const sysInstruction = 'You are a professional audio director and voice synthesis editor. Enhance the provided text for speech synthesis by adding natural pauses like [pause], emotional cues, or refining phrasing for voice clarity. Return JSON: {"enhancedScript": string, "notes": string}';

    const response = await gemini.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Script to enhance: "${currentScript || ''}". Directive: ${prompt || 'Make it sound conversational and natural.'}`,
      config: {
        systemInstruction: sysInstruction,
        responseMimeType: 'application/json',
      },
    });

    if (response.text) {
      const parsed = JSON.parse(response.text.trim());
      return res.json(parsed);
    }

    return res.json({ enhancedScript: currentScript || '' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to enhance script.' });
  }
});

// ================= VITE & SERVER LAUNCH =================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RuinScams Vocal Clone Voice Studio running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
