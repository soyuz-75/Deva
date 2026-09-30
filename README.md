# Deva Rocca, director's portfolio

A small static site for Deva Rocca:

- **Home** (`index.html`): the showreel full screen and autoplaying silently, the name, a **Selected works** button, the Instagram link (@hwdev) and email, and a **Sound — on/off** toggle
- **Selected works** (`works.html`): a grid of YouTube videos, played inside the site (the player loads on click)

Plain HTML, CSS and JS with no build step, so it deploys as-is to Netlify, Vercel, Cloudflare Pages or GitHub Pages.

```
index.html               home: showreel, name, links
works.html               selected works (YouTube)
assets/css/style.css     styles
assets/js/main.js        showreel autoplay, sound toggle, click-to-play videos
scripts/prepare-media.sh converts source media into web-ready files (ffmpeg)
media/source/            originals: showreel export + photos
media/web/               generated files the site actually loads
netlify.toml             hosting config (long cache on media)
```

## Adding or changing a video

In `works.html`, each video is one `<li class="work">` whose button has `data-video="<YouTube id>"` (the part after `youtu.be/`). Copy a `<li>`, change the id in `data-video` and in the thumbnail `src`, and renumber.

## If the showreel doesn't play

`assets/js/main.js` picks the file size itself (1080p, 720p, or 480p on data saver / 2G-3G), steps down a size if a file can't be played, and shows a **Play** button whenever the browser refuses to autoplay (iOS Low Power Mode, reduced motion, data saver, in-app browsers). The same button pauses the reel.

## Preview locally

```sh
npm run dev              # http://localhost:3000
```

## Updating the media

1. Drop the new showreel export (`.mov` or `.mp4`) in `media/source/video/`, or photos in `media/source/photos/`.
2. Run `npm run media` (or `bash scripts/prepare-media.sh`, which also takes `video` or `photos` as an argument).
3. The photos are no longer used on the site; they are kept in `media/` in case they come back.

You need ffmpeg: `brew install ffmpeg`, or `pip install imageio-ffmpeg`, which the script finds on its own.

### Showreel files

Source video exports stay in Google Drive (`Deva/Videos`). They're git-ignored because GitHub's upload page rejects anything over 25 MB. Only the compressed web versions are committed:

| File | Used on | Size |
| --- | --- | --- |
| `media/web/video/showreel-1080.mp4` | screens ≥ 1000 px wide | ~27 MB |
| `media/web/video/showreel-720.mp4` | phones, small screens, and fallback | ~14 MB |
| `media/web/video/showreel-480.mp4` | data saver and slow connections | ~3 MB |

They're currently built from `SHOWREELV1.mov` (1080p, HEVC). HEVC doesn't play in Chrome or Firefox, which is another reason the script always converts to H.264. To update the reel, download the new export from Drive and run:

```sh
VIDEO_SRC=~/Downloads/SHOWREELV3.mov npm run media -- video
```

Then commit `media/web/video/` with git or GitHub Desktop (limit 100 MB per file). GitHub's web upload page caps files at 25 MB, so the 1080p file doesn't fit there.

## Why the showreel didn't play right away, and what fixed it

1. **The design fell back to a Google Drive player.** Drive's `/preview` iframe never autoplays, and it's slow. The site now plays a video file it hosts itself.
2. **The file's index was at the end.** Straight from the editor, `SHOWREELV1.v2.mov` had its `moov` atom after 16 MB of video data, so the browser had to download almost all of it before showing frame one. The script re-encodes it with `-movflags +faststart`, which puts the index first, and outputs H.264 + AAC (1080p for desktop, 720p for phones).
3. **Autoplay rules.** Browsers only autoplay video that is `muted` and, on iOS, `playsinline`. The markup has `autoplay muted loop playsinline`, and `main.js` also sets the `muted` property, calls `play()`, and retries on the first tap or scroll when the browser still refuses (for example iOS Low Power Mode). Sound only turns on from the **Sound** button, because browsers only allow sound after a user click.
4. **No black flash.** A poster frame is preloaded and sits behind the video until it paints.
5. **Being polite.** The reel pauses when it's scrolled off-screen or the tab is hidden. With *Reduce motion* or data-saver turned on, it doesn't autoplay; the poster shows instead.

Tested in headless Chromium: the reel is playing about 350 ms after navigation, sound toggles, it pauses off-screen, and there's no horizontal scroll at 390 px.

## To do before launch

- [x] Email address set to rokdev3@gmail.com
- [ ] Favicon and custom domain
