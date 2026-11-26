/* Füstteszt: betölti a latin/index.html-t jsdom-ban, végigkattintja a fő funkciókat,
   helyes válaszokkal kitölti a dolgozatokat, és ellenőrzi, hogy minden hibátlan.
   Futtatás: cd dev && npm install && node smoke-test.js  (0-s kilépési kód = rendben) */
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const root = path.resolve(__dirname, "..", "latin");
const vc = new VirtualConsole();
const jsErrors = [];
vc.on("jsdomError", e => { if (!/Not implemented/.test(e.message)) jsErrors.push(e.message); });

let failed = 0;
function check(name, cond, extra = "") {
  console.log(`${cond ? "✓" : "✗"} ${name}${extra ? "  " + extra : ""}`);
  if (!cond) failed++;
}

JSDOM.fromFile(path.join(root, "index.html"), {
  runScripts: "dangerously", resources: "usable", virtualConsole: vc, pretendToBeVisual: true,
}).then(dom => dom.window.addEventListener("load", () => {
  const w = dom.window, d = w.document, $ = s => d.querySelector(s);
  try { w.localStorage.clear(); } catch (e) {}
  const click = s => { const el = $(s); if (!el) throw new Error("nincs elem: " + s); el.click(); };
  const onlySet = k => {                       // csak a megadott szószedet legyen bejelölve
    click(`#sets [data-set="${k}"]`);
    if ($(`#sets [data-set="${k}"]`).getAttribute("aria-pressed") !== "true") click(`#sets [data-set="${k}"]`);
    ["noun", "adj", "expr"].filter(x => x !== k).forEach(x => {
      if ($(`#sets [data-set="${x}"]`).getAttribute("aria-pressed") === "true") click(`#sets [data-set="${x}"]`);
    });
  };
  const setCount = v => { const s = $("#testCount"); s.value = v; s.dispatchEvent(new w.Event("change")); };
  const ts = () => w.eval("ts");

  try {
    const W = w.eval("WORDS"), A = w.eval("ADJECTIVES"), E = w.eval("EXPRESSIONS");
    check("adatfájlok betöltve", W.length > 0 && A.length > 0 && E.length > 0, `${W.length} főnév, ${A.length} melléknév, ${E.length} kifejezés`);
    const keys = w.eval("LEX").map(x => x.key);
    check("tételkulcsok egyediek", new Set(keys).size === keys.length);

    // főnevek: teljes szótári alakos dolgozat
    onlySet("noun"); click('[data-ch="all"]'); click('[data-mode="test"]'); click('#testDir [data-v="hu"]');
    $("#testFull").checked = true; $("#testFull").dispatchEvent(new w.Event("change")); setCount("0");
    ts().items.forEach((it, i) => { $(`#a${i}-w`).value = it.w.la; $(`#a${i}-g`).value = it.w.gen; $(`#a${i}-n`).value = it.w.g; });
    click("#testSubmit");
    check("főnevek: helyes válaszok mind jók", ts().items.every(t => t.res.ok), `${ts().items.length} tétel`);

    // melléknevek: végződésekkel
    onlySet("adj"); click('[data-ch="aall"]'); click('[data-mode="test"]'); click('#testDir [data-v="hu"]'); setCount("0");
    ts().items.forEach((it, i) => { $(`#a${i}-w`).value = it.w.la; $(`#a${i}-g`).value = it.w.gen; });
    click("#testSubmit");
    check("melléknevek: helyes válaszok mind jók", ts().items.every(t => t.res.ok), `${ts().items.length} tétel`);

    // kifejezések: 47. oldal vegyes (zh-szerű) dolgozat
    onlySet("expr"); click('[data-ch="e47"]'); click('[data-mode="test"]'); click('#testDir [data-v="mix"]'); setCount("0");
    const dirs = ts().items.map(t => t.dir[0]).join("");
    check("47. oldal: zh-sorrend (18 kiegészítés, 10 latinra, 10 magyarra)", dirs === "f".repeat(18) + "h".repeat(10) + "l".repeat(10), dirs);
    ts().items.forEach((it, i) => {
      if (it.dir === "fill") it.w.gaps.forEach((g, k) => { $(`#a${i}-x${k}`).value = g.end; });
      else $(`#a${i}-w`).value = it.dir === "hu" ? it.w.la : it.w.huAlts[0];
    });
    click("#testSubmit");
    check("47. oldal: helyes válaszok mind jók", ts().items.every(t => t.res.ok));

    // összes kifejezés, minden irányban
    for (const dir of ["la", "hu", "fill"]) {
      click('[data-ch="eall"]'); click(`#testDir [data-v="${dir}"]`); setCount("0");
      ts().items.forEach((it, i) => {
        if (it.dir === "fill") it.w.gaps.forEach((g, k) => { $(`#a${i}-x${k}`).value = g.stem + g.end; });
        else it.w.huAlts && ($(`#a${i}-w`).value = it.dir === "hu" ? it.w.la : it.w.huAlts[it.w.huAlts.length - 1]);
      });
      click("#testSubmit");
      const bad = ts().items.filter(t => !t.res.ok);
      check(`kifejezések (${dir}): helyes válaszok mind jók`, bad.length === 0, bad.slice(0, 3).map(t => t.w.la).join(", "));
    }

    // saját dolgozat: első 47 a 3 végűekből + 5 kifejezés, 20 kérdés
    onlySet("adj"); click('[data-ch="a3"]'); click('[data-mode="list"]');
    $("#pickN").value = "47"; click("#pickFirst");
    check("saját dolgozat: első 47 kijelölve", $("#pickCount").textContent === "47");
    onlySet("expr"); click('[data-ch="e47"]'); $("#pickN").value = "5"; click("#pickFirst");
    click("#pickGo"); setCount("20");
    const custom = w.eval("custom");
    check("saját dolgozat: 20 kérdés, mind a kijelöltekből", ts().items.length === 20 && ts().items.every(t => custom.has(t.w.key)));

    // kártyák minden szószedetben
    for (const k of ["noun", "adj", "expr"]) {
      onlySet(k); click('[data-mode="cards"]');
      check(`kártya (${k}) megjelenik`, $("#cardFront").textContent.trim().length > 0);
    }
  } catch (e) {
    check("futás kivétel nélkül", false, e.stack);
  }
  check("nincs JS-hiba a konzolon", jsErrors.length === 0, jsErrors.join(" | "));
  console.log("\n— pszichológia + főoldal —");
  require("./smoke-psz")().then(f => {
    failed += f;
    console.log(failed ? `\n${failed} ellenőrzés hibás` : "\nMinden rendben.");
    process.exit(failed ? 1 : 0);
  });
}));
