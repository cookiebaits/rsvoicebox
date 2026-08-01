const recordBtn = document.getElementById('recordBtn');
const playRefBtn = document.getElementById('playRefBtn');
const generateBtn = document.getElementById('generateBtn');
const textInput = document.getElementById('textInput');
const sampleSelect = document.getElementById('sampleSelect');
const statusText = document.getElementById('status');
const outputAudio = document.getElementById('outputAudio');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const loadingContainer = document.getElementById('loadingContainer');

let mediaRecorder;
let audioChunks = [];
let referenceAudioFloat32 = null;
let referenceAudioUrl = null;

const worker = new Worker('worker.js', { type: 'module' });

// Handle Sample Voice Selection
sampleSelect.onchange = async (e) => {
    const url = e.target.value;
    if (!url) return;
    
    statusText.innerText = "Loading sample voice...";
    generateBtn.disabled = true;

    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        
        // Chatterbox Turbo requires 24kHz audio format natively
        const audioCtx = new AudioContext({ sampleRate: 24000 });
        const decodedData = await audioCtx.decodeAudioData(arrayBuffer);
        
        referenceAudioFloat32 = decodedData.getChannelData(0); 
        
        statusText.innerText = "Sample voice loaded! Ready to generate.";
        generateBtn.disabled = false;
        
        // Disable play recording button since a sample is being used
        playRefBtn.disabled = true; 
    } catch (err) {
        statusText.innerText = "Error loading sample. Ensure the file exists in your repository.";
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
            generateBtn.disabled = false;
            sampleSelect.value = ""; // Reset dropdown if user records voice
            statusText.innerText = "Voice captured successfully! Ready to generate.";
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
    } else if (status === 'ready') {
        progressContainer.classList.add('hidden');
        statusText.innerText = "Model loaded. Waiting for voice clone.";
    } else if (status === 'generating') {
        statusText.innerText = message;
        loadingContainer.classList.remove('hidden'); // Show animated loading bar
    } else if (status === 'complete') {
        loadingContainer.classList.add('hidden'); // Hide animated loading bar
        statusText.innerText = "Generation complete!";
        
        const wavBlob = encodeWAV(audio, sampleRate);
        outputAudio.src = URL.createObjectURL(wavBlob);
        outputAudio.style.display = 'block';
        outputAudio.play();
        
        generateBtn.disabled = false;
        generateBtn.innerText = "Generate Speech";
    }
};

// Send task to worker
generateBtn.onclick = () => {
    const text = textInput.value.trim();
    if (!text || !referenceAudioFloat32) return;
    
    generateBtn.disabled = true;
    generateBtn.innerText = "Generating...";
    outputAudio.style.display = 'none';
    
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
