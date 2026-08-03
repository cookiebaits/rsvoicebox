const generateBtn = document.getElementById('generateBtn');
const textInput = document.getElementById('textInput');
const sampleSelect = document.getElementById('sampleSelect');
const statusText = document.getElementById('status');
const outputAudio = document.getElementById('outputAudio');
const executionProgressContainer = document.getElementById('executionProgressContainer');
const executionProgressBar = document.getElementById('executionProgressBar');
const executionProgressText = document.getElementById('executionProgressText');

let selectedMp3Base64 = null;

// Convert the selected MP3 file to Base64 so it can be sent in a JSON payload
async function convertMp3ToBase64(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function updateUIState() {
    const hasText = textInput.value.trim().length > 0;
    const hasVoice = selectedMp3Base64 !== null;

    if (!hasVoice) {
        generateBtn.disabled = true;
        generateBtn.innerText = "Please Select an MP3 Sample";
    } else if (!hasText) {
        generateBtn.disabled = true;
        generateBtn.innerText = "Please Enter Text to Generate";
    } else {
        generateBtn.disabled = false;
        generateBtn.innerText = "Generate Speech via API";
        generateBtn.className = "w-full bg-green-600 hover:bg-green-500 px-6 py-3 rounded-lg font-bold transition-colors cursor-pointer";
    }
}

textInput.addEventListener('input', updateUIState);

sampleSelect.onchange = async (e) => {
    const url = e.target.value;
    if (!url) {
        selectedMp3Base64 = null;
        updateUIState();
        return;
    }
    
    statusText.innerText = "Loading MP3 sample...";
    generateBtn.disabled = true;

    try {
        selectedMp3Base64 = await convertMp3ToBase64(url);
        statusText.innerText = "MP3 loaded successfully! Ready to clone.";
        updateUIState();
    } catch (err) {
        statusText.innerText = `Error loading MP3: ${err.message}`;
        selectedMp3Base64 = null;
        updateUIState();
    }
};

generateBtn.onclick = async () => {
    const text = textInput.value.trim();
    if (!text || !selectedMp3Base64) return;
    
    generateBtn.disabled = true;
    generateBtn.innerText = "Generating via API...";
    outputAudio.style.display = 'none';
    
    executionProgressContainer.classList.remove('hidden');
    executionProgressBar.style.width = `50%`;
    executionProgressText.innerText = `Sending to Server...`;

    try {
        // --- REPLACE THIS WITH YOUR ACTUAL API BACKEND ENDPOINT ---
        const API_URL = "https://api.your-voice-backend.com/v1/clone"; 
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Keep your API keys secured via backend proxies; never hardcode them in production GitHub Pages.
                'Authorization': 'Bearer YOUR_API_KEY' 
            },
            body: JSON.stringify({
                text: text,
                voice_sample_base64: selectedMp3Base64
            })
        });

        if (!response.ok) throw new Error("API generation failed.");

        // The API returns the fully generated audio file
        const audioBlob = await response.blob();
        
        executionProgressBar.style.width = `100%`;
        executionProgressText.innerText = `100%`;
        statusText.innerText = "Generation complete!";
        
        outputAudio.src = URL.createObjectURL(audioBlob);
        outputAudio.style.display = 'block';
        outputAudio.play();
    } catch (err) {
        statusText.innerText = `Error: ${err.message}`;
        executionProgressContainer.classList.add('hidden');
    } finally {
        updateUIState();
    }
};
