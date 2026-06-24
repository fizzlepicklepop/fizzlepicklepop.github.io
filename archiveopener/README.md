# Private Client-Side PWA File Archiver & Extractor

A static, GitHub Pages-ready Progressive Web App that extracts archives entirely in the browser. It uses:

- `fflate` for fast ZIP extraction.
- `libarchive.js` + WebAssembly worker for 7z, RAR, TAR, and other formats.
- A service worker and web app manifest for offline use after the first successful load.
- No analytics, no cookies, no server-side processing.

## Important browser limits

This app reads and extracts archives in browser memory. iOS Safari can terminate a tab when files are very large. For best iOS results, keep archives reasonably sized and close other Safari tabs before extracting.

Encrypted/password-protected archives are not implemented in this UI.

## Local setup

```bash
npm run prepare-static
npm run serve
```

Open the local server URL in your browser. Do not test service workers from `file://`; use `http://localhost` or HTTPS.

## GitHub Pages deployment

1. Run:

```bash
npm run prepare-static
```

2. Commit and push these files, including the generated `vendor/` folder:

```text
index.html
src/app.js
manifest.json
service-worker.js
icons/
vendor/
```

3. Enable GitHub Pages for the repository branch/folder.
4. Open the Pages URL once while online, then on iOS Safari use Share → Add to Home Screen.
5. Launch once from the Home Screen while online so the app shell and WASM worker are cached.

## Split archive behavior

When you select files ending in numeric parts such as:

```text
archive.7z.001
archive.7z.002
archive.7z.003
```

The app groups files by base name, sorts by part number, checks for missing parts, merges them into one Blob, then passes the merged Blob to libarchive.js.

## Privacy model

All archive bytes are read from the local file picker into local browser memory. Downloads are generated with `URL.createObjectURL`. There is no upload endpoint and no tracking code.
