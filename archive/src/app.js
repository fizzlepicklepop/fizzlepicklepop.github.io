import { unzip } from '../vendor/fflate.module.js';
import { Archive } from '../vendor/libarchive.js/main.js';

Archive.init({
  workerUrl: './vendor/libarchive.js/dist/worker-bundle.js'
});

const input = document.querySelector('#file-input');
const dropZone = document.querySelector('#drop-zone');
const extractBtn = document.querySelector('#extract-btn');
const clearBtn = document.querySelector('#clear-btn');
const statusEl = document.querySelector('#status');
const resultsEl = document.querySelector('#results');
const countBadge = document.querySelector('#count-badge');
const installHelpBtn = document.querySelector('#install-help-btn');
const installPanel = document.querySelector('#install-panel');

let selectedFiles = [];
let extractedItems = [];
let objectUrls = [];

const SPLIT_PART_RE = /^(.*)\.(\d{3,})$/i;
const ZIP_RE = /\.zip$/i;

function setStatus(message, tone = 'neutral') {
  const tones = {
    neutral: 'bg-slate-900 text-slate-300',
    good: 'bg-emerald-950/60 text-emerald-100',
    warn: 'bg-amber-950/60 text-amber-100',
    bad: 'bg-rose-950/60 text-rose-100'
  };
  statusEl.className = `mt-5 rounded-2xl p-4 text-sm leading-6 ${tones[tone] || tones.neutral}`;
  statusEl.textContent = message;
}

function formatBytes(bytes = 0) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function revokeUrls() {
  for (const url of objectUrls) URL.revokeObjectURL(url);
  objectUrls = [];
}

function clearAll() {
  revokeUrls();
  selectedFiles = [];
  extractedItems = [];
  input.value = '';
  resultsEl.innerHTML = '';
  countBadge.textContent = '0 files';
  clearBtn.disabled = true;
  extractBtn.disabled = false;
  setStatus('Ready. Files never leave this device.');
}

function updateSelection(files) {
  selectedFiles = Array.from(files || []);
  clearBtn.disabled = selectedFiles.length === 0 && extractedItems.length === 0;
  const total = selectedFiles.reduce((sum, file) => sum + file.size, 0);
  setStatus(`${selectedFiles.length} file(s) selected, ${formatBytes(total)} total. Tap Extract locally to begin.`);
}

function groupSelectedFiles(files) {
  const splitGroups = new Map();
  const consumed = new Set();
  const standalone = [];

  for (const file of files) {
    const match = file.name.match(SPLIT_PART_RE);
    if (!match) continue;
    const [, baseName, part] = match;
    if (!splitGroups.has(baseName)) splitGroups.set(baseName, []);
    splitGroups.get(baseName).push({ file, part: Number(part) });
    consumed.add(file);
  }

  for (const file of files) {
    if (!consumed.has(file)) standalone.push({ name: file.name, blob: file, source: 'single' });
  }

  const merged = [];
  for (const [baseName, parts] of splitGroups) {
    parts.sort((a, b) => a.part - b.part || a.file.name.localeCompare(b.file.name));
    const expected = parts.map(p => p.part);
    for (let i = 1; i < expected.length; i += 1) {
      if (expected[i] !== expected[i - 1] + 1) {
        throw new Error(`Split archive ${baseName} is missing a part between .${String(expected[i - 1]).padStart(3, '0')} and .${String(expected[i]).padStart(3, '0')}.`);
      }
    }
    if (parts[0].part !== 1) throw new Error(`Split archive ${baseName} must include the .001 part.`);
    merged.push({
      name: baseName,
      blob: new File(parts.map(p => p.file), baseName, { type: 'application/octet-stream' }),
      source: `merged ${parts.length} parts`
    });
  }

  return [...merged, ...standalone];
}

function flattenLibarchiveTree(node, prefix = '') {
  const out = [];
  for (const [name, value] of Object.entries(node || {})) {
    const path = prefix ? `${prefix}/${name}` : name;
    if (value instanceof Blob) {
      out.push({ path, file: value });
    } else if (value && typeof value === 'object') {
      out.push(...flattenLibarchiveTree(value, path));
    }
  }
  return out;
}

async function extractZipWithFflate(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const entries = await new Promise((resolve, reject) => {
    unzip(bytes, {}, (err, data) => err ? reject(err) : resolve(data));
  });

  return Object.entries(entries)
    .filter(([path]) => !path.endsWith('/'))
    .map(([path, data]) => ({
      path,
      file: new File([data], path.split('/').pop() || 'file', { type: 'application/octet-stream' })
    }));
}

async function extractWithLibarchive(blob) {
  const archive = await Archive.open(blob);
  const tree = await archive.extractFiles();
  return flattenLibarchiveTree(tree);
}

function renderResults(items) {
  revokeUrls();
  resultsEl.innerHTML = '';
  countBadge.textContent = `${items.length} file${items.length === 1 ? '' : 's'}`;

  if (!items.length) {
    resultsEl.innerHTML = '<p class="rounded-2xl bg-slate-900 p-4 text-sm text-slate-400">No files were extracted.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const item of items) {
    const url = URL.createObjectURL(item.file);
    objectUrls.push(url);

    const row = document.createElement('a');
    row.href = url;
    row.download = item.path.split('/').pop() || 'download';
    row.className = 'block rounded-2xl bg-slate-900 p-4 ring-1 ring-white/10 transition hover:bg-slate-800';
    row.innerHTML = `
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <p class="truncate font-semibold text-slate-100">${escapeHtml(item.path)}</p>
          <p class="mt-1 text-xs text-slate-400">${escapeHtml(item.archiveName)} · ${escapeHtml(item.method)}</p>
        </div>
        <span class="shrink-0 rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">${formatBytes(item.file.size)}</span>
      </div>`;
    fragment.appendChild(row);
  }
  resultsEl.appendChild(fragment);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function extractSelected() {
  if (!selectedFiles.length) {
    setStatus('Choose at least one archive file first.', 'warn');
    return;
  }

  extractBtn.disabled = true;
  clearBtn.disabled = true;
  resultsEl.innerHTML = '';
  extractedItems = [];

  try {
    const archives = groupSelectedFiles(selectedFiles);
    setStatus(`Prepared ${archives.length} archive input(s). Extracting locally...`);

    for (const archiveInput of archives) {
      const useFastZip = ZIP_RE.test(archiveInput.name);
      setStatus(`Extracting ${archiveInput.name} (${archiveInput.source}) using ${useFastZip ? 'fflate' : 'libarchive.js'}...`);

      const entries = useFastZip
        ? await extractZipWithFflate(archiveInput.blob)
        : await extractWithLibarchive(archiveInput.blob);

      extractedItems.push(...entries.map(entry => ({
        ...entry,
        archiveName: archiveInput.name,
        method: useFastZip ? 'ZIP via fflate' : 'WASM via libarchive.js'
      })));
    }

    renderResults(extractedItems);
    setStatus(`Done. Extracted ${extractedItems.length} file(s). Tap any file below to download it locally.`, 'good');
  } catch (error) {
    console.error(error);
    setStatus(error?.message || 'Extraction failed. The archive may be encrypted, corrupted, incomplete, or too large for browser memory.', 'bad');
  } finally {
    extractBtn.disabled = false;
    clearBtn.disabled = false;
  }
}

input.addEventListener('change', event => updateSelection(event.target.files));
extractBtn.addEventListener('click', extractSelected);
clearBtn.addEventListener('click', clearAll);
installHelpBtn.addEventListener('click', () => installPanel.classList.toggle('hidden'));

for (const eventName of ['dragenter', 'dragover']) {
  dropZone.addEventListener(eventName, event => {
    event.preventDefault();
    dropZone.classList.add('border-sky-400', 'bg-slate-900');
  });
}
for (const eventName of ['dragleave', 'drop']) {
  dropZone.addEventListener(eventName, event => {
    event.preventDefault();
    dropZone.classList.remove('border-sky-400', 'bg-slate-900');
  });
}
dropZone.addEventListener('drop', event => updateSelection(event.dataTransfer.files));

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(error => {
      console.warn('Service worker registration failed:', error);
      setStatus('App works online, but offline caching failed in this browser/session.', 'warn');
    });
  });
}
