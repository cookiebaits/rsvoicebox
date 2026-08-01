import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers';

// Tell transformers to skip local files and pull directly from Hugging Face hub
env.allowLocalModels = false;

let synthesizer = null;

async function loadModel() {
    postMessage({ 
        status: 'progress', 
        message: 'Loading Chatterbox Turbo model (~1.5GB). This takes a while on the first visit, but caches locally!' 
    });
    
    try {
        // Initialize the WebGPU pipeline with Chatterbox Turbo
        synthesizer = await pipeline('text-to-speech', 'ResembleAI/chatterbox-turbo', {
            device: 'webgpu', // Utilizes the browser's WebGPU engine for lightning-fast speeds
            progress_callback: (info) => {
                if (info.status === 'progress') {
                    postMessage({ status: 'progress', message: `Downloading model weights: ${Math.round(info.progress)}%` });
                }
            }
        });
        
        postMessage({ status: 'ready' });
    } catch(err) {
        postMessage({ status: 'progress', message: `Error loading model: ${err.message}. Ensure your browser supports WebGPU.` });
    }
}

loadModel();

onmessage = async (e) => {
    if (!synthesizer) return;
    
    const { text, referenceAudio } = e.data;
    
    try {
        postMessage({ status: 'progress', message: 'Synthesizing speech via WebGPU...' });
        
        // Execute zero-shot generation
        const result = await synthesizer(text, {
            speaker_audio: referenceAudio // Provide the Float32Array of the recorded voice to clone
        });
        
        postMessage({
            status: 'complete',
            audio: result.audio,
            sampleRate: result.sampling_rate
        });
    } catch (err) {
        postMessage({ status: 'progress', message: `Generation failed: ${err.message}` });
    }
};
