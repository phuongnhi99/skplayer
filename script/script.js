// ==============================
// 1) Video progress bars
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

// ==============================
// 2) No zoom + hide keyboard on scroll
// ==============================
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

// ==============================
// Call both after DOM is ready
// ==============================
document.addEventListener('DOMContentLoaded', function () {
  initVideoProgressBars();          // sets up all [data-vp] progress bars
  initNoZoomAndHideKeyboard();      // prevents zoom + hides keyboard on scroll
});
