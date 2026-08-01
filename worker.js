import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers';

// Explicitly enable caching to store model in browser memory permanently
env.use_cache = true; 
env.allowLocalModels = false;

let synthesizer = null;

async function loadModel() {
    postMessage({ 
        status: 'download_progress', 
        message: 'Initializing and checking cache...',
        progress: 0
    });
    
    try {
        synthesizer = await pipeline('text-to-speech', 'ResembleAI/chatterbox-turbo', {
            device: 'webgpu',
            dtype: 'fp16', // MASSIVE speed boost on WebGPU and halves memory requirements
            progress_callback: (info) => {
                if (info.status === 'progress') {
                    postMessage({ 
                        status: 'download_progress', 
                        message: `Downloading/Loading Chatterbox Turbo: ${Math.round(info.progress)}%`,
                        progress: info.progress
                    });
                }
            }
        });
        
        // --- THE WARM-UP PHASE ---
        // We run a tiny invisible generation right now.
        // This forces WebGPU to compile its shaders while the user is still typing, 
        // preventing the app from freezing when they actually click "Generate Speech".
        postMessage({ 
            status: 'compiling', 
            message: 'Optimizing and compiling WebGPU Shaders (This takes 15-60 seconds on first run)...' 
        });
        
        const dummyAudio = new Float32Array(24000); // 1 second of silence
        await synthesizer("a", { speaker_audio: dummyAudio }); // Silent compile trigger
        
        postMessage({ status: 'ready' });
    } catch(err) {
        postMessage({ status: 'error', message: `Error loading model: ${err.message}` });
    }
}

loadModel();

onmessage = async (e) => {
    if (!synthesizer) return;
    const { text, referenceAudio } = e.data;
    
    try {
        postMessage({ status: 'generation_progress', message: 'Starting generation engine...', progress: 5 });
        
        // Rough estimate to calculate a percentage based on characters/tokens
        const estimatedMaxSteps = Math.max(10, Math.floor(text.length * 1.5));
        let currentStep = 0;

        const result = await synthesizer(text, {
            speaker_audio: referenceAudio,
            callback_function: (outputs) => {
                // Fired token-by-token during inference
                currentStep++;
                
                // Calculate pseudo-percentage. Cap at 95% until officially complete.
                let percentage = Math.min(95, Math.round((currentStep / estimatedMaxSteps) * 100));
                
                postMessage({ 
                    status: 'generation_progress', 
                    message: `Synthesizing audio frame ${currentStep}...`,
                    progress: percentage
                });
            }
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
