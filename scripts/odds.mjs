// Letölti a következő meccsek irodai szorzóit (1X2 és 2,5 gól felett/alatt) a The Odds API-ról,
// és elmenti a data/odds.json fájlba. Naponta legfeljebb egyszer kér le (kb. 10 kredit / nap).
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
const FAJL = 'data/odds.json';
const MIN_ORA = 20; // ennyi órán belül nem kér le újra (kreditkímélés)

let regi = null;
try { regi = JSON.parse(await readFile(FAJL, 'utf8')); } catch {}
if (regi?.updated && !process.env.FORCE && (Date.now() - Date.parse(regi.updated)) / 36e5 < MIN_ORA) {
  console.log(`Az oddsok ${MIN_ORA} órán belül frissültek, most kimarad.`); process.exit(0);
}

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
      const best = {}, sum = { h: 0, d: 0, a: 0 }; let n = 0;
      const jobb = (k, ar, iroda) => { if (ar > 1 && (!best[k] || ar > best[k][0])) best[k] = [ar, iroda]; };
      for (const b of e.bookmakers || []) {
        for (const m of b.markets || []) {
          if (m.key === 'h2h') {
            const o = Object.fromEntries(m.outcomes.map(x => [x.name, x.price]));
            const h = o[e.home_team], a = o[e.away_team], d = o.Draw;
            jobb('h', h, b.title); jobb('d', d, b.title); jobb('a', a, b.title);
            if (h && d && a) { sum.h += 1 / h; sum.d += 1 / d; sum.a += 1 / a; n++; }
          } else if (m.key === 'totals') {
            for (const x of m.outcomes) if (x.point === 2.5) jobb(x.name === 'Over' ? 'o' : 'u', x.price, b.title);
          }
        }
      }
      // piaci (árrés nélküli) valószínűség az irodák átlagából
      let piac = null;
      if (n) { const t = sum.h + sum.d + sum.a; piac = { h: +(sum.h / t).toFixed(4), d: +(sum.d / t).toFixed(4), a: +(sum.a / t).toFixed(4) }; }
      return { date: e.commence_time.slice(0, 10), home: e.home_team, away: e.away_team, books: (e.bookmakers || []).length, best, piac };
    });
    console.log(`${lg}: ${leagues[lg].length} meccs szorzói`);
  } catch (e) {
    hiba++;
    console.error(`${lg} oddsainak letöltése nem sikerült: ${e.message}`);
    if (regi?.leagues?.[lg]) leagues[lg] = regi.leagues[lg];
  }
}
if (maradek !== null) console.log(`Hátralévő kredit ebben a hónapban: ${maradek}`);
if (hiba === Object.keys(LIGAK).length) { console.error('Egyik liga oddsai sem töltődtek le.'); process.exit(1); }
await mkdir('data', { recursive: true });
await writeFile(FAJL, JSON.stringify({ source: 'the-odds-api.com', updated: new Date().toISOString(), remaining: maradek, leagues }));
console.log('Mentve:', FAJL);
