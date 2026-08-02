import { pipeline, env, Tensor } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers';

env.allowLocalModels = false;

// MAGIC FIX: Force bypass the browser cache so it stops loading a broken/corrupted model
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
        // Detailed error to help if it happens again
        postMessage({ status: 'error', message: `Network Error: ${err.message}. Ensure you are not testing locally via file://` });
    }
}

loadModel();

onmessage = async (e) => {
    if (!synthesizer) return;
    const { text, referenceAudioUrl } = e.data;
    
    try {
        postMessage({ status: 'generation_progress', message: 'Fetching speaker profile...', progress: 10 });
        
        const response = await fetch(referenceAudioUrl);
        const buffer = await response.arrayBuffer();
        
        const speaker_embeddings = new Tensor(
            'float32',
            new Float32Array(buffer),
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
