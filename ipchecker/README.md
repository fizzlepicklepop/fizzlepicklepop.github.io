# VPN IP Check PWA

A fully client-side Progressive Web App for checking the public IP address, approximate IP geolocation, and ISP/network owner that websites can currently see. It uses IP geolocation only, not GPS.

## Files

- `index.html` - app UI, CSS, Leaflet map, and IP lookup logic
- `sw.js` - same-origin Service Worker for iOS Safari and Chrome installability
- `manifest.webmanifest` - PWA manifest for Chrome/Android/desktop install prompts
- `icons/` - PNG icons for iOS Safari and Chromium-based browsers

## Important testing note

Do not test the final installable PWA by opening `index.html` directly as a `file://` URL. Service Workers and installability require a secure web origin such as HTTPS or localhost. Some IP APIs and browser privacy protections also behave differently on `file://` pages.

Use one of these instead:

1. Publish the folder to GitHub Pages over HTTPS.
2. Or test locally with a simple static server, for example:
   - Python: `python -m http.server 8000`
   - Then open `http://localhost:8000/`

## Deploy to GitHub Pages

1. Create a GitHub repository.
2. Upload all files from this folder to the repository root.
3. Enable GitHub Pages in repository settings.
4. Open the generated HTTPS URL.

## iPhone / iPad install

1. Open the GitHub Pages HTTPS URL in Safari.
2. Tap Share.
3. Tap Add to Home Screen.

## Chrome on Windows install

1. Open the GitHub Pages HTTPS URL in Chrome or Edge.
2. Use the install button in the address bar, or open the browser menu and choose Install app.

## Reliability details

The app tries multiple HTTPS-capable IP geolocation providers in sequence:

1. geojs.io
2. ipwho.is
3. ipapi.co
4. ip.sb

The Service Worker intentionally does not cache IP API responses, so the Re-check button fetches fresh data after VPN changes.


## Latest UI update
- Removed the informational pill from the map.
- Tightened spacing and sizing for a more compact mobile layout.
- Reduced map height on phones and shrank the floating re-check button footprint.


Compact build: removed large title/status header; map is first on mobile portrait.
