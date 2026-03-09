import fs from 'node:fs/promises';
import https from 'node:https';

const filePath = 'src/data/movies.ts';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        });
      })
      .on('error', reject);
  });
}

function slugTitle(title) {
  const cleaned = title
    .replace(/–/g, '-')
    .replace(/—/g, '-')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned;
}

function norm(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function scoreCandidate(movieTitle, movieYear, candidate) {
  const label = candidate.l || '';
  const labelNorm = norm(label);
  const titleNorm = norm(movieTitle);

  let score = 0;
  if (candidate.i?.imageUrl) score += 20;

  if (candidate.y === movieYear) score += 40;
  else if (typeof candidate.y === 'number' && Math.abs(candidate.y - movieYear) === 1) score += 20;

  if (labelNorm === titleNorm) score += 30;
  else if (labelNorm.includes(titleNorm) || titleNorm.includes(labelNorm)) score += 18;

  if (candidate.qid === 'movie' || candidate.q === 'feature' || candidate.q === 'TV movie') score += 10;

  return score;
}

async function findPoster(title, year) {
  const query = encodeURIComponent(slugTitle(title));
  const first = slugTitle(title)[0]?.toLowerCase() || 'a';
  const url = `https://v2.sg.media-imdb.com/suggestion/${first}/${query}.json`;

  let data;
  try {
    data = await fetchJson(url);
  } catch {
    return null;
  }

  const candidates = (data.d || []).filter((x) => x?.i?.imageUrl);
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => scoreCandidate(title, year, b) - scoreCandidate(title, year, a));
  return candidates[0].i.imageUrl;
}

const raw = await fs.readFile(filePath, 'utf8');
const lines = raw.split(/\r?\n/);

let currentTitle = '';
let currentYear = undefined;

const updates = [];

for (let i = 0; i < lines.length; i += 1) {
  const titleMatch = lines[i].match(/^\s*title:\s*'([^']+)',\s*$/);
  if (titleMatch) currentTitle = titleMatch[1];

  const yearMatch = lines[i].match(/^\s*year:\s*(\d{4}),\s*$/);
  if (yearMatch) currentYear = Number(yearMatch[1]);

  const posterMatch = lines[i].match(/^(\s*poster:\s*)'([^']+)'(,\s*)$/);
  if (!posterMatch) continue;

  const posterUrl = posterMatch[2];
  const isTmdbPlaceholder = posterUrl.startsWith('https://image.tmdb.org/t/p/w500/');
  if (!isTmdbPlaceholder) continue;

  const fileName = posterUrl.split('/').pop() || '';
  const isLikelyRealTmdb = /^[A-Za-z0-9]{10,}\.(jpg|jpeg|png|webp)$/i.test(fileName);
  if (isLikelyRealTmdb) continue;

  updates.push({ lineIndex: i, title: currentTitle, year: currentYear ?? 0, oldUrl: posterUrl });
}

let changed = 0;
const missed = [];

for (const item of updates) {
  const newPoster = await findPoster(item.title, item.year);
  if (!newPoster) {
    missed.push(`${item.title} (${item.year})`);
    continue;
  }

  lines[item.lineIndex] = lines[item.lineIndex].replace(item.oldUrl, newPoster);
  changed += 1;
}

await fs.writeFile(filePath, lines.join('\n'), 'utf8');

console.log(`Updated posters: ${changed}`);
console.log(`Unmatched: ${missed.length}`);
if (missed.length) {
  console.log(missed.slice(0, 20).join('\n'));
}