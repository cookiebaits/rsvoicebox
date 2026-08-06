const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace("const __filename = fileURLToPath(import.meta.url);\\nconst __dirname = path.dirname(__filename);", "");
code = code.replace("const __filename = fileURLToPath(import.meta.url);\nconst __dirname = path.dirname(__filename);", "const currentDir = process.cwd();");
// Wait, I need to check where __dirname is used.
fs.writeFileSync('server.ts', code);
