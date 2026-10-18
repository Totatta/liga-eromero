// Letölti a következő meccsek irodai szorzóit (1X2 és 2,5 gól felett/alatt) a The Odds API-ról,
// és elmenti a data/odds.json fájlba: kimenetenként az irodák ÁTLAGOS szorzóját, a fogadási
// tőzsdék (Betfair, Matchbook, Smarkets stb.) nélkül.
// Naponta legfeljebb egyszer kér le (kb. 10 kredit). Kényszerítés: FORCE=1.
// Kézzel: ODDS_API_KEY=... node scripts/odds.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const KEY = process.env.ODDS_API_KEY;
if (!KEY) { console.log('Nincs ODDS_API_KEY megadva, az oddsok letöltése kimarad.'); process.exit(0); }

const LIGAK = {
  'en.1': 'soccer_epl',
  'es.1': 'soccer_spain_la_liga',
  'de.1': 'soccer_germany_bundesliga',
  'fr.1': 'soccer_france_ligue_one',
  'it.1': 'soccer_italy_serie_a',
};
const TOZSDE = /betfair_ex|matchbook|smarkets|betdaq/i; // fogadási tőzsdék kulcsai
const FAJL = 'data/odds.json';
const most = new Date();

let regi = null;
try { regi = JSON.parse(await readFile(FAJL, 'utf8')); } catch {}
const force = process.env.FORCE === '1' || process.env.FORCE === 'true';
if (!force && regi?.updated && regi.updated.slice(0, 10) === most.toISOString().slice(0, 10)) {
  console.log('Az oddsok ma már frissültek, most kimarad. (Kényszerítés: a kézi indításnál pipáld be az „Oddsok újratöltése” opciót.)');
  process.exit(0);
}

const r2 = x => Math.round(x * 100) / 100;
const leagues = {};
let maradek = null, hiba = 0;
for (const [lg, sport] of Object.entries(LIGAK)) {
  try {
    const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds?regions=eu&markets=h2h,totals&oddsFormat=decimal&dateFormat=iso&apiKey=${KEY}`;
    const r = await fetch(url);
    maradek = r.headers.get('x-requests-remaining') ?? maradek;
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const esemenyek = await r.json();
    leagues[lg] = esemenyek.map(e => {
      const gy = { h: [], d: [], a: [], o: [], u: [] };
      for (const b of e.bookmakers || []) {
        if (TOZSDE.test(b.key || '') || TOZSDE.test(b.title || '')) continue;
        for (const m of b.markets || []) {
          if (m.key === 'h2h') {
            for (const x of m.outcomes) {
              const k = x.name === e.home_team ? 'h' : x.name === e.away_team ? 'a' : x.name === 'Draw' ? 'd' : null;
              if (k && x.price > 1) gy[k].push(x.price);
            }
          } else if (m.key === 'totals') {
            for (const x of m.outcomes) if (x.point === 2.5 && x.price > 1) gy[x.name === 'Over' ? 'o' : 'u'].push(x.price);
          }
        }
      }
      const avg = {}, n = {};
      for (const k in gy) if (gy[k].length) { avg[k] = r2(gy[k].reduce((s, v) => s + v, 0) / gy[k].length); n[k] = gy[k].length; }
      return { date: e.commence_time.slice(0, 10), home: e.home_team, away: e.away_team, avg, n };
    }).filter(x => Object.keys(x.avg).length);
    console.log(`${lg}: ${leagues[lg].length} meccs átlagszorzói`);
  } catch (e) {
    hiba++;
    console.error(`${lg} oddsainak letöltése nem sikerült: ${e.message}`);
    if (regi?.leagues?.[lg]) leagues[lg] = regi.leagues[lg];
  }
}
if (maradek !== null) console.log(`Hátralévő kredit ebben a hónapban: ${maradek}`);
if (hiba === Object.keys(LIGAK).length) { console.error('Egyik liga oddsai sem töltődtek le.'); process.exit(1); }
await mkdir('data', { recursive: true });
await writeFile(FAJL, JSON.stringify({ source: 'the-odds-api.com', kind: 'avg-no-exchanges', updated: most.toISOString(), remaining: maradek, leagues }));
console.log('Mentve:', FAJL);
