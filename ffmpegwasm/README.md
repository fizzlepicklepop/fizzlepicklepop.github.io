# ffmpeg.wasm on GitHub Pages (multi-threaded via COOP/COEP SW)

This is a minimal, static, client-side setup you can push to GitHub Pages to run ffmpeg.wasm with multi-threading.

## Why the service worker?
GitHub Pages can't set response headers. To enable `SharedArrayBuffer` for threaded WASM, the page must be **cross-origin isolated**:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

`coi-serviceworker.min.js` injects those headers at runtime.

## Quick start
1. **Copy the ffmpeg core files** (multi-threaded build) into `vendor/ffmpeg/`:
   - `ffmpeg-core.js`
   - `ffmpeg-core.wasm`
   - `ffmpeg-core.worker.js`

   Keep them same-origin (do **not** load from a CDN under COEP).

2. Commit & push to the branch that Pages serves (usually `gh-pages` or `/docs`).
3. Open your site; on first load the SW registers and reloads once. You should see `Cross-origin isolated: true` at the bottom.

## Notes
- This demo avoids external fonts/scripts to keep COEP happy.
- The UI exposes CRF + preset for simple H.264/VP9 encodes. Tweak `transcode()` in `js/ffmpeg-setup.js` to match your Linux script’s logic.
- Large/long 4K sources will be slow (software encoders). Consider hybrids with WebCodecs for speed if needed.
