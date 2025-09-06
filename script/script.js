document.addEventListener('DOMContentLoaded', function () {
  initVideoProgressBars();          // sets up all [data-vp] progress bars
  initNoZoomAndHideKeyboard();      // prevents zoom + hides keyboard on scroll
});

/* ==============================
   Utilities
============================== */
function escapeHTML(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || "";
}
function setImg(id, src, alt) {
  const el = document.getElementById(id);
  if (!el) return;
  el.src = src || "";
  el.alt = alt || "";
}

/* ==============================
   Preline Overlay helpers
============================== */
function toggleGroups(type) {
  document.querySelectorAll('#song-action-modal [data-type]').forEach(g => {
    g.classList.toggle('hidden', g.getAttribute('data-type') !== type);
  });
}
function openModal() {
  if (window.HSOverlay?.open) HSOverlay.open('#song-action-modal');
  else document.querySelector('#song-action-modal')?.classList.remove('hidden');
}
function closeModal() {
  if (window.HSOverlay?.close) HSOverlay.close('#song-action-modal');
  else document.querySelector('#song-action-modal')?.classList.add('hidden');
}
function setPayload(payload) {
  const modal = document.getElementById('song-action-modal');
  modal.dataset.payload = JSON.stringify(payload || {});
}
function getPayload() {
  const modal = document.getElementById('song-action-modal');
  try { return JSON.parse(modal?.dataset.payload || '{}'); } catch { return {}; }
}

/* ==============================
   Show Action Modal (unified)
============================== */
function showActionModal({ type, title, singer, thumbnail, songId, youtubeId, position }) {
  toggleGroups(type);

  const displayTitle = singer ? `${title} - ${singer}` : (title || '');
  setText('song-action-title', displayTitle);
  setImg('song-action-thumb', thumbnail || '', `Ảnh nhỏ: ${displayTitle}`);

  setPayload({ type, title, singer, thumbnail, songId, youtubeId, position });
  openModal();
}

/* ==============================
   Renderers (Search, Queue, Now Playing)
============================== */
function buildResultCard(item) {
  const title  = escapeHTML(item?.title);
  const singer = escapeHTML(item?.singer);
  const thumbnailRaw = item?.thumbnail;
  const thumbnail    = thumbnailRaw ? escapeHTML(thumbnailRaw) : "images/default_thumbnail.jpg";

  return `
  <div class="result-card flex flex-row md:flex-col bg-white pb-2 md:pb-0 md:border md:border-gray-200 md:shadow-2xs md:rounded-md overflow-hidden" data-song
       data-songid="${escapeHTML(item.songId)}"
       data-youtubeid="${escapeHTML(item.youtubeId || '')}"
       data-title="${escapeHTML(item.title)}"
       data-singer="${escapeHTML(item.singer)}"
       data-thumbnail="${escapeHTML(item.thumbnail)}">
    <div class="basis-1/3 md:basis-full">
      <img class="w-full h-auto rounded-md md:rounded-b-none aspect-video object-cover object-center"
           src="${thumbnail}"
           alt="Ảnh nhỏ: ${title} - ${singer}"
           loading="lazy" />
    </div>
    <div class="basis-2/3 md:basis-full pl-2 md:p-4">
      <h3 class="md:text-lg font-semibold text-gray-800 line-clamp-2 uppercase">${title}</h3>
      <p class="text-sm md:text-base mt-0.5 md:mt-1 text-gray-700 line-clamp-1">${singer}</p>
    </div>
  </div>`;
}
function renderSearchResults(containerId, results) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!Array.isArray(results) || results.length === 0) {
    el.innerHTML = `<div class="col-span-full text-center text-gray-700 text-lg py-6">Không có kết quả.</div>`;
    return;
  }
  el.innerHTML = results.map(buildResultCard).join("");
}

function buildQueueCard(item) {
  console.log(item);
  const title  = escapeHTML(item?.title);
  const singer = escapeHTML(item?.singer);
  const thumbnailRaw = item?.thumbnail;
  const thumbnail    = thumbnailRaw ? escapeHTML(thumbnailRaw) : "images/default_thumbnail.jpg";

  return `
  <div class="queue-card flex bg-white py-2 overflow-hidden cursor-pointer" data-queue
       data-songid="${escapeHTML(item.songId)}"
       data-youtubeid="${escapeHTML(item.youtubeId || '')}"
       data-title="${escapeHTML(item.title)}"
       data-singer="${escapeHTML(item.singer)}"
       data-thumbnail="${escapeHTML(item.thumbnail)}">
    <div class="basis-1/3">
      <img class="w-full h-auto rounded-md aspect-video object-cover object-center"
           src="${thumbnail}" alt="Ảnh nhỏ: ${title} - ${singer}" loading="lazy">
    </div>
    <div class="basis-2/3 pl-2">
      <h3 class="font-semibold text-gray-800 line-clamp-2 uppercase">${title}</h3>
      <p class="text-sm mt-0.5 text-gray-700 line-clamp-1">${singer}</p>
    </div>
  </div>`;
}
function renderListQueue(className, queue) {
  console.log(queue);
  const html = queue.map(buildQueueCard).join("");
  document.querySelectorAll(`.${className}`).forEach(el => { el.innerHTML = html; });
}

function buildPlayingCard(item) {
  if (!item) return ``;
  const title = escapeHTML(item.title);
  const singer = escapeHTML(item.singer);
  const thumbnailRaw = item?.thumbnail;
  const thumbnail    = thumbnailRaw ? escapeHTML(thumbnailRaw) : "images/default_thumbnail.jpg";

  return `
    <div class="relative">
      <div class="absolute top-0 left-0 w-full py-1 px-2 bg-black/50 text-white text-center font-medium">
        <span class="line-clamp-2 uppercase">${title} - ${singer}</span>
      </div>
      <div class="aspect-video overflow-hidden">
        <img class="w-full h-full object-cover object-center"
             src="${thumbnail}"
             alt="Ảnh nhỏ: ${title} - ${singer}"
             loading="lazy">
      </div>
    </div>`;
}
function renderPlayingCard(className, item) {
  const html = buildPlayingCard(item);
  document.querySelectorAll(`.${className}`).forEach(el => { el.innerHTML = html; });
}

function updateUpNextCount(count) {
  document.querySelectorAll(".upNextCount").forEach(el => { el.textContent = String(count); });
}

/* ==============================
   Event delegation (open modal from Search & Queue)
============================== */
// SEARCH results container
document.getElementById('searchResultsGrid')?.addEventListener('click', (e) => {
  const card = e.target.closest('[data-song]');
  if (!card) return;
  showActionModal({
    type: 'search',
    title:      card.dataset.title,
    singer:     card.dataset.singer,
    thumbnail:  card.dataset.thumbnail,
    songId:         card.dataset.songid,
    youtubeId: card.dataset.youtubeid
  });
});

// QUEUE lists (support many places)
document.querySelectorAll('.upNextList').forEach(list => {
  list.addEventListener('click', (e) => {
    const card = e.target.closest('[data-queue]');
    if (!card) return;
    const position = Array.from(list.querySelectorAll('[data-queue]')).indexOf(card);
    showActionModal({
      type: 'queue',
      title:      card.dataset.title,
      singer:     card.dataset.singer,
      thumbnail:  card.dataset.thumbnail,
      songId:         card.dataset.songid,
      youtubeId:  card.dataset.youtubeid,
      position
    });
  });
});

/* ==============================
   Bind modal action buttons (use payload from dataset)
============================== */
(function bindSongActions(){
  const withPayload = (fn) => () => fn(getPayload() || {});

  document.getElementById('song-action-choose')?.addEventListener('click', withPayload(p => {
    // ví dụ: chọn bài từ kết quả search
    send('res', { youtubeId: p.youtubeId, songId: p.songId, title: p.title, singer: p.singer, thumbnail: p.thumbnail });
    closeModal();
  }));

  document.getElementById('song-action-priority')?.addEventListener('click', withPayload(p => {
    // ví dụ: ưu tiên phát từ search
    send('res_1st', { youtubeId: p.youtubeId, songId: p.songId, title: p.title, singer: p.singer, thumbnail: p.thumbnail });
    closeModal();
  }));

  document.getElementById('song-action-play')?.addEventListener('click', withPayload(p => {
    // ví dụ: ưu tiên phát bài trong queue
    send('queue_move_first', { position: p.position });
    closeModal();
  }));

  document.getElementById('song-action-move')?.addEventListener('click', withPayload(p => {
    // ví dụ: đẩy lên trong queue
    send('queue_move_up', { position: p.position });
    closeModal();
  }));

  document.getElementById('song-action-delete')?.addEventListener('click', withPayload(p => {
    // ví dụ: xóa khỏi queue
    send('queue_remove', { position: p.position });
    closeModal();
  }));
})();

/* ==============================
   Video progress bars (giữ nguyên bản của bạn)
============================== */
function initVideoProgressBars(scope = document) {
  function fmt(sec) {
    sec = Math.max(0, sec || 0);
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return m + ":" + String(s).padStart(2, "0");
  }
  function secondsAtX(range, clientX) {
    const rect = range.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const ratio = rect.width ? x / rect.width : 0;
    return ratio * parseFloat(range.max || 0);
  }
  function setupVP(root) {
    const range = root.querySelector('[data-vp-range]');
    const tip   = root.querySelector('[data-vp-tip]');
    const wrap  = root.querySelector('[data-vp-wrap]');
    const curEl = root.querySelector('[data-vp-current]');
    const durEl = root.querySelector('[data-vp-duration]');

    let duration = parseFloat(root.dataset.duration || '0');
    const videoSel = root.dataset.video;
    let video = videoSel ? document.querySelector(videoSel) : null;

    function setDuration(d) {
      duration = Math.max(0, d || 0);
      if (range) range.max = duration;
      if (durEl) durEl.textContent = fmt(duration);
      update(+range.value || 0);
    }
    function update(val) {
      const pct = duration ? (val / duration) * 100 : 0;
      if (range) range.style.setProperty('--pct', pct + '%');
      if (curEl) curEl.textContent = fmt(val);
    }

    if (wrap) {
      wrap.addEventListener('pointerdown', (e) => {
        if (!range) return;
        if (e.target !== range) {
          const sec = secondsAtX(range, e.clientX);
          range.value = sec;
          update(sec);
          if (video) video.currentTime = sec;
        }
      }, { capture: true });

      wrap.addEventListener('pointerenter', () => tip && (tip.style.opacity = '1'));
      wrap.addEventListener('pointerleave', () => tip && (tip.style.opacity = '0'));
      wrap.addEventListener('pointermove', (e) => {
        if (!tip || !range) return;
        const rect = range.getBoundingClientRect();
        const sec = secondsAtX(range, e.clientX);
        tip.textContent = fmt(sec);
        tip.style.left = Math.min(Math.max(e.clientX - rect.left, 0), rect.width) + 'px';
      });
    }

    if (range) {
      range.addEventListener('input', () => {
        const val = +range.value;
        update(val);
        if (video) video.currentTime = val;
      });
    }

    if (video) {
      if (!duration) {
        if (video.readyState >= 1) setDuration(video.duration);
        video.addEventListener('loadedmetadata', () => setDuration(video.duration), { once: true });
      } else {
        setDuration(duration);
      }
      video.addEventListener('timeupdate', () => {
        if (!range) return;
        range.value = video.currentTime;
        update(video.currentTime);
      });
    } else {
      setDuration(duration || parseFloat(range?.max || '0') || 0);
    }
  }
  scope.querySelectorAll('[data-vp]').forEach(setupVP);
}

/* ==============================
   UI Guards (no zoom + hide keyboard)
============================== */
let __uiGuardsBound = false;
function initNoZoomAndHideKeyboard() {
  if (__uiGuardsBound) return;
  __uiGuardsBound = true;

  ['gesturestart', 'gesturechange', 'gestureend'].forEach(evt => {
    document.addEventListener(evt, (e) => e.preventDefault(), { passive: false });
  });
  document.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) e.preventDefault();
  }, { passive: false });

  let lastTouchEnd = 0;
  const isInteractive = (el) =>
    !!el.closest('input, textarea, select, button, a, label, [role="button"], [contenteditable], video, audio');

  document.addEventListener('touchend', (e) => {
    if (e.target.closest('[data-vp-wrap]') || isInteractive(e.target)) return;
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });

  function isEditable(el) {
    if (!el || el.disabled || el.readOnly) return false;
    if (el.isContentEditable) return true;
    const tag = (el.tagName || '').toLowerCase();
    if (tag === 'textarea') return true;
    if (tag === 'input') {
      const t = (el.type || '').toLowerCase();
      return !['button', 'submit', 'reset', 'checkbox', 'radio', 'range', 'file', 'image', 'color'].includes(t);
    }
    return false;
  }
  function blurActive() {
    const ae = document.activeElement;
    if (isEditable(ae)) setTimeout(() => ae.blur(), 0);
  }

  let startY = 0;
  let shouldBlurOnMove = false;
  const THRESHOLD = 8;

  window.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
    shouldBlurOnMove = !isEditable(e.target);
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!shouldBlurOnMove) return;
    const dy = Math.abs(e.touches[0].clientY - startY);
    if (dy > THRESHOLD) blurActive();
  }, { passive: true });

  window.addEventListener('scroll', () => { if (isEditable(document.activeElement)) blurActive(); }, { passive: true });
  if (window.visualViewport) {
    visualViewport.addEventListener('scroll', () => { if (isEditable(document.activeElement)) blurActive(); }, { passive: true });
  }
  window.addEventListener('orientationchange', blurActive);
}

const playPauseButton = document.getElementById('playPauseButton');
const playPauseIcon = document.getElementById('playPauseIcon');
const playPauseText = document.getElementById('playPauseText');

function updatePlayPauseUI() {
  if (isPlaying) {
    playPauseIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                            class="size-5 flex-none" viewBox="0 0 16 16">
                            <path
                                d="M6 3.5a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5m4 0a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5" />
                        </svg>`;
    playPauseText.textContent = "DỪNG";
  } else {
    playPauseIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="size-5 flex-none" viewBox="0 0 16 16">
  <path d="M10.804 8 5 4.633v6.734zm.792-.696a.802.802 0 0 1 0 1.392l-6.363 3.692C4.713 12.69 4 12.345 4 11.692V4.308c0-.653.713-.998 1.233-.696z"/>
</svg>`;
    playPauseText.textContent = "PHÁT";
  }
}

/* ==============================
   SIGNALR PART (giữ theo mẫu bạn, chỉ rút gọn phần log)
============================== */
const RECONNECT_DELAYS = [0, 1500, 3000, 5000, 10000, 15000, 30000];
const ENABLE_WAKE_LOCK = true;

const url = new URL(location.href);
const sid = (url.searchParams.get('sid') || '').trim();

let conn = null;
let wakeLock = null;
let connectInProgress = false;
let pending = [];

let isPlaying = false;
let currentAudioTrack = 0;
let currentPositionMs = -1;
let durationMs = -1;
let didFirstSearch = false;

function ts() { return new Date().toLocaleTimeString(); }
function logLine(text) { console.log(text); }
function logJson(tag, obj) { console.log(tag, obj); }
const rid = () => (crypto.randomUUID && crypto.randomUUID()) || (Date.now() + '-' + Math.random());

async function requestWakeLockIfVisible() {
  if (!ENABLE_WAKE_LOCK) return;
  if (document.visibilityState !== 'visible') return;
  try {
    if ('wakeLock' in navigator) {
      if (wakeLock) return;
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        logLine('WakeLock released');
        wakeLock = null;
        if (document.visibilityState === 'visible') requestWakeLockIfVisible();
      });
      logLine('WakeLock acquired');
    } else {
      logLine('WakeLock API không hỗ trợ');
    }
  } catch (e) {
    if (document.visibilityState === 'visible') logLine('WakeLock error: ' + e);
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') requestWakeLockIfVisible();
});

function createConnection(preferWS) {
  const builder = new signalR.HubConnectionBuilder().withAutomaticReconnect(RECONNECT_DELAYS);
  if (preferWS) builder.withUrl("http://192.168.1.33:5096/hubs/remote", { transport: signalR.HttpTransportType.WebSockets, skipNegotiation: true });
  else builder.withUrl("http://192.168.1.33:5096/hubs/remote");
  const c = builder.build();
  c.serverTimeoutInMilliseconds = 60_000;
  c.keepAliveIntervalInMilliseconds = 15_000;
  return c;
}

async function startConnection(preferWS = true) {
  conn = createConnection(preferWS);

  conn.on("OnMessage", (msg) => {
    logJson("OnMessage", msg);
    if (msg.kind === "evt") {
      isPlaying = msg.data.isPlaying;
      updatePlayPauseUI();
      currentAudioTrack = msg.data.currentAudioTrack;
      currentPositionMs = msg.data.currentPositionMs;
      durationMs = msg.data.durationMs;

      if (msg.op === 'search_result') {
        const results = msg.data.searchResult || [];
        renderSearchResults("searchResultsGrid", results);
      } else if (msg.op === 'queue_changed' || msg.op === 'state_snapshot') {
        const data = msg.data || {};
        const upNext = data.queue || [];
        const count = Number.isFinite(data.queueCount) ? data.queueCount : upNext.length;
        const current = data.currentSong;

        updateUpNextCount(count);
        renderPlayingCard("nowPlaying", current);
        console.log(upNext);
        renderListQueue("upNextList", upNext);
      }

      if (!didFirstSearch) {
        didFirstSearch = true;
        const keyword = 'karaoke';
        const m = { v: 1, sid, rid: rid(), kind: "query", op: "search", data: { keyword } };
        if (!conn || conn.state !== "Connected") { pending.push(m); return; }
        conn.invoke("SendFromRemote", m).catch(e => logLine("Search error: " + e));
      }
    }
  });

  conn.onreconnecting(() => logLine("onreconnecting"));
  conn.onreconnected(async () => {
    logLine("onreconnected → rejoin group");
    try {
      await conn.invoke("JoinRemote", sid);
      if (pending.length) {
        const batch = pending; pending = [];
        for (const m of batch) conn.invoke("SendFromRemote", m).catch(e => logLine("Resend error: " + e));
      }
    } catch (e) { logLine("Rejoin error: " + e); }
  });
  conn.onclose(() => { logLine("onclose → restart in 1.5s"); setTimeout(() => connectSequence(), 1500); });

  try { await conn.start(); }
  catch (e) {
    logLine("Start failed: " + e);
    if (preferWS) { await delay(500); return startConnection(false); }
    else { throw e; }
  }
}

async function join() {
  const res = await conn.invoke("JoinRemote", sid);
  if (!res?.ok) {
    logJson("JoinRemoteResult", res);
    return;
  }
  logJson("JoinRemoteResult", res);
}

async function connectSequence() {
  if (connectInProgress) return;
  connectInProgress = true;
  try {
    await requestWakeLockIfVisible();
    await startConnection(true);
    await join();
  } finally {
    connectInProgress = false;
  }
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function send(op, data = {}) {
  const m = { v: 1, sid, rid: rid(), kind: "cmd", op, data };
  logJson("Send", m);
  if (!conn || conn.state !== "Connected") { pending.push(m); return; }
  conn.invoke("SendFromRemote", m).catch(e => logLine("Send error: " + e));
}

/* Search helpers */
let tSuggest = 0;
function debouncedSuggest(q) {
  clearTimeout(tSuggest);
  tSuggest = setTimeout(() => {
    if (!q) return;
    const m = { v: 1, sid, rid: rid(), kind: "query", op: "search_suggest", data: { q, limit: 10 } };
    if (!conn || conn.state !== "Connected") { pending.push(m); return; }
    conn.invoke("SendFromRemote", m).catch(e => logLine("Suggest error: " + e));
  }, 220);
}
function searchNow() {
  const qEl = document.getElementById('q');
  if (!qEl) return;
  let keyword = qEl.value.trim();
  if (!keyword) return;

  const karaokeSwitch = document.getElementById('hs-basic-with-description-checked');
  const isChecked = karaokeSwitch?.checked;
  if (isChecked && !keyword.toLowerCase().includes("karaoke")) keyword += " karaoke";

  const m = { v: 1, sid, rid: rid(), kind: "query", op: "search", data: { keyword } };
  if (!conn || conn.state !== "Connected") { pending.push(m); return; }
  conn.invoke("SendFromRemote", m).catch(e => logLine("Search error: " + e));
}
document.getElementById('q')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); searchNow(); }
});

/* Lifecycle */
window.addEventListener('online', () => { if (conn?.state === "Disconnected") connectSequence(); });
window.addEventListener('pageshow', () => { if (conn?.state !== "Connected") connectSequence(); else requestWakeLockIfVisible(); });
window.addEventListener('orientationchange', () => requestWakeLockIfVisible());

/* Boot */
(async function boot() {
  if (!sid) { alert("Thiếu sid trong URL"); return; }
  await connectSequence();
})();
