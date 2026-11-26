/* Füstteszt a pszichológia oldalhoz (pszichologia/index.html) és a főoldalhoz.
   Önállóan: node smoke-psz.js · a smoke-test.js a végén ezt is lefuttatja. */
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

function run() {
  const root = path.resolve(__dirname, "..");
  const vc = new VirtualConsole(), jsErrors = [];
  vc.on("jsdomError", e => { if (!/Not implemented/.test(e.message)) jsErrors.push(e.message); });
  let failed = 0;
  const check = (name, cond, extra = "") => { console.log(`${cond ? "✓" : "✗"} ${name}${extra ? "  " + extra : ""}`); if (!cond) failed++; };

  return JSDOM.fromFile(path.join(root, "index.html")).then(home => {
    const links = [...home.window.document.querySelectorAll("a.card")].map(a => a.getAttribute("href"));
    check("főoldal: latin és pszichológia link", links.includes("latin/") && links.includes("pszichologia/"), links.join(", "));
    return JSDOM.fromFile(path.join(root, "pszichologia", "index.html"), {
      runScripts: "dangerously", resources: "usable", virtualConsole: vc, pretendToBeVisual: true,
    });
  }).then(dom => new Promise(resolve => dom.window.addEventListener("load", () => {
    const w = dom.window, d = w.document, $ = s => d.querySelector(s), $$ = s => [...d.querySelectorAll(s)];
    const click = s => { const el = typeof s === "string" ? $(s) : s; if (!el) throw new Error("nincs elem: " + s); el.click(); };
    try {
      try { w.localStorage.clear(); } catch (e) {}
      const QS = w.eval("QS"), CH = w.eval("CH");
      check("pszi: 4 fejezet betöltve", CH.length === 4);
      check("pszi: legalább 400 kérdés", QS.length >= 400, QS.length + " db");
      check("pszi: minden kérdésnek 4 különböző válasza van", QS.every(q => q.a.length === 4 && new Set(q.a).size === 4));
      check("pszi: minden kérdés létező részhez tartozik", QS.every(q => w.eval("SEC")[q.c]));

      // összefoglaló minden fejezetben
      click('[data-mode="sum"]');
      for (const ch of CH) {
        click(`#chapters [data-ch="${ch.id}"]`);
        check(`összefoglaló ${ch.id}: ${ch.sections.length} rész megjelenik`, $$("#secs .sec").length === ch.sections.length && $$("#toc a").length === ch.sections.length);
      }

      // gyakorlás: mind a 4 fejezet, 30 kérdés, mindig a helyes válasz
      click('[data-mode="quiz"]'); click('#chapters [data-ch="0"]');
      click('#qN [data-n="30"]'); click('#qMode [data-m="learn"]'); click("#qStart");
      check("gyakorlás indul", !$("#vQuiz").hidden);
      let n = 0;
      while (!$("#vQuiz").hidden && n < 100) {
        const it = w.eval("run").items[w.eval("run").i];
        click($$("#qOpts .opt")[it.opts.findIndex(o => o.ok)]);
        if (!$("#qExpl .expl.ok")) throw new Error("helyes válasz nem zöld: " + it.q.q);
        click("#qNext"); n++;
      }
      check("gyakorlás: 30 kérdés végigment", n === 30);
      check("gyakorlás: 100% az eredmény", /100%/.test($("#vResult .grade").textContent));

      // vizsga mód: első fejezet, 10 kérdés, mindig rossz válasz → hibás lista, újrázás
      click("#rBack"); click('#chapters [data-ch="1"]'); click('#qN [data-n="10"]'); click('#qMode [data-m="exam"]'); click("#qStart");
      n = 0;
      while (!$("#vQuiz").hidden && n < 50) {
        const it = w.eval("run").items[w.eval("run").i];
        click($$("#qOpts .opt")[it.opts.findIndex(o => !o.ok)]);
        if ($("#qExpl").innerHTML) throw new Error("vizsga módban nem szabad azonnal értékelni");
        click("#qNext"); n++;
      }
      check("vizsga: 10 kérdés, 0% és 10 hibás", n === 10 && /^0%/.test($("#vResult .grade").textContent) && $$("#vResult .review li").length === 10);
      const examKeys = w.eval("run").items.map(it => it.q.key);
      click("#rRetry");
      check("vizsga: újra a hibásakkal 10 kérdés", !$("#vQuiz").hidden && w.eval("run").items.length === 10);
      click("#qQuit");

      // statisztika és „Hibázott” szűrő (a két kör véletlenül átfedhet, ezért 30–40 kulcs)
      const stats = w.eval("stats");          // file:// alatt nincs localStorage, a memóriabeli állapotot nézzük
      const nKeys = Object.keys(stats).length;
      check("eredmények mentve, a vizsga kérdései hibásként", nKeys >= 30 && nKeys <= 40 && examKeys.every(k => stats[k].last === 0), nKeys + " db");
      click('#chapters [data-ch="1"]'); click('#qFilter [data-f="bad"]');
      check("Hibázott szűrő: 10 kérdés", /10 kérdés a\(z\) 10/.test($("#qAvail").textContent), $("#qAvail").textContent);
      click('#qFilter [data-f="all"]');

      // „Gyakorold →” egy részhez, majd vissza az összefoglalóra
      click('[data-mode="sum"]'); click('#chapters [data-ch="2"]');
      const sec = $("#secs [data-practice]").dataset.practice; click("#secs [data-practice]");
      const items = w.eval("run").items;
      check("Gyakorold: csak az adott rész kérdései", !$("#vQuiz").hidden && items.length > 0 && items.every(it => it.q.c === sec));
      click($$("#qOpts .opt")[0]); click("#qExpl [data-goto]");
      check("visszaugrás az összefoglalóra", !$("#vSum").hidden);
    } catch (e) {
      check("pszi: futás kivétel nélkül", false, e.stack);
    }
    check("pszi: nincs JS-hiba a konzolon", jsErrors.length === 0, jsErrors.join(" | "));
    resolve(failed);
  })));
}

module.exports = run;
if (require.main === module) run().then(f => { console.log(f ? `\n${f} ellenőrzés hibás` : "\nMinden rendben."); process.exit(f ? 1 : 0); });
