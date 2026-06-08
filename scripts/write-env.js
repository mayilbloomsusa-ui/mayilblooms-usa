import { writeFileSync } from 'fs';

const isGitHubPages = (process.env.VITE_BASE || '').includes('mayilblooms-usa');
const apiUrl = isGitHubPages ? 'https://mayilblooms.work.gd/api' : '/api';
const content = `window.ENV = { API_URL: "${apiUrl}" };\n`;

writeFileSync('dist/env.js', content);
console.log(`Wrote dist/env.js (API_URL=${apiUrl})`);
