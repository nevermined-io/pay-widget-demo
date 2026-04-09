/**
 * NeverminedPay — Embeddable payment widget.
 *
 * Usage:
 *   <script src="https://pay.nevermined.app/widget.js"></script>
 *   // Agent mode — loads all plans for the agent
 *   const result = await NeverminedPay.open({ agentId: 'did:nv:abc...', externalId: 'user-123' });
 *   // Plan-only mode — loads a single plan directly
 *   const result = await NeverminedPay.open({ planId: '123...', externalId: 'user-123' });
 *   // result = { accessToken, planId }
 */
(function () {
  'use strict';

  var WIDGET_ORIGIN = (function () {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].src || '';
      if (src.indexOf('widget.js') !== -1) {
        var url = new URL(src);
        return url.origin;
      }
    }
    return window.location.origin;
  })();

  var activeOverlay = null;

  function open(options) {
    if (!options || (!options.agentId && !options.planId)) {
      return Promise.reject(new Error('NeverminedPay.open requires { agentId } or { planId }'));
    }

    if (activeOverlay) {
      return Promise.reject(new Error('NeverminedPay: a checkout is already open'));
    }

    return new Promise(function (resolve, reject) {
      // Build iframe URL
      var params = new URLSearchParams();
      if (options.agentId) params.set('agentId', options.agentId);
      if (options.planId) params.set('planId', options.planId);
      params.set('origin', window.location.origin);
      if (options.externalId) params.set('externalId', options.externalId);

      var iframeSrc = WIDGET_ORIGIN + '/embed/checkout?' + params.toString();

      // Create overlay
      var overlay = document.createElement('div');
      overlay.style.cssText =
        'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);';

      // Create iframe
      var iframe = document.createElement('iframe');
      iframe.src = iframeSrc;
      iframe.style.cssText =
        'width:100%;max-width:520px;height:90vh;max-height:700px;border:none;border-radius:12px;background:white;';
      iframe.allow = 'payment';

      overlay.appendChild(iframe);
      document.body.appendChild(overlay);
      activeOverlay = overlay;

      function cleanup() {
        window.removeEventListener('message', onMessage);
        if (activeOverlay) {
          document.body.removeChild(activeOverlay);
          activeOverlay = null;
        }
      }

      function onMessage(event) {
        if (event.origin !== WIDGET_ORIGIN) return;
        var data = event.data;
        if (!data || typeof data.type !== 'string') return;

        if (data.type === 'nvm:payment_success') {
          cleanup();
          resolve({
            accessToken: data.accessToken || null,
            planId: data.planId || null,
          });
        } else if (data.type === 'nvm:closed') {
          cleanup();
          reject(new Error('User closed the checkout'));
        }
      }

      window.addEventListener('message', onMessage);

      // Close on overlay click (but not iframe click)
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
          cleanup();
          reject(new Error('User closed the checkout'));
        }
      });
    });
  }

  function close() {
    if (activeOverlay) {
      window.postMessage({ type: 'nvm:closed' }, '*');
      document.body.removeChild(activeOverlay);
      activeOverlay = null;
    }
  }

  window.NeverminedPay = {
    open: open,
    close: close,
  };
})();
