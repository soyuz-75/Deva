# Deva, director's portfolio

A single-page site for Deva, *réalisatrice*. It's built from the Claude Design mock-up `Deva Site.dc.html`:

- a full-screen showreel that autoplays silently, under a title card, with three controls: **Regarder le showreel** (restarts it with sound, full screen when the browser allows), **Activer / Couper le son** and **Pause / Lecture**
- a sequence of 9 photographs on a 12-column grid (6 on phones), with a scroll-linked "exposure" reveal that is off under Reduce motion
- a **Générique** (credits) section and a contact block with a copy-address button

The look is "salle noire": the paper colour of the mock-up becomes the text on a screening-room black, and the accent is the yellow of the jersey in the photographs. Content still missing is marked **À compléter** on the page (dashed boxes).

It's plain HTML, CSS and JS with no build step, so it deploys as-is to Netlify, Vercel, Cloudflare Pages or GitHub Pages.

```
index.html               page markup (photos, contact links)
assets/css/style.css     styles (colours, fonts and spacing from the design)
assets/js/main.js        showreel autoplay, sound / pause / watch controls, copy email
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
3. For a new photo, add a `<figure class="shot">` in `index.html` that points at `media/web/photos/<name>-{1000,2000}.{webp,jpg}`, with alt text describing the picture, and give it a grid placement in `style.css` (see the `.shot--NN` rules). File names are lower-cased and spaces become dashes, so `IMG_3814.jpg` becomes `img-3814`.

You need ffmpeg: `brew install ffmpeg`, or `pip install imageio-ffmpeg`, which the script finds on its own.

### Showreel files

Source video exports stay in Google Drive (`Deva/Videos`). They're git-ignored because GitHub's upload page rejects anything over 25 MB. Only the compressed web versions are committed:

| File | Used on | Size |
| --- | --- | --- |
| `media/web/video/showreel-1080.mp4` | screens ≥ 1000 px wide | ~27 MB |
| `media/web/video/showreel-720.mp4` | phones, small screens, and fallback | ~14 MB |

They're currently built from `SHOWREELV1.mov` (1080p, HEVC). HEVC doesn't play in Chrome or Firefox, which is another reason the script always converts to H.264. To update the reel, download the new export from Drive and run:

```sh
VIDEO_SRC=~/Downloads/SHOWREELV3.mov npm run media -- video
```

Then commit `media/web/video/` with git or GitHub Desktop (limit 100 MB per file). GitHub's web upload page caps files at 25 MB, so the 1080p file doesn't fit there.

## Why the showreel didn't play right away, and what fixed it

1. **The design fell back to a Google Drive player.** Drive's `/preview` iframe never autoplays, and it's slow. The site now plays a video file it hosts itself.
2. **The file's index was at the end.** Straight from the editor, `SHOWREELV1.v2.mov` had its `moov` atom after 16 MB of video data, so the browser had to download almost all of it before showing frame one. The script re-encodes it with `-movflags +faststart`, which puts the index first, and outputs H.264 + AAC (1080p for desktop, 720p for phones).
3. **Autoplay rules.** Browsers only autoplay video that is `muted` and, on iOS, `playsinline`. The markup has `autoplay muted loop playsinline`, and `main.js` also sets the `muted` property, calls `play()`, and retries on the first tap or scroll when the browser still refuses (for example iOS Low Power Mode). Sound only turns on from the **Son** button, because browsers only allow sound after a user click.
4. **No black flash.** A poster frame is preloaded and sits behind the video until it paints.
5. **Being polite.** The reel pauses when it's scrolled off-screen or the tab is hidden. With *Reduce motion* or data-saver turned on, it doesn't autoplay; the poster shows instead.

Tested in headless Chromium: the reel is playing about 350 ms after navigation, sound toggles, it pauses off-screen, and there's no horizontal scroll at 390 px.

## To do before launch

- [ ] Instagram link (the contact block shows an "À compléter" placeholder)
- [ ] Générique: short bio, selected films (title, format, client or production, year), clients, representation
- [ ] Check that `hello@deva.film` is the real address
- [ ] Favicon and custom domain (then make `og:image` an absolute URL)
- [x] Alt text describing each photo
