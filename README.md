# Deva, director's portfolio

A single-page site for Deva, *réalisatrice*. It's built from the Claude Design mock-up `Deva Site.dc.html`:

- a full-screen showreel that autoplays silently, with a **Son — on/off** toggle for sound
- an editorial layout of 9 numbered photographs
- a contact footer

It's plain HTML, CSS and JS with no build step, so it deploys as-is to Netlify, Vercel, Cloudflare Pages or GitHub Pages.

```
index.html               page markup (photos, contact links)
assets/css/style.css     styles (colours, fonts and spacing from the design)
assets/js/main.js        showreel autoplay + sound toggle
scripts/prepare-media.sh converts source media into web-ready files (ffmpeg)
media/source/            originals: showreel export + photos
media/web/               generated files the site actually loads
netlify.toml             hosting config (long cache on media)
```

## Preview locally

```sh
npm run dev              # http://localhost:3000
```

## Updating the media

1. Drop the new showreel export (`.mov` or `.mp4`) in `media/source/video/`, or photos in `media/source/photos/`.
2. Run `npm run media` (or `bash scripts/prepare-media.sh`, which also takes `video` or `photos` as an argument).
3. For a new photo, add a `<figure>` in `index.html` that points at `media/web/photos/<name>-{1000,2000}.{webp,jpg}`. File names are lower-cased and spaces become dashes, so `IMG_3814.jpg` becomes `img-3814`.

You need ffmpeg: `brew install ffmpeg`, or `pip install imageio-ffmpeg`, which the script finds on its own.

The current showreel (`SHOWREELV1.v2.mov`) is only **640×360**, which looks soft full-screen on a large display. When a 1080p export exists, drop it in `media/source/video/` and re-run the script. It never upscales, and it caps output at 1080p. Keep sources under 100 MB, GitHub's per-file limit; the 527 MB master should stay on Google Drive.

## Why the showreel didn't play right away, and what fixed it

1. **The design fell back to a Google Drive player.** Drive's `/preview` iframe never autoplays, and it's slow. The site now plays a video file it hosts itself.
2. **The file's index was at the end.** Straight from the editor, `SHOWREELV1.v2.mov` had its `moov` atom after 16 MB of video data, so the browser had to download almost all of it before showing frame one. The script re-encodes it with `-movflags +faststart`, which puts the index first, and shrinks it to **4.6 MB** (H.264 + AAC).
3. **Autoplay rules.** Browsers only autoplay video that is `muted` and, on iOS, `playsinline`. The markup has `autoplay muted loop playsinline`, and `main.js` also sets the `muted` property, calls `play()`, and retries on the first tap or scroll when the browser still refuses (for example iOS Low Power Mode). Sound only turns on from the **Son** button, because browsers only allow sound after a user click.
4. **No black flash.** A poster frame is preloaded and sits behind the video until it paints.
5. **Being polite.** The reel pauses when it's scrolled off-screen or the tab is hidden. With *Reduce motion* or data-saver turned on, it doesn't autoplay; the poster shows instead.

Tested in headless Chromium: the reel is playing about 350 ms after navigation, sound toggles, it pauses off-screen, and there's no horizontal scroll at 390 px.

## To do before launch

- [ ] 1080p showreel export
- [ ] Real email and Instagram link in the footer (currently `hello@deva.film` and `#`, as in the mock-up)
- [ ] Alt text describing each photo
- [ ] Favicon and custom domain
