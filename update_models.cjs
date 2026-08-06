const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const updates = {
  'pres-barack-obama': { pitch: 110, range: [85, 175], wpm: 135, warmth: 98, clarity: 95, formants: [450, 1450, 2400, 3400] },
  'pres-donald-trump': { pitch: 132, range: [100, 190], wpm: 142, warmth: 55, clarity: 85, formants: [500, 1600, 2600, 3600] },
  'pres-joe-biden': { pitch: 108, range: [80, 160], wpm: 130, warmth: 85, clarity: 75, formants: [480, 1500, 2500, 3500] },
  'pres-george-w-bush': { pitch: 130, range: [95, 185], wpm: 155, warmth: 82, clarity: 88, formants: [510, 1550, 2550, 3550] },
  'pres-bill-clinton': { pitch: 102, range: [75, 160], wpm: 140, warmth: 96, clarity: 90, formants: [460, 1420, 2420, 3450] },
  'celeb-morgan-freeman': { pitch: 85, range: [60, 120], wpm: 110, warmth: 99, clarity: 98, formants: [380, 1250, 2150, 3050] },
  'celeb-arnold-schwarzenegger': { pitch: 105, range: [75, 165], wpm: 118, warmth: 65, clarity: 82, formants: [520, 1520, 2520, 3520] },
  'celeb-david-attenborough': { pitch: 115, range: [85, 180], wpm: 125, warmth: 96, clarity: 98, formants: [490, 1490, 2490, 3490] },
  'celeb-christopher-walken': { pitch: 112, range: [80, 180], wpm: 105, warmth: 75, clarity: 88, formants: [505, 1505, 2505, 3505] },
  'celeb-samuel-l-jackson': { pitch: 118, range: [85, 195], wpm: 165, warmth: 70, clarity: 95, formants: [515, 1515, 2515, 3515] },
  'celeb-keanu-reeves': { pitch: 100, range: [75, 145], wpm: 115, warmth: 85, clarity: 85, formants: [475, 1475, 2475, 3475] },
  'celeb-oprah-winfrey': { pitch: 195, range: [140, 280], wpm: 150, warmth: 97, clarity: 97, formants: [600, 1600, 2600, 3600] }
};

for (const [id, data] of Object.entries(updates)) {
  const regex = new RegExp(`(id:\\s*'${id}',[\\s\\S]*?vocalProfile:\\s*\\{[\\s\\S]*?fundamentalPitchHz:\\s*)\\d+(,[\\s\\S]*?pitchRangeHz:\\s*\\[)[^\\]]+(\\],[\\s\\S]*?speechCadenceWpm:\\s*)\\d+(,[\\s\\S]*?warmthScore:\\s*)\\d+(,[\\s\\S]*?clarityScore:\\s*)\\d+(,[\\s\\S]*?resonantFormants:\\s*\\[)[^\\]]+(\\])`);
  
  code = code.replace(regex, `$1${data.pitch}$2${data.range.join(', ')}$3${data.wpm}$4${data.warmth}$5${data.clarity}$6${data.formants.join(', ')}$7`);
}

fs.writeFileSync('server.ts', code);
