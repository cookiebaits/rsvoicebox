const recordBtn = document.getElementById('recordBtn');
const playRefBtn = document.getElementById('playRefBtn');
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

let mediaRecorder;
let audioChunks = [];
let referenceAudioFloat32 = null;
let referenceAudioUrl = null;
let isModelReady = false;

const worker = new Worker('worker.js', { type: 'module' });

// Check if Generate button should be enabled
function updateGenerateButton() {
    if (isModelReady && referenceAudioFloat32 && textInput.value.trim().length > 0) {
        generateBtn.disabled = false;
        generateBtn.innerText = "Generate Speech";
    } else {
        generateBtn.disabled = true;
    }
}

textInput.addEventListener('input', updateGenerateButton);

// Handle Sample Voice Selection
sampleSelect.onchange = async (e) => {
    const url = e.target.value;
    if (!url) {
        referenceAudioFloat32 = null;
        updateGenerateButton();
        return;
    }
    
    statusText.innerText = "Loading sample voice...";
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        
        const audioCtx = new AudioContext({ sampleRate: 24000 });
        const decodedData = await audioCtx.decodeAudioData(arrayBuffer);
        
        referenceAudioFloat32 = decodedData.getChannelData(0); 
        statusText.innerText = "Sample voice loaded! Ready to generate.";
        playRefBtn.disabled = true; 
        updateGenerateButton();
    } catch (err) {
        statusText.innerText = "Error loading sample. Ensure the file exists.";
    }
};

// Handle Microphone Recording
recordBtn.onclick = async () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        recordBtn.innerText = 'Start Recording';
        recordBtn.classList.replace('bg-red-600', 'bg-blue-600');
    } else {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        
        mediaRecorder.onstop = async () => {
            const blob = new Blob(audioChunks, { type: 'audio/webm' });
            audioChunks = [];
            referenceAudioUrl = URL.createObjectURL(blob);
            
            const arrayBuffer = await blob.arrayBuffer();
            const audioCtx = new AudioContext({ sampleRate: 24000 });
            const decodedData = await audioCtx.decodeAudioData(arrayBuffer);
            
            referenceAudioFloat32 = decodedData.getChannelData(0); 
            
            playRefBtn.disabled = false;
            sampleSelect.value = ""; 
            statusText.innerText = "Voice captured successfully! Ready to generate.";
            updateGenerateButton();
        };
        
        mediaRecorder.start();
        recordBtn.innerText = 'Stop Recording';
        recordBtn.classList.replace('bg-blue-600', 'bg-red-600');
    }
};

playRefBtn.onclick = () => {
    const audio = new Audio(referenceAudioUrl);
    audio.play();
};

// Handle Worker Messages
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
        generateBtn.innerText = "Optimizing Shaders...";
    }
    else if (status === 'ready') {
        isModelReady = true;
        statusText.innerText = "Model loaded and cached. Ready for cloning.";
        updateGenerateButton();
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
        
        updateGenerateButton();
    }
    else if (status === 'error') {
        statusText.innerText = `Error: ${message}`;
        executionProgressContainer.classList.add('hidden');
        updateGenerateButton();
    }
};

// Send task to worker
generateBtn.onclick = () => {
    const text = textInput.value.trim();
    if (!text || !referenceAudioFloat32) return;
    
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
