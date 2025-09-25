import { initFFmpeg, transcode } from './ffmpeg-setup.js';

const $ = (id) => document.getElementById(id);
const logEl = $("log");
const statusEl = $("status");
const progressEl = $("progress");
const downloadEl = $("download");
const coiEl = $("coi");

function log(line) {
  logEl.textContent += line + "\n";
  logEl.scrollTop = logEl.scrollHeight;
}

function setStatus(text, cls='') {
  statusEl.textContent = text;
  statusEl.className = 'pill ' + cls;
}

function setCOI() {
  coiEl.textContent = self.crossOriginIsolated ? "true" : "false";
  coiEl.className = 'pill ' + (self.crossOriginIsolated ? 'ok' : 'bad');
}

setCOI();

let ffmpeg;

async function ensureFFmpeg() {
  if (ffmpeg) return ffmpeg;
  setStatus('loading ffmpeg…');
  ffmpeg = await initFFmpeg({
    log: ({type, message}) => log(message),
    progress: (p) => { progressEl.value = p; },
    onStatus: (s) => setStatus(s.msg, s.cls),
  });
  setStatus('ready', 'ok');
  return ffmpeg;
}

$("start").addEventListener("click", async () => {
  const file = $("file").files[0];
  if (!file) { alert("Pick a video first 🙂"); return; }
  downloadEl.style.display = 'none'; downloadEl.removeAttribute('href');

  try {
    await ensureFFmpeg();
    const opts = {
      format: $("format").value,
      crf: parseInt($("crf").value, 10),
      preset: $("preset").value
    };
    setStatus('transcoding…', 'warn');
    log(`Starting transcode: ${file.name} → ${opts.format} (crf=${opts.crf}, preset=${opts.preset})`);

    const { blob, outputName } = await transcode(ffmpeg, file, opts);
    const url = URL.createObjectURL(blob);
    downloadEl.href = url;
    downloadEl.download = outputName;
    downloadEl.textContent = `Download ${outputName}`;
    downloadEl.style.display = 'inline-block';
    setStatus('done', 'ok');
    log('✅ Done');
  } catch (err) {
    console.error(err);
    setStatus('error', 'bad');
    log('❌ ' + (err && err.message ? err.message : String(err)));
  }
});
