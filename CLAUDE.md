@AGENTS.md

## Claude Code

- A felhasználóval magyarul kommunikálj.
- Nagyobb `index.html`-átalakításnál az `Edit` eszköz pontos szövegcserére megbízható; több helyen végzett, összefüggő cserénél egy assert-es Python-patch (minden régi szövegrész pontosan egyszer forduljon elő) is bevált.
- Változtatás után futtasd: `cd dev && node smoke-test.js` (első alkalommal `npm install`).
