document.addEventListener('DOMContentLoaded', function () {
  initVideoProgressBars();          // sets up all [data-vp] progress bars
  initNoZoomAndHideKeyboard();      // prevents zoom + hides keyboard on scroll
});


// ==============================
// Video progress bars
// ==============================
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
      // Click anywhere on bar to seek
      wrap.addEventListener('pointerdown', (e) => {
        if (!range) return;
        if (e.target !== range) {
          const sec = secondsAtX(range, e.clientX);
          range.value = sec;
          update(sec);
          if (video) video.currentTime = sec;
        }
      }, { capture: true });

      // Tooltip
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
      // Drag thumb
      range.addEventListener('input', () => {
        const val = +range.value;
        update(val);
        if (video) video.currentTime = val;
      });
    }

    // Wire to video if provided
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

let __uiGuardsBound = false;
function initNoZoomAndHideKeyboard() {
  if (__uiGuardsBound) return; // prevent duplicate listeners if called again
  __uiGuardsBound = true;

  // ----- Prevent page zoom (pinch / ctrl+wheel / double-tap) -----
  // Block pinch-zoom gestures (iOS Safari)
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(evt => {
    document.addEventListener(evt, (e) => e.preventDefault(), { passive: false });
  });

  // Block Ctrl/Cmd + wheel zoom (desktop)
  document.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) e.preventDefault();
  }, { passive: false });

  // Block double-tap zoom, but allow interactions on controls and inside the slider area
  let lastTouchEnd = 0;
  const isInteractive = (el) =>
    !!el.closest('input, textarea, select, button, a, label, [role="button"], [contenteditable], video, audio');

  document.addEventListener('touchend', (e) => {
    // NOTE: changed from '#vp-wrap' to the attribute used in your markup:
    if (e.target.closest('[data-vp-wrap]') || isInteractive(e.target)) return;

    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault(); // block double-tap zoom
    }
    lastTouchEnd = now;
  }, { passive: false });

  // ----- Hide keyboard on scroll/drag outside inputs -----
  function isEditable(el) {
    if (!el || el.disabled || el.readOnly) return false;
    if (el.isContentEditable) return true;
    const tag = (el.tagName || '').toLowerCase();
    if (tag === 'textarea') return true;
    if (tag === 'input') {
      const t = (el.type || '').toLowerCase();
      // include common types; exclude buttons/checkbox/radio, etc.
      return !['button', 'submit', 'reset', 'checkbox', 'radio', 'range', 'file', 'image', 'color'].includes(t);
    }
    return false;
  }

  function blurActive() {
    const ae = document.activeElement;
    if (isEditable(ae)) {
      // Timeout helps iOS Safari reliably dismiss the keyboard
      setTimeout(() => ae.blur(), 0);
    }
  }

  let startY = 0;
  let shouldBlurOnMove = false;
  const THRESHOLD = 8; // px of finger movement before we dismiss

  window.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
    shouldBlurOnMove = !isEditable(e.target);
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!shouldBlurOnMove) return;
    const dy = Math.abs(e.touches[0].clientY - startY);
    if (dy > THRESHOLD) blurActive();
  }, { passive: true });

  window.addEventListener('scroll', () => {
    if (isEditable(document.activeElement)) blurActive();
  }, { passive: true });

  if (window.visualViewport) {
    visualViewport.addEventListener('scroll', () => {
      if (isEditable(document.activeElement)) blurActive();
    }, { passive: true });
  }

  window.addEventListener('orientationchange', blurActive);
}

/** Minimal escape to avoid injecting raw HTML from API data */
function escapeHTML(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildResultCard(item) {
  const title  = escapeHTML(item?.title);
  const singer = escapeHTML(item?.singer);
  const thumbRaw = item?.thumbnail;
  const thumb    = thumbRaw ? escapeHTML(thumbRaw) : "images/default_thumbnail.jpg"; 

  return `
  <div class="result-card flex flex-row md:flex-col bg-white pb-2 md:pb-0 md:border md:border-gray-200 md:shadow-2xs md:rounded-md overflow-hidden" data-song
    data-id="${escapeHTML(item.id)}"
    data-title="${escapeHTML(item.title)}"
    data-thumb="${escapeHTML(item.thumbnail)}">
    <div class="basis-1/3 md:basis-full">
      <img class="w-full h-auto rounded-md md:rounded-b-none aspect-video object-cover object-center"
          src="${thumb}"
          alt="Ảnh nhỏ: ${title}"
          loading="lazy" />
    </div>
    <div class="basis-2/3 md:basis-full pl-2 md:p-4">
      <h3 class="md:text-lg font-semibold text-gray-800 line-clamp-2 uppercase">
        ${title}
      </h3>
      <p class="text-sm md:text-base mt-0.5 md:mt-1 text-gray-700 line-clamp-1">
        ${singer}
      </p>
    </div>
  </div>`;
}

function renderSearchResults(containerId, results) {
  const el = document.getElementById(containerId);
  if (!el) return;

  if (!Array.isArray(results) || results.length === 0) {
    el.innerHTML = `
      <div class="col-span-full text-center text-gray-700 text-lg py-6">
        Không có kết quả.
      </div>`;
    return;
  }

  el.innerHTML = results.map(buildResultCard).join("");
}

function buildQueueCard(item) {
  const title  = escapeHTML(item?.title);
  const singer = escapeHTML(item?.singer);
  const thumbRaw = item?.thumbnail;
  const thumb = thumbRaw ? escapeHTML(thumbRaw) : "images/default_thumbnail.jpg"; 
  
  return `
  <div class="queue-card flex bg-white py-2 overflow-hidden cursor-pointer" data-queue
     data-id="${escapeHTML(item.id)}"
     data-title="${escapeHTML(item.title)}"
     data-thumb="${escapeHTML(item.thumbnail)}">
    <div class="basis-1/3">
        <img class="w-full h-auto rounded-md aspect-video object-cover object-center"
            src="${thumb}" alt="Ảnh nhỏ: ${title}" loading="lazy">
    </div>
    <div class="basis-2/3 pl-2">
        <h3 class="font-semibold text-gray-800 line-clamp-2 uppercase">${title}</h3>
        <p class="text-sm mt-0.5 text-gray-700 line-clamp-1">${singer}</p>
    </div>
  </div>`;
}

function renderListQueue(className, queue) {
  const html = queue.map(buildQueueCard).join("");

  document.querySelectorAll(`.${className}`).forEach(el => {
    el.innerHTML = html;
  });
}

function buildPlayingCard(item) {
  if (!item) {
    return ``;
  }

  const title = escapeHTML(item.title);
  const thumbRaw = item?.thumbnail;
  const thumb    = thumbRaw ? escapeHTML(thumbRaw) : "images/default_thumbnail.jpg"; 

  return `
    <div class="relative">
      <div class="absolute top-0 left-0 w-full py-1 px-2 bg-black/50 text-white text-center font-medium">
        <span class="line-clamp-2 uppercase">${title}</span>
      </div>

      <div class="aspect-video overflow-hidden">
        <img class="w-full h-full object-cover object-center"
             src="${thumb}"
             alt="Ảnh nhỏ: ${title}"
             loading="lazy">
      </div>
    </div>`;
}

function renderPlayingCard(className, item) {
  const html = buildPlayingCard(item);

  document.querySelectorAll(`.${className}`).forEach(el => {
    el.innerHTML = html;
  });
}

function updateUpNextCount(count) {
  document.querySelectorAll(".upNextCount").forEach(el => {
    el.textContent = String(count);
  });
}

// Minimal safe helpers
function setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text || ""; }
function setImg(id, src, alt) {
  const el = document.getElementById(id);
  if (!el) return;
  el.src = src || "";
  el.alt = alt || "";
}

// Toggle which button group is visible
function toggleGroups(mode) {
  document.querySelectorAll('#song-action-modal [data-group]').forEach(g => {
    g.classList.toggle('hidden', g.getAttribute('data-group') !== mode);
  });
}

// Open Preline overlay programmatically
function openModal() {
  if (window.HSOverlay?.open) HSOverlay.open('#song-action-modal');
  else document.querySelector('#song-action-modal')?.classList.remove('hidden');
}
function closeModal() {
  if (window.HSOverlay?.close) HSOverlay.close('#song-action-modal');
  else document.querySelector('#song-action-modal')?.classList.add('hidden');
}

// Stash the payload for button handlers
function setPayload(payload) {
  const modal = document.getElementById('song-action-modal');
  modal.dataset.payload = JSON.stringify(payload || {});
}
function getPayload() {
  const modal = document.getElementById('song-action-modal');
  try { return JSON.parse(modal?.dataset.payload || '{}'); } catch { return {}; }
}

// Main entry point to show the modal in a specific mode
function showActionModal({ mode, title, thumb, payload }) {
  toggleGroups(mode);
  setText('song-action-title', title || '');
  setImg('song-action-thumb', thumb || '', `Ảnh nhỏ: ${title || ''}`);
  setPayload({ ...(payload || {}), mode });
  openModal();
}

// Wire actions (once)
(function bindSongActions(){
  document.getElementById('song-action-choose')?.addEventListener('click', () => {
    const p = getPayload(); // { id, type: 'search', ... }
    // TODO: conn.invoke(... choose p.id ...)
    closeModal();
  });
  document.getElementById('song-action-priority')?.addEventListener('click', () => {
    const p = getPayload();
    // TODO: conn.invoke(... priority from search ...)
    closeModal();
  });
  document.getElementById('song-action-play')?.addEventListener('click', () => {
    const p = getPayload(); // { id, type: 'queue', ... }
    // TODO: conn.invoke(... play-priority queue item ...)
    closeModal();
  });
  document.getElementById('song-action-move')?.addEventListener('click', () => {
    const p = getPayload();
    // TODO: conn.invoke(... move-up queue item ...)
    closeModal();
  });
  document.getElementById('song-action-delete')?.addEventListener('click', () => {
    const p = getPayload();
    // TODO: conn.invoke(... remove queue item ...)
    closeModal();
  });
})();

// SEARCH results container
document.getElementById('searchResultsGrid')?.addEventListener('click', (e) => {
  const card = e.target.closest('[data-song]');
  if (!card) return;
  showActionModal({
    mode: 'search',
    title: card.dataset.title,
    thumb: card.dataset.thumb,
    payload: { id: card.dataset.id, type: 'search' }
  });
});

// QUEUE list containers (you said you have two)
document.querySelectorAll('.upNextList').forEach(list => {
  list.addEventListener('click', (e) => {
    const card = e.target.closest('[data-queue]');
    if (!card) return;
    showActionModal({
      mode: 'queue',
      title: card.dataset.title,
      thumb: card.dataset.thumb,
      payload: { id: card.dataset.id, type: 'queue' }
    });
  });
});

// ===== Config =====
const RECONNECT_DELAYS = [0, 1500, 3000, 5000, 10000, 15000, 30000];
const ENABLE_WAKE_LOCK = true;

const url = new URL(location.href);
const sid = (url.searchParams.get('sid') || '').trim();

// const sidEl = document.getElementById('sidShow');
// const statusEl = document.getElementById('status');
// const logEl = document.getElementById('log');
// sidEl.textContent = sid || '—';

let conn = null;
let wakeLock = null;
let connectInProgress = false;
let pending = []; // hàng đợi lệnh khi chưa Connected

let isPlaying = false;
let currentAudioTrack = 0;
let currentPositionMs = -1;
let durationMs = -1;
let didFirstSearch = false;

// ===== Log helpers =====
function ts() { return new Date().toLocaleTimeString(); }
function logLine(text) { console.log(text) }
function logJson(tag, obj) { console.log(obj) }
const rid = () => (crypto.randomUUID && crypto.randomUUID()) || (Date.now() + '-' + Math.random());

// ===== Wake Lock (chỉ xin khi visible) =====
async function requestWakeLockIfVisible() {
    if (!ENABLE_WAKE_LOCK) return;
    if (document.visibilityState !== 'visible') return;  // QUAN TRỌNG: chỉ khi visible
    try {
        if ('wakeLock' in navigator) {
            // Nếu đã có thì thôi
            if (wakeLock) return;
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => {
                logLine('WakeLock released');
                wakeLock = null;
                // Nếu còn visible thì xin lại (iOS có thể tự release)
                if (document.visibilityState === 'visible') requestWakeLockIfVisible();
            });
            logLine('WakeLock acquired');
        } else {
            logLine('WakeLock API không hỗ trợ');
        }
    } catch (e) {
        // Không log lỗi khi không visible nữa
        if (document.visibilityState === 'visible') logLine('WakeLock error: ' + e);
    }
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') requestWakeLockIfVisible();
    // Ẩn → không cố release thủ công (tránh vòng lặp); để hệ thống tự release.
});

// ===== Connection =====
function createConnection(preferWS) {
    const builder = new signalR.HubConnectionBuilder().withAutomaticReconnect(RECONNECT_DELAYS);
    if (preferWS) {
        builder.withUrl("http://192.168.1.33:5096/hubs/remote", { transport: signalR.HttpTransportType.WebSockets, skipNegotiation: true });
    } else {
        builder.withUrl("http://192.168.1.33:5096/hubs/remote"); // fallback
    }
    const c = builder.build();
    // Đặt timeout/keepalive client
    c.serverTimeoutInMilliseconds = 60_000;       // > keepalive server
    c.keepAliveIntervalInMilliseconds = 15_000;   // phù hợp mobile
    return c;
}

async function startConnection(preferWS = true) {
    conn = createConnection(preferWS);

    conn.on("OnMessage", (msg) => {
        logJson("OnMessage", msg);
        if (msg.kind === "evt") {
          // statusEl.textContent = `Đã kết nối`;
          isPlaying = msg.data.isPlaying;
          currentAudioTrack = msg.data.currentAudioTrack;
          logJson("isPlaying", isPlaying);
          currentPositionMs = msg.data.currentPositionMs;
          durationMs = msg.data.durationMs;
          
          if (msg.op === 'search_result') {
            const results = msg.data.searchResult;
            console.log(results);
            renderSearchResults("searchResultsGrid", results);
          }
          else if (msg.op === 'queue_changed' || msg.op === 'state_snapshot') {
            const data = msg.data || {};
            const upNext = data.queue || [];
            const count = Number.isFinite(data.queueCount) ? data.queueCount : upNext.length;
            const current = data.currentSong;

            updateUpNextCount(count);

            renderPlayingCard("nowPlaying", current);

            renderListQueue("upNextList", upNext);
          }
          if (!didFirstSearch) {
            console.log('first search');
            didFirstSearch = true;
            const keyword = 'karaoke';
            const m = { v: 1, sid, rid: rid(), kind: "query", op: "search", data: { keyword } };
            if (!conn || conn.state !== "Connected") { pending.push(m); return; }
            conn.invoke("SendFromRemote", m).catch(e => logLine("Search error: " + e));
          }
        }
    });

    conn.onreconnecting(() => {
        // statusEl.textContent = "Mất kết nối, đang thử lại…";
        logLine("onreconnecting");
    });

    conn.onreconnected(async () => {
        logLine("onreconnected → rejoin group");
        // statusEl.textContent = "Đã kết nối lại. Đang join lại phiên…";
        try {
            await conn.invoke("JoinRemote", sid);
            statusEl.textContent = "Đã join lại.";
            // Flush hàng đợi
            if (pending.length) {
                const batch = pending;
                pending = [];
                for (const m of batch) {
                    logJson("Resend", m);
                    conn.invoke("SendFromRemote", m).catch(e => logLine("Resend error: " + e));
                }
            }
        } catch (e) {
            // statusEl.textContent = "Lỗi join lại.";
            logLine("Rejoin error: " + e);
        }
    });

    conn.onclose(() => {
        // statusEl.textContent = "Kết nối đóng, sẽ thử kết nối lại…";
        logLine("onclose → restart in 1.5s");
        setTimeout(() => connectSequence(), 1500);
    });

    try {
        await conn.start();
    } catch (e) {
        logLine("Start failed: " + e);
        if (preferWS) { await delay(500); return startConnection(false); }
        else { throw e; }
    }
}

async function join() {
    const res = await conn.invoke("JoinRemote", sid);
    if (!res?.ok) {
        if (res.code === "SESSION_EXPIRED") {
            // statusEl.textContent = "Phiên đã hết hạn. Vui lòng quét mã mới.";
        } else if (res.code === "ROOM_FULL") {
            // statusEl.textContent = `Phòng đã đầy (${res.used}/${res.max}).`;
        } else {
            // statusEl.textContent = `Join thất bại (${res.code || 'UNKNOWN'}).`;
        }
        return;
    }
    // statusEl.textContent = "Đã join phiên.";
    logJson("JoinRemoteResult", res);
}

async function connectSequence() {
    if (connectInProgress) return;  // chặn double-connect do nhiều event cùng lúc
    connectInProgress = true;
    try {
        // if (!sid) { statusEl.textContent = "Thiếu sid."; return; }
        // statusEl.textContent = "Đang kết nối…";
        await requestWakeLockIfVisible();
        await startConnection(true);
        await join();
    } finally {
        connectInProgress = false;
    }
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ===== Gửi lệnh (có hàng đợi) =====
function send(op, data = {}) {
    const m = { v: 1, sid, rid: rid(), kind: "cmd", op, data };
    logJson("Send", m);
    if (!conn || conn.state !== "Connected") {
        // Chưa sẵn sàng → xếp hàng & sẽ gửi sau khi reconnected
        pending.push(m);
        return;
    }
    conn.invoke("SendFromRemote", m).catch(e => logLine("Send error: " + e));
}

// ===== Search / Suggest (dùng cùng hàng đợi) =====
let tSuggest = 0;
function debouncedSuggest(q) {
    clearTimeout(tSuggest);
    tSuggest = setTimeout(() => {
        if (!q) return;
        const m = { v: 1, sid, rid: rid(), kind: "query", op: "search_suggest", data: { q, limit: 10 } };
        logJson("Send", m);
        if (!conn || conn.state !== "Connected") { pending.push(m); return; }
        conn.invoke("SendFromRemote", m).catch(e => logLine("Suggest error: " + e));
    }, 220);
}

function searchNow() {
    var keyword = document.getElementById('q').value.trim();
    if (!keyword) return;
    // Lấy trạng thái switch
    var karaokeSwitch = document.getElementById('hs-basic-with-description-checked');
    var isChecked = karaokeSwitch.checked;

    // Nếu switch bật và input chưa có 'karaoke'
    if (isChecked && !keyword.toLowerCase().includes("karaoke")) {
        keyword += " karaoke";
    }

    const m = { v: 1, sid, rid: rid(), kind: "query", op: "search", data: { keyword } };
    logJson("Send", m);
    if (!conn || conn.state !== "Connected") { pending.push(m); return; }
    conn.invoke("SendFromRemote", m).catch(e => logLine("Search error: " + e));
}
// document.getElementById('q').addEventListener('input', e => debouncedSuggest(e.target.value));

document.getElementById('q').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault(); // tránh submit form mặc định
        searchNow();
    }
});

// ===== Lifecycle =====
window.addEventListener('online', () => { logLine("online"); if (conn?.state === "Disconnected") connectSequence(); });
// window.addEventListener('offline', () => { logLine("offline"); statusEl.textContent = "Offline (mất mạng)."; });
window.addEventListener('pageshow', () => { if (conn?.state !== "Connected") connectSequence(); else requestWakeLockIfVisible(); });
// iOS hay release khi quay màn hình
window.addEventListener('orientationchange', () => requestWakeLockIfVisible());

// ===== Boot =====
(async function boot() {
    if (!sid) { alert("Thiếu sid trong URL"); return; }
    await connectSequence();
})();