/*!
 * 타자스핀로고 (TajaSpinLogo) — LogoLoader-Web
 * 평상시 기본 마우스 커서는 유지하고, start()/stop() 호출 시에만 로고 로딩 애니메이션을 표시합니다.
 */
(function (global) {
  'use strict';

  var DEFAULT_MODE = "center-overlay";
  var DEFAULT_STYLE = "dual-ring";
  var DEFAULT_LOGO_SRC = '/assets/logo-loader/logo.png';

  var state = {
    mode: DEFAULT_MODE,
    style: DEFAULT_STYLE,
    logoSrc: DEFAULT_LOGO_SRC,
    active: false,
    x: -9999,
    y: -9999,
    rafId: 0,
    layerEl: null,
    cursorEl: null,
    labelEl: null,
    initialized: false,
  };

  function createIndicatorMarkup(style) {
    if (style === 'logo-only') return '';
    if (style === 'comet-ring') return '<span class="logo-loader-comet" aria-hidden="true"></span>';
    if (style === 'dashed-ring') return '<span class="logo-loader-dashed" aria-hidden="true"></span>';
    if (style === 'dual-ring') return '<span class="logo-loader-dual" aria-hidden="true"></span>';
    if (style === 'pulse-ring') return '<span class="logo-loader-pulse" aria-hidden="true"></span>';
    if (style === 'sparkle') {
      return '<span class="logo-loader-sparkles" aria-hidden="true"><span></span><span></span><span></span><span></span></span>';
    }
    if (style === 'dots') {
      var dots = '';
      for (var i = 0; i < 8; i++) {
        var angle = i * 45;
        var opacity = (0.25 + (i / 7) * 0.75).toFixed(2);
        dots +=
          '<span style="transform: rotate(' +
          angle +
          'deg) translateY(-20px); opacity:' +
          opacity +
          ';"></span>';
      }
      return '<span class="logo-loader-dots" aria-hidden="true">' + dots + '</span>';
    }
    return '<span class="logo-loader-ring" aria-hidden="true"></span>';
  }

  function ensureDom() {
    if (state.layerEl) return;

    var layer = document.createElement('div');
    layer.className = 'logo-loader-layer';
    layer.setAttribute('aria-live', 'polite');
    layer.setAttribute('aria-busy', 'false');

    var badgeHtml =
      '<div class="logo-loader-badge style-' +
      state.style +
      '">' +
      createIndicatorMarkup(state.style) +
      '<img class="logo-loader-img" src="' +
      state.logoSrc +
      '" alt="로딩 중" />' +
      '</div>';

    if (state.mode === 'center-overlay') {
      layer.classList.add('is-center');
      layer.innerHTML =
        '<div class="logo-loader-card">' +
        badgeHtml +
        '<p class="logo-loader-label">잠시만 기다려 주세요...</p>' +
        '</div>';
      state.labelEl = layer.querySelector('.logo-loader-label');
      state.cursorEl = null;
    } else {
      layer.classList.add('is-cursor');
      var cursorBox = document.createElement('div');
      cursorBox.className = 'logo-loader-cursor';
      cursorBox.innerHTML = badgeHtml;
      layer.appendChild(cursorBox);
      state.cursorEl = cursorBox;
      state.labelEl = null;
    }

    document.body.appendChild(layer);
    state.layerEl = layer;
  }

  function destroyDom() {
    if (state.layerEl && state.layerEl.parentNode) {
      state.layerEl.parentNode.removeChild(state.layerEl);
    }
    state.layerEl = null;
    state.cursorEl = null;
    state.labelEl = null;
  }

  function schedulePosition() {
    if (state.rafId || !state.cursorEl) return;
    state.rafId = global.requestAnimationFrame(function () {
      state.rafId = 0;
      if (state.cursorEl) {
        state.cursorEl.style.transform =
          'translate3d(' + (state.x + 14) + 'px, ' + (state.y + 14) + 'px, 0)';
      }
    });
  }

  function onPointerMove(e) {
    state.x = e.clientX;
    state.y = e.clientY;
    if (state.active && state.mode === 'cursor-follow') {
      schedulePosition();
    }
  }

  var LogoLoader = {
    init: function (options) {
      options = options || {};
      if (options.mode) state.mode = options.mode;
      if (options.style) state.style = options.style;
      if (options.logoSrc) state.logoSrc = options.logoSrc;

      if (state.layerEl) {
        var wasActive = state.active;
        destroyDom();
        if (wasActive) {
          ensureDom();
          state.layerEl.classList.add('is-active');
        }
      }

      if (!state.initialized) {
        global.addEventListener('pointermove', onPointerMove, { passive: true });
        state.initialized = true;
      }
    },

    start: function (message, options) {
      if (!state.initialized) LogoLoader.init();
      var nextMode = options && options.mode;
      if (nextMode && nextMode !== state.mode) {
        state.mode = nextMode;
        destroyDom();
      }
      ensureDom();
      state.active = true;
      if (state.labelEl && message) {
        state.labelEl.textContent = message;
      }
      if (state.mode === 'cursor-follow' && state.x < 0) {
        state.x = Math.round(global.innerWidth / 2);
        state.y = Math.round(global.innerHeight / 2);
      }
      schedulePosition();
      state.layerEl.setAttribute('aria-busy', 'true');
      state.layerEl.classList.add('is-active');
    },

    stop: function () {
      state.active = false;
      if (state.layerEl) {
        state.layerEl.setAttribute('aria-busy', 'false');
        state.layerEl.classList.remove('is-active');
      }
    },

    wrap: function (promise, message, options) {
      LogoLoader.start(message, options);
      return Promise.resolve(promise).finally(function () {
        LogoLoader.stop();
      });
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      LogoLoader.init();
    });
  } else {
    LogoLoader.init();
  }

  global.LogoLoader = LogoLoader;
})(window);

