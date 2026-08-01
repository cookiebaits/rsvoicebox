# 🎙️ Ruinscams Voice Clone

Ruinscams Voice Clone is a 100% browser-based, zero-shot voice cloning web application. Inspired by Jamie Pine's Voicebox, this project allows you to record a few seconds of your voice and generate highly expressive, synthesized speech from text—all without a backend server. 

This project leverages **Chatterbox Turbo** (a 350M parameter model by Resemble AI) running entirely on the client side using **Transformers.js** and **WebGPU**. 

## ✨ Features

* **Zero-Shot Voice Cloning:** Clone any voice using just a 5-10 second microphone recording.
* **Highly Expressive:** Supports paralinguistic tags in your text prompts (e.g., `[laugh]`, `[sigh]`, `[cough]`).
* **100% Client-Side:** No servers, no backend APIs, and no subscriptions. All processing happens locally on your device.
* **Privacy-First:** Your voice recordings never leave your browser.
* **GitHub Pages Ready:** Since it's purely HTML/JS, it can be hosted anywhere for free.

## 🚀 How to Deploy (GitHub Pages)

Hosting this project is incredibly simple because it requires no backend.

1. Create a new repository on GitHub.
2. Upload the `index.html`, `app.js`, and `worker.js` files to your repository.
3. Go to your repository's **Settings** > **Pages**.
4. Under the **Build and deployment** section, select **Deploy from a branch**.
5. Choose the `main` branch and `/ (root)` folder, then click **Save**.
6. Wait a minute or two, and GitHub will provide you with a live URL to access Ruinscams Voice Clone!

## 📖 How to Use

1. **Allow Microphone Access:** When prompted, allow the browser to access your microphone.
2. **Record Reference Audio:** Click "Start Recording" and speak clearly for 5 to 10 seconds. Click "Stop Recording" when finished. 
3. **Wait for the Model:** On your first visit, the browser will download the Chatterbox Turbo model weights (~1.5GB). This will be cached in your browser for instant loading on future visits.
4. **Type your Prompt:** Enter the text you want the AI to say. Don't forget to try tags like `[laugh]`!
5. **Generate:** Click "Generate Speech". The WebGPU engine will synthesize the audio based on your voice clone and play it back to you.

## ⚠️ Browser Requirements

Because this application runs a heavy 350M parameter AI model directly in the browser, it requires modern hardware and software:

* **WebGPU Support:** You must use a browser that supports WebGPU (e.g., recent versions of **Google Chrome** or **Microsoft Edge** on a desktop).
* **Hardware:** A dedicated GPU or a modern integrated GPU is highly recommended for reasonable generation times. Mobile browsers currently have limited to no WebGPU support and may struggle to run this application.

## 🛠️ Tech Stack

* **UI:** HTML5, JavaScript, Tailwind CSS (via CDN)
* **AI Engine:** [Transformers.js](https://huggingface.co/docs/transformers.js/index) V3 (using WebGPU)
* **Model:** [ResembleAI/chatterbox-turbo](https://huggingface.co/ResembleAI/chatterbox-turbo)
* **Audio Processing:** Web Audio API

## 📜 License

This project is open-source. Please note that while the Ruinscams UI is free to use, you must adhere to the licensing terms set by Resemble AI for the Chatterbox Turbo model weights when using or distributing them.
