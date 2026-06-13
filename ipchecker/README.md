# VPN IP Check PWA

A lightweight, fully client-side PWA for checking the public IP geolocation visible to websites. It is designed for GitHub Pages and requires no backend, build step, Node modules, or secrets.

## Files

- `index.html` - single-page app UI and logic
- `sw.js` - real same-origin Service Worker for iOS Safari and Chrome installability
- `manifest.webmanifest` - PWA manifest for Chrome, Android, and supported Safari behavior
- `icons/` - PNG app icons, including Apple touch icon

## Deploy to GitHub Pages

1. Upload the contents of this folder to the root of a GitHub repository.
2. In GitHub, open Settings -> Pages.
3. Set the source branch/folder and save.
4. Open the HTTPS GitHub Pages URL.

## Install

- iOS Safari: open the page, tap Share, then Add to Home Screen.
- Chrome on Windows: open the page and use the install icon in the address bar or Chrome menu.

## Notes

- The app uses public HTTPS IP geolocation APIs: `ipapi.co` first, then `ipwho.is` as failover.
- It intentionally avoids the free `ip-api.com` endpoint because it is HTTP-only and will be blocked on HTTPS GitHub Pages.
- IP geolocation is approximate and does not use GPS.
- The IP lookup API responses are never cached by the Service Worker, so Re-check remains fresh after VPN changes.
