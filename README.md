# Liga Erőmérő

Támadó- és védekezőerő alapú erősorrend, esélylatolgató és idényszimuláció az öt top európai bajnokságra.

**Adatok**
- **Idei idény:** football-data.org, naponta kétszer frissítve egy GitHub-automatizmussal (`data/friss.json`).
- **Tartalék forrás:** ha az idei adat nem érhető el, az oldal az openfootball adatait használja, végső esetben a fájlba épített adatokat.
- **Előző idény:** az openfootball adatai, beépítve az `index.html`-be.

## Beállítás lépésről lépésre

### 1. API-kulcs igénylése
1. Nyisd meg a https://www.football-data.org/client/register oldalt, és regisztrálj az ingyenes (Free) csomagra.
2. A kulcsot e-mailben kapod meg (egy hosszú betű-szám sor). Senkinek ne küldd el, és ne írd bele egyik fájlba se.

### 2. Repó létrehozása és fájlok feltöltése
1. GitHubon: **New repository**, például `liga-eromero` néven, **Public** beállítással (a GitHub Pages ingyen így működik).
2. Az **Add file → Upload files** menüben töltsd fel az `index.html` fájlt, valamint a `scripts` mappát benne a `frissites.mjs` fájllal.
3. Az automatizmus fájlját külön hozd létre, mert a ponttal kezdődő mappákat a feltöltés gyakran kihagyja:
   - **Add file → Create new file**
   - Fájlnévnek írd be pontosan ezt: `.github/workflows/frissites.yml`
   - Másold be a mellékelt `frissites.yml` tartalmát, majd kattints a **Commit changes** gombra.

### 3. A kulcs megadása titkosként
1. **Settings → Secrets and variables → Actions → New repository secret**
2. A **Name** mezőbe írd be: `FOOTBALL_DATA_KEY`
3. A **Secret** mezőbe másold be az e-mailben kapott kulcsot, majd kattints az **Add secret** gombra.

### 4. Első frissítés kézzel
1. **Actions** fül → bal oldalt **Eredmények frissítése** → **Run workflow**.
2. Körülbelül egy perc múlva megjelenik a repóban a `data/friss.json` fájl.
3. Ha piros X-et látsz, kattints rá: a naplóban magyarul ott a hiba oka, például rossz kulcs esetén `HTTP 403`.

### 5. Weboldal bekapcsolása
1. **Settings → Pages → Build and deployment**
2. A **Source** legyen **Deploy from a branch**, a **Branch** pedig `main`, mappának `/ (root)`. Kattints a **Save** gombra.
3. Pár perc múlva az oldal elérhető a `https://<felhasználóneved>.github.io/liga-eromero/` címen.

Ezután az automatizmus minden nap reggel 7 és éjjel 0 óra körül magától frissít. Az oldal jobb felső sarkában a „football-data.org” felirat jelzi, hogy a friss adatokból számol.

## Jó tudni
- **Idényváltás (nyáron):** a frissítő szkript magától átvált az új idényre. Az `index.html`-ben viszont át kell írni a `const SEASON='2026-27'` sort, és a lezárt idényt „korábbi” idényként be kell építeni.
- **Leállt automatizmus:** a GitHub kikapcsolja az időzített futtatást, ha egy repóban 60 napig nincs változás (ez legfeljebb nyári szünetben fordulhat elő). Ilyenkor az **Actions** fülön egy kattintással újra bekapcsolható.
- **Kézzel beírt eredmények:** csak abban a böngészőben látszanak, ahol beírtad őket. Ha a forrásba is bekerül az eredmény, az app azt használja.
