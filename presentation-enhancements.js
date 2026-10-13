(() => {
  if (window.__twoPresentationEnhancementsV3) return;
  window.__twoPresentationEnhancementsV3 = true;

  function purgeLegacyHighlights() {
    try {
      document.querySelectorAll(
        '.two-plan-highlight-layer, .two-lens-highlight-viewport, .two-lens-highlight-canvas, .two-plan-highlight'
      ).forEach(el => el.remove());
      document.getElementById('two-plan-highlight-fix-style')?.remove();
    } catch (_) {}
  }

  function addStyles() {
    let style = document.getElementById('two-presentation-enhancements-v3-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'two-presentation-enhancements-v3-style';
      document.head.appendChild(style);
    }
    style.textContent = `
      #detailView{overflow:auto!important}
      #detailView .detail-content{height:auto!important;min-height:calc(100vh - 48px)!important;overflow:visible!important;grid-template-rows:auto auto auto!important;padding-bottom:82px!important}
      #detailView .hero-zone p{font-size:clamp(14px,1.2vw,17px)!important;line-height:1.45!important;-webkit-line-clamp:unset!important;overflow:visible!important}
      #detailView .triple-compare{height:auto!important;min-height:0!important}
      #detailView .photo-card{height:auto!important;min-height:0!important}
      #detailView .photo-card .visual{height:clamp(250px,30vw,430px)!important;min-height:0!important}

      #detailView .info-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:16px!important;align-items:stretch!important}
      #detailView .info:nth-child(3){display:none!important}
      #detailView .info.two-impact-card{position:relative!important;overflow:hidden!important;padding:18px 20px 20px!important;border-radius:20px!important;border:1px solid #d4e3cf!important;box-shadow:0 10px 28px rgba(18,55,35,.10)!important;background:linear-gradient(145deg,#ffffff,#f5faf1)!important}
      #detailView .info.two-impact-economic{border-top:5px solid #78be20!important}
      #detailView .info.two-impact-client{border-top:5px solid #2f78b7!important;background:linear-gradient(145deg,#ffffff,#f2f7fb)!important}
      #detailView .info.two-impact-card .ico{width:42px!important;height:42px!important;border-radius:12px!important;margin:0 0 10px!important;font-size:20px!important;box-shadow:inset 0 0 0 1px rgba(0,0,0,.04)!important}
      #detailView .info.two-impact-client .ico{background:#e6f1fb!important;color:#2f78b7!important}
      #detailView .info.two-impact-card b{display:block!important;font-size:clamp(18px,1.55vw,23px)!important;line-height:1.12!important;margin:0 0 11px!important;color:#173c2b!important;letter-spacing:-.2px!important}
      #detailView .info.two-impact-card p{font-size:clamp(15px,1.18vw,18px)!important;line-height:1.48!important;color:#344a3d!important;margin:0!important}
      #detailView .two-impact-list{list-style:none!important;margin:0!important;padding:0!important;display:grid!important;gap:8px!important}
      #detailView .two-impact-list li{position:relative!important;padding-left:22px!important;margin:0!important}
      #detailView .two-impact-list li::before{content:'✱'!important;position:absolute!important;left:0!important;top:.04em!important;color:#78be20!important;font-size:.9em!important;font-weight:950!important;line-height:1.35!important}
      #detailView .info.two-impact-client .two-impact-list li::before{color:#2f78b7!important}
      #detailView .two-impact-paragraph{display:block!important}

      #detailView .two-plan-icon{margin-left:auto!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;min-width:94px!important;height:40px!important;padding:0 12px!important;border:0!important;border-radius:12px!important;background:#173c2b!important;color:#fff!important;font-weight:950!important;font-size:13px!important;box-shadow:0 5px 14px rgba(18,55,35,.18)!important}
      #detailView .two-plan-icon svg{width:21px!important;height:21px!important;display:block!important}
      #detailView .two-plan-bottom{flex:.72!important;background:#78be20!important;color:#15341f!important}

      /* Interdit explicitement les anciennes surcouches générées sur le plan. */
      .two-plan-highlight-layer,
      .two-lens-highlight-viewport,
      .two-lens-highlight-canvas,
      .two-plan-highlight{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}

      @media(max-width:900px){
        #detailView .info-grid{grid-template-columns:1fr!important;gap:12px!important}
        #detailView .info.two-impact-card{padding:16px 17px 18px!important}
        #detailView .info.two-impact-card b{font-size:19px!important}
        #detailView .info.two-impact-card p{font-size:15.5px!important;line-height:1.5!important}
        #detailView .two-plan-icon{min-width:46px!important;width:46px!important;padding:0!important;font-size:0!important}
        #detailView .two-plan-icon svg{width:23px!important;height:23px!important}
        #detailView .photo-card .visual{height:280px!important}
      }
    `;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>\"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;' }[c]));
  }

  function splitPoints(value) {
    let raw = String(value ?? '').replace(/\r/g, '').trim();
    if (!raw) return [];

    raw = raw
      .replace(/\s+(?=(?:\d{1,2}\s*[.)-]|[•●▪*✱✓])\s+)/g, '\n')
      .replace(/\s+(?=\-\s+[A-ZÀ-ÖØ-Ý])/g, '\n');

    let parts = raw.split(/\n+/).map(s => s.trim()).filter(Boolean);
    if (parts.length === 1) {
      const numbered = raw.split(/(?=\b\d{1,2}\s*[.)-]\s+)/).map(s => s.trim()).filter(Boolean);
      if (numbered.length > 1) parts = numbered;
    }

    return parts
      .map(s => s.replace(/^\s*(?:(?:\d{1,2}\s*[.)-])|[\-–—•●▪*✱✓])\s*/u, '').trim())
      .filter(Boolean);
  }

  function currentZone() {
    try {
      if (typeof project !== 'undefined' && Array.isArray(project?.zones)) {
        if (typeof currentDetailIndex !== 'undefined' && project.zones[currentDetailIndex]) return project.zones[currentDetailIndex];
        const title = document.getElementById('detailTopTitle')?.textContent?.trim();
        return project.zones.find(z => z.title === title) || null;
      }
    } catch (_) {}
    return null;
  }

  function renderImpactField(id, value, type) {
    const el = document.getElementById(id);
    if (!el) return;
    const card = el.closest('.info');
    if (card) card.classList.add('two-impact-card', type === 'economic' ? 'two-impact-economic' : 'two-impact-client');

    const source = String(value ?? '').trim();
    const key = `${type}:${source}`;
    if (el.dataset.twoImpactRendered === key && el.querySelector('.two-impact-list,.two-impact-paragraph')) return;

    const points = splitPoints(source);
    if (!points.length) {
      el.innerHTML = '<span class="two-impact-paragraph">À compléter</span>';
    } else if (points.length === 1) {
      el.innerHTML = `<span class="two-impact-paragraph">${escapeHtml(points[0])}</span>`;
    } else {
      el.innerHTML = `<ul class="two-impact-list">${points.map(point => `<li>${escapeHtml(point)}</li>`).join('')}</ul>`;
    }
    el.dataset.twoImpactRendered = key;
  }

  function mapSvg() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m15 5.1-6-2.1-6 2.1v15.8l6-2.1 6 2.1 6-2.1V3.1L15 5.1Zm-1 13.4-4-1.4V5.5l4 1.4v11.6Zm-9 .9V6.6l3-1.1v11.8l-3 1.1Zm14-2.1-3 1.1V6.6l3-1.1v11.8Z"/></svg>`;
  }

  function returnToPlan() {
    purgeLegacyHighlights();
    const detail = document.getElementById('detailView');
    const welcome = document.getElementById('welcome');
    const present = document.getElementById('presentView');
    const editor = document.getElementById('editorView');
    const shell = document.getElementById('planShell');
    const lens = document.getElementById('lens');
    const viewport = document.getElementById('mapViewport');

    detail?.classList.add('hidden');
    welcome?.classList.add('hidden');
    try { if (typeof setMode === 'function') setMode('present'); } catch (_) {}
    present?.classList.remove('hidden');
    editor?.classList.add('hidden');

    const apply = () => {
      purgeLegacyHighlights();
      try { document.documentElement.scrollTop = 0; document.body.scrollTop = 0; } catch (_) {}
      if (viewport) viewport.scrollTop = 0;
      if (shell) {
        const shownZoom = Number.parseInt(document.getElementById('zoomTxt')?.textContent, 10) || 100;
        shell.style.setProperty('width', `${shownZoom}%`, 'important');
        shell.style.setProperty('min-width', shownZoom <= 100 ? '0' : '850px', 'important');
      }
      if (lens) {
        lens.classList.remove('hidden');
        lens.style.removeProperty('display');
        lens.style.removeProperty('visibility');
        lens.style.removeProperty('opacity');
      }
      try { if (typeof renderPresentHotspots === 'function') renderPresentHotspots(); } catch (_) {}
      try { if (typeof centerMagnifier === 'function') centerMagnifier(); } catch (_) {}
    };

    requestAnimationFrame(apply);
    setTimeout(apply, 80);
    setTimeout(apply, 240);
  }

  function ensurePlanButtons() {
    const top = document.querySelector('#detailView .detail-top');
    if (top && !document.getElementById('twoPlanIcon')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.id = 'twoPlanIcon';
      button.className = 'two-plan-icon';
      button.title = 'Revenir au plan interactif';
      button.setAttribute('aria-label', 'Revenir au plan interactif');
      button.innerHTML = `${mapSvg()}<span>Plan</span>`;
      button.addEventListener('click', returnToPlan);
      top.appendChild(button);
    }

    const nav = document.querySelector('#detailView .detail-nav');
    if (nav && !document.getElementById('twoPlanBottom')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.id = 'twoPlanBottom';
      button.className = 'two-plan-bottom';
      button.innerHTML = '▦ Plan';
      button.addEventListener('click', returnToPlan);
      const next = document.getElementById('nextZone');
      nav.insertBefore(button, next || null);
    }
  }

  function enhanceDetail() {
    const zone = currentZone();
    const economic = zone?.economic ?? document.getElementById('detailEconomic')?.textContent ?? '';
    const client = zone?.client ?? document.getElementById('detailClient')?.textContent ?? '';
    renderImpactField('detailEconomic', economic, 'economic');
    renderImpactField('detailClient', client, 'client');
    ensurePlanButtons();
    purgeLegacyHighlights();
  }

  function patchZoomButtons() {
    const shell = document.getElementById('planShell');
    if (!shell) return;
    ['zoomMinus','zoomPlus'].forEach(id => {
      const button = document.getElementById(id);
      if (!button || button.dataset.twoZoomFixedV3) return;
      button.dataset.twoZoomFixedV3 = '1';
      button.addEventListener('click', () => {
        requestAnimationFrame(() => {
          purgeLegacyHighlights();
          const value = Number.parseInt(document.getElementById('zoomTxt')?.textContent, 10) || 100;
          shell.style.setProperty('width', `${value}%`, 'important');
          shell.style.setProperty('min-width', value <= 100 ? '0' : '850px', 'important');
        });
      });
    });
  }

  function installObservers() {
    try { window.__twoPhotoFitObserver?.disconnect?.(); } catch (_) {}

    if (typeof renderDetail === 'function' && !window.__twoImpactRenderWrappedV3) {
      const previous = renderDetail;
      window.renderDetail = function () {
        const result = previous.apply(this, arguments);
        requestAnimationFrame(enhanceDetail);
        setTimeout(enhanceDetail, 30);
        return result;
      };
      window.__twoImpactRenderWrappedV3 = true;
    }

    if (!window.__twoLegacyHighlightPurgeObserver) {
      let queued = false;
      const observer = new MutationObserver(() => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
          queued = false;
          purgeLegacyHighlights();
        });
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
      window.__twoLegacyHighlightPurgeObserver = observer;
    }

    const detailObserver = new MutationObserver(() => requestAnimationFrame(enhanceDetail));
    const detail = document.getElementById('detailView');
    if (detail) detailObserver.observe(detail, { childList: true, subtree: true });

    window.addEventListener('resize', purgeLegacyHighlights, { passive: true });
    document.getElementById('lens')?.addEventListener('pointermove', purgeLegacyHighlights, { passive: true });
  }

  purgeLegacyHighlights();
  addStyles();
  ensurePlanButtons();
  patchZoomButtons();
  installObservers();
  enhanceDetail();
  requestAnimationFrame(purgeLegacyHighlights);
  [50, 150, 350, 800, 1500, 3000].forEach(ms => setTimeout(purgeLegacyHighlights, ms));
})();
