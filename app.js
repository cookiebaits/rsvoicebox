const recordBtn = document.getElementById('recordBtn');
const playRefBtn = document.getElementById('playRefBtn');
const generateBtn = document.getElementById('generateBtn');
const textInput = document.getElementById('textInput');
const statusText = document.getElementById('status');
const outputAudio = document.getElementById('outputAudio');

let mediaRecorder;
let audioChunks = [];
let referenceAudioFloat32 = null;
let referenceAudioUrl = null;

// Set up the Web Worker for background AI processing
const worker = new Worker('worker.js', { type: 'module' });

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
            
            // AI models expect raw float arrays. Decode at 24kHz (Chatterbox default)
            const arrayBuffer = await blob.arrayBuffer();
            const audioCtx = new AudioContext({ sampleRate: 24000 });
            const decodedData = await audioCtx.decodeAudioData(arrayBuffer);
            
            // Extract Mono channel
            referenceAudioFloat32 = decodedData.getChannelData(0); 
            
            playRefBtn.disabled = false;
            generateBtn.disabled = false;
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
    const { status, message, audio, sampleRate } = e.data;
    
    if (status === 'progress') {
        statusText.innerText = message;
    } else if (status === 'ready') {
        statusText.innerText = "Model loaded. Waiting for voice clone.";
    } else if (status === 'complete') {
        statusText.innerText = "Generation complete!";
        
        // Convert the returned Float32Array to a playable WAV Blob
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

// Utility function to convert raw PCM Float32Array to WAV format
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
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // Mono channel
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // Byte rate
    view.setUint16(32, 2, true); // Block align
    view.setUint16(34, 16, true); // Bits per sample
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);
    
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([buffer], { type: 'audio/wav' });
}
