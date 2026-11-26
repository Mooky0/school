# Tanulóoldalak (orvosi latin, pszichológia) – fejlesztői jegyzet (AI-asszisztenseknek is)

Build nélküli, egyoldalas tanulóalkalmazások: orvosi latin szavak és kifejezések, illetve Pszichológia alapjai összefoglaló + kérdésbank.
GitHub Pages-en fut (repo: `Mooky0/school`, ág: `main`), a felület és minden szöveg **magyar**.
A gyökér `index.html` egy navigációs főoldal; a latin alkalmazás a `/latin/`, a pszichológia a `/pszichologia/` címen van. Új tantárgy: saját mappa + kártya a főoldalon.

## Fájlok

| Fájl | Tartalom |
|---|---|
| `index.html` | Főoldal (landing page): tantárgy-kártyák, linkek az alkalmazásokra |
| `latin/index.html` | A latin alkalmazás: HTML + CSS + JS egy fájlban, keretrendszer nélkül |
| `latin/words.js` | `const WORDS` – főnevek (1–2. szószedet), 210 db |
| `latin/adjectives.js` | `const ADJECTIVES` – melléknevek (jegyzet 46. oldal), 148 db |
| `latin/expressions.js` | `const EXPRESSIONS` – birtokos/mellékneves kifejezések, 204 db (38 a jegyzet 47. oldaláról, 166 saját gyakorló) |
| `pszichologia/index.html` | Pszichológia: összefoglaló + kérdésbank (lásd lent) |
| `pszichologia/0N-*.js` | Fejezetenként egy adatfájl: `PSZ.push({id, short, title, sections, questions})` |
| `dev/smoke-test.js` | Automatikus füstteszt jsdom-mal (lásd lent); a végén lefuttatja a `dev/smoke-psz.js`-t is |
| `*.pdf` | Forrás jegyzetoldalak – **gitignore-olva**, nem kerülnek fel |

Az adatfájlok sima `<script src>`-vel töltődnek (nem `fetch`), így az oldal `file://`-ról is megy.
Sorrend a `latin/index.html`-ben: `words.js` → `adjectives.js` → `expressions.js` → fő script.

## Adatformátumok (soronként egy tétel)

```js
// words.js – főnév
{"la":"vertebra","gen":"-ae","g":"f","d":1,"hu":"csigolya","note":""}
//  gen: genitivus végződés (vagy teljes alak, pl. "cordis"); g: m/f/n; d: declinatio 1–5

// adjectives.js – melléknév
{"la":"accessorius","forms":"-a, -um","t":3,"hu":"járulékos","note":""}
//  t: hány végű (3: -us/-er,-a,-um · 2: -is,-is,-e és -or,-or,-us · 1: -ns/-ceps)
//  forms: a szótári alak további része; 1 végűnél a genitivus, pl. "(-ntis)"

// expressions.js – kifejezés
{"la":"musculus gracil[is]","hu":["karcsú izom"],"k":"a","src":"1"}
//  la: [szögletes zárójel] = kiegészítős feladat hiányzó végződése; ha nincs megadva,
//      az autoGap() a szószedetek alapján maga jelöli ki
//  hu: elfogadott magyar válaszok listája, az első a fő alak
//  k: "a" mellékneves, "g" birtokos, "ag" mindkettő
//  src: a 47. oldal feladatszáma ("1" kiegészítés, "2" latinra, "3" magyarra), "" = saját gyakorló
```

A 47. oldal megoldásait és a gyakorló kifejezések fordításait AI írta (a jegyzetben nincs megoldókulcs) – javításkor ezt érdemes szem előtt tartani.

## A `latin/index.html` szerkezete

A fő script szakaszai `/* ---------- név ---------- */` kommentekkel vannak elválasztva:
adatok előkészítése → `CHAPTERS` → storage → helpers → kifejezések (kártya, dolgozat) → chapters UI → modes → flashcards → szódolgozat → szójegyzék (+ saját dolgozat kijelölés) → reset → init.

Kulcsfogalmak:

- **Szószedet (set):** `SETS` = `noun` / `adj` / `expr`. A tétel `w.pos` mezője mondja meg, hova tartozik.
  `state.sets` tömb – több is bejelölhető (kapcsológombok); ilyenkor a `MIX_CHAPTERS` fejezetei látszanak.
- **`LEX`:** az összes tétel egy tömbben (`[...WORDS, ...ADJECTIVES, ...EXPRESSIONS]`). Betöltéskor kap `key`, `sec`, `alts`, kifejezésnél `gaps`, `gapShow`, `huKeys`, `gloss` mezőket.
- **Fejezet (chapter):** `CHAPTERS` elemei `{id, set, label, title, pattern(), filter(w)}`; opcionális: `group`/`sub`+`parent` (alcsoport chipek), `hard` (Hibázott), `custom` (Saját dolgozat). `curChapters()` adja az aktuálisakat, `chap(id)` biztonságosan feloldja.
- **Módok:** Kártyák (`startCards`), Szódolgozat (`newTest`, `submitTest`), Szójegyzék (`renderList`).
- **Dolgozat iránya** (`state.testDir`): `la` (latin→magyar), `hu` (magyar→latin), `fill` (végződés kiegészítése, csak kifejezésnél), `mix` (vegyes; a 47. oldal tételei az eredeti feladattípusukat kapják – `pickDir()`).
- **Értékelés:** szavak: `gradeHU` / `gradeLA` (+ `matchGen`, melléknévnél `matchForms`); kifejezések: `gradeExpr` (`normHU`: névelő/szóköz/kötőjel nem számít; `normLA`: j→i). Minden hibás sornál van „Elfogadom, jó volt” felülbírálás.
- **Saját dolgozat:** a Szójegyzékben kipipált tételek (`custom` Set), bármelyik szószedetből; a `★ Saját dolgozat` fejezet mindig elérhető.

### localStorage kulcsok (ne nevezd át – a felhasználó eredményei ezekben vannak)

| Kulcs | Tartalom |
|---|---|
| `orvlat-12-stats` | dolgozat-eredmények tételenként (`{ok, bad, last}`) |
| `orvlat-12-cards` | kártya-számlálók (`{yes, no, streak}`; „tudom” = streak ≥ 2) |
| `orvlat-12-pref` | beállítások (mód, szószedetek, fejezet, irányok…) |
| `orvlat-12-custom` | saját dolgozat kijelölése (kulcsok tömbje) |

A tételkulcsok formája: főnév `la|gen` (régi formátum, megtartandó), melléknév `adj|la`, kifejezés `expr|la`. Ha egy tétel `la` vagy `gen` mezőjét átírod, az eddigi eredménye elvész.

## Pszichológia (`pszichologia/`)

Forrás: a 4 diasor (`01_BEVEZETÉS…pdf` … `04_SZEMÉLYISÉGLÉLEKTAN…pdf`, gitignore-olva). Az **összefoglalót és a
kérdésbankot teljes egészében AI írta** a diák szövege alapján (a tanszéki kérdésbank nem nyilvános) – ezt az oldal is jelzi.
Kevés, a diákon nem szereplő kiegészítés van benne (pl. Ekman, Duchenne-mosoly, OCEAN, Gallnál a „frenológia” szó).

```js
// pszichologia/02-altalanos.js
(window.PSZ = window.PSZ || []).push({ id: 2, short: "Általános pszichológia", title: "02. Általános pszichológia",
  sections: [{ id: "2.5", title: "…", body: [
    "bekezdés **félkövér** *dőlt*", {h:"alcím"}, {ul:["…"]}, {table:[["fejléc",…],[…]]}, {tip:"Jegyezd meg…"}, {warn:"Ne keverd…"} ] }],
  questions: [{ c: "2.5", q: "kérdés", a: ["HELYES", "rossz", "rossz", "rossz"], e: "magyarázat (opcionális)" }] });
```

- `a[0]` mindig a helyes válasz, futáskor keveredik. Pontosan 4, egymástól különböző válasz legyen.
- `c` egy létező `sections[].id`; a „Gyakorold →” és a „→ Összefoglaló” linkek erre épülnek.
- Kérdéskulcs: `c|q` – ha a kérdés szövegét átírod, az eddigi eredménye elvész.
- Módok: Összefoglaló (fejezetváltó + tartalomjegyzék) · Kérdésbank (témakör, szűrő: mind / új / hibázott, darabszám, gyakorlás vagy vizsga mód; az eredménynél a kurzus ponthatárai szerinti jegy).
- localStorage: `psz-stats` (`{ok, bad, last}` kérdésenként; `last` 1 = legutóbb jó, 0 = hibás), `psz-pref` (beállítások).

## Tesztelés

Helyben: `open index.html` vagy `open latin/index.html` (szerver nem kell). GitHub Pages-szerű futtatás: `python3 -m http.server 8000`.

Automatikus füstteszt (betölti az oldalt jsdom-ban, végigkattintja a módokat, helyes válaszokkal kitölti a dolgozatokat):

```sh
cd dev && npm install   # egyszer
node smoke-test.js      # 0-s kilépési kód = minden rendben
```

Minden változtatás után futtasd. Új funkciónál bővítsd a tesztet.

## Munkamódszer, konvenciók

- **Ne commitolj és ne pusholj magadtól** – a felhasználó szól, amikor mehet. Commit előtt `git status`: a `.DS_Store` és a `*.swp` fájlok nem kerülnek fel.
- Ha új adatfájl jön létre, azt is commitolni kell, különben a GitHub Pages-en hibára fut az oldal.
- Új szószedet/feladatlap: külön adatfájlba, saját `SETS` bejegyzéssel és fejezetekkel – a meglévő anyagtól elkülönítve, de a többes kijelöléssel együtt is gyakorolható legyen.
- A PDF-ből átvett anyagnál a jegyzet sorrendjét és csoportosítását kövesd; ha AI egészít ki valamit (megoldás, extra példa), az legyen külön jelölve (pl. `src:""`, „Gyakorló” fejezet).
- Stílus: CSS-változók a `:root`-on, világos és sötét téma is; mobilnézet (640px alatt) működjön.
- Kód: tömör vanilla JS, `$()` = `querySelector`, `esc()` minden HTML-be írt szövegre.
