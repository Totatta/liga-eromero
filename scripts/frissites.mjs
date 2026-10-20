// Letölti a nyolc liga idei meccseit a football-data.org-ról, és elmenti a data/friss.json fájlba.
// A GitHub-automatizmus futtatja naponta kétszer. Kézzel: FOOTBALL_DATA_KEY=... node scripts/frissites.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const KEY = process.env.FOOTBALL_DATA_KEY;
if (!KEY) { console.error('Hiányzik a FOOTBALL_DATA_KEY (a football-data.org API-kulcs).'); process.exit(1); }

const LIGAK = { 'en.1': 'PL', 'es.1': 'PD', 'de.1': 'BL1', 'fr.1': 'FL1', 'it.1': 'SA', 'nl.1': 'DED', 'pt.1': 'PPL', 'br.1': 'BSA' };
const NAPTARI = new Set(['br.1']);   // naptári évben játszott ligák (pl. Brazília: 2026)
const most = new Date();
const kezdoEv = most.getUTCMonth() >= 6 ? most.getUTCFullYear() : most.getUTCFullYear() - 1; // júliustól új idény
const IDENY = `${kezdoEv}-${String(kezdoEv + 1).slice(2)}`;   // pl. 2026-27
const evOf = lg => NAPTARI.has(lg) ? most.getUTCFullYear() : kezdoEv;
const idenyOf = lg => NAPTARI.has(lg) ? String(most.getUTCFullYear()) : IDENY;
const FAJL = 'data/friss.json';
const varj = ms => new Promise(r => setTimeout(r, ms));

let regi = { leagues: {} };
try { regi = JSON.parse(await readFile(FAJL, 'utf8')); } catch {}

const leagues = {};
let hiba = 0;
for (const [lg, kod] of Object.entries(LIGAK)) {
  try {
    const r = await fetch(`https://api.football-data.org/v4/competitions/${kod}/matches?season=${evOf(lg)}`,
      { headers: { 'X-Auth-Token': KEY } });
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    const short = {}, matches = [];
    for (const m of j.matches) {
      if (m.status === 'CANCELLED') continue;
      const h = m.homeTeam?.name, a = m.awayTeam?.name;
      if (!h || !a) continue;
      if (m.homeTeam.shortName) short[h] = m.homeTeam.shortName;
      if (m.awayTeam.shortName) short[a] = m.awayTeam.shortName;
      const ft = m.score?.fullTime, datum = m.utcDate.slice(0, 10);
      const kesz = (m.status === 'FINISHED' || m.status === 'AWARDED') && ft && ft.home != null && ft.away != null;
      matches.push(kesz ? [datum, h, a, ft.home, ft.away] : [datum, h, a]);
    }
    matches.sort((x, y) => x[0].localeCompare(y[0]));
    leagues[lg] = { season: idenyOf(lg), matches, short };
    console.log(`${lg}: ${matches.filter(m => m.length === 5).length} lejátszott / ${matches.length} meccs`);
  } catch (e) {
    hiba++;
    console.error(`${lg} (${kod}) letöltése nem sikerült: ${e.message}. A korábbi adat marad.`);
    if (regi.leagues?.[lg]) leagues[lg] = regi.leagues[lg];
  }
  await varj(7000); // ingyenes csomag: max. 10 lekérés percenként
}

if (hiba === Object.keys(LIGAK).length) { console.error('Egyik liga sem töltődött le.'); process.exit(1); }
if (JSON.stringify(leagues) === JSON.stringify(regi.leagues)) { console.log('Nincs változás.'); process.exit(0); }
await mkdir('data', { recursive: true });
await writeFile(FAJL, JSON.stringify({ source: 'football-data.org', updated: most.toISOString(), leagues }));
console.log('Mentve:', FAJL);
