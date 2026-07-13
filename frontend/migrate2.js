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
  'bg-[#09090b]': 'bg-zinc-50 dark:bg-[#09090b]',
  'bg-[#050505]': 'bg-white dark:bg-[#050505]',
  'bg-[#121212]': 'bg-white dark:bg-[#121212]',
  'bg-[#0a0a0a]': 'bg-zinc-50 dark:bg-[#0a0a0a]',
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
  
  for (const [key, value] of Object.entries(replacements)) {
    const escapedKey = escapeRegExp(key);
    const regex = new RegExp(`(?<!dark:)(?<![\\w\\-])${escapedKey}(?![\\w\\-/])`, 'g');
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
