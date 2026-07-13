const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const replacements = {
  // Backgrounds
  'bg-\\[#09090b\\]': 'bg-zinc-50 dark:bg-[#09090b]',
  'bg-\\[#050505\\]': 'bg-white dark:bg-[#050505]',
  'bg-\\[#121212\\]': 'bg-white dark:bg-[#121212]',
  'bg-\\[#0a0a0a\\]': 'bg-zinc-50 dark:bg-[#0a0a0a]',
  'bg-zinc-950': 'bg-zinc-50 dark:bg-zinc-950',
  'bg-zinc-900': 'bg-zinc-100 dark:bg-zinc-900',
  'bg-zinc-800': 'bg-zinc-200 dark:bg-zinc-800',
  'bg-zinc-800/50': 'bg-zinc-200/50 dark:bg-zinc-800/50',
  
  // Borders
  'border-zinc-800/50': 'border-zinc-200 dark:border-zinc-800/50',
  'border-zinc-800': 'border-zinc-300 dark:border-zinc-800',
  'border-zinc-900': 'border-zinc-200 dark:border-zinc-900',
  'border-zinc-700': 'border-zinc-300 dark:border-zinc-700',
  
  // Texts
  'text-zinc-50': 'text-zinc-900 dark:text-zinc-50',
  'text-zinc-100': 'text-zinc-900 dark:text-zinc-100',
  'text-zinc-200': 'text-zinc-800 dark:text-zinc-200',
  'text-zinc-300': 'text-zinc-700 dark:text-zinc-300',
  'text-zinc-400': 'text-zinc-600 dark:text-zinc-400',
  'text-white': 'text-zinc-900 dark:text-white',

  // Hovers
  'hover:bg-zinc-800': 'hover:bg-zinc-300 dark:hover:bg-zinc-800',
  'hover:text-white': 'hover:text-zinc-900 dark:hover:text-white',
  'hover:text-zinc-200': 'hover:text-zinc-900 dark:hover:text-zinc-200',
  
  // Others
  'bg-white/10': 'bg-zinc-200 dark:bg-white/10',
  'bg-white/5': 'bg-zinc-100 dark:bg-white/5',
  'selection:bg-emerald-500/30': 'selection:bg-emerald-500/20 dark:selection:bg-emerald-500/30',
  'selection:text-emerald-200': 'selection:text-emerald-800 dark:selection:text-emerald-200'
};

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
};

const filesToProcess = [];
walkDir('/home/luis/Documents/hand-on/feeder/frontend/src/app', function(filePath) {
  if (filePath.endsWith('.ts') || filePath.endsWith('.html')) {
    filesToProcess.push(filePath);
  }
});

filesToProcess.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  // Because some replacements contain other replaced strings (like bg-zinc-800 vs bg-zinc-800/50),
  // we must be careful. We iterate and replace using boundaries.
  // Actually, standard string replace might be tricky with Tailwind classes since they can be prefixed or suffixed.
  // We'll use regex with word boundaries, but hyphens are word characters? No, hyphens are not \w.
  
  for (const [key, value] of Object.entries(replacements)) {
    // Only replace if it's not already prefixed by dark:
    // Regex: lookbehind for not 'dark:' (Not supported in all JS environments, but Node 10+ supports it)
    const regex = new RegExp(`(?<!dark:)(?<![\\w\\-])${key.replace(/\\[/g, '\\[').replace(/\\]/g, '\\]')}(?![\\w\\-/])`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, value);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
});
