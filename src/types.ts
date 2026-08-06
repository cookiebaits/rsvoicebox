export interface ActiveSynthesisJob {
  id: string;
  voiceModelId: string;
  voiceModelName: string;
  title: string;
  scriptText: string;
  progress: number; // 0 to 100
  statusText: string;
  startTime: number;
}

export interface UserSession {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'creator' | 'user';
  token: string;
  createdAt: string;
}

export interface VoiceModel {
  id: string;
  name: string;
  description: string;
  category: 'custom' | 'preselected';
  gender: 'female' | 'male' | 'neutral';
  ageGroup: 'young' | 'adult' | 'mature';
  accent?: string;
  avatarUrl?: string;
  baseVoiceName?: string; // Gemini prebuilt voice if applicable ('Zephyr', 'Kore', 'Puck', 'Fenrir', 'Charon')
  sampleAudioUrl?: string;
  transcriptSample?: string;
  tags: string[];
  isCloned: boolean;
  vocalProfile?: {
    fundamentalPitchHz: number;
    pitchRangeHz: [number, number];
    speechCadenceWpm: number;
    warmthScore: number; // 0 - 100
    clarityScore: number; // 0 - 100
    resonantFormants: number[];
    embeddingVectorPreview: number[];
    noiseFloorDb: number;
    recommendedSpeed: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedClip {
  id: string;
  title: string;
  scriptText: string;
  voiceModelId: string;
  voiceModelName: string;
  audioUrl: string; // Base64 data URI or HTTP URL
  durationSeconds: number;
  sampleRate: number;
  settings: {
    pitchShift: number; // -12 to +12 semitones
    speed: number; // 0.5 to 2.0
  };
  createdAt: string;
}

export interface ProxyStatus {
  isCloudflareProxy: boolean;
  cfRay?: string;
  cfConnectingIp?: string;
  visitorIp?: string;
  proto?: string;
  isDokployContainer: boolean;
  host: string;
  isGitHubPagesMode: boolean;
  timestamp: string;
}

export interface SpeechSynthRequest {
  text: string;
  voiceModelId: string;
  pitchShift?: number;
  speed?: number;
  engine?: 'gemini' | 'vocalflow' | 'speechsynth';
}
