import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const i18nDir = path.resolve(__dirname, '../frontend/public/i18n');

function flattenKeys(obj, prefix = '') {
	let keys = [];
	for (const [k, v] of Object.entries(obj)) {
		const fullKey = prefix ? `${prefix}.${k}` : k;
		if (v && typeof v === 'object' && !Array.isArray(v)) {
			keys = keys.concat(flattenKeys(v, fullKey));
		} else {
			keys.push(fullKey);
		}
	}
	return keys.sort();
}

const langs = ['en', 'pt', 'es'];
const catalogs = {};

for (const lang of langs) {
	const file = path.join(i18nDir, `${lang}.json`);
	if (!fs.existsSync(file)) {
		console.error(`Missing catalog file: ${file}`);
		process.exit(1);
	}
	const content = JSON.parse(fs.readFileSync(file, 'utf8'));
	catalogs[lang] = new Set(flattenKeys(content));
}

let hasError = false;
const baseLang = 'en';
const baseKeys = catalogs[baseLang];

for (const lang of langs) {
	if (lang === baseLang) continue;
	const currentKeys = catalogs[lang];

	const missing = [...baseKeys].filter((k) => !currentKeys.has(k));
	const extra = [...currentKeys].filter((k) => !baseKeys.has(k));

	if (missing.length > 0) {
		console.error(`[${lang}] missing keys:`, missing);
		hasError = true;
	}
	if (extra.length > 0) {
		console.error(`[${lang}] extra keys:`, extra);
		hasError = true;
	}
}

if (hasError) {
	console.error('i18n catalogs do not have identical key sets.');
	process.exit(1);
} else {
	console.log(
		`All ${langs.join(', ')} catalogs have identical ${baseKeys.size} keys.`,
	);
	process.exit(0);
}
