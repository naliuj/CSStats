# CSStats

Statistics and trends for your [csTimer](https://cstimer.net) solves. It's a static site: your export is parsed and analyzed entirely in the browser and never uploaded anywhere. The last file you load is kept in IndexedDB, so reloading the page doesn't mean re-uploading.

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

## Getting your data

In csTimer, click **Export** → **Export to file**, then drop the `.txt` file onto the page.

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
