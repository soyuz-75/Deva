# Deva — director portfolio

A static portfolio site for the director Deva, with a full-screen showreel playing in the background, selected work, an about section, contact details, and a full-screen player for the complete reel with sound.

It's plain HTML, CSS and JS with no build step, so it deploys as-is to Netlify, Vercel, Cloudflare Pages or GitHub Pages.

```
index.html               page markup (edit projects, bio, contact here)
assets/css/style.css     styles
assets/js/main.js        background-video autoplay + reel player
scripts/prepare-media.sh converts raw media into web-ready files (ffmpeg)
media/source/            raw files from Google Drive (git-ignored, never committed)
media/web/               generated, optimised files the site uses
netlify.toml             hosting config (long cache on media)
```

## 1. Get the media from Google Drive

The originals live in the Google Drive folder **Deva**:

| Drive                              | Put it in              |
| ---------------------------------- | ---------------------- |
| `Deva/Videos/SHOWREELV1.mp4` (or `.mov`) | `media/source/video/`  |
| `Deva/Photos/*.jpg`                | `media/source/photos/` |

`DSC09475.PSD` has to be exported to `.jpg` first.

## 2. Generate web media

```sh
brew install ffmpeg      # once
npm run media            # or: bash scripts/prepare-media.sh
```

The script writes these files:

- `media/web/video/showreel-loop.mp4`: a silent 20-second 1080p cut for the background, a few MB.
- `media/web/video/showreel-full.mp4`: the full reel at 1080p with sound.
- `media/web/video/showreel-poster.jpg`: the frame shown instantly while the loop buffers.
- `media/web/photos/<name>-{800,1600,2400}.{webp,jpg}`: responsive photos.

You can pick which part of the reel loops in the background:

```sh
LOOP_START=12 LOOP_DURATION=15 npm run media -- video   # 15 s starting at 0:12
LOOP_DURATION=0 npm run media -- video                   # loop the whole reel
LOOP_HEIGHT=720 npm run media -- video                   # lighter loop
```

Photo names are "slugified". For example, `DEVA FOTO AVION SUR SNOBORD.jpg` becomes `deva-foto-avion-sur-snobord-1600.jpg`, and so on. Those are the names `index.html` refers to.

## 3. Preview locally

```sh
npm run dev              # http://localhost:3000
```

Open it through the server rather than by double-clicking `index.html`, so the video is served the way a real host serves it.

## Why the showreel didn't autoplay right away, and what fixes it

1. **The file was far too big.** `SHOWREELV1.mp4` is about 527 MB. No browser can start that instantly as a background, so the page now plays a short, silent, compressed loop of a few MB instead. The full reel only loads when someone clicks *Watch showreel*.
2. **The MP4 index was probably at the end of the file.** Without `-movflags +faststart`, the browser has to download most of the file before it can show the first frame. Every file the script generates is faststart.
3. **Autoplay rules.** Browsers only autoplay video that is `muted` and, on iOS, `playsinline`. The markup sets `autoplay muted loop playsinline`, and `main.js` also sets `video.muted = true` in JS, calls `play()` explicitly, and retries on the first tap or scroll when a browser still blocks it (for example iOS Low Power Mode).
4. **No black screen while it loads.** The poster is preloaded with high priority and is also the hero's CSS background. The video fades in on its first `playing` event.
5. **Respecting users.** With *Reduce motion* or data-saver turned on, the poster is shown and the loop isn't downloaded. The loop also pauses when it's off-screen or the tab is hidden.

## Hosting notes

- GitHub rejects files over 100 MB. If `showreel-full.mp4` ends up bigger, raise `FULL_CRF` (for example `FULL_CRF=26`). Or host the full reel on Vimeo or YouTube and swap the `<video>` in the `#reel` dialog for their embed.
- Media gets a one-year cache header (`netlify.toml`). If you replace a file but keep its name, rename it or add `?v=2` to the URL.

## To do before launch

- [ ] Replace the placeholder project titles, years and alt text in `index.html`
- [ ] Real bio, email, Instagram and Vimeo links
- [ ] Match the typography and colours to the Claude Design mock-up (`Deva Site.dc.html`)
- [ ] Custom domain and favicon
