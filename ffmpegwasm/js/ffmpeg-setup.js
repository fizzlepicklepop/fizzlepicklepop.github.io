// Minimal ffmpeg.wasm bootstrap for GitHub Pages with COI SW.
// IMPORTANT: You must self-host the ffmpeg core files in ./vendor/ffmpeg/
//   - ffmpeg-core.js
//   - ffmpeg-core.wasm
//   - ffmpeg-core.worker.js
// Use the *multi-threaded* build and keep them same-origin.

// This file uses the modern FFmpeg class from @ffmpeg/ffmpeg-like builds.
// To avoid a bundler, we import the UMD script dynamically from ./vendor (self-hosted).
// If you're pulling from npm locally, copy node_modules/@ffmpeg/core-mt/dist/* to /vendor/ffmpeg.

const CORE_BASE = './vendor/ffmpeg/ffmpeg-core'; // without extension

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

export async function initFFmpeg({ log, progress, onStatus }) {
  // Dynamically load the FFmpeg wrapper (UMD) if not already present.
  if (!('FFmpeg' in window)) {
    // You can replace this with a local copy of the wrapper if needed.
    // For simplicity we rely on the class being available via import shim below.
  }

  // Minimal loader shim: we fetch the core scripts directly.
  // We assume availability of the global 'FFmpeg' after importing the wrapper.
  // Provide a tiny wrapper that exposes the same API shape we need.
  const { FFmpeg } = await importFFmpegWrapper();

  const ffmpeg = new FFmpeg();
  const coreURL = CORE_BASE + '.js'; // will resolve .wasm and .worker.js relative to this
  onStatus && onStatus({msg: 'loading core…', cls: 'warn'});
  await ffmpeg.load({
    coreURL,
    // Let logs bubble up to UI
    logger: log ? ({ type, message }) => log({type, message}) : undefined,
    // Progress uses ratio 0..1
    progress: progress ? ({ progress: p }) => progress(p) : undefined,
  });

  // Give the worker a beat to settle before first run (Firefox quirk guards)
  await sleep(10);
  return ffmpeg;
}

// Transcode convenience: H.264/AAC (mp4) or VP9/Opus (webm) depending on format
export async function transcode(ffmpeg, file, { format='mp4', crf=23, preset='medium' } = {}) {
  const inputName = file.name;
  const data = new Uint8Array(await file.arrayBuffer());
  await ffmpeg.writeFile(inputName, data);

  let outputName, args;
  if (format === 'webm') {
    outputName = replaceExt(inputName, 'webm');
    args = [
      '-i', inputName,
      '-c:v', 'libvpx-vp9',
      '-b:v', '0',
      '-crf', String(crf),
      '-deadline', 'good',
      '-cpu-used', presetToCpuUsed(preset),
      '-c:a', 'libopus',
      '-b:a', '128k',
      outputName
    ];
  } else {
    outputName = replaceExt(inputName, format === 'mkv' ? 'mkv' : 'mp4');
    args = [
      '-i', inputName,
      '-c:v', 'libx264',
      '-preset', preset,
      '-crf', String(crf),
      '-c:a', 'aac',
      '-b:a', '128k',
      outputName
    ];
  }

  await ffmpeg.exec(args);
  const out = await ffmpeg.readFile(outputName);
  // Clean up to free memory
  try { await ffmpeg.deleteFile(inputName); } catch {}
  try { await ffmpeg.deleteFile(outputName); } catch {}

  const blob = new Blob([out], { type: mimeFor(outputName) });
  return { blob, outputName };
}

function presetToCpuUsed(preset) {
  // Map x264-ish presets to VP9 cpu-used (0=best, 5+ faster).
  const map = { 'slower': 0, 'slow': 1, 'medium': 2, 'fast': 3, 'faster': 4, 'veryfast': 5 };
  return String(map[preset] ?? 2);
}

function replaceExt(name, ext) {
  const i = name.lastIndexOf('.');
  return (i === -1 ? name : name.slice(0, i)) + '.' + ext;
}

function mimeFor(name) {
  if (name.endsWith('.mp4')) return 'video/mp4';
  if (name.endsWith('.webm')) return 'video/webm';
  if (name.endsWith('.mkv')) return 'video/x-matroska';
  return 'application/octet-stream';
}

// Dynamically import the tiny wrapper that exposes window.FFmpeg if needed.
// In many distributions, FFmpeg wrapper is an ES module; here we inline a minimal wrapper
// that forwards to a worker-backed implementation exposed by the core script.
async function importFFmpegWrapper() {
  // Minimal wrapper class that matches @ffmpeg/ffmpeg's FFmpeg interface enough for this demo.
  // It delegates to the core script loaded via coreURL.
  class FFmpeg {
    constructor() {
      this._core = null;
      this._logger = null;
      this._progress = null;
    }
    async load({ coreURL, logger, progress }) {
      this._logger = logger;
      this._progress = progress;
      // Load core script; it will register global createFFmpegCore if needed.
      await import(coreURL);
      // Initialize core with multi-threading (handled by the core script).
      const coreFactory = self.createFFmpegCore || self.FFmpegWASM || self.Module;
      if (!coreFactory) throw new Error('FFmpeg core factory not found. Ensure you copied ffmpeg-core.* files.');
      // The actual WASM module gets initialized lazily by the worker when you call exec/writeFile/etc.
      this._core = new self.FFmpegWASMCore(); // some builds expose a constructor; fallback to proxy
      // Fallback noop: we won't actually use _core directly in this minimal wrapper.
      return;
    }
    async writeFile(name, data) {
      return self.ffmpegWriteFile ? self.ffmpegWriteFile(name, data) : self.FS.writeFile(name, data);
    }
    async readFile(name) {
      return self.ffmpegReadFile ? self.ffmpegReadFile(name) : self.FS.readFile(name);
    }
    async deleteFile(name) {
      if (self.ffmpegDeleteFile) return self.ffmpegDeleteFile(name);
      try { self.FS.unlink(name); } catch {}
    }
    async exec(args) {
      if (typeof self.ffmpegExec === 'function') {
        return self.ffmpegExec(args, this._logger, this._progress);
      }
      // As a last resort, try to call a global run function (depends on core build).
      if (typeof self.callMain === 'function') {
        // crude progress: none
        this._logger && this._logger({ type: 'info', message: 'Running ffmpeg ' + args.join(' ') });
        return self.callMain(args);
      }
      throw new Error('No ffmpeg exec binding found. Use a core that exposes ffmpegExec/FFmpeg API.');
    }
  }
  return { FFmpeg };
}
