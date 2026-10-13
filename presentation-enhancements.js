(() => {
  if (window.__twoPresentationEnhancementsV2) return;
  window.__twoPresentationEnhancementsV2 = true;

  const HIGHLIGHTS = [
    { label: 'Pulvérisateur', x: 56.1, y: 7.4, w: 8.3, h: 4.8 },
    { label: 'Tuyau PVC',     x: 65.0, y: 7.4, w: 8.4, h: 4.8 },
    { label: 'Tuyau',         x: 72.8, y: 16.3, w: 6.8, h: 4.8 }
  ];
  const LENS_ZOOM = 2.25;

  function addStyles() {
    if (document.getElementById('two-presentation-enhancements-v2-style')) return;
    const style = document.createElement('style');
    style.id = 'two-presentation-enhancements-v2-style';
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
      #detailView .two-impact-client .two-impact-list li::before{color:#2f78b7!important}
      #detailView .two-impact-paragraph{display:block!important}

      #detailView .two-plan-icon{margin-left:auto!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;min-width:94px!important;height:40px!important;padding:0 12px!important;border:0!important;border-radius:12px!important;background:#173c2b!important;color:#fff!important;font-weight:950!important;font-size:13px!important;box-shadow:0 5px 14px rgba(18,55,35,.18)!important}
      #detailView .two-plan-icon svg{width:21px!important;height:21px!important;display:block!important}
      #detailView .two-plan-bottom{flex:.72!important;background:#78be20!important;color:#15341f!important}

      .two-plan-highlight-layer{position:absolute;inset:0;pointer-events:none;z-index:6;line-height:1}
      .two-plan-highlight{position:absolute;display:flex;align-items:center;justify-content:center;background:#1f6fb2;border:2px solid #15538a;border-radius:2px;color:#fff;font-family:Arial,Helvetica,sans-serif;font-weight:800;text-align:center;line-height:1.05;letter-spacing:.01em;box-shadow:0 1px 2px rgba(0,0,0,.16);padding:2px 3px;overflow:hidden}
      #planShell>.two-plan-highlight-layer .two-plan-highlight,#editPlanShell>.two-plan-highlight-layer .two-plan-highlight{font-size:clamp(6px,.72vw,12px)}
      .two-lens-highlight-viewport{position:absolute;inset:0;border-radius:50%;overflow:hidden;pointer-events:none;z-index:1}
      .two-lens-highlight-canvas{position:absolute;pointer-events:none;line-height:1}
      .two-lens-highlight-canvas .two-plan-highlight{font-size:17px;border-width:3px;padding:3px 5px}
      #lens .lens-badge{z-index:3}

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
    document.head.appendChild(style);
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
    if (card) {
      card.classList.add('two-impact-card', type === 'economic' ? 'two-impact-economic' : 'two-impact-client');
    }

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

  function enhanceDetail() {
    const zone = currentZone();
    const economic = zone?.economic ?? document.getElementById('detailEconomic')?.textContent ?? '';
    const client = zone?.client ?? document.getElementById('detailClient')?.textContent ?? '';
    renderImpactField('detailEconomic', economic, 'economic');
    renderImpactField('detailClient', client, 'client');
    ensurePlanButtons();
  }

  function mapSvg() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m15 5.1-6-2.1-6 2.1v15.8l6-2.1 6 2.1 6-2.1V3.1L15 5.1Zm-1 13.4-4-1.4V5.5l4 1.4v11.6Zm-9 .9V6.6l3-1.1v11.8l-3 1.1Zm14-2.1-3 1.1V6.6l3-1.1v11.8Z"/></svg>`;
  }

  function returnToPlan() {
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
      syncLensOverlay();
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

  function buildHighlight(parent, item) {
    const el = document.createElement('div');
    el.className = 'two-plan-highlight';
    el.textContent = item.label;
    el.style.left = `${item.x}%`;
    el.style.top = `${item.y}%`;
    el.style.width = `${item.w}%`;
    el.style.height = `${item.h}%`;
    parent.appendChild(el);
  }

  function ensurePlanHighlightLayer(shellId) {
    const shell = document.getElementById(shellId);
    if (!shell) return null;
    let layer = shell.querySelector(':scope > .two-plan-highlight-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'two-plan-highlight-layer';
      HIGHLIGHTS.forEach(item => buildHighlight(layer, item));
      shell.appendChild(layer);
    }
    return layer;
  }

  function ensureLensOverlay() {
    const lens = document.getElementById('lens');
    if (!lens) return null;
    let viewport = lens.querySelector('.two-lens-highlight-viewport');
    if (!viewport) {
      viewport = document.createElement('div');
      viewport.className = 'two-lens-highlight-viewport';
      const canvas = document.createElement('div');
      canvas.className = 'two-lens-highlight-canvas';
      HIGHLIGHTS.forEach(item => buildHighlight(canvas, item));
      viewport.appendChild(canvas);
      lens.insertBefore(viewport, lens.firstChild);
    }
    return viewport.querySelector('.two-lens-highlight-canvas');
  }

  function syncLensOverlay() {
    const shell = document.getElementById('planShell');
    const lens = document.getElementById('lens');
    const canvas = ensureLensOverlay();
    if (!shell || !lens || !canvas) return;
    const r = shell.getBoundingClientRect();
    if (!r.width || !r.height) return;

    let x = Number.parseFloat(lens.style.left);
    let y = Number.parseFloat(lens.style.top);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      const lr = lens.getBoundingClientRect();
      x = lr.left - r.left + lr.width / 2;
      y = lr.top - r.top + lr.height / 2;
    }

    canvas.style.width = `${r.width * LENS_ZOOM}px`;
    canvas.style.height = `${r.height * LENS_ZOOM}px`;
    canvas.style.left = `${-(x * LENS_ZOOM - lens.offsetWidth / 2)}px`;
    canvas.style.top = `${-(y * LENS_ZOOM - lens.offsetHeight / 2)}px`;
  }

  function patchZoomButtons() {
    const shell = document.getElementById('planShell');
    if (!shell) return;
    ['zoomMinus','zoomPlus'].forEach(id => {
      const button = document.getElementById(id);
      if (!button || button.dataset.twoZoomFixed) return;
      button.dataset.twoZoomFixed = '1';
      button.addEventListener('click', () => {
        requestAnimationFrame(() => {
          const value = Number.parseInt(document.getElementById('zoomTxt')?.textContent, 10) || 100;
          shell.style.setProperty('width', `${value}%`, 'important');
          shell.style.setProperty('min-width', value <= 100 ? '0' : '850px', 'important');
          syncLensOverlay();
        });
      });
    });
  }

  function installObservers() {
    try { window.__twoPhotoFitObserver?.disconnect?.(); } catch (_) {}

    if (typeof renderDetail === 'function' && !window.__twoImpactRenderWrapped) {
      const previous = renderDetail;
      window.renderDetail = function () {
        const result = previous.apply(this, arguments);
        requestAnimationFrame(enhanceDetail);
        setTimeout(enhanceDetail, 30);
        return result;
      };
      window.__twoImpactRenderWrapped = true;
    }

    const lens = document.getElementById('lens');
    const shell = document.getElementById('planShell');
    const observer = new MutationObserver(() => requestAnimationFrame(syncLensOverlay));
    if (lens) observer.observe(lens, { attributes: true, attributeFilter: ['style','class'] });
    if (shell) observer.observe(shell, { attributes: true, attributeFilter: ['style','class'] });
    window.addEventListener('resize', () => requestAnimationFrame(syncLensOverlay));
    lens?.addEventListener('pointermove', () => requestAnimationFrame(syncLensOverlay), { passive: true });

    const detailObserver = new MutationObserver(() => requestAnimationFrame(enhanceDetail));
    const detail = document.getElementById('detailView');
    if (detail) detailObserver.observe(detail, { childList: true, subtree: true });
  }

  addStyles();
  ensurePlanButtons();
  ensurePlanHighlightLayer('planShell');
  ensurePlanHighlightLayer('editPlanShell');
  ensureLensOverlay();
  patchZoomButtons();
  installObservers();
  enhanceDetail();
  requestAnimationFrame(syncLensOverlay);
  setTimeout(syncLensOverlay, 250);
})();
