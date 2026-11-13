// Bplace+ — éditeur de templates et bibliothèque de templates locaux
(() => {
  'use strict';
  if (window.__bplusEditorLoaded) return;
  window.__bplusEditorLoaded = true;

  const boot = () => {
    const A = window.__bplus;
    if (!A || !document.body) { setTimeout(boot, 300); return; }
    start(A);
  };
  boot();

  function start(A) {
    const { T, ICON, el } = A;
    const MAXS = 1024;
    const worldOf = (canvasType) => (canvasType === 'moon' ? 'moon' : 'earth');
    const typeOf = (world) => (world === 'moon' ? 'moon' : 'world');
    const uid = () => `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    /* ---------- boutons au style du site (mêmes classes Tailwind que bplace) ---------- */
    const PB = {
      base: 'relative inline-flex items-center justify-center overflow-hidden whitespace-nowrap font-black text-white border px-6 transition-all duration-150 ease-in-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 hover:brightness-105 active:brightness-95 active:translate-y-[1px] [&_svg]:shrink-0',
      blue: 'bg-[#3056ff] border-[#0900e0] font-bold shadow-[0px_2px_4px_0px_rgba(0,0,0,0.2)] hover:bg-[#3b72ff] hover:brightness-100 disabled:opacity-30',
      white: 'bg-white border-black/10 text-black font-bold shadow-[0px_2px_4px_0px_rgba(0,0,0,0.08)] hover:bg-[#f7f7f7] hover:brightness-100',
      neutral: 'bg-black/10 border-black/10 text-black/50 font-bold backdrop-blur-[10px] hover:bg-black/[0.08]',
      red: 'bg-[#ef2d2d] border-[#b30000] font-bold shadow-[0px_2px_4px_0px_rgba(0,0,0,0.2)] hover:bg-[#f44a4a] hover:brightness-100',
      sm: 'h-11 gap-1 text-[14px]', lg: 'h-12 gap-1.5 text-[16px]', pill: 'rounded-full', square: 'rounded-[12px]',
    };
    function pbtn(color, label, icon, opts = {}) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `${PB.base} ${PB[color]} ${PB[opts.size || 'sm']} ${PB[opts.shape || 'pill']} bpe-pb c-${color} ${opts.shape === 'square' ? 'sq' : ''} ${opts.cls || ''}`;
      b.innerHTML = `<span aria-hidden="true" class="bpe-pbhl ${opts.shape === 'square' ? 'sq' : ''}"></span>${icon || ''}<span class="bpe-pbt"></span>`;
      b.querySelector('.bpe-pbt').textContent = label;
      return b;
    }
    const IB = 'w-10 h-10 rounded-xl bg-black/[0.03] hover:bg-black/[0.06] flex items-center justify-center bpe-ib';

    /* ---------- icônes ---------- */
    const I = {
      pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/></svg>',
      eraser: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 20h12M5.5 13.5l7-7a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L11 18H8l-2.5-2.5a1.4 1.4 0 0 1 0-2z"/></svg>',
      fill: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11l7-7 7 7-7 7z"/><path d="M5 11h14"/><path d="M20 16s1.5 2 1.5 3a1.5 1.5 0 0 1-3 0c0-1 1.5-3 1.5-3z"/></svg>',
      picker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4l6 6M16 8l-9 9-3 1 1-3 9-9M13 5l6 6"/></svg>',
      line: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 19L19 5"/></svg>',
      rect: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="4" y="6" width="16" height="12" rx="1.5"/></svg>',
      ellipse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="12" rx="8" ry="6"/></svg>',
      select: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="3 3"><rect x="4" y="5" width="16" height="14" rx="1"/></svg>',
      lasso: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 15c-2.5-1-4-2.8-4-5 0-3.9 4-7 9-7s9 3.1 9 7-4 7-9 7c-1 0-2-.1-2.9-.4"/><circle cx="7.5" cy="17" r="2"/><path d="M7 19c0 1.5 1 2 2 2"/></svg>',
      wand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20L15 9M14 4v2M19 9h2M18 5l1-1M10 5l-1-1M20 13l-1-1"/></svg>',
      move: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/></svg>',
      pan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V12M14 11V6.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7c-2.5 0-4-1-5.5-3L3 15.5a1.5 1.5 0 0 1 2.3-2l2.7 2.5"/></svg>',
      undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
      redo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/></svg>',
      image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>',
      plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
      copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
      trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>',
      up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>',
      down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
      merge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10M12 8v8M8 12l4 4 4-4M5 20h14"/></svg>',
      eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
      eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4.4-1.1M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
      scale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="10" height="10" rx="1.5"/><path d="M14 3h7v7M21 3l-8 8"/></svg>',
      ref: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="13" height="13" rx="2" stroke-dasharray="2.5 2.5"/><rect x="8" y="3" width="13" height="13" rx="2"/><path d="M11 13l3-3 4 4"/></svg>',
      keys: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2.5"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/></svg>',
      rename: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16M6 16l9.5-9.5a2.1 2.1 0 0 1 3 3L9 19H6z"/></svg>',
      x: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M13.5 4.5l-9 9M4.5 4.5l9 9"/></svg>',
      dots: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
      crop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14M2 6h14a2 2 0 0 1 2 2v14"/></svg>',
      resize: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18"/></svg>',
      map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/></svg>',
      flipH: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="M8 7L3 12l5 5V7zM16 7l5 5-5 5V7z"/></svg>',
      flipV: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18"/><path d="M7 8l5-5 5 5H7zM7 16l5 5 5-5H7z"/></svg>',
      rotate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>',
      lock: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 10V8a5 5 0 0 1 10 0v2h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h1zm2 0h6V8a3 3 0 0 0-6 0v2z"/></svg>',
      send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
      box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10"/></svg>',
      dl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
      layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/></svg>',
      palette: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4a4.6 4.6 0 0 0 4.6-4.6C22 6 17.5 3 12 3z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="15" cy="7" r="1.2"/></svg>',
    };

    /* icônes des outils dans le style des icônes de bplace (comme l'épingle et l'étoile des favoris) :
       une seule teinte, dégradé transparent → opaque, reflet blanc, contour fin et bord blanc d'autocollant */
    const ic = (id, col, d, extra = '', rule = 'nonzero') => `<svg viewBox="-2 -2 28 28" fill="none" stroke-linejoin="round" stroke-linecap="round"><defs>`
      + `<linearGradient id="bpe-g-${id}" x1="11" y1="20" x2="16" y2="3" gradientUnits="userSpaceOnUse"><stop stop-color="${col}" stop-opacity=".1"/><stop offset=".64" stop-color="${col}" stop-opacity=".7"/><stop offset="1" stop-color="${col}"/></linearGradient>`
      + `<linearGradient id="bpe-h-${id}" x1="5.6" y1="17.2" x2="17.5" y2="5" gradientUnits="userSpaceOnUse"><stop stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>`
      + `<path d="${d}" fill="#fff" fill-rule="${rule}" stroke="#fff" stroke-width="3.5"/><path d="${d}" fill="url(#bpe-g-${id})" fill-rule="${rule}"/>`
      + `<path d="${d}" fill="url(#bpe-h-${id})" fill-rule="${rule}" opacity=".55"/><path d="${d}" stroke="${col}" stroke-width="1.3"/>`
      + (extra ? `<g stroke="${col}" stroke-width="1.2" opacity=".75">${extra}</g>` : '') + '</svg>';
    const C = {
      pencil: ic('pc', '#F59E0B', 'M15.2 3.6a2.4 2.4 0 0 1 3.4 0l1.8 1.8a2.4 2.4 0 0 1 0 3.4L9 20.2l-5.2 1.1a.9.9 0 0 1-1.1-1.1L3.8 15z', '<path d="M13.4 5.4l5.2 5.2M3.8 15l5.2 5.2"/>'),
      eraser: ic('er', '#F43F5E', 'M3.5 14.6l9.1-9.1a2.4 2.4 0 0 1 3.4 0l3.5 3.5a2.4 2.4 0 0 1 0 3.4l-8.1 8.1H7.8l-4.3-4.3a1.1 1.1 0 0 1 0-1.6z', '<path d="M8 10.1l6.4 6.4M14.5 20.5h6"/>'),
      fill: ic('fl', '#10ABFF', 'M11.2 2.9l8.3 8.3a1.2 1.2 0 0 1 0 1.7l-6.6 6.6a2.4 2.4 0 0 1-3.4 0l-5.5-5.5a2.4 2.4 0 0 1 0-3.4zM20.6 15s2.1 2.5 2.1 3.9a2.1 2.1 0 0 1-4.2 0c0-1.4 2.1-3.9 2.1-3.9z', '<path d="M4.4 11.4h15.3"/>'),
      picker: ic('pk', '#8B5CF6', 'M14.3 3.4a2.6 2.6 0 0 1 3.7 0l2.3 2.3a2.6 2.6 0 0 1 0 3.7l-2 2 .7.7a1 1 0 0 1-1.4 1.4l-.7-.7-7.3 7.3a2 2 0 0 1-1 .55l-3 .7a.9.9 0 0 1-1.1-1.1l.7-3a2 2 0 0 1 .55-1l7.3-7.3-.7-.7a1 1 0 0 1 1.4-1.4l.7.7z', '<path d="M8.4 12.6h5.6"/>'),
      line: ic('ln', '#3056FF', 'M7.6 14.3l6.7-6.7a3.2 3.2 0 1 1 2.1 2.1l-6.7 6.7a3.2 3.2 0 1 1-2.1-2.1z'),
      rect: ic('rc', '#10B981', 'M6.5 4.5h11a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3z'),
      ellipse: ic('el', '#F97316', 'M12 4.5c5 0 9 3.4 9 7.5s-4 7.5-9 7.5-9-3.4-9-7.5 4-7.5 9-7.5z'),
      select: ic('sl', '#3056FF', 'M3 6.5a2 2 0 0 1 2-2h3v2H5v3H3zM16 4.5h3a2 2 0 0 1 2 2v3h-2v-3h-3zM21 14.5v3a2 2 0 0 1-2 2h-3v-2h3v-3zM8 19.5H5a2 2 0 0 1-2-2v-3h2v3h3zM10.5 4.5h3v2h-3zM10.5 17.5h3v2h-3zM3 10.5h2v3H3zM19 10.5h2v3h-2z'),
      lasso: ic('ls', '#A855F7', 'M13 3.4c4.7 0 8.5 2.8 8.5 6.2s-3.8 6.2-8.5 6.2-8.5-2.8-8.5-6.2S8.3 3.4 13 3.4zM13 6c-3.3 0-5.9 1.6-5.9 3.6s2.6 3.6 5.9 3.6 5.9-1.6 5.9-3.6S16.3 6 13 6z', '<path d="M7.4 13.8c-1.9 1.3-1.8 3.5.2 3.8 1.5.2 1.9 1.7.9 3.4"/>', 'evenodd'),
      wand: ic('wd', '#EAB308', 'M16.5 1.5l1.5 3.2 3.5.5-2.5 2.4.6 3.5-3.1-1.7-3.1 1.7.6-3.5-2.5-2.4 3.5-.5zM11.9 10.6l1.5 1.5-8.6 8.6a1.06 1.06 0 0 1-1.5-1.5z'),
      move: ic('mv', '#3056FF', 'M12 1.8l3.4 3.4h-2.2v5.6h5.6V8.6l3.4 3.4-3.4 3.4v-2.2h-5.6v5.6h2.2L12 22.2l-3.4-3.4h2.2v-5.6H5.2v2.2L1.8 12l3.4-3.4v2.2h5.6V5.2H8.6z'),
      pan: ic('hd', '#EC4899', 'M8 12.5V6a1.5 1.5 0 0 1 3 0v5V4.5a1.5 1.5 0 0 1 3 0V11V5.5a1.5 1.5 0 0 1 3 0V11V8a1.5 1.5 0 0 1 3 0v6.5a7 7 0 0 1-7 7h-1.2a6 6 0 0 1-4.6-2.2L3.6 15.2a1.6 1.6 0 0 1 2.4-2.1z', '<path d="M11 11V8.5M14 11V8M17 11V9.5"/>'),
      palette: ic('pl', '#F59E0B', 'M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4a4.6 4.6 0 0 0 4.6-4.6C22 6 17.5 3 12 3z', '<circle cx="7.5" cy="11" r="1.3"/><circle cx="10" cy="7" r="1.3"/><circle cx="15" cy="7" r="1.3"/>'),
      brush: ic('bs', '#EC4899', 'M19.6 2.6a1.9 1.9 0 0 1 2.7 2.7l-8.6 9.4-3.4-3.4zM9.2 12.4l3.4 3.4-.6 1.4c-.9 2.2-3 3.7-5.4 3.7H3.2a.6.6 0 0 1-.5-.9c.8-1.3 1-2.6 1.3-3.9.5-2.4 2.6-4.2 5.2-3.7z', '<path d="M11 13.6l2.4 2.4"/>'),
      text: ic('tx', '#0EA5E9', 'M5 3.5h14a1.5 1.5 0 0 1 1.5 1.5v3a1 1 0 0 1-2 0V5.5h-5.5v13H15a1 1 0 0 1 0 2H9a1 1 0 0 1 0-2h2V5.5H5.5V8a1 1 0 0 1-2 0V5A1.5 1.5 0 0 1 5 3.5z'),
      colorsel: ic('cs', '#06B6D4', 'M5 3.5h3v2H5.5v2.5h-2V5A1.5 1.5 0 0 1 5 3.5zM11 3.5h3v2h-3zM17 3.5h2A1.5 1.5 0 0 1 20.5 5v3h-2V5.5H17zM3.5 11h2v3h-2zM15.5 10.5c0 0 5 5.2 5 8.2a5 5 0 0 1-10 0c0-3 5-8.2 5-8.2zM3.5 17h2v1.5H8v2H5A1.5 1.5 0 0 1 3.5 19z'),
      gradient: ic('gr', '#8B5CF6', 'M6.5 3.5h11a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3v-11a3 3 0 0 1 3-3z', '<path d="M8 3.6v16.8M12.5 3.6v16.8M16.5 3.6v16.8" stroke-dasharray="1.6 1.6"/>'),
      refs: ic('rf', '#14B8A6', 'M8.5 2.5h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2zM2.5 8.5a2 2 0 0 1 2-2v9a4 4 0 0 0 4 4h9a2 2 0 0 1-2 2h-9a4 4 0 0 1-4-4z', '<path d="M9.5 14l3-3.5 2.2 2.3 1.6-1.6 2.2 2.8"/><circle cx="16.5" cy="6.8" r="1.1"/>'),
      layers: ic('ly', '#3056FF', 'M12 3l9 5-9 5-9-5zM3.6 12.9l8.4 4.7 8.4-4.7 1.1.6c.5.3.5 1 0 1.3L12.6 20a1.2 1.2 0 0 1-1.2 0l-8.9-5.2c-.5-.3-.5-1 0-1.3z'),
    };
    // pointes du crayon
    const BR = {
      square: '<svg viewBox="0 0 16 16"><rect x="3" y="3" width="10" height="10" rx="1" fill="currentColor"/></svg>',
      round: '<svg viewBox="0 0 16 16"><path d="M6 2h4v1h2v1h1v2h1v4h-1v2h-1v1h-2v1H6v-1H4v-1H3v-2H2V6h1V4h1V3h2z" fill="currentColor"/></svg>',
      pp: '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="2" y="11" width="3" height="3"/><rect x="5" y="8" width="3" height="3"/><rect x="8" y="5" width="3" height="3"/><rect x="11" y="2" width="3" height="3"/></svg>',
      dither: '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="2" y="2" width="3" height="3"/><rect x="8" y="2" width="3" height="3"/><rect x="5" y="5" width="3" height="3"/><rect x="11" y="5" width="3" height="3"/><rect x="2" y="8" width="3" height="3"/><rect x="8" y="8" width="3" height="3"/><rect x="5" y="11" width="3" height="3"/><rect x="11" y="11" width="3" height="3"/></svg>',
      spray: '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="7" y="2" width="2" height="2"/><rect x="3" y="4" width="2" height="2"/><rect x="11" y="5" width="2" height="2"/><rect x="6" y="7" width="2" height="2"/><rect x="2" y="9" width="2" height="2"/><rect x="10" y="9" width="2" height="2"/><rect x="5" y="12" width="2" height="2"/><rect x="12" y="12" width="2" height="2"/></svg>',
    };

    /* ---------- couleurs du jeu ---------- */
    const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    function palette() {
      const all = A.baseColors() || [];
      const mine = A.paletteSet('unlocked');
      const ok = mine ? new Set(mine.map((c) => c.hex_value.toLowerCase())) : null;
      const owned = A.ownedPalettes ? A.ownedPalettes() : null;
      const seen = new Set(), out = [];
      for (const c of all) {
        const hex = c.hex_value.toLowerCase();
        if (seen.has(hex)) continue;
        seen.add(hex);
        const fx = specialOf(c);
        let locked = ok ? !ok.has(hex) : false;
        // couleurs animées : seulement si le pack spécial est vraiment débloqué
        if (fx) {
          const keys = [c.palette, c.unlockKey, `special_${fx.replace(/-/g, '_')}`].filter(Boolean);
          locked = !(owned && keys.some((k) => owned.has(k)));
        }
        out.push({ hex, rgb: hexRgb(hex), name: c.name || hex, locked, fx, pack: fx ? '__special' : (c.palette || '') });
      }
      return out;
    }
    // couleurs animées du jeu (mêmes dégradés que les classes *-shimmer de bplace)
    const SPECIAL = { '#ca8f22': 'gold', '#7f7f7f': 'silver', '#cfaeff': 'holographic', '#191026': 'dark-holographic', '#b9a8e0': 'prism', '#2a0a4e': 'spectre', '#0b2f80': 'ocean', '#8c2a05': 'fire' };
    const FX = {
      gold: [3, ['#CA8F22', 0], ['#CA8F22', .1], ['#D4A540', .25], ['#E5C077', .4], ['#E5C077', .6], ['#D4A540', .75], ['#CA8F22', .9], ['#CA8F22', 1]],
      silver: [3, ['#7F7F7F', 0], ['#7F7F7F', .1], ['#9F9F9F', .25], ['#BFBFBF', .4], ['#BFBFBF', .6], ['#9F9F9F', .75], ['#7F7F7F', .9], ['#7F7F7F', 1]],
      holographic: [4, ['#CFAEFF', 0], ['#CFAEFF', .08], ['#FFC6DF', .2], ['#FFF3D1', .35], ['#CCFFED', .5], ['#B6EAFF', .65], ['#CFAEFF', .8], ['#CFAEFF', 1]],
      'dark-holographic': [4, ['#191026', 0], ['#191026', .08], ['#67000E', .2], ['#765800', .35], ['#006F1F', .5], ['#002699', .65], ['#191026', .8], ['#191026', 1]],
      prism: [4, ['#FC6A86', 0], ['#E241C4', .12], ['#A148F5', .25], ['#607CFC', .37], ['#45BED5', .5], ['#60E797', .62], ['#A1E066', .75], ['#E2AC5F', .87], ['#FC6A86', 1]],
      spectre: [3, ['#2A0A4E', 0], ['#2A0A4E', .1], ['#5A2A9E', .25], ['#9E3DFF', .4], ['#E6C7FF', .5], ['#9E3DFF', .6], ['#5A2A9E', .75], ['#2A0A4E', .9], ['#2A0A4E', 1]],
      ocean: [3, ['#0B2F80', 0], ['#0B2F80', .1], ['#2A78D6', .25], ['#4DC7FF', .4], ['#E0FAFF', .5], ['#4DC7FF', .6], ['#2A78D6', .75], ['#0B2F80', .9], ['#0B2F80', 1]],
      fire: [3, ['#8C2A05', 0], ['#8C2A05', .1], ['#E63808', .25], ['#FFA81A', .4], ['#FFEDA0', .5], ['#FFA81A', .6], ['#E63808', .75], ['#8C2A05', .9], ['#8C2A05', 1]],
    };
    /* même calcul que le shader de bplace (types 2, 6, 7, 8, 10-13), pixel par pixel
       g = position du pixel sur la carte, t = temps en secondes ; renvoie [r, g, b] entre 0 et 1 */
    const FXK = (() => {
      const FXS = 2.5;
      const fract = (v) => v - Math.floor(v);
      const mix = (a, b, k) => a + (b - a) * k;
      const sstep = (e0, e1, v) => { const k = Math.min(1, Math.max(0, (v - e0) / (e1 - e0))); return k * k * (3 - 2 * k); };
      const mix3 = (a, b, k) => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];
      const hash21 = (ix, iy) => { const qx = Math.imul(ix, 1597334673) >>> 0, qy = Math.imul(iy, 3812015801) >>> 0; return (Math.imul((qx ^ qy) >>> 0, 1597334673) >>> 0) / 4294967295; };
      const vnoise = (px, py) => {
        const ix = Math.floor(px), iy = Math.floor(py); let fx = px - ix, fy = py - iy;
        fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
        return mix(mix(hash21(ix, iy), hash21(ix + 1, iy), fx), mix(hash21(ix, iy + 1), hash21(ix + 1, iy + 1), fx), fy);
      };
      const warp = (x, y, k) => [x + Math.sin(y * 0.9 + k) * 0.35, y + Math.sin(x * 0.8 - k * 0.9) * 0.35];
      const rotA = (x, y) => [0.8018 * x + 0.5976 * y, -0.5976 * x + 0.8018 * y];
      const rotB = (x, y) => [0.6235 * x - 0.7818 * y, 0.7818 * x + 0.6235 * y];
      const pal = (t, a, b, c, d) => [0, 1, 2].map((i) => a[i] + b[i] * Math.cos(6.2831853 * (c[i] * t + d[i])));
      const flow = (gx, gy, t) => {
        const px = gx * FXS, py = gy * FXS;
        const w = warp(px * 0.034 + t * 0.55, py * 0.034 - t * 0.38, t * 0.5);
        const r = rotA(w[0], w[1]);
        return vnoise(r[0], r[1]) + 0.12 * Math.sin((px - py) * 0.02 + t * 1.4) + fract(t * 0.40);
      };
      const cyc = (cols, gx, gy, t) => {
        const wave = (gx + gy) * 0.02, idx = fract((t + wave) / 2) * 5, seg = Math.floor(idx), k0 = idx - seg, k = k0 * k0 * (3 - 2 * k0);
        return mix3(cols[seg % 5], cols[(seg + 1) % 5], k);
      };
      const hx = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
      const HOLO = ['#CFAEFF', '#FFC6DF', '#FFF3D1', '#CCFFED', '#B6EAFF'].map(hx), DARK = ['#191026', '#67000E', '#765800', '#006F1F', '#002699'].map(hx);
      const GOLD = hx('#CA8F22'), SILVER = hx('#7F7F7F');
      return {
        gold: (gx, gy, t) => mix3(GOLD, [1, 0.95, 0.8], sstep(0.5, 1, Math.sin((gx + gy) * 0.02 + t * 2.5)) * 0.5),
        silver: (gx, gy, t) => mix3(SILVER, [1, 1, 1], sstep(0.5, 1, Math.sin((gx + gy) * 0.02 + t * 2.5)) * 0.5),
        holographic: (gx, gy, t) => cyc(HOLO, gx, gy, t),
        'dark-holographic': (gx, gy, t) => cyc(DARK, gx, gy, t),
        prism: (gx, gy, t) => pal(flow(gx, gy, t), [0.63, 0.58, 0.68], [0.36, 0.34, 0.32], [1, 1, 1], [0, 0.33, 0.67]),
        spectre: (gx, gy, t) => {
          const pulse = Math.sin(t * 2.2);
          const q = warp(gx * FXS * 0.038, gy * FXS * 0.038, t * 0.45);
          const a = rotA(q[0] - t * 0.35, q[1] + t * 0.28), b = rotB(q[0] * 2.1 + t * 0.62, q[1] * 2.1 + t * 0.44);
          const v = vnoise(a[0], a[1]) * 0.62 + vnoise(b[0] + 17, b[1] + 17) * 0.38;
          const k = sstep(0.10 + 0.16 * pulse, 0.92, v);
          return mix3(mix3([0.10, 0.02, 0.22], [0.62, 0.24, 1.0], k), [0.90, 0.78, 1.0], k * k * k * 0.5);
        },
        ocean: (gx, gy, t) => {
          const px = gx * FXS, py = gy * FXS;
          const wv = Math.sin(py * 0.052 - t * 1.9 + Math.sin(px * 0.028 + t * 0.8) * 0.9) * 0.5 + 0.5, w4 = wv ** 4;
          return mix3(mix3([0.02, 0.09, 0.40], [0.30, 0.78, 1.0], wv), [0.88, 0.98, 1.0], w4 * wv * 0.6);
        },
        fire: (gx, gy, t) => {
          const u = Math.abs(fract(flow(gx, gy, t)) * 2 - 1);
          let c = mix3([0.30, 0.03, 0.02], [0.90, 0.22, 0.03], sstep(0, 0.40, u));
          c = mix3(c, [1.0, 0.66, 0.10], sstep(0.35, 0.72, u));
          return mix3(c, [1.0, 0.93, 0.62], sstep(0.74, 0.97, u));
        },
      };
    })();
    // pastilles : les 4 premiers effets ont un dégradé CSS sur bplace, les 4 autres sont dessinés comme sur le site
    const FX_DRAWN = new Set(['prism', 'spectre', 'ocean', 'fire']);
    const fxSwatches = new Set();
    function fxSwatch(fx) {
      const c = makeCanvas(16, 16); c.className = 'bpe-fxc'; c.dataset.fx = fx;
      fxSwatches.add(c); return c;
    }
    let fxSwT = 0;
    function fxSwatchTick() {
      const now = performance.now(); if (now - fxSwT < 50) return; fxSwT = now;
      const t = now / 1000;
      for (const c of fxSwatches) {
        if (!c.isConnected) { fxSwatches.delete(c); continue; }
        const f = FXK[c.dataset.fx], x = c.getContext('2d'), im = x.createImageData(16, 16);
        for (let y = 0; y < 16; y++) for (let k = 0; k < 16; k++) {
          const v = f((k + 0.5) / FXS_CARD, (y + 0.5) / FXS_CARD, t), o = (y * 16 + k) * 4;
          im.data[o] = v[0] * 255; im.data[o + 1] = v[1] * 255; im.data[o + 2] = v[2] * 255; im.data[o + 3] = 255;
        }
        x.putImageData(im, 0, 0);
      }
    }
    const FXS_CARD = 2.5; // sur le site, les effets ont été réglés sur un cœur de 16 pixels
    setInterval(() => { if (fxSwatches.size) fxSwatchTick(); }, 60);
    function specialOf(c) {
      const k = SPECIAL[String(c.hex_value).toLowerCase()];
      if (!k) return null;
      const tag = `${c.palette || ''} ${c.unlockKey || ''} ${c.name || ''}`;
      if (k === 'silver' && !/silver|special|argent|metal/i.test(tag)) return null;
      return k;
    }
    function nearest(pal, r, g, b) {
      let best = pal[0], bd = Infinity;
      for (const p of pal) {
        const dr = r - p.rgb[0], dg = g - p.rgb[1], db = b - p.rgb[2];
        const rm = (r + p.rgb[0]) / 2;
        const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
        if (d < bd) { bd = d; best = p; }
      }
      return best;
    }
    function quantize(img, pal) {
      if (!pal.length) return img;
      const d = img.data, cache = new Map();
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 128) { d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0; continue; }
        const key = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
        let p = cache.get(key);
        if (!p) { p = nearest(pal, d[i], d[i + 1], d[i + 2]); cache.set(key, p); }
        d[i] = p.rgb[0]; d[i + 1] = p.rgb[1]; d[i + 2] = p.rgb[2]; d[i + 3] = 255;
      }
      return img;
    }

    /* ---------- bibliothèque locale (IndexedDB) ---------- */
    let dbP = null;
    function db() {
      if (!dbP) dbP = new Promise((res, rej) => {
        const rq = indexedDB.open('bplus_local', 1);
        rq.onupgradeneeded = () => { rq.result.createObjectStore('templates', { keyPath: 'id' }); };
        rq.onsuccess = () => res(rq.result);
        rq.onerror = () => rej(rq.error);
      });
      return dbP;
    }
    const reqP = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const store = async (mode) => (await db()).transaction('templates', mode).objectStore('templates');
    const lib = {
      all: async () => reqP((await store('readonly')).getAll()),
      get: async (id) => reqP((await store('readonly')).get(id)),
      put: async (e) => reqP((await store('readwrite')).put(e)),
      del: async (id) => reqP((await store('readwrite')).delete(id)),
    };
    const libListeners = new Set();
    const libChanged = () => libListeners.forEach((f) => f());

    const canvasBlob = (c) => new Promise((res) => c.toBlob(res, 'image/png'));
    const blobURL = (b) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });
    const loadImg = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
    async function blobImg(b) { const u = URL.createObjectURL(b); const im = await loadImg(u); URL.revokeObjectURL(u); return im; }
    function makeCanvas(w, h, data) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      if (data) c.getContext('2d').putImageData(new ImageData(data, w, h), 0, 0);
      return c;
    }

    /* ---------- toast ---------- */
    function toast(msg, kind = '') {
      const t = el('div', `bpc bpe-toast ${kind}`);
      t.textContent = msg;
      document.body.appendChild(t);
      requestAnimationFrame(() => t.classList.add('in'));
      setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 300); }, 2600);
    }

    /* ---------- site : envoyer / ranger ---------- */
    async function activate(entry) {
      const ctx = A.siteTemplates();
      if (!ctx) { toast(T('mapMissing'), 'err'); return null; }
      if (ctx.templates.length >= (ctx.maxTemplates || 10)) { toast(T('edFull'), 'err'); return null; }
      const url = await blobURL(entry.png);
      const t = await ctx.addTemplate({
        name: entry.name, imageData: url, opacity: 1, position: { x: entry.x, y: entry.y }, scale: 1, rotation: 0, visible: true,
        width: entry.w, height: entry.h, displayMode: 'image', renderAbovePixels: true, canvasType: typeOf(entry.world),
        showTemplateColorsOnly: true, highlightSelectedColor: true, useUnlockedColorsOnly: false, excludeSpecialColors: false,
      });
      if (t && t.id) { entry.siteId = t.id; await lib.put(entry); libChanged(); }
      A.playSound('favOn');
      toast(T('edSentSite'), 'ok');
      return t;
    }
    async function siteToCanvas(t) {
      const im = await A.siteTemplateImage(t);
      if (!im) return null;
      const scale = t.scale || 1, exact = !t.rotation;
      const w = exact ? Math.max(1, Math.round(t.width * scale)) : t.width;
      const h = exact ? Math.max(1, Math.round(t.height * scale)) : t.height;
      if (w > MAXS * 2 || h > MAXS * 2) return null;
      const c = makeCanvas(w, h), g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.drawImage(im, 0, 0, w, h);
      const cx = t.position.x + t.width / 2, cy = t.position.y + t.height / 2;
      return { canvas: c, x: Math.round(cx - w / 2), y: Math.round(cy - h / 2) };
    }
    async function stash(t) {
      const ctx = A.siteTemplates();
      if (!ctx) return;
      const sc = await siteToCanvas(t);
      if (!sc) { toast(T('edTooBig'), 'err'); return; }
      const g = sc.canvas.getContext('2d'), pal0 = palette();
      const d = g.getImageData(0, 0, sc.canvas.width, sc.canvas.height); quantize(d, pal0); g.putImageData(d, 0, 0);
      const png = await canvasBlob(sc.canvas);
      let entry = (await lib.all()).find((e) => e.siteId === t.id);
      if (!entry) entry = { id: uid(), createdAt: Date.now(), layers: null };
      Object.assign(entry, { name: t.name, world: worldOf(t.canvasType), x: sc.x, y: sc.y, w: sc.canvas.width, h: sc.canvas.height, png, siteId: null, updatedAt: Date.now() });
      if (entry.layersW !== entry.w || entry.layersH !== entry.h) entry.layers = null;
      await lib.put(entry);
      await ctx.deleteTemplate(t.id);
      libChanged();
      A.playSound('favOff');
      toast(T('edStashed'), 'ok');
    }
    /* ---------- fichier .bplus : un dessin de l'éditeur avec tous ses calques, à partager ----------
       { format: 'bplus', version: 1, name, world, x, y, w, h, layers: [{ name, visible, opacity, png (data URL) }] } */
    const isBplus = (f) => /\.bplus$/i.test((f && f.name) || '');
    // couleur du jeu la plus proche (distance « redmean »), avec cache
    function makeNear(list, withLocked) {
      const cols = list.filter((p) => (withLocked || !p.locked) && !p.fx && p.rgb), cache = new Map();
      return (r, g2, b2) => {
        r = Math.max(0, Math.min(255, Math.round(r))); g2 = Math.max(0, Math.min(255, Math.round(g2))); b2 = Math.max(0, Math.min(255, Math.round(b2)));
        const key = (r << 16) | (g2 << 8) | b2;
        let best = cache.get(key); if (best !== undefined) return best;
        let bd = Infinity; best = null;
        for (const p of cols) {
          const rm = (r + p.rgb[0]) / 2, dr = r - p.rgb[0], dg = g2 - p.rgb[1], db = b2 - p.rgb[2];
          const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
          if (d < bd) { bd = d; best = p; }
        }
        if (cache.size > 60000) cache.clear();
        cache.set(key, best);
        return best;
      };
    }
    // image finale : un calque normal recouvre ce qu'il y a dessous ; un calque avec un mode de fusion
    // se mélange à ce qu'il recouvre (selon son opacité) et le résultat est ramené aux couleurs du jeu
    function flattenLayers(layers, w, h, near) {
      const out = new Uint8ClampedArray(w * h * 4), vis = layers.filter((l) => l.visible !== false && (l.opacity == null || l.opacity > 0));
      const anyMode = vis.some((l) => l.mode && l.mode !== 'normal');
      if (anyMode && !near) near = makeNear(palette());
      for (let i = 0; i < out.length; i += 4) {
        if (!anyMode) { for (let k = vis.length - 1; k >= 0; k--) { const d = vis[k].data; if (d[i + 3]) { out[i] = d[i]; out[i + 1] = d[i + 1]; out[i + 2] = d[i + 2]; out[i + 3] = 255; break; } } continue; }
        let has = false, r = 0, g2 = 0, b2 = 0;
        for (const L of vis) {
          const d = L.data; if (!d[i + 3]) continue;
          const mode = L.mode || 'normal';
          if (mode === 'normal' || !has) { r = d[i]; g2 = d[i + 1]; b2 = d[i + 2]; has = true; continue; }
          const m = blendRgb(mode, [r, g2, b2], [d[i], d[i + 1], d[i + 2]]), k = L.opacity == null ? 1 : L.opacity;
          const c = near(r + (m[0] - r) * k, g2 + (m[1] - g2) * k, b2 + (m[2] - b2) * k);
          if (c) { r = c.rgb[0]; g2 = c.rgb[1]; b2 = c.rgb[2]; }
        }
        if (has) { out[i] = r; out[i + 1] = g2; out[i + 2] = b2; out[i + 3] = 255; }
      }
      return out;
    }
    async function encodeBplus(doc) {
      const layers = [];
      for (const L of doc.layers) layers.push({ name: L.name, visible: L.visible !== false, opacity: L.opacity == null ? 1 : L.opacity, mode: L.mode || 'normal', lockA: !!L.lockA, png: await blobURL(await canvasBlob(makeCanvas(doc.w, doc.h, new Uint8ClampedArray(L.data)))) });
      const file = { format: 'bplus', version: 1, app: 'Bplace+', exportedAt: new Date().toISOString(), name: doc.name, world: doc.world, x: doc.x, y: doc.y, w: doc.w, h: doc.h, layers };
      return new Blob([JSON.stringify(file)], { type: 'application/octet-stream' });
    }
    async function decodeBplus(f) {
      let j = null;
      try { j = JSON.parse(await f.text()); } catch (e) { return null; }
      if (!j || j.format !== 'bplus' || !Array.isArray(j.layers) || !j.layers.length) return null;
      const w = Math.round(+j.w), h = Math.round(+j.h);
      if (!(w >= 1 && h >= 1 && w <= MAXS && h <= MAXS) || j.layers.length > 64) return null;
      const pal = palette(), layers = [];
      for (const l of j.layers) {
        if (typeof l.png !== 'string' || !/^data:image\/png;base64,/.test(l.png)) continue;
        const im = await loadImg(l.png); if (!im) continue;
        const c = makeCanvas(w, h), g = c.getContext('2d'); g.drawImage(im, 0, 0);
        const d = g.getImageData(0, 0, w, h); quantize(d, pal);
        layers.push({ name: String(l.name || T('edLayer')).slice(0, 40), visible: l.visible !== false, opacity: Math.max(0, Math.min(1, +l.opacity || (l.opacity === 0 ? 0 : 1))), mode: BR_BLENDS.includes(l.mode) ? l.mode : 'normal', lockA: !!l.lockA, data: new Uint8ClampedArray(d.data) });
      }
      if (!layers.length) return null;
      return { name: String(j.name || T('edUntitled')).slice(0, 80), world: j.world === 'moon' ? 'moon' : 'earth', x: Math.round(+j.x) || 0, y: Math.round(+j.y) || 0, w, h, layers };
    }
    async function addBplus(f, openAfter) {
      const doc = await decodeBplus(f);
      if (!doc) { toast(T('edBadFile'), 'err'); return null; }
      const png = await canvasBlob(makeCanvas(doc.w, doc.h, flattenLayers(doc.layers, doc.w, doc.h)));
      const entry = { id: uid(), name: doc.name, world: doc.world, x: doc.x, y: doc.y, w: doc.w, h: doc.h, png, layers: doc.layers, layersW: doc.w, layersH: doc.h, siteId: null, createdAt: Date.now(), updatedAt: Date.now() };
      await lib.put(entry);
      libChanged();
      A.playSound('favOn');
      toast(T('edAdded'), 'ok');
      if (openAfter) open({ kind: 'local', libId: entry.id });
      return entry;
    }
    async function downloadBplus(doc) {
      const name = ((doc.name || 'dessin').replace(/[\\/:*?"<>|]/g, '_').trim() || 'dessin').slice(0, 80);
      A.downloadBlob(await encodeBplus(doc), `${name}.bplus`);
    }
    /* ======================================================================
       PINCEAUX : format .bplusbrush, pinceaux perso, import Krita (.kpp, .gbr) et images
       ====================================================================== */
    const BR_PATTERNS = ['none', 'dither', 'dither2', 'dots', 'hlines', 'vlines', 'diag'];
    const BR_BLENDS = ['normal', 'add', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color'];
    const BR_EDGES = ['none', 'second', 'dark', 'light'];
    // fusion de deux couleurs (0-255), comme les modes de Krita
    const rgb2hsl = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; if (mx === mn) return [0, 0, l]; const d = mx - mn, s2 = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h / 6, s2, l]; };
    const hsl2rgb = (h, s2, l) => { if (!s2) return [l * 255, l * 255, l * 255]; const q = l < 0.5 ? l * (1 + s2) : l + s2 - l * s2, p2 = 2 * l - q; const f = (t) => { t = (t + 1) % 1; return 255 * (t < 1 / 6 ? p2 + (q - p2) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p2 + (q - p2) * (2 / 3 - t) * 6 : p2); }; return [f(h + 1 / 3), f(h), f(h - 1 / 3)]; };
    function blendRgb(mode, b, c) {
      switch (mode) {
        case 'add': return [Math.min(255, b[0] + c[0]), Math.min(255, b[1] + c[1]), Math.min(255, b[2] + c[2])];
        case 'multiply': return [b[0] * c[0] / 255, b[1] * c[1] / 255, b[2] * c[2] / 255];
        case 'screen': return b.map((v, i) => 255 - (255 - v) * (255 - c[i]) / 255);
        case 'overlay': return b.map((v, i) => (v < 128 ? 2 * v * c[i] / 255 : 255 - 2 * (255 - v) * (255 - c[i]) / 255));
        case 'darken': return b.map((v, i) => Math.min(v, c[i]));
        case 'lighten': return b.map((v, i) => Math.max(v, c[i]));
        case 'color': { const hb = rgb2hsl(...b), hc = rgb2hsl(...c); return hsl2rgb(hc[0], hc[1], hb[2]); }
        default: return c;
      }
    }
    /* ---------- texte en pixels : deux polices bitmap (3×5, 5×7) et les polices du système passées en pixels ---------- */
    const FONT5 = '000000000000005f00000007000700147f147f14242a7f2a12231308646236495522500005030000001c2241000041221c00082a1c2a0808083e080800503000000808080808006060000020100804023e5149453e00427f400042615149462141454b311814127f1027454545393c4a49493001710905033649494936064949291e003636000000563600000814224100141414141400412214080201510906324979413e7e1111117e7f494949363e414141227f4141221c7f494949417f090909013e4149497a7f0808087f00417f41002040413f017f081422417f404040407f020c027f7f0408107f3e4141413e7f090909063e4151215e7f09192946464949493101017f01013f4040403f1f2040201f3f4038403f631408146307087008076151494543007f41410002040810200041417f0004020102044040404040000102040020545454787f484444383844444420384444487f3854545418087e0901020c5252523e7f0804047800447d40002040443d007f1028440000417f40007c041804787c0804047838444444387c14141408081414187c7c080404084854545420043f4440203c4040207c1c2040201c3c4030403c44281028440c5050503c4464544c44000836410000007f000000413608000804081008';
    const FONT3 = {"A": "010101111101101", "B": "110101110101110", "C": "011100100100011", "D": "110101101101110", "E": "111100110100111", "F": "111100110100100", "G": "011100101101011", "H": "101101111101101", "I": "111010010010111", "J": "001001001101010", "K": "101101110101101", "L": "100100100100111", "M": "101111111101101", "N": "110101101101101", "O": "010101101101010", "P": "110101110100100", "Q": "010101101110011", "R": "110101110101101", "S": "011100010001110", "T": "111010010010010", "U": "101101101101111", "V": "101101101101010", "W": "101101111111101", "X": "101101010101101", "Y": "101101010010010", "Z": "111001010100111", "0": "111101101101111", "1": "010110010010111", "2": "110001010100111", "3": "110001010001110", "4": "101101111001001", "5": "111100110001110", "6": "011100111101111", "7": "111001010010010", "8": "111101111101111", "9": "111101111001110", ".": "000000000000010", ",": "000000000010100", "!": "010010010000010", "?": "110001010000010", ":": "000010000010000", ";": "000010000010100", "-": "000000111000000", "+": "000010111010000", "'": "010010000000000", "\"": "101101000000000", "(": "001010010010001", ")": "100010010010100", "/": "001001010100100", "=": "000111000111000", "_": "000000000000111", "#": "101111101111101", "%": "101001010100101", "&": "010101010101011", "*": "000101010101000", "<": "001010100010001", ">": "100010001010100", "[": "011010010010011", "]": "110010010010110", "@": "111101111100011", "$": "011110010011110", "^": "010101000000000"};
    const TEXT_FONTS = [
      ['mini', 'Pixel 3×5', 'bitmap'], ['classic', 'Pixel 5×7', 'bitmap'],
      ['Arial, Helvetica, sans-serif', 'Arial', 'sys'], ['"Courier New", Courier, monospace', 'Courier', 'sys'], ['Georgia, "Times New Roman", serif', 'Georgia', 'sys'],
      ['Impact, "Arial Black", sans-serif', 'Impact', 'sys'], ['"Comic Sans MS", "Comic Neue", cursive', 'Comic', 'sys'], ['Verdana, Tahoma, sans-serif', 'Verdana', 'sys'],
    ];
    // accents dessinés au-dessus de la lettre de base (é è ê ë à ç…) : décalages [x, y] pour une lettre de 5 de large
    const ACC5 = { '́': [[3, 0], [2, 1]], '̀': [[1, 0], [2, 1]], '̂': [[2, 0], [1, 1], [3, 1]], '̈': [[1, 1], [3, 1]], '̃': [[1, 1], [2, 0], [3, 1], [4, 0]], '̧': [[2, 7], [1, 8]], '̊': [[2, 0], [1, 1], [3, 1]] };
    const ACC3 = { '́': [[2, -2]], '̀': [[0, -2]], '̂': [[0, -2], [2, -2]], '̈': [[0, -2], [2, -2]], '̃': [[0, -2], [2, -2]], '̧': [[1, 5]], '̊': [[1, -2]] };
    // une lettre : liste de pixels allumés [x, y] et sa largeur
    function glyphPx(font, ch) {
      const nfd = ch.normalize('NFD'), base = nfd[0], marks = nfd.slice(1);
      let px = [], w = 0, caps = false;
      if (font === 'mini') {
        const k = base.toUpperCase(), rows = FONT3[k];
        if (base === ' ') return { px: [], w: 2 };
        const r2 = rows || '111101101101111';
        for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) if (r2[y * 3 + x] === '1') px.push([x, y]);
        caps = true;
        for (const m of marks) for (const a of ACC3[m] || []) px.push(a.slice());
      } else {
        if (base === ' ') return { px: [], w: 3 };
        const code = base.charCodeAt(0), i = code >= 32 && code < 127 ? code - 32 : 31;
        const dotless = (base === 'i' || base === 'j') && marks.length;
        for (let x = 0; x < 5; x++) { const col = parseInt(FONT5.substr((i * 5 + x) * 2, 2), 16); for (let y = 0; y < 8; y++) if (col >> y & 1 && !(dotless && y === 0)) px.push([x, y]); }
        caps = base !== base.toLowerCase() || /[0-9bdfhklt]/.test(base);
        for (const m of marks) for (const a of ACC5[m] || []) px.push([a[0], caps && a[1] < 2 ? a[1] - 2 : a[1]]);
      }
      if (!px.length) return { px: [], w: 2 };
      // chasse proportionnelle : on retire les colonnes vides à gauche
      const minX = Math.min(...px.map((q) => q[0])), maxX = Math.max(...px.map((q) => q[0]));
      px = px.map(([x, y]) => [x - minX, y]);
      w = maxX - minX + 1;
      return { px, w };
    }
    // texte → pixels (masque) ; opts : font, size, bold, italic, spacing
    function textMask(text, o) {
      const lines = String(text).split('\n');
      const out = new Set(); let maxW = 0, maxH = 0;
      const sysFont = !['mini', 'classic'].includes(o.font);
      if (sysFont) {
        const px = Math.max(5, o.size), c = document.createElement('canvas'), g2 = c.getContext('2d');
        const font = `${o.italic ? 'italic ' : ''}${o.bold ? 'bold ' : ''}${px}px ${o.font}`;
        g2.font = font;
        const lh = Math.round(px * 1.25), widths = lines.map((l) => Math.ceil(g2.measureText(l).width + (l.length * (o.spacing || 0))) + 4);
        c.width = Math.max(1, ...widths); c.height = Math.max(1, lh * lines.length + Math.ceil(px * 0.4));
        g2.font = font; g2.fillStyle = '#000'; g2.textBaseline = 'alphabetic';
        if ('letterSpacing' in g2) g2.letterSpacing = `${o.spacing || 0}px`;
        lines.forEach((l, i) => g2.fillText(l, 1, Math.round(px + i * lh)));
        const d = g2.getImageData(0, 0, c.width, c.height).data;
        for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] >= 110) { out.add(`${x},${y}`); maxW = Math.max(maxW, x + 1); maxH = Math.max(maxH, y + 1); }
      } else {
        const s2 = Math.max(1, o.size), gh = o.font === 'mini' ? 5 : 7, lh = (gh + 3) * s2, sp = (o.spacing == null ? 1 : o.spacing);
        lines.forEach((line, li) => {
          let cx = 0;
          for (const ch of line) {
            const gl = glyphPx(o.font, ch);
            for (const [x0, y0] of gl.px) {
              const sh = o.italic ? Math.floor((gh - 1 - y0) / 2) : 0;
              for (let b = 0; b <= (o.bold ? 1 : 0); b++) {
                const bx = (cx + x0 + sh + b) * s2, by = (y0 + 2) * s2 + li * lh;
                for (let yy = 0; yy < s2; yy++) for (let xx = 0; xx < s2; xx++) out.add(`${bx + xx},${by + yy}`);
              }
            }
            cx += gl.w + (o.bold ? 1 : 0) + sp;
          }
        });
      }
      // recadre
      let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
      for (const k of out) { const [x, y] = k.split(',').map(Number); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      if (x1 < 0) return null;
      const pad = o.outline ? 1 : 0, w = x1 - x0 + 1 + pad * 2, h = y1 - y0 + 1 + pad * 2, m = new Uint8Array(w * h);
      for (const k of out) { const [x, y] = k.split(',').map(Number); m[(y - y0 + pad) * w + (x - x0 + pad)] = 1; }
      if (o.outline) {
        const src = m.slice();
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          if (src[y * w + x]) continue;
          let nb = false;
          for (let dy = -1; dy <= 1 && !nb; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < w && yy < h && src[yy * w + xx]) { nb = true; break; } }
          if (nb) m[y * w + x] = 2;
        }
      }
      return { w, h, m };
    }
    const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const BAYER8 = (() => { const m = []; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { let v = 0, xc = x ^ y, yc = y; for (let bit = 0; bit < 3; bit++) { v = (v << 2) | (((xc >> bit) & 1) << 1) | ((yc >> bit) & 1); } m.push(v); } return m; })();
    // OKLab : mélange de couleurs qui suit l'œil, pour des dégradés propres
    const srgbLin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    const linSrgb = (c) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
    function toLab([r, g2, b2]) {
      r = srgbLin(r); g2 = srgbLin(g2); b2 = srgbLin(b2);
      const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g2 + 0.0514459929 * b2), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g2 + 0.1073969566 * b2), s2 = Math.cbrt(0.0883024619 * r + 0.2817188376 * g2 + 0.6299787005 * b2);
      return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s2, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s2, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s2];
    }
    function fromLab([L2, a2, b2]) {
      const l = (L2 + 0.3963377774 * a2 + 0.2158037573 * b2) ** 3, m = (L2 - 0.1055613458 * a2 - 0.0638541728 * b2) ** 3, s2 = (L2 - 0.0894841775 * a2 - 1.291485548 * b2) ** 3;
      return [linSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s2), linSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s2), linSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s2)];
    }
    const BR_MAXM = 32;
    const BRUSH_KEY = 'bplus.brushes';
    const brId = () => `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const patOk = (k, x, y) => {
      switch (k) {
        case 'dither': return ((x + y) & 1) === 0;
        case 'dither2': return (((x >> 1) + (y >> 1)) & 1) === 0;
        case 'dots': return (x & 1) === 0 && (y & 1) === 0;
        case 'hlines': return (y & 1) === 0;
        case 'vlines': return (x & 1) === 0;
        case 'diag': return ((x + y) % 3 + 3) % 3 === 0;
        default: return true;
      }
    };
    // masque : lignes de « # » (peint) et « . » (vide), au plus 32 × 32
    function trimMask(rows) {
      let y0 = rows.length, y1 = -1, x0 = Infinity, x1 = -1;
      rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === '#') { y0 = Math.min(y0, y); y1 = Math.max(y1, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x); } });
      if (y1 < 0) return null;
      const out = rows.slice(y0, y1 + 1).map((r) => r.slice(x0, x1 + 1).padEnd(x1 - x0 + 1, '.'));
      return { w: x1 - x0 + 1, h: out.length, rows: out };
    }
    function normBrush(o) {
      if (!o || typeof o !== 'object') return null;
      const n = (v, a, b, d) => (Number.isFinite(+v) ? clamp(+v, a, b) : d);
      const b = {
        blend: BR_BLENDS.includes(o.blend) ? o.blend : 'normal',
        opacity: n(o.opacity, 0.05, 1, 1),
        aa: !!o.aa,
        aaw: Math.round(n(o.aaw, 1, 4, 1)),
        edge: BR_EDGES.includes(o.edge) ? o.edge : 'none',
        id: typeof o.id === 'string' && o.id.length < 40 ? o.id : brId(),
        name: String(o.name || T('edBrUnnamed')).slice(0, 40),
        tip: ['square', 'round', 'custom'].includes(o.tip) ? o.tip : 'square',
        pattern: BR_PATTERNS.includes(o.pattern) ? o.pattern : 'none',
        density: n(o.density, 0.02, 1, 1),
        spacing: Math.round(n(o.spacing, 1, 16, 1)),
        jitter: Math.round(n(o.jitter, 0, 8, 0)),
        pp: !!o.pp,
        minSize: Math.round(n(o.minSize, 1, 24, 1)),
      };
      if (o.size != null) b.size = Math.round(n(o.size, 1, 24, 1));
      if (b.tip === 'custom') {
        const rows = o.mask && Array.isArray(o.mask.rows) ? o.mask.rows.slice(0, BR_MAXM).map((r) => String(r).slice(0, BR_MAXM).replace(/[^#]/g, '.')) : null;
        b.mask = rows && trimMask(rows);
        if (!b.mask) { b.tip = 'square'; delete b.mask; }
      }
      return b;
    }
    const encodeBrush = (b) => {
      const { id, name, tip, pattern, density, spacing, jitter, pp, minSize, size, mask, blend, opacity, aa, aaw, edge } = b;
      return new Blob([JSON.stringify({ format: 'bplusbrush', version: 2, app: 'Bplace+', exportedAt: new Date().toISOString(), id, name, tip, pattern, density, spacing, jitter, pp, minSize, size, mask, blend, opacity, aa, aaw, edge }, null, 1)], { type: 'application/json' });
    };
    // image → masque : la transparence si l'image en a, sinon les pixels sombres
    function maskFromPixels(w, h, getA) {
      const k = Math.max(1, Math.max(w, h) / BR_MAXM), W = Math.max(1, Math.round(w / k)), H = Math.max(1, Math.round(h / k)), rows = [];
      for (let y = 0; y < H; y++) {
        let r = '';
        for (let x = 0; x < W; x++) r += getA(Math.min(w - 1, Math.floor((x + 0.5) * k)), Math.min(h - 1, Math.floor((y + 0.5) * k))) >= 128 ? '#' : '.';
        rows.push(r);
      }
      return trimMask(rows);
    }
    async function maskFromImageBlob(blob) {
      const u = URL.createObjectURL(blob); const im = await loadImg(u); URL.revokeObjectURL(u);
      if (!im) return null;
      const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
      const g2 = c.getContext('2d'); g2.drawImage(im, 0, 0);
      const d = g2.getImageData(0, 0, c.width, c.height).data;
      let transparent = false;
      for (let i = 3; i < d.length; i += 4) if (d[i] < 250) { transparent = true; break; }
      return maskFromPixels(c.width, c.height, (x, y) => { const i = (y * c.width + x) * 4; return transparent ? d[i + 3] : 255 - (d[i] + d[i + 1] + d[i + 2]) / 3; });
    }
    // pinceau GIMP / Krita .gbr : en-tête big-endian puis le masque (1 octet) ou du RGBA (4 octets)
    function parseGbr(buf) {
      const v = new DataView(buf);
      if (buf.byteLength < 28) return null;
      const hs = v.getUint32(0), ver = v.getUint32(4), w = v.getUint32(8), h = v.getUint32(12), bpp = v.getUint32(16);
      if (!w || !h || w > 4096 || h > 4096 || (bpp !== 1 && bpp !== 4) || hs < 20 || hs + w * h * bpp > buf.byteLength) return null;
      let name = '';
      if (ver >= 2 && hs > 28) { try { name = new TextDecoder().decode(new Uint8Array(buf, 28, hs - 28)).replace(/\0+$/, ''); } catch (e) {} }
      const px = new Uint8Array(buf, hs, w * h * bpp);
      const mask = maskFromPixels(w, h, (x, y) => (bpp === 1 ? px[y * w + x] : px[(y * w + x) * 4 + 3]));
      return mask && { name, mask, spacing: ver >= 2 && buf.byteLength >= 28 ? v.getUint32(24) : 0 };
    }
    // préréglage Krita .kpp : une image PNG qui porte le préréglage en XML dans un bloc de texte
    async function pngTexts(buf) {
      const u8 = new Uint8Array(buf), v = new DataView(buf), out = {};
      if (u8[0] !== 0x89 || u8[1] !== 0x50) return out;
      const dec = new TextDecoder('latin1'), utf = new TextDecoder();
      const inflate = async (data) => { try { return utf.decode(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer()); } catch (e) { return ''; } };
      for (let o = 8; o + 8 <= u8.length;) {
        const len = v.getUint32(o), type = dec.decode(u8.subarray(o + 4, o + 8)), data = u8.subarray(o + 8, o + 8 + len);
        if (type === 'tEXt' || type === 'zTXt' || type === 'iTXt') {
          const z = data.indexOf(0), key = dec.decode(data.subarray(0, z));
          if (type === 'tEXt') out[key] = utf.decode(data.subarray(z + 1));
          else if (type === 'zTXt') out[key] = await inflate(data.subarray(z + 2));
          else {
            const comp = data[z + 1]; let q = z + 3;
            q = data.indexOf(0, q) + 1; q = data.indexOf(0, q) + 1;
            out[key] = comp ? await inflate(data.subarray(q)) : utf.decode(data.subarray(q));
          }
        }
        if (type === 'IEND') break;
        o += 12 + len;
      }
      return out;
    }
    async function parseKpp(buf, fname) {
      const t = await pngTexts(buf);
      const xml = t.preset || Object.values(t).find((x) => /<Preset/i.test(x)) || '';
      if (!xml) return null;
      const doc = new DOMParser().parseFromString(xml, 'application/xml');
      const pre = doc.querySelector('Preset');
      const name = (pre && pre.getAttribute('name')) || fname.replace(/\.kpp$/i, '');
      const param = (k) => { const n = [...doc.querySelectorAll('param')].find((p2) => p2.getAttribute('name') === k); return n ? n.textContent : null; };
      const paintop = (pre && pre.getAttribute('paintopid')) || '';
      const b = { name, tip: 'round', partial: false };
      const def = param('brush_definition');
      let bdoc = null;
      if (def) bdoc = new DOMParser().parseFromString(def, 'application/xml');
      const brushEl = bdoc && bdoc.querySelector('Brush');
      const mg = bdoc && bdoc.querySelector('MaskGenerator');
      if (brushEl) {
        b.spacingF = parseFloat(brushEl.getAttribute('spacing')) || 0;
      }
      if (mg) {
        const d = parseFloat(mg.getAttribute('diameter')) || 5;
        b.tip = /rect/i.test(mg.getAttribute('type') || '') ? 'square' : 'round';
        b.size = clamp(Math.round(d), 1, 24);
      } else if (brushEl) {
        // pinceau à partir d'une image : Krita l'embarque parfois dans le préréglage
        const fn = brushEl.getAttribute('filename') || '';
        let mask = null;
        const res = [...doc.querySelectorAll('resource')].find((r) => !fn || (r.getAttribute('filename') || r.getAttribute('name') || '').includes(fn.split('/').pop()));
        if (res && res.textContent.trim()) {
          try {
            const bin = Uint8Array.from(atob(res.textContent.trim()), (c) => c.charCodeAt(0));
            mask = /\.gbr$/i.test(fn) || bin[20] === 0x47 ? (parseGbr(bin.buffer) || {}).mask : await maskFromImageBlob(new Blob([bin]));
          } catch (e) { mask = null; }
        }
        if (mask) { b.tip = 'custom'; b.mask = mask; } else b.partial = true;
        const sc = parseFloat(brushEl.getAttribute('scale'));
        if (sc > 0 && b.tip !== 'custom') b.size = clamp(Math.round(sc * 10), 1, 24);
      }
      if (b.spacingF > 0) b.spacing = clamp(Math.round(b.spacingF * (b.tip === 'custom' && b.mask ? Math.max(b.mask.w, b.mask.h) : b.size || 1)), 1, 16);
      delete b.spacingF;
      if (/spray/i.test(paintop)) { b.density = 0.15; b.minSize = 5; }
      const op = parseFloat(param('OpacityValue') || param('PressureOpacity') || '');
      if (op > 0 && op < 1) b.density = Math.max(0.05, op);
      return b;
    }
    // lit un fichier de pinceau : .bplusbrush, .kpp, .gbr ou une image
    async function readBrushFile(f) {
      const nm = f.name || '';
      try {
        if (/\.bplusbrush$/i.test(nm) || f.type === 'application/json') {
          const o = JSON.parse(await f.text());
          if (o.format !== 'bplusbrush') return null;
          return normBrush({ ...o, id: brId() });
        }
        const buf = await f.arrayBuffer();
        if (/\.kpp$/i.test(nm)) { const b = await parseKpp(buf, nm); return b && { ...normBrush({ ...b, id: brId() }), partial: b.partial }; }
        if (/\.gbr$/i.test(nm)) { const r = parseGbr(buf); return r && normBrush({ name: r.name || nm.replace(/\.gbr$/i, ''), tip: 'custom', mask: r.mask, spacing: Math.max(1, Math.round((r.spacing / 100) * Math.max(r.mask.w, r.mask.h))) }); }
        if (/^image\//.test(f.type)) { const mask = await maskFromImageBlob(f); return mask && normBrush({ name: nm.replace(/\.[a-z0-9]+$/i, ''), tip: 'custom', mask }); }
      } catch (e) { return null; }
      return null;
    }
    const isBrushFile = (f) => /\.(bplusbrush|kpp|gbr)$/i.test(f.name || '');

    // un .bplus glissé n'importe où sur bplace (éditeur fermé) : ajouté aux templates locaux et ouvert
    document.addEventListener('dragover', (e) => {
      if (!A.MOD.editor || ed || !e.dataTransfer || ![...e.dataTransfer.types].includes('Files')) return;
      const it = [...(e.dataTransfer.items || [])];
      if (it.length && it.every((i) => i.kind === 'file' && !i.type)) e.preventDefault();
    }, true);
    document.addEventListener('drop', (e) => {
      if (!A.MOD.editor || ed || !e.dataTransfer) return;
      const files = [...e.dataTransfer.files].filter(isBplus);
      if (!files.length) return;
      e.preventDefault(); e.stopPropagation();
      files.forEach((f, i) => addBplus(f, i === files.length - 1));
    }, true);

    // ajout depuis un fichier du PC (image, .bplace ou .bplus) dans la bibliothèque locale
    async function addFromFile(f) {
      if (isBplus(f)) return addBplus(f, false);
      const pal = palette();
      let im = null, name = (f.name || T('edUntitled')).replace(/\.[^.]+$/, '').slice(0, 80), pos = null, world = A.currentWorld() || 'earth';
      if (/\.(bplace|wplace)$/i.test(f.name || '')) {
        try {
          const j = JSON.parse(await f.text()); const t = j && j.template;
          if (!t || !t.imageData) throw new Error('bad');
          im = await loadImg(t.imageData);
          if (t.name) name = String(t.name).slice(0, 80);
          if (t.canvasType) world = worldOf(t.canvasType);
          if (im && t.position) { const s = t.scale || 1; const w = Math.round((t.width || im.width) * s), h = Math.round((t.height || im.height) * s); pos = { x: Math.round(t.position.x + (t.width || im.width) / 2 - w / 2), y: Math.round(t.position.y + (t.height || im.height) / 2 - h / 2), w, h }; }
        } catch (e) { im = null; }
      } else if ((f.type || '').startsWith('image/') && !/svg/.test(f.type)) im = await blobImg(f);
      if (!im) { toast(T('edBadFile'), 'err'); return; }
      let w = pos ? pos.w : im.naturalWidth, h = pos ? pos.h : im.naturalHeight;
      if (w > MAXS || h > MAXS) { const k = MAXS / Math.max(w, h); w = Math.max(1, Math.round(w * k)); h = Math.max(1, Math.round(h * k)); }
      const c = makeCanvas(w, h), g = c.getContext('2d');
      g.imageSmoothingEnabled = false; g.drawImage(im, 0, 0, w, h);
      const d = g.getImageData(0, 0, w, h); quantize(d, pal); g.putImageData(d, 0, 0);
      let x = pos ? pos.x : 0, y = pos ? pos.y : 0;
      if (!pos) { try { const ctr = A.toGrid(A.map().getCenter(), world); x = ctr.x - Math.round(w / 2); y = ctr.y - Math.round(h / 2); } catch (e) {} }
      const entry = { id: uid(), name, world, x, y, w, h, png: await canvasBlob(c), layers: null, siteId: null, createdAt: Date.now(), updatedAt: Date.now() };
      await lib.put(entry);
      libChanged();
      A.playSound('favOn');
      toast(T('edAdded'), 'ok');
      return entry;
    }

    /* ======================================================================
       ÉDITEUR
       ====================================================================== */
    let ed = null;
    function open(opts) { if (ed) return; ed = createEditor(opts, palette()); }

    function createEditor(opts, pal) {
      const S = {
        w: 64, h: 64, layers: [], active: 0, color: null, tool: 'pencil', size: 1, filled: false,
        zoom: 8, ox: 0, oy: 0, sel: null, floating: null, clip: null,
        hist: [], fut: [], dirty: false, mapBg: false, bgCanvas: null, mineOnly: false,
        origin: { x: 0, y: 0 }, world: opts.world || A.currentWorld() || 'earth',
        name: opts.name || T('edUntitled'), libId: opts.libId || null, siteId: opts.siteId || null,
      };
      /* pinceaux : ceux de base + ceux de l'utilisateur (gardés dans le navigateur) */
      const BUILTIN = [
        { id: 'square', name: T('edBrSquare'), tip: 'square' },
        { id: 'round', name: T('edBrRound'), tip: 'round' },
        { id: 'pp', name: T('edBrPP'), tip: 'square', pp: true },
        { id: 'dither', name: T('edBrDither'), tip: 'square', pattern: 'dither' },
        { id: 'spray', name: T('edBrSpray'), tip: 'round', density: 0.12, minSize: 5 },
      ].map((b) => ({ ...normBrush(b), id: b.id, builtin: true }));
      let userBrushes = [];
      try { userBrushes = (JSON.parse(localStorage.getItem(BRUSH_KEY)) || []).map(normBrush).filter(Boolean); } catch (e) { userBrushes = []; }
      const saveBrushes = () => { try { localStorage.setItem(BRUSH_KEY, JSON.stringify(userBrushes.map(({ rev, ...b }) => b))); } catch (e) {} };
      const allBrushes = () => BUILTIN.concat(userBrushes);
      let brushSel = 'square';
      try { brushSel = localStorage.getItem('bplus.brushSel') || 'square'; } catch (e) {}
      function curBrush() { return allBrushes().find((b) => b.id === brushSel) || BUILTIN[0]; }
      let textEd = null;
      const ui = el('div', 'bpc bpe');
      ui.innerHTML = `
        <canvas class="bpe-cv"></canvas>
        <div class="bpe-card bpe-tl"><span class="bpe-x"></span><span class="bpe-logo">${ICON.logo}</span><input class="bpe-name" maxlength="80" spellcheck="false"></div>
        <div class="bpe-card bpe-bar"></div>
        <div class="bpe-tr"></div>
        <div class="bpe-card bpe-tools"></div>
        <div class="bpe-card bpe-opts"></div>
        <div class="bpe-panel bpe-pcol">
          <div class="bpe-ph" data-sec="panel"><span class="bpe-phi">${C.palette}</span><span data-t="colors"></span><span class="bpe-fold"></span></div>
          <div class="bpe-pb2"><div class="bpe-cur"><span class="bpe-sws"><span class="sw"></span><button class="sw2"></button></span><span class="nm"></span><label class="bpe-chk"><input type="checkbox" data-a="mine"><span></span></label></div><div class="bpe-pal"></div></div>
          <span class="bpe-split" data-split="panel"></span>
        </div>
        <div class="bpe-panel bpe-pbr">
          <div class="bpe-ph" data-sec="brushes"><span class="bpe-phi">${C.brush}</span><span data-t="brushes"></span><span class="bpe-fold"></span></div>
          <div class="bpe-bacts"></div>
          <div class="bpe-bgrid"></div>
          <div class="bpe-bset"></div>
          <span class="bpe-split" data-split="brushes"></span>
        </div>
        <div class="bpe-panel bpe-pgr">
          <div class="bpe-ph" data-sec="grads"><span class="bpe-phi">${C.gradient}</span><span data-t="grads"></span><span class="bpe-fold"></span></div>
          <div class="bpe-gacts"></div>
          <div class="bpe-glist"></div>
          <div class="bpe-gset"></div>
          <span class="bpe-split" data-split="grads"></span>
        </div>
        <div class="bpe-panel bpe-ptx">
          <div class="bpe-ph" data-sec="texts"><span class="bpe-phi">${C.text}</span><span data-t="texts"></span><span class="bpe-fold"></span></div>
          <div class="bpe-tlist"></div>
          <div class="bpe-tset"></div>
          <span class="bpe-split" data-split="texts"></span>
        </div>
        <div class="bpe-panel bpe-play">
          <div class="bpe-ph" data-sec="layers"><span class="bpe-phi">${C.layers}</span><span data-t="layers"></span><span class="bpe-fold"></span></div>
          <div class="bpe-lacts"></div>
          <div class="bpe-llist"></div>
          <span class="bpe-split" data-split="layers"></span>
        </div>
        <div class="bpe-panel bpe-pref">
          <div class="bpe-ph" data-sec="refs"><span class="bpe-phi">${C.refs}</span><span data-t="refs"></span><span class="bpe-fold"></span></div>
          <div class="bpe-racts"></div>
          <div class="bpe-rlist"></div>
          <span class="bpe-split" data-split="refs"></span>
        </div>
        <div class="bpe-status"></div>
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,.bplus,.bplace" hidden data-file>`;
      document.body.appendChild(ui);
      document.documentElement.classList.add('bpe-open');
      const $ = (q) => ui.querySelector(q);
      const cv = $('.bpe-cv'), statusEl = $('.bpe-status'), g = cv.getContext('2d');
      statusEl.innerHTML = '<span class="bpe-st"></span>';
      const status = statusEl.querySelector('.bpe-st');
      const comp = document.createElement('canvas'), cg = comp.getContext('2d');

      /* en-tête gauche : fermer + nom */
      const closeB = el('button', IB); closeB.innerHTML = I.x; closeB.title = T('close');
      closeB.onclick = () => requestClose();
      $('.bpe-x').replaceWith(closeB);
      const nameIn = $('.bpe-name');
      nameIn.value = S.name;
      nameIn.oninput = () => { S.name = nameIn.value; S.dirty = true; };

      /* barre centrale */
      const bar = $('.bpe-bar');
      const barBtn = (k, ic, tip) => { const b = el('button', 'bpe-bb'); b.dataset.a = k; b.innerHTML = ic; b.title = tip; b.setAttribute('aria-label', tip); bar.appendChild(b); return b; };
      const sep = () => bar.appendChild(el('span', 'bpe-bsep'));
      barBtn('undo', I.undo, `${T('edUndo')} (Ctrl+Z)`); barBtn('redo', I.redo, `${T('edRedo')} (Ctrl+Y)`); sep();
      barBtn('import', I.image, T('edImport')); barBtn('canvas', I.resize, T('edCanvas')); barBtn('crop', I.crop, T('edCrop')); sep();
      barBtn('scale', I.scale, `${T('edTransform')} (Ctrl+T)`); barBtn('flipH', I.flipH, T('edFlipH')); barBtn('flipV', I.flipV, T('edFlipV')); barBtn('rotate', I.rotate, T('edRotate')); sep();
      barBtn('map', I.map, T('edLive')); sep();
      const layoutBtn = barBtn('layout', I.pencil, `${T('edLayoutEdit')} (Tab)`);
      barBtn('help', I.keys, `${T('edShortcuts')} (?)`);
      const zoomEl = el('div', 'bpe-zoom'); zoomEl.innerHTML = '<button data-a="zout">−</button><span></span><button data-a="zin">+</button>'; bar.appendChild(zoomEl);
      bar.addEventListener('click', (e) => {
        const b = e.target.closest('[data-a]'); if (!b) return;
        const a = b.dataset.a;
        if (a === 'undo') undo(); else if (a === 'redo') redo(); else if (a === 'import') fileIn.click();
        else if (a === 'canvas') canvasDialog(); else if (a === 'crop') crop(); else if (a === 'map') setLive(!live);
        else if (a === 'flipH' || a === 'flipV' || a === 'rotate') transform(a);
        else if (a === 'scale') startTransform();
        else if (a === 'help') toggleHelp();
        else if (a === 'layout') setLayoutEdit(!ui.classList.contains('edit-layout'));
        else if (a === 'zin' || a === 'zout') zoomAt(a === 'zin' ? 1.25 : 0.8, innerWidth / 2, innerHeight / 2);
      });

      /* boutons à droite (style du site) */
      const tr = $('.bpe-tr');
      const expWrap = el('div', 'bpe-menuwrap');
      const bExp = pbtn('white', T('edExport'), I.dl); expWrap.appendChild(bExp);
      const bSend = pbtn('white', T('edSendSite'), I.send);
      const bSave = pbtn('blue', T('edSave'));
      bExp.title = T('edExport'); bSend.title = T('edSendSite');
      tr.append(expWrap, bSend, bSave);
      bExp.onclick = () => exportMenu(expWrap);
      bSend.onclick = () => sendSite();
      bSave.onclick = () => save();

      /* panneau */
      $('[data-t="colors"]').textContent = T('edColors');
      $('[data-t="layers"]').textContent = T('edLayers');
      $('[data-t="refs"]').textContent = T('edRefs');
      $('[data-t="brushes"]').textContent = T('edBrushes');
      $('[data-t="grads"]').textContent = T('edGrads');
      $('[data-t="texts"]').textContent = T('edText');
      $('.bpe-chk span').textContent = T('edMine');

      /* outils */
      const TOOLS = [['pencil', 'B', 'edPencil'], ['eraser', 'E', 'edEraser'], ['fill', 'G', 'edFill'], ['gradient', 'D', 'edGradient'], ['picker', 'I', 'edPicker'], null,
        ['text', 'T', 'edText'],
        ['line', 'U', 'edLine'], ['rect', 'R', 'edRect'], ['ellipse', 'O', 'edEllipse'], null,
        ['select', 'M', 'edSelect'], ['lasso', 'L', 'edLasso'], ['wand', 'W', 'edWand'], ['colorsel', 'Y', 'edColorSel'], ['move', 'V', 'edMove'], ['pan', 'H', 'edPan']];
      const toolsEl = $('.bpe-tools');
      for (const t of TOOLS) {
        if (!t) { toolsEl.appendChild(el('span', 'bpe-tsep')); continue; }
        const [k, key, tk] = t;
        const b = el('button', 'bpe-tool');
        b.dataset.tool = k; b.innerHTML = C[k]; b.title = `${T(tk)} (${key})`;
        b.onclick = () => setTool(k);
        toolsEl.appendChild(b);
      }
      const optsEl = $('.bpe-opts');
      optsEl.innerHTML = `<button class="bpe-bchip"><canvas width="40" height="16"></canvas><span></span></button><div class="bpe-size"><span class="lb"></span><button data-s="-1">−</button><b></b><button data-s="1">+</button></div><label class="bpe-fillopt"><input type="checkbox"><span></span></label><div class="bpe-gopts"></div><div class="bpe-topts"></div>`;
      optsEl.querySelector('.lb').textContent = T('edSize');
      const bchip = optsEl.querySelector('.bpe-bchip');
      bchip.onclick = () => { setFold('brushes', false); const pb = PANES.brushes; pb.scrollIntoView({ block: 'nearest' }); const g2 = pb.querySelector('.bpe-bgrid .on'); if (g2) g2.scrollIntoView({ block: 'nearest' }); pb.classList.remove('flash'); void pb.offsetWidth; pb.classList.add('flash'); };
      optsEl.querySelector('.bpe-fillopt span').textContent = T('edFilled');
      optsEl.querySelectorAll('[data-s]').forEach((b) => { b.onclick = () => { S.size = clamp(S.size + +b.dataset.s, 1, 24); paintTools(); draw(); }; });
      optsEl.querySelector('.bpe-fillopt input').onchange = (e) => { S.filled = e.target.checked; };
      /* ---------- dégradés : des réglages rangés comme des pinceaux ----------
         auto  : de la couleur principale à la secondaire, en N couleurs du jeu
         fade  : tes couleurs puis le transparent au bout (N couleurs + transparent)
         custom: ta propre liste de couleurs, transparent compris */
      const GKEY = 'bplus.gradients';
      const GBUILTIN = [
        { id: 'g_auto', name: T('edGrPrimSec'), kind: 'auto', n: 5 },
        { id: 'g_fade', name: T('edGrToTransp'), kind: 'fade', n: 4 },
      ];
      const normGrad = (o) => ({
        id: typeof o.id === 'string' ? o.id : brId(), name: String(o.name || T('edGradient')).slice(0, 40),
        kind: ['auto', 'fade', 'custom'].includes(o.kind) ? o.kind : 'custom', n: clamp(Math.round(+o.n || 4), 2, 16),
        stops: Array.isArray(o.stops) ? o.stops.filter((h) => typeof h === 'string').slice(0, 24) : [],
        type: o.type === 'radial' ? 'radial' : 'linear', style: ['bands', 'dither', 'fine'].includes(o.style) ? o.style : 'dither', all: !!o.all,
      });
      let gradStore = { builtin: {}, user: [], sel: 'g_fade' };
      try { const j = JSON.parse(localStorage.getItem(GKEY)); if (j) gradStore = { builtin: j.builtin || {}, user: (j.user || []).map(normGrad), sel: j.sel || 'g_fade' }; } catch (e) {}
      const builtins = GBUILTIN.map((b) => ({ ...normGrad({ ...b, ...(gradStore.builtin[b.id] || {}) }), id: b.id, name: b.name, kind: b.kind, builtin: true }));
      const allGrads = () => builtins.concat(gradStore.user);
      const curGrad = () => allGrads().find((g2) => g2.id === gradStore.sel) || builtins[0];
      const saveGrads = () => {
        for (const b of builtins) gradStore.builtin[b.id] = { n: b.n, type: b.type, style: b.style, all: b.all };
        try { localStorage.setItem(GKEY, JSON.stringify({ builtin: gradStore.builtin, user: gradStore.user, sel: gradStore.sel })); } catch (e) {}
      };
      Object.defineProperty(S, 'grad', { get: () => curGrad(), configurable: true });
      // dans la barre du bas : le dégradé choisi (clic = ouvrir le panneau) + forme
      const gopts = optsEl.querySelector('.bpe-gopts');
      function renderGradOpts() {
        gopts.innerHTML = '';
        const gr = curGrad();
        const chip = el('button', 'bpe-bchip bpe-gchip');
        const cvs = document.createElement('canvas'); cvs.width = 48; cvs.height = 8; chip.appendChild(cvs);
        const nm = el('span'); nm.textContent = gr.name; chip.appendChild(nm);
        chip.title = T('edGrads');
        chip.onclick = () => openGradPanel();
        gopts.appendChild(chip);
        if (S.color) paintRamp(cvs, rampOf(gr), gr.style);
        const w = el('div', 'bpe-seg');
        for (const [k, tk] of [['linear', 'edGrLinear'], ['radial', 'edGrRadial']]) {
          const b = el('button', gr.type === k ? 'on' : ''); b.innerHTML = '<span></span>'; b.querySelector('span').textContent = T(tk);
          b.onclick = () => { gr.type = k; saveGrads(); renderGradOpts(); if (typeof renderGrads === 'function') renderGradSettings(); };
          w.appendChild(b);
        }
        gopts.appendChild(w);
        if (typeof renderGrads === 'function' && bpeGradReady) renderGrads();
      }
      let bpeGradReady = false;
      /* ---------- outil texte : options dans la barre du bas ---------- */
      S.text = { font: 'classic', sizeB: 1, sizeS: 14, spacing: 1, bold: false, italic: false, outline: false };
      try { Object.assign(S.text, JSON.parse(localStorage.getItem('bplus.text')) || {}); } catch (e) {}
      if (!TEXT_FONTS.some((f) => f[0] === S.text.font)) S.text.font = 'classic';
      const topts = optsEl.querySelector('.bpe-topts');
      const isSysFont = () => !['mini', 'classic'].includes(S.text.font);
      const saveText = () => { try { localStorage.setItem('bplus.text', JSON.stringify(S.text)); } catch (e) {} };
      // aperçu d'une police : « Abc 123 » en pixels
      function fontPreview(font, w = 120, h = 30) {
        const sys = !['mini', 'classic'].includes(font);
        const r = textMask('Abc 123', { font, size: sys ? 12 : 1, spacing: 1, bold: false, italic: false, outline: false });
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        if (!r) return c;
        const k = Math.max(1, Math.min(Math.floor((w - 8) / r.w), Math.floor((h - 6) / r.h))), g2 = c.getContext('2d');
        const ox = Math.floor((w - r.w * k) / 2), oy = Math.floor((h - r.h * k) / 2);
        g2.fillStyle = '#262626';
        for (let i = 0; i < r.m.length; i++) if (r.m[i]) g2.fillRect(ox + (i % r.w) * k, oy + Math.floor(i / r.w) * k, k, k);
        return c;
      }
      // barre du bas : la police choisie (clic = ouvrir le panneau Texte) et la taille
      function renderTextOpts() {
        topts.innerHTML = '';
        const chip = el('button', 'bpe-bchip bpe-tchip');
        chip.appendChild(fontPreview(S.text.font, 48, 16));
        const nm = el('span'); nm.textContent = (TEXT_FONTS.find((f) => f[0] === S.text.font) || TEXT_FONTS[1])[1]; chip.appendChild(nm);
        chip.title = T('edText');
        chip.onclick = () => openTextPanel();
        topts.appendChild(chip);
        const w = el('div', 'bpe-size'); w.innerHTML = '<span class="lb"></span><button data-v="-1">−</button><b></b><button data-v="1">+</button>';
        const get = () => (isSysFont() ? S.text.sizeS : S.text.sizeB);
        w.querySelector('.lb').textContent = T('edSize'); w.querySelector('b').textContent = get();
        w.querySelectorAll('[data-v]').forEach((b) => { b.onclick = () => { if (isSysFont()) S.text.sizeS = clamp(S.text.sizeS + +b.dataset.v, 6, 64); else S.text.sizeB = clamp(S.text.sizeB + +b.dataset.v, 1, 8); saveText(); renderTextOpts(); textChanged(); }; });
        topts.appendChild(w);
        if (typeof renderTextPanel === 'function' && textPanelReady) renderTextPanel();
      }
      let textPanelReady = false;
      renderTextOpts();
      renderGradOpts();
      function paintTools() {
        toolsEl.querySelectorAll('.bpe-tool').forEach((b) => b.classList.toggle('on', b.dataset.tool === S.tool));
        optsEl.querySelector('.bpe-size b').textContent = S.size;
        const brush = ['pencil', 'eraser', 'line', 'rect', 'ellipse'].includes(S.tool);
        const shape = S.tool === 'rect' || S.tool === 'ellipse';
        optsEl.querySelector('.bpe-size').hidden = !brush;
        optsEl.querySelector('.bpe-fillopt').hidden = !shape;
        bchip.hidden = !(S.tool === 'pencil' || S.tool === 'eraser' || S.tool === 'line');
        if (typeof paintChip === 'function') paintChip();
        gopts.hidden = S.tool !== 'gradient';
        topts.hidden = S.tool !== 'text';
        optsEl.hidden = !brush && S.tool !== 'gradient' && S.tool !== 'text';
        if (typeof resolveOverlaps === 'function' && PANES) applyAll();
        ui.dataset.tool = S.tool;
      }
      function setTool(k) {
        if (textEd && k !== 'text') finishText(true);
        if (S.floating && k !== 'move' && k !== 'text') commitFloating();
        // choisir un outil quitte le réglage de l'image de référence
        if (S.refEdit && k !== 'pan') { S.refEdit = false; if (typeof renderRefs === 'function') renderRefs(); }
        const wasGrad = S.tool === 'gradient', wasText = S.tool === 'text';
        S.tool = k; paintTools(); draw();
        if (k === 'gradient' && !wasGrad && typeof openGradPanel === 'function' && bpeGradReady) openGradPanel();
        if (k === 'text' && !wasText && textPanelReady) openTextPanel();
      }

      /* ---------- interface déplaçable : chaque panneau se range sur un bord et s'adapte ---------- */
      const LKEY = 'bplus.edLayout';
      const knobs = {}, wknobs = {};
      let layout = {};
      try { layout = JSON.parse(localStorage.getItem(LKEY)) || {}; } catch (e) { layout = {}; }
      const saveLayout = () => { try { localStorage.setItem(LKEY, JSON.stringify(layout)); } catch (e) {} };
      const PANES = { tl: $('.bpe-tl'), bar, tr, tools: toolsEl, opts: optsEl, panel: $('.bpe-pcol'), brushes: $('.bpe-pbr'), grads: $('.bpe-pgr'), texts: $('.bpe-ptx'), layers: $('.bpe-play'), refs: $('.bpe-pref'), status: statusEl };
      const ORIENT = { tools: 'v', bar: 'h', opts: 'h', tr: 'h', tl: 'h' };
      const DEF_EDGE = { tools: 'left', panel: 'right', tl: 'top', bar: 'top', tr: 'top', opts: 'bottom', status: 'bottom' };
      const PANELS = ['panel', 'brushes', 'grads', 'texts', 'layers', 'refs'];
      const isPanel = (k) => PANELS.includes(k);
      const GRIP = '<svg viewBox="0 0 10 16" fill="currentColor"><circle cx="3" cy="3" r="1.4"/><circle cx="7" cy="3" r="1.4"/><circle cx="3" cy="8" r="1.4"/><circle cx="7" cy="8" r="1.4"/><circle cx="3" cy="13" r="1.4"/><circle cx="7" cy="13" r="1.4"/></svg>';
      const orientFor = (key, edge) => (isPanel(key) || key === 'tl' || key === 'status' ? null : !edge ? ORIENT[key] : (edge === 'left' || edge === 'right' ? 'v' : 'h'));
      // fusion : une barre se range dans une autre barre, un panneau dans un autre panneau
      const BAR_HOSTS = ['tl', 'bar', 'tr', 'tools'], BARS = ['tl', 'bar', 'tr', 'tools', 'opts'];
      const DEF_INTO = { brushes: 'panel', grads: 'panel', texts: 'panel', layers: 'panel', refs: 'panel' };
      const intoOf = (key) => { const L = layout[key]; return L ? L.into || null : DEF_INTO[key] || null; };
      const hostOf = (key) => { const h = intoOf(key); return h && PANES[h] && h !== key && !intoOf(h) ? h : null; };
      const hasGuests = (key) => Object.keys(PANES).some((k2) => hostOf(k2) === key);
      const M = 16;
      function applyPane(key) {
        const pe = PANES[key], L = layout[key];
        pe.classList.remove('vert', 'horiz', 'moved', 'merged', 'docked');
        for (const k of ['left', 'top', 'right', 'bottom', 'transform', 'height', 'width', 'scale', 'transformOrigin', 'maxHeight']) pe.style[k] = '';
        const host = hostOf(key);
        if (host) {
          const hp = PANES[host];
          pe.classList.add('merged');
          if (!isPanel(key)) {
            const ho = hp.classList.contains('vert') ? 'vert' : hp.classList.contains('horiz') ? 'horiz' : (orientFor(host, layout[host] && layout[host].edge) === 'v' ? 'vert' : 'horiz');
            pe.classList.add(ho);
          }
          hp.appendChild(pe);
          return;
        }
        if (pe.parentElement !== ui) ui.insertBefore(pe, statusEl);
        const o = orientFor(key, L && L.edge);
        if (o) pe.classList.add(o === 'v' ? 'vert' : 'horiz');
        if (isPanel(key) && L && L.w) pe.style.width = `${clamp(L.w, 240, Math.min(560, innerWidth - 120))}px`;
        if (!L || pe.hidden) return;
        pe.classList.add('moved');
        Object.assign(pe.style, { right: 'auto', bottom: 'auto', transform: 'none' });
        if (L.scale && L.scale !== 1 && !isPanel(key) && key !== 'status') { pe.style.transformOrigin = '0 0'; pe.style.scale = String(L.scale); }
        const W = innerWidth, H = innerHeight;
        if (isPanel(key)) {
          const top = clamp(L.y, M, Math.max(M, H - 160));
          pe.style.top = `${top}px`; pe.style.maxHeight = `${H - top - M}px`;
          pe.classList.toggle('docked', L.edge === 'left' || L.edge === 'right');
        }
        const r = pe.getBoundingClientRect();
        let x = L.x, y = L.y;
        if (L.edge === 'left') x = M; else if (L.edge === 'right') x = W - M - r.width;
        if (L.edge === 'top') y = M; else if (L.edge === 'bottom') y = H - M - r.height;
        pe.style.left = `${clamp(x, M, Math.max(M, W - r.width - M))}px`;
        if (!isPanel(key)) pe.style.top = `${clamp(y, M, Math.max(M, H - r.height - M))}px`;
      }
      // adaptation à l'écran : une barre trop longue rétrécit, rien ne dépasse ni ne colle au bord
      const pinAt = (pe, left, top) => {
        const sc = pe.style.scale;
        Object.assign(pe.style, { left: `${left}px`, top: `${top}px`, right: 'auto', bottom: 'auto', transform: 'none', transformOrigin: '0 0' });
        if (sc) pe.style.scale = sc;
        pe.classList.add('moved');
      };
      function fitScreen() {
        const W = innerWidth, H = innerHeight;
        for (const key of Object.keys(PANES)) {
          const pe = PANES[key];
          if (pe.hidden || hostOf(key) || pe.classList.contains('dragging')) continue;
          let r = pe.getBoundingClientRect();
          if (!r.width) continue;
          if (!isPanel(key) && key !== 'status') {
            const k = Math.min(1, (W - 2 * M) / r.width, (H - 2 * M) / r.height);
            if (k < 0.999) {
              const s0 = parseFloat(pe.style.scale) || 1;
              pinAt(pe, r.left, r.top);
              pe.style.scale = String(Math.max(0.45, s0 * k));
              r = pe.getBoundingClientRect();
            }
          }
          const nl = clamp(r.left, M, Math.max(M, W - M - Math.min(r.width, 160))), nt = clamp(r.top, M, Math.max(M, H - M - Math.min(r.height, 160)));
          if (Math.abs(nl - r.left) > 0.5 || Math.abs(nt - r.top) > 0.5) {
            pinAt(pe, nl, nt);
          }
          if (isPanel(key)) { const r2 = pe.getBoundingClientRect(); pe.style.maxHeight = `${Math.max(160, H - r2.top - M)}px`; }
        }
      }
      // après le rangement : ce qui dépasse encore en bas ou à droite rétrécit sur place
      function shrinkToFit() {
        const W = innerWidth, H = innerHeight;
        for (const key of Object.keys(PANES)) {
          const pe = PANES[key];
          if (pe.hidden || hostOf(key) || pe.classList.contains('dragging')) continue;
          const r = pe.getBoundingClientRect(); if (!r.width) continue;
          if (isPanel(key)) { pe.style.maxHeight = `${Math.max(160, H - Math.max(M, r.top) - M)}px`; continue; }
          if (key === 'status') continue;
          const k = Math.min(1, (W - M - r.left) / r.width, (H - M - r.top) / r.height);
          if (k < 0.999) { const s0 = parseFloat(pe.style.scale) || 1; pinAt(pe, r.left, r.top); pe.style.scale = String(Math.max(0.45, s0 * k)); }
        }
        // dernier filet : tout ce qui dépasse encore est ramené dans l'écran
        for (const key of Object.keys(PANES)) {
          const pe = PANES[key];
          if (pe.hidden || hostOf(key) || pe.classList.contains('dragging')) continue;
          const r = pe.getBoundingClientRect(); if (!r.width) continue;
          const nl = clamp(r.left, M, Math.max(M, W - M - r.width)), nt = clamp(r.top, M, Math.max(M, H - M - r.height));
          if (Math.abs(nl - r.left) > 0.5 || Math.abs(nt - r.top) > 0.5) pinAt(pe, nl, nt);
        }
      }
      const snapRects = () => Object.fromEntries(Object.keys(PANES).map((k) => [k, PANES[k].hidden ? null : PANES[k].getBoundingClientRect()]));
      function applyAll(fixed, anim = true) {
        const before = anim ? snapRects() : null;
        const keys = Object.keys(PANES);
        keys.filter((k) => !hostOf(k)).forEach(applyPane); keys.filter((k) => hostOf(k)).forEach(applyPane);
        for (const k of keys) PANES[k].classList.toggle('host', hasGuests(k));
        fitScreen(); placeStatus(); resolveOverlaps(fixed); shrinkToFit(); placeKnobs();
        if (!before) return;
        for (const k of keys) {
          const pe = PANES[k], b = before[k];
          if (!b || pe.hidden || pe.classList.contains('dragging') || pe.classList.contains('merged')) continue;
          const a = pe.getBoundingClientRect();
          const dx = b.left - a.left, dy = b.top - a.top;
          if (Math.abs(dx) + Math.abs(dy) < 1) continue;
          pe.style.transition = 'none';
          pe.style.translate = `${dx}px ${dy}px`;
          void pe.offsetWidth;
          pe.style.transition = 'translate .42s cubic-bezier(.34,1.3,.64,1)';
          pe.style.translate = '0px 0px';
          const done = () => { pe.style.transition = ''; pe.style.translate = ''; pe.removeEventListener('transitionend', done); placeKnobs(); };
          pe.addEventListener('transitionend', done);
        }
      }
      // les panneaux qui se chevauchent glissent le long de leur bord jusqu'à une place libre
      function resolveOverlaps(fixed) {
        const G = 8, W = innerWidth, H = innerHeight;
        const order = [fixed, 'panel', 'brushes', 'grads', 'texts', 'layers', 'refs', 'tools', 'tl', 'tr', 'bar', 'opts', 'status'].filter((k, i, a) => k && PANES[k] && a.indexOf(k) === i);
        const placed = [];
        const hit = (a, b) => a.left < b.right + G && a.right + G > b.left && a.top < b.bottom + G && a.bottom + G > b.top;
        for (const key of order) {
          const pe = PANES[key];
          if (pe.hidden || hostOf(key)) continue;
          let r = pe.getBoundingClientRect();
          if (!r.width) continue;
          const L = layout[key], edge = L ? L.edge : DEF_EDGE[key];
          const alongY = edge === 'left' || edge === 'right';
          if (placed.some((q) => hit(r, q)) && isPanel(key)) {
            // un panneau est extensible : il raccourcit plutôt que de sauter ailleurs
            const o = placed.find((q) => hit(r, q));
            const below = o.top + o.height / 2 > r.top + r.height / 2;
            const nt = below ? r.top : o.bottom + G, nb = below ? o.top - G : r.bottom;
            if (nb - nt >= 160 && !placed.some((q) => q !== o && hit({ left: r.left, right: r.right, top: nt, bottom: nb }, q))) {
              pinAt(pe, r.left, nt); pe.style.maxHeight = `${nb - nt}px`; r = pe.getBoundingClientRect();
            }
          }
          if (placed.some((q) => hit(r, q))) {
            // place libre la plus proche le long des autres éléments ; une barre peut rétrécir un peu pour tenir,
            // mais rétrécir coûte plus cher que changer de bord : une barre ne s'écrase pas pour laisser sa place à une petite
            const minK = isPanel(key) || key === 'status' ? 1 : 0.45;
            const boxK = (left, top, k) => ({ left, top, right: left + r.width * k, bottom: top + (isPanel(key) ? Math.min(r.height, 160) : r.height * k) });
            const inScreen = (b2) => b2.left >= M - 1 && b2.top >= M - 1 && b2.right <= W - M + 1 && b2.bottom <= H - M + 1;
            const free = (b2) => inScreen(b2) && !placed.some((q) => hit(b2, q));
            const bestK = (left, top) => {
              if (free(boxK(left, top, 1))) return 1;
              if (minK >= 1 || !free(boxK(left, top, minK))) return 0;
              let lo = minK, hi = 1;
              for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (free(boxK(left, top, mid))) lo = mid; else hi = mid; }
              return lo;
            };
            const cands = [[r.left, r.top, 0], [M, r.top, 0], [r.left, M, 0]];
            for (const q of placed) {
              cands.push([r.left, q.bottom + G, alongY || !edge ? 0 : 1], [r.left, q.top - G - r.height, alongY || !edge ? 0 : 1],
                [q.right + G, r.top, !alongY || !edge ? 0 : 1], [q.left - G - r.width, r.top, !alongY || !edge ? 0 : 1],
                [M, q.bottom + G, 1], [q.right + G, M, 1]);
            }
            let best = null;
            for (const [left0, top0, pen] of cands) {
              const left = Math.max(M, left0), top = Math.max(M, top0);
              const k = bestK(left, top); if (!k) continue;
              const cost = (1 - k) * 1e7 + pen * 100000 + Math.abs(left - r.left) + Math.abs(top - r.top);
              if (!best || cost < best.cost) best = { left, top, k, cost };
            }
            if (best) {
              pinAt(pe, best.left, best.top);
              if (best.k < 1) pe.style.scale = String((parseFloat(pe.style.scale) || 1) * best.k);
              if (isPanel(key)) pe.style.maxHeight = `${Math.max(160, H - best.top - M)}px`;
              r = pe.getBoundingClientRect();
            }
          }
          placed.push(r);
        }
      }
      function setLayoutEdit(on, quiet) {
        ui.classList.toggle('edit-layout', on);
        setTimeout(placeKnobs, 0);
        layoutBtn.classList.toggle('on', on);
        try { localStorage.setItem('bplus.edLayoutEdit', on ? '1' : ''); } catch (e) {}
        if (!quiet) applyAll();
      }
      function placeStatus() { if (!layout.status) statusEl.style.left = `${Math.max(16, area().x)}px`; }
      const paneAt = (x, y, self, hosts) => {
        for (const n of document.elementsFromPoint(x, y)) {
          if (self.contains(n)) continue;
          const k = hosts.find((h) => h !== self.dataset.pane && (PANES[h] === n || PANES[h].contains(n)) && !hostOf(h) && !PANES[h].hidden);
          if (k) return k;
          if (n === ui) break;
        }
        return null;
      };
      for (const key of Object.keys(PANES)) {
        const pe = PANES[key];
        pe.dataset.pane = key;
        const gr = el('span', 'bpe-grip'); gr.innerHTML = GRIP; gr.title = T('edDragHint');
        if (isPanel(key)) pe.querySelector('.bpe-ph').prepend(gr); else pe.prepend(gr);
        gr.addEventListener('click', (e) => e.stopPropagation());
        gr.addEventListener('dblclick', (e) => { e.stopPropagation(); delete layout[key]; for (const k2 of Object.keys(layout)) if (layout[k2] && layout[k2].into === key) delete layout[k2]; saveLayout(); applyAll(key); if (!live) fitView(); });
        gr.addEventListener('pointerdown', (e) => {
          e.preventDefault(); e.stopPropagation();
          gr.setPointerCapture(e.pointerId);
          // un élément fusionné ressort de son hôte quand on le prend
          if (pe.classList.contains('merged')) {
            const rr = pe.getBoundingClientRect();
            const ho = orientFor(key, null);
            layout[key] = { edge: null, x: Math.round(rr.left), y: Math.round(rr.top), w: isPanel(key) ? Math.round(rr.width) : undefined };
            pe.classList.remove('merged', 'vert', 'horiz'); if (ho) pe.classList.add(ho === 'v' ? 'vert' : 'horiz');
            ui.insertBefore(pe, statusEl);
            try { gr.setPointerCapture(e.pointerId); } catch (e2) {}
            Object.assign(pe.style, { left: `${rr.left}px`, top: `${rr.top}px`, width: isPanel(key) ? `${rr.width}px` : '' });
            for (const k of Object.keys(PANES)) PANES[k].classList.toggle('host', hasGuests(k));
          }
          const r0 = pe.getBoundingClientRect();
          const dx = clamp(e.clientX - r0.left, 0, r0.width), dy = clamp(e.clientY - r0.top, 0, r0.height);
          pe.classList.add('dragging', 'moved');
          Object.assign(pe.style, { left: `${r0.left}px`, top: `${r0.top}px`, right: 'auto', bottom: 'auto', transform: 'none' });
          A.playSound('grab');
          let target = null;
          const setTarget = (t) => { if (t === target) return; if (target) PANES[target].classList.remove('merge-target'); target = t; if (t) PANES[t].classList.add('merge-target'); };
          const hosts = isPanel(key) ? PANELS : BARS.includes(key) ? BAR_HOSTS : [];
          const mv = (ev) => {
            const W = innerWidth, H = innerHeight;
            pe.style.left = `${clamp(ev.clientX - dx, Math.min(0, W - r0.width), Math.max(0, W - r0.width))}px`;
            pe.style.top = `${clamp(ev.clientY - dy, Math.min(0, H - r0.height), Math.max(0, H - Math.min(r0.height, 120)))}px`;
            setTarget(hosts.length && !hasGuests(key) ? paneAt(ev.clientX, ev.clientY, pe, hosts) : null);
            // bord le plus proche : celui du panneau s'il tient dans l'écran sur cet axe, sinon celui du pointeur
            const r = pe.getBoundingClientRect(), fx = r.width <= W - 2 * M, fy = r.height <= H - 2 * M;
            const d = { left: fx ? r.left : ev.clientX, right: fx ? W - r.right : W - ev.clientX, top: fy ? r.top : ev.clientY, bottom: fy ? H - r.bottom : H - ev.clientY };
            const near = Object.entries(d).filter(([k2]) => !isPanel(key) || k2 === 'left' || k2 === 'right').sort((a2, b2) => a2[1] - b2[1])[0];
            ui.dataset.snap = !target && near && near[1] < 72 ? near[0] : '';
            placeKnobs();
          };
          const upH = () => {
            gr.removeEventListener('pointermove', mv); gr.removeEventListener('pointerup', upH); gr.removeEventListener('pointercancel', upH);
            pe.classList.remove('dragging');
            const r = pe.getBoundingClientRect();
            const old = layout[key] || {};
            if (target) layout[key] = { into: target, scale: old.scale };
            else layout[key] = { edge: ui.dataset.snap || null, x: Math.round(r.left), y: Math.round(r.top), scale: old.scale, w: old.w };
            setTarget(null);
            ui.dataset.snap = '';
            saveLayout(); applyAll(key);
            A.playSound('drop');
            if (!live) fitView();
          };
          gr.addEventListener('pointermove', mv); gr.addEventListener('pointerup', upH); gr.addEventListener('pointercancel', upH);
        });
      }

      /* ---------- taille : pastille des barres (mode réglage), bord intérieur des panneaux ---------- */
      for (const key of BARS) {
        const kn = el('span', 'bpe-knob'); kn.title = T('edResize'); ui.appendChild(kn); knobs[key] = kn;
        kn.addEventListener('dblclick', () => { if (layout[key]) { delete layout[key].scale; saveLayout(); applyAll(key); } });
        kn.addEventListener('pointerdown', (e) => {
          e.preventDefault(); e.stopPropagation(); kn.setPointerCapture(e.pointerId);
          const pe = PANES[key], r = pe.getBoundingClientRect();
          if (!layout[key] || layout[key].into) layout[key] = { edge: DEF_EDGE[key] || null, x: Math.round(r.left), y: Math.round(r.top) };
          const s0 = parseFloat(pe.style.scale) || 1, d0 = Math.max(20, (e.clientX - r.left) + (e.clientY - r.top));
          pinAt(pe, r.left, r.top);
          const mv = (ev) => {
            const s1 = Math.round(clamp(s0 * ((ev.clientX - r.left) + (ev.clientY - r.top)) / d0, 0.6, 1.6) * 20) / 20;
            pe.style.scale = String(s1); layout[key].scale = s1; placeKnobs();
          };
          const up = () => { kn.removeEventListener('pointermove', mv); kn.removeEventListener('pointerup', up); kn.removeEventListener('pointercancel', up); saveLayout(); applyAll(key, false); if (!live) fitView(); };
          kn.addEventListener('pointermove', mv); kn.addEventListener('pointerup', up); kn.addEventListener('pointercancel', up);
        });
      }
      const wSide = (key) => { const L = layout[key]; return L && L.edge === 'left' ? 'right' : 'left'; };
      for (const key of PANELS) {
        const wk = el('span', 'bpe-wknob'); wk.title = T('edResize'); ui.appendChild(wk); wknobs[key] = wk;
        wk.addEventListener('dblclick', () => { if (layout[key]) { delete layout[key].w; saveLayout(); applyAll(key); } });
        wk.addEventListener('pointerdown', (e) => {
          e.preventDefault(); e.stopPropagation(); wk.setPointerCapture(e.pointerId);
          const pe = PANES[key], r = pe.getBoundingClientRect(), sd = wSide(key);
          if (!layout[key]) layout[key] = { edge: DEF_EDGE[key] || null, x: Math.round(r.left), y: Math.round(r.top) };
          pe.classList.add('resizing'); wk.classList.add('on');
          pinAt(pe, r.left, r.top);
          const mv = (ev) => {
            const w = Math.round(clamp(sd === 'left' ? r.right - ev.clientX : ev.clientX - r.left, 240, Math.min(560, innerWidth - 120)));
            layout[key].w = w; pe.style.width = `${w}px`;
            if (sd === 'left') pe.style.left = `${r.right - w}px`;
            placeKnobs();
          };
          const up = () => { wk.removeEventListener('pointermove', mv); wk.removeEventListener('pointerup', up); wk.removeEventListener('pointercancel', up); pe.classList.remove('resizing'); wk.classList.remove('on'); saveLayout(); applyAll(key, false); if (!live) fitView(); };
          wk.addEventListener('pointermove', mv); wk.addEventListener('pointerup', up); wk.addEventListener('pointercancel', up);
        });
      }
      function placeKnobs() {
        const edit = ui.classList.contains('edit-layout');
        for (const [key, kn] of Object.entries(knobs)) {
          const pe = PANES[key];
          const show = edit && !pe.hidden && !pe.classList.contains('merged');
          kn.hidden = !show; if (!show) continue;
          const r = pe.getBoundingClientRect();
          Object.assign(kn.style, { left: `${r.right - 9}px`, top: `${r.bottom - 9}px` });
        }
        for (const [key, wk] of Object.entries(wknobs)) {
          const pe = PANES[key];
          const show = !pe.hidden && !pe.classList.contains('merged');
          wk.hidden = !show; if (!show) continue;
          const r = pe.getBoundingClientRect(), sd = wSide(key);
          Object.assign(wk.style, { left: `${(sd === 'left' ? r.left : r.right) - 5}px`, top: `${r.top + 24}px`, height: `${Math.max(20, r.height - 48)}px` });
        }
      }
      // un élément qui change de taille (texte des dimensions, liste qui s'allonge) reste dans l'écran
      let roRaf = 0;
      const keepIn = () => {
        roRaf = 0;
        if (Object.values(PANES).some((p2) => p2.classList.contains('dragging') || p2.style.translate)) return;
        shrinkToFit(); placeKnobs();
      };
      try { const ro = new ResizeObserver(() => { if (!roRaf) roRaf = requestAnimationFrame(keepIn); }); Object.values(PANES).forEach((p2) => ro.observe(p2)); } catch (e) {}

      /* ---------- panneaux : repliables, et la ligne sous chaque liste se tire pour changer sa hauteur ---------- */
      const PKEY = 'bplus.edPanel';
      let pst = {}; try { pst = JSON.parse(localStorage.getItem(PKEY)) || {}; } catch (e2) { pst = {}; }
      const savePst = () => { try { localStorage.setItem(PKEY, JSON.stringify(pst)); } catch (e2) {} };
      const LIST = { panel: '.bpe-pal', brushes: '.bpe-bgrid', grads: '.bpe-glist', texts: '.bpe-tlist', layers: '.bpe-llist', refs: '.bpe-rlist' };
      function paintPst() {
        for (const k of PANELS) {
          const folded = !!(pst.fold && pst.fold[k]);
          PANES[k].classList.toggle('folded', folded);
          const f = PANES[k].querySelector('.bpe-fold'); f.innerHTML = I.down; f.title = T(folded ? 'expand' : 'collapse');
          const lst = PANES[k].querySelector(LIST[k]), h = pst.size && pst.size[k];
          lst.style.height = h ? `${h}px` : ''; lst.style.maxHeight = h ? `${h}px` : '';
        }
      }
      function setFold(k, v) { pst.fold = pst.fold || {}; pst.fold[k] = v; savePst(); paintPst(); }
      paintPst();
      for (const k of PANELS) {
        const pe = PANES[k];
        pe.querySelector('.bpe-ph').addEventListener('click', () => { setFold(k, !(pst.fold && pst.fold[k])); A.playSound('click'); });
        const sp = pe.querySelector('.bpe-split');
        sp.title = T('edResize');
        sp.addEventListener('dblclick', (e) => { e.stopPropagation(); if (pst.size) delete pst.size[k]; savePst(); paintPst(); });
        sp.addEventListener('pointerdown', (e) => {
          e.preventDefault(); e.stopPropagation(); sp.setPointerCapture(e.pointerId);
          const lst = pe.querySelector(LIST[k]), y0 = e.clientY, h0 = lst.getBoundingClientRect().height;
          pe.classList.add('resizing'); sp.classList.add('on');
          const mv = (ev) => { pst.size = pst.size || {}; pst.size[k] = Math.round(clamp(h0 + ev.clientY - y0, 48, 1200)); paintPst(); };
          const up = () => { sp.removeEventListener('pointermove', mv); sp.removeEventListener('pointerup', up); sp.removeEventListener('pointercancel', up); pe.classList.remove('resizing'); sp.classList.remove('on'); savePst(); };
          sp.addEventListener('pointermove', mv); sp.addEventListener('pointerup', up); sp.addEventListener('pointercancel', up);
        });
      }

      /* ---------- document ---------- */
      const newLayer = (name) => ({ id: uid(), name, visible: true, opacity: 1, data: new Uint8ClampedArray(S.w * S.h * 4) });
      let compData = null;
      function resizeComp() { comp.width = S.w; comp.height = S.h; compData = new ImageData(S.w, S.h); compositeAll(); }
      function compositeRect(x0, y0, x1, y1) {
        x0 = clamp(Math.floor(x0), 0, S.w); y0 = clamp(Math.floor(y0), 0, S.h);
        x1 = clamp(Math.ceil(x1), 0, S.w); y1 = clamp(Math.ceil(y1), 0, S.h);
        if (x1 <= x0 || y1 <= y0) return;
        const out = compData.data, vis = S.layers.filter((l) => l.visible && l.opacity > 0);
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const i = (y * S.w + x) * 4;
            let r = 0, gg = 0, b = 0, a = 0;
            for (const L of vis) {
              const d = L.data;
              if (!d[i + 3]) continue;
              const o = L.opacity;
              if (L.mode && L.mode !== 'normal' && a > 0) {
                // mode de fusion : mélangé à ce qu'il recouvre, ramené à une couleur du jeu, posé opaque
                const br0 = r / a, bg0 = gg / a, bb0 = b / a, m = blendRgb(L.mode, [br0, bg0, bb0], [d[i], d[i + 1], d[i + 2]]);
                const c = nearest(br0 + (m[0] - br0) * o, bg0 + (m[1] - bg0) * o, bb0 + (m[2] - bb0) * o);
                if (c) { r = c.rgb[0] * a; gg = c.rgb[1] * a; b = c.rgb[2] * a; }
                continue;
              }
              r = r * (1 - o) + d[i] * o; gg = gg * (1 - o) + d[i + 1] * o; b = b * (1 - o) + d[i + 2] * o; a = a + o * (1 - a);
            }
            if (a > 0) { out[i] = r / (a || 1) * (a < 1 ? 1 : 1); out[i + 1] = gg; out[i + 2] = b; }
            if (a > 0 && a < 1) { out[i] = r / a; out[i + 1] = gg / a; out[i + 2] = b / a; }
            out[i + 3] = Math.round(a * 255);
          }
        }
        cg.putImageData(compData, 0, 0, x0, y0, x1 - x0, y1 - y0);
        fxDirty = true;
      }
      const compositeAll = () => compositeRect(0, 0, S.w, S.h);
      /* couleurs animées sur le canvas : un masque par effet, rempli d'un reflet qui défile */
      const fxOf = new Map(pal.filter((p) => p.fx).map((p) => [(p.rgb[0] << 16) | (p.rgb[1] << 8) | p.rgb[2], p.fx]));
      let fxDirty = true, fxLast = 0, fxLayers = new Map(), fxTmp = null, fxImg = null, fxPrev = null;
      function fxRebuild() {
        fxDirty = false; fxLast = performance.now();
        const lists = new Map();
        if (fxOf.size && compData) {
          const d = compData.data, n = S.w * S.h;
          for (let i = 0; i < n; i++) {
            const o = i * 4; if (!d[o + 3]) continue;
            const k = fxOf.get((d[o] << 16) | (d[o + 1] << 8) | d[o + 2]); if (!k) continue;
            if (!lists.has(k)) lists.set(k, []);
            lists.get(k).push(i);
          }
        }
        fxLayers = new Map([...lists].map(([k, a]) => [k, Int32Array.from(a)]));
      }
      function fxDraw(x, y, dw, dh) {
        if (fxDirty && performance.now() - fxLast > 120 && !strokeBefore) fxRebuild();
        if (!fxLayers.size) return;
        if (!fxTmp || fxTmp.width !== S.w || fxTmp.height !== S.h) { fxTmp = makeCanvas(S.w, S.h); fxImg = new ImageData(S.w, S.h); fxPrev = null; }
        const d = fxImg.data, t = performance.now() / 1000, ox = S.origin.x + 0.5, oy = S.origin.y + 0.5;
        if (fxPrev) for (const i of fxPrev) d[i * 4 + 3] = 0;
        const used = [];
        for (const [k, idx] of fxLayers) {
          const f = FXK[k]; if (!f) continue;
          for (const i of idx) {
            const px = i % S.w, py = (i - px) / S.w, v = f(ox + px, oy + py, t), o = i * 4;
            d[o] = v[0] * 255; d[o + 1] = v[1] * 255; d[o + 2] = v[2] * 255; d[o + 3] = 255;
          }
          used.push(idx);
        }
        fxPrev = used.length === 1 ? used[0] : Int32Array.from(used.flatMap((a) => Array.from(a)));
        fxTmp.getContext('2d').putImageData(fxImg, 0, 0);
        g.drawImage(fxTmp, x, y, dw, dh);
      }
      const layer = () => S.layers[S.active];
      // image finale (opacité ignorée : un pixel visible compte en entier)
      function flatData() { return flattenLayers(S.layers, S.w, S.h, nearest); }

      /* ---------- sélection (rectangle + masque) ---------- */
      function inSel(x, y) {
        const s = S.sel; if (!s) return true;
        if (x < s.x || y < s.y || x >= s.x + s.w || y >= s.y + s.h) return false;
        return !s.mask || !!s.mask[(y - s.y) * s.w + (x - s.x)];
      }
      function selFromFull(full, add) {
        if (add && S.sel) for (let y = 0; y < S.h; y++) for (let x = 0; x < S.w; x++) if (inSel(x, y)) full[y * S.w + x] = 1;
        let x0 = S.w, y0 = S.h, x1 = -1, y1 = -1;
        for (let y = 0; y < S.h; y++) for (let x = 0; x < S.w; x++) if (full[y * S.w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        if (x1 < 0) { S.sel = null; return; }
        const w = x1 - x0 + 1, h = y1 - y0 + 1, mask = new Uint8Array(w * h);
        let all = true;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = full[(y0 + y) * S.w + x0 + x]; mask[y * w + x] = v; if (!v) all = false; }
        S.sel = { x: x0, y: y0, w, h, mask: all ? null : mask };
      }
      function edgesOf(mask, w, h) {
        const segs = [];
        const at = (x, y) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x];
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          if (!mask[y * w + x]) continue;
          if (!at(x, y - 1)) segs.push(x, y, x + 1, y);
          if (!at(x, y + 1)) segs.push(x, y + 1, x + 1, y + 1);
          if (!at(x - 1, y)) segs.push(x, y, x, y + 1);
          if (!at(x + 1, y)) segs.push(x + 1, y, x + 1, y + 1);
        }
        return segs;
      }

      /* ---------- historique ---------- */
      const snapDoc = () => ({ w: S.w, h: S.h, active: S.active, origin: { ...S.origin }, layers: S.layers.map((l) => ({ ...l, data: l.data.slice() })) });
      // une action = un seul Ctrl+Z : tout ce qui est enregistré pendant un même geste (agrandir le dessin, peindre…) porte le même numéro
      let histGroup = 0, histSeq = 0;
      const beginGroup = () => { histGroup = ++histSeq; };
      const endGroup = () => { histGroup = 0; };
      const HMAX = 80;
      function pushHist(e) { e.g = histGroup || ++histSeq; S.hist.push(e); while (S.hist.length > HMAX) S.hist.shift(); S.fut = []; S.dirty = true; }
      function pushDoc() { pushHist({ doc: snapDoc() }); syncHist(); }
      let strokeBefore = null, strokeRect = null;
      // strokeMark : priorité déjà posée sur chaque pixel du trait (intérieur > bord > anneau adouci), pour que les tampons ne s'écrasent pas entre eux
      let strokeMark = null;
      // strokeUnder : ce qu'on voit sous le calque (calques du dessous, puis la carte), pour fondre l'anticrénelage dedans
      let strokeUnder = null, mapUnder = null, mapUnderKey = '';
      function refreshMapUnder() {
        const key = `${S.world}:${S.origin.x}:${S.origin.y}:${S.w}:${S.h}`;
        if (mapUnderKey === key) return;
        mapUnderKey = key; mapUnder = null;
        A.fetchRegion(S.origin.x, S.origin.y, S.w, S.h, S.world).then((r) => { if (mapUnderKey === key && r && r.canvas && r.canvas.width === S.w && r.canvas.height === S.h) mapUnder = r.canvas.getContext('2d').getImageData(0, 0, S.w, S.h).data; }).catch(() => {});
      }
      function buildUnder() {
        const n = S.w * S.h * 4, out = new Uint8ClampedArray(n);
        let bg = null;
        if (live) { refreshMapUnder(); bg = mapUnder; }
        else if (S.mapBg && S.bgCanvas && S.bgCanvas.width === S.w && S.bgCanvas.height === S.h) { try { bg = S.bgCanvas.getContext('2d').getImageData(0, 0, S.w, S.h).data; } catch (e) { bg = null; } }
        if (bg && bg.length === n) out.set(bg);
        for (let k = 0; k <= S.active; k++) {
          const L = S.layers[k]; if (!L.visible) continue;
          const d = k === S.active ? strokeBefore : L.data;
          for (let i = 0; i < n; i += 4) if (d[i + 3]) { out[i] = d[i]; out[i + 1] = d[i + 1]; out[i + 2] = d[i + 2]; out[i + 3] = 255; }
        }
        return out;
      }
      function beginStroke() { strokeBefore = layer().data.slice(); strokeRect = null; strokeMark = new Uint16Array(S.w * S.h); strokeUnder = null; }
      const underOf = () => { if (!strokeUnder && strokeBefore) strokeUnder = buildUnder(); return strokeUnder; };
      function growStroke(x0, y0, x1, y1) {
        if (!strokeRect) strokeRect = [x0, y0, x1, y1];
        else { strokeRect[0] = Math.min(strokeRect[0], x0); strokeRect[1] = Math.min(strokeRect[1], y0); strokeRect[2] = Math.max(strokeRect[2], x1); strokeRect[3] = Math.max(strokeRect[3], y1); }
      }
      function endStroke() {
        if (!strokeBefore || !strokeRect) { strokeBefore = null; strokeMark = null; return; }
        const [x0, y0, x1, y1] = strokeRect.map((v, i) => clamp(v, 0, i % 2 ? S.h : S.w));
        const w = x1 - x0, h = y1 - y0;
        if (w > 0 && h > 0) {
          const part = new Uint8ClampedArray(w * h * 4);
          for (let y = 0; y < h; y++) part.set(strokeBefore.subarray(((y0 + y) * S.w + x0) * 4, ((y0 + y) * S.w + x1) * 4), y * w * 4);
          pushHist({ layerId: layer().id, x: x0, y: y0, w, h, data: part });
        }
        strokeBefore = null; strokeRect = null; strokeMark = null; strokeUnder = null;
        syncHist();
      }
      function swapRect(step) {
        const l = S.layers.find((x) => x.id === step.layerId);
        if (!l) return null;
        const cur = new Uint8ClampedArray(step.w * step.h * 4);
        for (let y = 0; y < step.h; y++) {
          const a = ((step.y + y) * S.w + step.x) * 4;
          cur.set(l.data.subarray(a, a + step.w * 4), y * step.w * 4);
          l.data.set(step.data.subarray(y * step.w * 4, (y + 1) * step.w * 4), a);
        }
        compositeRect(step.x, step.y, step.x + step.w, step.y + step.h);
        return { ...step, data: cur };
      }
      function restoreDoc(d) {
        const cur = snapDoc();
        S.w = d.w; S.h = d.h; S.active = d.active; S.origin = d.origin; S.layers = d.layers;
        resizeComp(); renderLayers(); if (S.mapBg) loadBg();
        return cur;
      }
      function undo() {
        if (S.floating) { cancelFloating(); return; }
        if (!S.hist.length) return;
        const g0 = S.hist[S.hist.length - 1].g;
        while (S.hist.length && S.hist[S.hist.length - 1].g === g0) {
          const st = S.hist.pop();
          const back = st.doc ? { doc: restoreDoc(st.doc) } : swapRect(st);
          if (back) { back.g = g0; S.fut.push(back); }
        }
        S.dirty = true; compositeAll(); renderLayers(); syncHist(); refreshThumbs(); draw();
      }
      function redo() {
        if (!S.fut.length) return;
        const g0 = S.fut[S.fut.length - 1].g;
        while (S.fut.length && S.fut[S.fut.length - 1].g === g0) {
          const st = S.fut.pop();
          const back = st.doc ? { doc: restoreDoc(st.doc) } : swapRect(st);
          if (back) { back.g = g0; S.hist.push(back); }
        }
        S.dirty = true; compositeAll(); renderLayers(); syncHist(); refreshThumbs(); draw();
      }
      function syncHist() { bar.querySelector('[data-a="undo"]').disabled = !S.hist.length && !S.floating; bar.querySelector('[data-a="redo"]').disabled = !S.fut.length; }

      /* ---------- vue ---------- */
      let dpr = 1;
      function fitStage() {
        if (live) setTimeout(liveSync, 50);
        dpr = window.devicePixelRatio || 1;
        cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr);
        cv.style.width = `${innerWidth}px`; cv.style.height = `${innerHeight}px`;
        draw();
      }
      // zone libre pour le dessin : l'écran moins les panneaux rangés sur les bords
      function area() {
        let x0 = 0, y0 = 0, x1 = innerWidth, y1 = innerHeight;
        for (const key of ['tools', 'panel', 'brushes', 'grads', 'texts', 'layers', 'refs', 'tl', 'bar', 'tr']) {
          const pe = PANES[key]; if (!pe || pe.hidden || hostOf(key)) continue;
          const L = layout[key], edge = L ? L.edge : DEF_EDGE[key]; if (!edge) continue;
          const r = pe.getBoundingClientRect(); if (!r.width) continue;
          if (edge === 'left') x0 = Math.max(x0, r.right); else if (edge === 'right') x1 = Math.min(x1, r.left);
          else if (edge === 'top') y0 = Math.max(y0, r.bottom); else if (edge === 'bottom') y1 = Math.min(y1, r.top);
        }
        y1 = Math.min(y1, innerHeight - 64);
        return { x: x0 + 8, y: y0 + 8, w: Math.max(100, x1 - x0 - 16), h: Math.max(100, y1 - y0 - 16) };
      }
      function fitView() {
        if (live) { liveFit(); return; }
        const a = area();
        const z = Math.min((a.w - 40) / S.w, (a.h - 40) / S.h);
        S.zoom = z >= 1 ? clamp(Math.floor(z), 1, 64) : clamp(z, 0.25, 1);
        S.ox = Math.round(a.x + (a.w - S.w * S.zoom) / 2); S.oy = Math.round(a.y + (a.h - S.h * S.zoom) / 2);
        draw();
      }
      function zoomAt(f, cx, cy) {
        if (live) { const m = A.map(); if (m) m.easeTo({ zoom: m.getZoom() + Math.log2(f), around: m.unproject(mapPt(cx, cy)), duration: 120 }); return; }
        const nz = clamp(S.zoom * f, 0.25, 80);
        let z = nz >= 1 ? Math.round(nz) : nz;
        // au-dessus de 100 % le zoom est entier : on avance d'au moins un cran
        if (z === S.zoom && S.zoom >= 1) z = clamp(S.zoom + (f > 1 ? 1 : -1), 0.25, 80);
        if (z < 1 && S.zoom >= 1 && f < 1) z = Math.min(z, 0.8);
        if (z === S.zoom) return;
        S.ox = cx - (cx - S.ox) * (z / S.zoom); S.oy = cy - (cy - S.oy) * (z / S.zoom);
        S.zoom = z; draw();
      }
      let live = false;
      const mapPt = (cx, cy) => { const r = A.map().getContainer().getBoundingClientRect(); return [cx - r.left, cy - r.top]; };
      function liveSync() {
        const m = A.map(); if (!live || !m) return;
        const r = m.getContainer().getBoundingClientRect();
        const p0 = m.project(A.fromGrid(S.origin.x, S.origin.y, S.world));
        const p1 = m.project(A.fromGrid(S.origin.x + 256, S.origin.y, S.world));
        S.zoom = (p1.x - p0.x) / 256; S.ox = r.left + p0.x; S.oy = r.top + p0.y;
        draw();
      }
      function liveFit() {
        const m = A.map(); if (!m) return;
        const a = area();
        const want = Math.min((a.w - 60) / S.w, (a.h - 60) / S.h, 24);
        const p0 = m.project(A.fromGrid(S.origin.x, S.origin.y, S.world)), p1 = m.project(A.fromGrid(S.origin.x + 256, S.origin.y, S.world));
        const ppp = (p1.x - p0.x) / 256 || 1;
        const zoom = clamp(m.getZoom() + Math.log2(want / ppp), m.getMinZoom(), m.getMaxZoom());
        // centre du canvas placé au centre de la zone de travail (et pas de l'écran)
        const r = m.getContainer().getBoundingClientRect();
        const off = [(a.x + a.w / 2) - (r.left + r.width / 2), (a.y + a.h / 2) - (r.top + r.height / 2)];
        m.jumpTo({ center: A.fromGrid(S.origin.x + S.w / 2, S.origin.y + S.h / 2, S.world), zoom });
        m.panBy([-off[0], -off[1]], { duration: 0 });
        liveSync();
      }
      function canLive() { const m = A.map(); return !!(m && typeof m.project === 'function' && A.currentWorld() === S.world); }
      function setLive(on, fit = true) {
        const m = A.map();
        if (on && !canLive()) { toast(T('worldUnsupported'), 'err'); on = false; }
        if (live === on) return;
        live = on;
        ui.classList.toggle('live', live);
        document.documentElement.classList.toggle('bpe-live', live);
        bar.querySelector('[data-a="map"]').classList.toggle('on', live);
        if (live) { m.on('move', liveSync); if (fit) liveFit(); else liveSync(); }
        else if (picking) endPick(null);
        else { if (m) m.off('move', liveSync); fitView(); }
      }
      // agrandit le canvas pour inclure la zone (mode carte) ; renvoie le décalage appliqué
      function growTo(x0, y0, x1, y1) {
        if (!live) return null;
        if (x0 >= 0 && y0 >= 0 && x1 < S.w && y1 < S.h) return null;
        const M = 8;
        const nx0 = Math.min(0, x0 - M), ny0 = Math.min(0, y0 - M);
        const nx1 = Math.max(S.w, x1 + 1 + M), ny1 = Math.max(S.h, y1 + 1 + M);
        if (nx1 - nx0 > MAXS || ny1 - ny0 > MAXS) return null;
        if (S.floating) commitFloating();
        resizeCanvas(nx1 - nx0, ny1 - ny0, true, nx0, ny0);
        liveSync();
        return { kx: -nx0, ky: -ny0 };
      }
      const toPx = (ex, ey) => ({ x: Math.floor((ex - S.ox) / S.zoom), y: Math.floor((ey - S.oy) / S.zoom), fx: (ex - S.ox) / S.zoom, fy: (ey - S.oy) / S.zoom, sx: ex, sy: ey });

      let hover = null, ants = 0, preview = null, lassoPts = null, checkPat = null;
      function draw() {
        const W = cv.width / dpr, H = cv.height / dpr;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, W, H);
        const z = S.zoom, x = S.ox, y = S.oy, dw = S.w * z, dh = S.h * z;
        const vx0 = Math.max(x, 0), vy0 = Math.max(y, 0), vx1 = Math.min(x + dw, W), vy1 = Math.min(y + dh, H);
        if (!live) {
          g.save();
          g.shadowColor = 'rgba(0,0,0,.12)'; g.shadowBlur = 24; g.shadowOffsetY = 8;
          g.fillStyle = '#fff'; g.fillRect(vx0, vy0, Math.max(0, vx1 - vx0), Math.max(0, vy1 - vy0));
          g.restore();
        }
        g.save();
        g.beginPath(); g.rect(x, y, dw, dh); g.clip();
        if (!live && vx1 > vx0 && vy1 > vy0) {
          const ck = Math.max(8, z >= 8 ? z : 8);
          if (!checkPat || checkPat.ck !== ck) {
            const pc = makeCanvas(Math.ceil(ck * 2), Math.ceil(ck * 2)), px = pc.getContext('2d');
            px.fillStyle = '#f0f0f3'; px.fillRect(ck, 0, ck, ck); px.fillRect(0, ck, ck, ck);
            checkPat = { ck, pat: g.createPattern(pc, 'repeat') };
          }
          checkPat.pat.setTransform(new DOMMatrix().translate(x, y));
          g.fillStyle = checkPat.pat; g.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
        }
        g.imageSmoothingEnabled = false;
        if (S.mapBg && S.bgCanvas) { g.globalAlpha = 0.55; g.drawImage(S.bgCanvas, x, y, dw, dh); g.globalAlpha = 1; }
        drawRefs(false);
        g.drawImage(comp, x, y, dw, dh);
        fxDraw(x, y, dw, dh);
        if (S.floating && !live) { const f = S.floating; g.drawImage(f.canvas, x + f.x * z, y + f.y * z, f.w * z, f.h * z); }
        if (preview && preview.pts) {
          g.fillStyle = preview.erase || (S.color && S.color.transparent) ? 'rgba(255,255,255,.8)' : (S.color ? S.color.hex : '#000');
          for (let i = 0; i < preview.pts.length; i += 2) g.fillRect(x + preview.pts[i] * z, y + preview.pts[i + 1] * z, Math.ceil(z), Math.ceil(z));
        }
        if (z >= 10) {
          g.strokeStyle = 'rgba(0,0,0,.07)'; g.lineWidth = 1; g.beginPath();
          const sx0 = Math.max(0, Math.floor(-x / z)), sx1 = Math.min(S.w, Math.ceil((W - x) / z));
          const sy0 = Math.max(0, Math.floor(-y / z)), sy1 = Math.min(S.h, Math.ceil((H - y) / z));
          for (let i = sx0; i <= sx1; i++) { g.moveTo(Math.round(x + i * z) + 0.5, y + sy0 * z); g.lineTo(Math.round(x + i * z) + 0.5, y + sy1 * z); }
          for (let j = sy0; j <= sy1; j++) { g.moveTo(x + sx0 * z, Math.round(y + j * z) + 0.5); g.lineTo(x + sx1 * z, Math.round(y + j * z) + 0.5); }
          g.stroke();
        }
        g.restore();
        if (drag && drag.tool === 'gradient') {
          // aperçu du dégradé, aussi hors du dessin en mode carte
          if (gradPrev && gradPrev.R) { const R = gradPrev.R; g.imageSmoothingEnabled = false; g.globalAlpha = 0.92; g.drawImage(gradPrev, x + R.x0 * z, y + R.y0 * z, R.w * z, R.h * z); g.globalAlpha = 1; }
          const a0 = drag.start, b0 = drag.last || a0, sx = x + (a0.x + 0.5) * z, sy = y + (a0.y + 0.5) * z, ex = x + (b0.x + 0.5) * z, ey = y + (b0.y + 0.5) * z;
          g.lineWidth = 2; g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
          g.lineWidth = 1; g.setLineDash([5, 4]); g.strokeStyle = '#3056ff'; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke(); g.setLineDash([]);
          const rp = curRamp();
          for (const [qx, qy, c] of [[sx, sy, rp[0]], [ex, ey, rp[rp.length - 1]]]) { g.beginPath(); g.arc(qx, qy, 7, 0, Math.PI * 2); g.fillStyle = c && !c.transparent ? c.hex : '#e5e5e5'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke(); }
        }
        if (S.floating && live) { const f = S.floating; g.imageSmoothingEnabled = false; g.drawImage(f.canvas, x + f.x * z, y + f.y * z, f.w * z, f.h * z); }
        if (picking) {
          if (pickRect) {
            const px = x + pickRect.x * z, py = y + pickRect.y * z, pw = pickRect.w * z, ph = pickRect.h * z;
            g.fillStyle = 'rgba(48,86,255,.12)'; g.fillRect(px, py, pw, ph);
            g.setLineDash([6, 4]); g.strokeStyle = '#3056ff'; g.lineWidth = 2; g.strokeRect(Math.round(px) - 0.5, Math.round(py) - 0.5, pw + 1, ph + 1); g.setLineDash([]);
            const lbl = `${pickRect.w} × ${pickRect.h}`;
            g.font = '800 13px Satoshi, sans-serif';
            const tw = g.measureText(lbl).width + 16;
            g.fillStyle = '#3056ff'; g.beginPath(); g.roundRect(px, py - 28, tw, 22, 11); g.fill();
            g.fillStyle = '#fff'; g.fillText(lbl, px + 8, py - 12);
          }
        } else if (live) { g.setLineDash([6, 4]); g.strokeStyle = 'rgba(48,86,255,.9)'; g.lineWidth = 1.5; g.strokeRect(Math.round(x) - 0.5, Math.round(y) - 0.5, dw + 1, dh + 1); g.setLineDash([]); }
        else { g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 1; g.strokeRect(Math.round(x) - 0.5, Math.round(y) - 0.5, dw + 1, dh + 1); }
        // contour de sélection (fourmis)
        const drawAnts = (segs, ox, oy) => {
          g.beginPath();
          for (let i = 0; i < segs.length; i += 4) { g.moveTo(Math.round(x + (ox + segs[i]) * z) + 0.5, Math.round(y + (oy + segs[i + 1]) * z) + 0.5); g.lineTo(Math.round(x + (ox + segs[i + 2]) * z) + 0.5, Math.round(y + (oy + segs[i + 3]) * z) + 0.5); }
          g.lineWidth = 1; g.setLineDash([]); g.strokeStyle = '#fff'; g.stroke();
          g.setLineDash([5, 4]); g.lineDashOffset = -ants; g.strokeStyle = '#111'; g.stroke(); g.setLineDash([]);
        };
        const rectSegs = (w, h) => [0, 0, w, 0, w, 0, w, h, w, h, 0, h, 0, h, 0, 0];
        if (S.floating) { const f = S.floating; drawAnts(f.mask ? (f.edges || (f.edges = edgesOf(f.mask, f.w, f.h))) : rectSegs(f.w, f.h), f.x, f.y); }
        else if (S.sel) { const s = S.sel; drawAnts(s.mask ? (s.edges || (s.edges = edgesOf(s.mask, s.w, s.h))) : rectSegs(s.w, s.h), s.x, s.y); }
        if (lassoPts && lassoPts.length > 1) {
          g.beginPath(); g.moveTo(x + lassoPts[0] * z, y + lassoPts[1] * z);
          for (let i = 2; i < lassoPts.length; i += 2) g.lineTo(x + lassoPts[i] * z, y + lassoPts[i + 1] * z);
          g.strokeStyle = '#3056ff'; g.lineWidth = 1.5; g.setLineDash([4, 3]); g.stroke(); g.setLineDash([]);
        }
        drawRefs(true);
        const ar = S.refEdit ? refAct() : null;
        if (ar && ar.visible) {
          const r = ar;
          g.setLineDash([6, 4]); g.strokeStyle = '#3056ff'; g.lineWidth = 1.5;
          g.strokeRect(S.ox + r.x * z, S.oy + r.y * z, r.w * z, r.h * z); g.setLineDash([]);
          drawHandles(r);
        } else if (S.floating && S.tool === 'move') drawHandles(S.floating);
        if (!picking && hover && hover.x >= 0 && hover.y >= 0 && hover.x < S.w && hover.y < S.h && ['pencil', 'eraser', 'line', 'rect', 'ellipse'].includes(S.tool) && !preview) {
          const col = S.tool === 'eraser' || (S.color && S.color.transparent) ? 'rgba(0,0,0,.6)' : (S.color ? S.color.hex : '#000');
          if (S.tool === 'pencil' || S.tool === 'eraser' || S.tool === 'line') {
            // empreinte réelle du pinceau sous le curseur
            const t = brushTip(curBrush(), S.size);
            g.fillStyle = col; g.globalAlpha = 0.35;
            for (let o = 0; o < t.offs.length; o += 2) g.fillRect(x + (hover.x + t.offs[o]) * z, y + (hover.y + t.offs[o + 1]) * z, z, z);
            g.globalAlpha = 1; g.strokeStyle = col; g.lineWidth = 1.5;
            g.strokeRect(x + (hover.x + t.x0) * z, y + (hover.y + t.y0) * z, (t.x1 - t.x0 + 1) * z, (t.y1 - t.y0 + 1) * z);
          } else {
            const half = Math.floor((S.size - 1) / 2);
            g.strokeStyle = col; g.lineWidth = 1.5;
            g.strokeRect(x + (hover.x - half) * z, y + (hover.y - half) * z, S.size * z, S.size * z);
          }
        }
        zoomEl.querySelector('span').textContent = `${Math.round(S.zoom * 100)}%`;
        const pos = hover && hover.x >= 0 && hover.y >= 0 && hover.x < S.w && hover.y < S.h ? `X ${S.origin.x + hover.x}  Y ${S.origin.y + hover.y}` : '';
        const sel = S.floating || S.sel;
        status.textContent = [`${S.w} × ${S.h}`, pos, sel ? `▢ ${sel.w} × ${sel.h}` : ''].filter(Boolean).join('   ·   ');
      }
      let antsTick = 0;
      const antsTimer = setInterval(() => { const a = (S.sel || S.floating) && ++antsTick % 2 === 0; if (a) ants = (ants + 1) % 18; if (a || fxLayers.size || fxDirty) draw(); }, 60);

      /* ---------- pinceau et formes ---------- */
      // forme d'une pointe : liste de décalages [dx, dy]
      const tipCache = new Map();
      function tip(size, round) {
        const k = `${size}:${round}`;
        if (tipCache.has(k)) return tipCache.get(k);
        const half = Math.floor((size - 1) / 2), out = [], c = (size - 1) / 2, r = size / 2;
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
          if (round && size > 2 && (x - c) ** 2 + (y - c) ** 2 > r * r - 0.25) continue;
          out.push(x - half, y - half);
        }
        tipCache.set(k, out);
        return out;
      }
      // pointe d'un pinceau à une taille donnée : décalages + boîte englobante
      const brTipCache = new Map();
      function brushTip(br, size) {
        const key = `${br.id}:${br.rev || 0}:${size}:${br.aa ? br.aaw || 1 : 0}`;
        if (brTipCache.has(key)) return brTipCache.get(key);
        let offs;
        if (br.tip === 'custom' && br.mask) {
          const k = Math.max(1, size), m = br.mask, ox = Math.floor((m.w * k) / 2), oy = Math.floor((m.h * k) / 2);
          offs = [];
          for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
            if (m.rows[y][x] !== '#') continue;
            for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) offs.push(x * k + dx - ox, y * k + dy - oy);
          }
        } else offs = tip(Math.max(size, br.minSize || 1), br.tip === 'round');
        // pixels du bord (pour la couleur de bordure) et anneau adouci autour (anticrénelage)
        const inTip = new Set(); for (let i = 0; i < offs.length; i += 2) inTip.add(`${offs[i]},${offs[i + 1]}`);
        const edge = new Uint8Array(offs.length / 2);
        for (let i = 0; i < offs.length; i += 2) { const x = offs[i], y = offs[i + 1]; edge[i / 2] = !inTip.has(`${x - 1},${y}`) || !inTip.has(`${x + 1},${y}`) || !inTip.has(`${x},${y - 1}`) || !inTip.has(`${x},${y + 1}`) ? 1 : 0; }
        const ring = [], cov = [];
        let kcore = null;
        if (br.aa) {
          // anticrénelage : on compare chaque pixel à la forme idéale du pinceau (cercle, carré, ou la forme dessinée)
          // et on garde la part du pixel couverte, fondue sur « douceur » pixels. Un bord droit ne bouge pas,
          // les courbes et les diagonales reçoivent des couleurs intermédiaires.
          const W = br.aaw || 1, sz = Math.max(size, br.minSize || 1), half = Math.floor((sz - 1) / 2), c0 = (sz - 1) / 2 - half, R = sz / 2;
          const sdf = br.tip === 'round' ? (x, y) => Math.hypot(x - c0, y - c0) - R
            : br.tip === 'square' ? (x, y) => Math.max(Math.abs(x - c0), Math.abs(y - c0)) - R
            : (x, y) => { let dmin = Infinity; for (let j = 0; j < offs.length; j += 2) { const dd = (offs[j] - x) ** 2 + (offs[j + 1] - y) ** 2; if (dd < dmin) dmin = dd; } return Math.sqrt(dmin) - 0.5; };
          const covAt = (x, y) => clamp(0.5 - sdf(x, y) / W, 0, 1);
          kcore = new Float32Array(offs.length / 2);
          for (let i = 0; i < offs.length; i += 2) kcore[i / 2] = br.tip === 'custom' ? 1 : Math.max(0.5, covAt(offs[i], offs[i + 1]));
          const seen = new Set(), E = Math.ceil(W) + 1;
          for (let i = 0; i < offs.length; i += 2) for (let dy = -E; dy <= E; dy++) for (let dx = -E; dx <= E; dx++) {
            const x = offs[i] + dx, y = offs[i + 1] + dy, k = `${x},${y}`;
            if (inTip.has(k) || seen.has(k)) continue;
            seen.add(k);
            const cv = covAt(x, y);
            if (cv <= 0.06) continue;
            ring.push(x, y); cov.push(Math.min(0.94, cv));
          }
        }
        let x0 = 0, y0 = 0, x1 = 0, y1 = 0;
        for (const arr of [offs, ring]) for (let i = 0; i < arr.length; i += 2) { x0 = Math.min(x0, arr[i]); x1 = Math.max(x1, arr[i]); y0 = Math.min(y0, arr[i + 1]); y1 = Math.max(y1, arr[i + 1]); }
        const t = { offs, edge, ring, cov, kcore, x0, y0, x1, y1 };
        if (brTipCache.size > 200) brTipCache.clear();
        brTipCache.set(key, t);
        return t;
      }
      const SHAPE_BR = { id: '__shape', tip: 'square', pattern: 'none', density: 1, jitter: 0, minSize: 1, spacing: 1, blend: 'normal', opacity: 1, aa: false, edge: 'none' };
      const brushExt = () => { const t = brushTip(curBrush(), S.size); return Math.max(-t.x0, -t.y0, t.x1, t.y1) + (curBrush().jitter || 0); };
      // couleurs posables : on ramène tout mélange vers la couleur du jeu la plus proche
      const nearest = makeNear(pal), nearestAll = makeNear(pal, true);
      const shade = (c, k) => { if (!c || c.transparent) return c; const t = k < 0 ? c.rgb.map((v) => v * (1 + k)) : c.rgb.map((v) => v + (255 - v) * k); const n2 = nearest(...t); return n2 && n2.hex !== c.hex ? n2 : nearest(...(k < 0 ? c.rgb.map((v) => v * 0.45) : c.rgb.map((v) => v + (255 - v) * 0.7))) || c; };
      function edgeColor(br, c) {
        if (br.edge === 'second') return S.color2 || c;
        if (br.edge === 'dark') return shade(c, -0.35);
        if (br.edge === 'light') return shade(c, 0.4);
        return c;
      }
      function plot(cx, cy, erase, mode) {
        const L = layer(); if (!L || !L.visible) return;
        const br = mode === 'shape' ? SHAPE_BR : curBrush();
        const t = brushTip(br, S.size), c = S.color, offs = t.offs, d = L.data, base = strokeBefore || d;
        if (br.jitter) { cx += Math.round((Math.random() * 2 - 1) * br.jitter); cy += Math.round((Math.random() * 2 - 1) * br.jitter); }
        const ox = S.origin.x, oy = S.origin.y, pat = br.pattern, dens = br.density;
        const blend = br.blend || 'normal', op = br.opacity == null ? 1 : br.opacity, ec = br.edge && br.edge !== 'none' ? edgeColor(br, c) : null;
        const mk = strokeMark && strokeMark.length === S.w * S.h ? strokeMark : null;
        const lockA = !!L.lockA;
        const write = (pi, col, k) => {
          const i = pi * 4;
          if (lockA && !base[i + 3]) return;
          if (erase || (col && col.transparent)) { if (k >= 0.5 && !lockA) d[i + 3] = 0; return; }
          if (!col) return;
          let out = col;
          if (blend !== 'normal' || k < 1) {
            // dessous : le calque lui-même, sinon ce qu'on voit sous lui (calques du dessous, carte)
            let src = base;
            if (!base[i + 3]) { const u = underOf(); src = u && u[i + 3] ? u : null; }
            // sur du vide, le fondu se fait vers la couleur secondaire (comme la couleur d'arrière-plan de Krita)
            const bgc = !src && S.color2 && !S.color2.transparent && S.color2.rgb ? S.color2.rgb : null;
            if (!src && !bgc) { if (k < 0.5) return; }
            else {
              const b0 = src ? [src[i], src[i + 1], src[i + 2]] : bgc.slice(), m = blendRgb(blend, b0, col.rgb);
              out = nearest(b0[0] + (m[0] - b0[0]) * k, b0[1] + (m[1] - b0[1]) * k, b0[2] + (m[2] - b0[2]) * k) || col;
              if (src && src !== base && out.rgb[0] === src[i] && out.rgb[1] === src[i + 1] && out.rgb[2] === src[i + 2]) return;
              if (!src && out.rgb[0] === b0[0] && out.rgb[1] === b0[1] && out.rgb[2] === b0[2]) return;
            }
          }
          d[i] = out.rgb[0]; d[i + 1] = out.rgb[1]; d[i + 2] = out.rgb[2]; d[i + 3] = 255;
        };
        const put = (xx, yy, col, k, pri) => {
          if (xx < 0 || yy < 0 || xx >= S.w || yy >= S.h || !inSel(xx, yy)) return;
          if (pat !== 'none' && !patOk(pat, ox + xx, oy + yy)) return;
          const pi = yy * S.w + xx;
          if (mk) { const v = pri * 1000 + Math.round(k * 999); if (mk[pi] >= v) return; if (dens < 1 && Math.random() > dens) return; mk[pi] = v; }
          else if (dens < 1 && Math.random() > dens) return;
          write(pi, col, k);
        };
        if (ec && mk && !erase) {
          // bordure : calculée sur tout le trait, pas sur chaque tampon, pour ne garder que le contour extérieur
          for (let o = 0; o < offs.length; o += 2) put(cx + offs[o], cy + offs[o + 1], c, op * (t.kcore ? t.kcore[o >> 1] : 1), 3);
          for (let o = 0; o < t.ring.length; o += 2) put(cx + t.ring[o], cy + t.ring[o + 1], ec, op * t.cov[o >> 1], 1);
          const core = (x2, y2) => x2 >= 0 && y2 >= 0 && x2 < S.w && y2 < S.h && mk[y2 * S.w + x2] >= 3000;
          for (let y2 = Math.max(0, cy + t.y0 - 1); y2 <= Math.min(S.h - 1, cy + t.y1 + 1); y2++) for (let x2 = Math.max(0, cx + t.x0 - 1); x2 <= Math.min(S.w - 1, cx + t.x1 + 1); x2++) {
            if (!core(x2, y2)) continue;
            const isEdge = !core(x2 - 1, y2) || !core(x2 + 1, y2) || !core(x2, y2 - 1) || !core(x2, y2 + 1);
            write(y2 * S.w + x2, isEdge ? ec : c, (mk[y2 * S.w + x2] % 1000) / 999);
          }
        } else {
          for (let o = 0; o < offs.length; o += 2) { const isEdge = ec && t.edge[o >> 1]; put(cx + offs[o], cy + offs[o + 1], isEdge ? ec : c, op * (t.kcore ? t.kcore[o >> 1] : 1), isEdge ? 2 : 3); }
          for (let o = 0; o < t.ring.length; o += 2) put(cx + t.ring[o], cy + t.ring[o + 1], ec || c, op * t.cov[o >> 1], 1);
        }
        growStroke(cx + t.x0 - 1, cy + t.y0 - 1, cx + t.x1 + 2, cy + t.y1 + 2);
        compositeRect(cx + t.x0 - 1, cy + t.y0 - 1, cx + t.x1 + 2, cy + t.y1 + 2);
      }
      // pixel parfait : retire le pixel du coin dans les escaliers en « L »
      let ppPts = [];
      function ppCheck() {
        const n = ppPts.length; if (n < 3) return;
        const a = ppPts[n - 3], b = ppPts[n - 2], c = ppPts[n - 1];
        if (Math.abs(a[0] - c[0]) !== 1 || Math.abs(a[1] - c[1]) !== 1) return;
        if (!((b[0] === a[0] && b[1] === c[1]) || (b[1] === a[1] && b[0] === c[0]))) return;
        const L = layer(), i = (b[1] * S.w + b[0]) * 4;
        if (strokeBefore && b[0] >= 0 && b[1] >= 0 && b[0] < S.w && b[1] < S.h) { L.data.set(strokeBefore.subarray(i, i + 4), i); compositeRect(b[0], b[1], b[0] + 1, b[1] + 1); }
        ppPts.splice(n - 2, 1);
      }
      function linePts(x0, y0, x1, y1, out = []) {
        const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        for (;;) {
          out.push(x0, y0);
          if (x0 === x1 && y0 === y1) break;
          const e2 = 2 * err;
          if (e2 >= dy) { err += dy; x0 += sx; }
          if (e2 <= dx) { err += dx; y0 += sy; }
        }
        return out;
      }
      let strokeN = 0, lastPt = null;
      function line(x0, y0, x1, y1, erase) {
        const br = curBrush(), p = linePts(x0, y0, x1, y1), pp = br.pp && br.tip !== 'custom' && S.size === 1;
        for (let i = 0; i < p.length; i += 2) {
          if (lastPt && lastPt[0] === p[i] && lastPt[1] === p[i + 1]) continue;
          lastPt = [p[i], p[i + 1]];
          if (pp) {
            const last = ppPts[ppPts.length - 1];
            if (last && last[0] === p[i] && last[1] === p[i + 1]) continue;
            plot(p[i], p[i + 1], erase); ppPts.push([p[i], p[i + 1]]); ppCheck();
            continue;
          }
          if (br.spacing > 1 && (strokeN++ % br.spacing) !== 0) continue;
          plot(p[i], p[i + 1], erase);
        }
      }
      function shapePts(tool, a, b, shift) {
        let x0 = a.x, y0 = a.y, x1 = b.x, y1 = b.y;
        if (tool === 'line') {
          if (shift) { const dx = x1 - x0, dy = y1 - y0, ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4), len = Math.max(Math.abs(dx), Math.abs(dy)); x1 = x0 + Math.round(Math.cos(ang) * len); y1 = y0 + Math.round(Math.sin(ang) * len); }
          return linePts(x0, y0, x1, y1);
        }
        if (shift) { const s = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); x1 = x0 + Math.sign(x1 - x0 || 1) * s; y1 = y0 + Math.sign(y1 - y0 || 1) * s; }
        const l = Math.min(x0, x1), r = Math.max(x0, x1), t = Math.min(y0, y1), bt = Math.max(y0, y1), out = [];
        if (tool === 'rect') {
          for (let y = t; y <= bt; y++) for (let x = l; x <= r; x++) if (S.filled || y === t || y === bt || x === l || x === r) out.push(x, y);
          return out;
        }
        const cx = (l + r + 1) / 2, cy = (t + bt + 1) / 2, rx = (r - l + 1) / 2, ry = (bt - t + 1) / 2;
        const inE = (x, y) => ((x + 0.5 - cx) ** 2) / (rx * rx) + ((y + 0.5 - cy) ** 2) / (ry * ry) <= 1.0001;
        for (let y = t; y <= bt; y++) for (let x = l; x <= r; x++) {
          if (!inE(x, y)) continue;
          if (S.filled || !inE(x - 1, y) || !inE(x + 1, y) || !inE(x, y - 1) || !inE(x, y + 1)) out.push(x, y);
        }
        return out;
      }
      // l'outil ligne pose le pinceau choisi le long du trait (forme, motif, espacement) ; rectangle et ellipse gardent un trait carré
      function expandBrush(pts, tool) {
        const set = new Set(), out = [];
        if (tool === 'line') {
          const br = curBrush(), t = brushTip(br, S.size), pp = br.pp && br.tip !== 'custom' && S.size === 1;
          for (let i = 0, n = 0; i < pts.length; i += 2) {
            if (!pp && br.spacing > 1 && (n++ % br.spacing) !== 0) continue;
            for (let o = 0; o < t.offs.length; o += 2) {
              const x = pts[i] + t.offs[o], y = pts[i + 1] + t.offs[o + 1];
              if (br.pattern !== 'none' && !patOk(br.pattern, S.origin.x + x, S.origin.y + y)) continue;
              const k = `${x},${y}`;
              if (!set.has(k)) { set.add(k); out.push(x, y); }
            }
          }
          return out;
        }
        if (S.size === 1) return pts;
        const half = Math.floor((S.size - 1) / 2);
        for (let i = 0; i < pts.length; i += 2) for (let dy = 0; dy < S.size; dy++) for (let dx = 0; dx < S.size; dx++) {
          const x = pts[i] - half + dx, y = pts[i + 1] - half + dy, k = `${x},${y}`;
          if (!set.has(k)) { set.add(k); out.push(x, y); }
        }
        return out;
      }
      /* ---------- dégradé : de la couleur principale à la secondaire, ramené aux couleurs du jeu ---------- */
      // rampe : les couleurs du jeu qu'on croise en allant de la couleur principale à la secondaire,
      // puis on en garde le nombre choisi (les deux bouts compris). Le transparent compte comme une couleur.
      // rampe perso : la liste de couleurs que tu composes toi-même (transparent compris)
      const byHex = (h) => (h === 'transparent' ? TRANSP : pal.find((p) => p.hex === h));
      // N couleurs du jeu le long d'un chemin OKLab : pour chaque étape on prend la couleur la plus proche
      // qui n'est pas encore utilisée, donc on a vraiment N couleurs dès que la palette en a assez
      function pickAlong(c0, labEnd, cEnd, n, all) {
        const cols = pal.filter((p) => (all || !p.locked) && !p.fx && p.rgb && p !== c0 && p !== cEnd);
        const A0 = toLab(c0.rgb), B0 = labEnd;
        const ca = Math.hypot(A0[1], A0[2]), cb = Math.hypot(B0[1], B0[2]);
        let ha = Math.atan2(A0[2], A0[1]), hb = Math.atan2(B0[2], B0[1]);
        if (ca < 0.02) ha = hb; if (cb < 0.02) hb = ha;
        let dh = hb - ha; if (dh > Math.PI) dh -= 2 * Math.PI; if (dh < -Math.PI) dh += 2 * Math.PI;
        const at = (t) => { const h = ha + dh * t, c = ca + (cb - ca) * t; return [A0[0] + (B0[0] - A0[0]) * t, c * Math.cos(h), c * Math.sin(h)]; };
        const labs = new Map(cols.map((p) => [p, toLab(p.rgb)]));
        const out = [c0], used = new Set([c0]);
        const inner = cEnd ? n - 2 : n - 1;
        for (let i = 1; i <= inner; i++) {
          const t = cEnd ? i / (n - 1) : i / Math.max(1, n - 1);
          const q = at(t);
          // la clarté avance toujours dans le même sens (pas de retour en arrière dans le dégradé)
          const prevL = toLab(out[out.length - 1].rgb)[0], dir = Math.sign(B0[0] - A0[0]) || 1;
          let best = null, bd = Infinity;
          for (const pass of [true, false]) {
            for (const [p, l] of labs) {
              if (used.has(p) || (pass && (l[0] - prevL) * dir < -0.01)) continue;
              const d = (l[0] - q[0]) ** 2 + 2.5 * ((l[1] - q[1]) ** 2 + (l[2] - q[2]) ** 2);
              if (d < bd) { bd = d; best = p; }
            }
            if (best) break;
          }
          if (!best) break;
          out.push(best); used.add(best);
        }
        if (cEnd) out.push(cEnd);
        return out;
      }
      function rampOf(gr) {
        const c0 = S.color, c1 = S.color2;
        if (gr.kind === 'custom') return gr.stops.map(byHex).filter(Boolean);
        if (!c0) return [];
        if (gr.kind === 'auto') {
          if (!c1 || c1.hex === c0.hex) return [c0];
          if (c0.transparent || c1.transparent) {
            const solid = c0.transparent ? c1 : c0, seq = fadeTo(solid, gr.n - 1, gr.all).concat([TRANSP]);
            return c0.transparent ? seq.reverse() : seq;
          }
          return pickAlong(c0, toLab(c1.rgb), c1, gr.n, gr.all);
        }
        // fade : tes couleurs, puis le transparent
        if (c0.transparent) return [TRANSP];
        if (c1 && !c1.transparent && c1.hex !== c0.hex) return pickAlong(c0, toLab(c1.rgb), c1, gr.n, gr.all).concat([TRANSP]);
        return fadeTo(c0, gr.n, gr.all).concat([TRANSP]);
      }
      // une seule couleur vers le vide : elle s'éclaircit dans sa teinte (ou fonce si elle est déjà claire)
      function fadeTo(solid, k, all) {
        if (k <= 1) return [solid];
        const A0 = toLab(solid.rgb), c = Math.hypot(A0[1], A0[2]), h = Math.atan2(A0[2], A0[1]);
        const Lt = A0[0] > 0.78 ? A0[0] - 0.5 : Math.min(0.98, A0[0] + 0.5), ct = c * 0.7;
        return pickAlong(solid, [Lt, ct * Math.cos(h), ct * Math.sin(h)], null, k, all);
      }
      const curRamp = () => rampOf(curGrad());
      // couleur d'un point du dégradé (t de 0 à 1), avec la trame choisie
      function rampAt(ramp, t, style, x, y) {
        const m = ramp.length;
        if (m === 1) return ramp[0];
        if (style === 'bands') return ramp[Math.min(m - 1, Math.floor(t * m))];
        const pos = t * (m - 1), i0 = Math.min(m - 2, Math.floor(pos)), f = pos - i0;
        const thr = style === 'fine' ? (BAYER8[(y & 7) * 8 + (x & 7)] + 0.5) / 64 : (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
        return f > thr ? ramp[i0 + 1] : ramp[i0];
      }
      // dessine une rampe dans un petit canvas (le transparent en damier)
      function paintRamp(cvs, ramp, style) {
        const w = cvs.width, h = cvs.height, g2 = cvs.getContext('2d'), im = g2.createImageData(w, h);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4, c = ramp.length ? rampAt(ramp, x / Math.max(1, w - 1), style, x, y) : null;
          if (!c || c.transparent) { const v = ((x >> 1) + (y >> 1)) & 1 ? 255 : 214; im.data[i] = v; im.data[i + 1] = v; im.data[i + 2] = v; }
          else { im.data[i] = c.rgb[0]; im.data[i + 1] = c.rgb[1]; im.data[i + 2] = c.rgb[2]; }
          im.data[i + 3] = 255;
        }
        g2.putImageData(im, 0, 0);
      }
      // mask : 0 = rien, 1 = couleur, 2 = transparent
      // zone couverte par le dégradé : le dessin, et en mode carte la zone tirée (le dessin s'y agrandira)
      function gradRegion(a, b) {
        const L = layer();
        if (!live || S.sel || (L && L.lockA)) return { x0: 0, y0: 0, w: S.w, h: S.h };
        const len = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
        const r = S.grad.type === 'radial' ? len : Math.ceil(len / 2);
        const ox2 = S.grad.type === 'radial' ? a.x : cx, oy2 = S.grad.type === 'radial' ? a.y : cy;
        const x0 = Math.min(0, Math.floor(Math.min(ox2 - r, a.x, b.x))), y0 = Math.min(0, Math.floor(Math.min(oy2 - r, a.y, b.y)));
        const x1 = Math.max(S.w, Math.ceil(Math.max(ox2 + r, a.x, b.x)) + 1), y1 = Math.max(S.h, Math.ceil(Math.max(oy2 + r, a.y, b.y)) + 1);
        return { x0, y0, w: Math.min(MAXS, x1 - x0), h: Math.min(MAXS, y1 - y0) };
      }
      function gradientPixels(a, b, out, mask, R) {
        const ramp = curRamp(); if (!ramp.length) return 0;
        R = R || { x0: 0, y0: 0, w: S.w, h: S.h };
        const L = layer(), base = L.data, g0 = S.grad, m = ramp.length;
        const ax = a.x + 0.5, ay = a.y + 0.5, dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy || 1, len = Math.sqrt(len2);
        const ox = S.origin.x, oy = S.origin.y;
        let n = 0;
        for (let ry = 0; ry < R.h; ry++) for (let rx = 0; rx < R.w; rx++) {
          const x = rx + R.x0, y = ry + R.y0, inside = x >= 0 && y >= 0 && x < S.w && y < S.h;
          if (S.sel && (!inside || !inSel(x, y))) continue;
          const pi = ry * R.w + rx, i = pi * 4, bi = inside ? (y * S.w + x) * 4 : -1;
          if (L.lockA && (!inside || !base[bi + 3])) continue;
          const px = x + 0.5 - ax, py = y + 0.5 - ay;
          const t = clamp(g0.type === 'radial' ? Math.sqrt(px * px + py * py) / len : (px * dx + py * dy) / len2, 0, 1);
          const col = rampAt(ramp, t, g0.style, ox + x, oy + y);
          if (col.transparent) continue; // le transparent laisse ce qui est déjà là
          else { out[i] = col.rgb[0]; out[i + 1] = col.rgb[1]; out[i + 2] = col.rgb[2]; out[i + 3] = 255; mask[pi] = 1; }
          n++;
        }
        return n;
      }
      let gradPrev = null, gradRaf = 0;
      function previewGradient(a, b) {
        if (gradRaf) return;
        gradRaf = requestAnimationFrame(() => {
          gradRaf = 0;
          if (!drag || drag.tool !== 'gradient') return;
          const R = gradRegion(a, drag.last);
          if (R.w * R.h > 600000) { gradPrev = null; draw(); return; }
          const im2 = new ImageData(R.w, R.h), mk3 = new Uint8Array(R.w * R.h);
          gradientPixels(a, drag.last, im2.data, mk3, R);
          if (!gradPrev) { gradPrev = document.createElement('canvas'); }
          gradPrev.width = R.w; gradPrev.height = R.h; gradPrev.getContext('2d').putImageData(im2, 0, 0); gradPrev.R = R;
          draw();
        });
      }
      function applyGradient(a, b) {
        const L = layer(); if (!L || !L.visible || !S.color) return;
        // mode carte : le dessin s'agrandit pour couvrir la zone du dégradé
        if (live && !S.sel && !L.lockA) {
          const len = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
          const r = S.grad.type === 'radial' ? len : Math.ceil(len / 2);
          const ox2 = S.grad.type === 'radial' ? a.x : cx, oy2 = S.grad.type === 'radial' ? a.y : cy;
          const k = growTo(Math.floor(Math.min(ox2 - r, a.x, b.x)), Math.floor(Math.min(oy2 - r, a.y, b.y)), Math.ceil(Math.max(ox2 + r, a.x, b.x)), Math.ceil(Math.max(oy2 + r, a.y, b.y)));
          if (k) { a = { x: a.x + k.kx, y: a.y + k.ky }; b = { x: b.x + k.kx, y: b.y + k.ky }; }
        }
        const out = new Uint8ClampedArray(S.w * S.h * 4), mk2 = new Uint8Array(S.w * S.h);
        if (!gradientPixels(a, b, out, mk2)) return;
        beginStroke();
        for (let pi = 0; pi < mk2.length; pi++) {
          const i = pi * 4;
          if (mk2[pi] === 1) { L.data[i] = out[i]; L.data[i + 1] = out[i + 1]; L.data[i + 2] = out[i + 2]; L.data[i + 3] = 255; }
          else if (mk2[pi] === 2) L.data[i + 3] = 0;
        }
        growStroke(0, 0, S.w, S.h); compositeRect(0, 0, S.w, S.h);
        endStroke(); refreshThumbs(); draw();
        A.playSound('edPaint');
      }
      function commitShape(pts, tool) {
        beginStroke();
        if (tool === 'line') {
          const br = curBrush(), pp = br.pp && br.tip !== 'custom' && S.size === 1;
          for (let i = 0, n = 0; i < pts.length; i += 2) {
            if (!pp && br.spacing > 1 && (n++ % br.spacing) !== 0) continue;
            plot(pts[i], pts[i + 1], false);
          }
        } else for (let i = 0; i < pts.length; i += 2) plot(pts[i], pts[i + 1], false, 'shape');
        endStroke(); refreshThumbs();
        A.playSound('edPaint');
      }
      function floodMask(px, py, layerData) {
        const W = S.w, H = S.h, d = layerData, i0 = (py * W + px) * 4;
        const t = [d[i0], d[i0 + 1], d[i0 + 2], d[i0 + 3]];
        const same = (i) => (t[3] === 0 ? d[i + 3] === 0 : d[i + 3] && d[i] === t[0] && d[i + 1] === t[1] && d[i + 2] === t[2]);
        const m = new Uint8Array(W * H), stack = [px, py];
        while (stack.length) {
          const y = stack.pop(), x = stack.pop();
          if (x < 0 || y < 0 || x >= W || y >= H || m[y * W + x]) continue;
          if (!same((y * W + x) * 4)) continue;
          m[y * W + x] = 1;
          stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
        }
        return m;
      }
      function flood(px, py) {
        const L = layer(); if (!L || !S.color) return;
        if (px < 0 || py < 0 || px >= S.w || py >= S.h || !inSel(px, py)) return;
        const tr = !!S.color.transparent, c = tr ? [0, 0, 0] : S.color.rgb, i0 = (py * S.w + px) * 4, d = L.data;
        if (tr ? !d[i0 + 3] : d[i0 + 3] === 255 && d[i0] === c[0] && d[i0 + 1] === c[1] && d[i0 + 2] === c[2]) return;
        const m = floodMask(px, py, d);
        beginStroke();
        let minX = px, minY = py, maxX = px, maxY = py;
        for (let y = 0; y < S.h; y++) for (let x = 0; x < S.w; x++) {
          if (!m[y * S.w + x] || !inSel(x, y)) continue;
          const i = (y * S.w + x) * 4;
          if (L.lockA && (tr || !d[i + 3])) continue;
          if (tr) d[i + 3] = 0; else { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; }
          if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
        growStroke(minX, minY, maxX + 1, maxY + 1);
        compositeRect(minX, minY, maxX + 1, maxY + 1);
        endStroke();
        A.playSound('edPaint');
      }
      // pipette : le dessin d'abord, puis (en mode carte) le pixel de la carte sous le curseur
      async function pick(px, py, keepTool) {
        const hexOf = (r, g2, b) => `#${[r, g2, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
        const apply = (r, g2, b) => {
          const hex = hexOf(r, g2, b);
          setColor(pal.find((c) => c.hex === hex) || nearest(pal, r, g2, b) || { hex, rgb: [r, g2, b], name: hex }, keepTool);
          A.playSound('click');
        };
        if (px >= 0 && py >= 0 && px < S.w && py < S.h) {
          const i = (py * S.w + px) * 4;
          for (let k = S.layers.length - 1; k >= 0; k--) { const d = S.layers[k].data; if (S.layers[k].visible && d[i + 3]) { apply(d[i], d[i + 1], d[i + 2]); return; } }
        }
        if (!live) return;
        try {
          const r = await A.fetchRegion(S.origin.x + px, S.origin.y + py, 1, 1, S.world);
          const d = r.canvas.getContext('2d').getImageData(0, 0, 1, 1).data;
          if (d[3]) apply(d[0], d[1], d[2]);
        } catch (e) {}
      }

      /* ---------- sélection flottante ---------- */
      function lift(cut) {
        const L = layer(); if (!L) return;
        let r = S.sel;
        if (!r) {
          // pas de sélection : on prend juste la zone dessinée du calque, pour que les poignées collent au dessin
          let x0 = S.w, y0 = S.h, x1 = -1, y1 = -1;
          for (let y = 0; y < S.h; y++) for (let x = 0; x < S.w; x++) if (L.data[(y * S.w + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
          r = x1 < 0 ? { x: 0, y: 0, w: S.w, h: S.h, mask: null } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, mask: null };
        }
        pushDoc();
        const data = new Uint8ClampedArray(r.w * r.h * 4);
        for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
          if (r.mask && !r.mask[y * r.w + x]) continue;
          const si = ((r.y + y) * S.w + r.x + x) * 4, di = (y * r.w + x) * 4;
          data[di] = L.data[si]; data[di + 1] = L.data[si + 1]; data[di + 2] = L.data[si + 2]; data[di + 3] = L.data[si + 3];
          if (cut) L.data[si + 3] = 0;
        }
        compositeRect(r.x, r.y, r.x + r.w, r.y + r.h);
        S.floating = { x: r.x, y: r.y, w: r.w, h: r.h, data, mask: r.mask ? r.mask.slice() : null, canvas: makeCanvas(r.w, r.h, data), layerId: L.id };
        S.sel = null;
        syncHist();
      }
      function commitFloating() {
        const f = S.floating; if (!f) return;
        // poser une sélection flottante fait partie du même geste que sa création (un seul Ctrl+Z)
        const prevG = histGroup;
        if (!histGroup && S.hist.length) histGroup = S.hist[S.hist.length - 1].g;
        try { commitFloating0(f); } finally { histGroup = prevG; }
      }
      function commitFloating0(f) {
        if (live) {
          S.floating = null;
          const k = growTo(f.x, f.y, f.x + f.w - 1, f.y + f.h - 1);
          if (k) { f.x += k.kx; f.y += k.ky; }
          S.floating = f;
        }
        const L = S.layers.find((l) => l.id === f.layerId) || layer();
        for (let y = 0; y < f.h; y++) {
          const ty = f.y + y; if (ty < 0 || ty >= S.h) continue;
          for (let x = 0; x < f.w; x++) {
            const tx2 = f.x + x; if (tx2 < 0 || tx2 >= S.w) continue;
            const si = (y * f.w + x) * 4;
            if (!f.data[si + 3]) continue;
            const di = (ty * S.w + tx2) * 4;
            L.data[di] = f.data[si]; L.data[di + 1] = f.data[si + 1]; L.data[di + 2] = f.data[si + 2]; L.data[di + 3] = 255;
          }
        }
        S.floating = null; S.sel = null; S.dirty = true;
        compositeAll(); syncHist(); renderLayers(); draw();
      }
      function cancelFloating() {
        if (!S.floating) return;
        S.floating = null;
        const st = S.hist.pop();
        if (st && st.doc) restoreDoc(st.doc);
        compositeAll(); syncHist(); draw();
      }
      function pasteFloating(data, w, h, newLayerName) {
        if (S.floating) commitFloating();
        pushDoc();
        if (newLayerName) { S.layers.splice(S.active + 1, 0, newLayer(newLayerName)); S.active += 1; renderLayers(); }
        const a = area();
        let x = Math.round((a.x + a.w / 2 - S.ox) / S.zoom - w / 2), y = Math.round((a.y + a.h / 2 - S.oy) / S.zoom - h / 2);
        if (S.sel) { x = S.sel.x; y = S.sel.y; }
        if (w >= S.w) x = 0; if (h >= S.h) y = 0;
        S.floating = { x: clamp(x, 0, Math.max(0, S.w - 1)), y: clamp(y, 0, Math.max(0, S.h - 1)), w, h, data, mask: null, canvas: makeCanvas(w, h, data), layerId: layer().id };
        S.sel = null;
        setTool('move');
        syncHist(); draw();
      }
      const HANDLES = [['nw', 0, 0], ['n', .5, 0], ['ne', 1, 0], ['e', 1, .5], ['se', 1, 1], ['s', .5, 1], ['sw', 0, 1], ['w', 0, .5]];
      const CURSOR = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' };
      function hitHandle(r, sx, sy) {
        if (!r) return null;
        for (const [id, hx, hy] of HANDLES) {
          const px = S.ox + (r.x + r.w * hx) * S.zoom, py = S.oy + (r.y + r.h * hy) * S.zoom;
          if (Math.abs(sx - px) <= 8 && Math.abs(sy - py) <= 8) return id;
        }
        return null;
      }
      function drawHandles(r) {
        g.setLineDash([]);
        for (const [, hx, hy] of HANDLES) {
          const px = Math.round(S.ox + (r.x + r.w * hx) * S.zoom), py = Math.round(S.oy + (r.y + r.h * hy) * S.zoom);
          g.fillStyle = '#fff'; g.strokeStyle = '#3056ff'; g.lineWidth = 1.5;
          g.beginPath(); g.roundRect(px - 5, py - 5, 10, 10, 3); g.fill(); g.stroke();
        }
      }
      // nouveau rectangle quand on tire une poignée (fx, fy = position du pointeur sur la grille)
      function resizeRect(r0, id, fx, fy, keep, snap) {
        let x0 = r0.x, y0 = r0.y, x1 = r0.x + r0.w, y1 = r0.y + r0.h;
        const q = (v) => (snap ? Math.round(v) : v);
        if (id.includes('w')) x0 = Math.min(q(fx), x1 - (snap ? 1 : 0.5));
        if (id.includes('e')) x1 = Math.max(q(fx), x0 + (snap ? 1 : 0.5));
        if (id.includes('n')) y0 = Math.min(q(fy), y1 - (snap ? 1 : 0.5));
        if (id.includes('s')) y1 = Math.max(q(fy), y0 + (snap ? 1 : 0.5));
        if (keep && id.length === 2) {
          const k = Math.max((x1 - x0) / r0.w, (y1 - y0) / r0.h);
          const w = Math.max(snap ? 1 : 0.5, q(r0.w * k)), h = Math.max(snap ? 1 : 0.5, q(r0.h * k));
          if (id.includes('w')) x0 = x1 - w; else x1 = x0 + w;
          if (id.includes('n')) y0 = y1 - h; else y1 = y0 + h;
        }
        return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      }
      // redimensionne la sélection flottante au plus proche voisin, toujours depuis l'original (pas de perte)
      function scaleFloating(r) {
        const f = S.floating; if (!f) return;
        if (!f.src) f.src = { w: f.w, h: f.h, data: f.data, mask: f.mask };
        const src = f.src, nw = Math.max(1, Math.min(MAXS, Math.round(r.w))), nh = Math.max(1, Math.min(MAXS, Math.round(r.h)));
        const nd = new Uint8ClampedArray(nw * nh * 4), nm = src.mask ? new Uint8Array(nw * nh) : null;
        for (let y = 0; y < nh; y++) {
          const sy = Math.min(src.h - 1, Math.floor(((y + 0.5) * src.h) / nh));
          for (let x = 0; x < nw; x++) {
            const sx = Math.min(src.w - 1, Math.floor(((x + 0.5) * src.w) / nw)), si = (sy * src.w + sx) * 4, di = (y * nw + x) * 4;
            nd[di] = src.data[si]; nd[di + 1] = src.data[si + 1]; nd[di + 2] = src.data[si + 2]; nd[di + 3] = src.data[si + 3];
            if (nm) nm[y * nw + x] = src.mask[sy * src.w + sx];
          }
        }
        Object.assign(f, { x: Math.round(r.x), y: Math.round(r.y), w: nw, h: nh, data: nd, mask: nm, edges: null, canvas: makeCanvas(nw, nh, nd) });
      }
      // Ctrl+T / bouton : passe la sélection (ou le contenu du calque) en mode transformation
      function startTransform() {
        if (!S.floating) lift(true);
        if (S.floating) setTool('move');
        draw();
      }

      /* ---------- images de référence : calques guides, non exportés ---------- */
      S.refs = []; S.refActive = null; S.refEdit = false;
      const refAct = () => S.refs.find((r) => r.id === S.refActive) || null;
      const refIn = el('input'); refIn.type = 'file'; refIn.accept = 'image/*'; refIn.multiple = true; refIn.hidden = true; ui.appendChild(refIn);
      refIn.onchange = async () => { const fs = [...(refIn.files || [])]; refIn.value = ''; for (const f of fs) await loadRef(f); };
      const fitRef = (r) => { const k = Math.min(S.w / r.img.naturalWidth, S.h / r.img.naturalHeight); r.w = r.img.naturalWidth * k; r.h = r.img.naturalHeight * k; r.x = (S.w - r.w) / 2; r.y = (S.h - r.h) / 2; };
      async function loadRef(f) {
        const im = await blobImg(f);
        if (!im) { toast(T('edBadFile'), 'err'); return; }
        const r = { id: uid(), name: (f.name || T('edRef')).replace(/\.[a-z0-9]+$/i, ''), img: im, opacity: 0.5, above: true, visible: true };
        fitRef(r);
        S.refs.push(r); S.refActive = r.id; S.refEdit = true;
        if (S.floating) commitFloating();
        setFold('refs', false);
        renderRefs(); draw();
      }
      function drawRefs(above) {
        for (const r of S.refs) {
          if (!r.visible || !!r.above !== above) continue;
          g.save(); g.globalAlpha = r.opacity; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
          g.drawImage(r.img, S.ox + r.x * S.zoom, S.oy + r.y * S.zoom, r.w * S.zoom, r.h * S.zoom);
          g.restore();
        }
      }
      const rlist = $('.bpe-rlist'), racts = $('.bpe-racts');
      const RA = [['add', I.plus, 'edRefAdd'], ['edit', I.scale, 'edRefMove'], ['fit', I.resize, 'edRefFit'], ['up', I.up, 'edUp'], ['down', I.down, 'edDown'], ['del', I.trash, 'edRefRemove']];
      for (const [k, ic2, tk] of RA) {
        const b = el('button', IB); b.dataset.r = k; b.innerHTML = ic2; b.title = T(tk);
        b.onclick = () => refAction(k);
        racts.appendChild(b);
      }
      function refAction(k) {
        if (k === 'add') { refIn.click(); return; }
        const r = refAct(); if (!r) return;
        const i = S.refs.indexOf(r);
        if (k === 'edit') { S.refEdit = !S.refEdit; if (S.refEdit && S.floating) commitFloating(); if (S.refEdit && !r.visible) r.visible = true; }
        if (k === 'fit') fitRef(r);
        if (k === 'up' && i < S.refs.length - 1) [S.refs[i], S.refs[i + 1]] = [S.refs[i + 1], S.refs[i]];
        if (k === 'down' && i > 0) [S.refs[i], S.refs[i - 1]] = [S.refs[i - 1], S.refs[i]];
        if (k === 'del') { S.refs.splice(i, 1); const n = S.refs[Math.min(i, S.refs.length - 1)]; S.refActive = n ? n.id : null; if (!n) S.refEdit = false; }
        renderRefs(); draw();
      }
      function renderRefs() {
        rlist.innerHTML = '';
        if (!S.refs.length) {
          const em = pbtn('white', T('edRefAdd'), I.image); em.classList.add('bpe-rempty');
          em.onclick = () => refIn.click();
          rlist.appendChild(em);
        }
        for (let i = S.refs.length - 1; i >= 0; i--) {
          const r = S.refs[i];
          const row = el('div', `bpe-lrow${r.id === S.refActive ? ' on' : ''}${r.visible ? '' : ' hid'}`);
          row.innerHTML = `<button class="bpe-eye">${r.visible ? I.eye : I.eyeOff}</button><span class="bpe-lth"></span><span class="bpe-lmid"><span class="bpe-lnm"></span><span class="bpe-lop"><input type="range" min="5" max="100"><b></b></span></span><button class="bpe-eye bpe-rab">${r.above ? I.up : I.down}</button>`;
          row.querySelector('.bpe-eye').title = T('edVis');
          const ab = row.querySelector('.bpe-rab'); ab.title = T(r.above ? 'edRefAbove' : 'edRefBelow'); ab.classList.toggle('on', r.above);
          if (!r.thumb) { const k = Math.min(1, 88 / Math.max(r.img.naturalWidth, r.img.naturalHeight)); r.thumb = document.createElement('canvas'); r.thumb.width = Math.max(1, Math.round(r.img.naturalWidth * k)); r.thumb.height = Math.max(1, Math.round(r.img.naturalHeight * k)); const tg2 = r.thumb.getContext('2d'); tg2.imageSmoothingQuality = 'high'; tg2.drawImage(r.img, 0, 0, r.thumb.width, r.thumb.height); }
          const th = document.createElement('canvas'); th.width = r.thumb.width; th.height = r.thumb.height; th.getContext('2d').drawImage(r.thumb, 0, 0); th.className = 'bpe-thi'; row.querySelector('.bpe-lth').appendChild(th);
          const nm = row.querySelector('.bpe-lnm'); nm.textContent = r.name;
          const op = row.querySelector('.bpe-lop input'), opv = row.querySelector('.bpe-lop b');
          op.value = Math.round(r.opacity * 100); opv.textContent = `${op.value}%`; op.title = T('edOpacity');
          op.style.setProperty('--p', `${(op.value - 5) / 0.95}%`);
          op.onpointerdown = (e) => e.stopPropagation();
          op.onkeydown = (e) => e.stopPropagation();
          op.oninput = () => { r.opacity = op.value / 100; opv.textContent = `${op.value}%`; op.style.setProperty('--p', `${(op.value - 5) / 0.95}%`); draw(); };
          row.onclick = () => { if (S.refActive !== r.id) { S.refActive = r.id; renderRefs(); draw(); } };
          row.querySelector('.bpe-eye').onclick = (e) => { e.stopPropagation(); r.visible = !r.visible; renderRefs(); draw(); };
          ab.onclick = (e) => { e.stopPropagation(); r.above = !r.above; renderRefs(); draw(); };
          nm.ondblclick = (e) => {
            e.stopPropagation();
            const inp = el('input', 'bpe-lin'); inp.value = r.name; nm.replaceWith(inp); inp.focus(); inp.select();
            const done = () => { const v = inp.value.trim(); if (v) r.name = v; renderRefs(); };
            inp.onblur = done; inp.onkeydown = (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') inp.blur(); if (ev.key === 'Escape') { inp.value = r.name; inp.blur(); } };
          };
          rlist.appendChild(row);
        }
        const r = refAct(), i = r ? S.refs.indexOf(r) : -1;
        racts.querySelector('[data-r="edit"]').classList.toggle('on', !!(r && S.refEdit));
        for (const k of ['edit', 'fit', 'del']) racts.querySelector(`[data-r="${k}"]`).disabled = !r;
        racts.querySelector('[data-r="up"]').disabled = !r || i >= S.refs.length - 1;
        racts.querySelector('[data-r="down"]').disabled = !r || i <= 0;
        racts.hidden = !S.refs.length;
      }

      /* ---------- panneau des pinceaux ---------- */
      const bgrid = $('.bpe-bgrid'), bacts = $('.bpe-bacts'), bset = $('.bpe-bset');
      const IMPORT_IC = I.dl, EXPORT_IC = I.send;
      const brIn = el('input'); brIn.type = 'file'; brIn.multiple = true; brIn.hidden = true;
      brIn.accept = '.bplusbrush,.kpp,.gbr,image/png,image/gif,image/webp'; ui.appendChild(brIn);
      brIn.onchange = async () => { const fs = [...(brIn.files || [])]; brIn.value = ''; await importBrushes(fs); };
      for (const [k, ic2, tk] of [['new', I.plus, 'edBrNew'], ['import', IMPORT_IC, 'edBrImport'], ['export', EXPORT_IC, 'edBrExport'], ['dup', I.copy, 'edBrDup'], ['del', I.trash, 'edBrDel']]) {
        const b = el('button', IB); b.dataset.b = k; b.innerHTML = ic2; b.title = T(tk);
        b.onclick = () => brushAction(k);
        bacts.appendChild(b);
      }
      // aperçu : un trait en vague dessiné avec le pinceau
      function seeded(n) { let x = n || 1; return () => { x = (x * 16807) % 2147483647; return x / 2147483647; }; }
      function brushPreview(br, w = 72, h = 28, size) {
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const cg2 = c.getContext('2d'), img = cg2.createImageData(w, h), d = img.data;
        const sz = size || br.size || (br.tip === 'custom' ? 1 : 3), t = brushTip(br, sz), rnd = seeded(7);
        const pts = [];
        const m = Math.max(-t.x0, t.x1, -t.y0, t.y1, 1) + (br.jitter || 0) + 1;
        for (let x = m; x < w - m; x++) pts.push(x, Math.round(h / 2 + Math.sin(((x - m) / Math.max(1, w - 2 * m)) * Math.PI * 2) * Math.max(0, h / 2 - m - 1)));
        let n = 0;
        const dab = (cx, cy) => {
          if (br.jitter) { cx += Math.round((rnd() * 2 - 1) * br.jitter); cy += Math.round((rnd() * 2 - 1) * br.jitter); }
          const px = (xx, yy, v, a2) => {
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) return;
            if (br.pattern !== 'none' && !patOk(br.pattern, xx, yy)) return;
            if (br.density < 1 && rnd() > br.density) return;
            const i = (yy * w + xx) * 4; d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = Math.max(d[i + 3], a2);
          };
          const ed = br.edge && br.edge !== 'none', op2 = br.opacity == null ? 1 : br.opacity;
          for (let o = 0; o < t.offs.length; o += 2) px(cx + t.offs[o], cy + t.offs[o + 1], ed && t.edge[o >> 1] ? 150 : 38, 255 * op2);
          for (let o = 0; o < t.ring.length; o += 2) px(cx + t.ring[o], cy + t.ring[o + 1], ed ? 150 : 38, 255 * op2 * t.cov[o >> 1]);
        };
        let prev = null;
        for (let i = 0; i < pts.length; i += 2) {
          const seg = prev ? linePts(prev[0], prev[1], pts[i], pts[i + 1]) : [pts[i], pts[i + 1]];
          for (let j = prev ? 2 : 0; j < seg.length; j += 2) { if (br.spacing > 1 && (n++ % br.spacing) !== 0) continue; dab(seg[j], seg[j + 1]); }
          prev = [pts[i], pts[i + 1]];
        }
        cg2.putImageData(img, 0, 0);
        return c;
      }
      function paintChip() {
        const br = curBrush(), cv2 = bchip.querySelector('canvas');
        const pc = brushPreview(br, 40, 16, br.tip === 'custom' ? 1 : Math.min(S.size, 3));
        const g2 = cv2.getContext('2d'); g2.clearRect(0, 0, 40, 16); g2.drawImage(pc, 0, 0);
        bchip.querySelector('span').textContent = br.name;
        bchip.title = `${T('edBrushes')} : ${br.name}`;
      }
      function selectBrush(id) {
        brushSel = id;
        try { localStorage.setItem('bplus.brushSel', id); } catch (e) {}
        const br = curBrush();
        // une forme dessinée se pose à sa taille réelle : la taille devient un multiplicateur
        if (br.size) S.size = br.size; else if (br.tip === 'custom') S.size = 1;
        if (S.tool !== 'pencil' && S.tool !== 'eraser' && S.tool !== 'line') setTool('pencil');
        renderBrushes(); paintTools(); draw();
      }
      function renderBrushes() {
        bgrid.innerHTML = '';
        for (const br of allBrushes()) {
          const b = el('button', `bpe-btile${br.id === brushSel ? ' on' : ''}`);
          b.appendChild(brushPreview(br));
          const nm = el('span'); nm.textContent = br.name; b.appendChild(nm);
          b.title = br.name;
          b.onclick = () => { if (brushSel !== br.id) { selectBrush(br.id); A.playSound('click'); } };
          bgrid.appendChild(b);
        }
        const cur = curBrush();
        bacts.querySelector('[data-b="del"]').disabled = !!cur.builtin;
        renderBrushSettings();
        paintChip();
      }
      // modifier un pinceau de base crée une copie modifiable
      function editable() {
        let br = curBrush();
        if (br.builtin) {
          const { builtin, ...rest } = br;
          br = { ...normBrush({ ...rest, id: brId(), name: `${br.name} 2` }) };
          userBrushes.push(br); brushSel = br.id;
          try { localStorage.setItem('bplus.brushSel', br.id); } catch (e) {}
          toast(T('edBrCopied'), 'ok');
          setTimeout(() => renderBrushes(), 0);
        }
        return br;
      }
      function changed(br) {
        br.rev = (br.rev || 0) + 1; saveBrushes();
        const tile = bgrid.querySelector('.bpe-btile.on');
        if (tile) { tile.querySelector('canvas').replaceWith(brushPreview(br)); tile.querySelector('span').textContent = br.name; tile.title = br.name; }
        bacts.querySelector('[data-b="del"]').disabled = false;
        paintChip(); draw();
      }
      function renderBrushSettings() {
        const br = curBrush();
        bset.innerHTML = '';
        // réglages rangés en groupes repliables, pour garder la liste courte
        let tgt = bset;
        const row = (label) => { const r = el('div', 'bpe-brow'); const l = el('span', 'bpe-blab'); l.textContent = label; r.appendChild(l); tgt.appendChild(r); return r; };
        let gst = {}; try { gst = JSON.parse(localStorage.getItem('bplus.brushGroups')) || {}; } catch (e) { gst = {}; }
        const group = (key, title) => {
          const box = el('div', `bpe-bgrp${gst[key] ? ' shut' : ''}`);
          const hd = el('button', 'bpe-bgh'); hd.innerHTML = `<span></span>${I.down}`; hd.querySelector('span').textContent = title;
          hd.onclick = () => { gst[key] = !gst[key]; box.classList.toggle('shut', !!gst[key]); try { localStorage.setItem('bplus.brushGroups', JSON.stringify(gst)); } catch (e) {} };
          const inner = el('div', 'bpe-bgi');
          box.append(hd, inner); bset.appendChild(box); tgt = inner;
        };
        // nom
        const name = el('input', 'bpe-bname'); name.value = br.name; name.maxLength = 40; name.spellcheck = false;
        name.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') name.blur(); };
        name.onchange = () => { const v = name.value.trim(); if (!v) { name.value = curBrush().name; return; } const b2 = editable(); b2.name = v; changed(b2); };
        bset.appendChild(name);
        group('shape', T('edBrGrpShape'));
        // forme
        const shp = el('div', 'bpe-seg');
        for (const [k, ic2, tk] of [['square', BR.square, 'edBrSquare'], ['round', BR.round, 'edBrRound'], ['custom', I.pencil, 'edBrCustom']]) {
          const b = el('button', br.tip === k ? 'on' : ''); b.innerHTML = '<span></span>'; b.querySelector('span').textContent = T(tk);
          b.onclick = () => {
            const b2 = editable(); if (b2.tip === k) return;
            if (k === 'custom' && !b2.mask) b2.mask = trimMask(['.#.', '###', '.#.']);
            b2.tip = k; if (k === 'custom') S.size = 1; changed(b2); renderBrushSettings(); paintTools();
          };
          shp.appendChild(b);
        }
        row(T('edBrShape')).appendChild(shp);
        // forme dessinée : grille de pixels
        if (br.tip === 'custom') {
          const m = br.mask, N = Math.max(m.w, m.h) > 16 ? 32 : 16;
          const grid = el('div', 'bpe-bmask'); grid.style.setProperty('--n', N);
          const cells = [];
          const ox = Math.floor((N - m.w) / 2), oy = Math.floor((N - m.h) / 2);
          let painting = null;
          const commit = () => {
            const rows = [];
            for (let y = 0; y < N; y++) { let r = ''; for (let x = 0; x < N; x++) r += cells[y * N + x].classList.contains('on') ? '#' : '.'; rows.push(r); }
            const mk = trimMask(rows); if (!mk) return;
            const b2 = editable(); b2.mask = mk; b2.tip = 'custom'; changed(b2);
          };
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
            const c = el('span'); const mx = x - ox, my = y - oy;
            if (mx >= 0 && my >= 0 && mx < m.w && my < m.h && m.rows[my][mx] === '#') c.classList.add('on');
            if (x === N >> 1 && y === N >> 1) c.classList.add('mid');
            c.onpointerdown = (e) => { e.preventDefault(); painting = !c.classList.contains('on'); c.classList.toggle('on', painting); };
            c.onpointerenter = (e) => { if (painting !== null && e.buttons) c.classList.toggle('on', painting); };
            cells.push(c); grid.appendChild(c);
          }
          const stop = () => { if (painting === null) return; painting = null; commit(); };
          grid.addEventListener('pointerup', stop); grid.addEventListener('pointerleave', (e) => { if (!e.buttons) stop(); else { document.addEventListener('pointerup', stop, { once: true }); } });
          grid.addEventListener('lostpointercapture', () => {});
          grid.addEventListener('pointerdown', (e) => { try { grid.releasePointerCapture(e.pointerId); } catch (e2) {} }, true);
          tgt.appendChild(grid);
        }
        // motif
        const pats = el('div', 'bpe-bpats');
        for (const k of BR_PATTERNS) {
          const b = el('button', br.pattern === k ? 'on' : ''); b.title = T(`edBrPat_${k}`);
          const c = document.createElement('canvas'); c.width = 8; c.height = 8; const g2 = c.getContext('2d');
          g2.fillStyle = '#262626'; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (patOk(k, x, y)) g2.fillRect(x, y, 1, 1);
          b.appendChild(c);
          b.onclick = () => { const b2 = editable(); b2.pattern = k; changed(b2); pats.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); };
          pats.appendChild(b);
        }
        row(T('edBrPattern')).appendChild(pats);
        group('stroke', T('edBrGrpStroke'));
        // réglages à curseur
        const slider = (label, min, max, val, fmt, set) => {
          const r = row(label), w = el('span', 'bpe-lop');
          w.innerHTML = '<input type="range"><b></b>';
          const inp = w.querySelector('input'), out = w.querySelector('b');
          inp.min = min; inp.max = max; inp.value = val;
          const paint = () => { out.textContent = fmt(+inp.value); inp.style.setProperty('--p', `${((inp.value - min) / (max - min)) * 100}%`); };
          paint();
          inp.onkeydown = (e) => e.stopPropagation();
          inp.oninput = () => { paint(); const b2 = editable(); set(b2, +inp.value); changed(b2); };
          r.appendChild(w);
        };
        slider(T('edBrDensity'), 5, 100, Math.round(br.density * 100), (v) => `${v}%`, (b2, v) => { b2.density = v / 100; });
        slider(T('edBrSpacing'), 1, 16, br.spacing, (v) => `${v}`, (b2, v) => { b2.spacing = v; });
        slider(T('edBrJitter'), 0, 8, br.jitter, (v) => `${v}`, (b2, v) => { b2.jitter = v; });
        // couleurs : bordure du pinceau, mode de fusion, opacité
        const segRow = (label, key, items, cls = 'bpe-seg') => {
          const w = el('div', cls);
          for (const [k, tk] of items) {
            const b = el('button', (br[key] || items[0][0]) === k ? 'on' : ''); b.innerHTML = '<span></span>'; b.querySelector('span').textContent = T(tk);
            b.onclick = () => { const b2 = editable(); b2[key] = k; changed(b2); w.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); };
            w.appendChild(b);
          }
          row(label).appendChild(w);
        };
        group('color', T('edBrGrpColor'));
        segRow(T('edBrEdge'), 'edge', [['none', 'edBrEdgeNone'], ['second', 'edBrEdge2'], ['dark', 'edBrEdgeDark'], ['light', 'edBrEdgeLight']], 'bpe-seg wrap');
        {
          const r = row(T('edBrBlend')), b = el('button', 'bpe-ddbtn'); b.innerHTML = `<span></span>${I.down}`;
          const paintB = () => { b.querySelector('span').textContent = T(`edBl_${curBrush().blend || 'normal'}`); };
          paintB();
          b.onclick = () => ddMenu(b, BR_BLENDS.map((k) => [k, T(`edBl_${k}`)]), curBrush().blend || 'normal', (k) => { const b2 = editable(); b2.blend = k; changed(b2); paintB(); });
          r.appendChild(b);
        }
        slider(T('edOpacity'), 5, 100, Math.round((br.opacity == null ? 1 : br.opacity) * 100), (v) => `${v}%`, (b2, v) => { b2.opacity = v / 100; });
        {
          const lab = el('label', 'bpe-chk bpe-bpp'); lab.innerHTML = '<input type="checkbox"><span></span>';
          const inp = lab.querySelector('input'); inp.checked = !!br.aa; lab.querySelector('span').textContent = T('edBrAA');
          inp.onchange = () => { const b2 = editable(); b2.aa = inp.checked; changed(b2); renderBrushSettings(); };
          tgt.appendChild(lab);
          if (br.aa) slider(T('edBrSoft'), 1, 4, br.aaw || 1, (v) => `${v}`, (b2, v) => { b2.aaw = v; });
        }
        // pixel parfait
        if (br.tip !== 'custom') {
          const lab = el('label', 'bpe-chk bpe-bpp'); lab.innerHTML = '<input type="checkbox"><span></span>';
          const inp = lab.querySelector('input'); inp.checked = !!br.pp; lab.querySelector('span').textContent = T('edBrPP');
          inp.onchange = () => { const b2 = editable(); b2.pp = inp.checked; changed(b2); };
          tgt.appendChild(lab);
        }
      }
      async function importBrushes(files) {
        let n = 0, last = null, partial = false;
        for (const f of files) {
          const b = await readBrushFile(f);
          if (!b) { toast(`${T('edBadFile')} : ${f.name}`, 'err'); continue; }
          if (b.partial) partial = true;
          delete b.partial;
          userBrushes.push(b); last = b; n++;
        }
        if (!last) return;
        saveBrushes(); setFold('brushes', false); selectBrush(last.id);
        toast(partial ? T('edBrKritaPartial') : T('edBrImported').replace('{n}', n), partial ? '' : 'ok');
        A.playSound('drop');
      }
      function brushAction(k) {
        const br = curBrush();
        if (k === 'new') {
          const b = normBrush({ name: `${T('edBrUnnamed')} ${userBrushes.length + 1}`, tip: 'custom', mask: { rows: ['.#.', '###', '.#.'] } });
          userBrushes.push(b); saveBrushes(); setFold('brushes', false); selectBrush(b.id);
        } else if (k === 'import') brIn.click();
        else if (k === 'export') A.downloadBlob(encodeBrush(br), `${(br.name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'pinceau').slice(0, 60)}.bplusbrush`);
        else if (k === 'dup') {
          const { builtin, rev, ...rest } = br;
          const b = normBrush({ ...rest, id: brId(), name: `${br.name} 2` });
          userBrushes.push(b); saveBrushes(); selectBrush(b.id);
        } else if (k === 'del' && !br.builtin) {
          const i = userBrushes.indexOf(br); userBrushes.splice(i, 1); saveBrushes();
          const nx = userBrushes[Math.min(i, userBrushes.length - 1)];
          selectBrush(nx ? nx.id : 'square');
        }
      }

      /* ---------- panneau des dégradés ---------- */
      const glist = $('.bpe-glist'), gacts = $('.bpe-gacts'), gset = $('.bpe-gset');
      for (const [k, ic2, tk] of [['new', I.plus, 'edGrNew'], ['dup', I.copy, 'edBrDup'], ['del', I.trash, 'edBrDel']]) {
        const b = el('button', IB); b.dataset.g = k; b.innerHTML = ic2; b.title = T(tk);
        b.onclick = () => gradAction(k);
        gacts.appendChild(b);
      }
      function openGradPanel() {
        setFold('grads', false);
        const pg = PANES.grads; pg.scrollIntoView({ block: 'nearest' });
        pg.classList.remove('flash'); void pg.offsetWidth; pg.classList.add('flash');
      }
      function selectGrad(id) { gradStore.sel = id; saveGrads(); if (S.tool !== 'gradient') setTool('gradient'); renderGradOpts(); renderGrads(); }
      function renderGrads() {
        glist.innerHTML = '';
        for (const gr of allGrads()) {
          const b = el('button', `bpe-gtile${gr.id === gradStore.sel ? ' on' : ''}`);
          const cvs = document.createElement('canvas'); cvs.width = 96; cvs.height = 10;
          paintRamp(cvs, rampOf(gr), gr.style);
          const nm = el('span'); nm.textContent = gr.name;
          b.append(cvs, nm); b.title = gr.name;
          b.onclick = () => { if (gradStore.sel !== gr.id) { selectGrad(gr.id); A.playSound('click'); } };
          glist.appendChild(b);
        }
        gacts.querySelector('[data-g="del"]').disabled = !!curGrad().builtin;
        renderGradSettings();
      }
      function gradAction(k) {
        const gr = curGrad();
        if (k === 'new') {
          const stops = S.color ? (S.color.transparent ? [] : [S.color.hex]) : [];
          stops.push('transparent');
          const g2 = normGrad({ name: `${T('edGradient')} ${gradStore.user.length + 1}`, kind: 'custom', stops, type: gr.type, style: gr.style });
          gradStore.user.push(g2); selectGrad(g2.id);
        } else if (k === 'dup') {
          const g2 = normGrad({ ...gr, id: brId(), name: `${gr.name} 2`, kind: 'custom', stops: gr.kind === 'custom' ? gr.stops.slice() : rampOf(gr).map((c) => c.hex) });
          gradStore.user.push(g2); selectGrad(g2.id);
        } else if (k === 'del' && !gr.builtin) {
          const i = gradStore.user.indexOf(gr); gradStore.user.splice(i, 1);
          const nx = gradStore.user[Math.min(i, gradStore.user.length - 1)];
          selectGrad(nx ? nx.id : 'g_fade');
        }
      }
      function swatch(c, cls = '') {
        const b = el('button', `bpe-gsw ${cls}${c && c.transparent ? ' transp' : ''}`);
        if (c && !c.transparent) b.style.background = c.hex;
        if (c) b.title = c.name;
        return b;
      }
      function renderGradSettings() {
        const gr = curGrad(), ramp = rampOf(gr);
        gset.innerHTML = '';
        const changed2 = () => { saveGrads(); renderGradOpts(); };
        const row = (label) => { const r = el('div', 'bpe-brow'); const l = el('span', 'bpe-blab'); l.textContent = label; r.appendChild(l); gset.appendChild(r); return r; };
        if (!gr.builtin) {
          const name = el('input', 'bpe-bname'); name.value = gr.name; name.maxLength = 40; name.spellcheck = false;
          name.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') name.blur(); };
          name.onchange = () => { const v = name.value.trim(); if (v) { gr.name = v; changed2(); } else name.value = gr.name; };
          gset.appendChild(name);
        }
        // aperçu en grand, avec la trame
        const big = document.createElement('canvas'); big.className = 'bpe-gbig'; big.width = 96; big.height = 12;
        paintRamp(big, ramp, gr.style);
        gset.appendChild(big);
        if (gr.kind !== 'custom') {
          // couleurs de départ : une case par couleur, clic sur la case puis sur une couleur de la palette
          const src = row(T('edGrFrom'));
          const line = el('div', 'bpe-gsrc');
          const slot = (c, kind, label, clearable) => {
            const w = el('div', 'bpe-gslot');
            const b = swatch(c, `lg${c ? '' : ' empty'}`);
            if (!c) b.innerHTML = I.plus;
            b.classList.toggle('asking', !!askTarget && askTarget.kind === kind);
            b.title = T('edGrPickSlot');
            b.onclick = () => askColor(askTarget && askTarget.kind === kind ? null : { kind }, b);
            const l = el('span'); l.textContent = label;
            w.append(b, l);
            if (clearable && c) { const x = el('button', 'bpe-gx show'); x.innerHTML = I.x; x.title = T('edGrDel'); x.onclick = (e) => { e.stopPropagation(); setColor2(null); }; w.appendChild(x); }
            return w;
          };
          const arrow = () => { const ar = el('span', 'bpe-garr'); ar.textContent = '→'; return ar; };
          line.appendChild(slot(S.color, 'c1', T('edGrSlot1')));
          line.appendChild(arrow());
          line.appendChild(slot(S.color2 && !S.color2.transparent ? S.color2 : null, 'c2', T(gr.kind === 'fade' ? 'edGrSlot2opt' : 'edGrSlot2'), gr.kind === 'fade'));
          if (gr.kind === 'fade') { line.appendChild(arrow()); const w = el('div', 'bpe-gslot'); w.append(swatch(TRANSP, 'lg fixed'), Object.assign(el('span'), { textContent: T('edTransparent') })); line.appendChild(w); }
          src.appendChild(line);
          const hint = el('span', 'bpe-ghint'); hint.textContent = T('edGrHintSlots'); src.appendChild(hint);
          // nombre de couleurs
          const cnt = row(T('edGrColors'));
          const st = el('div', 'bpe-size');
          st.innerHTML = '<button data-g="-1">−</button><b></b><button data-g="1">+</button>';
          st.querySelector('b').textContent = gr.n;
          st.querySelectorAll('[data-g]').forEach((b) => { b.onclick = () => { gr.n = clamp(gr.n + +b.dataset.g, 2, 16); changed2(); }; });
          cnt.appendChild(st);
          const got = ramp.filter((c) => !c.transparent).length;
          if (S.color && got < gr.n && gr.kind !== 'auto') {
            const note = el('span', 'bpe-ghint warn'); note.textContent = T('edGrFewColors'); cnt.appendChild(note);
          }
          const tog = el('label', 'bpe-chk bpe-bpp'); tog.innerHTML = '<input type="checkbox"><span></span>';
          const ti = tog.querySelector('input'); ti.checked = !!gr.all; tog.querySelector('span').textContent = T('edGrAllColors');
          ti.onchange = () => { gr.all = ti.checked; changed2(); };
          gset.appendChild(tog);
        }
        // couleurs utilisées : en perso, chaque case se remplace par ta couleur principale, × pour la retirer
        const used = row(T('edGrUsed'));
        const strip = el('div', 'bpe-gstops');
        ramp.forEach((c, idx) => {
          const cell = el('span', 'bpe-gstop');
          const b = swatch(c);
          if (gr.kind === 'custom') {
            b.title = `${c.name} · ${T('edGrPickSlot')}`;
            b.classList.toggle('asking', !!askTarget && askTarget.kind === 'stop' && askTarget.gr === gr && askTarget.idx === idx);
            b.onclick = () => askColor(askTarget && askTarget.kind === 'stop' && askTarget.idx === idx ? null : { kind: 'stop', gr, idx }, b);
            const x = el('button', 'bpe-gx'); x.innerHTML = I.x; x.title = T('edGrDel');
            x.onclick = () => { gr.stops.splice(idx, 1); changed2(); };
            cell.append(b, x);
          } else cell.appendChild(b);
          strip.appendChild(cell);
        });
        if (gr.kind === 'custom') {
          const add = el('button', 'bpe-gsw add'); add.innerHTML = I.plus; add.title = T('edGrAdd');
          add.title = T('edGrPickSlot');
          add.classList.toggle('asking', !!askTarget && askTarget.kind === 'stopAdd');
          add.onclick = () => askColor(askTarget && askTarget.kind === 'stopAdd' ? null : { kind: 'stopAdd', gr }, add);
          strip.appendChild(add);
        }
        used.appendChild(strip);
        if (gr.kind === 'custom') {
          const acts = el('div', 'bpe-gacts2');
          const rev = pbtn('white', T('edGrReverse')); rev.onclick = () => { gr.stops.reverse(); changed2(); };
          const addT = pbtn('white', T('edGrAddTransp')); addT.onclick = () => { gr.stops.push('transparent'); changed2(); };
          acts.append(rev, addT);
          gset.appendChild(acts);
        } else {
          const cust = pbtn('white', T('edGrCustomize')); cust.classList.add('bpe-gcust');
          cust.onclick = () => gradAction('dup');
          gset.appendChild(cust);
        }
        // forme et trame
        const shp = row(T('edBrShape')), sw2s = el('div', 'bpe-seg');
        for (const [k, tk] of [['linear', 'edGrLinear'], ['radial', 'edGrRadial']]) {
          const b = el('button', gr.type === k ? 'on' : ''); b.innerHTML = '<span></span>'; b.querySelector('span').textContent = T(tk);
          b.onclick = () => { gr.type = k; changed2(); }; sw2s.appendChild(b);
        }
        shp.appendChild(sw2s);
        const sty = row(T('edGrStyle')), sw3 = el('div', 'bpe-seg');
        for (const [k, tk] of [['bands', 'edGrBands'], ['dither', 'edGrDither'], ['fine', 'edGrFine']]) {
          const b = el('button', gr.style === k ? 'on' : ''); b.innerHTML = '<span></span>'; b.querySelector('span').textContent = T(tk);
          b.onclick = () => { gr.style = k; changed2(); }; sw3.appendChild(b);
        }
        sty.appendChild(sw3);
      }
      function openPanelColors() { setFold('panel', false); const pc = PANES.panel; pc.scrollIntoView({ block: 'nearest' }); pc.classList.remove('flash'); void pc.offsetWidth; pc.classList.add('flash'); }
      bpeGradReady = true;

      /* ---------- outil texte : clic sur le dessin, on écrit, le texte se pose en pixels ---------- */
      function textOpts() { const t = S.text; return { font: t.font, size: isSysFont() ? t.sizeS : t.sizeB, spacing: t.spacing, bold: t.bold, italic: t.italic, outline: t.outline }; }
      function textChanged() { if (textEd) updateTextFloat(); }
      function updateTextFloat() {
        if (!textEd) return;
        const r = textEd.ta.value ? textMask(textEd.ta.value, textOpts()) : null;
        if (!r || !S.color || S.color.transparent) { S.floating = null; draw(); return; }
        const oc = S.color2 && !S.color2.transparent && S.color2.hex !== S.color.hex ? S.color2 : shade(S.color, S.color.rgb[0] + S.color.rgb[1] + S.color.rgb[2] > 380 ? -0.6 : 0.6);
        const data = new Uint8ClampedArray(r.w * r.h * 4);
        for (let i = 0; i < r.m.length; i++) {
          const v = r.m[i]; if (!v) continue;
          const c = v === 1 ? S.color : oc; if (!c || !c.rgb) continue;
          data[i * 4] = c.rgb[0]; data[i * 4 + 1] = c.rgb[1]; data[i * 4 + 2] = c.rgb[2]; data[i * 4 + 3] = 255;
        }
        S.floating = { x: textEd.x, y: textEd.y, w: r.w, h: r.h, data, mask: null, canvas: makeCanvas(r.w, r.h, data), layerId: layer().id };
        placeTextCard(); draw();
      }
      function placeTextCard() {
        if (!textEd) return;
        const c = textEd.card, z = S.zoom, f = S.floating;
        const bx = S.ox + textEd.x * z, by = S.oy + (textEd.y + (f ? f.h : 0)) * z + 10;
        const w = c.offsetWidth, h = c.offsetHeight;
        Object.assign(c.style, { left: `${clamp(bx, 8, innerWidth - w - 8)}px`, top: `${clamp(by + h > innerHeight - 8 ? S.oy + textEd.y * z - h - 10 : by, 8, innerHeight - h - 8)}px` });
      }
      function startText(p) {
        if (S.floating) commitFloating();
        if (!S.color || S.color.transparent) { toast(T('edTextColor'), 'err'); return; }
        if (!histGroup) beginGroup();
        pushDoc();
        const g0 = histGroup;
        const card = el('div', 'bpe-card bpe-textcard');
        card.innerHTML = '<textarea rows="2" spellcheck="false"></textarea><div class="bpe-tacts"></div>';
        const ta = card.querySelector('textarea'); ta.placeholder = T('edTextPh');
        const ok = pbtn('blue', T('edValidate')), no = pbtn('white', T('edCancel'));
        card.querySelector('.bpe-tacts').append(no, ok);
        ui.appendChild(card);
        textEd = { x: p.x, y: p.y, card, ta, g: g0 };
        ta.oninput = () => updateTextFloat();
        ta.onkeydown = (e) => {
          e.stopPropagation();
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); finishText(true); }
          else if (e.key === 'Escape') { e.preventDefault(); finishText(false); }
        };
        ok.onclick = () => finishText(true); no.onclick = () => finishText(false);
        placeTextCard();
        setTimeout(() => ta.focus(), 0);
      }
      function finishText(commit) {
        if (!textEd) return;
        const t = textEd; textEd = null; t.card.remove();
        if (commit && S.floating) { const pg = histGroup; histGroup = t.g; try { commitFloating(); } finally { histGroup = pg; } refreshThumbs(); A.playSound('edPaint'); }
        else if (S.floating) cancelFloating();
        else { S.hist.pop(); syncHist(); draw(); }
      }

      /* ---------- panneau Texte : polices en aperçu, taille, espacement, style, contour ---------- */
      const tlist = $('.bpe-tlist'), tset = $('.bpe-tset');
      function openTextPanel() {
        setFold('texts', false);
        const pt = PANES.texts; pt.scrollIntoView({ block: 'nearest' });
        pt.classList.remove('flash'); void pt.offsetWidth; pt.classList.add('flash');
      }
      function renderTextPanel() {
        tlist.innerHTML = '';
        for (const [k, name, kind] of TEXT_FONTS) {
          const b = el('button', `bpe-ttile${S.text.font === k ? ' on' : ''}`);
          b.appendChild(fontPreview(k));
          const nm = el('span'); nm.textContent = name; b.appendChild(nm);
          b.title = kind === 'sys' ? `${name} · ${T('edFontSys')}` : name;
          b.onclick = () => { S.text.font = k; saveText(); renderTextOpts(); textChanged(); if (S.tool !== 'text') setTool('text'); A.playSound('click'); };
          tlist.appendChild(b);
        }
        tset.innerHTML = '';
        const row = (label) => { const r = el('div', 'bpe-brow'); const l = el('span', 'bpe-blab'); l.textContent = label; r.appendChild(l); tset.appendChild(r); return r; };
        const hint = el('div', 'bpe-thint'); hint.textContent = T('edTextHint'); tset.appendChild(hint);
        const step = (label, get, set, min, max) => {
          const r = row(label), w = el('div', 'bpe-size'); w.innerHTML = '<button data-v="-1">−</button><b></b><button data-v="1">+</button>';
          w.querySelector('b').textContent = get();
          w.querySelectorAll('[data-v]').forEach((b) => { b.onclick = () => { set(clamp(get() + +b.dataset.v, min, max)); saveText(); renderTextOpts(); textChanged(); }; });
          r.appendChild(w);
        };
        if (isSysFont()) step(T('edSize'), () => S.text.sizeS, (v) => { S.text.sizeS = v; }, 6, 64);
        else step(T('edSize'), () => S.text.sizeB, (v) => { S.text.sizeB = v; }, 1, 8);
        step(T('edSpacing'), () => S.text.spacing, (v) => { S.text.spacing = v; }, -1, 6);
        const st = row(T('edTextStyle')), seg = el('div', 'bpe-seg');
        for (const [k, label] of [['bold', T('edBold')], ['italic', T('edItalic')]]) {
          const b = el('button', S.text[k] ? 'on' : ''); b.innerHTML = '<span></span>'; b.querySelector('span').textContent = label;
          if (k === 'bold') b.style.fontWeight = '800'; else b.style.fontStyle = 'italic';
          b.onclick = () => { S.text[k] = !S.text[k]; saveText(); renderTextOpts(); textChanged(); };
          seg.appendChild(b);
        }
        st.appendChild(seg);
        // contour : interrupteur + sa couleur (clic sur la case pour la choisir)
        const oc = row(T('edOutline'));
        const line = el('div', 'bpe-gsrc');
        const lab = el('label', 'bpe-chk'); lab.innerHTML = '<input type="checkbox">';
        const inp = lab.querySelector('input'); inp.checked = !!S.text.outline;
        inp.onchange = () => { S.text.outline = inp.checked; saveText(); renderTextOpts(); textChanged(); };
        line.appendChild(lab);
        const c2 = S.color2 && !S.color2.transparent ? S.color2 : null;
        const sw3 = swatch(c2, `lg${c2 ? '' : ' empty'}`); if (!c2) sw3.innerHTML = I.plus;
        sw3.title = T('edGrPickSlot');
        sw3.classList.toggle('asking', !!askTarget && askTarget.kind === 'c2');
        sw3.onclick = () => askColor(askTarget && askTarget.kind === 'c2' ? null : { kind: 'c2' }, sw3);
        line.appendChild(sw3);
        const lab2 = el('span', 'bpe-ghint'); lab2.textContent = T('edColor2Short'); line.appendChild(lab2);
        oc.appendChild(line);
      }
      textPanelReady = true;

      // miroir / rotation : sur la sélection flottante, la sélection ou le calque entier
      function transform(kind) {
        if (!S.floating) lift(true);
        const f = S.floating; if (!f) return;
        const { w, h, data, mask } = f;
        let nw = w, nh = h;
        if (kind === 'rotate') { nw = h; nh = w; }
        const nd = new Uint8ClampedArray(nw * nh * 4), nm = mask ? new Uint8Array(nw * nh) : null;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          let tx2 = x, ty = y;
          if (kind === 'flipH') tx2 = w - 1 - x;
          else if (kind === 'flipV') ty = h - 1 - y;
          else { tx2 = h - 1 - y; ty = x; }
          const si = (y * w + x) * 4, di = (ty * nw + tx2) * 4;
          nd[di] = data[si]; nd[di + 1] = data[si + 1]; nd[di + 2] = data[si + 2]; nd[di + 3] = data[si + 3];
          if (nm) nm[ty * nw + tx2] = mask[y * w + x];
        }
        const cx = f.x + w / 2, cy = f.y + h / 2;
        Object.assign(f, { w: nw, h: nh, data: nd, mask: nm, edges: null, src: null, canvas: makeCanvas(nw, nh, nd), x: Math.round(cx - nw / 2), y: Math.round(cy - nh / 2) });
        setTool('move');
        draw();
      }

      /* ---------- palette ---------- */
      const palEl = $('.bpe-pal'), curEl = $('.bpe-cur');
      // « transparent » compte comme une couleur : il efface, et sert de bout de dégradé
      const TRANSP = { hex: 'transparent', name: T('edTransparent'), rgb: null, transparent: true };
      function setColor(p, keepTool) {
        S.color = p;
        const sw = curEl.querySelector('.sw'); sw.style.background = p.transparent ? '' : p.hex; sw.textContent = ''; sw.className = `sw${p.transparent ? ' transp' : ''}${p.fx && !FX_DRAWN.has(p.fx) ? ` bpe-shim bpe-sh-${p.fx}` : ''}`;
        if (p.fx && FX_DRAWN.has(p.fx)) sw.appendChild(fxSwatch(p.fx));
        curEl.querySelector('.nm').textContent = p.name;
        if (textEd) updateTextFloat();
        if (typeof renderGradOpts === 'function' && S.grad) renderGradOpts();
        palEl.querySelectorAll('.bpe-sw').forEach((b) => b.classList.toggle('on', b.dataset.hex === p.hex));
        if (!keepTool && ['eraser', 'picker', 'select', 'lasso', 'wand', 'colorsel', 'move', 'pan'].includes(S.tool)) setTool('pencil');
      }
      // couleur secondaire : bordure des pinceaux, fin des dégradés (clic droit sur une couleur, X pour échanger)
      const sw2 = curEl.querySelector('.sw2');
      sw2.title = T('edColor2');
      function setColor2(p) {
        S.color2 = p;
        if (!p) { sw2.style.background = ''; sw2.classList.remove('transp'); sw2.classList.add('none'); palEl.querySelectorAll('.bpe-sw.on2').forEach((b) => b.classList.remove('on2')); if (typeof renderGradOpts === 'function') renderGradOpts(); return; }
        sw2.classList.remove('none');
        if (textPanelReady) { renderTextPanel(); if (textEd) updateTextFloat(); }
        sw2.style.background = p.transparent ? '' : p.hex; sw2.classList.toggle('transp', !!p.transparent);
        if (typeof renderGradOpts === 'function') renderGradOpts();
        palEl.querySelectorAll('.bpe-sw').forEach((b) => b.classList.toggle('on2', b.dataset.hex === p.hex));
      }
      function swapColors() { const a2 = S.color, b2 = S.color2; if (!a2 || !b2) return; setColor(b2, true); setColor2(a2); }
      // choisir une couleur pour une case : on clique la case, puis une couleur de la palette (plus besoin du clic droit)
      let askTarget = null;
      const askBar = el('div', 'bpe-askbar'); askBar.innerHTML = '<span></span><button></button>';
      askBar.querySelector('span').textContent = T('edPickColor'); askBar.querySelector('button').innerHTML = I.x; askBar.querySelector('button').title = T('edBack');
      askBar.querySelector('button').onclick = () => askColor(null);
      curEl.parentElement.prepend(askBar);
      // une petite palette s'ouvre juste à côté de la case cliquée
      let cpop = null;
      function closePop() { if (cpop) { cpop.remove(); cpop = null; document.removeEventListener('pointerdown', popOff, true); } }
      function popOff(e) { if (cpop && !cpop.contains(e.target) && !(e.target.closest && e.target.closest('.bpe-pal'))) askColor(null); }
      function openPop(anchor) {
        closePop();
        cpop = el('div', 'bpe-cpop');
        const hd = el('div', 'bpe-cpoph'); hd.textContent = T('edPickColor'); cpop.appendChild(hd);
        const grid = el('div', 'bpe-cpopg');
        const add = (p) => {
          const b = el('button', `bpe-sw${p.transparent ? ' transp' : ''}${p.locked ? ' locked' : ''}`);
          if (!p.transparent) b.style.backgroundColor = p.hex;
          if (p.fx && !FX_DRAWN.has(p.fx)) b.classList.add('bpe-shim', `bpe-sh-${p.fx}`);
          if (p.locked) b.innerHTML = I.lock;
          b.title = p.name;
          b.onclick = (e) => { e.stopPropagation(); giveColor(p); };
          grid.appendChild(b);
        };
        add(TRANSP);
        for (const p of (S.mineOnly ? pal.filter((q) => !q.locked) : pal)) add(p);
        cpop.appendChild(grid);
        ui.appendChild(cpop);
        const r = anchor.getBoundingClientRect(), pw = cpop.offsetWidth, ph = cpop.offsetHeight;
        let left = r.left - pw - 12, top = r.top + r.height / 2 - ph / 2;
        if (left < 8) left = Math.min(innerWidth - pw - 8, r.right + 12);
        Object.assign(cpop.style, { left: `${clamp(left, 8, innerWidth - pw - 8)}px`, top: `${clamp(top, 8, innerHeight - ph - 8)}px` });
        setTimeout(() => document.addEventListener('pointerdown', popOff, true), 0);
      }
      function askColor(target, anchor) {
        askTarget = target;
        ui.classList.toggle('askcolor', !!target);
        sw.classList.toggle('asking', !!target && target.kind === 'c1');
        sw2.classList.toggle('asking', !!target && target.kind === 'c2');
        if (target && anchor) openPop(anchor); else closePop();
        if (typeof renderGradSettings === 'function' && bpeGradReady) renderGradSettings();
      }
      function giveColor(p) {
        const t = askTarget; askColor(null);
        if (t.kind === 'c1') setColor(p, true);
        else if (t.kind === 'c2') setColor2(p);
        else if (t.kind === 'stop') { t.gr.stops[t.idx] = p.hex; saveGrads(); renderGradOpts(); }
        else if (t.kind === 'stopAdd') { t.gr.stops.push(p.hex); if (t.gr.stops.length > 24) t.gr.stops.shift(); saveGrads(); renderGradOpts(); }
        A.playSound('click');
      }
      const pickSwatch = (p) => { if (askTarget) giveColor(p); else setColor(p); };
      const sw = curEl.querySelector('.sw');
      sw.title = T('edColor1'); sw2.title = T('edColor2');
      sw.onclick = (e) => { e.stopPropagation(); askColor(askTarget && askTarget.kind === 'c1' ? null : { kind: 'c1' }, sw); };
      sw2.onclick = (e) => { e.stopPropagation(); askColor(askTarget && askTarget.kind === 'c2' ? null : { kind: 'c2' }, sw2); };
      const swapB = el('button', 'bpe-swap'); swapB.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v9a4 4 0 0 0 4 4h8M16 14l3 3-3 3"/></svg>'; swapB.title = `${T('edSwap')} (X)`;
      swapB.onclick = (e) => { e.stopPropagation(); swapColors(); A.playSound('click'); };
      curEl.querySelector('.bpe-sws').appendChild(swapB);
      function renderPalette() {
        palEl.innerHTML = '';
        const list = S.mineOnly ? pal.filter((p) => !p.locked) : pal;
        if (!list.length) { const n = el('div', 'bpe-empty'); n.textContent = T('edNoColors'); palEl.appendChild(n); return; }
        // regroupées par pack, comme dans la palette de bplace
        let packs = new Map();
        for (const p of list) { if (!packs.has(p.pack)) packs.set(p.pack, []); packs.get(p.pack).push(p); }
        // le transparent va dans les Neutres (créés s'il n'y en a pas)
        let neutralKey = [...packs.keys()].find((k) => k === 'neutral' || !k);
        if (neutralKey === undefined) { packs = new Map([['neutral', []], ...packs]); neutralKey = 'neutral'; }
        const packName = (k) => (k === '__special' ? T('edPackSpecial') : k === 'neutral' || !k ? T('edPackNeutral') : k.replace(/^special_/, '').replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase()));
        for (const [k, cols] of packs) {
          const sec = el('div', 'bpe-pack');
          const hd = el('div', 'bpe-pkh');
          hd.innerHTML = `<span></span>${cols.length && cols.every((c) => c.locked) ? I.lock : ''}`;
          hd.firstChild.textContent = packName(k);
          const grid = el('div', 'bpe-pkg');
          if (k === neutralKey) {
            const b = el('button', 'bpe-sw transp'); b.dataset.hex = 'transparent'; b.title = `${T('edTransparent')}`;
            b.onclick = () => pickSwatch(TRANSP); b.oncontextmenu = (e) => { e.preventDefault(); setColor2(TRANSP); };
            grid.appendChild(b);
          }
          for (const p of cols) {
            const b = el('button', `bpe-sw${p.locked ? ' locked' : ''}`);
            b.dataset.hex = p.hex; b.style.backgroundColor = p.hex; b.title = p.name + (p.locked ? ' 🔒' : '');
            if (p.fx && FX_DRAWN.has(p.fx)) b.prepend(fxSwatch(p.fx));
            else if (p.fx) b.classList.add('bpe-shim', `bpe-sh-${p.fx}`);
            if (p.locked) b.innerHTML = I.lock;
            b.onclick = () => pickSwatch(p);
            b.oncontextmenu = (e) => { e.preventDefault(); if (!p.locked) setColor2(p); };
            grid.appendChild(b);
          }
          sec.append(hd, grid);
          palEl.appendChild(sec);
        }
        if (S.color) palEl.querySelectorAll('.bpe-sw').forEach((b) => b.classList.toggle('on', b.dataset.hex === S.color.hex));
        if (S.color2) palEl.querySelectorAll('.bpe-sw').forEach((b) => b.classList.toggle('on2', b.dataset.hex === S.color2.hex));
      }
      $('[data-a="mine"]').onchange = (e) => { S.mineOnly = e.target.checked; renderPalette(); };

      /* ---------- calques ---------- */
      const llist = $('.bpe-llist'), lacts = $('.bpe-lacts');
      const LA = [['add', I.plus, 'edAddLayer'], ['dup', I.copy, 'edDupLayer'], ['up', I.up, 'edUp'], ['down', I.down, 'edDown'], ['merge', I.merge, 'edMerge'], ['del', I.trash, 'edDelLayer']];
      for (const [k, ic, tk] of LA) {
        const b = el('button', IB); b.dataset.l = k; b.innerHTML = ic; b.title = T(tk);
        b.onclick = () => layerAction(k);
        lacts.appendChild(b);
      }
      function layerAction(k) {
        if (S.floating) commitFloating();
        const i = S.active;
        if (k === 'add') { pushDoc(); S.layers.splice(i + 1, 0, newLayer(`${T('edLayer')} ${S.layers.length + 1}`)); S.active = i + 1; }
        if (k === 'dup') { pushDoc(); const L = S.layers[i]; S.layers.splice(i + 1, 0, { ...L, id: uid(), name: `${L.name} 2`, data: L.data.slice() }); S.active = i + 1; }
        if (k === 'up' && i < S.layers.length - 1) { pushDoc(); [S.layers[i], S.layers[i + 1]] = [S.layers[i + 1], S.layers[i]]; S.active = i + 1; }
        if (k === 'down' && i > 0) { pushDoc(); [S.layers[i], S.layers[i - 1]] = [S.layers[i - 1], S.layers[i]]; S.active = i - 1; }
        if (k === 'merge' && i > 0) {
          pushDoc();
          const top = S.layers[i], bot = S.layers[i - 1];
          if (top.visible) {
            const mode = top.mode || 'normal', o = top.opacity == null ? 1 : top.opacity;
            for (let p = 0; p < top.data.length; p += 4) {
              if (!top.data[p + 3]) continue;
              let c = [top.data[p], top.data[p + 1], top.data[p + 2]];
              if (mode !== 'normal' && bot.data[p + 3]) {
                const b0 = [bot.data[p], bot.data[p + 1], bot.data[p + 2]], m = blendRgb(mode, b0, c), q = nearest(b0[0] + (m[0] - b0[0]) * o, b0[1] + (m[1] - b0[1]) * o, b0[2] + (m[2] - b0[2]) * o);
                if (q) c = q.rgb;
              }
              bot.data[p] = c[0]; bot.data[p + 1] = c[1]; bot.data[p + 2] = c[2]; bot.data[p + 3] = 255;
            }
          }
          S.layers.splice(i, 1); S.active = i - 1;
        }
        if (k === 'del' && S.layers.length > 1) { pushDoc(); S.layers.splice(i, 1); S.active = clamp(i - 1, 0, S.layers.length - 1); }
        compositeAll(); renderLayers(); draw();
      }
      const ALOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M8 17h.01M12 14h.01M16 17h.01M12 19h.01" stroke-width="2.6"/></svg>';
      // petit menu au style du site, posé sous un bouton
      function ddMenu(anchor, items, cur, onPick) {
        ui.querySelectorAll(':scope > .bpe-dd').forEach((n) => n.remove());
        const m = el('div', 'bpe-dd bpe-ddm');
        for (const [k, label] of items) {
          const b = el('button', k === cur ? 'on' : ''); b.innerHTML = `<span></span>${k === cur ? '<i></i>' : ''}`; b.querySelector('span').textContent = label;
          b.onclick = (e) => { e.stopPropagation(); m.remove(); onPick(k); };
          m.appendChild(b);
        }
        ui.appendChild(m);
        const r = anchor.getBoundingClientRect(), mh = m.offsetHeight, mw = m.offsetWidth;
        const top = r.bottom + 6 + mh > innerHeight - 8 ? Math.max(8, r.top - 6 - mh) : r.bottom + 6;
        Object.assign(m.style, { position: 'fixed', top: `${top}px`, left: `${clamp(r.right - mw, 8, innerWidth - mw - 8)}px`, right: 'auto', minWidth: '180px' });
        const off = (e) => { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('pointerdown', off, true); } };
        setTimeout(() => document.addEventListener('pointerdown', off, true), 0);
      }
      function renderLayers() {
        llist.innerHTML = '';
        for (let i = S.layers.length - 1; i >= 0; i--) {
          const L = S.layers[i];
          const row = el('div', `bpe-lrow${i === S.active ? ' on' : ''}${L.visible ? '' : ' hid'}`);
          row.innerHTML = `<button class="bpe-eye">${L.visible ? I.eye : I.eyeOff}</button><span class="bpe-lth"></span><span class="bpe-lmid"><span class="bpe-lnr"><span class="bpe-lnm"></span><button class="bpe-mode"></button></span><span class="bpe-lop"><input type="range" min="0" max="100"><b></b></span></span>`;
          const mb = row.querySelector('.bpe-mode'), md = L.mode || 'normal';
          mb.textContent = T(`edBl_${md}`); mb.title = T('edLayerMode'); mb.classList.toggle('set', md !== 'normal');
          mb.onclick = (e) => { e.stopPropagation(); ddMenu(mb, BR_BLENDS.map((k) => [k, T(`edBl_${k}`)]), md, (k) => { pushDoc(); L.mode = k; compositeAll(); renderLayers(); draw(); }); };
          row.querySelector('.bpe-eye').title = T('edVis');
          const th = makeCanvas(S.w, S.h, L.data); th.className = 'bpe-thc'; row.querySelector('.bpe-lth').appendChild(th);
          const nm = row.querySelector('.bpe-lnm'); nm.textContent = L.name;
          const op = row.querySelector('.bpe-lop input'), opv = row.querySelector('.bpe-lop b');
          op.value = Math.round(L.opacity * 100); opv.textContent = `${op.value}%`; op.title = T('edOpacity');
          op.style.setProperty('--p', `${op.value}%`);
          op.onpointerdown = (e) => e.stopPropagation();
          op.oninput = () => { L.opacity = op.value / 100; opv.textContent = `${op.value}%`; op.style.setProperty('--p', `${op.value}%`); S.dirty = true; compositeAll(); draw(); };
          row.onclick = () => { if (S.floating) commitFloating(); S.active = i; renderLayers(); };
          row.querySelector('.bpe-eye').onclick = (e) => { e.stopPropagation(); pushDoc(); L.visible = !L.visible; compositeAll(); renderLayers(); draw(); };
          // verrouiller l'alpha (comme Krita) : on ne peint que sur les pixels déjà là, rien n'est ajouté ni effacé
          const la = el('button', `bpe-eye bpe-alock${L.lockA ? ' on' : ''}`); la.innerHTML = ALOCK; la.title = T('edAlphaLock');
          la.onclick = (e) => { e.stopPropagation(); L.lockA = !L.lockA; renderLayers(); };
          row.appendChild(la);
          nm.ondblclick = (e) => {
            e.stopPropagation();
            const inp = el('input', 'bpe-lin'); inp.value = L.name; nm.replaceWith(inp); inp.focus(); inp.select();
            const done = () => { const v = inp.value.trim(); if (v && v !== L.name) { L.name = v; S.dirty = true; } renderLayers(); };
            inp.onblur = done; inp.onkeydown = (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') inp.blur(); if (ev.key === 'Escape') { inp.value = L.name; inp.blur(); } };
          };
          llist.appendChild(row);
        }
        lacts.querySelector('[data-l="del"]').disabled = S.layers.length <= 1;
        lacts.querySelector('[data-l="merge"]').disabled = S.active === 0;
        lacts.querySelector('[data-l="up"]').disabled = S.active >= S.layers.length - 1;
        lacts.querySelector('[data-l="down"]').disabled = S.active === 0;
      }
      let thumbT = 0;
      const refreshThumbs = () => { clearTimeout(thumbT); thumbT = setTimeout(renderLayers, 250); };

      /* ---------- souris ---------- */
      let drag = null, spacePan = false;
      cv.addEventListener('pointerdown', (e) => {
        cv.setPointerCapture(e.pointerId);
        beginGroup();
        let p = toPx(e.clientX, e.clientY);
        if (e.button === 1) { e.preventDefault(); if (!picking) pick(p.x, p.y, true); return; }
        const ar = S.refEdit ? refAct() : null;
        if (!picking && !spacePan && e.button === 0 && ar && ar.visible) {
          const r = ar, id = hitHandle(r, e.clientX, e.clientY);
          if (id) drag = { tool: '__refsize', id, r0: { ...r }, start: p, last: p };
          else if (p.fx >= r.x && p.fx <= r.x + r.w && p.fy >= r.y && p.fy <= r.y + r.h) drag = { tool: '__refmove', r0: { ...r }, start: p, last: p };
          if (drag) return;
        }
        if (!picking && !spacePan && e.button === 0 && S.floating && S.tool === 'move') {
          const id = hitHandle(S.floating, e.clientX, e.clientY);
          if (id) { const f = S.floating; drag = { tool: '__scale', id, r0: { x: f.x, y: f.y, w: f.w, h: f.h }, start: p, last: p }; return; }
        }
        if (picking && !spacePan && e.button === 0 && S.tool !== 'pan') {
          drag = { tool: '__pick', start: p, last: p };
          pickRect = { x: p.x, y: p.y, w: 1, h: 1 };
          draw(); return;
        }
        const tool0 = spacePan ? 'pan' : S.tool;
        if (live && ['pencil', 'line', 'rect', 'ellipse'].includes(tool0) && e.button !== 2) {
          const h = tool0 === 'pencil' || tool0 === 'line' ? brushExt() : Math.floor((S.size - 1) / 2);
          if (growTo(p.x - h, p.y - h, p.x + h, p.y + h)) p = toPx(e.clientX, e.clientY);
        }
        const tool = spacePan ? 'pan' : (e.altKey && ['pencil', 'fill', 'line', 'rect', 'ellipse'].includes(S.tool) ? 'picker' : S.tool);
        drag = { tool, start: p, last: p, ox: S.ox, oy: S.oy, erase: e.button === 2 || tool === 'eraser', shift: e.shiftKey };
        if (tool === 'pencil' || tool === 'eraser') {
          if (S.floating) commitFloating();
          if (!drag.erase && !S.color) { drag = null; return; }
          beginStroke(); ppPts = []; strokeN = 0; lastPt = null; line(p.x, p.y, p.x, p.y, drag.erase); A.playSound('edPaint');
        } else if (tool === 'line' || tool === 'rect' || tool === 'ellipse') {
          if (S.floating) commitFloating();
          if (!S.color) { drag = null; return; }
          preview = { pts: expandBrush(shapePts(tool, p, p, e.shiftKey), tool) };
        } else if (tool === 'gradient') {
          if (S.floating) commitFloating();
          if (!S.color) { drag = null; return; }
          gradPrev = null; previewGradient(p, p);
        } else if (tool === 'fill') { if (S.floating) commitFloating(); flood(p.x, p.y); drag = null; refreshThumbs(); }
        else if (tool === 'picker') { pick(p.x, p.y); drag = null; }
        else if (tool === 'select') { if (S.floating) commitFloating(); if (!e.shiftKey) S.sel = null; drag.sx = clamp(p.x, 0, S.w); drag.sy = clamp(p.y, 0, S.h); drag.base = S.sel; }
        else if (tool === 'lasso') { if (S.floating) commitFloating(); if (!e.shiftKey) S.sel = null; lassoPts = [p.fx, p.fy]; }
        else if (tool === 'text') {
          // dans le texte en cours : on le déplace ; ailleurs : on valide et on commence un nouveau texte
          const f = S.floating;
          if (textEd && f && p.x >= f.x && p.y >= f.y && p.x < f.x + f.w && p.y < f.y + f.h) { drag = { tool: '__textmove', start: p, fx: f.x, fy: f.y }; return; }
          if (textEd) finishText(true);
          startText(p); drag = null;
        } else if (tool === 'colorsel') {
          // sélection par couleur : tous les pixels du calque qui ont exactement cette couleur, où qu'ils soient
          if (S.floating) commitFloating();
          if (p.x >= 0 && p.y >= 0 && p.x < S.w && p.y < S.h) {
            const d = layer().data, i0 = (p.y * S.w + p.x) * 4, full = new Uint8Array(S.w * S.h);
            const empty = !d[i0 + 3];
            for (let pi = 0, i = 0; pi < full.length; pi++, i += 4) full[pi] = empty ? (d[i + 3] ? 0 : 1) : (d[i + 3] && d[i] === d[i0] && d[i + 1] === d[i0 + 1] && d[i + 2] === d[i0 + 2] ? 1 : 0);
            selFromFull(full, e.shiftKey);
          }
          drag = null;
        } else if (tool === 'wand') {
          if (S.floating) commitFloating();
          if (p.x >= 0 && p.y >= 0 && p.x < S.w && p.y < S.h) selFromFull(floodMask(p.x, p.y, layer().data), e.shiftKey);
          drag = null;
        } else if (tool === 'move') {
          if (!S.floating) lift(true);
          drag.fx = S.floating ? S.floating.x : 0; drag.fy = S.floating ? S.floating.y : 0;
        }
        draw();
      });
      cv.addEventListener('pointermove', (e) => {
        let p = toPx(e.clientX, e.clientY);
        hover = p;
        if (drag && drag.tool === '__textmove') {
          if (textEd && S.floating) { textEd.x = drag.fx + (p.x - drag.start.x); textEd.y = drag.fy + (p.y - drag.start.y); S.floating.x = textEd.x; S.floating.y = textEd.y; placeTextCard(); draw(); }
          return;
        }
        if (drag && (drag.tool === '__refsize' || drag.tool === '__refmove' || drag.tool === '__scale')) {
          const ar = refAct();
          if (drag.tool === '__refmove') { if (ar) { ar.x = drag.r0.x + (p.fx - drag.start.fx); ar.y = drag.r0.y + (p.fy - drag.start.fy); } }
          else if (drag.tool === '__refsize') { if (ar) Object.assign(ar, resizeRect(drag.r0, drag.id, p.fx, p.fy, !e.shiftKey, false)); }
          else scaleFloating(resizeRect(drag.r0, drag.id, p.fx, p.fy, e.shiftKey, true));
          drag.last = p; draw(); return;
        }
        if (!drag) {
          const ar = S.refEdit ? refAct() : null;
          const r = ar && ar.visible ? ar : (S.floating && S.tool === 'move' ? S.floating : null);
          const id = r && hitHandle(r, e.clientX, e.clientY);
          cv.style.cursor = id ? CURSOR[id] : (ar && r === ar && p.fx >= r.x && p.fx <= r.x + r.w && p.fy >= r.y && p.fy <= r.y + r.h ? 'move' : '');
        }
        if (drag && drag.tool === '__pick') {
          const x0 = Math.min(drag.start.x, p.x), y0 = Math.min(drag.start.y, p.y);
          pickRect = { x: x0, y: y0, w: Math.min(MAXS, Math.abs(p.x - drag.start.x) + 1), h: Math.min(MAXS, Math.abs(p.y - drag.start.y) + 1) };
          drag.last = p; draw(); return;
        }
        if (drag) {
          if (drag.tool === 'pan') {
            if (live) { A.map().panBy([drag.last.sx - p.sx, drag.last.sy - p.sy], { duration: 0 }); }
            else { S.ox = drag.ox + (p.sx - drag.start.sx); S.oy = drag.oy + (p.sy - drag.start.sy); }
          }
          else if (drag.tool === 'pencil' || drag.tool === 'eraser') {
            if (live && !drag.erase) {
              const h = brushExt();
              if (p.x - h < 0 || p.y - h < 0 || p.x + h >= S.w || p.y + h >= S.h) {
                endStroke();
                const k = growTo(p.x - h, p.y - h, p.x + h, p.y + h);
                if (k) { drag.last = { ...drag.last, x: drag.last.x + k.kx, y: drag.last.y + k.ky }; drag.start = { ...drag.start, x: drag.start.x + k.kx, y: drag.start.y + k.ky }; ppPts = ppPts.map(([a, b]) => [a + k.kx, b + k.ky]); if (lastPt) lastPt = [lastPt[0] + k.kx, lastPt[1] + k.ky]; }
                beginStroke();
                p = toPx(e.clientX, e.clientY); hover = p;
              }
            }
            if (p.x !== drag.last.x || p.y !== drag.last.y) { line(drag.last.x, drag.last.y, p.x, p.y, drag.erase); A.playSound('edPaint'); }
          } else if (drag.tool === 'gradient') {
            drag.last = p; previewGradient(drag.start, p);
          } else if (drag.tool === 'line' || drag.tool === 'rect' || drag.tool === 'ellipse') {
            preview = { pts: expandBrush(shapePts(drag.tool, drag.start, p, e.shiftKey), drag.tool) };
          } else if (drag.tool === 'select') {
            const x0 = Math.min(drag.sx, clamp(p.x, 0, S.w)), y0 = Math.min(drag.sy, clamp(p.y, 0, S.h));
            const x1 = Math.max(drag.sx, clamp(p.x + 1, 0, S.w)), y1 = Math.max(drag.sy, clamp(p.y + 1, 0, S.h));
            drag.rect = x1 - x0 > 0 && y1 - y0 > 0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0, mask: null } : null;
            S.sel = drag.base && drag.shift ? drag.base : drag.rect;
            if (drag.base && drag.shift && drag.rect) { S.sel = drag.rect; }
          } else if (drag.tool === 'lasso' && lassoPts) {
            const lx = lassoPts[lassoPts.length - 2], ly = lassoPts[lassoPts.length - 1];
            if (Math.hypot(p.fx - lx, p.fy - ly) > 0.4) lassoPts.push(p.fx, p.fy);
          } else if (drag.tool === 'move' && S.floating) {
            S.floating.x = drag.fx + (p.x - drag.start.x); S.floating.y = drag.fy + (p.y - drag.start.y);
          }
          drag.last = p;
        }
        draw();
      });
      const up = () => { try { upInner(); } finally { endGroup(); } };
      const upInner = () => {
        if (!drag) return;
        const d = drag; drag = null;
        if (d.tool === '__refsize' || d.tool === '__refmove' || d.tool === '__scale' || d.tool === '__textmove') { draw(); if (textEd) textEd.ta.focus(); return; }
        if (d.tool === '__pick') { const r = pickRect; endPick(r && (r.w > 1 || r.h > 1) ? r : { x: d.start.x, y: d.start.y, w: 1, h: 1 }); return; }
        if (d.tool === 'pencil' || d.tool === 'eraser') { endStroke(); refreshThumbs(); }
        if (d.tool === 'gradient') { if (gradRaf) { cancelAnimationFrame(gradRaf); gradRaf = 0; } gradPrev = null; applyGradient(d.start, d.last || d.start); }
        if ((d.tool === 'line' || d.tool === 'rect' || d.tool === 'ellipse') && preview) {
          let pts = shapePts(d.tool, d.start, d.last, d.shift || false);
          if (live) {
            const h = d.tool === 'line' ? brushExt() : Math.floor((S.size - 1) / 2);
            let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
            for (let i = 0; i < pts.length; i += 2) { x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]); y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]); }
            const k = growTo(x0 - h, y0 - h, x1 + h, y1 + h);
            if (k) pts = pts.map((v, i) => v + (i % 2 ? k.ky : k.kx));
          }
          preview = null; commitShape(pts, d.tool);
        }
        if (d.tool === 'select') {
          if (d.rect && d.base && d.shift) {
            const full = new Uint8Array(S.w * S.h);
            for (let y = d.rect.y; y < d.rect.y + d.rect.h; y++) for (let x = d.rect.x; x < d.rect.x + d.rect.w; x++) full[y * S.w + x] = 1;
            S.sel = d.base; selFromFull(full, true);
          } else if (!d.rect || (d.rect.w === 1 && d.rect.h === 1 && d.start.x === d.last.x && d.start.y === d.last.y)) S.sel = d.base && d.shift ? d.base : null;
        }
        if (d.tool === 'lasso' && lassoPts) {
          const pts = lassoPts; lassoPts = null;
          if (pts.length >= 6) {
            const c = makeCanvas(S.w, S.h), cx = c.getContext('2d');
            cx.beginPath(); cx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) cx.lineTo(pts[i], pts[i + 1]); cx.closePath();
            cx.fillStyle = '#000'; cx.fill();
            const a = cx.getImageData(0, 0, S.w, S.h).data, full = new Uint8Array(S.w * S.h);
            for (let i = 0; i < full.length; i++) full[i] = a[i * 4 + 3] >= 128 ? 1 : 0;
            selFromFull(full, d.shift);
          }
        }
        draw();
      };
      cv.addEventListener('pointerup', up);
      cv.addEventListener('pointercancel', up);
      cv.addEventListener('pointerleave', () => { hover = null; draw(); });
      cv.addEventListener('contextmenu', (e) => e.preventDefault());
      cv.addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); });
      cv.addEventListener('auxclick', (e) => { if (e.button === 1) e.preventDefault(); });
      cv.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (live) { const m = A.map(); m.easeTo({ zoom: m.getZoom() - Math.sign(e.deltaY) * 0.4, around: m.unproject(mapPt(e.clientX, e.clientY)), duration: 0 }); return; }
        if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) >= Math.abs(e.deltaX)) zoomAt(e.deltaY < 0 ? 1.25 : 0.8, e.clientX, e.clientY);
        else { S.ox -= e.deltaX; draw(); }
      }, { passive: false });

      /* ---------- clavier ---------- */
      const onKey = (e) => {
        if (!ed || ed.ui !== ui) return;
        const t = e.target;
        // champ de texte : la touche va au champ ; on l'empêche seulement d'atteindre les raccourcis du site (voir plus bas)
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') && t.type !== 'checkbox' && t.type !== 'range') return;
        const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
        if (e.code === 'Space') { if (!spacePan) { spacePan = true; ui.dataset.tool = 'pan'; } e.preventDefault(); e.stopPropagation(); return; }
        let used = true;
        if (mod && k === 'z' && !e.shiftKey) undo();
        else if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) redo();
        else if (mod && e.shiftKey && k === 'a') { if (S.floating) commitFloating(); S.sel = null; draw(); }
        else if (mod && k === 'a') { if (S.floating) commitFloating(); S.sel = { x: 0, y: 0, w: S.w, h: S.h, mask: null }; draw(); }
        else if (mod && k === 'd') { if (S.floating) commitFloating(); S.sel = null; draw(); }
        else if (mod && (k === 'c' || k === 'x')) copySel(k === 'x');
        else if (mod && k === 'v') { if (S.clip) pasteFloating(S.clip.data.slice(), S.clip.w, S.clip.h, null); else used = false; }
        else if (mod && k === 's') save();
        else if (mod && k === 't') startTransform();
        else if (mod) used = false;
        else if (k === 'enter') commitFloating();
        else if (k === '?' || (e.shiftKey && e.code === 'Slash') || k === 'f1') toggleHelp();
        else if (e.shiftKey && k === 'h') transform('flipH');
        else if (e.shiftKey && k === 'v') transform('flipV');
        else if (e.shiftKey && k === 'r') transform('rotate');
        else if (e.shiftKey && k === 'm') setLive(!live);
        else if (k === 'tab') setLayoutEdit(!ui.classList.contains('edit-layout'));
        else if (k === 'escape') { if (askTarget) askColor(null); else if (helpEl) toggleHelp(); else if (S.floating) cancelFloating(); else if (S.sel) { S.sel = null; draw(); } else requestClose(); }
        else if (k === 'delete' || k === 'backspace') clearSel();
        else if (k === 'x') swapColors();
        else if ({ b: 1, e: 1, g: 1, d: 1, i: 1, u: 1, r: 1, o: 1, m: 1, l: 1, w: 1, y: 1, t: 1, v: 1, h: 1 }[k]) setTool({ t: 'text', b: 'pencil', e: 'eraser', g: 'fill', d: 'gradient', i: 'picker', u: 'line', r: 'rect', o: 'ellipse', m: 'select', l: 'lasso', w: 'wand', y: 'colorsel', v: 'move', h: 'pan' }[k]);
        else if (k === '[') { S.size = clamp(S.size - 1, 1, 24); paintTools(); draw(); }
        else if (k === ']') { S.size = clamp(S.size + 1, 1, 24); paintTools(); draw(); }
        else if (k === '+' || k === '=') zoomAt(1.25, innerWidth / 2, innerHeight / 2);
        else if (k === '-') zoomAt(0.8, innerWidth / 2, innerHeight / 2);
        else if (k === '0') fitView();
        else if (S.floating && k.startsWith('arrow')) { const dd = e.shiftKey ? 10 : 1; if (k === 'arrowleft') S.floating.x -= dd; if (k === 'arrowright') S.floating.x += dd; if (k === 'arrowup') S.floating.y -= dd; if (k === 'arrowdown') S.floating.y += dd; draw(); }
        else used = false;
        if (used) { e.preventDefault(); e.stopPropagation(); }
      };
      let helpEl = null;
      function toggleHelp() {
        if (helpEl) { helpEl.remove(); helpEl = null; bar.querySelector('[data-a="help"]').classList.remove('on'); return; }
        const rows = [
          ['B', T('edPencil')], ['E', T('edEraser')], ['G', T('edFill')], ['D', T('edGradient')], ['I', T('edPicker')], ['X', T('edSwap')], ['U', T('edLine')], ['R', T('edRect')], ['O', T('edEllipse')],
          ['M', T('edSelect')], ['L', T('edLasso')], ['W', T('edWand')], ['Y', T('edColorSel')], ['T', T('edText')], ['V', T('edMove')], ['H', T('edPan')],
          [T('edKeyMid'), T('edPicker')], [T('edKeyAlt'), T('edPicker')], [T('edKeyRight'), T('edEraser')], [T('edKeySpace'), T('edPan')],
          ['[  ]', T('edSize')], [T('edKeyShift'), T('edShiftShape')],
          ['Ctrl + Z', T('edUndo')], ['Ctrl + Y', T('edRedo')], ['Ctrl + A', T('edSelAll')], ['Ctrl + D', T('edDeselect')], [T('edKeyEsc'), T('edDeselect')],
          ['Ctrl + C / X / V', `${T('copy')} / ${T('edCut')} / ${T('edPaste')}`], [T('edKeyDel'), T('edClearSel')], [T('edKeyArrows'), T('edMove')], [T('edKeyEnter'), T('edCommit')],
          [`${T('edKeyShift')} + H / V`, `${T('edFlipH')} / ${T('edFlipV')}`], [`${T('edKeyShift')} + R`, T('edRotate')], ['Ctrl + T', T('edTransform')], [`${T('edKeyShift')} + M`, T('edLive')],
          ['+  −  0', T('edZoomFit')], ['Ctrl + S', T('edSave')], ['Tab', T('edLayoutEdit')], ['?', T('edShortcuts')],
        ];
        helpEl = el('div', 'bpe-card bpe-help');
        helpEl.innerHTML = '<div class="bpe-help-h"><b></b></div><div class="bpe-help-g"></div>';
        helpEl.querySelector('b').textContent = T('edShortcuts');
        const close = el('button', IB); close.innerHTML = I.x; close.onclick = toggleHelp;
        helpEl.querySelector('.bpe-help-h').appendChild(close);
        const grid = helpEl.querySelector('.bpe-help-g');
        for (const [k2, v] of rows) {
          const r = el('div', 'bpe-help-r');
          r.innerHTML = '<kbd></kbd><span></span>';
          r.firstChild.textContent = k2; r.lastChild.textContent = v;
          grid.appendChild(r);
        }
        ui.appendChild(helpEl);
        bar.querySelector('[data-a="help"]').classList.add('on');
      }
      const onKeyUp = (e) => { if (e.code === 'Space' && spacePan) { spacePan = false; ui.dataset.tool = S.tool; e.stopPropagation(); } };
      window.addEventListener('keydown', onKey, true);
      ui.addEventListener('keydown', (e) => { const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) e.stopPropagation(); });
      window.addEventListener('keyup', onKeyUp, true);
      const onPaste = (e) => {
        if (!ed || ed.ui !== ui) return;
        const item = [...(e.clipboardData ? e.clipboardData.items : [])].find((i) => i.type.startsWith('image/'));
        if (!item) return;
        e.preventDefault(); e.stopPropagation();
        importFile(item.getAsFile());
      };
      window.addEventListener('paste', onPaste, true);
      // fichiers glissés depuis l'ordinateur : chaque image devient un nouveau calque
      const dropHint = el('div', 'bpe-drop');
      dropHint.innerHTML = `<div class="bpe-drop-in">${I.image}<span></span></div>`;
      dropHint.querySelector('span').textContent = T('edDrop');
      ui.appendChild(dropHint);
      let dragDepth = 0;
      const hasFiles = (e) => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
      ui.addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; e.preventDefault(); dragDepth++; ui.classList.add('dropping'); });
      ui.addEventListener('dragover', (e) => { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
      ui.addEventListener('dragleave', (e) => { if (!hasFiles(e)) return; if (--dragDepth <= 0) { dragDepth = 0; ui.classList.remove('dropping'); } });
      ui.addEventListener('drop', async (e) => {
        if (!hasFiles(e)) return;
        e.preventDefault(); dragDepth = 0; ui.classList.remove('dropping');
        const all = [...e.dataTransfer.files];
        const toBrush = e.target && e.target.closest && e.target.closest('.bpe-pbr');
        const brushFiles = all.filter((f) => isBrushFile(f) || (toBrush && /^image\//.test(f.type)));
        if (brushFiles.length) await importBrushes(brushFiles);
        const files = all.filter((f) => !brushFiles.includes(f) && (/^image\/(png|jpe?g|webp|gif|bmp)$/.test(f.type) || /\.(bplace|wplace|bplus)$/i.test(f.name)));
        if (!files.length) { if (!brushFiles.length) toast(T('edBadFile'), 'err'); return; }
        const toRef = e.target && e.target.closest && e.target.closest('.bpe-pref');
        for (const f of files) { if (toRef && /^image\//.test(f.type)) await loadRef(f); else await importFile(f); }
        A.playSound('drop');
      });

      function copySel(cut) {
        const L = layer(); if (!L) return;
        if (S.floating) { S.clip = { w: S.floating.w, h: S.floating.h, data: S.floating.data.slice() }; if (cut) { S.floating = null; syncHist(); draw(); } return; }
        const r = S.sel || { x: 0, y: 0, w: S.w, h: S.h, mask: null };
        const data = new Uint8ClampedArray(r.w * r.h * 4);
        for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
          if (r.mask && !r.mask[y * r.w + x]) continue;
          const si = ((r.y + y) * S.w + r.x + x) * 4; data.set(L.data.subarray(si, si + 4), (y * r.w + x) * 4);
        }
        S.clip = { w: r.w, h: r.h, data };
        if (cut) clearSel();
      }
      function clearSel() {
        if (S.floating) { S.floating = null; syncHist(); draw(); return; }
        const L = layer(); if (!L) return;
        const r = S.sel || { x: 0, y: 0, w: S.w, h: S.h };
        beginStroke();
        for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (inSel(x, y)) L.data[(y * S.w + x) * 4 + 3] = 0;
        growStroke(r.x, r.y, r.x + r.w, r.y + r.h);
        compositeRect(r.x, r.y, r.x + r.w, r.y + r.h);
        endStroke(); refreshThumbs(); draw();
      }

      /* ---------- import d'image ---------- */
      const fileIn = $('[data-file]');
      fileIn.onchange = () => { const f = fileIn.files && fileIn.files[0]; fileIn.value = ''; if (f) importFile(f); };
      async function importFile(f) {
        if (isBplus(f)) {
          const doc = await decodeBplus(f);
          if (!doc) { toast(T('edBadFile'), 'err'); return; }
          if (S.floating) commitFloating();
          pushDoc();
          if (doc.w > S.w || doc.h > S.h) resizeCanvas(Math.max(S.w, doc.w), Math.max(S.h, doc.h), false);
          // les calques gardent leur place sur la carte si possible, sinon en haut à gauche
          let dx = doc.world === S.world ? doc.x - S.origin.x : 0, dy = doc.world === S.world ? doc.y - S.origin.y : 0;
          if (dx < 0 || dy < 0 || dx + doc.w > S.w || dy + doc.h > S.h) { dx = 0; dy = 0; }
          for (const l of doc.layers) {
            const L = newLayer(l.name); L.visible = l.visible; L.opacity = l.opacity; L.mode = l.mode || 'normal'; L.lockA = !!l.lockA;
            for (let y = 0; y < doc.h; y++) L.data.set(l.data.subarray(y * doc.w * 4, (y + 1) * doc.w * 4), ((y + dy) * S.w + dx) * 4);
            S.layers.push(L);
          }
          S.active = S.layers.length - 1;
          compositeAll(); renderLayers(); syncHist(); draw();
          A.playSound('drop');
          return;
        }
        let im = null;
        if (/\.(bplace|wplace)$/i.test(f.name || '')) {
          try { const j = JSON.parse(await f.text()); if (j && j.template && j.template.imageData) im = await loadImg(j.template.imageData); } catch (e) { im = null; }
        } else im = await blobImg(f);
        if (!im) { toast(T('edBadFile'), 'err'); return; }
        let w = im.naturalWidth, h = im.naturalHeight;
        if (w > MAXS || h > MAXS) { const k = MAXS / Math.max(w, h); w = Math.max(1, Math.round(w * k)); h = Math.max(1, Math.round(h * k)); }
        const c = makeCanvas(w, h), cx = c.getContext('2d');
        cx.imageSmoothingEnabled = false; cx.drawImage(im, 0, 0, w, h);
        const data = quantize(cx.getImageData(0, 0, w, h), S.mineOnly ? pal.filter((p) => !p.locked) : pal).data;
        if (w > S.w || h > S.h) { pushDoc(); resizeCanvas(Math.max(S.w, w), Math.max(S.h, h), false); fitView(); }
        pasteFloating(new Uint8ClampedArray(data), w, h, (f.name || T('edLayer')).replace(/\.[^.]+$/, '').slice(0, 40));
      }

      /* ---------- taille du canvas / rognage ---------- */
      function resizeCanvas(w, h, record = true, dx = 0, dy = 0) {
        w = clamp(Math.round(w), 1, MAXS); h = clamp(Math.round(h), 1, MAXS);
        if (record) pushDoc();
        for (const L of S.layers) {
          const nd = new Uint8ClampedArray(w * h * 4);
          for (let y = 0; y < h; y++) {
            const sy = y + dy; if (sy < 0 || sy >= S.h) continue;
            for (let x = 0; x < w; x++) {
              const sx = x + dx; if (sx < 0 || sx >= S.w) continue;
              const si = (sy * S.w + sx) * 4, di = (y * w + x) * 4;
              nd[di] = L.data[si]; nd[di + 1] = L.data[si + 1]; nd[di + 2] = L.data[si + 2]; nd[di + 3] = L.data[si + 3];
            }
          }
          L.data = nd;
        }
        S.origin = { x: S.origin.x + dx, y: S.origin.y + dy };
        S.w = w; S.h = h; S.sel = null;
        resizeComp(); renderLayers(); if (S.mapBg) loadBg(); draw();
      }
      function crop() {
        if (S.floating) commitFloating();
        const r = S.sel; if (!r) return;
        resizeCanvas(r.w, r.h, true, r.x, r.y);
        fitView();
      }
      let modalEl = null;
      function modal(content) {
        closeModal();
        modalEl = el('div', 'bpe-scrim');
        modalEl.appendChild(content);
        modalEl.addEventListener('pointerdown', (e) => { if (e.target === modalEl) closeModal(); });
        ui.appendChild(modalEl);
        const f = content.querySelector('input'); if (f) setTimeout(() => f.focus(), 30);
      }
      function closeModal() { if (modalEl) { modalEl.remove(); modalEl = null; } }
      function canvasDialog() {
        const box = el('div', 'bpe-pop');
        box.innerHTML = `<div class="bpe-pt"></div><div class="bpe-fields"><label><span>${T('width')}</span><input type="number" min="1" max="${MAXS}" data-w></label><label><span>${T('height')}</span><input type="number" min="1" max="${MAXS}" data-h></label></div><div class="bpe-prow"></div>`;
        box.querySelector('.bpe-pt').textContent = T('edCanvas');
        box.querySelector('[data-w]').value = S.w; box.querySelector('[data-h]').value = S.h;
        const c = pbtn('neutral', T('edBack'), '', { cls: 'flex-1' }), ok = pbtn('blue', T('edApply'), '', { cls: 'flex-1' });
        box.querySelector('.bpe-prow').append(c, ok);
        modal(box);
        c.onclick = () => closeModal();
        ok.onclick = () => {
          const w = +box.querySelector('[data-w]').value, h = +box.querySelector('[data-h]').value;
          closeModal();
          if (w > 0 && h > 0 && (w !== S.w || h !== S.h)) { if (S.floating) commitFloating(); resizeCanvas(w, h); fitView(); }
        };
        box.querySelectorAll('input').forEach((i) => i.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') ok.click(); }));
      }

      /* ---------- carte en fond ---------- */
      async function loadBg() {
        S.bgCanvas = null;
        try { const r = await A.fetchRegion(Math.max(0, S.origin.x), Math.max(0, S.origin.y), S.w, S.h, S.world); S.bgCanvas = r.canvas; } catch (e) { S.bgCanvas = null; }
        draw();
      }
      function toggleMap() { S.mapBg = !S.mapBg; bar.querySelector('[data-a="map"]').classList.toggle('on', S.mapBg); if (S.mapBg && !S.bgCanvas) loadBg(); draw(); }

      /* ---------- export / enregistrement ---------- */
      function flatCanvas() { if (S.floating) commitFloating(); return makeCanvas(S.w, S.h, flatData()); }
      const layersForStore = () => S.layers.map((L) => ({ name: L.name, visible: L.visible, opacity: L.opacity, mode: L.mode || 'normal', lockA: !!L.lockA, data: L.data.slice() }));
      async function save(quiet) {
        const png = await canvasBlob(flatCanvas());
        const name = (S.name || '').trim() || T('edUntitled');
        let entry = S.libId ? await lib.get(S.libId) : null;
        if (!entry && S.siteId) entry = (await lib.all()).find((e) => e.siteId === S.siteId) || null;
        if (!entry) entry = { id: uid(), createdAt: Date.now(), siteId: S.siteId || null };
        Object.assign(entry, { name, world: S.world, x: S.origin.x, y: S.origin.y, w: S.w, h: S.h, png, layers: layersForStore(), layersW: S.w, layersH: S.h, updatedAt: Date.now() });
        S.libId = entry.id;
        const ctx = A.siteTemplates();
        const live = ctx && entry.siteId ? ctx.templates.find((t) => t.id === entry.siteId) : null;
        if (live) {
          const url = await blobURL(png);
          ctx.updateTemplate(live.id, { name, imageData: url, width: S.w, height: S.h, scale: 1, rotation: 0, position: { x: S.origin.x, y: S.origin.y }, pixelGuide: undefined });
          ctx.updateTemplate(live.id, { colorAdjustments: undefined });
        } else entry.siteId = null;
        await lib.put(entry);
        S.dirty = false;
        libChanged();
        if (!quiet) { toast(T('edSaved'), 'ok'); A.playSound('save'); }
        return entry;
      }
      async function sendSite() {
        const entry = await save(true);
        if (entry.siteId) { toast(T('edSaved'), 'ok'); return; }
        await activate(entry);
      }
      const safeName = () => ((S.name || 'template').replace(/[\\/:*?"<>|]/g, '_').trim() || 'template').slice(0, 80);
      function exportMenu(wrap) {
        ui.querySelectorAll(':scope > .bpe-dd').forEach((n) => n.remove());
        const m = el('div', 'bpe-dd');
        m.innerHTML = `<button data-k="bplus">${I.layers}<span></span></button><button data-k="bplace">${I.box}<span></span></button><button data-k="png">${I.image}<span></span></button>`;
        m.querySelector('[data-k="bplus"] span').textContent = T('edExportBplus');
        m.querySelector('[data-k="bplace"] span').textContent = T('edExportBplace');
        m.querySelector('[data-k="png"] span').textContent = T('edExportPng');
        ui.appendChild(m);
        // le menu reste visible même quand les boutons sont rangés dans une autre barre
        {
          const r = wrap.getBoundingClientRect(), mh = m.offsetHeight, mw = m.offsetWidth;
          const top = r.bottom + 8 + mh > innerHeight - 8 ? Math.max(8, r.top - 8 - mh) : r.bottom + 8;
          const left = clamp(r.right - mw, 8, innerWidth - mw - 8);
          Object.assign(m.style, { position: 'fixed', top: `${top}px`, left: `${left}px`, right: 'auto' });
        }
        const off = (e) => { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('pointerdown', off, true); } };
        setTimeout(() => document.addEventListener('pointerdown', off, true), 0);
        m.querySelector('[data-k="png"]').onclick = async () => { m.remove(); A.downloadBlob(await canvasBlob(flatCanvas()), `${safeName()}.png`); };
        m.querySelector('[data-k="bplus"]').onclick = async () => { m.remove(); if (S.floating) commitFloating(); await downloadBplus({ name: S.name || T('edUntitled'), world: S.world, x: S.origin.x, y: S.origin.y, w: S.w, h: S.h, layers: S.layers }); };
        m.querySelector('[data-k="bplace"]').onclick = async () => {
          m.remove();
          const url = await blobURL(await canvasBlob(flatCanvas()));
          const file = { version: 2, exportedAt: new Date().toISOString(), adjustmentsApplyAtRender: true, template: {
            name: S.name || T('edUntitled'), imageData: url, opacity: 1, position: { ...S.origin }, scale: 1, rotation: 0, visible: true,
            width: S.w, height: S.h, displayMode: 'image', renderAbovePixels: true, canvasType: typeOf(S.world), updatedAt: new Date().toISOString() } };
          A.downloadBlob(new Blob([JSON.stringify(file)], { type: 'application/octet-stream' }), `${safeName()}.bplace`);
        };
      }

      /* ---------- fermeture ---------- */
      function requestClose() {
        if (!S.dirty) { close(); return; }
        const box = el('div', 'bpe-pop');
        box.innerHTML = '<div class="bpe-pt"></div><div class="bpe-prow"></div>';
        box.querySelector('.bpe-pt').textContent = T('edUnsaved');
        const q = pbtn('neutral', T('edQuit'), '', { cls: 'flex-1' }), s = pbtn('blue', T('edSave'), '', { cls: 'flex-1' });
        box.querySelector('.bpe-prow').append(q, s);
        modal(box);
        q.onclick = () => { closeModal(); close(); };
        s.onclick = async () => { closeModal(); await save(); close(); };
      }
      function close() {
        clearInterval(antsTimer);
        if (live) { const m = A.map(); if (m) m.off('move', liveSync); }
        document.documentElement.classList.remove('bpe-live');
        window.removeEventListener('keydown', onKey, true);
        window.removeEventListener('keyup', onKeyUp, true);
        window.removeEventListener('paste', onPaste, true);
        window.removeEventListener('resize', fitStage);
        window.removeEventListener('resize', onResizeLayout);
        document.documentElement.classList.remove('bpe-open');
        ui.classList.add('out');
        setTimeout(() => ui.remove(), 200);
        ed = null;
      }

      /* ---------- chargement du contenu ---------- */
      function fromCanvas(c, name) {
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height);
        quantize(d, pal);
        const L = newLayer(name); L.data = new Uint8ClampedArray(d.data);
        return L;
      }
      const fromStore = (ls) => ls.map((l) => ({ id: uid(), name: l.name, visible: l.visible, opacity: l.opacity == null ? 1 : l.opacity, mode: l.mode || 'normal', lockA: !!l.lockA, data: new Uint8ClampedArray(l.data) }));
      async function init() {
        if (opts.kind === 'capture') {
          S.w = clamp(opts.canvas.width, 1, MAXS); S.h = clamp(opts.canvas.height, 1, MAXS); S.origin = { ...opts.origin };
          S.layers = [fromCanvas(opts.canvas, T('capture')), newLayer(`${T('edLayer')} 2`)]; S.active = 1;
        } else if (opts.kind === 'local') {
          const e = await lib.get(opts.libId);
          if (!e) { close(); return; }
          S.libId = e.id; S.siteId = e.siteId || null; S.name = e.name; S.world = e.world; S.origin = { x: e.x, y: e.y }; S.w = e.w; S.h = e.h;
          if (e.layers && e.layersW === e.w && e.layersH === e.h) S.layers = fromStore(e.layers);
          else { const im = await blobImg(e.png); const c = makeCanvas(e.w, e.h); c.getContext('2d').drawImage(im, 0, 0); S.layers = [fromCanvas(c, `${T('edLayer')} 1`)]; }
          S.active = S.layers.length - 1;
        } else if (opts.kind === 'site') {
          const t = opts.template;
          const linked = (await lib.all()).find((x) => x.siteId === t.id);
          const sc = await siteToCanvas(t);
          if (!sc) { toast(T('edTooBig'), 'err'); close(); return; }
          S.siteId = t.id; S.name = t.name; S.world = worldOf(t.canvasType); S.origin = { x: sc.x, y: sc.y };
          S.w = clamp(sc.canvas.width, 1, MAXS); S.h = clamp(sc.canvas.height, 1, MAXS);
          if (linked) S.libId = linked.id;
          S.layers = linked && linked.layers && linked.layersW === S.w && linked.layersH === S.h ? fromStore(linked.layers) : [fromCanvas(sc.canvas, `${T('edLayer')} 1`)];
          S.active = S.layers.length - 1;
        } else {
          const m = A.map(), w = A.currentWorld() || 'earth';
          let cx = 0, cy = 0;
          try { const c = A.toGrid(m.getCenter(), w); cx = c.x; cy = c.y; } catch (e) {}
          S.world = w; S.w = 64; S.h = 64; S.origin = { x: cx - 32, y: cy - 32 };
          S.layers = [newLayer(`${T('edLayer')} 1`)]; S.active = 0;
        }
        nameIn.value = S.name;
        resizeComp(); renderLayers(); renderRefs(); renderBrushes(); renderPalette(); renderGradOpts(); renderTextPanel();
        const first = pal.find((p) => !p.locked) || pal[0];
        if (first) setColor(first);
        if (first) { const free = pal.filter((p) => !p.locked && !p.fx); const lum = (p) => p.rgb[0] * 0.3 + p.rgb[1] * 0.59 + p.rgb[2] * 0.11; setColor2(free.slice().sort((a2, b2) => Math.abs(lum(b2) - lum(first)) - Math.abs(lum(a2) - lum(first)))[0] || first); }
        S.tool = 'pencil'; paintTools();
        fitStage(); fitView(); syncHist();
        if (canLive()) {
          if (opts.kind === 'new') { setLive(true, false); startPick(); }
          else setLive(true);
        }
      }
      /* nouveau dessin sur la carte : on choisit d'abord sa zone de travail en traçant un rectangle */
      let picking = false, pickRect = null, pickBar = null;
      function startPick() {
        picking = true; ui.classList.add('picking');
        pickBar = el('div', 'bpe-card bpe-pick');
        pickBar.innerHTML = '<b class="bpe-pick-tx"></b>';
        pickBar.querySelector('b').textContent = T('edPickZone');
        const def = pbtn('white', T('edPickDefault'));
        def.onclick = () => endPick(null);
        pickBar.appendChild(def);
        ui.appendChild(pickBar);
        draw();
      }
      function endPick(r) {
        if (!picking) return;
        picking = false; ui.classList.remove('picking');
        if (pickBar) { pickBar.remove(); pickBar = null; }
        let gx, gy, w, h;
        if (r && r.w >= 2 && r.h >= 2) { gx = S.origin.x + r.x; gy = S.origin.y + r.y; w = clamp(r.w, 1, MAXS); h = clamp(r.h, 1, MAXS); }
        else {
          // clic simple ou zone par défaut : 64 × 64 centré sur le clic ou sur le centre de l'écran
          const a = area();
          const c = r ? { x: S.origin.x + r.x, y: S.origin.y + r.y } : (() => { const p = toPx(a.x + a.w / 2, a.y + a.h / 2); return { x: S.origin.x + p.x, y: S.origin.y + p.y }; })();
          w = 64; h = 64; gx = c.x - 32; gy = c.y - 32;
        }
        S.origin = { x: gx, y: gy }; S.w = w; S.h = h;
        S.layers = [newLayer(`${T('edLayer')} 1`)]; S.active = 0; S.hist = []; S.fut = []; S.sel = null;
        resizeComp(); renderLayers(); syncHist();
        pickRect = null;
        if (live) liveSync(); else fitView();
        A.playSound('drop');
      }
      window.addEventListener('resize', fitStage);
      const onResizeLayout = () => applyAll(null, false);
      window.addEventListener('resize', onResizeLayout);
      let le = false; try { le = localStorage.getItem('bplus.edLayoutEdit') === '1'; } catch (e) {}
      setLayoutEdit(le, true);
      applyAll(null, false);
      requestAnimationFrame(() => { ui.classList.add('in'); init(); });
      // l'animation d'entrée fausse les mesures : on refait la mise en page une fois finie
      setTimeout(() => { if (ui.isConnected) applyAll(null, false); }, 750);
      return { ui, S };
    }

    window.__bplusEditor = { open, lib, activate, stash, addFromFile, addBplus };

    /* ======================================================================
       PANNEAU TEMPLATES : section « Templates locaux » + menu des templates du site
       ====================================================================== */
    let localSec = null, libCache = [];
    async function refreshLib() {
      try { libCache = (await lib.all()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)); } catch (e) { libCache = []; }
      const ctx = A.siteTemplates();
      if (ctx && !ctx.isLoading && !ctx.isSyncing) {
        const ids = new Set(ctx.templates.map((t) => t.id));
        for (const e of libCache) if (e.siteId && !ids.has(e.siteId)) { e.siteId = null; lib.put(e); }
      }
      renderLocal();
    }
    libListeners.add(refreshLib);

    function templatesListPane() {
      const title = A.tr('templates.panel_title');
      for (const d of document.querySelectorAll('div[style*="font-size: 20px"][style*="font-weight: 800"]')) {
        if (title ? d.textContent.trim() !== title : !/templates?/i.test(d.textContent)) continue;
        const root = d.closest('div.flex.flex-col.self-stretch');
        const holder = root && root.parentElement;
        if (holder && holder.closest('[class*="w-1/2"]')) return holder;
      }
      return null;
    }
    function confirmBox(text, ok) {
      return new Promise((res) => {
        const sc = el('div', 'bpc bpe-scrim fixed');
        const box = el('div', 'bpe-pop');
        box.innerHTML = '<div class="bpe-pt"></div><div class="bpe-prow"></div>';
        box.querySelector('.bpe-pt').textContent = text;
        const c = pbtn('neutral', T('edBack'), '', { cls: 'flex-1' }), o = pbtn('red', ok, '', { cls: 'flex-1' });
        box.querySelector('.bpe-prow').append(c, o);
        sc.appendChild(box); document.body.appendChild(sc);
        const done = (v) => { sc.remove(); res(v); };
        c.onclick = () => done(false);
        o.onclick = () => done(true);
        sc.addEventListener('pointerdown', (e) => { if (e.target === sc) done(false); });
      });
    }
    const siteLook = { dots: null, dotsSvg: null, menu: null, css: null };
    try { Object.assign(siteLook, JSON.parse(localStorage.getItem('bplus.siteLook')) || {}); } catch (e) {}
    const keepLook = () => { try { localStorage.setItem('bplus.siteLook', JSON.stringify(siteLook)); } catch (e) {} };
    // relève le style réel de la boîte du menu du site (fond, flou, bord, ombre, arrondi)
    function readMenuCss(box, menu) {
      for (const n of [box, menu]) {
        if (!n) continue;
        const cs = getComputedStyle(n);
        const bf = cs.backdropFilter || cs.webkitBackdropFilter || 'none';
        const bg = cs.backgroundColor;
        if (bf !== 'none' || (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent')) {
          return { background: cs.background, backdropFilter: bf, border: cs.border, boxShadow: cs.boxShadow, borderRadius: cs.borderRadius, padding: cs.padding, outline: cs.outline };
        }
      }
      return null;
    }
    function readSiteLook(pane) {
      const b = pane && [...pane.querySelectorAll('button[aria-haspopup="menu"]')].find((x) => !x.closest('.bpl'));
      if (b && siteLook.dots !== b.className) { siteLook.dots = b.className; siteLook.dotsSvg = b.innerHTML; keepLook(); }
    }
    function rowMenu(entry, anchor) {
      document.querySelectorAll('.bpe-dd.lib').forEach((n) => n.remove());
      const m = el('div', `bpc bpe-dd lib ${siteLook.menu || ''}`);
      if (siteLook.item) {
        const it = siteLook.item;
        for (const [k, v] of [['fs', it.fs], ['fw', it.fw], ['h', it.h], ['p', it.p], ['g', it.g], ['r', it.r], ['c', it.c], ['ff', it.ff], ['ic', it.ic]]) if (v && v !== 'normal' && v !== 'auto') m.style.setProperty(`--bi-${k}`, v);
      }
      if (siteLook.css) { const c = siteLook.css; Object.assign(m.style, { background: c.background, backdropFilter: c.backdropFilter, webkitBackdropFilter: c.backdropFilter, border: c.border, boxShadow: c.boxShadow, borderRadius: c.borderRadius, padding: c.padding, outline: c.outline }); }
      const items = [
        entry.siteId ? null : ['act', I.send, T('edActivate')],
        ['edit', I.pencil, T('edEdit')],
        ['ren', I.rename, T('rename')],
        ['bplus', I.layers, T('edExportBplus')],
        ['bplace', I.box, T('edExportBplace')],
        ['png', I.image, T('edExportPng')],
        ['del', I.trash, T('del')],
      ].filter(Boolean);
      m.innerHTML = items.map(([k, ic]) => `<button data-k="${k}">${ic}<span></span></button>`).join('');
      items.forEach(([k, , t]) => { m.querySelector(`[data-k="${k}"] span`).textContent = t; });
      document.body.appendChild(m);
      const r = anchor.getBoundingClientRect();
      m.style.left = `${Math.min(innerWidth - 230, r.right - 220)}px`;
      m.style.top = `${Math.min(innerHeight - m.offsetHeight - 8, r.bottom + 6)}px`;
      const off = (e) => { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('pointerdown', off, true); } };
      setTimeout(() => document.addEventListener('pointerdown', off, true), 0);
      m.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-k]'); if (!b) return;
        m.remove();
        const k = b.dataset.k;
        if (k === 'act') activate(entry);
        if (k === 'edit') open({ kind: 'local', libId: entry.id });
        if (k === 'del') { if (await confirmBox(T('edDeleteConfirm'), T('del'))) { await lib.del(entry.id); libChanged(); } }
        if (k === 'png') A.downloadBlob(entry.png, `${entry.name}.png`);
        if (k === 'bplus') {
          let layers = entry.layers && entry.layersW === entry.w && entry.layersH === entry.h ? entry.layers : null;
          if (!layers) { const im = await blobImg(entry.png); const c = makeCanvas(entry.w, entry.h); c.getContext('2d').drawImage(im, 0, 0); layers = [{ name: `${T('edLayer')} 1`, visible: true, opacity: 1, data: c.getContext('2d').getImageData(0, 0, entry.w, entry.h).data }]; }
          await downloadBplus({ name: entry.name, world: entry.world, x: entry.x, y: entry.y, w: entry.w, h: entry.h, layers });
        }
        if (k === 'bplace') {
          const url = await blobURL(entry.png);
          const file = { version: 2, exportedAt: new Date().toISOString(), adjustmentsApplyAtRender: true, template: { name: entry.name, imageData: url, opacity: 1, position: { x: entry.x, y: entry.y }, scale: 1, rotation: 0, visible: true, width: entry.w, height: entry.h, displayMode: 'image', renderAbovePixels: true, canvasType: typeOf(entry.world), updatedAt: new Date().toISOString() } };
          A.downloadBlob(new Blob([JSON.stringify(file)], { type: 'application/octet-stream' }), `${entry.name}.bplace`);
        }
        if (k === 'ren') {
          const nm = localSec && localSec.querySelector(`[data-id="${entry.id}"] .bpl-nm`);
          if (!nm) return;
          const inp = el('input', 'bpl-in'); inp.value = entry.name; nm.replaceWith(inp); inp.focus(); inp.select();
          const done = async () => { const v = inp.value.trim(); if (v && v !== entry.name) { entry.name = v; entry.updatedAt = Date.now(); await lib.put(entry); } libChanged(); };
          inp.onblur = done; inp.onkeydown = (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') inp.blur(); if (ev.key === 'Escape') { inp.value = entry.name; inp.blur(); } };
          inp.onclick = (ev) => ev.stopPropagation();
        }
      });
    }
    const thumbURLs = new Map();
    function thumbURL(e) {
      const k = `${e.id}:${e.updatedAt}`;
      if (!thumbURLs.has(k)) thumbURLs.set(k, URL.createObjectURL(e.png));
      return thumbURLs.get(k);
    }
    function renderLocal() {
      if (!localSec) return;
      const list = localSec.querySelector('.bpl-list');
      localSec.querySelector('.bpl-n').textContent = libCache.length;
      list.innerHTML = '';
      if (!libCache.length) { const n = el('div', 'bpl-empty'); n.textContent = T('edEmpty'); list.appendChild(n); return; }
      for (const e of libCache) {
        const row = el('div', 'bpl-row');
        row.dataset.id = e.id;
        row.innerHTML = `<span class="bpl-th"><img alt=""></span><span class="bpl-tx"><span class="bpl-nm"></span><span class="bpl-sub"></span></span>`;
        row.querySelector('img').src = thumbURL(e);
        row.querySelector('.bpl-nm').textContent = e.name;
        const sub = row.querySelector('.bpl-sub');
        sub.textContent = `${e.world === 'moon' ? '🌑' : '🌍'} ${A.fmt(e.w * e.h)} ${T('edPixels')}`;
        if (e.siteId) { const bdg = el('span', 'bpl-badge'); bdg.textContent = T('edActive'); sub.appendChild(bdg); }
        readSiteLook(localSec.parentElement);
        const dots = el('button', siteLook.dots ? `${siteLook.dots} bpl-dots` : 'bpl-dots'); dots.type = 'button';
        dots.innerHTML = siteLook.dotsSvg || I.dots; dots.title = '…';
        dots.onclick = (ev) => { ev.stopPropagation(); rowMenu(e, dots); };
        row.appendChild(dots);
        row.onclick = () => open({ kind: 'local', libId: e.id });
        list.appendChild(row);
      }
    }
    function injectLocal() {
      if (!A.MOD.editor) { if (localSec) { localSec.remove(); localSec = null; } return; }
      const pane = templatesListPane();
      if (!pane) { if (localSec && !localSec.isConnected) localSec = null; return; }
      if (localSec && localSec.parentElement === pane) return;
      if (localSec) localSec.remove();
      localSec = el('div', 'bpc bpl');
      localSec.innerHTML = `<div class="bpl-h"><div class="bpl-t"><span></span><b class="bpl-n">0</b></div><div class="bpl-acts"></div></div><div class="bpl-list"></div><input type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif,application/octet-stream,.bplace,.wplace,.bplus">`;
      localSec.querySelector('.bpl-t span').textContent = T('edLocal');
      const fi = localSec.querySelector('input[type=file]');
      fi.onchange = async () => { const files = [...(fi.files || [])]; fi.value = ''; for (const f of files) await addFromFile(f); };
      const draw = el('button', IB); draw.innerHTML = I.pencil; draw.title = T('edNewDrawing'); draw.onclick = () => open({ kind: 'new' });
      const add = pbtn('blue', T('edAdd'), I.plus, { cls: 'bpl-add' });
      add.onclick = () => fi.click();
      fi.multiple = true;
      localSec.querySelector('.bpl-acts').append(draw, add);
      pane.appendChild(localSec);
      refreshLib();
    }

    // menu « … » d'un template du site : Éditer dans Bplace+ / Ranger en local
    function templateFromNode(node) {
      const k = Object.keys(node).find((x) => x.startsWith('__reactFiber$'));
      let f = k && node[k];
      const ctx = A.siteTemplates();
      for (let i = 0; f && i < 25; i++, f = f.return) {
        if (f.key && ctx) { const t = ctx.templates.find((x) => x.id === f.key); if (t) return t; }
        const p = f.memoizedProps;
        if (p && p.template && p.template.id) return p.template;
      }
      return null;
    }
    function injectSiteMenu() {
      if (!A.MOD.editor) return;
      const menu = document.querySelector('[role="menu"][data-state="open"]');
      if (!menu || menu.querySelector('.bpl-mi')) return;
      const trig = document.querySelector('button[aria-haspopup="menu"][data-state="open"], [aria-expanded="true"][aria-haspopup="menu"]');
      if (!trig) return;
      const pane = templatesListPane();
      const row = trig.closest('div.flex.items-center.cursor-pointer') || trig.parentElement;
      if (!row || !pane || !pane.contains(row)) return;
      const t = templateFromNode(row);
      if (!t) return;
      const model = menu.querySelector('[role="menuitem"]');
      if (!model) return;
      const box = model.parentElement;
      const msvg = model.querySelector('svg');
      const mk = (ic, label, fn) => {
        // copie conforme d'un élément du menu du site : seuls l'icône et le texte changent
        const b = model.cloneNode(true);
        b.classList.add('bpl-mi');
        b.removeAttribute('data-highlighted'); b.removeAttribute('id');
        const tmp = document.createElement('div'); tmp.innerHTML = ic;
        const nsvg = tmp.firstElementChild;
        if (msvg) {
          const old = b.querySelector('svg');
          nsvg.setAttribute('class', msvg.getAttribute('class') || '');
          nsvg.setAttribute('width', msvg.getAttribute('width') || '18'); nsvg.setAttribute('height', msvg.getAttribute('height') || '18');
          old.replaceWith(nsvg);
        }
        const walker = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
        let tn, first = null;
        while ((tn = walker.nextNode())) { if (tn.nodeValue.trim()) { if (!first) first = tn; else tn.nodeValue = ''; } }
        if (first) first.nodeValue = label; else b.append(label);
        b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); fn(); });
        b.addEventListener('pointerdown', (e) => e.stopPropagation());
        return b;
      };
      const a1 = mk(I.pencil, T('edEditBplus'), () => open({ kind: 'site', template: t }));
      const a2 = mk(I.box, T('edStash'), () => stash(t));
      box.insertBefore(a1, model); box.insertBefore(a2, model); box.insertBefore(el('div', 'bpl-msep'), model);
      siteLook.menu = box.className;
      siteLook.css = readMenuCss(box, menu) || siteLook.css;
      {
        const ci = getComputedStyle(model), sv = model.querySelector('svg');
        siteLook.item = { fs: ci.fontSize, fw: ci.fontWeight, h: ci.height, p: ci.padding, g: ci.gap, r: ci.borderRadius, c: ci.color, ff: ci.fontFamily, ic: sv ? `${sv.getBoundingClientRect().width || 16}px` : null };
      }
      keepLook();
    }

    const MAPBTN_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" class="w-[18px] h-[18px]" aria-hidden="true"><g fill="currentColor"><path opacity="0.4" d="M10.9 4.1l3 3-7.7 7.7a2.1 2.1 0 0 1-1 .55l-2.9.7a.75.75 0 0 1-.9-.9l.7-2.9a2.1 2.1 0 0 1 .55-1z"/><path d="M12 3l1.2-1.2a2.1 2.1 0 0 1 3 0l0 0a2.1 2.1 0 0 1 0 3L15 6z"/><path d="M9.75 15.5h6.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1 0-1.5z"/></g></svg>';
    function injectMapButton() {
      const has = document.querySelector('.bpl-mapbtn');
      if (!A.MOD.editor) { if (has) has.remove(); return; }
      if (has && has.isConnected) return;
      const tpl = [...document.querySelectorAll('button[aria-haspopup="dialog"]')].find((b) => b.querySelector('path[d^="M12.6523 8.89881"]'));
      if (!tpl) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'flex items-center justify-center w-[40px] h-[40px] rounded-[99px] transition-[background-color] duration-700 ease-spring hover:bg-black/[0.03] bpl-mapbtn';
      b.title = T('edOpenEditor'); b.setAttribute('aria-label', T('edOpenEditor'));
      b.innerHTML = MAPBTN_ICON;
      b.addEventListener('click', (e) => { e.stopPropagation(); open({ kind: 'new' }); });
      tpl.after(b);
    }

    let pend = false;
    new MutationObserver(() => {
      if (pend) return;
      pend = true;
      requestAnimationFrame(() => { pend = false; injectLocal(); injectSiteMenu(); injectMapButton(); });
    }).observe(document.body, { childList: true, subtree: true });
    injectLocal(); injectMapButton();
    setInterval(() => { injectLocal(); injectMapButton(); }, 1500);

    /* ---------- styles ---------- */
    const css = document.createElement('style');
    css.textContent = `
    html.bpe-open { overflow: hidden; }
    .bpe { position: fixed; inset: 0; z-index: 10050; font-family: Satoshi, system-ui, sans-serif; color: #000; user-select: none;
      background: #F1F1F1 radial-gradient(rgba(0,0,0,.07) 1px, transparent 1.2px) 0 0 / 22px 22px;
      opacity: 0; transition: opacity .2s; }
    .bpe.in { opacity: 1; }
    .bpe.live { background: transparent; }
    @keyframes bpe-in { from { opacity: 0; scale: .92; } to { opacity: 1; scale: 1; } }
    @keyframes bpe-fade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes bpe-dd { from { opacity: 0; scale: .94; translate: 0 -6px; } to { opacity: 1; scale: 1; translate: 0 0; } }
    @keyframes bpe-bounce { 0% { scale: 1; } 45% { scale: 1.2; } 100% { scale: 1; } }
    .bpe.in .bpe-tl, .bpe.in .bpe-bar, .bpe.in .bpe-tr, .bpe.in .bpe-tools, .bpe.in .bpe-panel, .bpe.in .bpe-opts, .bpe.in .bpe-status { animation: bpe-in .45s cubic-bezier(.34,1.35,.64,1) backwards; }
    .bpe.in .bpe-bar { animation-delay: .04s; } .bpe.in .bpe-tools { animation-delay: .07s; } .bpe.in .bpe-tr { animation-delay: .1s; }
    .bpe.in .bpe-panel { animation-delay: .13s; } .bpe.in .bpe-status { animation-delay: .16s; }
    .bpe.out .bpe-tl, .bpe.out .bpe-bar, .bpe.out .bpe-tr, .bpe.out .bpe-tools, .bpe.out .bpe-panel, .bpe.out .bpe-opts { scale: .95; transition: scale .2s ease-in; }
    .bpe-scrim { animation: bpe-fade .2s ease-out both; }
    .bpe-pop { animation: bpe-in .32s cubic-bezier(.34,1.4,.64,1) both; }
    .bpe-dd { animation: bpe-dd .2s cubic-bezier(.2,.9,.3,1.2) both; transform-origin: top right; }
    .bpe-tool, .bpe-bb, .bpe-br, .bpe-ib, .bpe-sw, .bpe-eye, .bpe-zoom button, .bpe-size button { transition: scale .12s ease-out, background-color .15s, color .15s, box-shadow .15s; }
    .bpe-tool:active, .bpe-bb:active:not(:disabled), .bpe-br:active, .bpe-ib:active:not(:disabled), .bpe-eye:active, .bpe-zoom button:active, .bpe-size button:active { scale: .88; }
    .bpe-sw.on { animation: bpe-bounce .35s cubic-bezier(.34,1.4,.64,1); }
    .bpe-lrow { transition: background-color .15s, border-color .15s, scale .12s; }
    .bpe-lrow:active { scale: .98; }
    .bpe-toast.in { transition: opacity .2s, transform .3s cubic-bezier(.34,1.56,.64,1); }
    html.reduce-motion .bpe *, html.reduce-motion .bpe { animation: none !important; transition: none !important; }
    .bpe-drop { position: absolute; inset: 0; z-index: 30; display: flex; align-items: center; justify-content: center; pointer-events: none; opacity: 0; transition: opacity .2s; background: rgb(48 86 255 / .08); }
    .bpe.dropping .bpe-drop { opacity: 1; }
    .bpe-drop-in { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 28px 40px; border-radius: 28px; border: 2px dashed rgb(48 86 255 / .6); background: rgba(255,255,255,.75); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); color: #3056ff; font: 800 18px Satoshi, sans-serif; scale: .9; transition: scale .3s cubic-bezier(.34,1.5,.64,1); }
    .bpe.dropping .bpe-drop-in { scale: 1; }
    .bpe-drop-in svg { width: 40px; height: 40px; }
    .bpe:not(.edit-layout) .bpe-grip { display: none; }
    .bpe.edit-layout .bpe-tl, .bpe.edit-layout .bpe-bar, .bpe.edit-layout .bpe-tools, .bpe.edit-layout .bpe-panel, .bpe.edit-layout .bpe-opts, .bpe.edit-layout .bpe-status { outline: 2px dashed rgb(48 86 255 / .35); outline-offset: 3px; }
    .bpe.edit-layout .bpe-grip { color: #3056ff; }
    .bpe .bpe-status { pointer-events: auto; display: flex; align-items: center; gap: 4px; }
    .bpe .bpe-status .bpe-grip { width: 12px; height: 18px; margin: 0 2px 0 -6px; }
    .bpe-pick { left: 50%; top: 84px; transform: translateX(-50%); z-index: 15; display: flex; align-items: center; gap: 16px; padding: 8px 8px 8px 20px; border-radius: 99px; animation: bpe-in .4s cubic-bezier(.34,1.4,.64,1) both; }
    .bpe-pick-ic { width: 40px; height: 40px; flex: none; border-radius: 12px; background: rgb(48 86 255 / .1); color: #3056ff; display: flex; align-items: center; justify-content: center; }
    .bpe-pick-ic svg { width: 22px; height: 22px; }
    .bpe-pick-tx { font: 700 16px Satoshi, sans-serif; color: #000; white-space: nowrap; }
    .bpe-pick-tx span { font: 600 12px Satoshi, sans-serif; color: rgba(0,0,0,.5); }
    .bpe.picking .bpe-tools > *, .bpe.picking .bpe-opts > *, .bpe.picking .bpe-tr > *, .bpe.picking .bpe-panel > * { opacity: .35; pointer-events: none; transition: opacity .2s; }
    .bpe.picking .bpe-cv { cursor: crosshair; }
    .bpe-help { left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 25; width: min(640px, calc(100vw - 32px)); max-height: calc(100vh - 64px); overflow-y: auto; padding: 20px 24px 24px; background: rgba(255,255,255,.9); -webkit-backdrop-filter: blur(20px) saturate(1.6); backdrop-filter: blur(20px) saturate(1.6); animation: bpe-in .32s cubic-bezier(.34,1.4,.64,1) both; }
    .bpe-help-h { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .bpe-help-h b { font: 800 20px Satoshi, sans-serif; }
    .bpe-help-g { display: grid; grid-template-columns: 1fr 1fr; column-gap: 24px; row-gap: 6px; }
    .bpe-help-r { display: flex; align-items: center; gap: 10px; min-width: 0; font: 600 13px Satoshi, sans-serif; color: rgba(0,0,0,.75); }
    .bpe-help-r kbd { flex: none; min-width: 28px; padding: 3px 8px; border-radius: 8px; background: rgba(0,0,0,.06); box-shadow: inset 0 -1px 0 rgba(0,0,0,.12); font: 700 12px Satoshi, sans-serif; color: #000; text-align: center; white-space: nowrap; }
    .bpe-help-r span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .bpe-refp { right: 340px; top: 88px; width: 290px; padding: 14px; display: flex; flex-direction: column; gap: 10px; z-index: 18; animation: bpe-in .3s cubic-bezier(.34,1.4,.64,1) both; }
    .bpe-refp .hd { display: flex; align-items: center; justify-content: space-between; }
    .bpe-refp .hd b { font: 800 16px Satoshi, sans-serif; }
    .bpe-refp .x { width: 32px; height: 32px; border: 0; border-radius: 10px; background: rgba(0,0,0,.04); display: flex; align-items: center; justify-content: center; cursor: pointer; }
    .bpe-refp .acts { display: flex; flex-wrap: wrap; gap: 6px; }
    .bpe-refp .acts .bpe-pb { height: 36px; padding: 0 14px; font-size: 13px; }
    .bpe-refp .op { display: flex; align-items: center; gap: 8px; font: 700 12px Satoshi, sans-serif; color: rgba(0,0,0,.55); }
    .bpe-refp .op input { -webkit-appearance: none; appearance: none; flex: 1; height: 4px; border-radius: 99px; outline: none; cursor: pointer; background: linear-gradient(to right, #3056ff var(--p, 50%), rgba(0,0,0,.08) var(--p, 50%)); }
    .bpe-refp .op input::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.3); }
    .bpe-refp .op b { width: 36px; text-align: right; }
    .bpe-refp .tg { display: flex; align-items: center; gap: 8px; font: 700 13px Satoshi, sans-serif; cursor: pointer; }
    .bpe-refp .tg input { -webkit-appearance: none; appearance: none; flex: none; position: relative; width: 32px; height: 20px; margin: 0; border-radius: 99px; background: rgba(0,0,0,.12); cursor: pointer; transition: background-color .2s; }
    .bpe-refp .tg input::after { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.25); transition: transform .25s cubic-bezier(.34,1.5,.64,1); }
    .bpe-refp .tg input:checked { background: #3056ff; }
    .bpe-refp .tg input:checked::after { transform: translateX(12px); }
    html.bpe-open .bpc-hud, html.bpe-open .bpc-fab, html.bpe-open .bpc:not(.bpe):not(.bpe-toast):not(.bpe-scrim):not(.bpe-dd):not(.bpl) { display: none !important; }
    .bpe-grip { flex: none; width: 14px; height: 28px; margin: 0 2px; display: flex; align-items: center; justify-content: center; color: rgba(0,0,0,.22); cursor: grab; border-radius: 8px; touch-action: none; transition: color .15s, background-color .15s; }
    .bpe-grip:hover { color: rgba(0,0,0,.5); background: rgba(0,0,0,.04); }
    .bpe-grip svg { width: 8px; height: 14px; pointer-events: none; }
    .vert > .bpe-grip, .bpe-tools:not(.horiz) > .bpe-grip { width: 28px; height: 14px; margin: 0 0 2px; }
    .vert > .bpe-grip svg, .bpe-tools:not(.horiz) > .bpe-grip svg { transform: rotate(90deg); }
    .bpe-ph > .bpe-grip { position: absolute; top: 2px; left: 50%; transform: translateX(-50%); width: 28px; height: 14px; margin: 0; z-index: 2; }
    .bpe-ph > .bpe-grip svg { transform: rotate(90deg); }
    .bpe-tr > .bpe-grip { width: 22px; height: 44px; background: rgba(255,255,255,.9); border-radius: 99px; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    .bpe-tr.vert > .bpe-grip { width: 44px; height: 22px; align-self: center; }
    .bpe .dragging { opacity: .92; box-shadow: 0 24px 48px rgba(0,0,0,.18) !important; transition: none; z-index: 20; }
    .bpe .dragging .bpe-grip { cursor: grabbing; }
    .bpe[data-snap]::after { content: ''; position: fixed; pointer-events: none; z-index: 19; background: rgb(48 86 255 / .10); border: 2px dashed rgb(48 86 255 / .45); border-radius: 20px; transition: all .15s; }
    .bpe[data-snap=""]::after { display: none; }
    .bpe[data-snap="left"]::after { left: 8px; top: 8px; bottom: 8px; width: 72px; }
    .bpe[data-snap="right"]::after { right: 8px; top: 8px; bottom: 8px; width: 72px; }
    .bpe[data-snap="top"]::after { left: 8px; right: 8px; top: 8px; height: 72px; }
    .bpe[data-snap="bottom"]::after { left: 8px; right: 8px; bottom: 8px; height: 72px; }
    .bpe-tools.horiz { flex-direction: row; width: auto; height: 56px; padding: 0 8px; }
    .bpe-tools.horiz .bpe-tsep { width: 1px; height: 24px; margin: 0 4px; }
    .bpe-bar.vert { flex-direction: column; height: auto; width: 56px; padding: 8px 0; border-radius: 28px; }
    .bpe-bar.vert .bpe-bsep { width: 24px; height: 1px; margin: 4px 0; }
    .bpe-bar.vert .bpe-zoom { flex-direction: column; height: auto; width: 44px; margin: 4px 0 0; }
    .bpe-bar.vert .bpe-zoom button { height: 32px; width: 44px; }
    .bpe-bar.vert .bpe-zoom span { min-width: 0; font-size: 11px; }
    .bpe-opts.vert { flex-direction: column; border-radius: 28px; padding: 8px 6px; }
    .bpe-opts.vert .bpe-brushes { flex-direction: column; border-right: 0; border-bottom: 1px solid rgba(0,0,0,.08); padding: 0 0 8px; margin: 0; }
    .bpe-opts.vert .bpe-size { flex-direction: column; }
    .bpe-opts.vert .bpe-size .lb { margin: 0 0 2px; }
    .bpe-opts.vert .bpe-fillopt { flex-direction: column; font-size: 11px; }
    .bpe-tr.vert { flex-direction: column; height: auto; align-items: stretch; }
    .bpe-bar.vert > *, .bpe-tools.vert > *, .bpe-bar.horiz > *, .bpe-tools.horiz > * { flex-shrink: 0; }
    html.bpe-live #root * { visibility: hidden !important; }
    html.bpe-live #root .maplibregl-map, html.bpe-live #root .maplibregl-map .maplibregl-canvas-container, html.bpe-live #root .maplibregl-map .maplibregl-canvas { visibility: visible !important; }
    .bpe.live .bpe-status { background: rgba(255,255,255,.96); }
    .bpe-shim { background-size: 200% 100% !important; animation: bpe-shim 3s linear infinite; image-rendering: pixelated; }
    @keyframes bpe-shim { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    html.reduce-motion .bpe-shim { animation: none; }
    .bpe-fxc { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: inherit; image-rendering: pixelated; pointer-events: none; }
    .bpe-sw.locked .bpe-fxc ~ svg, .bpe-sw svg { position: relative; }
    .bpe-cur .sw { position: relative; overflow: hidden; }
    .bpe-sh-gold { background-image: linear-gradient(110deg, #CA8F22 0%, #CA8F22 10%, #D4A540 25%, #E5C077 40%, #E5C077 60%, #D4A540 75%, #CA8F22 90%, #CA8F22 100%) !important; }
    .bpe-sh-silver { background-image: linear-gradient(110deg, #7F7F7F 0%, #7F7F7F 10%, #9F9F9F 25%, #BFBFBF 40%, #BFBFBF 60%, #9F9F9F 75%, #7F7F7F 90%, #7F7F7F 100%) !important; }
    .bpe-sh-holographic { background-image: linear-gradient(110deg, #CFAEFF 0%, #CFAEFF 8%, #FFC6DF 20%, #FFF3D1 35%, #CCFFED 50%, #B6EAFF 65%, #CFAEFF 80%, #CFAEFF 100%) !important; animation-duration: 4s; }
    .bpe-sh-dark-holographic { background-image: linear-gradient(110deg, #191026 0%, #191026 8%, #67000E 20%, #765800 35%, #006F1F 50%, #002699 65%, #191026 80%, #191026 100%) !important; animation-duration: 4s; }
    .bpe-sh-prism { background-image: linear-gradient(110deg, #FC6A86 0%, #E241C4 12%, #A148F5 25%, #607CFC 37%, #45BED5 50%, #60E797 62%, #A1E066 75%, #E2AC5F 87%, #FC6A86 100%) !important; animation-duration: 4s; }
    .bpe-sh-spectre { background-image: linear-gradient(110deg, #2A0A4E 0%, #2A0A4E 10%, #5A2A9E 25%, #9E3DFF 40%, #E6C7FF 50%, #9E3DFF 60%, #5A2A9E 75%, #2A0A4E 90%, #2A0A4E 100%) !important; }
    .bpe-sh-ocean { background-image: linear-gradient(110deg, #0B2F80 0%, #0B2F80 10%, #2A78D6 25%, #4DC7FF 40%, #E0FAFF 50%, #4DC7FF 60%, #2A78D6 75%, #0B2F80 90%, #0B2F80 100%) !important; }
    .bpe-sh-fire { background-image: linear-gradient(110deg, #8C2A05 0%, #8C2A05 10%, #E63808 25%, #FFA81A 40%, #FFEDA0 50%, #FFA81A 60%, #E63808 75%, #8C2A05 90%, #8C2A05 100%) !important; }
    .bpe.out { opacity: 0; }
    .bpe svg { width: 18px; height: 18px; flex: none; }
    .bpe-cv { position: absolute; inset: 0; display: block; touch-action: none; cursor: crosshair; }
    .bpe[data-tool="pan"] .bpe-cv { cursor: grab; }
    .bpe[data-tool="move"] .bpe-cv { cursor: move; }
    .bpe[data-tool="picker"] .bpe-cv { cursor: copy; }
    .bpe-card { position: absolute; background: rgba(255,255,255,.92); backdrop-filter: blur(12px); border-radius: 24px; box-shadow: 0 16px 32px 0 rgba(0,0,0,.10); outline: 1px solid rgba(0,0,0,.05); }
    .bpe-tl { left: 16px; top: 16px; height: 56px; display: flex; align-items: center; gap: 8px; padding: 0 8px; border-radius: 20px; }
    .bpe-logo svg { width: 28px; height: 28px; border-radius: 8px; }
    .bpe-name { width: 190px; height: 40px; border: 0; border-radius: 12px; padding: 0 10px; font: 700 16px Satoshi, sans-serif; color: #000; background: transparent; outline: none; }
    .bpe-name:hover { background: rgba(0,0,0,.03); }
    .bpe-name:focus { background: rgba(0,0,0,.05); }
    .bpe-ib { border: 0; padding: 0; color: #000; cursor: pointer; transition: background-color .15s; }
    .bpe-ib svg { width: 16px; height: 16px; }
    .bpe-ib:disabled { opacity: .3; cursor: default; }
    .bpe-bar { left: 50%; top: 16px; transform: translateX(-50%); height: 56px; display: flex; align-items: center; gap: 2px; padding: 0 8px; border-radius: 99px; }
    .bpe-bb { width: 40px; height: 40px; border: 0; border-radius: 99px; background: transparent; color: rgba(0,0,0,.75); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background-color .2s; }
    .bpe-bb:hover:not(:disabled) { background: rgba(0,0,0,.05); color: #000; }
    .bpe-bb:disabled { opacity: .3; cursor: default; }
    .bpe-bb.on { background: rgb(48 86 255 / .12); color: #3056ff; }
    .bpe-bsep { width: 1px; height: 24px; margin: 0 4px; background: rgba(0,0,0,.08); }
    .bpe-zoom { display: flex; align-items: center; height: 40px; margin-left: 4px; border-radius: 99px; background: rgba(0,0,0,.04); }
    .bpe-zoom button { width: 34px; height: 40px; border: 0; background: none; font: 800 18px Satoshi, sans-serif; color: rgba(0,0,0,.55); cursor: pointer; }
    .bpe-zoom span { min-width: 52px; text-align: center; font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; }
    .bpe-tr { position: absolute; right: 16px; top: 16px; height: 56px; display: flex; align-items: center; gap: 8px; }
    /* copie des styles du bouton du site (au cas où une classe Tailwind manque) */
    .bpe-pb { position: relative; display: inline-flex; align-items: center; justify-content: center; overflow: hidden; white-space: nowrap; height: 44px; padding: 0 24px; gap: 6px;
      border: 1px solid; border-radius: 9999px; font: 700 14px Satoshi, sans-serif; color: #fff; cursor: pointer; transition: all .15s ease-in-out; }
    .bpe-pb.sq { border-radius: 12px; }
    .bpe-pb:hover { filter: brightness(1.05); }
    .bpe-pb:active { filter: brightness(.95); transform: translateY(1px); }
    .bpe-pb:disabled { opacity: .5; pointer-events: none; }
    .bpe-pb.flex-1 { flex: 1; }
    .bpe-pb.c-blue { background: #3056ff; border-color: #0900e0; box-shadow: 0 2px 4px rgba(0,0,0,.2); }
    .bpe-pb.c-blue:hover { background: #3b72ff; filter: none; }
    .bpe-pb.c-red { background: #ef2d2d; border-color: #b30000; box-shadow: 0 2px 4px rgba(0,0,0,.2); }
    .bpe-pb.c-white { background: #fff; border-color: rgba(0,0,0,.1); color: #000; box-shadow: 0 2px 4px rgba(0,0,0,.08); }
    .bpe-pb.c-white:hover { background: #f7f7f7; filter: none; }
    .bpe-pb.c-neutral { background: rgba(0,0,0,.1); border-color: rgba(0,0,0,.1); color: rgba(0,0,0,.5); backdrop-filter: blur(10px); }
    .bpl-add.bpe-pb { height: 36px; padding: 0 14px; font-size: 13px; }
    .bpe-ib { width: 40px; height: 40px; border-radius: 12px; background: rgba(0,0,0,.03); display: flex; align-items: center; justify-content: center; }
    .bpe-ib:hover:not(:disabled) { background: rgba(0,0,0,.06); }
    .bpe-pb svg { width: 16px; height: 16px; }
    .bpe-pbhl { pointer-events: none; position: absolute; inset: 0; border: 1px solid transparent; border-radius: 9999px;
      -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude;
      background: linear-gradient(180deg, rgba(255,255,255,.7), rgba(255,255,255,0)) border-box; }
    .bpe-pbhl.sq { border-radius: 11px; }
    .bpe-pbt { position: relative; }
    @media (max-width: 1500px) { .bpe-tr .c-white .bpe-pbt { display: none; } .bpe-tr .c-white.bpe-pb { padding: 0 14px; } }
    .bpe-tools { left: 16px; top: 88px; width: 56px; padding: 8px 0; display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .bpe-tool { width: 40px; height: 40px; border: 0; border-radius: 12px; background: transparent; color: rgba(0,0,0,.7); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background-color .15s, color .15s; }
    .bpe-tool:hover { background: rgba(0,0,0,.05); color: #000; }
    .bpe-tool.on { background: rgb(48 86 255 / .12); box-shadow: inset 0 0 0 2px #3056ff; }
    .bpe-tool svg { width: 28px; height: 28px; filter: drop-shadow(0 1px 2px rgba(0,0,0,.14)); transition: transform .25s cubic-bezier(.34,1.56,.64,1); }
    .bpe-tool:hover svg { transform: scale(1.08); }
    .bpe-tool.on svg { transform: scale(1.12) rotate(-6deg); }
    .bpe-phi svg { filter: drop-shadow(0 1px 1px rgba(0,0,0,.15)); }
    .bpe-brushes { display: flex; gap: 2px; padding-right: 8px; margin-right: 2px; border-right: 1px solid rgba(0,0,0,.08); }
    .bpe-brushes[hidden] { display: none; }
    .bpe-br { width: 30px; height: 30px; border: 0; border-radius: 9px; background: transparent; color: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; cursor: pointer; }
    .bpe-br:hover { background: rgba(0,0,0,.05); color: #000; }
    .bpe-br.on { background: #3056ff; color: #fff; box-shadow: 0 2px 4px rgba(0,0,0,.2); }
    .bpe-br svg { width: 14px; height: 14px; }
    .bpe-tsep { width: 24px; height: 1px; margin: 4px 0; background: rgba(0,0,0,.08); }
    .bpe-opts { left: 50%; bottom: 16px; transform: translateX(-50%); padding: 6px 8px; display: flex; align-items: center; gap: 10px; border-radius: 99px; }
    .bpe-opts .bpe-br, .bpe-opts .bpe-size button { border-radius: 99px; }
    .bpe-opts[hidden], .bpe-opts [hidden] { display: none !important; }
    .bpe-bchip { display: flex; align-items: center; gap: 8px; height: 32px; padding: 0 12px 0 6px; margin-right: 2px; border: 0; border-radius: 99px; background: rgba(0,0,0,.04); font: 700 12px Satoshi, sans-serif; color: rgba(0,0,0,.65); cursor: pointer; max-width: 170px; transition: background-color .15s, scale .12s; }
    .bpe-bchip:hover { background: rgba(0,0,0,.08); }
    .bpe-bchip:active { scale: .95; }
    .bpe-bchip[hidden] { display: none; }
    .bpe-bchip canvas { flex: none; width: 40px; height: 16px; image-rendering: pixelated; }
    .bpe-bchip span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bpe-opts.vert .bpe-bchip { flex-direction: column; height: auto; padding: 6px; max-width: 64px; }
    .bpe-opts.vert .bpe-bchip span { display: none; }
    .bpe-bacts { flex: none; display: flex; justify-content: center; gap: 6px; padding: 0 16px 10px; }
    .bpe-bacts .bpe-ib { width: 36px; height: 36px; }
    .bpe-bgrid { flex: none; display: grid; grid-template-columns: repeat(auto-fill, minmax(78px, 1fr)); gap: 6px; padding: 2px 12px 10px; max-height: 236px; overflow-y: auto; align-content: start; }
    .bpe-btile { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 4px 6px; border: 1px solid transparent; border-radius: 14px; background: rgba(0,0,0,.025); cursor: pointer; min-width: 0; transition: background-color .15s, border-color .15s, scale .12s; }
    .bpe-btile:hover { background: rgba(0,0,0,.05); }
    .bpe-btile:active { scale: .96; }
    .bpe-btile.on { background: rgb(48 86 255 / .07); border-color: rgb(48 86 255 / .4); }
    .bpe-btile canvas { width: 100%; max-width: 72px; height: auto; aspect-ratio: 72 / 28; image-rendering: pixelated; }
    .bpe-btile span { max-width: 100%; font: 700 11px Satoshi, sans-serif; color: rgba(0,0,0,.65); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bpe-bset { flex: none; display: flex; flex-direction: column; gap: 10px; padding: 4px 20px 16px; }
    .bpe-bname { min-width: 0; height: 36px; padding: 0 12px; border: 1px solid rgba(0,0,0,.1); border-radius: 12px; background: rgba(0,0,0,.02); font: 700 14px Satoshi, sans-serif; color: #000; outline: none; }
    .bpe-bname:focus { border-color: #3056ff; background: #fff; }
    .bpe-brow { display: flex; flex-direction: column; gap: 6px; }
    .bpe-bgrp { display: flex; flex-direction: column; border-radius: 14px; background: rgba(0,0,0,.025); }
    .bpe-bgh { display: flex; align-items: center; justify-content: space-between; height: 36px; padding: 0 12px; border: 0; background: transparent; font: 700 13px Satoshi, sans-serif; color: rgba(0,0,0,.7); cursor: pointer; border-radius: 14px; }
    .bpe-bgh:hover { background: rgba(0,0,0,.03); }
    .bpe-bgh svg { width: 14px; height: 14px; color: rgba(0,0,0,.4); transition: rotate .25s cubic-bezier(.34,1.4,.64,1); }
    .bpe-bgrp.shut .bpe-bgh svg { rotate: -90deg; }
    .bpe-bgi { display: flex; flex-direction: column; gap: 10px; padding: 2px 12px 12px; }
    .bpe-bgrp.shut .bpe-bgi { display: none; }
    .bpe-ddbtn { display: flex; align-items: center; justify-content: space-between; height: 34px; padding: 0 12px; border: 1px solid rgba(0,0,0,.1); border-radius: 10px; background: #fff; font: 700 13px Satoshi, sans-serif; color: #000; cursor: pointer; }
    .bpe-ddbtn svg { width: 14px; height: 14px; color: rgba(0,0,0,.45); }
    .bpe-ddbtn:hover { background: #f7f7f7; }
    .bpe-blab { font: 700 11px Satoshi, sans-serif; letter-spacing: .02em; text-transform: uppercase; color: rgba(0,0,0,.45); }
    .bpe-brow .bpe-lop { display: flex; align-items: center; gap: 8px; }
    .bpe-seg { display: flex; gap: 4px; padding: 3px; border-radius: 12px; background: rgba(0,0,0,.04); }
    .bpe-seg button { flex: 1; min-width: 0; height: 32px; display: flex; align-items: center; justify-content: center; gap: 6px; border: 0; border-radius: 9px; background: transparent; font: 700 12px Satoshi, sans-serif; color: rgba(0,0,0,.55); cursor: pointer; transition: background-color .15s, color .15s; }
    .bpe-seg button svg { flex: none; width: 13px; height: 13px; }
    .bpe-seg button span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bpe-seg button:hover { color: #000; }
    .bpe-seg button.on { background: #fff; color: #000; box-shadow: 0 1px 3px rgba(0,0,0,.12); }
    .bpe-seg.wrap { flex-wrap: wrap; }
    .bpe-seg.wrap button { flex: 1 0 calc(50% - 4px); }
    .bpe-gopts { display: flex; align-items: center; gap: 8px; }
    .bpe-gopts[hidden] { display: none; }
    .bpe-gopts .bpe-seg button { flex: none; padding: 0 10px; }
    .bpe-ramp { display: flex; height: 22px; border-radius: 7px; overflow: hidden; box-shadow: inset 0 0 0 1px rgba(0,0,0,.1); }
    .bpe-ramp span { width: 14px; height: 100%; }
    .bpe-ramp.edit button { width: 18px; height: 100%; border: 0; padding: 0; cursor: pointer; position: relative; }
    .bpe-ramp.edit button:hover::after { content: '×'; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font: 800 13px Satoshi, sans-serif; color: #fff; background: rgba(0,0,0,.35); }
    .bpe-ramp.edit button.transp { background: repeating-conic-gradient(#d4d4d4 0 25%, #fff 0 50%) 0 0 / 8px 8px; }
    .bpe-ramp.big { height: 26px; border-radius: 8px; }
    .bpe-ramp.big span { width: 18px; }
    .bpe-gtog { flex: none; display: flex; align-items: center; gap: 6px; height: 30px; padding: 0 10px 0 6px; border: 0; border-radius: 99px; background: rgba(0,0,0,.04); font: 700 12px Satoshi, sans-serif; color: rgba(0,0,0,.55); cursor: pointer; white-space: nowrap; }
    .bpe-gtog i { width: 18px; height: 18px; border-radius: 99px; background: repeating-conic-gradient(#d4d4d4 0 25%, #fff 0 50%) 0 0 / 8px 8px; box-shadow: inset 0 0 0 1px rgba(0,0,0,.12); }
    .bpe-gtog:hover { background: rgba(0,0,0,.08); color: #000; }
    .bpe-gtog.on { background: rgb(48 86 255 / .12); color: #3056ff; }
    .bpe-gtog.on i { box-shadow: 0 0 0 2px #3056ff; }
    .bpe-gnote { flex: none; font: 700 11px Satoshi, sans-serif; color: rgba(0,0,0,.4); white-space: nowrap; }
    .bpe-gbtn { flex: none; width: 28px; height: 28px; border: 0; border-radius: 8px; background: rgba(0,0,0,.04); color: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; cursor: pointer; }
    .bpe-gbtn:hover { background: rgba(0,0,0,.08); color: #000; }
    .bpe-gbtn svg { width: 15px; height: 15px; }
    .bpe-ramp span.transp { background: repeating-conic-gradient(#d4d4d4 0 25%, #fff 0 50%) 0 0 / 8px 8px; }
    .bpe-opts.vert .bpe-ramp { flex-direction: column; height: auto; width: 22px; }
    .bpe-opts.vert .bpe-ramp span { width: 100%; height: 12px; }
    .bpe-opts.vert .bpe-gopts { flex-direction: column; }
    .bpe-sws { position: relative; flex: none; width: 40px; height: 36px; }
    .bpe-sws .sw { position: absolute; left: 0; top: 0; z-index: 1; }
    .bpe-cur .sw2 { position: absolute; right: 0; bottom: 0; width: 20px; height: 20px; padding: 0; border-radius: 99px; border: 1px solid rgba(0,0,0,.15); box-shadow: inset 0 0 0 2px #fff, 0 1px 3px rgba(0,0,0,.15); cursor: pointer; z-index: 2; transition: scale .12s; }
    .bpe-cur .sw2:hover { scale: 1.12; }
    .bpe-sw.transp, .bpe-cur .sw.transp, .bpe-cur .sw2.transp { background: repeating-conic-gradient(#d4d4d4 0 25%, #fff 0 50%) 0 0 / 10px 10px !important; }
    .bpe-sw.on2 { box-shadow: 0 0 0 2px #fff, 0 0 0 4px rgba(0,0,0,.35); }
    .bpe-sw.on.on2 { box-shadow: 0 0 0 2px #fff, 0 0 0 4px #3056ff; }
    .bpe-bmask { display: grid; grid-template-columns: repeat(var(--n), 1fr); gap: 1px; padding: 6px; border-radius: 12px; background: rgba(0,0,0,.06); aspect-ratio: 1; touch-action: none; user-select: none; }
    .bpe-bmask span { background: #fff; border-radius: 2px; cursor: crosshair; }
    .bpe-bmask span.mid { box-shadow: inset 0 0 0 1px rgb(48 86 255 / .45); }
    .bpe-bmask span.on { background: #262626; }
    .bpe-bmask span.on.mid { box-shadow: inset 0 0 0 1px #3056ff; }
    .bpe-bpats { display: flex; flex-wrap: wrap; gap: 6px; }
    .bpe-bpats button { width: 32px; height: 32px; padding: 6px; border: 1px solid rgba(0,0,0,.1); border-radius: 10px; background: #fff; cursor: pointer; transition: box-shadow .15s, scale .12s; }
    .bpe-bpats button:active { scale: .9; }
    .bpe-bpats button.on { box-shadow: 0 0 0 2px #fff, 0 0 0 4px #3056ff; }
    .bpe-bpats canvas { width: 100%; height: 100%; image-rendering: pixelated; display: block; }
    .bpe-bpp { justify-content: space-between; font-size: 13px; color: rgba(0,0,0,.7); }
    .bpe-bpp span { order: -1; }
    @keyframes bpe-flash { 0%, 100% { background-color: transparent; } 35% { background-color: rgb(48 86 255 / .14); } }
    .bpe-panel.flash > .bpe-ph { animation: bpe-flash .8s ease-out; }
    .bpe-gacts { flex: none; display: flex; justify-content: center; gap: 6px; padding: 0 16px 10px; }
    .bpe-gacts .bpe-ib { width: 36px; height: 36px; }
    .bpe-glist { flex: none; display: flex; flex-direction: column; gap: 6px; padding: 2px 12px 10px; max-height: 220px; overflow-y: auto; }
    .bpe-gtile { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 1px solid transparent; border-radius: 14px; background: rgba(0,0,0,.025); cursor: pointer; text-align: left; transition: background-color .15s, border-color .15s, scale .12s; }
    .bpe-gtile:hover { background: rgba(0,0,0,.05); }
    .bpe-gtile:active { scale: .98; }
    .bpe-gtile.on { background: rgb(48 86 255 / .07); border-color: rgb(48 86 255 / .4); }
    .bpe-gtile canvas { flex: none; width: 110px; height: 18px; border-radius: 6px; image-rendering: pixelated; box-shadow: inset 0 0 0 1px rgba(0,0,0,.08); }
    .bpe-gtile span { min-width: 0; font: 700 13px Satoshi, sans-serif; color: rgba(0,0,0,.75); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bpe-gset { flex: none; display: flex; flex-direction: column; gap: 12px; padding: 4px 20px 16px; }
    .bpe-gbig { width: 100%; height: 34px; border-radius: 10px; image-rendering: pixelated; box-shadow: inset 0 0 0 1px rgba(0,0,0,.1); }
    .bpe-gsrc { display: flex; align-items: center; gap: 8px; }
    .bpe-garr { font: 800 16px Satoshi, sans-serif; color: rgba(0,0,0,.35); }
    .bpe-ghint { font: 600 12px Satoshi, sans-serif; color: rgba(0,0,0,.45); }
    .bpe-ghint.warn { color: #c2410c; }
    .bpe-gsw { flex: none; width: 28px; height: 28px; padding: 0; border: 1px solid rgba(0,0,0,.12); border-radius: 99px; cursor: pointer; transition: scale .12s; display: flex; align-items: center; justify-content: center; background: #fff; }
    .bpe-gsw:hover { scale: 1.1; }
    .bpe-gsw.lg { width: 34px; height: 34px; box-shadow: inset 0 0 0 2px #fff; }
    .bpe-gsw.transp { background: repeating-conic-gradient(#d4d4d4 0 25%, #fff 0 50%) 0 0 / 10px 10px !important; }
    .bpe-gsw.add { border-style: dashed; color: rgba(0,0,0,.5); }
    .bpe-gsw.add svg { width: 14px; height: 14px; }
    .bpe-gstops { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .bpe-gstop { position: relative; display: flex; }
    .bpe-gx { position: absolute; top: -6px; right: -6px; width: 16px; height: 16px; padding: 0; border: 0; border-radius: 99px; background: #262626; color: #fff; display: none; align-items: center; justify-content: center; cursor: pointer; }
    .bpe-gx svg { width: 9px; height: 9px; }
    .bpe-gstop:hover .bpe-gx { display: flex; }
    .bpe-gacts2 { display: flex; gap: 8px; }
    .bpe-gslot { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .bpe-gslot > span { font: 700 10px Satoshi, sans-serif; color: rgba(0,0,0,.45); white-space: nowrap; }
    .bpe-gslot .bpe-gx.show { display: flex; top: -4px; right: -4px; }
    .bpe-gsw.empty { border-style: dashed; color: rgba(0,0,0,.4); }
    .bpe-gsw.empty svg { width: 14px; height: 14px; }
    .bpe-gsw.fixed { cursor: default; }
    .bpe-gsw.fixed:hover { scale: 1; }
    @keyframes bpe-ask { 0%, 100% { box-shadow: 0 0 0 2px #fff, 0 0 0 4px #3056ff; } 50% { box-shadow: 0 0 0 2px #fff, 0 0 0 7px rgb(48 86 255 / .35); } }
    .bpe-gsw.asking, .bpe-cur .sw.asking, .bpe-cur .sw2.asking { animation: bpe-ask 1s ease-in-out infinite; }
    .bpe-cpop { position: fixed; z-index: 40; width: 300px; max-height: min(420px, calc(100vh - 16px)); overflow-y: auto; padding: 12px; border-radius: 20px; background: rgba(255,255,255,.96); -webkit-backdrop-filter: blur(20px) saturate(1.6); backdrop-filter: blur(20px) saturate(1.6); box-shadow: 0 16px 40px rgba(0,0,0,.18); outline: 1px solid rgba(0,0,0,.06); animation: bpe-in .22s cubic-bezier(.34,1.4,.64,1) both; }
    .bpe-cpoph { margin: 0 2px 10px; font: 700 13px Satoshi, sans-serif; color: rgba(0,0,0,.6); }
    .bpe-cpopg { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; }
    .bpe-cpopg .bpe-sw { width: 28px; height: 28px; }
    .bpe-cpopg .bpe-sw.locked svg { width: 10px; height: 10px; color: #fff; filter: drop-shadow(0 0 1.5px rgba(0,0,0,.7)); }
    .bpe-askbar { display: none !important; align-items: center; justify-content: space-between; gap: 8px; margin: 0 0 10px; padding: 8px 8px 8px 14px; border-radius: 12px; background: #3056ff; color: #fff; font: 700 13px Satoshi, sans-serif; }
    .bpe.askcolor .bpe-askbar { display: flex; }
    .bpe-askbar button { width: 26px; height: 26px; border: 0; border-radius: 8px; background: rgba(255,255,255,.18); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; }
    .bpe-askbar button svg { width: 12px; height: 12px; }
    .bpe.askcolor .bpe-pal .bpe-sw { cursor: copy; }
    .bpe-cur .sw { cursor: pointer; }
    .bpe-swap { position: absolute; right: -6px; top: -6px; z-index: 3; width: 18px; height: 18px; padding: 0; border: 0; border-radius: 99px; background: #fff; color: rgba(0,0,0,.55); box-shadow: 0 1px 3px rgba(0,0,0,.2); display: flex; align-items: center; justify-content: center; cursor: pointer; }
    .bpe-swap:hover { color: #3056ff; }
    .bpe-swap svg { width: 11px; height: 11px; }
    .bpe-cur .sw2.none { background: #fff !important; border-style: dashed; }
    .bpe-gacts2 .bpe-pb { flex: 1; height: 38px; padding: 0 12px; font-size: 13px; }
    .bpe-gcust { flex: none; height: 38px; padding: 0 12px; font-size: 13px; }
    .bpe-gchip canvas { width: 48px; height: 12px; border-radius: 4px; }
    .bpe-topts { display: flex; align-items: center; gap: 8px; }
    .bpe-tlist { flex: none; display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; padding: 2px 12px 10px; max-height: 260px; overflow-y: auto; }
    .bpe-ttile { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 6px 6px; border: 1px solid transparent; border-radius: 14px; background: rgba(0,0,0,.025); cursor: pointer; min-width: 0; transition: background-color .15s, border-color .15s, scale .12s; }
    .bpe-ttile:hover { background: rgba(0,0,0,.05); }
    .bpe-ttile:active { scale: .97; }
    .bpe-ttile.on { background: rgb(48 86 255 / .07); border-color: rgb(48 86 255 / .4); }
    .bpe-ttile canvas { width: 100%; max-width: 120px; height: auto; aspect-ratio: 4 / 1; image-rendering: pixelated; }
    .bpe-ttile span { font: 700 11px Satoshi, sans-serif; color: rgba(0,0,0,.65); }
    .bpe-tset { flex: none; display: flex; flex-direction: column; gap: 12px; padding: 4px 20px 16px; }
    .bpe-thint { padding: 10px 12px; border-radius: 12px; background: rgb(48 86 255 / .07); font: 600 12px Satoshi, sans-serif; color: rgba(0,0,0,.6); }
    .bpe-tchip canvas { width: 48px; height: 16px; }
    .bpe-topts[hidden] { display: none; }
    .bpe-opts.vert .bpe-topts { flex-direction: column; }
    .bpe-tfont { min-width: 120px; height: 32px; }
    .bpe-ttog { flex: none; min-width: 32px; height: 32px; padding: 0 10px; border: 0; border-radius: 99px; background: rgba(0,0,0,.04); font: 800 13px Satoshi, sans-serif; color: rgba(0,0,0,.6); cursor: pointer; }
    .bpe-ttog.it { font-style: italic; font-family: Georgia, serif; }
    .bpe-ttog:hover { background: rgba(0,0,0,.08); color: #000; }
    .bpe-ttog.on { background: #3056ff; color: #fff; }
    .bpe-textcard { position: fixed; z-index: 30; width: 280px; padding: 10px; display: flex; flex-direction: column; gap: 8px; animation: bpe-in .2s cubic-bezier(.34,1.4,.64,1) both; }
    .bpe-textcard textarea { width: 100%; min-height: 52px; resize: vertical; padding: 10px 12px; border: 1px solid rgba(0,0,0,.1); border-radius: 12px; background: #fff; font: 600 15px Satoshi, sans-serif; color: #000; outline: none; box-sizing: border-box; user-select: text; }
    .bpe-textcard textarea:focus { border-color: #3056ff; }
    .bpe-tacts { display: flex; justify-content: flex-end; gap: 8px; }
    .bpe-tacts .bpe-pb { height: 36px; padding: 0 16px; font-size: 13px; }
    .bpe[data-tool="text"] .bpe-cv { cursor: text; }
    .bpe-size { display: flex; align-items: center; gap: 2px; }
    .bpe-size .lb { font-size: 12px; font-weight: 700; color: rgba(0,0,0,.5); margin-right: 4px; }
    .bpe-size button { width: 28px; height: 28px; border: 0; border-radius: 8px; background: rgba(0,0,0,.04); font: 800 16px Satoshi, sans-serif; color: rgba(0,0,0,.6); cursor: pointer; }
    .bpe-size button:hover { background: rgba(0,0,0,.08); }
    .bpe-size b { min-width: 20px; text-align: center; font-size: 13px; font-weight: 800; }
    .bpe-fillopt { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; cursor: pointer; }
    .bpe-fillopt input, .bpe-chk input { -webkit-appearance: none; appearance: none; flex: none; position: relative; width: 32px; height: 20px; margin: 0; border-radius: 99px; background: rgba(0,0,0,.12); cursor: pointer; transition: background-color .2s; }
    .bpe-fillopt input::after, .bpe-chk input::after { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.25); transition: transform .25s cubic-bezier(.34,1.5,.64,1); }
    .bpe-fillopt input:checked, .bpe-chk input:checked { background: #3056ff; }
    .bpe-fillopt input:checked::after, .bpe-chk input:checked::after { transform: translateX(12px); }
    .bpe-panel { position: absolute; right: 16px; top: 88px; width: 300px; max-height: calc(100vh - 104px); display: flex; flex-direction: column; background: #fff; border-radius: 24px; box-shadow: 0 16px 32px 0 rgba(0,0,0,.10); outline: 1px solid rgba(0,0,0,.05); overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; }
    .bpe-ph { flex: none; height: 52px; display: flex; align-items: center; justify-content: center; gap: 8px; color: #525252; font-size: 16px; font-weight: 600;
      background: linear-gradient(180deg, #F5F5F5 0%, rgba(245,245,245,0) 100%); }
    .bpe-ph.sep { border-top: 1px solid rgba(0,0,0,.05); }
    .bpe-ph { position: relative; cursor: pointer; user-select: none; }
    .bpe-fold { position: absolute; right: 18px; top: 50%; margin-top: -8px; display: flex; color: rgba(0,0,0,.3); transition: rotate .25s cubic-bezier(.34,1.4,.64,1), color .15s; }
    .bpe-ph:hover .bpe-fold { color: rgba(0,0,0,.6); }
    .bpe-fold svg { width: 16px; height: 16px; }
    .bpe-panel.folded > .bpe-ph .bpe-fold { rotate: -90deg; }
    .bpe-panel.folded > :not(.bpe-ph):not(.bpe-panel) { display: none !important; }
    .bpe-split { position: relative; flex: none; display: block; height: 10px; margin: -5px 0 -5px; cursor: row-resize; z-index: 2; touch-action: none; }
    .bpe-split::after, .bpe-wknob::after { content: ''; position: absolute; border-radius: 99px; background: #3056ff; opacity: 0; transition: opacity .15s; }
    .bpe-split::after { left: 40%; right: 40%; top: 4px; height: 3px; }
    .bpe-split:hover::after, .bpe-split.on::after, .bpe-wknob:hover::after, .bpe-wknob.on::after { opacity: .6; }
    .bpe-wknob { position: absolute; z-index: 21; width: 10px; cursor: ew-resize; touch-action: none; }
    .bpe-wknob::after { top: 30%; bottom: 30%; left: 3px; width: 4px; }
    .bpe-wknob[hidden] { display: none; }
    .bpe .merged.merged.bpe-panel { position: relative; display: flex; flex-direction: column; align-items: stretch; width: auto; max-height: none; overflow: visible; border-top: 1px solid rgba(0,0,0,.05); }
    .bpe-panel.resizing { transition: none; user-select: none; }
    .bpe-racts { flex: none; display: flex; justify-content: center; gap: 6px; padding: 0 16px 10px; }
    .bpe-racts[hidden] { display: none; }
    .bpe-racts .bpe-ib { width: 36px; height: 36px; }
    .bpe-racts .bpe-ib.on { background: rgb(48 86 255 / .1); color: #3056ff; }
    .bpe-rlist { flex: none; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding: 0 12px 12px; }
    .bpe-rempty { flex: none; width: 100%; }
    .bpe-thi { max-width: 100%; max-height: 100%; object-fit: contain; }
    .bpe-rab.on { color: #3056ff; }
    .bpe .merged.merged { position: static; inset: auto; background: none; backdrop-filter: none; box-shadow: none; outline: none; border-radius: 0; padding: 0; margin: 0; width: auto; height: auto; max-width: none; max-height: none; overflow: visible; transform: none; translate: none; scale: none; animation: none; display: flex; align-items: center; flex: none; }
    .bpe .merged.merged.horiz { flex-direction: row; border-left: 1px solid rgba(0,0,0,.08); padding-left: 6px; margin-left: 4px; }
    .bpe .merged.merged.vert { flex-direction: column; border-top: 1px solid rgba(0,0,0,.08); padding-top: 6px; margin-top: 4px; }
    .bpe .merged.merged[hidden] { display: none; }
    .bpe-tr.host { background: rgba(255,255,255,.92); backdrop-filter: blur(12px); border-radius: 99px; padding: 0 8px; box-shadow: 0 16px 32px 0 rgba(0,0,0,.10); outline: 1px solid rgba(0,0,0,.05); }
    .bpe-tr.host.vert { border-radius: 28px; padding: 8px 0; }
    .bpe .merge-target.merge-target { outline: 2px solid #3056ff; outline-offset: 4px; box-shadow: 0 0 0 8px rgb(48 86 255 / .12), 0 16px 32px rgba(0,0,0,.12); }
    .bpe .merged > .bpe-grip { width: 14px; height: 28px; margin: 0 2px; background: none; box-shadow: none; border-radius: 8px; align-self: center; }
    .bpe .merged.vert > .bpe-grip { width: 28px; height: 14px; margin: 0 0 2px; }
    .bpe-knob { position: absolute; z-index: 21; width: 18px; height: 18px; border-radius: 99px; background: #fff; border: 2px solid #3056ff; box-shadow: 0 2px 6px rgba(0,0,0,.18); cursor: nwse-resize; touch-action: none; transition: scale .15s; }
    .bpe-knob:hover { scale: 1.2; }
    .bpe-knob[hidden] { display: none; }
    .bpe-phi { display: flex; color: #525252; }
    .bpe-phi svg { width: 20px; height: 20px; }
    .bpe-pb2 { padding: 0 20px 16px; }
    .bpe-cur { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; font-size: 14px; font-weight: 700; }
    .bpe-cur .sw { flex: none; width: 32px; height: 32px; border-radius: 99px; border: 1px solid rgba(0,0,0,.1); box-shadow: inset 0 0 0 2px #fff; }
    .bpe-cur .nm { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bpe-chk { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: rgba(0,0,0,.5); cursor: pointer; white-space: nowrap; }
    .bpe-pal { display: flex; flex-direction: column; gap: 10px; max-height: 230px; overflow-y: auto; padding: 4px 2px; }
    .bpe-pkh { display: flex; align-items: center; gap: 4px; margin: 0 0 6px 2px; font: 700 11px Satoshi, sans-serif; letter-spacing: .02em; color: rgba(0,0,0,.45); text-transform: uppercase; }
    .bpe-pkh svg { width: 10px; height: 10px; color: rgba(0,0,0,.35); }
    .bpe-pkg { display: grid; grid-template-columns: repeat(7, 32px); justify-content: space-between; row-gap: 8px; }
    .bpe-sw { position: relative; overflow: hidden; width: 32px; height: 32px; border: 1px solid rgba(0,0,0,.1); border-radius: 99px; cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center; transition: transform .15s; }
    .bpe-sw:hover { transform: scale(1.1); }
    .bpe-sw.on { box-shadow: 0 0 0 2px #fff, 0 0 0 4px #3056ff; }
    .bpe-sw.locked svg { width: 11px; height: 11px; color: #fff; filter: drop-shadow(0 0 1.5px rgba(0,0,0,.7)); }
    .bpe-empty { grid-column: 1 / -1; font-size: 12px; font-weight: 600; color: rgba(0,0,0,.45); }
    .bpe-lacts { flex: none; display: flex; justify-content: center; gap: 6px; padding: 0 16px 10px; }
    .bpe-lacts .bpe-ib { width: 36px; height: 36px; }
    .bpe-llist { flex: none; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding: 0 12px 12px; }
    .bpe-lrow { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 16px; cursor: pointer; border: 1px solid transparent; transition: background-color .15s; }
    .bpe-lrow:hover { background: rgba(0,0,0,.03); }
    .bpe-lrow.on { background: rgb(48 86 255 / .07); border-color: rgb(48 86 255 / .3); }
    .bpe-lrow.hid .bpe-lth, .bpe-lrow.hid .bpe-lmid { opacity: .4; }
    .bpe-eye { flex: none; width: 32px; height: 32px; border: 0; border-radius: 10px; background: transparent; color: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; cursor: pointer; }
    .bpe-eye:hover { background: rgba(0,0,0,.06); }
    .bpe-eye svg { width: 16px; height: 16px; }
    .bpe-lth { width: 44px; height: 44px; flex: none; border-radius: 8px; border: 1px solid rgba(0,0,0,.05);
      background: repeating-conic-gradient(#eee 0 25%, #fff 0 50%) 0 0 / 10px 10px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .bpe-thc { max-width: 100%; max-height: 100%; image-rendering: pixelated; }
    .bpe-lmid { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
    .bpe-lnr { display: flex; align-items: center; gap: 6px; min-width: 0; }
    .bpe-lnr .bpe-lnm { flex: 1; min-width: 0; }
    .bpe-alock { width: 28px; height: 28px; color: rgba(0,0,0,.3); }
    .bpe-alock svg { width: 15px; height: 15px; }
    .bpe-alock.on { color: #3056ff; background: rgb(48 86 255 / .1); }
    .bpe-mode { flex: none; height: 20px; padding: 0 8px; border: 0; border-radius: 99px; background: rgba(0,0,0,.05); font: 700 10px Satoshi, sans-serif; color: rgba(0,0,0,.5); cursor: pointer; white-space: nowrap; transition: background-color .15s; }
    .bpe-mode:hover { background: rgba(0,0,0,.1); color: #000; }
    .bpe-mode.set { background: rgb(48 86 255 / .12); color: #3056ff; }
    .bpe-ddm button { justify-content: space-between; }
    .bpe-ddm button.on { font-weight: 700; }
    .bpe-ddm button i { width: 8px; height: 8px; border-radius: 99px; background: #3056ff; }
    .bpe-lnm { font-size: 14px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bpe-lop { display: flex; align-items: center; gap: 6px; }
    .bpe-lop input { -webkit-appearance: none; appearance: none; flex: 1; min-width: 0; height: 4px; border-radius: 99px; outline: none; cursor: pointer;
      background: linear-gradient(to right, #3056ff var(--p, 100%), rgba(0,0,0,.08) var(--p, 100%)); }
    .bpe-lop input::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.3); }
    .bpe-lop b { width: 34px; text-align: right; font-size: 11px; font-weight: 700; color: rgba(0,0,0,.45); font-variant-numeric: tabular-nums; }
    .bpe-lin { min-width: 0; font: 700 14px Satoshi, sans-serif; border: 0; border-bottom: 1px solid #3056ff; outline: none; background: transparent; }
    /* barres de défilement fines, sans flèches, qui restent dans les coins arrondis */
    .bpe-panel, .bpe-pal, .bpe-llist, .bpe-rlist { scrollbar-width: auto; scrollbar-color: auto; }
    .bpe-panel::-webkit-scrollbar, .bpe-pal::-webkit-scrollbar, .bpe-llist::-webkit-scrollbar, .bpe-rlist::-webkit-scrollbar { width: 10px; height: 10px; background: transparent; }
    .bpe-panel::-webkit-scrollbar-button, .bpe-pal::-webkit-scrollbar-button, .bpe-llist::-webkit-scrollbar-button, .bpe-rlist::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
    .bpe-panel::-webkit-scrollbar-track, .bpe-pal::-webkit-scrollbar-track, .bpe-llist::-webkit-scrollbar-track, .bpe-rlist::-webkit-scrollbar-track { background: transparent; }
    .bpe-panel::-webkit-scrollbar-track { margin: 24px 0; }
    .bpe-panel::-webkit-scrollbar-thumb, .bpe-pal::-webkit-scrollbar-thumb, .bpe-llist::-webkit-scrollbar-thumb, .bpe-rlist::-webkit-scrollbar-thumb { background: rgba(0,0,0,.15); border-radius: 99px; border: 3px solid transparent; background-clip: padding-box; }
    .bpe-panel::-webkit-scrollbar-thumb:hover, .bpe-pal::-webkit-scrollbar-thumb:hover, .bpe-llist::-webkit-scrollbar-thumb:hover, .bpe-rlist::-webkit-scrollbar-thumb:hover { background-color: rgba(0,0,0,.3); }
    .bpe-status { position: absolute; left: 16px; bottom: 16px; padding: 8px 14px; border-radius: 99px; background: rgba(255,255,255,.92); backdrop-filter: blur(12px);
      box-shadow: 0 8px 20px rgba(0,0,0,.08); outline: 1px solid rgba(0,0,0,.05); font-size: 13px; font-weight: 700; color: rgba(0,0,0,.55); font-variant-numeric: tabular-nums; white-space: pre; pointer-events: none; }
    .bpe-scrim { position: absolute; inset: 0; z-index: 5; background: rgba(0,0,0,.25); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; }
    .bpe-scrim.fixed { position: fixed; z-index: 10060; }
    .bpe-pop { width: 400px; max-width: calc(100vw - 32px); background: #fff; border-radius: 24px; padding: 32px; box-shadow: 0 16px 32px rgba(0,0,0,.10); display: flex; flex-direction: column; gap: 20px; font-family: Satoshi, sans-serif; }
    .bpe-pt { font-size: 20px; font-weight: 700; text-align: center; color: #000; }
    .bpe-fields { display: flex; gap: 12px; }
    .bpe-fields label { flex: 1; display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; color: rgba(0,0,0,.5); }
    .bpe-fields input { height: 44px; border: 0; border-radius: 12px; padding: 0 14px; background: rgba(0,0,0,.05); font: 700 16px Satoshi, sans-serif; outline: none; }
    .bpe-fields input:focus { box-shadow: 0 0 0 2px #3056ff; }
    .bpe-prow { display: flex; gap: 12px; }
    .bpe-prow .bpe-pb { padding: 6px 14px; min-width: 0; height: auto; min-height: 44px; white-space: normal; line-height: 1.15; text-align: center; }
    .bpe-prow .bpe-pb .bpe-pbt { white-space: normal; }
    .bpe-menuwrap { position: relative; }
    .bpe-dd { position: absolute; top: calc(100% + 8px); right: 0; z-index: 30; min-width: 230px; padding: 8px; background: rgba(255,255,255,.62); -webkit-backdrop-filter: blur(24px) saturate(1.8); backdrop-filter: blur(24px) saturate(1.8); border: 1px solid rgba(255,255,255,.55); border-radius: 24px; box-shadow: 0 16px 32px rgba(0,0,0,.10); display: flex; flex-direction: column; gap: 2px; }
    .bpe-dd.lib { position: fixed; right: auto; top: auto; width: max-content; min-width: 200px; z-index: 10040; font-family: Satoshi, sans-serif; }
    .bpe-dd button { display: flex; align-items: center; gap: var(--bi-g, 12px); height: var(--bi-h, 44px); padding: var(--bi-p, 0 16px); border: 0; border-radius: var(--bi-r, 14px); background: transparent; font-family: var(--bi-ff, Satoshi, sans-serif); font-size: var(--bi-fs, 15px); font-weight: var(--bi-fw, 500); color: var(--bi-c, #000); cursor: pointer; text-align: left; white-space: nowrap; transition: background-color .15s; }
    .bpe-dd button:hover { background: rgba(0,0,0,.06); }
    .bpe-dd button svg { width: var(--bi-ic, 18px); height: var(--bi-ic, 18px); color: currentColor; stroke-width: 1.6; flex: none; }
    .bpe-dd button[data-k="del"], .bpe-dd button[data-k="del"] svg { color: #ef2d2d; }
    .bpe-toast { position: fixed; left: 50%; bottom: 96px; z-index: 10070; transform: translate(-50%, 12px); opacity: 0; padding: 12px 18px; border-radius: 16px; background: #fff; color: #000;
      font: 700 14px Satoshi, sans-serif; box-shadow: 0 16px 32px rgba(0,0,0,.12); outline: 1px solid rgba(0,0,0,.05); transition: opacity .2s, transform .25s cubic-bezier(.34,1.56,.64,1); pointer-events: none; }
    .bpe-toast.in { opacity: 1; transform: translate(-50%, 0); }
    .bpe-toast.ok { color: #15803D; }
    .bpe-toast.err { color: #ef2d2d; }
    .bpl { border-top: 1px solid rgba(0,0,0,.05); }
    .bpl-h { display: flex; align-items: center; justify-content: space-between; padding: 20px 20px 16px; }
    .bpl-t { display: flex; align-items: baseline; gap: 8px; min-width: 0; flex: 1; }
    .bpl-t span { font: 800 20px Satoshi, sans-serif; color: #000; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
    .bpl-h { gap: 12px; }
    .bpl-n { flex: none; }
    .bpl-acts { flex: none; }
    .bpl-n { font: 600 13px Satoshi, sans-serif; color: rgba(0,0,0,.4); }
    .bpl-acts { display: flex; align-items: center; gap: 8px; }
    .bpl-list { display: flex; flex-direction: column; gap: 8px; padding: 0 8px 8px; }
    .bpl-row { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 12px; cursor: pointer; transition: background-color .15s; }
    .bpl-row:hover { background: rgba(0,0,0,.03); }
    .bpl-th { flex: none; width: 56px; height: 56px; border-radius: 8px; border: 1px solid rgba(0,0,0,.05); background: rgba(0,0,0,.03); overflow: hidden; display: flex; align-items: center; justify-content: center; }
    .bpl-th img { max-width: 100%; max-height: 100%; image-rendering: pixelated; }
    .bpl-tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .bpl-nm { font: 700 14px Satoshi, sans-serif; color: #000; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bpl-sub { display: flex; align-items: center; gap: 6px; font: 600 12px Satoshi, sans-serif; color: rgba(0,0,0,.5); }
    .bpl-badge { padding: 1px 8px; border-radius: 99px; background: rgb(48 86 255 / .1); color: #3056ff; font-size: 11px; font-weight: 800; }
    .bpl-in { font: 700 14px Satoshi, sans-serif; border: 0; border-bottom: 1px solid #3056ff; outline: none; background: transparent; min-width: 0; }
    .bpl-empty { padding: 0 12px 12px; font: 600 13px Satoshi, sans-serif; color: rgba(0,0,0,.45); line-height: 1.4; }
    .bpl-dots { flex: none; }
    .bpl-dots:not([class*="rounded"]) { width: 40px; height: 40px; border: 0; border-radius: 9999px; background: rgba(0,0,0,.05); color: #000; display: flex; align-items: center; justify-content: center; cursor: pointer; }
    .bpl-dots:not([class*="rounded"]):hover { background: rgba(0,0,0,.08); }
    .bpl-dots svg { width: 18px; height: 18px; }
    .bpl-mic { display: flex; color: rgba(0,0,0,.5); }
    .bpl-mic svg { width: 16px; height: 16px; }
    .bpl-mapbtn { border: 0; background: transparent; color: #161616; cursor: pointer; }
    .bpl-mapbtn:hover { background: rgba(0,0,0,.03); }
    .bpl-msep { height: 1px; margin: 4px 8px; background: rgba(0,0,0,.06); }
    `;
    document.head.appendChild(css);
  }
})();
