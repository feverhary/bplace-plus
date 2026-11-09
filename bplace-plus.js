// ==UserScript==
// @name         Bplace+
// @namespace    https://bplace.art/
// @version      3.1.0
// @description  Capture de zone, palettes .kpl et suivi de quête pour bplace.art
// @match        https://bplace.art/*
// @run-at       document-start
// @inject-into  page
// @grant        none
// ==/UserScript==

(function () {
  'use strict';
  if (window.__bpcLoaded) return;
  window.__bpcLoaded = true;

  
  const DATA = { colors: null, palette_prices: null, user_palette_unlocks: null, daily_quests: null, user_quest_progress: null, locales: {} };
  const dataListeners = new Set();
  const _fetch = window.fetch;
  window.fetch = function (input, init) {
    const p = _fetch.apply(this, arguments);
    try {
      const url = typeof input === 'string' ? input : (input && input.url) || String(input);
      const method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      const m = /\/rest\/v1\/(colors|palette_prices|user_palette_unlocks|daily_quests|user_quest_progress)\?/.exec(url);
      const loc = /\/locales\/([A-Za-z-]+)\/global\.json/.exec(url);
      if (loc && method === 'GET') {
        p.then((r) => {
          if (!r.ok) return;
          r.clone().json().then((j) => {
            if (!j || typeof j !== 'object') return;
            DATA.locales[loc[1]] = j;
            dataListeners.forEach((f) => f());
          }).catch(() => {});
        }).catch(() => {});
      }
      if (m && method === 'GET') {
        p.then((r) => {
          if (!r.ok) return;
          r.clone().json().then((j) => {
            if (!Array.isArray(j)) return;
            if (m[1] === 'colors' && (!/[?&]select=(\*|%2A)(&|$)/i.test(url) || /[?&](palette|hex_value|id)=/.test(url))) return;
            DATA[m[1]] = j;
            dataListeners.forEach((f) => f());
          }).catch(() => {});
        }).catch(() => {});
      }
    } catch (e) {}
    return p;
  };

  
  const BASE = 'https://tiles-worldmap.bplace.art';
  const TILE = 512;
  const R = 6378137;
  const HALF = 20037508.34;
  const WORLDS = {
    earth: { grid: 1335834, size: 30, prefix: '' },
    moon: { grid: 27136, size: (2 * HALF) / 27136, prefix: '/moon' },
  };
  const MAX_SIDE = 4096;
  const MAX_TILES = 100;

  const map = () => window.mapInstance || null;

  function currentWorld() {
    const seg = location.pathname.split('/')[1] || '';
    if (seg === 'moon') return 'moon';
    if (seg === 'guildwar') return null;
    return 'earth';
  }

  function toGrid(ll, w) {
    const W = WORLDS[w];
    const lat = Math.max(-85.051129, Math.min(85.051129, ll.lat));
    const mx = (ll.lng * Math.PI / 180) * R;
    const my = R * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
    return {
      x: Math.max(0, Math.min(W.grid - 1, Math.floor((mx + HALF) / W.size))),
      y: Math.max(0, Math.min(W.grid - 1, Math.floor((HALF - my) / W.size))),
    };
  }

  function fromGrid(x, y, w) {
    const W = WORLDS[w];
    const mx = x * W.size - HALF, my = HALF - y * W.size;
    return { lng: (mx / R) * 180 / Math.PI, lat: (2 * Math.atan(Math.exp(my / R)) - Math.PI / 2) * 180 / Math.PI };
  }

  
  async function fetchRegion(x0, y0, w, h, world) {
    const W = WORLDS[world];
    if (w < 1 || h < 1) throw new Error(T('zoneEmpty'));
    if (w > MAX_SIDE || h > MAX_SIDE) throw new Error(`Max ${MAX_SIDE} px`);
    if (x0 < 0 || y0 < 0 || x0 + w > W.grid || y0 + h > W.grid) throw new Error(T('outside'));
    const tx0 = Math.floor(x0 / TILE), ty0 = Math.floor(y0 / TILE);
    const tx1 = Math.floor((x0 + w - 1) / TILE), ty1 = Math.floor((y0 + h - 1) / TILE);
    if ((tx1 - tx0 + 1) * (ty1 - ty0 + 1) > MAX_TILES) throw new Error(T('tooBig'));

    let manifest = null;
    try {
      const bbox = encodeURIComponent(`${tx0},${ty0},${tx1},${ty1}`);
      const r = await fetch(`${BASE}${W.prefix}/v2/manifest?bbox=${bbox}`, { cache: 'no-store' });
      if (r.ok) manifest = await r.json();
    } catch (e) {}
    const info = new Map();
    if (Array.isArray(manifest)) for (const t of manifest) info.set(`${t.tile_x}_${t.tile_y}`, t);

    const out = document.createElement('canvas');
    out.width = w; out.height = h;
    const ctx = out.getContext('2d');
    let dirty = 0, failed = 0;
    const jobs = [];
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const key = `${tx}_${ty}`;
        const t = info.get(key);
        if (manifest && (!t || !t.last_rendered_at)) continue;
        if (t && t.is_dirty) dirty++;
        const v = t ? `?v=${t.last_rendered_at}` : "";
        jobs.push(async () => {
          try {
            const r = await fetch(`${BASE}${W.prefix}/${key}.png${v}`);
            if (r.status === 404) return;
            if (!r.ok) throw new Error(r.status);
            const bm = await createImageBitmap(await r.blob());
            ctx.drawImage(bm, tx * TILE - x0, ty * TILE - y0);
            bm.close && bm.close();
          } catch (e) { failed++; }
        });
      }
    }
    const queue = jobs.slice();
    await Promise.all(Array.from({ length: Math.min(6, queue.length) }, async () => {
      while (queue.length) await queue.shift()();
    }));
    return { canvas: out, dirty, failed };
  }

  function stats(canvas) {
    const d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let painted = 0;
    const cols = new Set();
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      painted++;
      cols.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
    }
    return { painted, colors: cols.size };
  }

  
  const isHex = (h) => typeof h === 'string' && /^#[0-9a-f]{6}$/i.test(h);

  function baseColors() {
    if (!DATA.colors) return null;
    return DATA.colors
      .filter((c) => c.is_active === true && isHex(c.hex_value) && c.palette !== 'tools')
      .sort((a, b) => (a.palette_order ?? 1e9) - (b.palette_order ?? 1e9) || String(a.palette).localeCompare(String(b.palette)) || (a.shade ?? 0) - (b.shade ?? 0));
  }

  function paletteSet(kind) {
    const cols = baseColors();
    if (!cols) return null;
    if (kind === 'all') return cols;
    if (kind === 'free') {
      if (!DATA.palette_prices) return null;
      const priced = new Set(DATA.palette_prices.filter((p) => (p.chroma_cost ?? 0) > 0).map((p) => p.palette_name));
      return cols.filter((c) => c.palette === 'neutral' || !priced.has(c.palette));
    }
    if (kind === 'unlocked') {
      const free = paletteSet('free');
      if (!free) return null;
      const owned = new Set((DATA.user_palette_unlocks || []).map((u) => u.palette));
      const keep = new Set(free.map((c) => c.hex_value));
      return cols.filter((c) => keep.has(c.hex_value) || owned.has(c.palette) || (c.unlockKey && owned.has(c.unlockKey)));
    }
    return null;
  }

  const xmlEsc = (s) => String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));

  function colorsetXml(cols, name) {
    const groups = [];
    const idx = new Map();
    for (const c of cols) {
      if (!idx.has(c.palette)) { idx.set(c.palette, groups.length); groups.push([]); }
      groups[idx.get(c.palette)].push(c);
    }
    const columns = Math.max(1, ...groups.map((g) => g.length));
    let id = 0;
    const entries = [];
    groups.forEach((g, row) => g.forEach((c, col) => {
      const hex = c.hex_value.toUpperCase();
      const r = parseInt(hex.slice(1, 3), 16), gr = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
      const label = `${c.name || c.palette + ' ' + (c.shade ?? col + 1)} ${hex}`;
      entries.push(
        ` <ColorSetEntry id="${id++}" bitdepth="U8" spot="false" name="${xmlEsc(label)}">\n` +
        `  <RGB space="sRGB" b="${b / 255}" g="${gr / 255}" r="${r / 255}"/>\n` +
        `  <Position row="${row}" column="${col}"/>\n` +
        ` </ColorSetEntry>`);
    }));
    return `<ColorSet rows="${groups.length}" version="2.0" columns="${columns}" comment="" name="${xmlEsc(name)}">\n${entries.join('\n')}\n</ColorSet>\n`;
  }

  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function zipStored(files) {
    const enc = new TextEncoder();
    const d = new Date();
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    const parts = [], central = [];
    let offset = 0;
    for (const f of files) {
      const name = enc.encode(f.name), data = enc.encode(f.data), crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 10, true); lh.setUint16(6, 0, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, time, true); lh.setUint16(12, date, true); lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(lh.buffer, name, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 10, true); ch.setUint16(8, 0, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, time, true); ch.setUint16(14, date, true); ch.setUint32(16, crc, true);
      ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true);
      ch.setUint16(30, 0, true); ch.setUint16(32, 0, true); ch.setUint16(34, 0, true); ch.setUint16(36, 0, true);
      ch.setUint32(38, 0, true); ch.setUint32(42, offset, true);
      central.push(ch.buffer, name);
      offset += 30 + name.length + data.length;
    }
    const cdSize = central.reduce((n, b) => n + b.byteLength, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, end.buffer], { type: 'application/x-krita-palette' });
  }

  function makeKpl(cols, name) {
    return zipStored([
      { name: 'mimetype', data: 'application/x-krita-palette' },
      { name: 'colorset.xml', data: colorsetXml(cols, name) },
      { name: 'profiles.xml', data: '<Profiles/>\n' },
    ]);
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  


  const I18N = {
    fr: { close: 'Fermer', capture: 'Capture', captureBtn: 'Capturer', palette: 'Palette .kpl', free: 'Gratuites', unlocked: 'Débloquées', all: 'Toutes', paletteMissing: 'Palette non chargée', loading: 'Chargement…', width: 'Largeur', height: 'Hauteur', copy: 'Copier', download: 'Télécharger PNG', newSel: 'Nouvelle', refresh: 'Actualiser', colors: 'coul.', tilesFailed: '{n} tuile(s) non chargée(s)', tileUpdating: 'Tuile en cours de mise à jour', saved: 'Enregistré', copied: 'Copié', copyFailed: 'Copie impossible', mapMissing: 'Carte non chargée', worldUnsupported: 'Monde non pris en charge', zoneEmpty: 'Zone vide', outside: 'Hors carte', tooBig: 'Zone trop grande', select: 'Sélection', esc: 'Échap', earth: 'Terre', moon: 'Lune', pin: 'Épingler', unpin: 'Désépingler', dailyQuest: 'Quête du jour', goals: 'Objectifs', shortcut: 'Alt+Maj+S', kplFree: 'couleurs_de_base', kplUnlocked: 'mes_couleurs', kplAll: 'toutes_les_couleurs', modules: 'Modules', modulesDesc: 'Activer ou désactiver les outils', whatsNew: 'Nouveautés', whatsNewDesc: "Journal des mises à jour de l'extension", allUpdates: 'Toutes les mises à jour', modCaptureDesc: 'Capture de zone au pixel près', modPalettesDesc: 'Export des couleurs pour Krita', modGoalsDesc: "Épingler quêtes et succès à l'écran", version: 'Version', back: 'Retour', newBadge: 'Nouveau', favorites: 'Favoris', addFav: 'Ajouter la position actuelle', favEmpty: 'Aucun favori pour le moment', favHint: 'Clique sur un pixel puis sur l\u2019étoile pour l\u2019ajouter', favAdd: 'Ajouter aux favoris', favRemove: 'Retirer des favoris', favName: 'Favori', rename: 'Renommer', del: 'Supprimer', goTo: 'Y aller', modCounts: 'Compteurs de template', modCountsDesc: 'Pixels restants sur chaque couleur', modFavsDesc: 'Lieux favoris dans les épingles et sur la carte', palBase: 'Couleurs de base', palMine: 'Mes couleurs', palAll: 'Toutes les couleurs', sounds: 'Sons', sndMaster: 'Sons de Bplace+', sndMasterDesc: 'Active les sons de l\'extension', sndVolume: 'Volume', sndCapture: 'Capture', sndCaptureDesc: 'Quand une zone est capturée', sndGoal: 'Objectif terminé', sndGoalDesc: 'Quand un objectif épinglé est fini', sndFav: 'Favoris', sndFavDesc: 'Ajout et retrait d\'un favori', sndPalette: 'Palette', sndPaletteDesc: 'Quand une palette .kpl est téléchargée', sndFriend: 'Demande d\'ami', sndFriendDesc: 'Quand une demande d\'ami est envoyée', sndSite: 'Sons de Bplace', sndSiteDesc: 'Faits par le développeur de Bplace, bientôt disponibles', sndPixel: 'Pose de pixel', sndNotif: 'Notifications', sndLevel: 'Montée de niveau', sndMusic: 'Musique d\'ambiance', preview: 'Écouter', addFriend: 'Ajouter en ami', friendSent: 'Demande envoyée', acceptFriend: 'Accepter la demande', friendTag: 'Ami', friendErr: 'Impossible d\'envoyer la demande', modFriends: 'Amis dans la guilde', modFriendsDesc: 'Bouton d\'ajout en ami dans la liste des membres', sndDrag: 'Déplacement des objectifs', sndDragDesc: 'Quand tu prends et lâches la liste des objectifs', sndClick: 'Clics', sndClickDesc: 'Sur tous les boutons de Bplace et de Bplace+, en attendant les sons officiels', sndUiClick: 'Clics dans Bplace+', sndUiClickDesc: 'Sur les boutons de l\'extension', sndGame: 'Sons du jeu', sndGameDesc: 'Sons ajoutés au jeu par Bplace+ en attendant les sons officiels de Bplace', sndSource: 'Source des sons', sndSourceDesc: 'Bplace+ maintenant, Bplace quand les sons officiels arriveront', sndGameClick: 'Clics des boutons', sndGameClickDesc: 'Sur tous les boutons du jeu', sndPixelSel: 'Sélection d\'un pixel', sndPixelSelDesc: 'Quand tu cliques sur un pixel de la carte', sndPaint: 'Pose de pixel', sndPaintDesc: 'Quand tu poses un pixel en mode Peindre', sndPaintMode: 'Mode Peindre', sndPaintModeDesc: 'Quand tu entres ou sors du mode Peindre', modGameSoundsDesc: 'Sons sur les boutons, les pixels et la peinture du jeu', discordServer: 'Serveur Discord', discordServerDesc: 'Rejoins la communauté à l\'origine de Bplace+', contactDiscord: 'Contact Discord : cliquer pour copier le pseudo', nickCopied: 'Pseudo copié', authorNote: 'Yooo, si vous avez un bug ou une idée de fonctionnalité pour Bplace+, n\'hésitez pas à me contacter en espérant que ces idées puissent inspirer Obeyeur au passage :3', collapse: 'Replier', expand: 'Déplier' },
    en: { close: 'Close', capture: 'Capture', captureBtn: 'Capture', palette: '.kpl palette', free: 'Free', unlocked: 'Unlocked', all: 'All', paletteMissing: 'Palette not loaded', loading: 'Loading…', width: 'Width', height: 'Height', copy: 'Copy', download: 'Download PNG', newSel: 'New', refresh: 'Refresh', colors: 'colors', tilesFailed: '{n} tile(s) not loaded', tileUpdating: 'Tile is updating', saved: 'Saved', copied: 'Copied', copyFailed: 'Copy failed', mapMissing: 'Map not loaded', worldUnsupported: 'World not supported', zoneEmpty: 'Empty area', outside: 'Outside the map', tooBig: 'Area too large', select: 'Select', esc: 'Esc', earth: 'Earth', moon: 'Moon', pin: 'Pin', unpin: 'Unpin', dailyQuest: 'Daily quest', goals: 'Goals', shortcut: 'Alt+Shift+S', kplFree: 'base_colors', kplUnlocked: 'my_colors', kplAll: 'all_colors', modules: 'Modules', modulesDesc: 'Turn tools on or off', whatsNew: "What's new", whatsNewDesc: 'Extension update log', allUpdates: 'All updates', modCaptureDesc: 'Pixel-perfect area capture', modPalettesDesc: 'Color export for Krita', modGoalsDesc: 'Pin quests and achievements on screen', version: 'Version', back: 'Back', newBadge: 'New', favorites: 'Favorites', addFav: 'Add current location', favEmpty: 'No favorites yet', favHint: 'Click a pixel, then the star to add it', favAdd: 'Add to favorites', favRemove: 'Remove from favorites', favName: 'Favorite', rename: 'Rename', del: 'Delete', goTo: 'Go there', modCounts: 'Template counters', modCountsDesc: 'Remaining pixels on each color', modFavsDesc: 'Favorite places in pins and on the map', palBase: 'Base colors', palMine: 'My colors', palAll: 'All colors', sounds: 'Sounds', sndMaster: 'Bplace+ sounds', sndMasterDesc: 'Turn on the extension\'s sounds', sndVolume: 'Volume', sndCapture: 'Capture', sndCaptureDesc: 'When a zone is captured', sndGoal: 'Goal completed', sndGoalDesc: 'When a pinned goal is done', sndFav: 'Favorites', sndFavDesc: 'Adding and removing a favorite', sndPalette: 'Palette', sndPaletteDesc: 'When a .kpl palette is downloaded', sndFriend: 'Friend request', sndFriendDesc: 'When a friend request is sent', sndSite: 'Bplace sounds', sndSiteDesc: 'Made by the Bplace developer, coming soon', sndPixel: 'Pixel placed', sndNotif: 'Notifications', sndLevel: 'Level up', sndMusic: 'Ambient music', preview: 'Play', addFriend: 'Add friend', friendSent: 'Request sent', acceptFriend: 'Accept request', friendTag: 'Friend', friendErr: 'Couldn\'t send the request', modFriends: 'Friends in guilds', modFriendsDesc: 'Add-friend button in the member list', sndDrag: 'Moving goals', sndDragDesc: 'When you pick up and drop the goals list', sndClick: 'Clicks', sndClickDesc: 'On every Bplace and Bplace+ button, until the official sounds arrive', sndUiClick: 'Bplace+ clicks', sndUiClickDesc: 'On the extension\'s buttons', sndGame: 'Game sounds', sndGameDesc: 'Sounds added to the game by Bplace+ until Bplace\'s official sounds arrive', sndSource: 'Sound source', sndSourceDesc: 'Bplace+ for now, Bplace when the official sounds arrive', sndGameClick: 'Button clicks', sndGameClickDesc: 'On every game button', sndPixelSel: 'Pixel selection', sndPixelSelDesc: 'When you click a pixel on the map', sndPaint: 'Pixel placing', sndPaintDesc: 'When you place a pixel in paint mode', sndPaintMode: 'Paint mode', sndPaintModeDesc: 'When you enter or leave paint mode', modGameSoundsDesc: 'Sounds on the game\'s buttons, pixels and painting', discordServer: 'Discord server', discordServerDesc: 'Join the community behind Bplace+', contactDiscord: 'Discord contact: click to copy the username', nickCopied: 'Username copied', authorNote: 'Yooo, if you find a bug or have a feature idea for Bplace+, feel free to contact me hoping these ideas might inspire Obeyeur along the way :3', collapse: 'Collapse', expand: 'Expand' },
    es: { close: 'Cerrar', capture: 'Captura', captureBtn: 'Capturar', palette: 'Paleta .kpl', free: 'Gratis', unlocked: 'Desbloqueados', all: 'Todos', paletteMissing: 'Paleta no cargada', loading: 'Cargando…', width: 'Ancho', height: 'Alto', copy: 'Copiar', download: 'Descargar PNG', newSel: 'Nueva', refresh: 'Actualizar', colors: 'col.', tilesFailed: '{n} casilla(s) sin cargar', tileUpdating: 'Casilla actualizándose', saved: 'Guardado', copied: 'Copiado', copyFailed: 'No se pudo copiar', mapMissing: 'Mapa no cargado', worldUnsupported: 'Mundo no compatible', zoneEmpty: 'Zona vacía', outside: 'Fuera del mapa', tooBig: 'Zona demasiado grande', select: 'Selección', esc: 'Esc', earth: 'Tierra', moon: 'Luna', pin: 'Fijar', unpin: 'Desfijar', dailyQuest: 'Misión diaria', goals: 'Objetivos', shortcut: 'Alt+Mayús+S', kplFree: 'gratis', kplUnlocked: 'desbloqueados', kplAll: 'todos', modules: 'Módulos', modulesDesc: 'Activar o desactivar herramientas', whatsNew: 'Novedades', whatsNewDesc: 'Registro de actualizaciones de la extensión', allUpdates: 'Todas las actualizaciones', modCaptureDesc: 'Captura de zona al píxel', modPalettesDesc: 'Exportar colores para Krita', modGoalsDesc: 'Fijar misiones y logros en pantalla', version: 'Versión', back: 'Atrás', newBadge: 'Nuevo', favorites: 'Favoritos', addFav: 'Añadir la ubicación actual', favEmpty: 'Aún no hay favoritos', favHint: 'Haz clic en un píxel y luego en la estrella para añadirlo', favAdd: 'Añadir a favoritos', favRemove: 'Quitar de favoritos', favName: 'Favorito', rename: 'Renombrar', del: 'Eliminar', goTo: 'Ir allí', modCounts: 'Contadores de plantilla', modCountsDesc: 'Píxeles restantes en cada color', modFavsDesc: 'Lugares favoritos en los pines y en el mapa', palBase: 'Colores base', palMine: 'Mis colores', palAll: 'Todos los colores', sounds: 'Sonidos', sndMaster: 'Sonidos de Bplace+', sndMasterDesc: 'Activa los sonidos de la extensión', sndVolume: 'Volumen', sndCapture: 'Captura', sndCaptureDesc: 'Al capturar una zona', sndGoal: 'Objetivo completado', sndGoalDesc: 'Cuando termina un objetivo fijado', sndFav: 'Favoritos', sndFavDesc: 'Añadir y quitar un favorito', sndPalette: 'Paleta', sndPaletteDesc: 'Al descargar una paleta .kpl', sndFriend: 'Solicitud de amistad', sndFriendDesc: 'Al enviar una solicitud de amistad', sndSite: 'Sonidos de Bplace', sndSiteDesc: 'Hechos por el desarrollador de Bplace, próximamente', sndPixel: 'Colocar píxel', sndNotif: 'Notificaciones', sndLevel: 'Subida de nivel', sndMusic: 'Música ambiental', preview: 'Escuchar', addFriend: 'Añadir amigo', friendSent: 'Solicitud enviada', acceptFriend: 'Aceptar solicitud', friendTag: 'Amigo', friendErr: 'No se pudo enviar la solicitud', modFriends: 'Amigos en gremios', modFriendsDesc: 'Botón para añadir amigos en la lista de miembros', sndDrag: 'Mover objetivos', sndDragDesc: 'Al tomar y soltar la lista de objetivos', sndClick: 'Clics', sndClickDesc: 'En todos los botones de Bplace y Bplace+, hasta que lleguen los sonidos oficiales', sndUiClick: 'Clics en Bplace+', sndUiClickDesc: 'En los botones de la extensión', sndGame: 'Sonidos del juego', sndGameDesc: 'Sonidos añadidos al juego por Bplace+ hasta que lleguen los oficiales de Bplace', sndSource: 'Fuente de sonido', sndSourceDesc: 'Bplace+ por ahora, Bplace cuando lleguen los sonidos oficiales', sndGameClick: 'Clics en botones', sndGameClickDesc: 'En todos los botones del juego', sndPixelSel: 'Selección de píxel', sndPixelSelDesc: 'Al hacer clic en un píxel del mapa', sndPaint: 'Colocar píxel', sndPaintDesc: 'Al colocar un píxel en modo pintura', sndPaintMode: 'Modo pintura', sndPaintModeDesc: 'Al entrar o salir del modo pintura', modGameSoundsDesc: 'Sonidos en los botones, píxeles y pintura del juego', discordServer: 'Servidor de Discord', discordServerDesc: 'Únete a la comunidad que creó Bplace+', contactDiscord: 'Contacto de Discord: clic para copiar el usuario', nickCopied: 'Usuario copiado', authorNote: 'Yooo, si encuentras un bug o tienes una idea para Bplace+, no dudes en contactarme esperando que estas ideas inspiren a Obeyeur de paso :3', collapse: 'Contraer', expand: 'Desplegar' },
    de: { close: 'Schließen', capture: 'Aufnahme', captureBtn: 'Aufnehmen', palette: '.kpl-Palette', free: 'Kostenlos', unlocked: 'Freigeschaltet', all: 'Alle', paletteMissing: 'Palette nicht geladen', loading: 'Wird geladen…', width: 'Breite', height: 'Höhe', copy: 'Kopieren', download: 'PNG herunterladen', newSel: 'Neu', refresh: 'Aktualisieren', colors: 'Farb.', tilesFailed: '{n} Kachel(n) nicht geladen', tileUpdating: 'Kachel wird aktualisiert', saved: 'Gespeichert', copied: 'Kopiert', copyFailed: 'Kopieren fehlgeschlagen', mapMissing: 'Karte nicht geladen', worldUnsupported: 'Welt nicht unterstützt', zoneEmpty: 'Leerer Bereich', outside: 'Außerhalb der Karte', tooBig: 'Bereich zu groß', select: 'Auswahl', esc: 'Esc', earth: 'Erde', moon: 'Mond', pin: 'Anheften', unpin: 'Lösen', dailyQuest: 'Tagesquest', goals: 'Ziele', shortcut: 'Alt+Umschalt+S', kplFree: 'kostenlos', kplUnlocked: 'freigeschaltet', kplAll: 'alle', modules: 'Module', modulesDesc: 'Werkzeuge ein- oder ausschalten', whatsNew: 'Neuigkeiten', whatsNewDesc: 'Änderungsprotokoll der Erweiterung', allUpdates: 'Alle Updates', modCaptureDesc: 'Pixelgenaue Bereichsaufnahme', modPalettesDesc: 'Farbexport für Krita', modGoalsDesc: 'Quests und Erfolge anheften', version: 'Version', back: 'Zurück', newBadge: 'Neu', favorites: 'Favoriten', addFav: 'Aktuellen Ort hinzufügen', favEmpty: 'Noch keine Favoriten', favHint: 'Klicke auf ein Pixel und dann auf den Stern', favAdd: 'Zu Favoriten hinzufügen', favRemove: 'Aus Favoriten entfernen', favName: 'Favorit', rename: 'Umbenennen', del: 'Löschen', goTo: 'Hinfliegen', modCounts: 'Vorlagen-Zähler', modCountsDesc: 'Verbleibende Pixel pro Farbe', modFavsDesc: 'Lieblingsorte in den Pins und auf der Karte', palBase: 'Grundfarben', palMine: 'Meine Farben', palAll: 'Alle Farben', sounds: 'Sounds', sndMaster: 'Bplace+-Sounds', sndMasterDesc: 'Sounds der Erweiterung aktivieren', sndVolume: 'Lautstärke', sndCapture: 'Aufnahme', sndCaptureDesc: 'Wenn ein Bereich aufgenommen wird', sndGoal: 'Ziel erreicht', sndGoalDesc: 'Wenn ein angeheftetes Ziel fertig ist', sndFav: 'Favoriten', sndFavDesc: 'Favorit hinzufügen und entfernen', sndPalette: 'Palette', sndPaletteDesc: 'Wenn eine .kpl-Palette heruntergeladen wird', sndFriend: 'Freundschaftsanfrage', sndFriendDesc: 'Wenn eine Anfrage gesendet wird', sndSite: 'Bplace-Sounds', sndSiteDesc: 'Vom Bplace-Entwickler, bald verfügbar', sndPixel: 'Pixel gesetzt', sndNotif: 'Benachrichtigungen', sndLevel: 'Levelaufstieg', sndMusic: 'Hintergrundmusik', preview: 'Anhören', addFriend: 'Als Freund hinzufügen', friendSent: 'Anfrage gesendet', acceptFriend: 'Anfrage annehmen', friendTag: 'Freund', friendErr: 'Anfrage konnte nicht gesendet werden', modFriends: 'Freunde in Gilden', modFriendsDesc: 'Freund-Button in der Mitgliederliste', sndDrag: 'Ziele verschieben', sndDragDesc: 'Beim Greifen und Loslassen der Zielliste', sndClick: 'Klicks', sndClickDesc: 'Auf allen Buttons von Bplace und Bplace+, bis die offiziellen Sounds kommen', sndUiClick: 'Klicks in Bplace+', sndUiClickDesc: 'Auf den Buttons der Erweiterung', sndGame: 'Spiel-Sounds', sndGameDesc: 'Von Bplace+ hinzugefügte Sounds, bis die offiziellen Bplace-Sounds kommen', sndSource: 'Sound-Quelle', sndSourceDesc: 'Jetzt Bplace+, später Bplace mit den offiziellen Sounds', sndGameClick: 'Button-Klicks', sndGameClickDesc: 'Auf allen Buttons des Spiels', sndPixelSel: 'Pixel auswählen', sndPixelSelDesc: 'Beim Klick auf ein Pixel der Karte', sndPaint: 'Pixel setzen', sndPaintDesc: 'Beim Setzen eines Pixels im Malmodus', sndPaintMode: 'Malmodus', sndPaintModeDesc: 'Beim Betreten oder Verlassen des Malmodus', modGameSoundsDesc: 'Sounds für Buttons, Pixel und Malen im Spiel', discordServer: 'Discord-Server', discordServerDesc: 'Tritt der Community hinter Bplace+ bei', contactDiscord: 'Discord-Kontakt: Klicken zum Kopieren des Namens', nickCopied: 'Name kopiert', authorNote: 'Yooo, wenn ihr einen Bug findet oder eine Idee für Bplace+ habt, meldet euch gern bei mir vielleicht inspirieren die Ideen ja auch Obeyeur :3', collapse: 'Einklappen', expand: 'Ausklappen' },
    it: { close: 'Chiudi', capture: 'Cattura', captureBtn: 'Cattura', palette: 'Palette .kpl', free: 'Gratuiti', unlocked: 'Sbloccati', all: 'Tutti', paletteMissing: 'Palette non caricata', loading: 'Caricamento…', width: 'Larghezza', height: 'Altezza', copy: 'Copia', download: 'Scarica PNG', newSel: 'Nuova', refresh: 'Aggiorna', colors: 'col.', tilesFailed: '{n} riquadro/i non caricato/i', tileUpdating: 'Riquadro in aggiornamento', saved: 'Salvato', copied: 'Copiato', copyFailed: 'Copia non riuscita', mapMissing: 'Mappa non caricata', worldUnsupported: 'Mondo non supportato', zoneEmpty: 'Area vuota', outside: 'Fuori dalla mappa', tooBig: 'Area troppo grande', select: 'Selezione', esc: 'Esc', earth: 'Terra', moon: 'Luna', pin: 'Fissa', unpin: 'Rimuovi', dailyQuest: 'Missione del giorno', goals: 'Obiettivi', shortcut: 'Alt+Maiusc+S', kplFree: 'gratuiti', kplUnlocked: 'sbloccati', kplAll: 'tutti', modules: 'Moduli', modulesDesc: 'Attiva o disattiva gli strumenti', whatsNew: 'Novità', whatsNewDesc: "Registro aggiornamenti dell'estensione", allUpdates: 'Tutti gli aggiornamenti', modCaptureDesc: 'Cattura di aree al pixel', modPalettesDesc: 'Esportazione colori per Krita', modGoalsDesc: 'Fissa missioni e obiettivi sullo schermo', version: 'Versione', back: 'Indietro', newBadge: 'Nuovo', favorites: 'Preferiti', addFav: 'Aggiungi la posizione attuale', favEmpty: 'Nessun preferito per ora', favHint: 'Clicca su un pixel e poi sulla stella per aggiungerlo', favAdd: 'Aggiungi ai preferiti', favRemove: 'Rimuovi dai preferiti', favName: 'Preferito', rename: 'Rinomina', del: 'Elimina', goTo: 'Vai', modCounts: 'Contatori del modello', modCountsDesc: 'Pixel rimanenti per ogni colore', modFavsDesc: 'Luoghi preferiti nei pin e sulla mappa', palBase: 'Colori base', palMine: 'I miei colori', palAll: 'Tutti i colori', sounds: 'Suoni', sndMaster: 'Suoni di Bplace+', sndMasterDesc: 'Attiva i suoni dell\'estensione', sndVolume: 'Volume', sndCapture: 'Cattura', sndCaptureDesc: 'Quando si cattura una zona', sndGoal: 'Obiettivo completato', sndGoalDesc: 'Quando un obiettivo fissato è finito', sndFav: 'Preferiti', sndFavDesc: 'Aggiunta e rimozione di un preferito', sndPalette: 'Palette', sndPaletteDesc: 'Quando si scarica una palette .kpl', sndFriend: 'Richiesta di amicizia', sndFriendDesc: 'Quando si invia una richiesta', sndSite: 'Suoni di Bplace', sndSiteDesc: 'Creati dallo sviluppatore di Bplace, in arrivo', sndPixel: 'Pixel piazzato', sndNotif: 'Notifiche', sndLevel: 'Salita di livello', sndMusic: 'Musica di sottofondo', preview: 'Ascolta', addFriend: 'Aggiungi amico', friendSent: 'Richiesta inviata', acceptFriend: 'Accetta richiesta', friendTag: 'Amico', friendErr: 'Impossibile inviare la richiesta', modFriends: 'Amici nelle gilde', modFriendsDesc: 'Pulsante amico nella lista dei membri', sndDrag: 'Spostare gli obiettivi', sndDragDesc: 'Quando prendi e rilasci la lista degli obiettivi', sndClick: 'Clic', sndClickDesc: 'Su tutti i pulsanti di Bplace e Bplace+, in attesa dei suoni ufficiali', sndUiClick: 'Clic in Bplace+', sndUiClickDesc: 'Sui pulsanti dell\'estensione', sndGame: 'Suoni del gioco', sndGameDesc: 'Suoni aggiunti al gioco da Bplace+ in attesa di quelli ufficiali di Bplace', sndSource: 'Fonte dei suoni', sndSourceDesc: 'Bplace+ per ora, Bplace quando arriveranno i suoni ufficiali', sndGameClick: 'Clic sui pulsanti', sndGameClickDesc: 'Su tutti i pulsanti del gioco', sndPixelSel: 'Selezione di un pixel', sndPixelSelDesc: 'Quando clicchi un pixel della mappa', sndPaint: 'Piazzare un pixel', sndPaintDesc: 'Quando piazzi un pixel in modalità pittura', sndPaintMode: 'Modalità pittura', sndPaintModeDesc: 'Quando entri o esci dalla modalità pittura', modGameSoundsDesc: 'Suoni su pulsanti, pixel e pittura del gioco', discordServer: 'Server Discord', discordServerDesc: 'Unisciti alla community dietro Bplace+', contactDiscord: 'Contatto Discord: clicca per copiare il nome', nickCopied: 'Nome copiato', authorNote: 'Yooo, se trovate un bug o avete un\'idea per Bplace+, non esitate a contattarmi sperando che queste idee possano ispirare anche Obeyeur :3', collapse: 'Comprimi', expand: 'Espandi' },
    pt: { close: 'Fechar', capture: 'Captura', captureBtn: 'Capturar', palette: 'Paleta .kpl', free: 'Grátis', unlocked: 'Desbloqueadas', all: 'Todas', paletteMissing: 'Paleta não carregada', loading: 'A carregar…', width: 'Largura', height: 'Altura', copy: 'Copiar', download: 'Transferir PNG', newSel: 'Nova', refresh: 'Atualizar', colors: 'cores', tilesFailed: '{n} bloco(s) não carregado(s)', tileUpdating: 'Bloco a atualizar', saved: 'Guardado', copied: 'Copiado', copyFailed: 'Falha ao copiar', mapMissing: 'Mapa não carregado', worldUnsupported: 'Mundo não suportado', zoneEmpty: 'Zona vazia', outside: 'Fora do mapa', tooBig: 'Zona demasiado grande', select: 'Seleção', esc: 'Esc', earth: 'Terra', moon: 'Lua', pin: 'Fixar', unpin: 'Desafixar', dailyQuest: 'Missão do dia', goals: 'Objetivos', shortcut: 'Alt+Shift+S', kplFree: 'gratis', kplUnlocked: 'desbloqueadas', kplAll: 'todas', modules: 'Módulos', modulesDesc: 'Ativar ou desativar ferramentas', whatsNew: 'Novidades', whatsNewDesc: 'Registo de atualizações da extensão', allUpdates: 'Todas as atualizações', modCaptureDesc: 'Captura de área ao píxel', modPalettesDesc: 'Exportar cores para o Krita', modGoalsDesc: 'Fixar missões e conquistas no ecrã', version: 'Versão', back: 'Voltar', newBadge: 'Novo', favorites: 'Favoritos', addFav: 'Adicionar a localização atual', favEmpty: 'Ainda sem favoritos', favHint: 'Clica num píxel e depois na estrela para o adicionar', favAdd: 'Adicionar aos favoritos', favRemove: 'Remover dos favoritos', favName: 'Favorito', rename: 'Mudar o nome', del: 'Eliminar', goTo: 'Ir até lá', modCounts: 'Contadores do modelo', modCountsDesc: 'Píxeis restantes em cada cor', modFavsDesc: 'Locais favoritos nos pins e no mapa', palBase: 'Cores base', palMine: 'As minhas cores', palAll: 'Todas as cores', sounds: 'Sons', sndMaster: 'Sons do Bplace+', sndMasterDesc: 'Ativa os sons da extensão', sndVolume: 'Volume', sndCapture: 'Captura', sndCaptureDesc: 'Quando uma zona é capturada', sndGoal: 'Objetivo concluído', sndGoalDesc: 'Quando um objetivo fixado termina', sndFav: 'Favoritos', sndFavDesc: 'Adicionar e remover um favorito', sndPalette: 'Paleta', sndPaletteDesc: 'Quando uma paleta .kpl é transferida', sndFriend: 'Pedido de amizade', sndFriendDesc: 'Quando um pedido é enviado', sndSite: 'Sons do Bplace', sndSiteDesc: 'Feitos pelo programador do Bplace, em breve', sndPixel: 'Píxel colocado', sndNotif: 'Notificações', sndLevel: 'Subida de nível', sndMusic: 'Música ambiente', preview: 'Ouvir', addFriend: 'Adicionar amigo', friendSent: 'Pedido enviado', acceptFriend: 'Aceitar pedido', friendTag: 'Amigo', friendErr: 'Não foi possível enviar o pedido', modFriends: 'Amigos nas guildas', modFriendsDesc: 'Botão de amizade na lista de membros', sndDrag: 'Mover objetivos', sndDragDesc: 'Ao pegar e largar a lista de objetivos', sndClick: 'Cliques', sndClickDesc: 'Em todos os botões do Bplace e do Bplace+, até chegarem os sons oficiais', sndUiClick: 'Cliques no Bplace+', sndUiClickDesc: 'Nos botões da extensão', sndGame: 'Sons do jogo', sndGameDesc: 'Sons adicionados ao jogo pelo Bplace+ até chegarem os oficiais do Bplace', sndSource: 'Fonte dos sons', sndSourceDesc: 'Bplace+ por agora, Bplace quando chegarem os sons oficiais', sndGameClick: 'Cliques nos botões', sndGameClickDesc: 'Em todos os botões do jogo', sndPixelSel: 'Seleção de píxel', sndPixelSelDesc: 'Ao clicar num píxel do mapa', sndPaint: 'Colocar píxel', sndPaintDesc: 'Ao colocar um píxel no modo pintura', sndPaintMode: 'Modo pintura', sndPaintModeDesc: 'Ao entrar ou sair do modo pintura', modGameSoundsDesc: 'Sons nos botões, píxeis e pintura do jogo', discordServer: 'Servidor do Discord', discordServerDesc: 'Junta-te à comunidade que deu origem ao Bplace+', contactDiscord: 'Contacto no Discord: clica para copiar o nome', nickCopied: 'Nome copiado', authorNote: 'Yooo, se encontrares um bug ou tiveres uma ideia para o Bplace+, não hesites em contactar-me esperando que estas ideias inspirem o Obeyeur pelo caminho :3', collapse: 'Recolher', expand: 'Expandir' },
    'pt-BR': { close: 'Fechar', capture: 'Captura', captureBtn: 'Capturar', palette: 'Paleta .kpl', free: 'Grátis', unlocked: 'Desbloqueadas', all: 'Todas', paletteMissing: 'Paleta não carregada', loading: 'Carregando…', width: 'Largura', height: 'Altura', copy: 'Copiar', download: 'Baixar PNG', newSel: 'Nova', refresh: 'Atualizar', colors: 'cores', tilesFailed: '{n} bloco(s) não carregado(s)', tileUpdating: 'Bloco sendo atualizado', saved: 'Salvo', copied: 'Copiado', copyFailed: 'Falha ao copiar', mapMissing: 'Mapa não carregado', worldUnsupported: 'Mundo não suportado', zoneEmpty: 'Área vazia', outside: 'Fora do mapa', tooBig: 'Área grande demais', select: 'Seleção', esc: 'Esc', earth: 'Terra', moon: 'Lua', pin: 'Fixar', unpin: 'Desafixar', dailyQuest: 'Missão do dia', goals: 'Objetivos', shortcut: 'Alt+Shift+S', kplFree: 'gratis', kplUnlocked: 'desbloqueadas', kplAll: 'todas', modules: 'Módulos', modulesDesc: 'Ativar ou desativar ferramentas', whatsNew: 'Novidades', whatsNewDesc: 'Registro de atualizações da extensão', allUpdates: 'Todas as atualizações', modCaptureDesc: 'Captura de área pixel a pixel', modPalettesDesc: 'Exportar cores para o Krita', modGoalsDesc: 'Fixar missões e conquistas na tela', version: 'Versão', back: 'Voltar', newBadge: 'Novo', favorites: 'Favoritos', addFav: 'Adicionar a localização atual', favEmpty: 'Nenhum favorito ainda', favHint: 'Clique em um pixel e depois na estrela para adicioná-lo', favAdd: 'Adicionar aos favoritos', favRemove: 'Remover dos favoritos', favName: 'Favorito', rename: 'Renomear', del: 'Excluir', goTo: 'Ir até lá', modCounts: 'Contadores do modelo', modCountsDesc: 'Pixels restantes em cada cor', modFavsDesc: 'Locais favoritos nos pins e no mapa', palBase: 'Cores base', palMine: 'Minhas cores', palAll: 'Todas as cores', sounds: 'Sons', sndMaster: 'Sons do Bplace+', sndMasterDesc: 'Ativa os sons da extensão', sndVolume: 'Volume', sndCapture: 'Captura', sndCaptureDesc: 'Quando uma área é capturada', sndGoal: 'Objetivo concluído', sndGoalDesc: 'Quando um objetivo fixado termina', sndFav: 'Favoritos', sndFavDesc: 'Adicionar e remover um favorito', sndPalette: 'Paleta', sndPaletteDesc: 'Quando uma paleta .kpl é baixada', sndFriend: 'Pedido de amizade', sndFriendDesc: 'Quando um pedido é enviado', sndSite: 'Sons do Bplace', sndSiteDesc: 'Feitos pelo desenvolvedor do Bplace, em breve', sndPixel: 'Pixel colocado', sndNotif: 'Notificações', sndLevel: 'Subida de nível', sndMusic: 'Música ambiente', preview: 'Ouvir', addFriend: 'Adicionar amigo', friendSent: 'Pedido enviado', acceptFriend: 'Aceitar pedido', friendTag: 'Amigo', friendErr: 'Não foi possível enviar o pedido', modFriends: 'Amigos nas guildas', modFriendsDesc: 'Botão de amizade na lista de membros', sndDrag: 'Mover objetivos', sndDragDesc: 'Ao pegar e soltar a lista de objetivos', sndClick: 'Cliques', sndClickDesc: 'Em todos os botões do Bplace e do Bplace+, até chegarem os sons oficiais', sndUiClick: 'Cliques no Bplace+', sndUiClickDesc: 'Nos botões da extensão', sndGame: 'Sons do jogo', sndGameDesc: 'Sons adicionados ao jogo pelo Bplace+ até chegarem os oficiais do Bplace', sndSource: 'Fonte dos sons', sndSourceDesc: 'Bplace+ por enquanto, Bplace quando chegarem os sons oficiais', sndGameClick: 'Cliques nos botões', sndGameClickDesc: 'Em todos os botões do jogo', sndPixelSel: 'Seleção de pixel', sndPixelSelDesc: 'Ao clicar em um pixel do mapa', sndPaint: 'Colocar pixel', sndPaintDesc: 'Ao colocar um pixel no modo pintura', sndPaintMode: 'Modo pintura', sndPaintModeDesc: 'Ao entrar ou sair do modo pintura', modGameSoundsDesc: 'Sons nos botões, pixels e pintura do jogo', discordServer: 'Servidor do Discord', discordServerDesc: 'Entre na comunidade que deu origem ao Bplace+', contactDiscord: 'Contato no Discord: clique para copiar o nome', nickCopied: 'Nome copiado', authorNote: 'Yooo, se você achar um bug ou tiver uma ideia para o Bplace+, fique à vontade para me chamar torcendo para essas ideias inspirarem o Obeyeur também :3', collapse: 'Recolher', expand: 'Expandir' },
    tr: { close: 'Kapat', capture: 'Yakala', captureBtn: 'Yakala', palette: '.kpl paleti', free: 'Ücretsiz', unlocked: 'Açılanlar', all: 'Tümü', paletteMissing: 'Palet yüklenmedi', loading: 'Yükleniyor…', width: 'Genişlik', height: 'Yükseklik', copy: 'Kopyala', download: 'PNG indir', newSel: 'Yeni', refresh: 'Yenile', colors: 'renk', tilesFailed: '{n} karo yüklenmedi', tileUpdating: 'Karo güncelleniyor', saved: 'Kaydedildi', copied: 'Kopyalandı', copyFailed: 'Kopyalanamadı', mapMissing: 'Harita yüklenmedi', worldUnsupported: 'Dünya desteklenmiyor', zoneEmpty: 'Boş alan', outside: 'Harita dışında', tooBig: 'Alan çok büyük', select: 'Seçim', esc: 'Esc', earth: 'Dünya', moon: 'Ay', pin: 'Sabitle', unpin: 'Sabitlemeyi kaldır', dailyQuest: 'Günlük görev', goals: 'Hedefler', shortcut: 'Alt+Shift+S', kplFree: 'ucretsiz', kplUnlocked: 'acilanlar', kplAll: 'tumu', modules: 'Modüller', modulesDesc: 'Araçları aç veya kapat', whatsNew: 'Yenilikler', whatsNewDesc: 'Eklenti güncelleme günlüğü', allUpdates: 'Tüm güncellemeler', modCaptureDesc: 'Piksel hassasiyetinde alan yakalama', modPalettesDesc: 'Krita için renk dışa aktarma', modGoalsDesc: 'Görev ve başarımları ekrana sabitle', version: 'Sürüm', back: 'Geri', newBadge: 'Yeni', favorites: 'Favoriler', addFav: 'Geçerli konumu ekle', favEmpty: 'Henüz favori yok', favHint: 'Bir piksele, ardından yıldıza tıklayarak ekle', favAdd: 'Favorilere ekle', favRemove: 'Favorilerden çıkar', favName: 'Favori', rename: 'Yeniden adlandır', del: 'Sil', goTo: 'Oraya git', modCounts: 'Şablon sayaçları', modCountsDesc: 'Her renkte kalan pikseller', modFavsDesc: 'Pinlerde ve haritada favori yerler', palBase: 'Temel renkler', palMine: 'Renklerim', palAll: 'Tüm renkler', sounds: 'Sesler', sndMaster: 'Bplace+ sesleri', sndMasterDesc: 'Eklentinin seslerini aç', sndVolume: 'Ses düzeyi', sndCapture: 'Yakalama', sndCaptureDesc: 'Bir alan yakalandığında', sndGoal: 'Hedef tamamlandı', sndGoalDesc: 'Sabitlenen hedef bittiğinde', sndFav: 'Favoriler', sndFavDesc: 'Favori ekleme ve çıkarma', sndPalette: 'Palet', sndPaletteDesc: 'Bir .kpl paleti indirildiğinde', sndFriend: 'Arkadaşlık isteği', sndFriendDesc: 'İstek gönderildiğinde', sndSite: 'Bplace sesleri', sndSiteDesc: 'Bplace geliştiricisi tarafından, yakında', sndPixel: 'Piksel yerleştirme', sndNotif: 'Bildirimler', sndLevel: 'Seviye atlama', sndMusic: 'Ortam müziği', preview: 'Dinle', addFriend: 'Arkadaş ekle', friendSent: 'İstek gönderildi', acceptFriend: 'İsteği kabul et', friendTag: 'Arkadaş', friendErr: 'İstek gönderilemedi', modFriends: 'Loncada arkadaşlar', modFriendsDesc: 'Üye listesinde arkadaş ekleme düğmesi', sndDrag: 'Hedefleri taşıma', sndDragDesc: 'Hedef listesini tutup bıraktığında', sndClick: 'Tıklamalar', sndClickDesc: 'Resmî sesler gelene kadar tüm Bplace ve Bplace+ düğmelerinde', sndUiClick: 'Bplace+ tıklamaları', sndUiClickDesc: 'Eklentinin düğmelerinde', sndGame: 'Oyun sesleri', sndGameDesc: 'Resmî Bplace sesleri gelene kadar Bplace+ tarafından eklenen sesler', sndSource: 'Ses kaynağı', sndSourceDesc: 'Şimdilik Bplace+, resmî sesler gelince Bplace', sndGameClick: 'Düğme tıklamaları', sndGameClickDesc: 'Oyundaki tüm düğmelerde', sndPixelSel: 'Piksel seçimi', sndPixelSelDesc: 'Haritada bir piksele tıkladığında', sndPaint: 'Piksel yerleştirme', sndPaintDesc: 'Boyama modunda piksel yerleştirdiğinde', sndPaintMode: 'Boyama modu', sndPaintModeDesc: 'Boyama moduna girip çıktığında', modGameSoundsDesc: 'Oyunun düğmeleri, pikselleri ve boyaması için sesler', discordServer: 'Discord sunucusu', discordServerDesc: 'Bplace+\'ın arkasındaki topluluğa katıl', contactDiscord: 'Discord iletişim: kullanıcı adını kopyalamak için tıkla', nickCopied: 'Kullanıcı adı kopyalandı', authorNote: 'Yooo, Bplace+ için bir hata bulursan ya da bir fikrin varsa bana yazmaktan çekinme umarım bu fikirler Obeyeur\'a da ilham verir :3', collapse: 'Daralt', expand: 'Genişlet' },
    ru: { close: 'Закрыть', capture: 'Снимок', captureBtn: 'Снять', palette: 'Палитра .kpl', free: 'Бесплатные', unlocked: 'Открытые', all: 'Все', paletteMissing: 'Палитра не загружена', loading: 'Загрузка…', width: 'Ширина', height: 'Высота', copy: 'Копировать', download: 'Скачать PNG', newSel: 'Новый', refresh: 'Обновить', colors: 'цв.', tilesFailed: 'Не загружено тайлов: {n}', tileUpdating: 'Тайл обновляется', saved: 'Сохранено', copied: 'Скопировано', copyFailed: 'Не удалось скопировать', mapMissing: 'Карта не загружена', worldUnsupported: 'Мир не поддерживается', zoneEmpty: 'Пустая область', outside: 'Вне карты', tooBig: 'Слишком большая область', select: 'Выделение', esc: 'Esc', earth: 'Земля', moon: 'Луна', pin: 'Закрепить', unpin: 'Открепить', dailyQuest: 'Ежедневное задание', goals: 'Цели', shortcut: 'Alt+Shift+S', kplFree: 'base_colors', kplUnlocked: 'my_colors', kplAll: 'all_colors', modules: 'Модули', modulesDesc: 'Включение и отключение инструментов', whatsNew: 'Что нового', whatsNewDesc: 'Журнал обновлений расширения', allUpdates: 'Все обновления', modCaptureDesc: 'Попиксельный снимок области', modPalettesDesc: 'Экспорт цветов для Krita', modGoalsDesc: 'Закреплять задания и достижения на экране', version: 'Версия', back: 'Назад', newBadge: 'Новое', favorites: 'Избранное', addFav: 'Добавить текущее место', favEmpty: 'Пока нет избранного', favHint: 'Нажми на пиксель, затем на звезду, чтобы добавить', favAdd: 'Добавить в избранное', favRemove: 'Убрать из избранного', favName: 'Избранное', rename: 'Переименовать', del: 'Удалить', goTo: 'Перейти', modCounts: 'Счётчики шаблона', modCountsDesc: 'Оставшиеся пиксели по каждому цвету', modFavsDesc: 'Избранные места в метках и на карте', palBase: 'Базовые цвета', palMine: 'Мои цвета', palAll: 'Все цвета', sounds: 'Звуки', sndMaster: 'Звуки Bplace+', sndMasterDesc: 'Включить звуки расширения', sndVolume: 'Громкость', sndCapture: 'Снимок', sndCaptureDesc: 'Когда зона снята', sndGoal: 'Цель выполнена', sndGoalDesc: 'Когда закреплённая цель завершена', sndFav: 'Избранное', sndFavDesc: 'Добавление и удаление избранного', sndPalette: 'Палитра', sndPaletteDesc: 'Когда скачана палитра .kpl', sndFriend: 'Запрос в друзья', sndFriendDesc: 'Когда отправлен запрос', sndSite: 'Звуки Bplace', sndSiteDesc: 'От разработчика Bplace, скоро', sndPixel: 'Установка пикселя', sndNotif: 'Уведомления', sndLevel: 'Новый уровень', sndMusic: 'Фоновая музыка', preview: 'Прослушать', addFriend: 'Добавить в друзья', friendSent: 'Запрос отправлен', acceptFriend: 'Принять запрос', friendTag: 'Друг', friendErr: 'Не удалось отправить запрос', modFriends: 'Друзья в гильдиях', modFriendsDesc: 'Кнопка добавления в друзья в списке участников', sndDrag: 'Перемещение целей', sndDragDesc: 'Когда берёшь и отпускаешь список целей', sndClick: 'Клики', sndClickDesc: 'На всех кнопках Bplace и Bplace+, пока не появятся официальные звуки', sndUiClick: 'Клики в Bplace+', sndUiClickDesc: 'На кнопках расширения', sndGame: 'Звуки игры', sndGameDesc: 'Звуки, добавленные Bplace+ до появления официальных звуков Bplace', sndSource: 'Источник звуков', sndSourceDesc: 'Сейчас Bplace+, потом Bplace с официальными звуками', sndGameClick: 'Клики по кнопкам', sndGameClickDesc: 'На всех кнопках игры', sndPixelSel: 'Выбор пикселя', sndPixelSelDesc: 'При нажатии на пиксель карты', sndPaint: 'Установка пикселя', sndPaintDesc: 'При установке пикселя в режиме рисования', sndPaintMode: 'Режим рисования', sndPaintModeDesc: 'При входе и выходе из режима рисования', modGameSoundsDesc: 'Звуки кнопок, пикселей и рисования в игре', discordServer: 'Сервер Discord', discordServerDesc: 'Присоединяйся к сообществу, создавшему Bplace+', contactDiscord: 'Контакт в Discord: нажми, чтобы скопировать ник', nickCopied: 'Ник скопирован', authorNote: 'Йоу, если нашли баг или есть идея для Bplace+, смело пишите мне надеюсь, эти идеи заодно вдохновят Obeyeur :3', collapse: 'Свернуть', expand: 'Развернуть' },
    ko: { close: '닫기', capture: '캡처', captureBtn: '캡처', palette: '.kpl 팔레트', free: '무료', unlocked: '잠금 해제됨', all: '전체', paletteMissing: '팔레트를 불러오지 못함', loading: '불러오는 중…', width: '너비', height: '높이', copy: '복사', download: 'PNG 다운로드', newSel: '새로', refresh: '새로고침', colors: '색', tilesFailed: '타일 {n}개를 불러오지 못함', tileUpdating: '타일 업데이트 중', saved: '저장됨', copied: '복사됨', copyFailed: '복사 실패', mapMissing: '지도를 불러오지 못함', worldUnsupported: '지원되지 않는 월드', zoneEmpty: '빈 영역', outside: '지도 밖', tooBig: '영역이 너무 큼', select: '선택', esc: 'Esc', earth: '지구', moon: '달', pin: '고정', unpin: '고정 해제', dailyQuest: '일일 퀘스트', goals: '목표', shortcut: 'Alt+Shift+S', kplFree: 'base_colors', kplUnlocked: 'my_colors', kplAll: 'all_colors', modules: '모듈', modulesDesc: '도구 켜기/끄기', whatsNew: '새로운 기능', whatsNewDesc: '확장 프로그램 업데이트 기록', allUpdates: '모든 업데이트', modCaptureDesc: '픽셀 단위 영역 캡처', modPalettesDesc: 'Krita용 색상 내보내기', modGoalsDesc: '퀘스트와 업적을 화면에 고정', version: '버전', back: '뒤로', newBadge: '새 소식', favorites: '즐겨찾기', addFav: '현재 위치 추가', favEmpty: '아직 즐겨찾기가 없습니다', favHint: '픽셀을 클릭한 다음 별을 눌러 추가하세요', favAdd: '즐겨찾기에 추가', favRemove: '즐겨찾기에서 제거', favName: '즐겨찾기', rename: '이름 바꾸기', del: '삭제', goTo: '이동', modCounts: '템플릿 카운터', modCountsDesc: '색상별 남은 픽셀', modFavsDesc: '핀과 지도의 즐겨찾는 장소', palBase: '기본 색상', palMine: '내 색상', palAll: '모든 색상', sounds: '소리', sndMaster: 'Bplace+ 소리', sndMasterDesc: '확장 프로그램 소리 켜기', sndVolume: '볼륨', sndCapture: '캡처', sndCaptureDesc: '영역을 캡처할 때', sndGoal: '목표 완료', sndGoalDesc: '고정한 목표를 끝냈을 때', sndFav: '즐겨찾기', sndFavDesc: '즐겨찾기 추가 및 제거', sndPalette: '팔레트', sndPaletteDesc: '.kpl 팔레트를 내려받을 때', sndFriend: '친구 요청', sndFriendDesc: '친구 요청을 보낼 때', sndSite: 'Bplace 소리', sndSiteDesc: 'Bplace 개발자가 제작, 곧 제공', sndPixel: '픽셀 배치', sndNotif: '알림', sndLevel: '레벨 업', sndMusic: '배경 음악', preview: '듣기', addFriend: '친구 추가', friendSent: '요청 보냄', acceptFriend: '요청 수락', friendTag: '친구', friendErr: '요청을 보낼 수 없습니다', modFriends: '길드 내 친구', modFriendsDesc: '멤버 목록의 친구 추가 버튼', sndDrag: '목표 이동', sndDragDesc: '목표 목록을 잡고 놓을 때', sndClick: '클릭', sndClickDesc: '공식 소리가 나오기 전까지 모든 Bplace 및 Bplace+ 버튼에서', sndUiClick: 'Bplace+ 클릭', sndUiClickDesc: '확장 프로그램 버튼에서', sndGame: '게임 소리', sndGameDesc: '공식 Bplace 소리가 나오기 전까지 Bplace+가 추가한 소리', sndSource: '소리 출처', sndSourceDesc: '지금은 Bplace+, 공식 소리가 나오면 Bplace', sndGameClick: '버튼 클릭', sndGameClickDesc: '게임의 모든 버튼에서', sndPixelSel: '픽셀 선택', sndPixelSelDesc: '지도의 픽셀을 클릭할 때', sndPaint: '픽셀 배치', sndPaintDesc: '그리기 모드에서 픽셀을 놓을 때', sndPaintMode: '그리기 모드', sndPaintModeDesc: '그리기 모드에 들어가거나 나올 때', modGameSoundsDesc: '게임 버튼, 픽셀, 그리기 소리', discordServer: '디스코드 서버', discordServerDesc: 'Bplace+를 만든 커뮤니티에 참여하세요', contactDiscord: '디스코드 연락처: 클릭하여 이름 복사', nickCopied: '이름 복사됨', authorNote: 'Yooo, Bplace+에서 버그를 찾았거나 기능 아이디어가 있다면 편하게 연락 주세요 이 아이디어들이 Obeyeur에게도 영감이 되길 바라며 :3', collapse: '접기', expand: '펼치기' },
    uk: { close: 'Закрити', capture: 'Знімок', captureBtn: 'Зняти', palette: 'Палітра .kpl', free: 'Безкоштовні', unlocked: 'Відкриті', all: 'Усі', paletteMissing: 'Палітру не завантажено', loading: 'Завантаження…', width: 'Ширина', height: 'Висота', copy: 'Копіювати', download: 'Завантажити PNG', newSel: 'Новий', refresh: 'Оновити', colors: 'кол.', tilesFailed: 'Не завантажено тайлів: {n}', tileUpdating: 'Тайл оновлюється', saved: 'Збережено', copied: 'Скопійовано', copyFailed: 'Не вдалося скопіювати', mapMissing: 'Мапу не завантажено', worldUnsupported: 'Світ не підтримується', zoneEmpty: 'Порожня область', outside: 'Поза мапою', tooBig: 'Завелика область', select: 'Виділення', esc: 'Esc', earth: 'Земля', moon: 'Місяць', pin: 'Закріпити', unpin: 'Відкріпити', dailyQuest: 'Щоденне завдання', goals: 'Цілі', shortcut: 'Alt+Shift+S', kplFree: 'base_colors', kplUnlocked: 'my_colors', kplAll: 'all_colors', modules: 'Модулі', modulesDesc: 'Увімкнення та вимкнення інструментів', whatsNew: 'Що нового', whatsNewDesc: 'Журнал оновлень розширення', allUpdates: 'Усі оновлення', modCaptureDesc: 'Попіксельний знімок області', modPalettesDesc: 'Експорт кольорів для Krita', modGoalsDesc: 'Закріплювати завдання й досягнення на екрані', version: 'Версія', back: 'Назад', newBadge: 'Нове', favorites: 'Обране', addFav: 'Додати поточне місце', favEmpty: 'Поки немає обраного', favHint: 'Натисни на піксель, потім на зірку, щоб додати', favAdd: 'Додати до обраного', favRemove: 'Прибрати з обраного', favName: 'Обране', rename: 'Перейменувати', del: 'Видалити', goTo: 'Перейти', modCounts: 'Лічильники шаблону', modCountsDesc: 'Залишок пікселів для кожного кольору', modFavsDesc: 'Улюблені місця в мітках і на мапі', palBase: 'Базові кольори', palMine: 'Мої кольори', palAll: 'Усі кольори', sounds: 'Звуки', sndMaster: 'Звуки Bplace+', sndMasterDesc: 'Увімкнути звуки розширення', sndVolume: 'Гучність', sndCapture: 'Знімок', sndCaptureDesc: 'Коли зону знято', sndGoal: 'Ціль виконано', sndGoalDesc: 'Коли закріплену ціль завершено', sndFav: 'Обране', sndFavDesc: 'Додавання та видалення обраного', sndPalette: 'Палітра', sndPaletteDesc: 'Коли завантажено палітру .kpl', sndFriend: 'Запит у друзі', sndFriendDesc: 'Коли надіслано запит', sndSite: 'Звуки Bplace', sndSiteDesc: 'Від розробника Bplace, незабаром', sndPixel: 'Розміщення пікселя', sndNotif: 'Сповіщення', sndLevel: 'Новий рівень', sndMusic: 'Фонова музика', preview: 'Прослухати', addFriend: 'Додати в друзі', friendSent: 'Запит надіслано', acceptFriend: 'Прийняти запит', friendTag: 'Друг', friendErr: 'Не вдалося надіслати запит', modFriends: 'Друзі в гільдіях', modFriendsDesc: 'Кнопка додавання в друзі у списку учасників', sndDrag: 'Переміщення цілей', sndDragDesc: 'Коли береш і відпускаєш список цілей', sndClick: 'Кліки', sndClickDesc: 'На всіх кнопках Bplace і Bplace+, доки не з’являться офіційні звуки', sndUiClick: 'Кліки в Bplace+', sndUiClickDesc: 'На кнопках розширення', sndGame: 'Звуки гри', sndGameDesc: 'Звуки, додані Bplace+ до появи офіційних звуків Bplace', sndSource: 'Джерело звуків', sndSourceDesc: 'Зараз Bplace+, потім Bplace з офіційними звуками', sndGameClick: 'Кліки по кнопках', sndGameClickDesc: 'На всіх кнопках гри', sndPixelSel: 'Вибір пікселя', sndPixelSelDesc: 'Коли натискаєш на піксель мапи', sndPaint: 'Розміщення пікселя', sndPaintDesc: 'Коли ставиш піксель у режимі малювання', sndPaintMode: 'Режим малювання', sndPaintModeDesc: 'Коли входиш у режим малювання або виходиш з нього', modGameSoundsDesc: 'Звуки кнопок, пікселів і малювання в грі', discordServer: 'Сервер Discord', discordServerDesc: 'Приєднуйся до спільноти, що створила Bplace+', contactDiscord: 'Контакт у Discord: натисни, щоб скопіювати нік', nickCopied: 'Нік скопійовано', authorNote: 'Йоу, якщо знайшли баг або маєте ідею для Bplace+, сміливо пишіть мені сподіваюся, ці ідеї заодно надихнуть Obeyeur :3', collapse: 'Згорнути', expand: 'Розгорнути' },
  };

  function lang() {
    const raw = (document.documentElement.lang || localStorage.getItem('i18nextLng') || 'en').trim();
    if (/^pt[-_]br$/i.test(raw)) return 'pt-BR';
    return raw.split(/[-_]/)[0].toLowerCase();
  }
  function T(key, vars) {
    const l = lang();
    const dict = I18N[l] || I18N[l.split('-')[0]] || I18N.en;
    let str = dict[key] ?? I18N.en[key] ?? key;
    if (vars) str = str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
    return str;
  }

  let localeFetch = null;
  function locale() {
    const l = lang();
    if (DATA.locales[l]) return DATA.locales[l];
    if (DATA.locales[l.split('-')[0]] && !localeFetch) return DATA.locales[l.split('-')[0]];
    if (!localeFetch) {
      localeFetch = fetch(`/locales/${l}/global.json`).then((r) => r.json()).then((j) => {
        DATA.locales[l] = j;
        dataListeners.forEach((f) => f());
      }).catch(() => {});
    }
    return DATA.locales.en || null;
  }

  function tr(key, vars = {}) {
    const L = locale();
    if (!L) return null;
    const get = (k) => k.split('.').reduce((o, part) => (o && typeof o === 'object' ? o[part] : undefined), L);
    let str;
    if ('count' in vars) str = get(`${key}_${vars.count === 1 ? 'one' : 'other'}`);
    if (typeof str !== 'string') str = get(key);
    if (typeof str !== 'string') return null;
    return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] ?? ''));
  }

  function shapeName(shape) {
    const known = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond', 'hexagon'];
    return known.includes(shape) ? tr(`quest.shape_name.${shape}`) : tr('quest.shape_area');
  }

  function questText(q) {
    const a = q.target_config || {}, n = q.target_value;
    const d = (k, v) => tr(`quest.description.${k}`, v);
    let txt = null;
    switch (q.code) {
      case 'PLACE_ANY': txt = d('PLACE_ANY', { count: n }); break;
      case 'PLACE_COLOR': txt = d('PLACE_COLOR', { count: n, color: a.color ?? '' }); break;
      case 'PLACE_PALETTE': txt = d('PLACE_PALETTE', { count: n, palette: a.palette ?? '' }); break;
      case 'PIXELS_HOUR': txt = d('PIXELS_HOUR', { count: n }); break;
      case 'STREAK_DAY': txt = d('STREAK_DAY'); break;
      case 'USE_ALL_PALETTE_COLORS': txt = d('USE_ALL_PALETTE_COLORS', { palette: a.palette ?? '' }); break;
      case 'PLACE_SAME_COLOR': txt = d('PLACE_SAME_COLOR', { count: n }); break;
      case 'PLACE_IN_COUNTRY': txt = d('PLACE_IN_COUNTRY', { count: n, country: a.country ?? '' }); break;
      case 'PLACE_IN_CITY': txt = d('PLACE_IN_CITY', { count: n, city: a.city ?? '', country: a.country ?? '' }); break;
      case 'PLACE_IN_FEATURE': txt = d('PLACE_IN_FEATURE', { count: n, feature_type: tr(`quest.feature_type.${a.feature_type}`) ?? a.feature_type ?? '', feature_name: a.feature_name ?? '' }); break;
      case 'PLACE_IN_SHAPE': txt = d(a.world === 'moon' ? 'PLACE_IN_SHAPE_MOON' : 'PLACE_IN_SHAPE', { count: n, area: shapeName(a.shape) ?? '' }); break;
      case 'SEND_FRIEND_REQUEST': txt = d('SEND_FRIEND_REQUEST'); break;
      case 'SHARE_PIXEL_LINK': txt = d('SHARE_PIXEL_LINK'); break;
      case 'READ_CHANGELOG':
        txt = a.changelog_id && a.version
          ? d('READ_CHANGELOG_VERSION', { version: tr('changelog_entry.version', { version: a.version }) ?? a.version })
          : d('READ_CHANGELOG');
        break;
      case 'VISIT_PIN': txt = d('VISIT_PIN'); break;
      case 'LIKE_PIN': txt = d('LIKE_PIN', { count: n }); break;
      case 'LIKE_RANDOM_PIN': txt = d('LIKE_RANDOM_PIN'); break;
      case 'PLACE_ON_MOON': txt = d('PLACE_ON_MOON', { count: n }); break;
      case 'PAINT_OVER_MOON': txt = d('PAINT_OVER_MOON', { count: n }); break;
    }
    return txt || q.description || q.code;
  }

  const LS_ZONES = 'bplus:zones';
  let zoneCache = {};
  try { zoneCache = JSON.parse(localStorage.getItem(LS_ZONES) || '{}') || {}; } catch (e) {}

  function questZone(q) {
    const a = q.target_config || {};
    const str = (v) => (typeof v === 'string' && v.length ? v : null);
    switch (q.code) {
      case 'PLACE_IN_CITY': {
        const city = str(a.city), country = str(a.country);
        if (!city) return null;
        return { type: 'city', name: city, text: country ? `${city}, ${country}` : city, zoom: 12 };
      }
      case 'PLACE_IN_COUNTRY': return str(a.country) ? { type: 'country', name: a.country, text: a.country, zoom: 5 } : null;
      case 'PLACE_IN_FEATURE': return str(a.feature_name) ? { type: 'feature', name: a.feature_name, text: a.feature_name, zoom: 6 } : null;
      case 'PLACE_IN_SHAPE': {
        if (!Array.isArray(a.center) || typeof a.center[0] !== 'number' || typeof a.center[1] !== 'number') return null;
        const world = a.world === 'moon' ? 'moon' : 'earth';
        return { type: 'shape', center: a.center, world, text: shapeName(a.shape) || '', zoom: world === 'moon' ? 5 : 11 };
      }
    }
    return null;
  }

  const normName = (n) => String(n).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '');

  function zoneCenterFromMap(type, name) {
    const m = map();
    if (!m || !m.getStyle) return null;
    let style;
    try { style = m.getStyle(); } catch (e) { return null; }
    const prefix = `quest-zone-${type}-`;
    const exact = prefix + String(name).replace(/[^a-zA-Z0-9]/g, '_');
    const want = normName(name);
    const ids = Object.keys((style && style.sources) || {}).filter((id) => id.startsWith(prefix));
    ids.sort((a, b) => (b === exact) - (a === exact));
    for (const id of ids) {
      if (id !== exact && normName(id.slice(prefix.length)) !== want) continue;
      let data;
      try { data = m.getSource(id).serialize().data; } catch (e) { continue; }
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      const walk = (c) => {
        if (typeof c[0] === 'number') {
          if (c[0] < minX) minX = c[0]; if (c[0] > maxX) maxX = c[0];
          if (c[1] < minY) minY = c[1]; if (c[1] > maxY) maxY = c[1];
        } else c.forEach(walk);
      };
      const feats = data && data.type === 'FeatureCollection' ? data.features : [data];
      for (const f of feats || []) { const g = f && (f.geometry || f); if (g && g.coordinates) walk(g.coordinates); }
      if (minX === Infinity) continue;
      return { lng: (minX + maxX) / 2, lat: (minY + maxY) / 2 };
    }
    return null;
  }

  function zoneTarget(z) {
    if (z.type === 'shape') {
      const ll = fromGrid(z.center[0] + 0.5, z.center[1] + 0.5, z.world);
      return { latitude: ll.lat, longitude: ll.lng, zoom: z.zoom, world: z.world };
    }
    const key = `${z.type}:${normName(z.name)}`;
    const c = zoneCenterFromMap(z.type, z.name);
    if (c) {
      if (!zoneCache[key] || zoneCache[key].lat !== c.lat || zoneCache[key].lng !== c.lng) {
        zoneCache[key] = c;
        try { localStorage.setItem(LS_ZONES, JSON.stringify(zoneCache)); } catch (e) {}
      }
    }
    const cc = c || zoneCache[key];
    return cc ? { latitude: cc.lat, longitude: cc.lng, zoom: z.zoom, world: 'earth' } : null;
  }

  function goToZone(z) {
    const t = zoneTarget(z);
    if (!t) return false;
    window.dispatchEvent(new CustomEvent('navigate-to-quest-zone', { detail: t }));
    return true;
  }

  function quests() {
    if (!DATA.daily_quests) return null;
    const prog = new Map((DATA.user_quest_progress || []).map((p) => [p.daily_quest_id, p]));
    const order = { to_claim: 0, in_progress: 1, claimed: 2 };
    return DATA.daily_quests.map((d) => {
      const p = prog.get(d.id) || {};
      const tpl = d.quest_templates || {};
      const cat = tpl.achievement_categories || {};
      const status = p.claimed ? 'claimed' : p.completed ? 'to_claim' : 'in_progress';
      return {
        id: d.id, code: tpl.code || '', description: d.description,
        target_value: d.target_value || 0, target_config: d.target_config,
        progress: p.progress || 0, status, color: cat.color || '#8B5CF6',
      };
    }).sort((a, b) => order[a.status] - order[b.status]);
  }

  const VERSION = '3.1.0';
  const DISCORD_INVITE = 'https://discord.gg/p8FEMyrYMS';
  const DISCORD_CONTACT = 'harywayve';
  const GITHUB_URL = 'https://github.com/feverhary/bplace-plus';
  const LS_MODS = 'bplus:modules', LS_SEEN = 'bplus:seen';
  const MOD = { capture: true, palettes: true, goals: true, counts: true, favs: true, friends: true, gameSounds: true };
  try { Object.assign(MOD, JSON.parse(localStorage.getItem(LS_MODS) || '{}')); } catch (e) {}
  function setModule(k, v) {
    MOD[k] = !!v;
    try { localStorage.setItem(LS_MODS, JSON.stringify(MOD)); } catch (e) {}
    applyModules();
  }

  const LS_PINS = 'bplus:pins', LS_POS = 'bplus:hudpos', MARGIN = 16;

  function loadPins() {
    try {
      const a = JSON.parse(localStorage.getItem(LS_PINS) || '[]');
      if (!Array.isArray(a)) return [];
      return a.filter((p) => p && p.type !== 'cat').map((p) => (p.type === 'ach' && p.value === '✓' ? { ...p, value: '', done: false, pct: 0 } : p));
    } catch (e) { return []; }
  }
  function savePins(list) {
    try { localStorage.setItem(LS_PINS, JSON.stringify(list)); } catch (e) {}
  }
  let pins = loadPins();
  savePins(pins);

  const NUM = '[\\d\\s\\u00a0\\u202f.,]+\\s*[kKmMbB]?';
  const PROG_RE = new RegExp(`^\\s*(${NUM})\\s*\\/\\s*(${NUM})\\s*$`);
  function parseNum(str) {
    const t = String(str).replace(/[\s\u00a0\u202f]/g, '');
    const m = /^([\d.,]+)([kmb])?$/i.exec(t);
    if (!m) return 0;
    const mult = { k: 1e3, m: 1e6, b: 1e9 }[(m[2] || '').toLowerCase()] || 1;
    if (mult === 1) return +m[1].replace(/[^\d]/g, '') || 0;
    return (parseFloat(m[1].replace(',', '.')) || 0) * mult;
  }
  function parseProgress(text) {
    const m = PROG_RE.exec(text || '');
    if (!m) return null;
    const cur = parseNum(m[1]), tot = parseNum(m[2]);
    return tot > 0 ? { cur, tot, text: text.trim() } : null;
  }

  function questById(id) {
    const list = quests();
    return list ? list.find((q) => q.id === id) : null;
  }

  function pinView(p) {
    if (p.type === 'quest') {
      if (DATA.daily_quests && p.id && !DATA.daily_quests.some((d) => d.id === p.id)) return { gone: true };
      const q = questById(p.id);
      if (q) {
        const done = q.status !== 'in_progress';
        return { title: questText(q), value: `${fmt(Math.min(q.progress, q.target_value))}/${fmt(q.target_value)}`,
          pct: done ? 1 : (q.target_value ? Math.min(1, q.progress / q.target_value) : 0), color: q.color, done,
          label: T('dailyQuest'), icon: p.icon, tier: null, zone: questZone(q) };
      }
    }
    return { title: p.title, value: p.value, pct: p.done ? 1 : p.pct, color: p.color, done: !!p.done,
      label: p.type === 'quest' ? T('dailyQuest') : (p.group || ''), icon: p.type === 'quest' ? p.icon : null, tier: p.tier ?? null };
  }

  function isPinned(key) { return pins.some((p) => p.key === key); }
  function addPin(info) {
    if (isPinned(info.key)) return;
    pins.push(info);
    savePins(pins);
    renderHud();
    syncPinButtons();
  }
  function unpin(key) {
    pins = pins.filter((p) => p.key !== key);
    savePins(pins);
    finishing.delete(key);
    renderHud();
    syncPinButtons();
  }

  function safeSvg(html) {
    if (!html) return null;
    const t = document.createElement('template');
    t.innerHTML = html;
    const svg = t.content.firstElementChild;
    if (!svg || svg.tagName.toLowerCase() !== 'svg') return null;
    svg.querySelectorAll('script, foreignObject, style').forEach((n) => n.remove());
    for (const n of [svg, ...svg.querySelectorAll('*')]) {
      for (const a of [...n.attributes]) if (/^on|href$/i.test(a.name)) n.removeAttribute(a.name);
    }
    svg.removeAttribute('class');
    svg.removeAttribute('style');
    svg.setAttribute('width', '15');
    svg.setAttribute('height', '15');
    return svg.outerHTML;
  }

  const SEL = {
    quest: 'div[class*="w-[200px]"][class*="shrink-0"][class*="rounded-xl"]',
    ach: 'div[class*="rounded-[20px]"][class*="overflow-hidden"][class*="w-full"]',
  };

  function readCard(type, card) {
    if (type === 'quest') {
      const t = card.querySelector('p[class*="text-[14px]"][class*="font-bold"]');
      const v = card.querySelector('p[class*="text-[12px]"]');
      if (!t) return null;
      const title = t.textContent.trim();
      const q = (quests() || []).find((x) => questText(x) === title);
      const pr = parseProgress(v && v.textContent);
      const done = q ? q.status !== 'in_progress' : !!(pr && pr.cur >= pr.tot);
      const ic = card.querySelector('svg[class*="lucide"]');
      return { key: q ? `q:${q.id}` : `qt:${title}`, type: 'quest', id: q ? q.id : null, title,
        value: pr ? pr.text : '', pct: pr ? Math.min(1, pr.cur / pr.tot) : 0,
        color: q ? q.color : '#8B5CF6', done, pinnable: !done, icon: safeSvg(ic && ic.outerHTML) };
    }
    const t = card.querySelector('p[class*="text-[16px]"]');
    if (!t) return null;
    let pr = null;
    for (const e of card.querySelectorAll('span, p, div')) {
      if (e.children.length || e.closest('.bpc')) continue;
      pr = parseProgress(e.textContent);
      if (pr) break;
    }
    const style = card.getAttribute('style') || '';
    const doneTone = style.includes('134, 239, 172');
    const rgb = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(style);
    const done = doneTone || !pr || pr.cur >= pr.tot;
    let group = '', tier = null;
    const head = card.querySelector('[class*="border-b"]');
    if (head) {
      const m = /^\s*(\d+)\s*(.*?)\s*$/s.exec(head.textContent || '');
      if (m) { tier = +m[1]; group = m[2]; } else group = (head.textContent || '').trim();
    }
    const ad = achData(card);
    const info = { key: `a:${t.textContent.trim()}`, type: 'ach', title: t.textContent.trim(),
      value: pr ? pr.text : '', pct: pr ? Math.min(1, pr.cur / pr.tot) : 1,
      color: rgb && !doneTone ? `rgb(${rgb[1]}, ${rgb[2]}, ${rgb[3]})` : '#8B5CF6', done, pinnable: !done, group, tier };
    if (ad) { info.achId = ad.id; info.catId = ad.catId; }
    return info;
  }

  function achData(card) {
    const k = Object.keys(card).find((x) => x.startsWith('__reactFiber$'));
    if (!k) return null;
    const pick = (p) => {
      if (!p || typeof p !== 'object' || !p.categoryId) return null;
      if (p.achievement && p.achievement.id) return { id: p.achievement.id, catId: p.categoryId };
      if (p.group && p.group.current && p.group.current.id) return { id: p.group.current.id, catId: p.categoryId };
      return null;
    };
    // la carte (M1) contient le composant du succès : chercher dans ses enfants, puis dans ses parents
    const start = card[k];
    const queue = [start.child].filter(Boolean);
    let n = 0;
    while (queue.length && n++ < 60) {
      const f = queue.shift();
      const r = pick(f.memoizedProps);
      if (r) return r;
      if (f.child) queue.push(f.child);
      if (f.sibling && f !== start) queue.push(f.sibling);
    }
    let f = start;
    for (let i = 0; f && i < 6; i++, f = f.return) { const r = pick(f.memoizedProps); if (r) return r; }
    return null;
  }

  /* mise à jour des objectifs épinglés sans ouvrir leur page */
  const compactNum = (n) => {
    const f = (v, u) => `${(Math.floor(v * 10) / 10).toFixed(1).replace(/\.0$/, '')}${u}`;
    return n < 1000 ? String(n) : n < 1e6 ? f(n / 1e3, 'k') : n < 1e9 ? f(n / 1e6, 'M') : f(n / 1e9, 'B');
  };
  let goalsBusy = false, goalsAt = 0;
  async function refreshGoals(force) {
    if (!MOD.goals || goalsBusy || (!force && Date.now() - goalsAt < 40000) || document.hidden) return;
    const achPins = pins.filter((p) => p.type === 'ach' && p.achId && p.catId && !p.done);
    const hasQuest = pins.some((p) => p.type === 'quest' && !p.done);
    if (!achPins.length && !hasQuest) return;
    goalsBusy = true; goalsAt = Date.now();
    try {
      if (hasQuest) { const qc = siteQueryClient(); if (qc) try { qc.invalidateQueries({ queryKey: ['daily-quests'] }); } catch (e) {} }
      if (!achPins.length) return;
      const c = await siteClient();
      if (!c) return;
      const { data } = await c.auth.getSession();
      const me = data && data.session && data.session.user && data.session.user.id;
      if (!me) return;
      let changed = false;
      for (const cat of [...new Set(achPins.map((p) => p.catId))]) {
        const { data: rows, error } = await c.rpc('get_user_achievements', { p_user_id: me, p_category_id: cat });
        if (error || !Array.isArray(rows)) continue;
        for (const p of achPins.filter((x) => x.catId === cat)) {
          const a = rows.find((r) => r.id === p.achId);
          if (!a) continue;
          const cur = Number(a.current_value) || 0, tot = Number(a.condition_value) || 0;
          if (!tot) continue;
          const upd = { value: `${compactNum(Math.min(cur, tot))}/${compactNum(tot)}`, pct: Math.min(1, cur / tot),
            done: a.status === 'to_claim' || a.status === 'claimed' || cur >= tot };
          if (Object.keys(upd).some((k) => p[k] !== upd[k])) { Object.assign(p, upd); changed = true; }
        }
      }
      if (changed) { savePins(pins); renderHud(); }
    } catch (e) {} finally { goalsBusy = false; }
  }
  setInterval(() => refreshGoals(false), 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshGoals(true); });
  window.addEventListener('focus', () => refreshGoals(false));

  function syncPinButtons() {
    document.querySelectorAll('.bplus-pin').forEach((b) => {
      b.classList.toggle('on', isPinned(b.dataset.key));
      b.title = b.classList.contains('on') ? T('unpin') : T('pin');
    });
  }

  function scanCards() {
    if (!MOD.goals) { document.querySelectorAll('.bplus-pin').forEach((b) => b.remove()); return; }
    let changed = false;
    for (const type of ['quest', 'ach']) {
      for (const card of document.querySelectorAll(SEL[type])) {
        if (card.closest('.bpc')) continue;
        const info = readCard(type, card);
        let btn = card.querySelector(':scope > .bplus-pin');
        if (!info || (!info.pinnable && !isPinned(info.key))) {
          if (btn) btn.remove();
        } else {
          if (!btn) {
            btn = el('span', 'bpc bplus-pin', ICON.pin);
            btn.setAttribute('role', 'button');
            const stop = (e) => { e.stopPropagation(); };
            btn.addEventListener('pointerdown', stop);
            btn.addEventListener('mousedown', stop);
            btn.addEventListener('click', (e) => {
              e.preventDefault(); e.stopPropagation();
              const fresh = readCard(type, card);
              if (!fresh) return;
              if (isPinned(fresh.key)) unpin(fresh.key);
              else if (fresh.pinnable) { delete fresh.pinnable; addPin(fresh); }
            });
            if (getComputedStyle(card).position === 'static') card.style.position = 'relative';
            card.appendChild(btn);
          }
          btn.dataset.key = info.key;
        }
        if (!info) continue;
        let p = pins.find((x) => x.key === info.key);
        if (!p && info.type === 'ach' && info.tier != null) {
          p = pins.find((x) => x.type === 'ach' && x.tier === info.tier && x.color === info.color && Math.abs((x.pct || 0) - info.pct) < 0.02
            && ![...document.querySelectorAll('.bplus-pin')].some((b) => b.dataset.key === x.key));
          if (p) { p.key = info.key; changed = true; if (btn) btn.dataset.key = info.key; }
        }
        if (p) {
          const upd = { title: info.title, value: info.value, pct: info.pct, color: info.color, done: info.done };
          if (info.icon) upd.icon = info.icon;
          if (info.group) upd.group = info.group;
          if (info.tier != null) upd.tier = info.tier;
          if (info.achId) { upd.achId = info.achId; upd.catId = info.catId; }
          if (Object.keys(upd).some((k) => p[k] !== upd[k])) { Object.assign(p, upd); changed = true; }
        }
      }
    }
    if (changed) { savePins(pins); renderHud(); }
    syncPinButtons();
  }

  let hud = null, hudPos = null;
  try { hudPos = JSON.parse(localStorage.getItem(LS_POS) || 'null'); } catch (e) {}

  function panelAt(x, y, cache) {
    const vw = innerWidth, vh = innerHeight;
    for (const e of document.elementsFromPoint(x, y)) {
      if (e === document.documentElement || e === document.body) continue;
      if ((e.closest('.bpc') && !e.closest('.bplus-sheet')) || e.closest('.maplibregl-map')) continue;
      const r0 = e.getBoundingClientRect();
      if (r0.width >= vw * 0.9 && r0.height >= vh * 0.9) continue;
      if (cache && cache.has(e)) return cache.get(e);
      let top = e;
      for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) {
        const r = p.getBoundingClientRect();
        if (r.width >= vw * 0.9 && r.height >= vh * 0.9) break;
        if (r.width > 0 && r.height > 0) top = p;
      }
      const rect = top.getBoundingClientRect();
      if (cache) cache.set(e, rect);
      return rect;
    }
    return null;
  }
  const isBar = (r) => r.width >= innerWidth * 0.6 && r.height <= innerHeight * 0.6;
  const isSide = (r) => r.width < innerWidth * 0.6;

  function sideLimits(top, h, cache) {
    const step = 16, cols = Math.ceil(innerWidth / step);
    const ys = [top + 8, top + h / 2, top + h - 8].map((y) => Math.min(innerHeight - 1, Math.max(0, y)));
    const hit = (x) => ys.some((y) => { const r = panelAt(x, y, cache); return !!r && isSide(r); });
    const blocked = new Array(cols).fill(false);
    for (let c = 0; c < cols; c++) blocked[c] = hit(Math.min(innerWidth - 1, c * step + step / 2));
    const run = (from, dir) => {
      let last = null, gap = 0;
      for (let c = from; c >= 0 && c < cols; c += dir) {
        if (blocked[c]) { last = c; gap = 0; } else if (++gap * step > (last === null ? 48 : 24)) break;
      }
      return last;
    };
    const r = run(cols - 1, -1), l = run(0, 1);
    const edge = (lo, hi, wantBlockedAtHi) => {
      lo = Math.max(0, lo); hi = Math.min(innerWidth - 1, hi);
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (hit(mid) === wantBlockedAtHi) hi = mid; else lo = mid;
      }
      return hi;
    };
    return {
      left: l === null ? 0 : edge(l * step + step / 2, (l + 1) * step + step / 2, false),
      right: r === null ? innerWidth : edge(r * step - step / 2, r * step + step / 2, true),
    };
  }

  function avoidBars(left, top, w, h, cache) {
    for (let pass = 0; pass < 3; pass++) {
      const bars = [];
      for (const fx of [0.06, 0.5, 0.94]) {
        for (let y = top; y <= top + h; y += 14) {
          const r = panelAt(left + w * fx, Math.min(innerHeight - 1, Math.max(0, y)), cache);
          if (r && isBar(r) && !bars.some((b) => b.top === r.top && b.bottom === r.bottom)) bars.push(r);
        }
      }
      if (!bars.length) break;
      let moved = false;
      for (const r of bars) {
        const below = r.top + r.height / 2 > top + h / 2;
        const nt = below ? Math.round(r.top - MARGIN - h) : Math.round(r.bottom + MARGIN);
        if (nt !== top) { top = nt; moved = true; }
      }
      top = Math.min(Math.max(MARGIN, top), Math.max(MARGIN, innerHeight - h - MARGIN));
      if (!moved) break;
    }
    return top;
  }

  function placeHud() {
    if (!hud || hud.classList.contains('drag')) return;
    const w = hud.offsetWidth, h = hud.offsetHeight;
    const pos = hudPos || { side: 'right', y: 0.12 };
    const maxY = Math.max(MARGIN, innerHeight - h - MARGIN);
    let top = Math.round(MARGIN + (maxY - MARGIN) * Math.min(1, Math.max(0, pos.y)));
    const cache = new Map();
    const lim = sideLimits(top, h, cache);
    const lo = lim.left > 0 ? lim.left + MARGIN : MARGIN;
    const hi = lim.right < innerWidth ? lim.right - MARGIN : innerWidth - MARGIN;
    let left;
    if (hi - lo >= w) left = pos.side === 'left' ? lo : hi - w;
    else left = pos.side === 'left' ? MARGIN : innerWidth - w - MARGIN;
    left = Math.round(Math.min(Math.max(MARGIN, left), Math.max(MARGIN, innerWidth - w - MARGIN)));
    top = avoidBars(left, top, w, h, cache);
    for (const ob of [fab, panel]) {
      if (!ob || !ob.isConnected) continue;
      const r = ob.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const hit = left < r.right + MARGIN && left + w > r.left - MARGIN && top < r.bottom + MARGIN && top + h > r.top - MARGIN;
      if (!hit) continue;
      const up = Math.round(r.top - MARGIN - h);
      const down = Math.round(r.bottom + MARGIN);
      if (up >= MARGIN) top = up;
      else if (down + h <= innerHeight - MARGIN) top = down;
      else left = Math.round(Math.min(r.right + MARGIN, Math.max(MARGIN, innerWidth - w - MARGIN)));
    }
    if (hud.style.left !== left + 'px') hud.style.left = left + 'px';
    if (hud.style.top !== top + 'px') hud.style.top = top + 'px';
  }

  function makeDraggable(node) {
    let start = null;
    node.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('.bpc-hq-x') || e.target.closest('.bpc-loc') || e.target.closest('.bpc-hh-t')) return;
      const r = node.getBoundingClientRect();
      start = { x: e.clientX, y: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false };
      node.setPointerCapture(e.pointerId);
    });
    node.addEventListener('pointermove', (e) => {
      if (!start) return;
      if (!start.moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 4) return;
      if (!start.moved) playSound('grab');
      start.moved = true;
      node.classList.add('drag');
      const w = node.offsetWidth, h = node.offsetHeight;
      node.style.left = Math.min(innerWidth - w, Math.max(0, e.clientX - start.dx)) + 'px';
      node.style.top = Math.min(innerHeight - h, Math.max(0, e.clientY - start.dy)) + 'px';
    });
    const end = () => {
      if (!start) return;
      const moved = start.moved;
      start = null;
      node.classList.remove('drag');
      if (!moved) return;
      playSound('drop');
      const r = node.getBoundingClientRect();
      const maxY = Math.max(MARGIN, innerHeight - r.height - MARGIN);
      hudPos = {
        side: r.left + r.width / 2 < innerWidth / 2 ? 'left' : 'right',
        y: maxY > MARGIN ? Math.min(1, Math.max(0, (r.top - MARGIN) / (maxY - MARGIN))) : 0,
      };
      try { localStorage.setItem(LS_POS, JSON.stringify(hudPos)); } catch (e) {}
      placeHud();
    };
    node.addEventListener('pointerup', end);
    node.addEventListener('pointercancel', end);
  }

  const finishing = new Map();
  const rows = new Map();

  function finish(key) {
    if (finishing.has(key)) return;
    const row = rows.get(key);
    finishing.set(key, setTimeout(() => {
      const r = rows.get(key);
      playSound('goal');
      if (!r) { unpin(key); return; }
      r.style.height = r.offsetHeight + 'px';
      r.offsetHeight;
      r.classList.add('leaving');
      setTimeout(() => unpin(key), 520);
    }, 1600));
    if (row) row.classList.add('finished');
  }

  const LS_COLL = 'bplus:hudcollapsed';
  let hudCollapsed = false;
  try { hudCollapsed = localStorage.getItem(LS_COLL) === '1'; } catch (e) {}
  function syncCollapseBtn() {
    const b = hud && hud.querySelector('.bpc-hh-t');
    if (!b) return;
    const t = hudCollapsed ? T('expand') : T('collapse');
    b.title = t; b.setAttribute('aria-label', t); b.setAttribute('aria-expanded', String(!hudCollapsed));
  }

  function renderHud() {
    if (!document.body || !fab) return;
    if (!MOD.goals) { if (hud) { hud.remove(); hud = null; rows.clear(); } return; }
    const views = pins.map((p) => ({ p, v: pinView(p) }));
    const gone = views.filter((x) => x.v.gone).map((x) => x.p.key);
    if (gone.length) { pins = pins.filter((p) => !gone.includes(p.key)); savePins(pins); syncPinButtons(); }
    const shown = views.filter((x) => !x.v.gone);
    if (!shown.length) {
      if (hud) { hud.remove(); hud = null; rows.clear(); }
      return;
    }
    if (!hud) {
      hud = el('div', `bpc bpc-hud ${surface}`);
      hud.innerHTML = `<div class="bpc-hh">${ICON.pin}<span></span><b class="bpc-hh-n"></b><button class="bpc-hh-t" type="button">${ICON.chevDown}</button></div><div class="bpc-hlw"><div class="bpc-hl"></div></div>`;
      hud.classList.toggle('collapsed', hudCollapsed);
      hud.querySelector('.bpc-hh-t').addEventListener('click', (e) => {
        e.stopPropagation();
        hudCollapsed = !hudCollapsed;
        try { localStorage.setItem(LS_COLL, hudCollapsed ? '1' : '0'); } catch (er) {}
        hud.classList.toggle('collapsed', hudCollapsed);
        syncCollapseBtn();
        setTimeout(placeHud, 380);
      });
      makeDraggable(hud);
      document.body.appendChild(hud);
      const h = hud;
      requestAnimationFrame(() => requestAnimationFrame(() => h.classList.add('ready')));
    }
    hud.querySelector('.bpc-hh span').textContent = T('goals');
    hud.querySelector('.bpc-hh-n').textContent = shown.length;
    syncCollapseBtn();
    const list = hud.querySelector('.bpc-hl');
    const keep = new Set(shown.map((x) => x.p.key));
    for (const [k, r] of rows) if (!keep.has(k)) { r.remove(); rows.delete(k); }
    for (const { p, v } of shown) {
      let row = rows.get(p.key);
      if (!row) {
        row = el('div', 'bpc-hq');
        row.innerHTML = `<span class="qring"><svg viewBox="0 0 36 36"><circle class="bg" cx="18" cy="18" r="15.5"/><circle class="fg" cx="18" cy="18" r="15.5" pathLength="100"/></svg><span class="in"></span></span><span class="body"><span class="lbl"></span><span class="txt"></span></span><span class="val"></span><button class="bpc-hq-x" title="${T('unpin')}">${ICON.x}</button>`;
        row.querySelector('.bpc-hq-x').onclick = () => unpin(p.key);
        rows.set(p.key, row);
      }
      list.appendChild(row);
      row.querySelector('.bpc-hq-x').title = T('unpin');
      row.style.setProperty('--qc', v.color);
      const txt = row.querySelector('.txt');
      const z = v.zone && v.zone.text && !v.done ? v.zone : null;
      const at = z ? v.title.lastIndexOf(z.text) : -1;
      const sig = `${v.title}|${at >= 0 ? z.text : ''}`;
      if (txt.dataset.sig !== sig) {
        txt.dataset.sig = sig;
        txt.textContent = '';
        if (at >= 0) {
          const loc = el('span', 'bpc-loc');
          loc.setAttribute('role', 'button');
          loc.textContent = z.text;
          txt.append(v.title.slice(0, at), loc, v.title.slice(at + z.text.length));
        } else txt.textContent = v.title;
      }
      const locEl = txt.querySelector('.bpc-loc');
      if (locEl) {
        locEl.onclick = (e) => {
          e.stopPropagation();
          if (!goToZone(z)) { locEl.classList.add('nozone'); setTimeout(() => locEl.classList.remove('nozone'), 600); }
        };
      }
      const lbl = row.querySelector('.lbl');
      lbl.textContent = v.label || '';
      lbl.hidden = !v.label;
      row.querySelector('.val').textContent = v.done ? '' : v.value;
      row.querySelector('.qring .fg').style.strokeDasharray = `${(v.pct * 100).toFixed(1)} 100`;
      const inner = row.querySelector('.in');
      const innerKey = v.done ? 'done' : (v.tier != null ? `t${v.tier}` : (v.icon || 'default'));
      if (inner.dataset.k !== innerKey) {
        inner.dataset.k = innerKey;
        if (v.done) inner.innerHTML = ICON.check;
        else if (v.tier != null) inner.textContent = v.tier;
        else inner.innerHTML = v.icon || ICON.target;
      }
      if (v.done) finish(p.key);
      else if (finishing.has(p.key)) { clearTimeout(finishing.get(p.key)); finishing.delete(p.key); row.classList.remove('finished', 'leaving'); row.style.height = ''; }
    }
    placeHud();
  }

  const CHANGELOG = [
    { v: '3.1', date: '2026-11-09',
      fr: { t: 'Bplace+', i: [
        'Objectifs : épingle les quêtes et succès, suivis en direct dans un widget déplaçable qui évite les menus du site',
        "Lieux cliquables : cliquer sur le lieu d'une quête déplace la caméra, sur Terre comme sur la Lune",
        'Menu Bplace+ dans le menu du logo : modules à activer ou désactiver, journal des nouveautés',
        "11 langues : l'extension suit la langue de ton compte",
        'Compteurs de template : le nombre de pixels restants s\u2019affiche sur chaque couleur en mode Peindre',
        'Favoris : une étoile dans la fiche d\u2019un pixel, un onglet dans les épingles et des étoiles sur la carte, regroupées avec tes épingles',
        'Sons : la page Sons des paramètres est active, avec les sons de Bplace+ et un module de sons pour le jeu (boutons, pixels, peinture)',
        'Guildes : bouton pour ajouter un membre en ami et badge Ami',
        'Palettes .kpl simplifiées : couleurs de base, mes couleurs, toutes les couleurs',
        'Nouveau logo',
      ] },
      en: { t: 'Bplace+', i: [
        'Goals: pin quests and achievements, tracked live in a draggable widget that avoids site menus',
        'Clickable places: clicking a quest location moves the camera, on Earth and on the Moon',
        'Bplace+ entry in the logo menu: modules to turn on or off, update log',
        '11 languages: the extension follows your account language',
        'Template counters: remaining pixels are shown on each color in paint mode',
        'Favorites: a star in the pixel card, a tab in pins and stars on the map, grouped with your pins',
        'Sounds: the Sounds settings page now works, with Bplace+ sounds and a game sounds module (buttons, pixels, painting)',
        'Guilds: add-friend button and Friend badge in the member list',
        'Simpler .kpl palettes: base colors, my colors, all colors',
        'New logo',
      ] } },
    { v: '2.1', date: '2026-11-08',
      fr: { t: 'Terre et Lune', i: ['Passer de la Terre à la Lune ne demande plus de recharger la page'] },
      en: { t: 'Earth and Moon', i: ['Switching between Earth and Moon no longer requires a page reload'] } },
    { v: '2.0', date: '2026-11-07',
      fr: { t: 'Capture et palettes', i: ['Capture exacte au pixel près, fond transparent, coordonnées réelles', 'Export des palettes .kpl pour Krita'] },
      en: { t: 'Capture and palettes', i: ['Pixel-perfect capture with transparent background and real coordinates', '.kpl palette export for Krita'] } },
  ];

  const hasNews = () => { try { return localStorage.getItem(LS_SEEN) !== CHANGELOG[0].v; } catch (e) { return false; } };
  const markSeen = () => { try { localStorage.setItem(LS_SEEN, CHANGELOG[0].v); } catch (e) {} injectMenuItem(true); };

  function updateFabTip() {
    if (!fab) return;
    const lbl = fab.querySelector('.bpc-tip .lbl');
    const kbd = fab.querySelector('.bpc-tip kbd');
    const name = MOD.capture ? T('capture') : T('palette');
    if (lbl) lbl.textContent = name;
    if (kbd) { kbd.textContent = T('shortcut'); kbd.hidden = !MOD.capture; }
    fab.setAttribute('aria-label', name);
  }

  function applyModules() {
    if (fab) fab.style.display = MOD.capture || MOD.palettes ? '' : 'none';
    updateFabTip();
    if (!MOD.capture && cancelSelection) cancelSelection();
    if (panel && panel.classList.contains('bpc-menu')) { closePanel(); }
    if (!MOD.capture && panel && !panel.classList.contains('bpc-menu')) closePanel();
    scanCards();
    renderHud();
    updateBadges();
    refreshFavSource();
    ensureFavLayer();
    if (!MOD.favs) closeFavView();
    injectFavTab();
    injectPixelStar();
    injectFriends();
  }


  /* compteurs de template */
  const SWATCH_SEL = 'button[class*="w-8"][class*="h-8"][class*="rounded-full"]';
  let badgeLayer = null, badgeRaf = 0, badgeLast = 0;
  const badges = new Map();

  function swatchProps(btn) {
    const k = Object.keys(btn).find((x) => x.startsWith('__reactFiber$'));
    if (!k) return null;
    let f = btn[k];
    for (let i = 0; f && i < 12; i++, f = f.return) {
      const p = f.memoizedProps;
      if (p && typeof p === 'object' && 'remainingCount' in p && 'color' in p) return p;
    }
    return null;
  }

  const compact = (n) => (n < 1000 ? String(n) : n < 10000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : `${Math.round(n / 1000)}k`);

  function clearBadges() {
    for (const el of badges.values()) el.remove();
    badges.clear();
  }

  function updateBadges() {
    if (!MOD.counts || !document.body) { clearBadges(); return false; }
    const btns = document.querySelectorAll(SWATCH_SEL);
    const seen = new Set();
    for (const b of btns) {
      if (b.closest('.bpc')) continue;
      const p = swatchProps(b);
      const n = p && typeof p.remainingCount === 'number' && !p.isLocked ? p.remainingCount : 0;
      if (n <= 0) continue;
      const r = b.getBoundingClientRect();
      if (!r.width || r.bottom < 0 || r.top > innerHeight) continue;
      if (!badgeLayer || !badgeLayer.isConnected) { badgeLayer = el('div', 'bpc bplus-badges'); document.body.appendChild(badgeLayer); }
      let bd = badges.get(b);
      if (!bd) { bd = el('span', 'bplus-badge'); badgeLayer.appendChild(bd); badges.set(b, bd); }
      const txt = compact(n);
      if (bd.textContent !== txt) bd.textContent = txt;
      bd.style.transform = `translate(${Math.round(r.right - 10)}px, ${Math.round(r.top - 7)}px)`;
      seen.add(b);
    }
    for (const [b, bd] of badges) if (!seen.has(b)) { bd.remove(); badges.delete(b); }
    return btns.length > 0;
  }

  function badgeLoop(t) {
    badgeRaf = 0;
    const active = updateBadges();
    if (active) badgeRaf = requestAnimationFrame(badgeLoop);
  }
  function kickBadges() {
    if (!badgeRaf && MOD.counts) badgeRaf = requestAnimationFrame(badgeLoop);
  }

  /* favoris */
  const LS_FAVS = 'bplus:favs';
  let favs = [];
  try { favs = JSON.parse(localStorage.getItem(LS_FAVS) || '[]'); if (!Array.isArray(favs)) favs = []; } catch (e) { favs = []; }
  const saveFavs = () => { try { localStorage.setItem(LS_FAVS, JSON.stringify(favs)); } catch (e) {} refreshFavSource(); ensureFavLayer(); renderFavList(); document.querySelectorAll('.bplus-star-btn').forEach(syncStar); };

  /* favoris sur la carte : fusionnés dans les épingles du site (même regroupement, même chiffre) */
  const PIN_SRC = 'pins-cluster-source';
  const FAV_KIND = 'bplus-fav';
  const FAV_COLOR = '#F59E0B';
  const showZoom = () => (currentWorld() === 'moon' ? 4 : 9);
  const hideZoom = () => (currentWorld() === 'moon' ? 10.5 : 16);

  function favFeatures() {
    const w = currentWorld();
    if (!MOD.favs || !w) return [];
    return favs.filter((f) => f.world === w).map((f) => {
      const ll = fromGrid(f.x + 0.5, f.y + 0.5, w);
      return { type: 'Feature', geometry: { type: 'Point', coordinates: [ll.lng, ll.lat] },
        properties: { uid: `bplus:${f.id}`, id: f.id, kind: FAV_KIND, name: f.name, zoom: f.zoom } };
    });
  }
  const isFC = (d) => d && typeof d === 'object' && d.type === 'FeatureCollection' && Array.isArray(d.features);
  const siteOnly = (d) => ({ ...d, features: d.features.filter((f) => !(f.properties && f.properties.kind === FAV_KIND)) });
  const withFavs = (d) => ({ ...d, features: [...d.features, ...favFeatures()] });

  function patchPinSource(src) {
    if (!src || src.__bplus || typeof src.setData !== 'function') return;
    src.__bplus = true;
    const raw = src._data && (src._data.geojson || src._data);
    src.__bplusSite = isFC(raw) ? siteOnly(raw) : { type: 'FeatureCollection', features: [] };
    const orig = src.setData;
    src.setData = function (d, ...a) {
      if (isFC(d)) { src.__bplusSite = siteOnly(d); d = withFavs(src.__bplusSite); }
      return orig.call(this, d, ...a);
    };
    src.setData(src.__bplusSite);
  }

  function patchMap(m) {
    if (m.__bplusFav) return;
    m.__bplusFav = true;
    const add = m.addSource;
    m.addSource = function (id, spec, ...a) {
      if (id === PIN_SRC && spec && isFC(spec.data)) spec = { ...spec, data: withFavs(siteOnly(spec.data)) };
      const r = add.call(this, id, spec, ...a);
      if (id === PIN_SRC) { try { patchPinSource(this.getSource(id)); } catch (e) {} }
      return r;
    };
    let raf = 0;
    const later = () => { if (!raf) raf = setTimeout(() => { raf = 0; renderFavMarkers(); }, 30); };
    m.on('move', placeFavMarkers);
    m.on('zoom', later);
    m.on('moveend', later);
    m.on('sourcedata', (e) => { if (e && e.sourceId === PIN_SRC) later(); });
  }

  function refreshFavSource() {
    const m = map();
    const src = m && m.getSource && m.getSource(PIN_SRC);
    if (src && src.__bplus) src.setData(src.__bplusSite);
  }

  function ensureFavLayer() {
    const m = map();
    if (!m || typeof m.getSource !== 'function') return;
    patchMap(m);
    try { patchPinSource(m.getSource(PIN_SRC)); } catch (e) {}
    renderFavMarkers();
  }

  const STAR_D = 'M20 2.5c.6 0 1.1.3 1.4.9l4.3 8.6 9.5 1.4c1.3.2 1.8 1.8.9 2.7l-6.9 6.7 1.6 9.5c.2 1.3-1.1 2.2-2.3 1.6L20 29.4l-8.5 4.5c-1.2.6-2.5-.3-2.3-1.6l1.6-9.5-6.9-6.7c-.9-.9-.4-2.5.9-2.7l9.5-1.4 4.3-8.6c.3-.6.8-.9 1.4-.9z';
  function favMarkerSvg(uid) {
    const g = `bpg_${uid}`, h = `bph_${uid}`;
    return `<svg width="52" height="52" viewBox="-6 -6 52 52" overflow="visible" style="overflow:visible;display:block"><defs>`
      + `<linearGradient id="${g}" x1="18.778" y1="26.732" x2="26.3337" y2="4.95442" gradientUnits="userSpaceOnUse"><stop stop-color="${FAV_COLOR}" stop-opacity="0.1"/><stop offset="0.639423" stop-color="${FAV_COLOR}" stop-opacity="0.7"/><stop offset="1" stop-color="${FAV_COLOR}"/></linearGradient>`
      + `<linearGradient id="${h}" x1="9.44428" y1="28.7317" x2="29.2221" y2="8.28727" gradientUnits="userSpaceOnUse"><stop stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient></defs><g>`
      + `<path d="${STAR_D}" fill="#ffffff" stroke="#ffffff" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>`
      + `<path d="${STAR_D}" fill="url(#${g})"/><path d="${STAR_D}" fill="url(#${h})" opacity=".55"/>`
      + `<path d="${STAR_D}" fill="none" stroke="${FAV_COLOR}" stroke-width="1.4" stroke-linejoin="round"/></g></svg>`;
  }

  const favMarkers = new Map();
  function makeFavMarker(f) {
    const root = el('div', 'bplus-fm');
    root.innerHTML = `<div class="bplus-fm-c"><div class="bplus-fm-a" role="button">${favMarkerSvg(f.id.replace(/[^a-zA-Z0-9]/g, ''))}</div></div>`;
    const a = root.querySelector('.bplus-fm-a');
    a.addEventListener('click', (e) => { e.stopPropagation(); const cur = favs.find((x) => x.id === f.id); if (cur) goToFav(cur); });
    a.addEventListener('mouseenter', () => { a.classList.remove('in'); a.classList.add('hov'); });
    a.addEventListener('mouseleave', () => a.classList.remove('hov'));
    a.addEventListener('animationend', () => a.classList.remove('in'));
    return root;
  }
  function popIn(rec) { const a = rec.el.querySelector('.bplus-fm-a'); a.classList.remove('in'); void a.offsetWidth; a.classList.add('in'); }

  function clearFavMarkers() { for (const r of favMarkers.values()) r.el.remove(); favMarkers.clear(); }

  function renderFavMarkers() {
    const m = map();
    if (!m || !MOD.favs || typeof m.querySourceFeatures !== 'function' || !m.getSource(PIN_SRC)) { clearFavMarkers(); return; }
    const host = m.getCanvasContainer && m.getCanvasContainer();
    if (!host) return;
    const z = m.getZoom(), w = currentWorld();
    const hidden = z >= hideZoom();
    let feats = [];
    if (hidden) feats = [];
    else if (z >= showZoom()) feats = favs.filter((f) => f.world === w).map((f) => ({ properties: { id: f.id } }));
    else { try { feats = m.querySourceFeatures(PIN_SRC, { filter: ['==', ['get', 'kind'], FAV_KIND] }); } catch (e) { feats = []; } }
    const keep = new Set();
    for (const ft of feats) {
      const id = ft.properties && ft.properties.id;
      const f = favs.find((x) => x.id === id);
      if (!f || keep.has(id)) continue;
      keep.add(id);
      let rec = favMarkers.get(id);
      if (!rec || rec.el.parentNode !== host) {
        if (rec) rec.el.remove();
        rec = { el: makeFavMarker(f), f };
        favMarkers.set(id, rec);
        host.appendChild(rec.el);
        popIn(rec);
      } else if (rec.el.style.display === 'none') { rec.el.style.display = ''; popIn(rec); }
      rec.f = f;
      rec.el.querySelector('.bplus-fm-a').title = f.name;
    }
    for (const [id, rec] of favMarkers) {
      if (keep.has(id)) continue;
      if (hidden && favs.some((x) => x.id === id)) rec.el.style.display = 'none';
      else { rec.el.remove(); favMarkers.delete(id); }
    }
    placeFavMarkers();
  }

  function placeFavMarkers() {
    const m = map();
    if (!m || !favMarkers.size) return;
    for (const rec of favMarkers.values()) {
      if (rec.el.style.display === 'none') continue;
      const ll = fromGrid(rec.f.x + 0.5, rec.f.y + 0.5, rec.f.world);
      const pt = m.project([ll.lng, ll.lat]);
      rec.el.style.transform = `translate(${Math.round(pt.x)}px, ${Math.round(pt.y)}px)`;
    }
  }

  function goToFav(f) {
    const ll = fromGrid(f.x + 0.5, f.y + 0.5, f.world);
    window.dispatchEvent(new CustomEvent('navigate-to-quest-zone', { detail: { latitude: ll.lat, longitude: ll.lng, zoom: f.zoom, world: f.world } }));
  }

  async function makeThumb(world, cx, cy) {
    const m = map();
    let w = 120, h = 80;
    try {
      const b = m.getBounds();
      const a = toGrid({ lng: b.getWest(), lat: b.getNorth() }, world), c = toGrid({ lng: b.getEast(), lat: b.getSouth() }, world);
      w = Math.max(30, c.x - a.x); h = Math.max(20, c.y - a.y);
    } catch (e) {}
    if (w / h > 1.5) w = h * 1.5; else h = w / 1.5;
    w = Math.round(Math.min(w, 600)); h = Math.round(Math.min(h, 400));
    const x0 = Math.max(0, Math.round(cx - w / 2)), y0 = Math.max(0, Math.round(cy - h / 2));
    const out = document.createElement('canvas');
    out.width = 150; out.height = 100;
    const g = out.getContext('2d');
    g.fillStyle = '#F1F1F1'; g.fillRect(0, 0, 150, 100);
    try {
      const res = await fetchRegion(x0, y0, w, h, world);
      g.imageSmoothingEnabled = false;
      g.drawImage(res.canvas, 0, 0, 150, 100);
    } catch (e) {}
    return out.toDataURL('image/png');
  }

  const FAV_MIN_DIST = 10;
  const favNear = (world, x, y) => favs.find((f) => f.world === world && Math.hypot(f.x - x, f.y - y) < FAV_MIN_DIST);

  async function addFavAt(world, x, y, name) {
    const m = map();
    if (!world || favNear(world, x, y)) return null;
    const f = { id: `f${Date.now().toString(36)}`, name: name || `${T('favName')} ${favs.length + 1}`, world, x, y,
      zoom: m ? Math.max(14, Math.round(m.getZoom() * 10) / 10) : 16, createdAt: Date.now(), thumb: null };
    favs.unshift(f);
    saveFavs();
    makeThumb(world, x, y).then((t) => { f.thumb = t; saveFavs(); }).catch(() => {});
    return f;
  }

  /* étoile dans la fiche d'un pixel */
  const COORD_RE = /X\D{0,4}?(\d+)\s*-\s*Y\D{0,4}?(\d+)/;
  function pixelPopups() {
    const out = [];
    for (const pop of document.querySelectorAll('div.fixed[class*="max-w-[400px]"]')) {
      const hd = pop.querySelector(':scope > div[class*="justify-between"]');
      const body = pop.querySelector(':scope > div[class*="space-y-3"]');
      if (!hd || !body) continue;
      const share = hd.firstElementChild;
      if (!share || share.tagName !== 'BUTTON' || share.classList.contains('bplus-star-btn')) continue;
      let pos = null, name = null;
      for (const d of body.querySelectorAll('div')) {
        if (d.children.length) continue;
        const mm = COORD_RE.exec(d.textContent.replace(/ /g, ' '));
        if (mm) { pos = { x: +mm[1], y: +mm[2] }; break; }
      }
      if (!pos) continue;
      const chip = body.querySelector(':scope > div[class*="flex-wrap"] > button');
      if (chip) name = chip.textContent.replace(/^[\u{1F1E6}-\u{1F1FF}\s]+/u, '').trim() || null;
      out.push({ pop, hd, share, pos, name });
    }
    return out;
  }

  function injectPixelStar() {
    const list = MOD.favs ? pixelPopups() : [];
    document.querySelectorAll('.bplus-star-btn').forEach((b) => { if (!list.some((p) => p.hd === b.parentElement)) b.remove(); });
    const world = currentWorld();
    for (const p of list) {
      let b = p.hd.querySelector(':scope > .bplus-star-btn');
      if (!b) {
        b = document.createElement('button');
        b.type = 'button';
        b.className = `${p.share.className} bplus-star-btn`;
        b.innerHTML = ICON.star;
        b.addEventListener('click', async (e) => {
          e.preventDefault(); e.stopPropagation();
          const x = +b.dataset.x, y = +b.dataset.y, w = currentWorld();
          const near = favNear(w, x, y);
          if (near) { favs = favs.filter((f) => f !== near); saveFavs(); playSound('favOff'); }
          else if (await addFavAt(w, x, y, b.dataset.name || null)) playSound('favOn');
          b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
          syncStar(b);
        });
        p.share.after(b);
      }
      b.dataset.x = p.pos.x; b.dataset.y = p.pos.y;
      b.dataset.name = p.name || '';
      b.dataset.world = world || '';
      syncStar(b);
    }
  }
  function syncStar(b) {
    const on = !!favNear(b.dataset.world || currentWorld(), +b.dataset.x, +b.dataset.y);
    b.classList.toggle('on', on);
    const t = on ? T('favRemove') : T('favAdd');
    if (b.getAttribute('aria-label') !== t) { b.setAttribute('aria-label', t); b.title = t; }
  }

  let favView = null, favList = null, renaming = null;
  const relTime = (ts) => {
    const d = (Date.now() - ts) / 1000;
    const rtf = new Intl.RelativeTimeFormat(lang(), { numeric: 'auto' });
    if (d < 60) return rtf.format(0, 'second');
    if (d < 3600) return rtf.format(-Math.round(d / 60), 'minute');
    if (d < 86400) return rtf.format(-Math.round(d / 3600), 'hour');
    return rtf.format(-Math.round(d / 86400), 'day');
  };

  function startRename(id) { renaming = id; renderFavList(); }

  function renderFavList() {
    if (!favList) return;
    favList.innerHTML = '';
    if (!favs.length) {
      const e = el('div', 'bpf-empty');
      e.innerHTML = `${ICON.star}<span></span><small></small>`;
      e.querySelector('span').textContent = T('favEmpty');
      e.querySelector('small').textContent = T('favHint');
      favList.appendChild(e);
      return;
    }
    for (const f of favs) {
      const row = el('div', 'bpf-row');
      row.innerHTML = `<button class="bpf-main"><span class="bpf-thumb"></span><span class="bpf-txt"><span class="bpf-name"></span><span class="bpf-meta"></span></span></button><button class="bpf-ic" data-r title="${T('rename')}">${ICON.pencil}</button><button class="bpf-ic" data-d title="${T('del')}">${ICON.trash}</button>`;
      const th = row.querySelector('.bpf-thumb');
      if (f.thumb) { const im = new Image(); im.src = f.thumb; im.alt = ''; th.appendChild(im); }
      row.querySelector('.bpf-meta').textContent = `${f.world === 'moon' ? '🌑' : '🌍'} ${f.world === 'moon' ? T('moon') : T('earth')} · ${relTime(f.createdAt)}`;
      const nm = row.querySelector('.bpf-name');
      if (renaming === f.id) {
        const inp = el('input', 'bpf-input');
        inp.value = f.name;
        inp.maxLength = 60;
        const commit = () => { const v = inp.value.trim(); if (v) f.name = v; renaming = null; saveFavs(); };
        inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') commit(); if (e.key === 'Escape') { renaming = null; renderFavList(); } });
        inp.addEventListener('blur', commit);
        inp.addEventListener('click', (e) => e.stopPropagation());
        nm.replaceWith(inp);
        setTimeout(() => { inp.focus(); inp.select(); }, 0);
      } else nm.textContent = f.name;
      row.querySelector('.bpf-main').onclick = () => { if (renaming !== f.id) goToFav(f); };
      row.querySelector('[data-r]').onclick = () => startRename(f.id);
      row.querySelector('[data-d]').onclick = () => { favs = favs.filter((x) => x.id !== f.id); saveFavs(); };
      favList.appendChild(row);
    }
  }

  function pinTabsLists() {
    const myPins = tr('pin.tabs.my_pins');
    const out = [], seen = new Set();
    for (const btn of document.querySelectorAll('button[role="tab"]')) {
      if (btn.classList.contains('bplus-fav-tab')) continue;
      const list = btn.parentElement;
      if (!list || seen.has(list)) continue;
      const line = list.querySelector(':scope > div[class*="h-0.5"]');
      const pink = line && /236,\s*72,\s*153/.test(line.style.backgroundColor || '');
      const tabs = [...list.querySelectorAll(':scope > button[role="tab"]:not(.bplus-fav-tab)')];
      const my = (myPins && tabs.find((b) => b.textContent.trim() === myPins)) || (pink && tabs.length >= 2 ? tabs[tabs.length - 1] : null);
      if (!my) continue;
      seen.add(list);
      out.push({ list, my, line });
    }
    return out;
  }
  const ctxOf = (list) => pinTabsLists().find((c) => c.list === list) || null;

  function closeFavView() {
    if (favView) { favView.remove(); favView = null; favList = null; }
    document.querySelectorAll('.bplus-favmode').forEach((n) => n.classList.remove('bplus-favmode'));
    document.querySelectorAll('.bplus-fav-tab.on').forEach((n) => n.classList.remove('on'));
  }

  function moveTabLine(list, tab) {
    const line = list.querySelector(':scope > div[class*="h-0.5"]');
    if (!line || !tab) return;
    line.style.left = `${tab.offsetLeft}px`;
    line.style.width = `${tab.offsetWidth}px`;
  }

  function openFavView(ctx, tab) {
    const panelRoot = ctx.list.closest('.map-ui-selectable') || ctx.list.closest('[class*="fixed"]');
    if (!panelRoot) return;
    const tabsRoot = ctx.list.parentElement;
    closeFavView();
    ctx.list.classList.add('bplus-favmode');
    tab.classList.add('on');
    moveTabLine(ctx.list, tab);
    favView = el('div', 'bpc bplus-favs');
    const top = tabsRoot.getBoundingClientRect().bottom - panelRoot.getBoundingClientRect().top;
    favView.style.top = `${Math.max(0, Math.round(top))}px`;
    favView.innerHTML = '<div class="bpf-list"></div>';
    favList = favView.querySelector('.bpf-list');
    if (getComputedStyle(panelRoot).position === 'static') panelRoot.style.position = 'relative';
    panelRoot.appendChild(favView);
    renderFavList();
  }

  function injectFavTab() {
    const all = pinTabsLists();
    if (favView && !favView.isConnected) closeFavView();
    for (const ctx of all) {
      let tab = ctx.list.querySelector(':scope > .bplus-fav-tab');
      if (!MOD.favs) { if (tab) tab.remove(); continue; }
      if (!tab) {
        tab = document.createElement('button');
        tab.type = 'button';
        tab.setAttribute('role', 'tab');
        tab.className = `${ctx.my.className} bplus-fav-tab`;
        tab.innerHTML = `<span class="bpf-tab-ic">${ICON.star}</span><span class="bpf-tab-lbl"></span>`;
        tab.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openFavView(ctxOf(tab.parentElement) || ctx, tab); });
        if (!ctx.list.__bplusTabs) {
          ctx.list.__bplusTabs = true;
          ctx.list.addEventListener('click', (e) => {
            const t = e.target.closest('button[role="tab"]');
            if (t && !t.classList.contains('bplus-fav-tab')) {
              const was = !!favView;
              closeFavView();
              if (was) moveTabLine(t.parentElement, t);
            }
          }, true);
        }
      }
      if (tab.previousElementSibling !== ctx.my) ctx.list.insertBefore(tab, ctx.my.nextSibling);
      const lbl = tab.querySelector('.bpf-tab-lbl');
      if (lbl.textContent !== T('favorites')) lbl.textContent = T('favorites');
      // vue Favoris ouverte : garder l'onglet actif même si le site a recréé la barre
      if (favView && !tab.classList.contains('on')) {
        tab.classList.add('on');
        ctx.list.classList.add('bplus-favmode');
        moveTabLine(ctx.list, tab);
      }
    }
    if (!MOD.favs) closeFavView();
  }


  /* sons */
  const LS_SND = 'bplus:sounds';
  const SND = { on: true, vol: 0.6, capture: true, goal: true, fav: true, palette: true, friend: true, drag: true, click: true, src: 'bplus', gameClick: true, pixel: true, paint: true, paintMode: true, gvol: 0.6, vols: {} };
  if (!SND.vols || typeof SND.vols !== 'object') SND.vols = {};
  try { Object.assign(SND, JSON.parse(localStorage.getItem(LS_SND) || '{}')); } catch (e) {}
  const saveSnd = () => { try { localStorage.setItem(LS_SND, JSON.stringify(SND)); } catch (e) {} };
  const SND_GROUP = { capture: 'capture', goal: 'goal', favOn: 'fav', favOff: 'fav', palette: 'palette', friend: 'friend', grab: 'drag', drop: 'drag', click: 'click',
    gclick: 'gameClick', pixel: 'pixel', paint: 'paint', paintOn: 'paintMode', paintOff: 'paintMode' };
  const GAME_GROUPS = new Set(['gameClick', 'pixel', 'paint', 'paintMode']);
  let actx = null;
  function audio() {
    if (!actx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; actx = new A(); }
    if (actx.state === 'suspended') actx.resume().catch(() => {});
    return actx;
  }
  /* sons : fichiers .wav du dossier sounds/ de l'extension */
  const SOUND_FILES = ['capture', 'goal', 'favOn', 'favOff', 'palette', 'friend', 'grab', 'drop', 'click', 'gclick', 'pixel', 'paint', 'paintOn', 'paintOff'];
  const JITTER = { paint: 0.13, click: 0.06, gclick: 0.06, pixel: 0.03, grab: 0.05, drop: 0.05, favOn: 0.02, favOff: 0.02 };
  const buffers = new Map();
  let soundsLoading = null;
  const hasBridge = () => !!(document.documentElement && document.documentElement.dataset.bplusBridge);
  function loadSounds() {
    if (soundsLoading) return soundsLoading;
    const c = audio();
    if (!c || !hasBridge()) return null;
    soundsLoading = new Promise((resolve) => {
      const onMsg = async (e) => {
        if (e.source !== window || !e.data || e.data.bplus !== 'sounds') return;
        window.removeEventListener('message', onMsg);
        await Promise.all(Object.entries(e.data.files || {}).map(async ([n, ab]) => {
          try {
            const buf = await new Promise((res, rej) => { const p = c.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); });
            buffers.set(n, buf);
          } catch (er) {}
        }));
        resolve();
      };
      window.addEventListener('message', onMsg);
      window.postMessage({ bplus: 'getSounds', names: SOUND_FILES.filter((n) => !buffers.has(n)) }, location.origin);
      setTimeout(() => { window.removeEventListener('message', onMsg); resolve(); }, 8000);
    }).then(() => { if (buffers.size < SOUND_FILES.length) soundsLoading = null; });
    return soundsLoading;
  }

  function playSound(name, force) {
    try {
      const grp = SND_GROUP[name];
      if (!force && (!SND.on || !grp || SND[grp] === false)) return;
      if (!force && GAME_GROUPS.has(grp) && (!MOD.gameSounds || SND.src !== 'bplus')) return;
      const c = audio(); if (!c) return;
      const buf = buffers.get(name);
      if (!buf) { loadSounds(); return; }
      const base = GAME_GROUPS.has(grp) ? SND.gvol : SND.vol;
      const own = SND.vols[grp] ?? 1;
      const out = c.createGain(); out.gain.value = Math.max(0, Math.min(1, base * own)); out.connect(c.destination);
      const src = c.createBufferSource();
      src.buffer = buf;
      const j = JITTER[name] || 0;
      if (j) src.playbackRate.value = 1 + (Math.random() * 2 - 1) * j;
      src.connect(out);
      src.start();
    } catch (e) {}
  }
  const warmSounds = () => { loadSounds(); };
  document.addEventListener('pointerdown', warmSounds, { capture: true, once: true });
  document.addEventListener('keydown', warmSounds, { capture: true, once: true });
  setTimeout(() => { if (!soundsLoading) loadSounds(); }, 1500);

  const OWN_SOUND = '.bps-play, .bps-sw2, .bplus-star-btn, .bplus-fr-chip, .bpc-pal [data-k], .bplus-fm-a';
  document.addEventListener('click', (e) => {
    const t = e.target && e.target.closest && e.target.closest('button, a[href], [role="button"], [role="switch"], [role="tab"], [role="menuitem"], [role="option"], [role="checkbox"], [class*="cursor-pointer"]');
    if (!t || t.disabled || t.getAttribute('aria-disabled') === 'true' || t.matches(OWN_SOUND) || t.closest(OWN_SOUND)) return;
    if (t.closest('canvas')) return;
    const ours = t.closest('.bpc, .bplus-fav-tab, .bplus-mi, .bplus-snd-card, .bplus-sheet, .bplus-favs, .bplus-sndpage');
    playSound(ours ? 'click' : 'gclick');
  }, true);

  /* sons du jeu : sélection de pixel, peinture, mode peinture */
  const inPaintMode = () => !!document.querySelector(SWATCH_SEL);
  let paintModeWas = false, lastPaint = 0, downAt = null;
  const paintPop = () => { const t = performance.now(); if (t - lastPaint > 45) { lastPaint = t; playSound('paint'); } };
  setInterval(() => {
    const now = inPaintMode();
    if (now !== paintModeWas) { paintModeWas = now; playSound(now ? 'paintOn' : 'paintOff'); }
  }, 250);
  const onMap = (e) => e.target && e.target.tagName === 'CANVAS' && e.target.closest('.maplibregl-map');
  document.addEventListener('pointerdown', (e) => {
    if (!onMap(e) || e.button !== 0) { downAt = null; return; }
    downAt = { x: e.clientX, y: e.clientY, t: performance.now(), paint: inPaintMode() };
    if (downAt.paint) paintPop();
  }, true);
  document.addEventListener('pointerup', (e) => {
    const d = downAt; downAt = null;
    if (!d || d.paint || !onMap(e)) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 5 && performance.now() - d.t < 500) playSound('pixel');
  }, true);
  let spaceHeld = false, lastCell = null, mouse = null;
  const cellAt = (x, y) => {
    const m = map(), w = currentWorld();
    if (!m || !w) return null;
    try {
      const r = m.getCanvas().getBoundingClientRect();
      const g = toGrid(m.unproject([x - r.left, y - r.top]), w);
      return `${g.x},${g.y}`;
    } catch (e) { return null; }
  };
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || !inPaintMode()) return;
    const a = document.activeElement;
    if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return;
    if (e.repeat) return;
    spaceHeld = true;
    lastCell = mouse ? cellAt(mouse.x, mouse.y) : null;
    paintPop();
  }, true);
  document.addEventListener('keyup', (e) => { if (e.code === 'Space') spaceHeld = false; }, true);
  window.addEventListener('blur', () => { spaceHeld = false; });
  document.addEventListener('pointermove', (e) => {
    mouse = { x: e.clientX, y: e.clientY };
    if (!spaceHeld || !onMap(e) || !inPaintMode()) return;
    const c = cellAt(e.clientX, e.clientY);
    if (c && c !== lastCell) { lastCell = c; paintPop(); }
  }, true);

  /* page Sons dans les paramètres du site */
  let sndPage = null;
  const isSoundsCard = (card) => {
    const ic = card.querySelector(':scope > div:first-child');
    return !!ic && /132,\s*204,\s*22/.test(ic.style.backgroundColor || '') ;
  };
  function injectSoundsCard() {
    for (const card of document.querySelectorAll('div[class*="rounded-[20px]"][class*="p-6"][class*="border"]')) {
      if (card.dataset.bplusSnd || !isSoundsCard(card)) continue;
      card.dataset.bplusSnd = '1';
      card.classList.remove('opacity-50', 'cursor-default');
      card.classList.add('cursor-pointer', 'hover:bg-[rgba(0,0,0,0.03)]', 'bplus-snd-card');
      card.addEventListener('click', () => openSoundsPage(card));
    }
    if (sndPage && !sndPage.el.isConnected) sndPage = null;
  }

  function sndRow(title, desc, key, opts = {}) {
    const row = el('div', `bps-srow${opts.wip ? ' wip' : ''}`);
    row.innerHTML = `<div class="bps-stxt"><div class="bps-st"></div><div class="bps-sd"></div></div>`;
    row.querySelector('.bps-st').textContent = title;
    row.querySelector('.bps-sd').textContent = desc;
    if (opts.play && !opts.wip) {
      const grp = key;
      const rg = el('input', 'bps-range sm');
      rg.type = 'range'; rg.min = 0; rg.max = 100; rg.title = T('sndVolume');
      const paint = () => { rg.value = Math.round((SND.vols[grp] ?? 1) * 100); rg.style.setProperty('--p', `${rg.value}%`); };
      paint();
      rg.oninput = () => { SND.vols[grp] = rg.value / 100; paint(); saveSnd(); };
      rg.onchange = () => playSound(opts.play);
      row.appendChild(rg);
    }
    if (opts.play) {
      const pb = el('button', 'bps-play');
      pb.type = 'button'; pb.title = T('preview'); pb.innerHTML = ICON.play;
      pb.onclick = () => playSound(opts.play, true);
      row.appendChild(pb);
    }
    const sw = el('button', 'bps-sw2');
    sw.type = 'button'; sw.setAttribute('role', 'switch');
    const on = opts.wip ? false : !!SND[key];
    sw.setAttribute('aria-checked', String(on));
    if (opts.wip) sw.disabled = true;
    else sw.onclick = () => { SND[key] = !SND[key]; sw.setAttribute('aria-checked', String(SND[key])); saveSnd(); if (key === 'on') syncSndPage(); else if (SND[key]) playSound(opts.play, true); };
    row.appendChild(sw);
    return row;
  }
  function syncSndPage() {
    if (!sndPage) return;
    sndPage.el.querySelectorAll('.bps-dep').forEach((n) => n.classList.toggle('off', !SND.on || (n.classList.contains('bps-gdep') && SND.src !== 'bplus')));
  }

  function openSoundsPage(card) {
    const menuView = card.closest('div[class*="absolute"][class*="inset-0"]');
    const host = menuView && menuView.parentElement;
    if (!host || (sndPage && sndPage.el.isConnected)) return;
    const page = el('div', 'bpc bplus-sndpage');
    const wrap = el('div', 'bps-swrap');
    // section Bplace+
    const s1 = el('section', 'bps-ssec');
    s1.innerHTML = '<h2 class="bps-sh">Bplace+</h2>';
    s1.appendChild(sndRow(T('sndMaster'), T('sndMasterDesc'), 'on'));
    const dep = el('div', 'bps-dep');
    const volRow = (k, sample) => {
      const vol = el('div', 'bps-srow');
      vol.innerHTML = `<div class="bps-stxt"><div class="bps-st"></div></div><input type="range" min="0" max="100" class="bps-range"><span class="bps-pct"></span>`;
      vol.querySelector('.bps-st').textContent = T('sndVolume');
      const rg = vol.querySelector('input'), pct = vol.querySelector('.bps-pct');
      const paint = () => { rg.value = Math.round(SND[k] * 100); pct.textContent = `${rg.value}%`; rg.style.setProperty('--p', `${rg.value}%`); };
      paint();
      rg.oninput = () => { SND[k] = rg.value / 100; paint(); saveSnd(); };
      rg.onchange = () => playSound(sample);
      return vol;
    };
    dep.appendChild(volRow('vol', 'favOn'));
    dep.appendChild(sndRow(T('sndCapture'), T('sndCaptureDesc'), 'capture', { play: 'capture' }));
    dep.appendChild(sndRow(T('sndGoal'), T('sndGoalDesc'), 'goal', { play: 'goal' }));
    dep.appendChild(sndRow(T('sndFav'), T('sndFavDesc'), 'fav', { play: 'favOn' }));
    dep.appendChild(sndRow(T('sndPalette'), T('sndPaletteDesc'), 'palette', { play: 'palette' }));
    dep.appendChild(sndRow(T('sndFriend'), T('sndFriendDesc'), 'friend', { play: 'friend' }));
    dep.appendChild(sndRow(T('sndDrag'), T('sndDragDesc'), 'drag', { play: 'drop' }));
    dep.appendChild(sndRow(T('sndUiClick'), T('sndUiClickDesc'), 'click', { play: 'click' }));
    s1.appendChild(dep);
    // section sons du jeu (module)
    const s2 = el('section', 'bps-ssec');
    s2.innerHTML = '<h2 class="bps-sh"></h2>';
    s2.querySelector('h2').textContent = T('sndGame');
    const srcRow = el('div', 'bps-srow');
    srcRow.innerHTML = `<div class="bps-stxt"><div class="bps-st"></div></div><div class="bps-seg" role="radiogroup"><button type="button" data-v="bplus"></button><button type="button" data-v="bplace" disabled></button></div>`;
    srcRow.querySelector('.bps-st').textContent = T('sndSource');
    srcRow.querySelector('[data-v="bplus"]').textContent = 'Bplace+';
    const ob = srcRow.querySelector('[data-v="bplace"]');
    ob.textContent = 'Bplace'; ob.title = 'Work in progress';
    const wipB = el('span', 'bps-wip sm'); wipB.textContent = 'WIP'; ob.appendChild(wipB);
    const paintSeg = () => srcRow.querySelectorAll('.bps-seg button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.v === SND.src)));
    srcRow.querySelectorAll('.bps-seg button').forEach((b) => { b.setAttribute('role', 'radio'); b.onclick = () => { if (b.disabled) return; SND.src = b.dataset.v; saveSnd(); paintSeg(); syncSndPage(); }; });
    paintSeg();
    s2.appendChild(srcRow);
    const gdep = el('div', 'bps-dep bps-gdep');
    gdep.appendChild(volRow('gvol', 'paint'));
    gdep.appendChild(sndRow(T('sndGameClick'), T('sndGameClickDesc'), 'gameClick', { play: 'gclick' }));
    gdep.appendChild(sndRow(T('sndPixelSel'), T('sndPixelSelDesc'), 'pixel', { play: 'pixel' }));
    gdep.appendChild(sndRow(T('sndPaint'), T('sndPaintDesc'), 'paint', { play: 'paint' }));
    gdep.appendChild(sndRow(T('sndPaintMode'), T('sndPaintModeDesc'), 'paintMode', { play: 'paintOn' }));
    for (const k of ['sndNotif', 'sndLevel', 'sndMusic']) gdep.appendChild(sndRow(T(k), 'Work in progress', null, { wip: true }));
    s2.appendChild(gdep);
    if (!MOD.gameSounds) s2.hidden = true;
    wrap.appendChild(s1); wrap.appendChild(el('div', 'bps-sdiv')); wrap.appendChild(s2);
    page.appendChild(wrap);
    host.appendChild(page);
    // sous-titre de l'en-tête
    const settingsRoot = host.parentElement;
    let sub = null;
    const header = settingsRoot && settingsRoot.firstElementChild;
    if (header) {
      const title = header.querySelector('div[class*="z-10"] > span');
      if (title) { sub = el('span', 'bplus-sub animate-fade-in'); sub.textContent = ` - ${T('sounds')}`; title.appendChild(sub); }
    }
    const prevT = menuView.style.transform;
    sndPage = { el: page, menuView, prevT, sub };
    syncSndPage();
    page.offsetWidth;
    page.classList.add('in');
    menuView.style.transform = 'translateX(-100%)';
  }
  function closeSoundsPage() {
    if (!sndPage) return;
    const { el: page, menuView, sub } = sndPage;
    sndPage = null;
    page.classList.remove('in');
    menuView.style.transform = 'translateX(0)';
    if (sub) sub.remove();
    setTimeout(() => page.remove(), 320);
  }
  document.addEventListener('click', (e) => {
    if (!sndPage) return;
    const b = e.target.closest && e.target.closest('button');
    if (!b) return;
    if (b.getAttribute('aria-label') === 'Retour' || (b.className.includes('absolute') && b.className.includes('left-3'))) {
      e.preventDefault(); e.stopPropagation(); closeSoundsPage();
    }
  }, true);

  /* amis dans la liste des membres de guilde */
  let clientP = null;
  function siteClient() {
    if (!clientP) {
      clientP = (async () => {
        const sc = document.querySelector('script[type="module"][src*="/assets/index-"]');
        if (!sc) return null;
        const mod = await import(sc.src);
        for (const v of Object.values(mod)) if (v && typeof v === 'object' && typeof v.from === 'function' && typeof v.rpc === 'function' && v.auth) return v;
        return null;
      })().catch(() => null);
      clientP.then((c) => { if (!c) clientP = null; });
    }
    return clientP;
  }
  const FR = { me: null, map: new Map(), at: 0, loading: null };
  async function loadFriends(force) {
    if (FR.loading) return FR.loading;
    if (!force && Date.now() - FR.at < 30000) return FR;
    FR.loading = (async () => {
      const c = await siteClient();
      if (!c) return FR;
      const { data } = await c.auth.getSession();
      const me = data && data.session && data.session.user && data.session.user.id;
      FR.me = me || null;
      FR.map = new Map();
      if (me) {
        const { data: rows } = await c.from('friendships').select('id, user_id, friend_id, status').or(`user_id.eq.${me},friend_id.eq.${me}`);
        for (const r of rows || []) {
          const other = r.user_id === me ? r.friend_id : r.user_id;
          if (r.status === 'accepted') FR.map.set(other, { st: 'friend', id: r.id });
          else if (r.status === 'pending') FR.map.set(other, { st: r.user_id === me ? 'sent' : 'received', id: r.id });
        }
      }
      FR.at = Date.now();
      return FR;
    })().finally(() => { FR.loading = null; });
    return FR.loading;
  }
  // cache React Query du site : le rafraîchir pour que son interface (profil, listes) voie la demande tout de suite
  let qcCache = null;
  function siteQueryClient() {
    if (qcCache) return qcCache;
    const root = document.getElementById('root');
    const k = root && Object.keys(root).find((x) => x.startsWith('__reactContainer$'));
    let f = k && root[k];
    const stack = f ? [f] : [];
    let n = 0;
    while (stack.length && n++ < 400) {
      const cur = stack.shift();
      const p = cur.memoizedProps;
      if (p && p.client && typeof p.client.invalidateQueries === 'function') return (qcCache = p.client);
      if (cur.child) stack.push(cur.child);
      if (cur.sibling) stack.push(cur.sibling);
    }
    return null;
  }
  function refreshSiteFriends() {
    const qc = siteQueryClient();
    if (!qc) return;
    for (const key of ['friendships', 'friend-ids', 'friends-count', 'user-friends-list', 'pending-friend-requests', 'friend-requests']) {
      try { qc.invalidateQueries({ queryKey: [key] }); } catch (e) {}
    }
  }

  async function sendFriendRequest(uid) {
    const c = await siteClient();
    const me = FR.me;
    if (!c || !me) throw new Error('auth');
    const ev = () => c.from('game_events').insert({ user_id: me, event_type: 'FRIEND_REQUEST_SENT', payload: { friend_id: uid }, occurred_at: new Date().toISOString() });
    const { data: back } = await c.from('friendships').select('*').eq('user_id', uid).eq('friend_id', me).eq('status', 'pending').maybeSingle();
    if (back) {
      const { error } = await c.rpc('respond_friend_request', { p_friendship_id: back.id, p_accept: true });
      if (error) throw error;
      await ev();
      return 'friend';
    }
    const { data: ex } = await c.from('friendships').select('*').or(`and(user_id.eq.${me},friend_id.eq.${uid}),and(user_id.eq.${uid},friend_id.eq.${me})`).maybeSingle();
    if (ex) {
      if (ex.status === 'rejected' && ex.user_id === me) {
        const { error } = await c.from('friendships').update({ status: 'pending', updated_at: new Date().toISOString() }).eq('id', ex.id).select().single();
        if (error) throw error;
        await ev();
        return 'sent';
      }
      if (ex.status === 'rejected' && ex.friend_id === me) await c.from('friendships').delete().eq('id', ex.id);
      else return ex.status === 'accepted' ? 'friend' : 'sent';
    }
    const { error } = await c.from('friendships').insert({ user_id: me, friend_id: uid, status: 'pending' }).select().single();
    if (error) throw error;
    await ev();
    return 'sent';
  }

  function memberProps(node) {
    const k = Object.keys(node).find((x) => x.startsWith('__reactFiber$'));
    if (!k) return null;
    let f = node[k];
    for (let i = 0; f && i < 8; i++, f = f.return) {
      const p = f.memoizedProps;
      if (p && typeof p === 'object' && typeof p.userId === 'string' && 'showGuildBadge' in p && p.showFriendLabel === false) return p;
    }
    return null;
  }

  let friendsBusy = false;
  async function injectFriends() {
    if (!MOD.friends) { document.querySelectorAll('.bplus-fr').forEach((n) => n.remove()); return; }
    if (friendsBusy) return;
    const rows = [];
    for (const box of document.querySelectorAll('div.flex.items-center.gap-2 > div.flex-1.min-w-0:first-child')) {
      const row = box.parentElement;
      const inner = box.firstElementChild;
      if (!inner) continue;
      const p = memberProps(inner.firstElementChild || inner) || memberProps(inner);
      if (p) rows.push({ row, box, uid: p.userId, name: p.username });
    }
    // auteurs des épingles (onglet Découvrir)
    const pins = [];
    for (const host of document.querySelectorAll('div[class*="text-[14px]"][class*="font-extrabold"][class*="flex-1"]')) {
      const first = host.firstElementChild;
      if (!first || first.classList.contains('bplus-fr')) continue;
      const p = pinAuthorProps(first);
      if (p) pins.push({ host, uid: p.userId });
    }
    if (!rows.length && !pins.length) return;
    friendsBusy = true;
    try { await loadFriends(); } catch (e) {} finally { friendsBusy = false; }
    if (!FR.me) return;
    for (const { box, uid, name } of rows) {
      let slot = box.querySelector('.bplus-fr');
      if (uid === FR.me) { if (slot) slot.remove(); continue; }
      const st = (FR.map.get(uid) || { st: 'none' }).st;
      if (slot && slot.dataset.st === st && slot.dataset.uid === uid) continue;
      const sub = [...box.querySelectorAll('span')].find((n) => /12px/.test(n.style.fontSize || '') && !n.closest('.bplus-fr') && !n.querySelector('svg,img')
        && n.parentElement && (!name || n.parentElement.parentElement.textContent.includes(name)));
      if (!sub) continue;
      if (slot) slot.remove();
      sub.appendChild(renderFriendSlot(uid, st));
    }
    for (const { host, uid } of pins) {
      let slot = host.querySelector(':scope > .bplus-fr');
      if (uid === FR.me) { if (slot) slot.remove(); continue; }
      const st = (FR.map.get(uid) || { st: 'none' }).st;
      if (slot && slot.dataset.st === st && slot.dataset.uid === uid) continue;
      if (slot) slot.remove();
      host.classList.add('bplus-fr-host');
      host.appendChild(renderFriendSlot(uid, st));
    }
  }

  function pinAuthorProps(node) {
    const k = Object.keys(node).find((x) => x.startsWith('__reactFiber$'));
    if (!k) return null;
    let f = node[k];
    for (let i = 0; f && i < 6; i++, f = f.return) {
      const p = f.memoizedProps;
      if (p && typeof p === 'object' && typeof p.userId === 'string' && p.userId && typeof p.username === 'string' && 'role' in p && p.size === 'small') return p;
    }
    return null;
  }

  function renderFriendSlot(uid, st) {
    const chip = el('span', `bpc bplus-fr bplus-fr-chip st-${st}`);
    chip.dataset.st = st; chip.dataset.uid = uid;
    const lbl = st === 'friend' ? T('friendTag') : st === 'sent' ? T('friendSent') : st === 'received' ? T('acceptFriend') : T('addFriend');
    chip.innerHTML = `${st === 'friend' ? ICON.userCheck : st === 'sent' ? ICON.clock : st === 'received' ? ICON.userCheck : ICON.userPlus}<span></span>`;
    chip.querySelector('span').textContent = lbl;
    chip.title = lbl;
    const stop = (e) => { e.preventDefault(); e.stopPropagation(); };
    chip.addEventListener('pointerdown', (e) => e.stopPropagation());
    if (st === 'friend' || st === 'sent') { chip.addEventListener('click', stop); return chip; }
    chip.setAttribute('role', 'button');
    chip.tabIndex = 0;
    chip.addEventListener('click', async (e) => {
      stop(e);
      if (chip.classList.contains('busy')) return;
      chip.classList.add('busy');
      try {
        const res = await sendFriendRequest(uid);
        FR.map.set(uid, { st: res });
        refreshSiteFriends();
        playSound('friend');
        chip.replaceWith(renderFriendSlot(uid, res));
      } catch (er) {
        chip.classList.remove('busy'); chip.classList.add('err');
        chip.title = T('friendErr');
        setTimeout(() => chip.classList.remove('err'), 600);
      }
      loadFriends(true).catch(() => {});
    });
    return chip;
  }

  function closeSiteMenu(list) {
    const esc = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
    esc();
    setTimeout(() => {
      if (!list.isConnected) return;
      const t = document.querySelector('button[aria-label="Menu"], button[title="Menu"]');
      if (t) t.click();
    }, 40);
  }

  function injectMenuItem(refresh) {
    const ref = [...document.querySelectorAll('button[class*="gap-[22px]"][class*="h-[40px]"]')]
      .find((b) => !b.closest('.bpc') && b.parentElement && b.parentElement.querySelector(':scope > div[class*="h-[1px]"]'));
    if (!ref) return;
    const list = ref.parentElement;
    let item = list.querySelector(':scope > .bplus-mi');
    if (item && !refresh) return;
    if (!item) {
      const divider = list.querySelector(':scope > div[class*="h-[1px]"]');
      item = document.createElement('button');
      item.type = 'button';
      item.className = `${ref.className} bplus-mi`;
      item.innerHTML = `${ICON.bplus}<span class="text-sm font-semibold text-black leading-normal">Bplace+</span><span class="bplus-dot"></span>`;
      item.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        closeSiteMenu(list);
        openSheet();
      });
      list.insertBefore(item, divider);
    }
    item.querySelector('.bplus-dot').hidden = !hasNews();
    fixMenuHeight(list, item);
  }

  function fixMenuHeight(list, item) {
    const wrap = list.parentElement;
    if (!wrap || wrap === document.body) return;
    const apply = () => {
      if (!item.isConnected || !wrap.style.height.endsWith('px')) return;
      const target = parseFloat(wrap.style.height);
      const borders = wrap.offsetHeight - wrap.clientHeight;
      let content = 0;
      for (const c of wrap.children) content = Math.max(content, c.offsetTop + c.offsetHeight);
      const need = Math.ceil(content + borders);
      const diff = need - target;
      if (diff <= 0 || diff > item.offsetHeight + 4) return;
      wrap.style.height = `${need}px`;
    };
    apply();
    if (!wrap.__bplusObs) {
      wrap.__bplusObs = new MutationObserver(apply);
      wrap.__bplusObs.observe(wrap, { attributes: true, attributeFilter: ['style'] });
    }
  }

  let sheet = null, scrim = null, sheetPage = 'home';
  function openSheet(page = 'home') {
    sheetPage = page;
    if (!sheet) {
      scrim = el('div', 'bpc bplus-scrim');
      scrim.addEventListener('click', (e) => { if (e.target === scrim) closeSheet(); });
      document.body.appendChild(scrim);
      sheet = el('div', 'bpc bplus-sheet');
      sheet.innerHTML = `
        <div class="bps-head">
          <button class="bps-btn" data-back title="${T('back')}">${ICON.back}</button>
          <div class="bps-title">${ICON.logo}<span>Bplace+</span></div>
          <button class="bps-btn" data-x title="${T('close')}">${ICON.x}</button>
        </div>
        <div class="bps-body"></div>`;
      sheet.querySelector('[data-x]').onclick = closeSheet;
      sheet.querySelector('[data-back]').onclick = () => { sheetPage = 'home'; renderSheet(); };
      document.body.appendChild(sheet);
      const sc = scrim;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (sheet) sheet.classList.add('open');
        if (sc) sc.classList.add('open');
      }));
    }
    renderSheet();
  }
  function closeSheet() {
    if (!sheet) return;
    const s0 = sheet, c0 = scrim;
    sheet = null;
    scrim = null;
    s0.classList.remove('open');
    if (c0) c0.classList.remove('open');
    setTimeout(() => { s0.remove(); if (c0) c0.remove(); }, 320);
  }

  function renderSheet() {
    if (!sheet) return;
    const body = sheet.querySelector('.bps-body');
    const back = sheet.querySelector('[data-back]');
    back.style.visibility = sheetPage === 'home' ? 'hidden' : 'visible';
    back.title = T('back');
    sheet.querySelector('[data-x]').title = T('close');
    const titleSpan = sheet.querySelector('.bps-title span');
    titleSpan.textContent = sheetPage === 'modules' ? T('modules') : sheetPage === 'news' ? T('whatsNew') : 'Bplace+';
    body.innerHTML = '';
    body.scrollTop = 0;

    if (sheetPage === 'home') {
      const card = (icon, tint, title, desc, badge, onClick, ext) => {
        const b = el('button', 'bps-card');
        b.innerHTML = `<span class="bps-ic" style="--tint:${tint}">${icon}</span><span class="bps-txt"><span class="bps-t"></span><span class="bps-d"></span></span>${badge ? `<span class="bps-badge">${T('newBadge')}</span>` : ''}<span class="bps-chev">${ext ? ICON.ext : ICON.chev}</span>`;
        b.querySelector('.bps-t').textContent = title;
        b.querySelector('.bps-d').textContent = desc;
        b.onclick = onClick;
        return b;
      };
      body.append(
        card(ICON.sliders, '#3341FF', T('modules'), T('modulesDesc'), false, () => { sheetPage = 'modules'; renderSheet(); }),
        card(ICON.news, '#F97316', T('whatsNew'), T('whatsNewDesc'), hasNews(), () => { sheetPage = 'news'; markSeen(); renderSheet(); }),
        card(ICON.discord, '#5865F2', T('discordServer'), T('discordServerDesc'), false, () => window.open(DISCORD_INVITE, '_blank', 'noopener'), true),
      );
      const foot = el('div', 'bps-foot');
      const links = el('div', 'bps-links');
      if (GITHUB_URL) {
        const gh = el('a', 'bps-link');
        gh.href = GITHUB_URL; gh.target = '_blank'; gh.rel = 'noopener';
        gh.innerHTML = `${ICON.github}<span>GitHub</span>`;
        links.appendChild(gh);
      }
      const dc = el('button', 'bps-link');
      dc.type = 'button';
      dc.innerHTML = `${ICON.discord}<span></span>`;
      dc.querySelector('span').textContent = DISCORD_CONTACT;
      dc.title = T('contactDiscord');
      dc.onclick = () => {
        const done = () => { dc.querySelector('span').textContent = T('nickCopied'); dc.classList.add('ok'); setTimeout(() => { dc.querySelector('span').textContent = DISCORD_CONTACT; dc.classList.remove('ok'); }, 1400); };
        try { navigator.clipboard.writeText(DISCORD_CONTACT).then(done, done); } catch (e) { done(); }
      };
      links.appendChild(dc);
      const ver = el('div', 'bps-ver-l');
      ver.textContent = `Bplace+ · ${T('version')} ${VERSION}`;
      const note = el('p', 'bps-note');
      note.textContent = T('authorNote');
      foot.append(links, note);
      body.append(foot, ver);
      return;
    }

    if (sheetPage === 'modules') {
      const rowsDef = [
        ['capture', ICON.scan, '#3341FF', T('capture'), T('modCaptureDesc')],
        ['palettes', ICON.palette, '#F97316', T('palette'), T('modPalettesDesc')],
        ['goals', ICON.pin, '#8B5CF6', T('goals'), T('modGoalsDesc')],
        ['counts', ICON.hash, '#10B981', T('modCounts'), T('modCountsDesc')],
        ['favs', ICON.star, '#F59E0B', T('favorites'), T('modFavsDesc')],
        ['friends', ICON.userPlus, '#3B82F6', T('modFriends'), T('modFriendsDesc')],
        ['gameSounds', ICON.speaker, '#84CC16', T('sndGame'), T('modGameSoundsDesc')],
      ];
      for (const [k, icon, tint, title, desc] of rowsDef) {
        const b = el('button', 'bps-card');
        b.setAttribute('role', 'switch');
        b.innerHTML = `<span class="bps-ic" style="--tint:${tint}">${icon}</span><span class="bps-txt"><span class="bps-t"></span><span class="bps-d"></span></span><span class="bps-sw"><i></i></span>`;
        b.querySelector('.bps-t').textContent = title;
        b.querySelector('.bps-d').textContent = desc;
        const sync = () => { b.setAttribute('aria-checked', String(!!MOD[k])); b.classList.toggle('on', !!MOD[k]); };
        sync();
        b.onclick = () => { setModule(k, !MOD[k]); sync(); };
        body.appendChild(b);
      }
      return;
    }

    const h = el('h2', 'bps-h');
    h.textContent = T('allUpdates');
    body.appendChild(h);
    const L = lang() === 'fr' ? 'fr' : 'en';
    CHANGELOG.forEach((c, idx) => {
      const tx = c[L] || c.en;
      const card = el('div', 'bps-log' + (idx === 0 ? ' latest' : ''));
      const head = el('div', 'bps-log-head');
      const ver = el('span', 'bps-ver'); ver.textContent = `V${c.v}`;
      const date = el('span', 'bps-date');
      try { date.textContent = new Date(c.date + 'T12:00:00').toLocaleDateString(lang(), { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { date.textContent = c.date; }
      head.append(ver, date);
      const t = el('div', 'bps-log-t'); t.textContent = tx.t;
      const ul = el('ul', 'bps-log-l');
      for (const it of tx.i) { const li = el('li'); li.textContent = it; ul.appendChild(li); }
      card.append(head, t, ul);
      body.appendChild(card);
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sheet && !(e.target instanceof HTMLInputElement)) closeSheet();
  });

  dataListeners.add(renderHud);
  window.addEventListener('resize', () => placeHud());

  const ICON = {
    scan: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><rect x="8.5" y="8.5" width="7" height="7" rx="1"/></svg>',
    x: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    dl: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    copy: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4"/></svg>',
    bplus: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" class="w-[18px] h-[18px] flex-shrink-0" aria-hidden="true"><g fill="currentColor"><rect x="1.5" y="1.5" width="15" height="15" rx="4" fill-opacity="0.4"/><path d="M9 5.25c.41 0 .75.34.75.75v2.25H12c.41 0 .75.34.75.75s-.34.75-.75.75H9.75V12c0 .41-.34.75-.75.75s-.75-.34-.75-.75V9.75H6c-.41 0-.75-.34-.75-.75s.34-.75.75-.75h2.25V6c0-.41.34-.75.75-.75z"/></g></svg>',
    back: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>',
    chev: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    sliders: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
    news: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h14a2 2 0 0 0 2-2V4H7v14a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2V9h5"/><path d="M11 8h5M11 12h5M11 16h3"/></svg>',
    star: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M12 3.2l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.5l6-.8z"/></svg>',
    hash: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M10 8l-1 8M15 8l-1 8M8 10.5h8M7.5 13.5h8"/></svg>',
    pencil: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/></svg>',
    trash: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>',
    plus18: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    userPlus: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M19 8v6M16 11h6"/></svg>',
    userCheck: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 11l2 2 4-4"/></svg>',
    clock: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
    logo: '<svg viewBox="0 0 128 128" width="22" height="22"><defs><linearGradient id="bplg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0026FF"/><stop offset="1" stop-color="#029AFF"/></linearGradient><linearGradient id="bplh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient><filter id="bpls" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#00106b" flood-opacity=".4"/></filter></defs><rect x="4" y="4" width="120" height="120" rx="34" fill="url(#bplg)"/><rect x="4" y="4" width="120" height="120" rx="34" fill="url(#bplh)"/><rect x="5.5" y="5.5" width="117" height="117" rx="32.5" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="3"/><g fill="#fff" filter="url(#bpls)" shape-rendering="crispEdges"><rect x="27" y="26" width="11.4" height="11.4"/><rect x="38" y="26" width="11.4" height="11.4"/><rect x="49" y="26" width="11.4" height="11.4"/><rect x="60" y="26" width="11.4" height="11.4"/><rect x="27" y="37" width="11.4" height="11.4"/><rect x="71" y="37" width="11.4" height="11.4"/><rect x="27" y="48" width="11.4" height="11.4"/><rect x="71" y="48" width="11.4" height="11.4"/><rect x="27" y="59" width="11.4" height="11.4"/><rect x="38" y="59" width="11.4" height="11.4"/><rect x="49" y="59" width="11.4" height="11.4"/><rect x="60" y="59" width="11.4" height="11.4"/><rect x="27" y="70" width="11.4" height="11.4"/><rect x="71" y="70" width="11.4" height="11.4"/><rect x="27" y="81" width="11.4" height="11.4"/><rect x="71" y="81" width="11.4" height="11.4"/><rect x="27" y="92" width="11.4" height="11.4"/><rect x="38" y="92" width="11.4" height="11.4"/><rect x="49" y="92" width="11.4" height="11.4"/><rect x="60" y="92" width="11.4" height="11.4"/></g><g fill="#EC4899" filter="url(#bpls)" shape-rendering="crispEdges"><rect x="95" y="22" width="9.4" height="9.4"/><rect x="86" y="31" width="9.4" height="9.4"/><rect x="95" y="31" width="9.4" height="9.4"/><rect x="104" y="31" width="9.4" height="9.4"/><rect x="95" y="40" width="9.4" height="9.4"/></g></svg>',
    speaker: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
    github: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>',
    discord: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.445.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.618-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.319 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.042-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .079.009c.12.099.246.198.373.292a.077.077 0 0 1-.007.128 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.363 1.225 1.993a.076.076 0 0 0 .084.029 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.029zM8.02 15.331c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.332-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.332-.946 2.418-2.157 2.418z"/></svg>',
    ext: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
    chevDown: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    target: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>',
    pin: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5M9 10.8V4h6v6.8l2.5 3.2h-11z"/></svg>',
    palette: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.7-.9 1.4-1.9-.3-.9.3-1.9 1.3-1.9H17a4 4 0 0 0 4-4c0-5.2-4-8.2-9-8.2z"/><circle cx="7.5" cy="11" r="1.2" fill="currentColor"/><circle cx="10.5" cy="7.2" r="1.2" fill="currentColor"/><circle cx="15" cy="7.8" r="1.2" fill="currentColor"/></svg>',
    select: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="3 3"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>',
  };

  const CSS = `
  .bpc, .bpc * { box-sizing: border-box; font-family: Satoshi, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .bpc {
    --bpc-ink: hsl(var(--floating-ink, 0 0% 16%));
    --bpc-fg: hsl(var(--foreground, 0 0% 15%));
    --bpc-muted: hsl(var(--muted-foreground, 0 0% 45%));
    --bpc-accent: hsl(var(--focus-ring, 241 100% 60%));
    --bpc-soft: hsla(var(--floating-bar-hover, 0 0% 0% / .03));
    --bpc-line: hsla(var(--floating-surface-border, 0 0% 0% / .05));
    --bpc-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
    color: var(--bpc-fg);
  }
  
  .bpc-surface:not(.floating-surface) { background: hsla(0 0% 100% / .85); backdrop-filter: blur(20px); box-shadow: 0 0 0 1px #0000000d, 0 4px 16px #0000000d; }

  .bpc-fab {
    position: fixed; left: 16px; bottom: var(--mnav-bottom, 16px); z-index: 50;
    width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;
    color: var(--bpc-ink); cursor: pointer; border-radius: 99px;
    transition: transform .5s var(--bpc-spring);
  }
  .bpc-fab:hover { transform: scale(1.06); }
  .bpc-fab:active { transform: scale(.94); }
  .bpc-fab.on { color: var(--bpc-accent); }
  .bpc-fab.bpc-hide { opacity: 0; visibility: hidden; pointer-events: none; transform: scale(.6); }
  .bpc-fab { transition: transform .5s var(--bpc-spring), opacity .2s, visibility .2s; }
  .bpc-tip {
    position: absolute; left: 56px; white-space: nowrap; padding: 6px 10px; border-radius: 10px;
    background: hsl(0 0% 10% / .85); color: #fff; font-size: 12px; font-weight: 500;
    opacity: 0; transform: translateX(-4px); pointer-events: none; transition: all .2s;
  }
  .bpc-fab:hover .bpc-tip { opacity: 1; transform: none; }
  .bpc-tip kbd { font: inherit; opacity: .6; margin-left: 6px; }

  .bpc-ov { position: fixed; inset: 0; z-index: 60; cursor: crosshair; }
  .bpc-hint {
    position: fixed; top: var(--mnav-top, 16px); left: 50%; transform: translateX(-50%); z-index: 61;
    height: 40px; padding: 0 16px; display: flex; align-items: center; gap: 10px;
    font-size: 14px; font-weight: 500; color: var(--bpc-ink); border-radius: 99px; pointer-events: none;
    animation: bpc-in .45s var(--bpc-spring);
  }
  .bpc-hint b { font-weight: 600; }
  .bpc-hint .sep { width: 1px; height: 16px; background: var(--bpc-line); }
  .bpc-sel {
    position: fixed; display: none; pointer-events: none; z-index: 61;
    border: 1.5px solid var(--bpc-accent); border-radius: 2px;
    background: hsl(var(--focus-ring, 241 100% 60%) / .08);
    box-shadow: 0 0 0 100vmax rgb(0 0 0 / .3);
  }
  .bpc-label {
    position: absolute; left: -1.5px; top: calc(100% + 8px); white-space: nowrap;
    padding: 4px 10px; border-radius: 99px; background: var(--bpc-accent); color: #fff;
    font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums;
  }

  .bpc-panel {
    position: fixed; left: 16px; bottom: calc(var(--mnav-bottom, 16px) + 60px); z-index: 55;
    width: 348px; max-width: calc(100vw - 32px); max-height: calc(100vh - 120px); overflow: auto;
    border-radius: 24px !important; padding: 14px; display: flex; flex-direction: column; gap: 12px;
    transform-origin: bottom left; animation: bpc-pop .5s var(--bpc-spring);
  }
  .bpc-head { display: flex; align-items: center; gap: 8px; }
  .bpc-head h3 { margin: 0; font-size: 16px; font-weight: 600; flex: 1; color: var(--bpc-ink); }
  .bpc-world { font-size: 12px; font-weight: 500; color: var(--bpc-muted); padding: 3px 8px; border-radius: 99px; background: var(--bpc-soft); }
  .bpc-icon-btn {
    width: 34px; height: 34px; border: 0; border-radius: 99px; background: transparent; color: var(--bpc-ink);
    display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background-color .15s;
  }
  .bpc-icon-btn:hover { background: rgb(0 0 0 / .04); }
  .dark .bpc-icon-btn:hover { background: rgb(255 255 255 / .06); }

  .bpc-prev {
    position: relative; border-radius: 16px; overflow: auto; min-height: 120px; max-height: 260px;
    display: flex; align-items: center; justify-content: center; padding: 10px;
    background: repeating-conic-gradient(rgb(0 0 0 / .05) 0 25%, transparent 0 50%) 0 0 / 14px 14px, rgb(0 0 0 / .02);
    box-shadow: inset 0 0 0 1px var(--bpc-line);
  }
  .bpc-prev canvas { display: block; image-rendering: pixelated; flex: none; }
  .bpc-loading { font-size: 13px; color: var(--bpc-muted); }

  .bpc-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .bpc-chip { font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 99px; background: var(--bpc-soft); color: var(--bpc-ink); font-variant-numeric: tabular-nums; }
  .bpc-chip.main { background: hsl(var(--focus-ring, 241 100% 60%) / .1); color: var(--bpc-accent); font-weight: 600; }

  .bpc-fields { display: grid; grid-template-columns: 1.3fr 1.3fr .85fr .85fr; gap: 6px; }
  .bpc-field { display: flex; flex-direction: column; gap: 3px; }
  .bpc-field span { font-size: 11px; font-weight: 500; color: var(--bpc-muted); padding-left: 4px; }
  .bpc-field input {
    width: 100%; height: 34px; border: 0; border-radius: 12px; padding: 0 7px; font-size: 12.5px; font-weight: 500;
    background: rgb(0 0 0 / .04); color: var(--bpc-ink); outline: none; font-variant-numeric: tabular-nums;
    transition: box-shadow .15s;
  }
  .dark .bpc-field input { background: rgb(255 255 255 / .06); }
  .bpc-field input:focus { box-shadow: 0 0 0 2px var(--bpc-accent); }
  .bpc-field input::-webkit-inner-spin-button { display: none; }

  .bpc-note { font-size: 12px; color: var(--bpc-muted); line-height: 1.4; min-height: 16px; }
  .bpc-note.warn { color: hsl(25 95% 45%); }
  .bpc-note.err { color: hsl(0 84% 55%); }
  .bpc-note.ok { color: hsl(142 76% 36%); }

  .bpc-row { display: flex; gap: 8px; }
  .bpc-btn {
    height: 44px; border: 0; border-radius: 99px; padding: 0 16px; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    font-size: 14px; font-weight: 600; white-space: nowrap; transition: transform .4s var(--bpc-spring), background-color .2s, opacity .2s;
  }
  .bpc-btn:active { transform: scale(.96); }
  .bpc-btn:disabled { opacity: .4; cursor: not-allowed; }
  .bpc-btn.sec { border-radius: 12px; background: rgb(0 0 0 / .05); border: 1px solid rgb(0 0 0 / .07); color: var(--bpc-ink); font-weight: 700; }
  .bpc-btn.sec:hover { background: rgb(0 0 0 / .07); }
  .dark .bpc-btn.sec { background: rgb(255 255 255 / .07); }
  .bpc-btn.pri {
    position: relative; flex: 1; height: 44px; border-radius: 12px; padding: 0 16px; gap: 6px; white-space: nowrap;
    background: #3056ff; color: #fff; border: 1px solid #0900e0; font-weight: 700; font-size: 15px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, .2); transition: background-color .15s, transform .1s, filter .15s;
  }
  .bpc-btn.pri::after {
    content: ''; position: absolute; inset: 0; border-radius: 11px; pointer-events: none;
    border: 1px solid transparent;
    background: linear-gradient(180deg, rgba(255, 255, 255, .7), rgba(255, 255, 255, 0)) border-box;
    -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor; mask-composite: exclude;
  }
  .bpc-btn.pri:hover { background: #3b72ff; }
  .bpc-btn.pri:active { transform: translateY(1px); filter: brightness(.95); }
  .bpc-btn.pri:disabled { opacity: .3; }
  .bpc-btn.pri svg { width: 17px; height: 17px; stroke-width: 2.4; }
  .bpc-btn.ghost { height: 34px; padding: 0 12px; font-size: 13px; font-weight: 500; background: transparent; color: var(--bpc-muted); }
  .bpc-btn.ghost:hover { background: rgb(0 0 0 / .04); color: var(--bpc-ink); }

  .bpc-menu { width: 300px; }
  .bpc-hud {
    position: fixed; z-index: 9990; width: 300px; max-width: calc(100vw - 32px);
    border-radius: 20px !important; padding: 0; display: flex; flex-direction: column;
    cursor: grab; touch-action: none; user-select: none; transition: transform .2s;
    animation: bpc-pop .45s var(--bpc-spring);
  }
  .bpc-hh {
    display: flex; align-items: center; justify-content: center; gap: 7px; height: 38px; padding: 0 14px;
    font-size: 14px; font-weight: 700; color: hsl(var(--level-color, 258 90% 66%));
    background: linear-gradient(180deg, hsl(var(--level-color, 258 90% 66%) / .24), hsl(var(--level-color, 258 90% 66%) / .08));
    border-bottom: 1px solid hsl(var(--level-color, 258 90% 66%) / .16); border-radius: 20px 20px 0 0;
  }
  .bpc-hh svg { width: 16px; height: 16px; }
  .bpc-hl { display: flex; flex-direction: column; gap: 10px; padding: 10px 10px 12px 12px; min-height: 0; }
  .bpc-hh { position: relative; transition: border-radius .3s, border-color .3s; }
  .bpc-hh-n { display: none; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 99px; align-items: center; justify-content: center; box-sizing: border-box;
    font-size: 11px; font-weight: 800; color: #fff; background: hsl(var(--level-color, 258 90% 66%)); }
  .bpc-hh-t { position: absolute; right: 6px; top: 50%; width: 28px; height: 28px; margin-top: -14px; border: 0; border-radius: 9px; padding: 0;
    display: flex; align-items: center; justify-content: center; cursor: pointer; background: transparent; color: inherit; transition: background-color .15s; }
  .bpc-hh-t:hover { background: hsl(var(--level-color, 258 90% 66%) / .15); }
  .bpc-hh-t svg { width: 16px; height: 16px; transition: transform .35s var(--bpc-spring); }
  .bpc-hlw { display: grid; grid-template-rows: 1fr; transition: grid-template-rows .35s var(--bpc-spring), opacity .25s; }
  .bpc-hlw > .bpc-hl { overflow: hidden; transition: padding .35s var(--bpc-spring); }
  .bpc-hud.collapsed .bpc-hlw > .bpc-hl { padding-top: 0; padding-bottom: 0; }
  .bpc-hud.collapsed .bpc-hlw { grid-template-rows: 0fr; opacity: 0; }
  .bpc-hud.collapsed .bpc-hh { border-radius: 20px; border-bottom-color: transparent; }
  .bpc-hud.collapsed .bpc-hh-t svg { transform: rotate(-90deg); }
  .bpc-hud.collapsed .bpc-hh-n { display: inline-flex; }
  .bpc-hud.ready { transition: left .45s var(--bpc-spring), top .45s var(--bpc-spring), transform .2s; }
  .bpc-hud.drag, .bpc-hud.ready.drag { cursor: grabbing; transition: none; transform: scale(1.02); }
  .bplus-pin {
    position: absolute; top: 8px; right: 8px; z-index: 5; width: 28px; height: 28px; border-radius: 99px;
    display: flex; align-items: center; justify-content: center; cursor: pointer;
    color: rgb(0 0 0 / .4); background: rgb(255 255 255 / .85); box-shadow: 0 0 0 1px rgb(0 0 0 / .05), 0 2px 8px rgb(0 0 0 / .06);
    transition: transform .4s var(--bpc-spring), background-color .2s, color .2s;
  }
  .bplus-pin:hover { transform: scale(1.1); color: rgb(0 0 0 / .7); }
  .bplus-pin.on { color: #fff; background: hsl(var(--focus-ring, 241 100% 60%)); box-shadow: 0 4px 12px hsl(var(--focus-ring, 241 100% 60%) / .35); }
  .bplus-pin svg { width: 15px; height: 15px; }
  .bpc-hq { display: grid; grid-template-columns: 34px 1fr auto 22px; align-items: center; column-gap: 10px; }
  .bpc-hq .qring { position: relative; width: 34px; height: 34px; color: var(--qc); }
  .bpc-hq .qring > svg { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
  .bpc-hq .qring > svg circle { fill: none; stroke-width: 3.5; }
  .bpc-hq .qring .bg { stroke: var(--qc); opacity: .16; }
  .bpc-hq .qring .fg { stroke: var(--qc); stroke-linecap: round; stroke-dasharray: 0 100; transition: stroke-dasharray .7s var(--bpc-spring); }
  .bpc-hq .in { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 900; color: var(--qc); }
  .bpc-hq .in svg { position: static; width: 15px; height: 15px; transform: none; flex: none; }
  .bpc-hq .body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .bpc-hq .lbl { font-size: 10.5px; font-weight: 800; letter-spacing: .02em; text-transform: uppercase; color: var(--qc); line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bpc-hq .txt { font-size: 13px; font-weight: 600; color: var(--bpc-ink); line-height: 1.25; }
  .bpc-hq .val { font-size: 12px; font-weight: 800; color: var(--qc); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .bpc-loc { color: var(--qc); text-decoration: underline; text-underline-offset: 2px; text-decoration-thickness: 1.5px; cursor: pointer; border-radius: 4px; transition: background-color .15s; }
  .bpc-loc:hover { background: color-mix(in srgb, var(--qc) 12%, transparent); }
  .bpc-loc.nozone { display: inline-block; animation: bpc-shake .4s; }
  @keyframes bpc-shake { 25% { transform: translateX(-2px); } 75% { transform: translateX(2px); } }
  .bpc-hq-x {
    grid-row: 1; grid-column: 4; width: 22px; height: 22px; border: 0; border-radius: 99px; padding: 0; cursor: pointer;
    display: flex; align-items: center; justify-content: center; background: transparent; color: var(--bpc-muted); opacity: 0; transition: opacity .15s, background-color .15s;
  }
  .bpc-hq-x svg { width: 14px; height: 14px; }
  .bpc-hud:hover .bpc-hq-x { opacity: 1; }
  .bpc-hq-x:hover { background: rgb(0 0 0 / .06); color: var(--bpc-ink); }
  .bpc-hq { overflow: hidden; transition: height .45s cubic-bezier(.4, 0, .2, 1), opacity .3s, margin .45s cubic-bezier(.4, 0, .2, 1), transform .3s; }
  .bpc-hq .txt {
    background: linear-gradient(currentColor, currentColor) no-repeat 0 55% / 0% 1.5px;
    transition: background-size .5s cubic-bezier(.4, 0, .2, 1) .1s, opacity .4s;
  }
  .bpc-hq.finished .txt { background-size: 100% 1.5px; opacity: .55; }
  .bpc-hq.finished .in { animation: bpc-tick .5s var(--bpc-spring); }
  .bpc-hq.leaving { height: 0 !important; opacity: 0; margin-top: -10px; transform: translateX(12px); }
  @keyframes bpc-tick { from { transform: scale(.4); opacity: 0; } to { transform: none; opacity: 1; } }
  .bpc-sec-title { font-size: 12px; font-weight: 600; color: var(--bpc-muted); padding: 0 4px; display: flex; align-items: center; gap: 6px; }
  .bpc-pal { display: flex; flex-direction: column; gap: 6px; }
  .bpc-pal .bpc-btn { height: 40px; justify-content: space-between; font-weight: 500; font-size: 14px; }
  .bpc-pal .bpc-btn svg { width: 16px; height: 16px; color: var(--bpc-muted); flex: none; }
  .bpc-pal .bpc-btn:hover:not(:disabled) svg { color: currentColor; }
  .bpc-btn.pri.full { width: 100%; flex: none; }
  .bpc [hidden] { display: none !important; }
  .bplus-badges { position: fixed; inset: 0; z-index: 9989; pointer-events: none; }
  .bplus-badge {
    position: absolute; left: 0; top: 0; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 99px;
    display: flex; align-items: center; justify-content: center; box-sizing: border-box;
    background: #3341FF; color: #fff; font-size: 10px; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums;
    border: 2px solid #fff; box-shadow: 0 2px 6px rgb(0 0 0 / .18); white-space: nowrap;
  }

  .bplus-fm { position: absolute; left: 0; top: 0; width: 0; height: 0; pointer-events: none; will-change: transform; }
  .bplus-fm-c { position: absolute; left: 0; top: 0; transform: translate(-50%, -50%); pointer-events: none; }
  .bplus-fm-a { transform-origin: center; cursor: pointer; pointer-events: auto; filter: drop-shadow(0 2px 1px rgba(0,0,0,.2)); transition: transform .2s ease-out; }
  .bplus-fm-a.in { animation: bplusStickerIn .9s cubic-bezier(.34, 1.56, .64, 1) forwards; }
  .bplus-fm-a.hov { animation: bplusStickerHover .6s ease-in-out forwards; transform: scale(1.08); }
  @keyframes bplusStickerIn { 0% { transform: scale(0) rotate(-10deg); opacity: 0; } 55% { transform: scale(1.12) rotate(6deg); opacity: 1; } 72% { transform: scale(.97) rotate(-3deg); } 86% { transform: scale(1.02) rotate(1.5deg); } 100% { transform: scale(1) rotate(0); } }
  @keyframes bplusStickerHover { 0% { transform: scale(1.08) rotate(0); } 30% { transform: scale(1.08) rotate(4deg); } 60% { transform: scale(1.08) rotate(-3deg); } 100% { transform: scale(1.08) rotate(0); } }

  .bplus-snd-card > div:nth-child(2) h3 > span.opacity-50 { display: none; }
  .bplus-sndpage { position: absolute; inset: 0; overflow-y: auto; background: #fff; transform: translateX(100%); transition: transform .3s ease-out; z-index: 5; }
  .bplus-sndpage.in { transform: none; }
  .bps-swrap { padding: 8px 0 32px; }
  .bps-ssec { padding: 24px 32px 8px; display: flex; flex-direction: column; gap: 4px; }
  .bps-sh { display: flex; align-items: center; gap: 10px; margin: 0 0 12px; font: 800 24px Satoshi, sans-serif; color: #000; }
  .bps-slogo { display: flex; }
  .bps-slogo svg { width: 28px; height: 28px; }
  .bps-ssub { margin: -8px 0 8px; font: 600 14px Satoshi, sans-serif; color: rgba(0, 0, 0, .45); }
  .bps-wip { padding: 3px 10px; border-radius: 99px; background: rgb(249 115 22 / .12); color: #EA580C; font: 700 12px Satoshi, sans-serif; letter-spacing: .01em; }
  .bps-game { width: 28px; height: 28px; border-radius: 50%; background: rgb(132 204 22 / .12); color: #65A30D; align-items: center; justify-content: center; }
  .bps-game svg { width: 16px !important; height: 16px !important; }
  .bps-wip.sm { padding: 1px 6px; font-size: 10px; margin-left: 6px; }
  .bps-seg { flex: none; display: flex; padding: 3px; gap: 2px; border-radius: 12px; background: rgba(0, 0, 0, .05); }
  .bps-seg button { display: flex; align-items: center; height: 30px; padding: 0 12px; border: 0; border-radius: 9px; background: transparent; font: 700 13px Satoshi, sans-serif; color: rgba(0, 0, 0, .55); cursor: pointer; transition: background-color .15s, color .15s, box-shadow .15s; }
  .bps-seg button[aria-checked="true"] { background: #fff; color: #000; box-shadow: 0 1px 4px rgb(0 0 0 / .12); }
  .bps-seg button:disabled { cursor: default; opacity: .6; }
  .bps-sdiv { height: 1px; background: rgba(0, 0, 0, .06); margin: 16px 0 0; }
  .bps-srow { display: flex; align-items: center; gap: 12px; padding: 12px 0; }
  .bps-srow.wip { opacity: .45; }
  .bps-stxt { flex: 1; min-width: 0; }
  .bps-st { font: 500 17px Satoshi, sans-serif; color: #000; }
  .bps-sd { font: 500 14px Satoshi, sans-serif; color: rgba(0, 0, 0, .45); margin-top: 2px; }
  .bps-dep { transition: opacity .2s; }
  .bps-dep.off { opacity: .4; pointer-events: none; }
  .bps-sw2 { flex: none; position: relative; width: 52px; height: 30px; border: 0; border-radius: 99px; background: rgba(0, 0, 0, .08); cursor: pointer; transition: background-color .2s; padding: 0; }
  .bps-sw2::after { content: ''; position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 50%; background: #fff; box-shadow: 0 2px 6px rgb(0 0 0 / .2); transition: transform .25s cubic-bezier(.3, 1.4, .5, 1); }
  .bps-sw2[aria-checked="true"] { background: #0A7CFF; }
  .bps-sw2[aria-checked="true"]::after { transform: translateX(22px); }
  .bps-sw2:disabled { cursor: default; }
  .bps-play { flex: none; width: 32px; height: 32px; border: 0; border-radius: 10px; background: rgba(0, 0, 0, .04); color: rgba(0, 0, 0, .6); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background-color .15s, color .15s; }
  .bps-play:hover { background: rgba(0, 0, 0, .08); color: #000; }
  .bps-range { -webkit-appearance: none; appearance: none; width: 160px; height: 6px; border-radius: 99px; background: linear-gradient(to right, #0A7CFF var(--p, 50%), rgba(0, 0, 0, .08) var(--p, 50%)); outline: none; cursor: pointer; }
  .bps-range::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 2px 6px rgb(0 0 0 / .25); border: 0; }
  .bps-range::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 2px 6px rgb(0 0 0 / .25); border: 0; }
  .bps-range.sm { width: 72px; height: 4px; flex: none; }
  .bps-range.sm::-webkit-slider-thumb { width: 14px; height: 14px; }
  .bps-range.sm::-moz-range-thumb { width: 14px; height: 14px; }
  .bps-pct { width: 40px; text-align: right; font: 600 13px Satoshi, sans-serif; color: rgba(0, 0, 0, .5); font-variant-numeric: tabular-nums; }

  .bplus-fr-host { display: flex; align-items: center; min-width: 0; }
  .bplus-fr-host > .bplus-fr-chip { flex: none; }
  .bplus-fr-chip { display: inline-flex; align-items: center; gap: 3px; height: 18px; margin-left: 6px; padding: 0 7px 0 6px; border-radius: 99px; vertical-align: middle; font: 700 11px Satoshi, sans-serif; line-height: 1; white-space: nowrap; transition: background-color .15s, color .15s, opacity .15s; }
  .bplus-fr-chip svg { width: 12px; height: 12px; flex: none; }
  .bplus-fr-chip.st-friend { background: rgb(34 197 94 / .12); color: #16A34A; }
  .bplus-fr-chip.st-sent { background: rgba(0, 0, 0, .05); color: rgba(0, 0, 0, .45); }
  .bplus-fr-chip.st-none { background: rgb(10 124 255 / .1); color: #0A7CFF; cursor: pointer; }
  .bplus-fr-chip.st-none:hover { background: rgb(10 124 255 / .18); }
  .bplus-fr-chip.st-received { background: #0A7CFF; color: #fff; cursor: pointer; }
  .bplus-fr-chip.st-received:hover { background: #0066E0; }
  .bplus-fr-chip.busy { opacity: .5; pointer-events: none; }
  .bplus-fr-chip.err { background: rgb(220 38 38 / .12); color: #DC2626; animation: bplusShake .4s; }
  @keyframes bplusShake { 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }

  .bplus-fav-tab { position: relative; }
  .bplus-fav-tab .bpf-tab-ic { width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; color: rgba(0, 0, 0, .5); transition: color .2s; }
  .bplus-fav-tab .bpf-tab-lbl { font-family: Satoshi, sans-serif; font-size: 16px; font-weight: 600; line-height: normal; white-space: nowrap; color: rgba(0, 0, 0, .5); transition: color .2s; }
  .bplus-fav-tab.on .bpf-tab-ic, .bplus-fav-tab.on .bpf-tab-lbl { color: #EC4899; }
  .bplus-favmode > button[role="tab"]:not(.bplus-fav-tab) span { color: rgba(0, 0, 0, .5) !important; }

  .bplus-favs { position: absolute; left: 0; right: 0; bottom: 0; z-index: 30; background: #fff; display: flex; flex-direction: column; border-radius: 0 0 24px 24px; }
  .bpf-list { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 16px; }
  .bpf-row { display: flex; align-items: center; gap: 8px; }
  .bpf-main { flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px; border: 0; background: none; padding: 0; cursor: pointer; text-align: left; transition: opacity .15s; }
  .bpf-main:hover { opacity: .9; }
  .bpf-thumb { flex: none; width: 75px; height: 50px; border-radius: 8px; border: 1px solid rgba(0, 0, 0, .1); background: #F1F1F1; overflow: hidden; }
  .bpf-thumb img { width: 100%; height: 100%; object-fit: cover; image-rendering: pixelated; display: block; }
  .bpf-txt { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .bpf-name { font-size: 16px; font-weight: 600; color: #000; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bpf-meta { font-size: 12px; font-weight: 500; color: rgba(0, 0, 0, .5); }
  .bpf-input { font: 600 15px Satoshi, sans-serif; color: #000; border: 2px solid #EC4899; border-radius: 8px; padding: 2px 6px; outline: none; width: 100%; min-width: 0; }
  .bpf-ic { flex: none; width: 32px; height: 32px; border: 0; border-radius: 10px; background: transparent; color: rgba(0, 0, 0, .4); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background-color .15s, color .15s; }
  .bpf-ic:hover { background: rgb(0 0 0 / .05); color: rgba(0, 0, 0, .75); }
  .bpf-ic[data-d]:hover { color: #DC2626; background: rgb(220 38 38 / .08); }
  .bpf-empty { margin: 32px auto; display: flex; flex-direction: column; align-items: center; gap: 10px; color: rgba(0, 0, 0, .4); font-size: 14px; font-weight: 600; text-align: center; }
  .bpf-empty svg { width: 32px; height: 32px; color: #F59E0B; opacity: .6; }
  .bpf-empty small { font-size: 12px; font-weight: 500; color: rgba(0, 0, 0, .4); max-width: 260px; }
  .bplus-star-btn { margin-left: 8px; margin-right: auto; color: rgba(0, 0, 0, .75); }
  .bplus-star-btn svg { width: 18px !important; height: 18px !important; fill: none; transition: fill .15s, color .15s; }
  .bplus-star-btn.on svg { fill: currentColor; }
  .bplus-star-btn.pop svg { animation: bplus-pop .35s cubic-bezier(.3, 1.6, .5, 1); }
  @keyframes bplus-pop { 0% { transform: scale(.6); } 100% { transform: scale(1); } }

  .bplus-mi { position: relative; }
  .bplus-mi .bplus-dot { position: absolute; left: 30px; top: 9px; width: 8px; height: 8px; border-radius: 99px; background: hsl(var(--notification-badge-bg, 348 83% 47%)); box-shadow: 0 0 0 2px #fff; }
  .bplus-mi .bplus-dot[hidden] { display: none; }

  .bplus-scrim {
    position: fixed; inset: 0; z-index: 100; background: rgb(0 0 0 / 0);
    -webkit-backdrop-filter: blur(0); backdrop-filter: blur(0);
    transition: background-color .3s, backdrop-filter .3s, -webkit-backdrop-filter .3s;
  }
  .bplus-scrim.open { background: rgb(0 0 0 / .25); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); }
  .bplus-sheet {
    position: fixed; z-index: 101; right: 16px; width: 500px; max-width: calc(100vw - 32px);
    top: calc(16px + var(--safe-area-top, 0px)); bottom: calc(16px + var(--safe-area-bottom, 0px));
    background: #fff; border-radius: 24px; outline: 1px solid rgb(0 0 0 / .05); box-shadow: 0 16px 32px rgb(0 0 0 / .1);
    display: flex; flex-direction: column; overflow: hidden; color: #000;
    transform: translateX(calc(100% + 24px)); transition: transform .3s ease-out;
  }
  .bplus-sheet.open { transform: none; }
  .bps-head { flex: none; display: grid; grid-template-columns: 40px 1fr 40px; align-items: center; gap: 8px; padding: 12px 16px; border-bottom: 1px solid rgb(0 0 0 / .05); }
  .bps-title { display: flex; align-items: center; justify-content: center; gap: 8px; color: #525252; font-size: 16px; font-weight: 600; }
  .bps-title svg { width: 20px; height: 20px; }
  .bps-btn { width: 40px; height: 40px; border: 0; border-radius: 12px; background: rgb(0 0 0 / .03); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); color: #262626; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background-color .15s; }
  .bps-btn:hover { background: rgb(0 0 0 / .06); }
  .bps-btn svg { width: 16px; height: 16px; }
  .bps-body { flex: 1; overflow-y: auto; padding: 24px 32px 32px; display: flex; flex-direction: column; gap: 12px; }
  .bps-card {
    display: flex; align-items: center; gap: 16px; width: 100%; padding: 20px 22px; border-radius: 20px; cursor: pointer; text-align: left;
    background: #fff; border: 1px solid rgb(0 0 0 / .06); color: #000; transition: background-color .15s, box-shadow .15s;
  }
  .bps-card:hover { background: #fafafa; }
  .bps-ic { flex: none; width: 48px; height: 48px; border-radius: 99px; display: flex; align-items: center; justify-content: center; color: var(--tint); background: color-mix(in srgb, var(--tint) 12%, #fff); }
  .bps-ic svg { width: 22px; height: 22px; }
  .bps-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .bps-t { font-size: 16px; font-weight: 700; line-height: 1.3; }
  .bps-d { font-size: 14px; font-weight: 500; color: #737373; line-height: 1.35; }
  .bps-chev { flex: none; color: #737373; display: flex; }
  .bps-badge { flex: none; font-size: 12px; font-weight: 700; color: #fff; background: hsl(var(--notification-badge-bg, 348 83% 47%)); padding: 3px 8px; border-radius: 99px; }
  .bps-sw { flex: none; position: relative; width: 44px; height: 24px; border-radius: 99px; border: 2px solid transparent; background: rgb(0 0 0 / .12); transition: background-color .2s; box-sizing: border-box; }
  .bps-card.on .bps-sw { background: #3341FF; }
  .bps-sw i { position: absolute; top: 0; left: 0; width: 20px; height: 20px; border-radius: 99px; background: #fff; box-shadow: 0 4px 8px rgb(0 0 0 / .12), 0 1px 2px rgb(0 0 0 / .1); transition: transform .2s; }
  .bps-card.on .bps-sw i { transform: translateX(20px); }
  .bps-foot { margin-top: 8px; display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; font-size: 12px; font-weight: 600; color: #a3a3a3; }
  .bps-links { display: flex; gap: 8px; }
  .bps-note { margin: 2px 0 0; max-width: 360px; padding: 12px 16px; border-radius: 16px; border: 1px solid rgba(0, 0, 0, .05); background: rgba(0, 0, 0, .025); font: 500 13px/1.45 Satoshi, sans-serif; color: rgba(0, 0, 0, .55); text-wrap: pretty; }
  .bps-ver-l { margin-top: auto; padding-top: 24px; text-align: center; font-size: 12px; font-weight: 600; color: #a3a3a3; }
  .bps-link { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border: 0; border-radius: 10px; background: rgba(0, 0, 0, .04); color: rgba(0, 0, 0, .6); font: 600 13px Satoshi, sans-serif; text-decoration: none; cursor: pointer; transition: background-color .15s, color .15s; }
  .bps-link svg { width: 16px; height: 16px; }
  .bps-link:hover { background: rgba(0, 0, 0, .08); color: #000; }
  .bps-link.ok { color: #16A34A; background: rgb(34 197 94 / .12); }
  .bps-title svg { border-radius: 6px; }
  .bps-h { margin: 0 0 4px; font-size: 22px; font-weight: 700; color: #262626; }
  .bps-log { border: 1px solid rgb(0 0 0 / .06); border-radius: 20px; padding: 18px 20px; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 4px 16px rgb(0 0 0 / .02); }
  .bps-log.latest { border-color: rgb(51 65 255 / .2); background: linear-gradient(180deg, rgb(51 65 255 / .04), #fff 60%); }
  .bps-log-head { display: flex; align-items: center; gap: 8px; }
  .bps-ver { font-size: 12px; font-weight: 700; color: #3341FF; background: rgb(51 65 255 / .1); padding: 2px 8px; border-radius: 6px; }
  .bps-date { font-size: 12px; font-weight: 500; color: #a3a3a3; }
  .bps-log-t { font-size: 17px; font-weight: 700; text-transform: uppercase; color: #000; line-height: 1.3; }
  .bps-log-l { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; font-size: 14px; color: #404040; line-height: 1.45; }
  @media (max-width: 767px) { .bplus-sheet { left: 16px; width: auto; } }
  @keyframes bpc-pop { from { opacity: 0; transform: scale(.92) translateY(8px); } to { opacity: 1; transform: none; } }
  @keyframes bpc-in { from { opacity: 0; transform: translate(-50%, -8px); } to { opacity: 1; transform: translate(-50%, 0); } }
  `;

  
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  const fmt = (n) => { try { return n.toLocaleString(lang()); } catch (e) { return n.toLocaleString('en'); } };
  const surface = 'floating-surface bpc-surface';

  let fab, panel = null, selecting = false, blocked = false, cancelSelection = null;
  const LS = 'bpc:last';

  function init() {
    const st = el('style');
    st.textContent = CSS;
    document.head.appendChild(st);

    fab = el('button', `bpc bpc-fab ${surface}`, `${ICON.scan}<span class="bpc-tip"><span class="lbl">${T('capture')}</span><kbd>${T('shortcut')}</kbd></span>`);
    fab.setAttribute('aria-label', T('capture'));
    fab.addEventListener('click', () => {
      if (selecting || blocked) return;
      if (MOD.capture && !MOD.palettes) { startSelection(); return; }
      if (panel && panel.classList.contains('bpc-menu')) closePanel(); else openMenu();
    });
    document.body.appendChild(fab);

    window.addEventListener('keydown', (e) => {
      if (e.altKey && e.shiftKey && e.code === 'KeyS') {
        e.preventDefault(); e.stopPropagation();
        if (!selecting && !blocked && MOD.capture) startSelection();
      }
    }, true);

    watchSiteUi();
    applyModules();
    injectMenuItem();

    let curLang = lang();
    new MutationObserver(() => {
      if (lang() === curLang) return;
      curLang = lang();
      localeFetch = null;
      updateFabTip();
      if (sheet) renderSheet();
      injectMenuItem(true);
      const reopenMenu = panel && panel.classList.contains('bpc-menu');
      closePanel();
      if (reopenMenu) openMenu();
      renderHud();
      syncPinButtons();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }

  
  function siteUiCoversFab() {
    const b = fab.getBoundingClientRect();
    const vw = innerWidth, vh = innerHeight;
    const pts = [[0.5, 0.5], [0.15, 0.15], [0.85, 0.15], [0.15, 0.85], [0.85, 0.85]];
    for (const [fx, fy] of pts) {
      for (const e of document.elementsFromPoint(b.left + b.width * fx, b.top + b.height * fy)) {
        if (e === document.documentElement || e === document.body) continue;
        if (e.closest('.bpc') || e.closest('.maplibregl-map')) continue;
        const r = e.getBoundingClientRect();
        if (r.width >= vw * 0.9 && r.height >= vh * 0.9) continue;
        return true;
      }
    }
    return false;
  }

  let lastMap = null, lastWorld = null;
  function checkWorld() {
    const m = map(), w = currentWorld();
    if (m === lastMap && w === lastWorld) return;
    const first = lastMap === null && lastWorld === null;
    lastMap = m; lastWorld = w;
    if (first) return;
    if (cancelSelection) cancelSelection();
    closePanel();
    clearFavMarkers();
    if (m) { try { m.once('idle', () => { refreshFavSource(); ensureFavLayer(); }); } catch (e) {} }
  }

  function updateBlocked() {
    checkWorld();
    const now = siteUiCoversFab();
    if (now === blocked) return;
    blocked = now;
    fab.classList.toggle('bpc-hide', blocked);
    if (blocked) {
      if (cancelSelection) cancelSelection();
      closePanel();
    }
  }

  function watchSiteUi() {
    let pending = false;
    const schedule = () => {
      if (pending) return;
      pending = true;
      setTimeout(() => { pending = false; updateBlocked(); scanCards(); placeHud(); injectMenuItem(); injectFavTab(); injectPixelStar(); injectFriends(); injectSoundsCard(); kickBadges(); }, 120);
    };
    new MutationObserver(() => { injectMenuItem(); schedule(); }).observe(document.body, {
      childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'data-state'],
    });
    window.addEventListener('resize', schedule);
    setInterval(() => { updateBlocked(); placeHud(); ensureFavLayer(); kickBadges(); }, 600);
    updateBlocked();
  }

  
  function startSelection() {
    const m = map();
    if (blocked || !MOD.capture) return;
    if (!m) { toastError(T('mapMissing')); return; }
    closePanel();
    selecting = true;
    fab.classList.add('on');
    renderHud();
    const world = currentWorld();
    if (!world) { selecting = false; fab.classList.remove('on'); toastError(T('worldUnsupported')); return; }

    const ov = el('div', 'bpc bpc-ov');
    const hint = el('div', `bpc bpc-hint ${surface}`,
      `${T('select')}<span class="sep"></span>${T('esc')}`);
    const sel = el('div', 'bpc bpc-sel');
    const label = el('div', 'bpc-label');
    sel.appendChild(label);
    document.body.append(ov, hint, sel);

    let a = null, b = null, dragging = false;
    const rectG = () => ({
      x: Math.min(a.x, b.x), y: Math.min(a.y, b.y),
      w: Math.abs(a.x - b.x) + 1, h: Math.abs(a.y - b.y) + 1,
    });
    const render = () => {
      if (!a) return;
      const g = rectG();
      const p0 = m.project(fromGrid(g.x, g.y, world));
      const p1 = m.project(fromGrid(g.x + g.w, g.y + g.h, world));
      Object.assign(sel.style, {
        display: 'block', left: p0.x + 'px', top: p0.y + 'px',
        width: Math.max(2, p1.x - p0.x) + 'px', height: Math.max(2, p1.y - p0.y) + 'px',
      });
      label.textContent = `${g.w} × ${g.h}  ·  ${g.x}, ${g.y}`;
    };
    const gridAt = (e) => toGrid(m.unproject([e.clientX, e.clientY]), world);

    const end = () => {
      ov.remove(); hint.remove(); sel.remove();
      m.off('move', render);
      window.removeEventListener('keydown', onKey, true);
      selecting = false;
      cancelSelection = null;
      fab.classList.remove('on');
      renderHud();
    };
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); end(); } };

    ov.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      dragging = true;
      a = b = gridAt(e);
      ov.setPointerCapture(e.pointerId);
      render();
    });
    ov.addEventListener('pointermove', (e) => { if (dragging) { b = gridAt(e); render(); } });
    ov.addEventListener('pointerup', (e) => {
      if (!dragging) return;
      dragging = false;
      b = gridAt(e);
      const g = rectG();
      end();
      openPanel(world, g);
    });
    ov.addEventListener('wheel', (e) => {
      e.preventDefault();
      const z = m.getZoom() - e.deltaY * (e.deltaMode ? 0.08 : 0.0025);
      m.easeTo({ zoom: Math.max(m.getMinZoom(), Math.min(m.getMaxZoom(), z)), around: m.unproject([e.clientX, e.clientY]), duration: 0 });
    }, { passive: false });
    m.on('move', render);
    window.addEventListener('keydown', onKey, true);
    cancelSelection = end;
  }

  
  let panelCleanup = null;
  function closePanel() {
    if (panelCleanup) { panelCleanup(); panelCleanup = null; }
    if (panel) { panel.remove(); panel = null; }
  }

  
  function openMenu() {
    closePanel();
    panel = el('div', `bpc bpc-panel bpc-menu ${surface}`);
    panel.innerHTML = `
      <div class="bpc-head"><h3>${T('capture')}</h3><button class="bpc-icon-btn" data-x title="${T('close')}">${ICON.x}</button></div>
      ${MOD.capture ? `<button class="bpc-btn pri full" data-cap>${T('captureBtn')}${ICON.scan}</button>` : ''}
      <div class="bpc-sec-title"${MOD.palettes ? '' : ' hidden'}>${ICON.palette}${T('palette')}</div>
      <div class="bpc-pal"${MOD.palettes ? '' : ' hidden'}>
        <button class="bpc-btn sec" data-k="free"><span>${T('palBase')}</span>${ICON.dl}</button>
        <button class="bpc-btn sec" data-k="unlocked"><span>${T('palMine')}</span>${ICON.dl}</button>
        <button class="bpc-btn sec" data-k="all"><span>${T('palAll')}</span>${ICON.dl}</button>
      </div>
      <div class="bpc-note"></div>`;
    document.body.appendChild(panel);
    const note = panel.querySelector('.bpc-note');
    const NAMES = { free: T('kplFree'), unlocked: T('kplUnlocked'), all: T('kplAll') };
    const TITLES = { free: `bplace - ${T('palBase')}`, unlocked: `bplace - ${T('palMine')}`, all: `bplace - ${T('palAll')}` };

    const refresh = () => {
      panel.querySelectorAll('.bpc-pal [data-k]').forEach((b) => {
        const set = paletteSet(b.dataset.k);
        b.disabled = !set || !set.length;
      });
      note.textContent = DATA.colors ? '' : T('paletteMissing');
    };
    refresh();
    dataListeners.add(refresh);
    panelCleanup = () => dataListeners.delete(refresh);

    panel.querySelector('[data-x]').onclick = closePanel;
    const capBtn = panel.querySelector('[data-cap]');
    if (capBtn) capBtn.onclick = () => startSelection();
    panel.querySelectorAll('.bpc-pal [data-k]').forEach((b) => {
      b.onclick = () => {
        const k = b.dataset.k, set = paletteSet(k);
        if (!set || !set.length) return;
        downloadBlob(makeKpl(set, TITLES[k]), `bplace_${NAMES[k]}.kpl`);
        playSound('palette');
        note.className = 'bpc-note ok';
        note.textContent = `bplace_${NAMES[k]}.kpl`;
      };
    });
  }

  function toastError(msg) {
    closePanel();
    panel = el('div', `bpc bpc-panel ${surface}`);
    panel.innerHTML = `<div class="bpc-head"><h3>${T('capture')}</h3><button class="bpc-icon-btn" data-x title="${T('close')}">${ICON.x}</button></div><div class="bpc-note err"></div>`;
    panel.querySelector('.bpc-note').textContent = msg;
    panel.querySelector('[data-x]').onclick = closePanel;
    document.body.appendChild(panel);
  }

  function openPanel(world, g) {
    closePanel();
    try { localStorage.setItem(LS, JSON.stringify({ world, ...g })); } catch (e) {}

    panel = el('div', `bpc bpc-panel ${surface}`);
    panel.innerHTML = `
      <div class="bpc-head">
        <h3>${T('capture')}</h3>
        <span class="bpc-world">${world === 'moon' ? T('moon') : T('earth')}</span>
        <button class="bpc-icon-btn" data-x title="${T('close')}">${ICON.x}</button>
      </div>
      <div class="bpc-prev"><span class="bpc-loading">${T('loading')}</span></div>
      <div class="bpc-chips"></div>
      <div class="bpc-fields">
        <label class="bpc-field"><span>X</span><input data-k="x" type="number" min="0"></label>
        <label class="bpc-field"><span>Y</span><input data-k="y" type="number" min="0"></label>
        <label class="bpc-field"><span>${T('width')}</span><input data-k="w" type="number" min="1" max="${MAX_SIDE}"></label>
        <label class="bpc-field"><span>${T('height')}</span><input data-k="h" type="number" min="1" max="${MAX_SIDE}"></label>
      </div>
      <div class="bpc-note"></div>
      <div class="bpc-row">
        <button class="bpc-btn sec" data-copy>${ICON.copy}${T('copy')}</button>
        <button class="bpc-btn pri" data-dl>${T('download')}${ICON.dl}</button>
      </div>
      <div class="bpc-row" style="justify-content:space-between">
        <button class="bpc-btn ghost" data-new>${ICON.select}${T('newSel')}</button>
        <button class="bpc-btn ghost" data-refresh>${ICON.refresh}${T('refresh')}</button>
      </div>`;
    document.body.appendChild(panel);

    const $ = (s) => panel.querySelector(s);
    const prev = $('.bpc-prev'), chips = $('.bpc-chips'), note = $('.bpc-note');
    const inputs = [...panel.querySelectorAll('input[data-k]')];
    const btnDl = $('[data-dl]'), btnCp = $('[data-copy]');
    let current = null, token = 0;

    const setNote = (txt, cls = '') => { note.className = 'bpc-note ' + cls; note.textContent = txt; };
    const fill = (r) => inputs.forEach((i) => { i.value = r[i.dataset.k]; });
    const read = () => Object.fromEntries(inputs.map((i) => [i.dataset.k, Math.round(+i.value)]));

    async function load(r) {
      const my = ++token;
      current = null;
      btnDl.disabled = btnCp.disabled = true;
      prev.innerHTML = `<span class="bpc-loading">${T('loading')}</span>`;
      chips.innerHTML = '';
      setNote('');
      try {
        const res = await fetchRegion(r.x, r.y, r.w, r.h, world);
        if (my !== token || !panel) return;
        if (!current) playSound('capture');
        current = { ...r, canvas: res.canvas };
        const s = stats(res.canvas);
        const zoom = Math.max(1, Math.min(24, Math.floor(Math.min(300 / r.w, 220 / r.h))));
        res.canvas.style.width = r.w * zoom + 'px';
        res.canvas.style.height = r.h * zoom + 'px';
        prev.innerHTML = '';
        prev.appendChild(res.canvas);
        chips.innerHTML = '';
        for (const [txt, main] of [[`${r.w} × ${r.h} px`, true], [`${fmt(s.painted)} px`], [`${s.colors} ${T('colors')}`]]) {
          const c = el('span', 'bpc-chip' + (main ? ' main' : ''));
          c.textContent = txt;
          chips.appendChild(c);
        }
        btnDl.disabled = btnCp.disabled = false;
        if (res.failed) setNote(T('tilesFailed', { n: res.failed }), 'warn');
        else if (res.dirty) setNote(T('tileUpdating'), 'warn');
        else setNote('');
      } catch (e) {
        if (my !== token || !panel) return;
        prev.innerHTML = '';
        setNote(e.message || String(e), 'err');
      }
    }

    fill(g);
    load(g);

    let deb = null;
    inputs.forEach((i) => i.addEventListener('input', () => {
      clearTimeout(deb);
      deb = setTimeout(() => load(read()), 450);
    }));
    inputs.forEach((i) => i.addEventListener('keydown', (e) => e.stopPropagation()));

    $('[data-x]').onclick = closePanel;
    $('[data-new]').onclick = () => startSelection();
    $('[data-refresh]').onclick = () => load(read());

    btnDl.onclick = () => {
      if (!current) return;
      current.canvas.toBlob((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `bplace_${world}_${current.x}_${current.y}_${current.w}x${current.h}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        setNote(T('saved'), 'ok');
      }, 'image/png');
    };
    btnCp.onclick = () => {
      if (!current) return;
      current.canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          setNote(T('copied'), 'ok');
        } catch (e) {
          setNote(T('copyFailed'), 'err');
        }
      }, 'image/png');
    };
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel && !selecting && !(e.target instanceof HTMLInputElement)) closePanel();
  });

  (function waitForMap(n = 0) {
    if (document.body && (map() || n > 120)) { init(); return; }
    setTimeout(() => waitForMap(n + 1), 250);
  })();
})();
