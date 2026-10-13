# CSStats

Statistics and trends for your [csTimer](https://cstimer.net) and PTimer solves. It's a static site: your export is parsed and analyzed entirely in the browser and never uploaded anywhere. The last file you load is kept in IndexedDB, so reloading the page doesn't mean re-uploading.

## Features

- **Summary**: solve count, best single, best ao5/ao12, mean ± σ, total practice time, penalties
- **Averages table**: current and best mo3 / ao5 / ao12 / ao50 / ao100 / ao1000, with the date and solve # of each best (trimmed averages follow csTimer/WCA rules)
- **Progress**: every solve plus rolling averages, zoomable, by solve number or date
- **Distribution**: histogram with adjustable bin size
- **Personal bests**: progression of single / ao5 / ao12 / ao100 records
- **Practice calendar**: solves per day, one year at a time
- **Time of day and weekly volume**: when you practice, and how fast you are at each hour and week
- **Solves**: recent solves with ao5/ao12 and scrambles
- Filter by session (Ctrl/⌘-click to combine sessions) and by date range
- **Fewest Moves**: FMC sessions show results in moves (singles like "28", means like "29.33"), counted and charted by whole moves. PTimer FMC sessions are recognized by their event; csTimer ones when every result is a whole number of moves.
- **Compare**: put up to four sessions side by side, from this file or from other exports you load for comparison. Each side has its own sessions and date range. You get a stats table with differences from the first side, plus overlaid progress, distribution and personal-best charts. Comparison files are remembered and are never edited.
- **Edit sessions**: merge sessions (interleaved by date, or appended in an order you choose), and import sessions from another csTimer export, either as new sessions or merged into existing ones. Duplicate solves are skipped when files share history. Edits can be undone or reverted, and **Download for csTimer** gives you a file to import back into csTimer.

## Getting your data

- **csTimer**: click **Export** → **Export to file**, then drop the `.txt` file onto the page.
- **PTimer**: export your sessions (a `.ptimer.json` file) or use a backup, and drop it onto the page.

Edits are saved back in the format you loaded: csTimer files download as csTimer exports, PTimer files as PTimer files (PTimer orders solves by date, so merges into a PTimer file are always by date). Sessions can be imported between the two formats in either direction; events are mapped the same way PTimer maps them.

## Development

```bash
npm install
npm run dev      # local dev server
npm test         # unit tests (parser, averages, formatting)
npm run build    # production build into dist/
```

## Deploying to GitHub Pages

1. Push this repo to GitHub on the `main` branch.
2. In the repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. `.github/workflows/deploy.yml` tests, builds and deploys on every push to `main`.

The build uses relative asset paths (`base: './'`), so it works at `https://<user>.github.io/<repo>/` without further configuration.
