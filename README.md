# Deva Rocca, director's portfolio

A small static site for Deva Rocca:

- **Home** (`index.html`): the showreel full screen, the name on the right, buttons to **Selected works** and **Photos**, the Instagram link (@hwdev), the email, and Pause and Sound controls
- **Selected works** (`works.html`): a plain list of titles; clicking one plays the YouTube video in place under its title
- **Photos** (`photos.html`): 15 photographs in a staggered sequence

Plain HTML, CSS and JS, no framework.

```
index.html, works.html, photos.html   the three pages
assets/css/style.css                  styles for all pages
assets/js/main.js                     showreel (autoplay, sizes, Play/Pause, Sound) + click-to-play videos
scripts/build.sh                      copies the publishable files into dist/ (used by Netlify)
scripts/prepare-media.sh              converts source media into web-ready files (ffmpeg)
media/source/                         originals (never published)
media/web/                            generated files the site loads
netlify.toml                          hosting config
```

## Deploy (Netlify)

`netlify.toml` runs `scripts/build.sh`, which copies only the pages, `assets/` and `media/web/` into `dist/`, and Netlify serves `dist/`. In Netlify: Add new site, Import an existing project, GitHub, pick this repo, and keep the settings it reads from `netlify.toml`. Every push to the production branch redeploys.

## Adding or changing a video

In `works.html`, each video is one `<li class="film">` with a link whose `data-video` is the YouTube id (the part after `youtu.be/`) and whose `href` is the full YouTube address. Copy a `<li>` and change both.

## Updating the media

The originals (showreel export, full-size photos) are **not** in the repo: keep them in Google Drive (`Deva/Videos`, `Deva/Photos`). To change the site's media:

1. Put the new showreel (`.mov` or `.mp4`) in `media/source/video/`, or photos in `media/source/photos/`. These folders are git-ignored.
2. Run `npm run media` (or `bash scripts/prepare-media.sh video` / `photos`). It needs ffmpeg: `brew install ffmpeg`, or `pip install imageio-ffmpeg`, which the script finds on its own.
3. Commit what it writes to `media/web/`. For a new photo, add a `<figure>` to `photos.html` that points at `media/web/photos/<name>-{1000,2000}.{webp,jpg}` (file names are lower-cased, spaces and underscores become dashes).

To rebuild the reel from a new export: `VIDEO_SRC=~/Downloads/SHOWREELV3.mov npm run media -- video`.

### Showreel files

| File | Used on | Size |
| --- | --- | --- |
| `media/web/video/showreel-1080.mp4` | screens 1000 px wide and up | ~27 MB |
| `media/web/video/showreel-720.mp4` | phones, small screens, and fallback | ~14 MB |
| `media/web/video/showreel-480.mp4` | data saver and slow connections | ~3 MB |

All are H.264 + AAC with the index at the front (`faststart`), so they play in every browser and start while downloading. HEVC exports (like the original `.mov`) don't play in Chrome or Firefox, which is why the script always re-encodes.

## How the showreel plays

1. **Muted and inline.** Browsers only autoplay muted video, and iOS needs `playsinline`. Sound turns on from the **Sound** button (a click is required).
2. **Right size.** `assets/js/main.js` picks 1080p, 720p or 480p (data saver, 2G/3G) and steps down a size if a file fails.
3. **Safari without Range support.** If a browser rejects the file, the script downloads the small file and plays it from memory.
4. **Autoplay blocked** (iPhone Low Power Mode, "never auto-play" settings, some in-app browsers): the poster stays up, a **Play** button shows, and a tap anywhere starts the reel. On Safari and iPhone, a silent looping picture of the reel plays in the meantime when the browser allows it.
5. **Nothing can play:** an **Open showreel** link opens the video in its own tab.
6. **Polite.** It pauses off-screen and in background tabs, and there's always a Pause button. A poster frame is preloaded so there's never a black box.

## To do before launch

- [x] Email address set to rokdev3@gmail.com
- [ ] Favicon and custom domain
