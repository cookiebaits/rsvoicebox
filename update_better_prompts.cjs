const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldPromptText = "const promptText = \\`Say with the voice persona of \\${selectedModel.name} (\\${selectedModel.description}, \\${selectedModel.accent}) \\${vocalProfileDetails}:\\n\\${text}\\`;";
const newPromptText = "const promptText = \\`You must perfectly clone the voice of \\${selectedModel.name}. Analyze their public recordings and adopt their precise baseline pitch, cadence, signature intonations, and common pauses. \\${selectedModel.description} Accent: \\${selectedModel.accent}. \\${vocalProfileDetails}. Emulate their specific vocal resonance, bass/treble balance, and breathing patterns.\\n\\nText:\\n\\${text}\\`;";

code = code.replace(oldPromptText, newPromptText);
fs.writeFileSync('server.ts', code);
