const generateBtn = document.getElementById('generateBtn');
const textInput = document.getElementById('textInput');
const sampleSelect = document.getElementById('sampleSelect');
const statusText = document.getElementById('status');
const outputAudio = document.getElementById('outputAudio');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const executionProgressContainer = document.getElementById('executionProgressContainer');
const executionProgressBar = document.getElementById('executionProgressBar');
const executionProgressText = document.getElementById('executionProgressText');

let isModelReady = false;
let referenceAudioFloat32 = null;

const worker = new Worker('worker.js', { type: 'module' });

// Dynamic state manager so the button always reflects true app readiness
function updateUIState() {
    const hasText = textInput.value.trim().length > 0;
    const hasVoice = referenceAudioFloat32 !== null;

    if (!isModelReady) {
        generateBtn.disabled = true;
        generateBtn.innerText = "Generate Speech (Waiting for AI Model...)";
    } else if (!hasVoice) {
        generateBtn.disabled = true;
        generateBtn.innerText = "Please Select a Voice Sample";
    } else if (!hasText) {
        generateBtn.disabled = true;
        generateBtn.innerText = "Please Enter Text to Generate";
    } else {
        generateBtn.disabled = false;
        generateBtn.innerText = "Generate Speech";
        generateBtn.className = "w-full bg-green-600 hover:bg-green-500 px-6 py-3 rounded-lg font-bold transition-colors cursor-pointer";
    }
}

textInput.addEventListener('input', updateUIState);

// Load and decode the MP3 sample
sampleSelect.onchange = async (e) => {
    const url = e.target.value;
    if (!url) {
        referenceAudioFloat32 = null;
        updateUIState();
        return;
    }
    
    statusText.innerText = "Loading MP3 voice sample...";

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}: Could not find ${url}`);
        
        const arrayBuffer = await response.arrayBuffer();
        const audioCtx = new AudioContext({ sampleRate: 24000 });
        const decodedData = await audioCtx.decodeAudioData(arrayBuffer);
        
        referenceAudioFloat32 = decodedData.getChannelData(0); 
        statusText.innerText = "MP3 voice sample loaded successfully!";
        updateUIState();
    } catch (err) {
        statusText.innerText = `Error loading sample: ${err.message}`;
        referenceAudioFloat32 = null;
        updateUIState();
    }
};

// Handle messages from the Web Worker
worker.onmessage = (e) => {
    const { status, message, audio, sampleRate, progress } = e.data;
    
    if (status === 'download_progress') {
        statusText.innerText = message;
        progressContainer.classList.remove('hidden');
        progressBar.style.width = `${progress}%`;
    } 
    else if (status === 'compiling') {
        progressContainer.classList.add('hidden');
        statusText.innerText = message;
    }
    else if (status === 'ready') {
        isModelReady = true;
        progressContainer.classList.add('hidden');
        statusText.innerText = "AI Model loaded and ready!";
        updateUIState();
    } 
    else if (status === 'generation_progress') {
        statusText.innerText = message;
        executionProgressContainer.classList.remove('hidden');
        executionProgressBar.style.width = `${progress}%`;
        executionProgressText.innerText = `${progress}%`;
    } 
    else if (status === 'complete') {
        executionProgressBar.style.width = `100%`;
        executionProgressText.innerText = `100%`;
        
        setTimeout(() => {
            executionProgressContainer.classList.add('hidden');
            statusText.innerText = "Generation complete!";
        }, 1000);
        
        const wavBlob = encodeWAV(audio, sampleRate);
        outputAudio.src = URL.createObjectURL(wavBlob);
        outputAudio.style.display = 'block';
        outputAudio.play();
        
        updateUIState();
    }
    else if (status === 'error') {
        statusText.innerText = `Error: ${message}`;
        executionProgressContainer.classList.add('hidden');
        updateUIState();
    }
};

// Trigger generation
generateBtn.onclick = () => {
    const text = textInput.value.trim();
    if (!text || !referenceAudioFloat32 || !isModelReady) return;
    
    generateBtn.disabled = true;
    generateBtn.innerText = "Generating...";
    outputAudio.style.display = 'none';
    
    executionProgressContainer.classList.remove('hidden');
    executionProgressBar.style.width = `0%`;
    executionProgressText.innerText = `0%`;
    
    worker.postMessage({
        text,
        referenceAudio: referenceAudioFloat32
    });
};

function encodeWAV(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const writeString = (view, offset, string) => {
        for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    };
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); 
    view.setUint16(22, 1, true); 
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); 
    view.setUint16(32, 2, true); 
    view.setUint16(34, 16, true); 
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);
    
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([buffer], { type: 'audio/wav' });
}
