import { pipeline, env, Tensor } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = false;

let synthesizer = null;

async function loadModel() {
    postMessage({ 
        status: 'download_progress', 
        message: 'Initializing SpeechT5 WebGPU model...',
        progress: 0
    });
    
    try {
        synthesizer = await pipeline('text-to-speech', 'Xenova/speecht5_tts', {
            device: 'webgpu',
            dtype: 'fp32', 
            progress_callback: (info) => {
                if (info.status === 'progress') {
                    postMessage({ 
                        status: 'download_progress', 
                        message: `Downloading SpeechT5 Model: ${Math.round(info.progress)}%`,
                        progress: info.progress
                    });
                }
            }
        });
        
        postMessage({ status: 'ready' });
    } catch(err) {
        postMessage({ status: 'error', message: `Model load error: ${err.message}` });
    }
}

loadModel();

onmessage = async (e) => {
    if (!synthesizer) return;
    const { text, referenceAudioUrl } = e.data;
    
    try {
        postMessage({ status: 'generation_progress', message: `Fetching speaker profile from ${referenceAudioUrl}...`, progress: 10 });
        
        const response = await fetch(referenceAudioUrl);
        
        // 1. Check if the file actually exists on the server
        if (!response.ok) {
            throw new Error(`Could not find voice file at '${referenceAudioUrl}' (HTTP Status ${response.status}). Make sure the .bin file is uploaded to GitHub.`);
        }
        
        const buffer = await response.arrayBuffer();
        
        // 2. Validate byte alignment (SpeechT5 expects 512 float32 values = exactly 2048 bytes)
        if (buffer.byteLength % 4 !== 0) {
            throw new Error(`Invalid file format: File size (${buffer.byteLength} bytes) is not a multiple of 4.`);
        }
        
        // 3. Ensure proper memory alignment
        const float32Data = new Float32Array(
            buffer.slice(0, buffer.byteLength - (buffer.byteLength % 4))
        );

        if (float32Data.length !== 512) {
            throw new Error(`Invalid embedding size: Expected 512 elements, got ${float32Data.length}. Please re-generate the .bin file.`);
        }

        const speaker_embeddings = new Tensor(
            'float32',
            float32Data,
            [1, 512]
        );

        postMessage({ status: 'generation_progress', message: 'Synthesizing speech via WebGPU...', progress: 50 });
        
        const result = await synthesizer(text, {
            speaker_embeddings: speaker_embeddings
        });
        
        postMessage({
            status: 'complete',
            audio: result.audio,
            sampleRate: result.sampling_rate
        });
    } catch (err) {
        postMessage({ status: 'error', message: err.message });
    }
};
