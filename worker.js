import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers';

env.allowLocalModels = false;
let synthesizer = null;

async function loadModel() {
    postMessage({ 
        status: 'download_progress', 
        message: 'Initializing...',
        progress: 0
    });
    
    try {
        // Explicitly ensuring Chatterbox Turbo is the model used
        synthesizer = await pipeline('text-to-speech', 'ResembleAI/chatterbox-turbo', {
            device: 'webgpu', 
            progress_callback: (info) => {
                if (info.status === 'progress') {
                    // Send download percentage back to UI progress bar
                    postMessage({ 
                        status: 'download_progress', 
                        message: `Downloading Chatterbox Turbo weights: ${Math.round(info.progress)}%`,
                        progress: info.progress
                    });
                }
            }
        });
        
        postMessage({ status: 'ready' });
    } catch(err) {
        postMessage({ status: 'ready', message: `Error loading model: ${err.message}` });
    }
}

loadModel();

onmessage = async (e) => {
    if (!synthesizer) return;
    const { text, referenceAudio } = e.data;
    
    try {
        // Trigger the indeterminate loading animation in the UI
        postMessage({ status: 'generating', message: 'Converting text to speech using Chatterbox Turbo...' });
        
        const result = await synthesizer(text, {
            speaker_audio: referenceAudio
        });
        
        postMessage({
            status: 'complete',
            audio: result.audio,
            sampleRate: result.sampling_rate
        });
    } catch (err) {
        postMessage({ status: 'ready', message: `Generation failed: ${err.message}` });
    }
};
