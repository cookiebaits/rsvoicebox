import { pipeline, env, Tensor } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers';

env.allowLocalModels = false;
env.use_cache = true; 

let synthesizer = null;

async function loadModel() {
    postMessage({ 
        status: 'download_progress', 
        message: 'Initializing SpeechT5 WebGPU model...',
        progress: 0
    });
    
    try {
        // Switching to the officially supported WebGPU TTS model
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
        postMessage({ status: 'error', message: `Error loading model: ${err.message}` });
    }
}

loadModel();

onmessage = async (e) => {
    if (!synthesizer) return;
    const { text, referenceAudioUrl } = e.data;
    
    try {
        postMessage({ status: 'generation_progress', message: 'Fetching speaker profile...', progress: 10 });
        
        // 1. Fetch the .bin file from the URL
        const response = await fetch(referenceAudioUrl);
        const buffer = await response.arrayBuffer();
        
        // 2. Convert it into a 512-dimensional Tensor that SpeechT5 expects
        const speaker_embeddings = new Tensor(
            'float32',
            new Float32Array(buffer),
            [1, 512]
        );

        postMessage({ status: 'generation_progress', message: 'Synthesizing speech via WebGPU...', progress: 50 });
        
        // 3. Generate the audio
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
