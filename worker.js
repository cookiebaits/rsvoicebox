import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;

let synthesizer = null;

async function loadModel() {
    postMessage({ 
        status: 'download_progress', 
        message: 'Initializing Chatterbox WebGPU model...',
        progress: 0
    });
    
    try {
        // We use the 'onnx-community' repo which has the correct browser-ready files
        synthesizer = await pipeline('text-to-speech', 'onnx-community/chatterbox-ONNX', {
            device: 'webgpu',
            dtype: 'fp16', // Forces High-Speed WebGPU processing
            progress_callback: (info) => {
                if (info.status === 'progress') {
                    postMessage({ 
                        status: 'download_progress', 
                        message: `Downloading Chatterbox Model: ${Math.round(info.progress)}%`,
                        progress: info.progress
                    });
                }
            }
        });
        
        // --- THE WARM-UP PHASE ---
        postMessage({ 
            status: 'compiling', 
            message: 'Optimizing and compiling WebGPU Shaders (Takes 15-30 seconds on first run)...' 
        });
        
        const dummyAudio = new Float32Array(24000); 
        await synthesizer("a", { speaker_audio: dummyAudio }); // Silent compile trigger
        
        postMessage({ status: 'ready' });
    } catch(err) {
        postMessage({ status: 'error', message: `Model load error: ${err.message}` });
    }
}

loadModel();

onmessage = async (e) => {
    if (!synthesizer) return;
    const { text, referenceAudio } = e.data;
    
    try {
        postMessage({ status: 'generation_progress', message: 'Starting voice clone...', progress: 10 });
        
        const estimatedMaxSteps = Math.max(10, Math.floor(text.length * 1.5));
        let currentStep = 0;

        const result = await synthesizer(text, {
            speaker_audio: referenceAudio, // Feeds the raw MP3 data we decoded in app.js straight to the model
            callback_function: (outputs) => {
                currentStep++;
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
