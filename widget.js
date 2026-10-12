/*! Smartsvar chatt v4 – en fil för alla kunder.
    Laddas med <script src=".../widget.js" data-bot="kund" defer></script> (konfigurationen hämtas från clients/kund.json bredvid filen),
    med data-config="chat.json", eller med window.SMARTSVAR = { ... } före skriptet.
    Inbäddad (testchatt): SmartsvarChat.mount(config, { inline: element }).

    Looken: en klassisk, ren AI-chatt.
    - Ljus header med symbol, namn och status. Symbolen är en kvadratisk logga, en ikon eller en bokstav.
    - Samtalet samlas nederst, närmast skrivfältet. Botens svar i ljusgrå bubblor, besökarens i kundens färg.
    - Svaren strömmar fram i lugn takt. Medan boten tänker står "Tänker" på besökarens språk, aldrig prickar.
    - Exakta kundfärger på ytor; toner, linjer och grå text räknas fram i OKLCH.
    - 4 typsnittspar, 2 former. Emojis rensas bort ur all text. Startförslag max 3, som pratbubblor eller lista.
    Voiceflow: svarar på ext_browserData, ext_waitingAnimation, ext_doneAnimation, ext_placeholder och
    ext_disableInput (annars fastnar flödet) och visar text, knappar, kort, karuseller och bilder.
    v4.1: thinking: 'oven' visar en pizzaugn medan boten tänker. En napolitansk pizza skjuts in i ugnen,
    och när svaret kommer tas den ut på ett fat innan texten skrivs fram. Utan inställningen ser allt ut som förut. */
(function () {
  'use strict';
  if (window.SmartsvarChat && window.SmartsvarChat.__v) return;

  var script = document.currentScript || null;
  if (!script) { var sc = document.querySelectorAll('script[data-bot],script[data-config],script[src*="widget.js"]'); script = sc[sc.length - 1] || null; }
  var BASE = script && script.src ? script.src.replace(/[?#].*$/, '').replace(/[^/]*$/, '') : '';

  /* ---------- Det AI:n får välja mellan ---------- */
  var FONTS = { // [rubrik, brödtext, rubrikvikt, serif, storleksfaktor för rubriker]
    modern: ['Plus Jakarta Sans', 'Plus Jakarta Sans', 700],
    technical: ['Archivo', 'Archivo', 700],
    classic: ['Fraunces', 'Figtree', 600, 1],
    elegant: ['Cormorant Garamond', 'Jost', 600, 1, 1.2]
  };
  var FONT_ALIAS = { friendly: 'modern', sturdy: 'technical' };
  var SHAPES = { soft: [24, 20, 999, '50%'], sharp: [14, 10, 10, '9px'] }; // panel, bubblor, knappar, symbol
  var SHAPE_ALIAS = { round: 'soft', square: 'sharp' };
  var ICONS = {
    bolt: 'M13 2 4 14h7l-1 8 9-12h-7z', book: 'M4 19.5V5a2 2 0 0 1 2-2h14v16H6.5A2.5 2.5 0 0 0 4 21.5M4 19.5A2.5 2.5 0 0 1 6.5 17H20',
    leaf: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10ZM2 21c0-3 1.9-5.4 5.1-6C9.5 14.5 12 13 13 12',
    tree: 'M12 3 6 11h3l-4 6h14l-4-6h3zM12 17v4', home: 'M3 10.5 12 3l9 7.5V21H3zM9 21v-6h6v6',
    food: 'M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7',
    heart: 'M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z',
    chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'
  };
  var UI = { send: 'M12 19V5M5.5 11.5 12 5l6.5 6.5', reset: 'M4 12a8 8 0 1 0 2.4-5.7M4 4.5v4.3h4.3', down: 'M6 9.5l6 6 6-6', x: 'M6 6l12 12M18 6 6 18', go: 'M5 12h14M13 6l6 6-6 6', left: 'M15 5l-7 7 7 7', right: 'M9 5l7 7-7 7' };
  // Chattknappens symbol: en fylld pratbubbla med en liten AI-stjärna i knappens egen färg.
  var CHAT_ICON = '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">' +
    '<path fill="currentColor" d="M12 3C7.03 3 3 6.58 3 11c0 2.13.94 4.07 2.47 5.5l-.86 3.9c-.1.45.36.8.77.6l4.1-1.95c.8.2 1.65.3 2.52.3 4.97 0 9-3.58 9-8.35C21 6.58 16.97 3 12 3z"/>' +
    '<path class="sp" d="M12 6.7c.32 2.3 1.5 3.55 3.9 4.15-2.4.6-3.58 1.85-3.9 4.15-.32-2.3-1.5-3.55-3.9-4.15 2.4-.6 3.58-1.85 3.9-4.15z"/></svg>';
  var SERIF = /serif|garamond|playfair|lora|merriweather|fraunces|cormorant|caslon|baskerville|crimson|spectral|bodoni|cinzel|prata|abril|literata|newsreader|gloock|young serif/i;

  /* ---------- Färg (OKLCH) ---------- */
  function rgb(h) { h = String(h || '').replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16) || 0; }); }
  function hex(c) { return '#' + c.map(function (v) { return ('0' + Math.round(Math.min(255, Math.max(0, v))).toString(16)).slice(-2); }).join(''); }
  function rgba(h, a) { return 'rgba(' + rgb(h).join(',') + ',' + a + ')'; }
  function lin(v) { v /= 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }
  function unlin(v) { return 255 * (v <= .0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - .055); }
  function toLch(h) {
    var c = rgb(h).map(lin), r = c[0], g = c[1], b = c[2];
    var l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b),
        m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b),
        s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
    var L = .2104542553 * l + .793617785 * m - .0040720468 * s,
        A = 1.9779984951 * l - 2.428592205 * m + .4505937099 * s,
        B = .0259040371 * l + .7827717662 * m - .808675766 * s;
    return [L, Math.sqrt(A * A + B * B), (Math.atan2(B, A) * 180 / Math.PI + 360) % 360];
  }
  function lch(L, C, H) { // minskar mättnaden tills färgen ryms i sRGB
    for (var i = 0; i < 80; i++) {
      var a = C * Math.cos(H * Math.PI / 180), b = C * Math.sin(H * Math.PI / 180);
      var l = Math.pow(L + .3963377774 * a + .2158037573 * b, 3),
          m = Math.pow(L - .1055613458 * a - .0638541728 * b, 3),
          s = Math.pow(L - .0894841775 * a - 1.291485548 * b, 3);
      var c = [4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, -.0041960863 * l - .7034186147 * m + 1.707614701 * s];
      if (C < .0005 || c.every(function (v) { return v >= -.0005 && v <= 1.0005; })) return hex(c.map(function (v) { return unlin(Math.min(1, Math.max(0, v))); }));
      C *= .93;
    }
    return hex([L * 255, L * 255, L * 255]);
  }
  function lum(h) { var c = rgb(h).map(lin); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
  function on(h, ink) { return contrast(h, '#ffffff') >= contrast(h, ink) ? '#ffffff' : ink; }
  function num(v, d) { v = Number(v); return isFinite(v) && v >= 0 ? v : d; }

  function look(C) {
    // P och A är kundens exakta färger och används orörda. Allt annat räknas fram.
    var c = C.colors || {}, P = hex(rgb(c.primary || '#22324A')), A = hex(rgb(c.accent || c.primary || P));
    var p = toLch(P), a = toLch(A);
    var vivid = a[1] > p[1] ? a : p;
    var k = vivid[1] > .03 ? 1 : 0, hue = p[1] > .03 ? p[2] : vivid[2];
    var D = c.dark ? hex(rgb(c.dark)) : p[0] < .45 ? P : lch(.32, Math.min(p[1], .11), p[2]); // mörk variant för text
    var fk = FONTS[C.font] ? C.font : (FONT_ALIAS[C.font] || 'modern'), pre = FONTS[fk], F = C.fonts || {};
    var disp = String(F.display || F.heading || '').trim(), fd = disp || pre[0], fb = String(F.body || '').trim() || pre[1];
    var serif = disp ? (F.serif != null ? !!F.serif : SERIF.test(disp)) : !!pre[3], fz = disp ? (F.scale || 1) : (pre[4] || 1);
    var S = SHAPES[SHAPES[C.shape] ? C.shape : (SHAPE_ALIAS[C.shape] || 'soft')];
    var sans = "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
    var ink = lch(.23, .012 * k, hue), muted = lch(.52, .02 * k, hue), line = lch(.92, .008 * k, hue);
    var brand = contrast(P, '#ffffff') < 1.7 ? D : P, edge = contrast(A, '#ffffff') >= 2.2 ? A : D; // vit/pastell blir mörk variant
    // Tonen överst i samtalet: knappfärgen (eller huvudfärgen) lyser från övre vänstra hörnet och bleknar nedåt mot en nästan vit botten.
    var pc = p[1] > .03, ac = a[1] > .03, th = ac ? a : (pc ? p : null), bh = pc ? p : (ac ? a : null);
    var base = lch(.985, bh ? Math.min(bh[1] * .1, .006) : 0, bh ? bh[2] : 0);
    var glow1 = th ? lch(.93, Math.min(th[1] * .38, .043), th[2]) : lch(.94, 0, 0);
    var glow2 = th ? lch(.958, Math.min(th[1] * .27, .028), th[2]) : lch(.962, 0, 0);
    var chip = th ? lch(.946, Math.min(th[1] * .3, .042), th[2]) : lch(.947, 0, 0), chip2 = th ? lch(.912, Math.min(th[1] * .42, .058), th[2]) : lch(.915, 0, 0);
    // Chattknappen: vit text så fort knappfärgen bär den (stor fet text), annars mörk. Ytan får ett svagt ljus uppifrån.
    var onL = contrast(A, '#ffffff') >= 2.9 ? '#ffffff' : ink, lA = toLch(A), aTop = lch(Math.min(lA[0] + .06, .97), lA[1], lA[2]);
    return {
      fonts: [[fd, F.weight || pre[2]], [fb, '400;500;600']],
      v: {
        '--d': D, '--a': A, '--on-a': on(A, ink), '--me': brand, '--on-me': on(brand, ink), '--av': brand, '--on-av': on(brand, ink),
        '--edge': edge, '--paper': '#ffffff', '--paper2': lch(.95, .008 * k, hue),
        '--base': base, '--glow1': glow1, '--glow1-0': rgba(glow1, 0), '--glow2': glow2, '--glow2-0': rgba(glow2, 0),
        '--on-l': onL, '--a-top': aTop, '--l-av': '#ffffff',
        '--chip': chip, '--chip2': chip2, '--hover': rgba(ink, .06), '--ring': rgba(edge, .09), '--focus': rgba(edge, .38), '--ash': rgba(A, .38),
        '--line': line, '--ink': ink, '--muted': muted,
        '--tint': lch(.955, Math.min(vivid[1] * .28, .032), vivid[2]), '--tint2': lch(.925, Math.min(vivid[1] * .34, .042), vivid[2]),
        '--sh': rgba(lch(.22, .03 * k, hue), .26), '--plate': C.logoBg || '#ffffff',
        '--r1': S[0] + 'px', '--r2': S[1] + 'px', '--r3': S[2] + 'px', '--av-r': S[3],
        '--fd': "'" + fd.replace(/'/g, '') + "'," + (serif ? 'Georgia,serif' : sans), '--fb': "'" + fb.replace(/'/g, '') + "'," + sans, '--fw': F.weight || pre[2], '--fz': fz,
        '--ob': num(C.offsetBottom, 24) + 'px', '--or': num(C.offsetRight, 24) + 'px'
      }
    };
  }

  /* ---------- Hjälp ---------- */
  function assign(t) { for (var i = 1; i < arguments.length; i++) { var s = arguments[i]; if (s) for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k)) t[k] = s[k]; } return t; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function svg(d, s) { s = s || 18; return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>'; }
  function abs(u) { u = String(u || ''); return !u || /^((https?:)?[/][/]|data:|blob:|[/])/i.test(u) ? u : BASE + u; }
  var EMOJI;
  try { EMOJI = new RegExp(String.raw`(?![\u00A9\u00AE\u2122])[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{1F1E6}-\u{1F1FF}\u200D\uFE0F]`, 'gu'); }
  catch (e) { EMOJI = /[\u2600-\u27BF\uFE0F]|[\uD83C-\uDBFF][\uDC00-\uDFFF]/g; }
  function clean(s) { return String(s == null ? '' : s).replace(EMOJI, '').replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+([!?.,:;])/g, '$1').replace(/^[ \t]+|[ \t]+$/gm, '').trim(); }
  // Texten som visas: utan emojis, utom när meddelandet inte är något annat än en emoji (ett "😊" som svar). Då visas den som den är i stället för inget alls.
  function showText(s) { var c = clean(s); if (c) return c; var raw = String(s == null ? '' : s).trim(); return /[^\s‍️]/.test(raw) ? raw : ''; }
  /* ---------- Text från boten: stycken, listor, fetstil och länkar ---------- */
  // En adress blir bara en länk om den är säker: https, http, mailto och tel. Adresser utan schema kompletteras (www.x.se, x.se/sida, namn@x.se, 010-200 79 55).
  function linkTo(raw) {
    var u = String(raw || '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/^\s+|\s+$/g, ''), m;
    if (/^https?:[/][/][^\s<>"]+$/i.test(u)) return { h: u, ext: true };
    if ((m = /^mailto:([^\s<>"?]+)(\?[^\s<>"]*)?$/i.exec(u))) return { h: 'mailto:' + m[1] + (m[2] || '') };
    if ((m = /^tel:(\+?[\d\s().–-]{5,})$/i.exec(u))) return { h: 'tel:' + m[1].replace(/[^\d+]/g, '') };
    if (/^[^\s@<>"/]+@[^\s@<>"/]+[.][a-z]{2,}$/i.test(u)) return { h: 'mailto:' + u };
    if (/^(?:www[.])?[a-z0-9-]+(?:[.][a-z0-9-]+)*[.][a-z]{2,}(?:[/?#][^\s<>"]*)?$/i.test(u)) return { h: 'https://' + u, ext: true };
    if (/^\+?\d[\d\s().–-]{5,}\d$/.test(u)) return { h: 'tel:' + u.replace(/[^\d+]/g, '') };
    if (/^[/][^/\s<>"]/.test(u) && location.origin && location.origin !== 'null') return { h: location.origin + u, ext: true };
    return null;
  }
  function anchor(l, label) { return '<a href="' + esc(l.h) + '"' + (l.ext ? ' target="_blank" rel="noopener"' : '') + '>' + label + '</a>'; }
  function bold(s) { return s.replace(/\*\*([^*\n]+?)\*\*/g, '<b>$1</b>'); }
  // Skiljer skiljetecken efter en adress ("didgeevent.se/sida.") från själva adressen.
  function trimTail(u) {
    var t = '', k;
    for (;;) {
      if ((k = /(&#39;|&quot;)$/.exec(u))) { t = k[0] + t; u = u.slice(0, -k[0].length); continue; }
      var c = u.slice(-1);
      if (c && (/[.,;:!?]/.test(c) || (c === ')' && (u.match(/[(]/g) || []).length < (u.match(/[)]/g) || []).length))) { t = c + t; u = u.slice(0, -1); continue; }
      return [u, t];
    }
  }
  function inl(s) {
    var keep = [];
    function hold(h) { keep.push(h); return '\u0001' + (keep.length - 1) + '\u0002'; }
    s = s.replace(/[\u0001\u0002]/g, '');
    // [text](adress), med eller utan titel efter adressen. En osäker adress ger bara texten.
    s = s.replace(/\[([^\]\n]+)\]\(\s*([^\s)]+)(?:\s+&quot;[^)\n]*?&quot;)?\s*\)/g, function (m, label, url) {
      var l = linkTo(url); return hold(l ? anchor(l, bold(label)) : bold(label));
    });
    // <https://…> och <namn@x.se>
    s = s.replace(/&lt;((?:https?:[/][/]|mailto:)[^\s&]+|[^\s&@]+@[^\s&@]+[.][a-z]{2,})&gt;/gi, function (m, u) {
      var l = linkTo(u); return l ? hold(anchor(l, u.replace(/^mailto:/i, ''))) : m;
    });
    // Adresser, e-post och telefonnummer som står som vanlig text blir också länkar.
    s = s.replace(/(^|[^\w@/.-])((?:https?:[/][/]|www[.])(?:(?!&lt;|&gt;|&quot;)[^\s\u0001])+)/gi, function (m, pre, u) {
      var p = trimTail(u), l = linkTo(p[0]);
      return l ? pre + hold(anchor(l, p[0].replace(/^https?:[/][/](?:www[.])?/i, '').replace(/[/]$/, ''))) + p[1] : m;
    });
    s = s.replace(/(^|[^\w@.+/-])([A-Za-z0-9][A-Za-z0-9._%+-]*@[A-Za-z0-9-]+(?:[.][A-Za-z0-9-]+)*[.][A-Za-z]{2,})(?![\w@-])/g, function (m, pre, e) {
      return pre + hold(anchor({ h: 'mailto:' + e }, e));
    });
    s = s.replace(/(^|[^\w+/.@-])(\+\d[\d \u00a0()–-]{6,}\d|0\d[\d \u00a0()–-]{5,}\d)(?![\w@])/g, function (m, pre, p) {
      var d = p.replace(/\D/g, '').length;
      return d < 8 || d > 15 ? m : pre + hold(anchor({ h: 'tel:' + p.replace(/[^\d+]/g, '') }, p));
    });
    // Saknat mellanslag efter punkt, utropstecken eller frågetecken före en ny mening ("kommer.Vi kan") läggs till.
    s = s.replace(/([a-zåäöæøüé0-9)\]"”’*\u0002])([.!?])([A-ZÅÄÖÆØÜÉ][a-zåäöæøüé])/g, '$1$2 $3');
    return bold(s).replace(/\u0001(\d+)\u0002/g, function (m, n) { return keep[+n]; });
  }
  function md(s) { // stycken, listor, rubriker som fetstil, **fetstil** och länkar
    var out = '', list = '', para = [];
    function flush() { if (para.length) { out += '<p>' + para.join('<br>') + '</p>'; para = []; } }
    function endList() { if (list) { out += '</' + list + '>'; list = ''; } }
    esc(s).replace(/\r/g, '').trim().split('\n').forEach(function (l) {
      var m = l.match(/^\s*(?:([-•*])|(\d+)[.)])\s+(.*)$/);
      if (m) { flush(); var ty = m[2] ? 'ol' : 'ul'; if (list !== ty) { endList(); out += '<' + ty + '>'; list = ty; } out += '<li>' + inl(m[3]) + '</li>'; return; }
      endList();
      var h = l.match(/^\s*#{1,6}\s+(.*)$/);
      if (h) { flush(); out += '<p><b>' + inl(h[1]) + '</b></p>'; return; }
      if (!l.trim()) flush(); else para.push(inl(l));
    });
    flush(); endList();
    return out;
  }

  /* ---------- Text som skrivs ut ord för ord ---------- */
  // Slutpositionen för varje "ord". En länk [text](adress) och en listmarkör räknas ihop med sitt ord, så att de aldrig visas halva.
  function tokenEnds(t) {
    var prot = [], m, re = /\[[^\]\n]*\]\([^)\s]*\)/g;
    while ((m = re.exec(t))) prot.push([m.index, m.index + m[0].length]);
    function inLink(i) { for (var k = 0; k < prot.length; k++) if (i > prot[k][0] && i < prot[k][1]) return true; return false; }
    var spans = [], w, wr = /\S+/g;
    while ((w = wr.exec(t))) {
      var last = spans[spans.length - 1];
      if (last && inLink(last[1])) last[1] = w.index + w[0].length; else spans.push([w.index, w.index + w[0].length]);
    }
    var out = [];
    for (var i = 0; i < spans.length; i++) {
      var sp = spans[i];
      if (i + 1 < spans.length && /^(?:[-•*]|\d+[.)]|#{1,6})$/.test(t.slice(sp[0], sp[1])) && /(?:^|\n)[ \t]*$/.test(t.slice(0, sp[0]))) { spans[i + 1][0] = sp[0]; continue; }
      out.push(sp[1]);
    }
    return out;
  }
  // Var en påbörjad [text](adress) i slutet av texten börjar, annars -1. Den visas först när den är hel.
  function openLinkAt(t) { var m = /\[[^\[\]\n]*(?:\]\([^)\s]*)?$/.exec(t); return m ? m.index : -1; }
  // En fetstil som ännu inte är stängd stängs, så att "**" aldrig syns medan texten skrivs.
  function closeBold(t) { return (t.match(/\*\*/g) || []).length % 2 ? t + '**' : t; }
  function store(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { return null; } }
  // Minnet mellan besök (localStorage): bara sådant som får leva kvar, till exempel öppningen som Voiceflow-flödet skickar.
  function lstore(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  // Samma familj för rubrik och brödtext (modern, technical) laddas en gång med alla vikter, annars blir allt fetstil.
  function loadFonts(list) {
    var fam = {};
    list.forEach(function (f) { if (f[0]) fam[f[0]] = (fam[f[0]] || []).concat(String(f[1]).split(';')); });
    Object.keys(fam).forEach(function (name) {
      var ws = fam[name].filter(function (v, i, a) { return v && a.indexOf(v) === i; }).sort(), key = name + ':' + ws.join(';');
      if (/^(system-ui|sans-serif|serif)$/i.test(name) || document.querySelector('link[data-ssf="' + key + '"]')) return;
      var l = document.createElement('link'); l.rel = 'stylesheet'; l.setAttribute('data-ssf', key);
      l.href = 'https://fonts.googleapis.com/css2?family=' + name.replace(/ /g, '+') + ':wght@' + ws.join(';') + '&display=swap';
      document.head.appendChild(l);
    });
  }
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ---------- "Tänker" på besökarens språk, gissat ur senaste meddelandet ---------- */
  // En kort inledning när Voiceflow skickar knappar eller kort utan någon text.
  var CHOOSE = { sv: 'Välj det som passar bäst, så hjälper jag dig vidare:', en: 'Pick the option that fits best and I will help you from there:', no: 'Velg det som passer best, så hjelper jeg deg videre:', da: 'Vælg det, der passer bedst, så hjælper jeg dig videre:', de: 'Wählen Sie, was am besten passt, dann helfe ich weiter:', fi: 'Valitse sopivin vaihtoehto, niin autan eteenpäin:', es: 'Elige la opción que mejor encaje y te ayudo:', fr: 'Choisissez ce qui vous convient le mieux et je vous aide :', nl: 'Kies wat het beste past, dan help ik je verder:', it: "Scegli l'opzione più adatta e ti aiuto:" };
  var OPTIONS = { sv: 'Här är några förslag:', en: 'Here are a few suggestions:', no: 'Her er noen forslag:', da: 'Her er nogle forslag:', de: 'Hier sind einige Vorschläge:', fi: 'Tässä muutama ehdotus:', es: 'Aquí tienes algunas sugerencias:', fr: 'Voici quelques suggestions :', nl: 'Hier zijn een paar suggesties:', it: 'Ecco alcuni suggerimenti:' };
  var THINK = { sv: 'Tänker', en: 'Thinking', no: 'Tenker', da: 'Tænker', de: 'Denke nach', fi: 'Mietin', es: 'Pensando', fr: 'Je réfléchis', nl: 'Even denken', it: 'Sto pensando' };
  // thinking: 'oven' – texten bredvid pizzaugnen medan svaret gräddas, och när pizzan kommer ut.
  var OVEN = { sv: 'Svaret gräddas', en: 'Baking your answer', no: 'Svaret bakes', da: 'Svaret bages', de: 'Ihre Antwort wird gebacken', fi: 'Vastaus paistuu', es: 'Horneando su respuesta', fr: 'Votre réponse est au four', nl: 'Uw antwoord wordt gebakken', it: 'La risposta è in forno' };
  var OVEN_DONE = 'Buon appetito!';
  var STOP = {
    sv: 'och att det är jag inte som ett på för med har vad hur kan ni vi du hej tack finns vilka vilken när var om till av så men eller mig dig oss här där vill ska kostar pris boka',
    en: 'the and you are is what how can do does have with for this that hello hi thanks please price book where when which would your we i it of to in',
    no: 'og ikke jeg det er som på for med har hva hvordan kan dere vi du hei takk finnes hvilke når hvor til av så men eller meg deg oss pris',
    da: 'og ikke jeg det er som på for med har hvad hvordan kan vi du hej tak findes hvilke hvornår hvor til af så men eller mig dig os pris',
    de: 'und ich nicht der die das ist wie was kann sie wir du hallo danke gibt welche wann wo zu von aber oder mich dich preis buchen',
    fi: 'ja ei että on mitä miten voi te me sinä hei kiitos onko mikä milloin missä mutta tai hinta',
    es: 'y el la que es no un una para con qué cómo puede hola gracias hay cuál cuándo dónde precio reservar',
    fr: 'et le la les est pas un une pour avec quoi comment peut bonjour merci quel quand où prix réserver',
    nl: 'en de het een is niet ik jij wat hoe kan hallo bedankt welke wanneer waar prijs boeken',
    it: 'e il la che è non un una per con cosa come può ciao grazie quale quando dove prezzo prenotare'
  };
  var STOPSET = {};
  Object.keys(STOP).forEach(function (k) { STOPSET[k] = {}; STOP[k].split(' ').forEach(function (w) { STOPSET[k][w] = 1; }); });
  function guessLang(text, fallback) {
    var words = String(text || '').toLowerCase().match(/[a-zà-ÿåäöæøßñ']+/g) || [], best = '', bestScore = 0;
    var hint = { sv: /[åäö]/.test(text), no: /[åæø]/.test(text), da: /[æøå]/.test(text), de: /[äöüß]/.test(text), fi: /[äö]/.test(text), es: /[ñ¿¡]/.test(text), fr: /[éèêçàù]/.test(text) };
    Object.keys(STOPSET).forEach(function (k) {
      var score = 0;
      words.forEach(function (w) { if (STOPSET[k][w]) score += 2; });
      if (hint[k]) score += 1;
      if (score > bestScore) { bestScore = score; best = k; }
    });
    return bestScore >= 2 ? best : (fallback || 'sv');
  }

  /* ---------- Egen SVG (symbol och tänkeanimation): bara ofarliga delar släpps igenom ---------- */
  var SVG_OK = ('svg g path circle ellipse rect line polyline polygon defs lineargradient radialgradient stop animate animatetransform animatemotion mpath clippath mask title desc').split(' ');
  function cleanSvg(src) {
    src = String(src || '').trim();
    if (!src || src.length > 8000 || src.toLowerCase().indexOf('<svg') < 0 || !window.DOMParser) return '';
    var doc;
    try { doc = new DOMParser().parseFromString(src, 'image/svg+xml'); } catch (e) { return ''; }
    var r = doc.documentElement;
    if (!r || r.nodeName.toLowerCase() !== 'svg' || doc.getElementsByTagName('parsererror').length) return '';
    (function walk(n) {
      [].slice.call(n.childNodes).forEach(function (c) {
        if (c.nodeType === 1) {
          if (SVG_OK.indexOf(c.nodeName.toLowerCase()) < 0) { n.removeChild(c); return; }
          [].slice.call(c.attributes).forEach(function (a) {
            var nm = a.name.toLowerCase(), v = a.value;
            if (/^on/.test(nm) || /javascript:/i.test(v) || (nm === 'style' && /url\(|expression|@import/i.test(v)) || /href$/.test(nm)) c.removeAttribute(a.name);
          });
          walk(c);
        } else if (c.nodeType !== 3) n.removeChild(c);
      });
    })(r);
    r.removeAttribute('width'); r.removeAttribute('height');
    if (!r.getAttribute('viewBox')) r.setAttribute('viewBox', '0 0 32 32');
    return new XMLSerializer().serializeToString(r);
  }

  /* ---------- Pizzaugnen (thinking: 'oven') ----------
     En napolitansk kupolugn med majolikakakel. Pizzan ritas uppifrån; i ugnen trycks den ihop (sedd från sidan),
     och när den tas ut fälls den upp mot betraktaren på ett fat med ånga. Bara fyllda former, inga url(#id), så att
     den ser likadan ut i alla webbläsare och inne i chattens slutna ruta. */
  function ovenSvg() {
    var tiles = '', i, x;
    for (i = 0; i < 9; i++) {
      x = 15 + i * 11;
      tiles += '<path d="M' + x + ' 82 l3.1 -3.1 l3.1 3.1 l-3.1 3.1z" fill="#fff"/>';
      if (i < 8) tiles += '<circle cx="' + (x + 8.6) + '" cy="82" r="1.05" fill="#F4C430"/>';
    }
    function at(deg, rad) { var a = deg * Math.PI / 180; return [(rad * Math.cos(a)).toFixed(2), (rad * Math.sin(a)).toFixed(2)]; }
    // Kanten (cornicione): luftiga bubblor och små leopardfläckar av glöden, oregelbundet utspridda.
    var spots = '';
    [[8, 11.2, 1.25], [47, 10.9, 1], [96, 11.3, 1.15], [139, 11, 1.3], [183, 11.2, .95], [226, 10.9, 1.2], [271, 11.3, 1.05], [318, 11, 1.25]].forEach(function (s) {
      var p = at(s[0], s[1]); spots += '<ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="' + s[2] + '" ry="' + (s[2] * .8).toFixed(2) + '" fill="#F4D49A"/>';
    });
    [[18, 11.4, .75], [31, 10.7, .45], [64, 11.3, .9], [80, 10.6, .4], [116, 11.2, .6], [124, 10.6, .38], [160, 11.4, .8], [201, 10.8, .55],
     [214, 11.5, .4], [245, 11.3, .85], [258, 10.6, .4], [292, 11.2, .6], [304, 11.5, .38], [338, 11.2, .8], [352, 10.6, .45]].forEach(function (s, i) {
      var p = at(s[0], s[1]); spots += '<ellipse class="ch" cx="' + p[0] + '" cy="' + p[1] + '" rx="' + s[2] + '" ry="' + (s[2] * .72).toFixed(2) + '" transform="rotate(' + (s[0] + i * 23) + ' ' + p[0] + ' ' + p[1] + ')" fill="#4A210C"/>';
    });
    // Mozzarellan smälter i oregelbundna klickar
    function blob(cx, cy, r, k) {
      var pts = [], n = 7, d = '';
      for (var j = 0; j < n; j++) { var rr = r * (0.82 + 0.3 * ((Math.sin(j * 2.3 + k * 1.7) + 1) / 2)), p = at(j * 360 / n + k * 17, rr); pts.push([cx + +p[0], cy + +p[1]]); }
      for (j = 0; j < n; j++) {
        var a = pts[j], b2 = pts[(j + 1) % n], m = [((a[0] + b2[0]) / 2).toFixed(2), ((a[1] + b2[1]) / 2).toFixed(2)];
        d += (j ? 'Q' : 'M' + ((pts[n - 1][0] + a[0]) / 2).toFixed(2) + ' ' + ((pts[n - 1][1] + a[1]) / 2).toFixed(2) + 'Q') + a[0].toFixed(2) + ' ' + a[1].toFixed(2) + ' ' + m[0] + ' ' + m[1];
      }
      return '<path d="' + d + 'Z"/>';
    }
    var mozz = blob(-3.6, -2.5, 2.8, 1) + blob(3.9, -2.1, 2.4, 2) + blob(-.5, 3.6, 2.7, 3) + blob(4.6, 4, 1.8, 4) + blob(-5.6, 2.4, 1.7, 5) + blob(1, -6.2, 1.5, 6);
    var leaf = 'M0 0C1.9-2.5 5.2-2.4 6.3 0C5.2 2.4 1.9 2.5 0 0Z';
    function basil(x, y, r, s) {
      return '<g transform="translate(' + x + ' ' + y + ') rotate(' + r + ') scale(' + s + ')"><path d="' + leaf + '" fill="#2F8B3B"/><path d="M.6 0H5.6" stroke="#6CBF5E" stroke-width=".45" stroke-linecap="round"/></g>';
    }
    return '<svg class="ov" viewBox="0 0 168 92" aria-hidden="true">' +
      // Röken ur skorstenen
      '<g class="smk" fill="#B8AEA2"><circle cx="79" cy="21" r="3"/><circle cx="79" cy="21" r="3"/><circle cx="79" cy="21" r="3"/></g>' +
      '<g class="oven">' +
        '<rect x="74" y="26" width="10" height="17" rx="1.5" fill="#8E3A22"/><rect x="72" y="23.5" width="14" height="4" rx="1.6" fill="#76301B"/>' +
        '<path d="M14 76C14 22 104 22 104 76Z" fill="#C8603A"/>' +
        '<path d="M25 62C27 40 50 31 66 31.5" fill="none" stroke="#E68C60" stroke-width="3" stroke-linecap="round" opacity=".75"/>' +
        '<path d="M31 50q6-3 12-2M61 41.5q6 0 11 2M84 51q5 2.5 8 6.5M92 64q1.2 5 .4 10M22 66q-1 4-.6 8" fill="none" stroke="#A64829" stroke-width="1.2" stroke-linecap="round"/>' +
        // Ugnsmynningen med glöd, eld och glödande kol
        '<path d="M40 76C40 50 78 50 78 76Z" fill="#2A0F06"/>' +
        '<ellipse class="glo" cx="58" cy="76" rx="17" ry="11" fill="#E4582A" opacity=".5"/>' +
        '<ellipse class="glo g2" cx="58" cy="76" rx="9" ry="5.5" fill="#FFB347" opacity=".65"/>' +
        '<path class="fl f1" d="M43.5 75C41 71 43 67 46 63C47 67 50 70 48.5 75Z" fill="#FF7A21"/>' +
        '<path class="fl f2" d="M47.5 75C46 72 47.6 69 49.8 66.5C50.6 69.6 52.6 72 51.4 75Z" fill="#FFA62B"/>' +
        '<path class="fl f3" d="M44.6 75C44 73 45 71.2 46.4 69.6C47 71.5 48.3 73 47.6 75Z" fill="#FFE07A"/>' +
        '<circle class="em" cx="43" cy="75" r=".9" fill="#FFD27A"/><circle class="em e2" cx="51" cy="75.2" r=".8" fill="#FFD27A"/><circle class="em e3" cx="73" cy="75" r=".9" fill="#FFD27A"/>' +
        '<path d="M36 76C36 46 82 46 82 76" fill="none" stroke="#2747A0" stroke-width="3.4"/>' +
        '<path d="M36 76C36 46 82 46 82 76" fill="none" stroke="#fff" stroke-width="3.4" stroke-dasharray="2 3.6"/>' +
        // Majolikakakel längst ner
        '<rect x="8" y="76" width="102" height="12" rx="2.5" fill="#2747A0"/>' + tiles +
        '<rect x="8" y="76" width="102" height="1.1" fill="#fff" opacity=".45"/>' +
      '</g>' +
      // Fatet, ångan och en liten glimt – syns först när pizzan tas ut
      '<g class="plate"><circle cx="132" cy="46" r="30.5" fill="#fff"/><circle cx="132" cy="46" r="30.5" fill="none" stroke="#2747A0" stroke-width="2"/>' +
        '<circle cx="132" cy="46" r="27.6" fill="none" stroke="#2747A0" stroke-width=".7" stroke-dasharray="1.6 2.2"/></g>' +
      '<g transform="translate(60 71)">' +
        '<g class="peel"><ellipse cx="0" cy="1.6" rx="14.5" ry="4.6" fill="#C8955A"/><ellipse cx="0" cy="1.2" rx="13" ry="3.8" fill="#D9A86C"/><rect x="13" y=".2" width="72" height="2.8" rx="1.4" fill="#A8743E"/></g>' +
        '<g class="pz"><g class="pzi">' +
          '<circle class="crust" r="12" fill="#E3A85E"/><circle r="10.4" fill="#EDBB74" opacity=".75"/><circle r="12" fill="none" stroke="#B26E33" stroke-width=".7"/>' + spots +
          '<circle r="8.9" fill="#C4381F"/><circle r="8.9" fill="none" stroke="#9C2914" stroke-width=".7" opacity=".55"/>' +
          '<circle cx="-2.4" cy="-5" r="1.2" fill="#DA5530" opacity=".85"/><circle cx="5.7" cy="1" r="1" fill="#DA5530" opacity=".85"/><circle cx="-6" cy="-2.8" r=".8" fill="#A92C16" opacity=".7"/>' +
          '<g fill="#F6E6C2" transform="translate(.25 .3)">' + mozz + '</g><g class="mz" fill="#FFF8E8">' + mozz + '</g>' +
          '<g fill="#E8B566" opacity=".75"><circle cx="-3" cy="-1.9" r=".55"/><circle cx="4.3" cy="-1.6" r=".45"/><circle cx="-.1" cy="4.1" r=".5"/><circle cx="-4.4" cy="-3.3" r=".35"/></g>' +
          basil(1.2, -4.6, -25, .95) + basil(-7.4, -.8, 64, .85) + basil(1.8, 1.9, 152, .9) +
          '<g fill="#fff" opacity=".6"><ellipse cx="-4.4" cy="-3.4" rx=".9" ry=".45"/><ellipse cx="3.2" cy="-2.8" rx=".7" ry=".35"/><ellipse cx="-1.3" cy="2.8" rx=".8" ry=".4"/></g>' +
        '</g></g>' +
      '</g>' +
      '<g class="st" fill="none" stroke="#958C80" stroke-width="1.6" stroke-linecap="round">' +
        '<path class="s1" d="M124 18c-3-3.5 3-6 0-10"/><path class="s2" d="M132.5 15c-3-3.5 3-6 0-10"/><path class="s3" d="M141 18c-3-3.5 3-6 0-10"/></g>' +
      '<path class="spk" d="M158 20l1.3 3.4 3.4 1.3-3.4 1.3-1.3 3.4-1.3-3.4-3.4-1.3 3.4-1.3z" fill="#F4C430"/>' +
      '</svg>';
  }

  /* Småtexterna i chatten. Ändras per kund med texts: { ... } i chat.js. */
  var TEXTS = {
    ai: 'AI-assistent', headline: 'Hur kan vi hjälpa dig?',
    reset: 'Börja om', minimize: 'Minimera', send: 'Skicka', close: 'Stäng', retry: 'Försök igen',
    failed: 'Svaret kom inte fram.', callUs: 'Ring oss gärna på {phone}.', today: 'Idag', poweredBy: 'Drivs av',
    thinking: '', input: 'Skriv din fråga', prev: 'Föregående', next: 'Nästa', chatWith: 'Chatta med {name}'
  };

  /* Konfiguration från Botfactory (clients/<kund>.json) och från v3/v4 (window.SMARTSVAR) betyder samma sak. */
  function norm(c) {
    c = assign({}, c || {});
    c.voiceflow = assign({ projectID: c.projectID || '', versionID: c.versionID || 'production' }, c.voiceflow || {});
    c.logo = abs(c.logo || c.crestImage || '');
    if (c.mark) c.mark = abs(c.mark);
    if (!c.errorText && c.fallback) c.errorText = c.fallback;
    if (!c.iconSvg && c.launcherSvg) c.iconSvg = c.launcherSvg;
    if (!c.opening) {
      var g = clean(c.greeting), i = clean(c.intro);
      c.opening = g && i ? (/[.!?:]$/.test(g) ? g : g + '.') + ' ' + i : (g || i);
    }
    return c;
  }

  var CSS = `
  :host{all:initial}
  *,*::before,*::after{box-sizing:border-box}
  .w{--ease:cubic-bezier(.2,.8,.2,1);--sb:env(safe-area-inset-bottom,0px);
    font-family:var(--fb);font-size:15px;line-height:1.55;color:var(--ink);-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%}
  .w[data-m=inline]{height:100%}
  button,textarea{font:inherit;color:inherit;margin:0}
  button{cursor:pointer;background:none;border:0;padding:0;-webkit-tap-highlight-color:transparent}
  :focus{outline:none}:focus-visible{outline:2px solid var(--edge);outline-offset:2px}
  textarea:focus-visible{outline:none}
  svg{display:block;flex-shrink:0}[hidden]{display:none!important}

  /* Panelen: nästan vit. Tonen av kundens färg ligger fast överst under hela samtalet och rullar inte med. */
  .panel{--toph:66px;position:relative;isolation:isolate;display:flex;flex-direction:column;overflow:hidden;border-radius:var(--r1);background-color:var(--base);
    box-shadow:0 0 0 1px rgba(0,0,0,.055),0 2px 4px rgba(0,0,0,.035),0 32px 72px -26px var(--sh)}
  .w[data-m=mobile] .panel{--toph:74px}
  /* Tonen överst syns fullt innan samtalet börjar och bleknar sedan bort till den vanliga bakgrunden i takt med att samtalet fyller chatten. */
  .panel::before{content:'';position:absolute;z-index:-1;top:0;left:0;right:0;height:420px;pointer-events:none;opacity:var(--glow,1);transition:opacity .9s ease;
    background-image:radial-gradient(135% 100% at 0% 0%,var(--glow1) 0%,var(--glow1-0) 72%),linear-gradient(180deg,var(--glow2) 0%,var(--glow2-0) 82%)}
  .w[data-m=inline] .panel{height:100%}
  .w[data-m=desktop] .panel{position:fixed;z-index:3;right:var(--or);bottom:calc(var(--ob) + 76px);width:min(400px,calc(var(--vw) - 32px));height:min(680px,calc(var(--vh) - var(--ob) - 100px));
    opacity:0;visibility:hidden;transform:translateY(12px) scale(.985);transform-origin:100% 100%;transition:opacity .22s,transform .32s var(--ease),visibility 0s .32s}
  .w[data-m=desktop].open .panel{opacity:1;visibility:visible;transform:none;transition:opacity .22s,transform .32s var(--ease)}
  .w[data-m=mobile] .panel{position:fixed;z-index:3;left:0;right:0;bottom:var(--kb,0px);height:calc(var(--vh) - 12px);max-height:calc(var(--vh) - 12px);
    border-radius:var(--r1) var(--r1) 0 0;transform:translateY(105%);visibility:hidden;transition:transform .35s var(--ease),visibility 0s .35s}
  .w[data-m=mobile].open .panel{transform:none;visibility:visible;transition:transform .4s var(--ease)}
  .scrim{display:none}
  .w[data-m=mobile] .scrim{display:block;position:fixed;inset:0;z-index:3;background:rgba(10,12,14,.38);opacity:0;pointer-events:none;transition:opacity .3s}
  .w[data-m=mobile].open .scrim{opacity:1;pointer-events:auto}
  .grab{display:none;position:absolute;z-index:5;top:7px;left:50%;width:40px;height:4px;margin-left:-20px;border-radius:2px;background:var(--ink);opacity:.15}
  .w[data-m=mobile] .grab{display:block}

  /* Symbolen: en ljus ton med märket i kundens mörka färg (en logga får sin egen platta) */
  .av{width:28px;height:28px;border-radius:var(--av-r);display:grid;place-items:center;flex-shrink:0;overflow:hidden;background:var(--chip);color:var(--d);
    font-family:var(--fd);font-weight:var(--fw);font-size:calc(13px * var(--fz));line-height:1}
  .av.img{background:var(--plate)!important;box-shadow:inset 0 0 0 1px rgba(0,0,0,.07)}
  .av img{width:100%;height:100%;object-fit:contain}
  .av.cs svg{width:62%;height:62%}

  /* Headern: kundens logga stort uppe till vänster (annars symbolen och namnet). Texten som rullar upp under den blir svagt oskarp. */
  .top{position:absolute;z-index:4;top:0;left:0;right:0}
  /* En smal remsa precis under headern: texten som är på väg uppåt blir svagt oskarp där, och försvinner sedan vid headerns kant. Ingen färg, bara oskärpa. */
  .veil{position:absolute;z-index:3;left:0;right:0;top:var(--toph);height:30px;pointer-events:none;-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px);
    -webkit-mask-image:linear-gradient(180deg,#000 0%,rgba(0,0,0,.55) 45%,transparent 100%);mask-image:linear-gradient(180deg,#000 0%,rgba(0,0,0,.55) 45%,transparent 100%)}
  .bar{display:flex;align-items:center;gap:4px;height:var(--toph);padding:0 8px 0 18px}
  .w[data-m=mobile] .bar{padding-top:10px}
  .who{flex:1;min-width:0;display:flex;align-items:center;gap:12px}
  .who .av{width:38px;height:38px;font-size:calc(16px * var(--fz));background:rgba(255,255,255,.62);box-shadow:inset 0 0 0 1px var(--ring)}
  .lg{display:block;height:44px;max-width:180px;width:auto;object-fit:contain;object-position:left center;flex-shrink:0}
  .who.wm .av,.who.wm .name,.who:not(.wm) .lg{display:none}
  .name{min-width:0;font-family:var(--fd);font-weight:var(--fw);font-size:calc(16px * var(--fz));line-height:1.2;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ib{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;color:var(--muted);flex-shrink:0;transition:color .15s,background .15s}
  .ib:hover{color:var(--ink);background:var(--hover)}
  .w:not(.has) .rs,.w[data-m=inline] .x{display:none}

  /* Samtalet. Rubriken överst tonar ut på plats när besökaren skriver; tonen bakom ligger kvar. */
  .scroll{position:relative;flex:1;min-height:0;margin-top:var(--toph);overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scrollbar-width:thin;scrollbar-color:var(--line) transparent;
    -webkit-mask-image:linear-gradient(180deg,transparent 0,#000 26px,#000 calc(100% - 14px),transparent);mask-image:linear-gradient(180deg,transparent 0,#000 26px,#000 calc(100% - 14px),transparent)}
  .msgs{display:flex;flex-direction:column;justify-content:flex-end;gap:14px;min-height:100%;padding:2px 20px 18px}
  .msgs>:first-child:not(.intro){margin-top:30px}
  .intro{flex:1 0 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:140px;padding:18px 8px 34px;text-align:center}
  .intro>*{animation:rise .5s var(--ease) both}
  .intro.fold{opacity:0;pointer-events:none;transition:opacity .55s ease}
  .hl{max-width:272px;margin:0;font-family:var(--fd);font-weight:var(--fw);font-size:calc(31px * var(--fz));line-height:1.12;letter-spacing:-.024em;color:var(--ink);text-wrap:balance}
  .tg{max-width:300px;margin:10px 0 0;font-size:14px;line-height:1.45;color:var(--muted);text-wrap:balance}
  .day{align-self:center;font-size:11.5px;line-height:1;color:var(--muted);padding:6px 0 2px;animation:fade .3s ease-out both}

  /* Starten nederst: öppningstexten och förslagen, närmast skrivfältet */
  .hero{display:flex;flex-direction:column;align-items:flex-start;padding:0 0 4px;animation:rise .5s var(--ease) .06s both}
  .op{font-size:15px;line-height:1.6;color:var(--ink)}
  .op p{margin:0 0 10px}.op p:last-child{margin:0}
  .hero .chips{margin-top:16px}

  /* Meddelanden: besökarens i kundens färg, botens som ren text utan bakgrund */
  .me{align-self:flex-end;max-width:82%;width:fit-content;padding:10px 15px;border-radius:var(--r2) var(--r2) calc(var(--r2) / 4) var(--r2);
    background:var(--me);color:var(--on-me);white-space:pre-wrap;overflow-wrap:anywhere;animation:fade .25s ease-out both}
  .me+.bot,.bot+.me,.me+.rich{margin-top:6px}
  .bot{align-self:stretch;min-width:0;animation:fade .25s ease-out both}
  .tx{font-size:15px;line-height:1.6;color:var(--ink);overflow-wrap:anywhere}
  .tx p{margin:0 0 10px}.tx p:last-child{margin:0}
  .tx ul,.tx ol{margin:2px 0 10px;padding-left:20px}.tx ul:last-child,.tx ol:last-child{margin-bottom:0}.tx li{margin:4px 0}.tx li::marker{color:var(--edge)}
  .tx b{font-weight:600;color:var(--d)}
  .tx a,.op a{color:var(--d);font-weight:600;text-decoration:none}
  .wd{animation:fade .55s ease-out both}
  .tb{overflow:hidden;transition:height .32s var(--ease)}
  .tb.done{overflow:visible;transition:none}
  .ti{display:flow-root}

  /* Medan boten tänker: ordet på besökarens språk med en mjuk ljusstrimma, aldrig prickar */
  .think{display:inline-flex;align-items:center;gap:8px;min-height:24px;vertical-align:middle}
  .think .art{width:22px;height:22px;display:grid;place-items:center;color:var(--edge)}
  .think .art svg{width:100%;height:100%}
  .shim{font-size:14.5px;font-weight:500;letter-spacing:.01em;color:#8a8f98;
    background:linear-gradient(90deg,#8a8f98 0%,#8a8f98 40%,#d6d9de 50%,#8a8f98 60%,#8a8f98 100%);background-size:250% 100%;
    -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:sheen 2.2s linear infinite}

  /* Förslag och knappar: en ljus ton av kundens färg, utan ram */
  .chips{display:flex;flex-wrap:wrap;gap:8px;animation:fade .4s ease-out both}
  .chips.stack{flex-direction:column;align-items:flex-start}
  .chips button{min-height:38px;padding:9px 15px;border-radius:var(--r3);background:var(--chip);color:var(--d);font-size:14px;font-weight:500;line-height:1.3;text-align:left;
    transition:background .15s,transform .15s}
  .chips button:hover{background:var(--chip2)}
  .chips button:active{transform:scale(.98)}
  .retry{margin-left:6px;font-weight:600;color:var(--d);text-decoration:underline;text-underline-offset:3px}

  /* Kort, karusell och bilder från Voiceflow */
  .rich{display:flex;flex-direction:column;gap:8px;min-width:0;animation:rise .45s var(--ease) both}
  .rich.still{animation:none}
  .pic{max-width:100%;border-radius:var(--r2);overflow:hidden;box-shadow:0 0 0 1px var(--line);background:var(--paper2)}
  .pic img{display:block;width:100%;height:auto}
  .card{width:100%;max-width:300px;background:#fff;border-radius:var(--r2);overflow:hidden;box-shadow:0 0 0 1px var(--line),0 6px 18px -10px var(--sh)}
  .card .ci{display:block;width:100%;aspect-ratio:16/10;object-fit:cover;background:var(--paper2)}
  .card .cb{padding:12px 14px 14px;display:flex;flex-direction:column;gap:3px}
  .card .ct{font-weight:600;font-size:14.5px;line-height:1.3;color:var(--d)}
  .card .cd{font-size:13.5px;line-height:1.45;color:var(--muted)}
  .card .cs{display:flex;flex-direction:column;gap:6px;margin-top:9px}
  .card .cbtn{min-height:40px;padding:9px 14px;border-radius:var(--r3);font-size:14px;font-weight:600;line-height:1.2;color:var(--d);background:var(--chip);transition:background .15s,filter .15s}
  .card .cbtn:hover{background:var(--chip2)}
  .card .cbtn.first{background:var(--a);color:var(--on-a)}
  .card .cbtn.first:hover{filter:brightness(.95)}
  .carw{position:relative}
  .car{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding:1px 1px 6px}
  .car::-webkit-scrollbar{display:none}
  .car .card{flex:0 0 232px;scroll-snap-align:start}
  .carb{position:absolute;top:34%;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:#fff;color:var(--ink);
    box-shadow:0 0 0 1px var(--line),0 6px 14px -4px var(--sh);transition:opacity .2s}
  .carb.l{left:-10px}.carb.r{right:-6px}
  .carb[disabled]{opacity:0;pointer-events:none}
  .op.swap{opacity:0}
  .op{transition:opacity .3s ease}

  /* Skrivfältet: ett vitt fält som svävar på tonen */
  .composer{flex-shrink:0;padding:6px 14px calc(8px + var(--sb))}
  .field{display:flex;align-items:flex-end;gap:6px;padding:5px 5px 5px 16px;border-radius:min(var(--r3),28px);background:#fff;
    box-shadow:0 0 0 1px var(--line),0 1px 2px rgba(0,0,0,.03),0 10px 26px -14px var(--sh);transition:box-shadow .15s}
  .field:focus-within{box-shadow:0 0 0 1px var(--focus),0 0 0 4px var(--ring),0 10px 26px -14px var(--sh)}
  textarea{flex:1;min-width:0;height:42px;max-height:124px;padding:10px 0;border:0;outline:0;resize:none;background:none;font-size:15px;line-height:1.4;color:var(--ink)}
  textarea:disabled{opacity:.5}
  .w[data-m=mobile] textarea{font-size:16px} /* under 16px zoomar iOS in vid fokus */
  textarea::placeholder{color:var(--muted);opacity:1}
  .send{width:40px;height:40px;margin:1px;border-radius:min(var(--r3),20px);display:grid;place-items:center;flex-shrink:0;background:var(--paper2);color:var(--ink);
    transition:background .15s,color .15s,transform .15s}
  .send:not(:disabled){background:var(--a);color:var(--on-a)}
  .send:not(:disabled):active{transform:scale(.94)}
  .send:disabled{cursor:default;opacity:.85}
  .foot{padding:8px 0 0;text-align:center;font-size:11px;letter-spacing:.01em;color:var(--muted)}
  .foot a{color:var(--ink);font-weight:600;text-decoration:none}

  /* Chattknappen: en mjuk pill i kundens knappfärg med en chattbubbla (eller kundens kvadratiska logga) och en kort text.
     Ett svagt ljus uppifrån och en skugga i samma färg. Öppen blir den en rund knapp med en pil. */
  .launch{position:fixed;z-index:2;right:var(--or);bottom:calc(var(--ob) + var(--sb));display:flex;align-items:center;justify-content:center;gap:10px;height:54px;min-width:54px;padding:0 22px 0 17px;
    border-radius:min(var(--r3),27px);background:linear-gradient(180deg,var(--a-top) 0%,var(--a) 100%);color:var(--on-l);font-size:15.5px;font-weight:600;letter-spacing:-.005em;white-space:nowrap;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.2),inset 0 -1px 0 rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.1),0 10px 24px -8px var(--ash),0 22px 46px -22px var(--sh);
    animation:pop .5s var(--ease) .15s both;transition:box-shadow .25s ease,transform .25s var(--ease)}
  .launch:hover{transform:translateY(-2px);box-shadow:inset 0 1px 0 rgba(255,255,255,.2),inset 0 -1px 0 rgba(0,0,0,.06),0 2px 4px rgba(0,0,0,.1),0 14px 30px -8px var(--ash),0 26px 54px -22px var(--sh)}
  .launch:active{transform:scale(.97)}
  .launch .li{display:grid;place-items:center;width:25px;height:25px}
  .launch .li .sp{fill:var(--a);transform-box:fill-box;transform-origin:center;transition:transform .6s var(--ease)}
  .launch:hover .li .sp{transform:rotate(90deg) scale(1.12)}
  .launch .av{display:none;width:36px;height:36px;margin-left:-9px;background:#fff!important;box-shadow:0 0 0 2px rgba(255,255,255,.28)}
  .launch.logo .av{display:grid}
  .launch.logo .li{display:none}
  .launch .lt{padding-bottom:1px}
  .launch .lc{display:none}
  .w.open .launch{padding:0}
  .w.open .launch .li,.w.open .launch .av,.w.open .launch .lt{display:none}
  .w.open .launch .lc{display:grid;place-items:center}
  .w[data-m=mobile] .launch{right:16px;bottom:calc(16px + var(--sb));width:58px;height:58px;padding:0;border-radius:50%}
  .w[data-m=mobile] .launch .lt{display:none}
  .w[data-m=mobile] .launch .li{width:26px;height:26px}
  .w[data-m=mobile] .launch .av{margin-left:0;width:42px;height:42px}
  .w[data-m=mobile].open .launch,.w.open .teaser{opacity:0;pointer-events:none;transition:opacity .2s}

  /* Popupen: en vit pratbubbla mot knappen. Namnet och AI-märket, en mening och två förslag i kundens ton. */
  .teaser{position:fixed;z-index:2;right:var(--or);bottom:calc(var(--ob) + 70px + var(--sb));width:min(300px,calc(var(--vw) - 36px));padding:14px 16px 16px;
    background:#fff;color:var(--ink);border-radius:20px 20px 5px 20px;box-shadow:0 0 0 1px rgba(0,0,0,.05),0 4px 12px -4px rgba(0,0,0,.08),0 28px 60px -22px var(--sh);
    animation:pop .45s var(--ease) both;cursor:pointer;transform-origin:100% 100%}
  .w[data-m=mobile] .teaser{right:16px;bottom:calc(82px + var(--sb))}
  .teaser .tn{display:flex;align-items:center;gap:8px;min-width:0;margin:0 26px 10px 0;font-size:12.5px;line-height:1.3;color:var(--muted)}
  .teaser .tname{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .teaser .tname b{font-weight:600;color:var(--ink)}
  .teaser .av{width:24px;height:24px;font-size:calc(11px * var(--fz));background:var(--chip);color:var(--d)}
  .teaser p{margin:0 0 12px;font-size:15px;line-height:1.45;color:var(--ink)}
  .teaser .chips{flex-direction:column;align-items:flex-start;gap:7px;animation:none}
  .teaser .chips button{min-height:34px;padding:7px 14px;border-radius:999px;font-size:13.5px;font-weight:600}
  .tx-x{position:absolute;top:9px;right:9px;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;color:var(--muted);transition:background .15s,color .15s}
  .tx-x:hover{background:var(--hover);color:var(--ink)}

  /* Pizzaugnen (thinking: 'oven'): pizzan skjuts in, gräddas och tas ut på ett fat när svaret är klart */
  .think.ov-row{display:flex;align-items:center;gap:10px;min-height:0;transition:opacity .2s ease}
  .think.ov-row.gone{opacity:0}
  .ov{display:block;width:196px;height:107px;flex-shrink:0;overflow:visible}
  .w[data-m=mobile] .ov{width:178px;height:97px}
  .ov *{transform-box:view-box}
  .ov .pz{transform-origin:0 0;animation:pzIn .85s cubic-bezier(.2,.8,.2,1) both}
  .ov .pzi{transform-origin:0 0;transform:scale(1,.34)}
  .ov .peel{transform-origin:0 0;animation:peelIn 1.35s cubic-bezier(.3,.7,.3,1) both}
  .ov .crust{animation:bake 3.2s ease .8s forwards}
  .ov .ch{opacity:0;animation:char 3.2s ease .9s forwards}
  .ov .fl{transform-box:fill-box;transform-origin:50% 100%;animation:flick .42s ease-in-out infinite alternate}
  .ov .f2{animation-duration:.36s;animation-delay:-.15s}.ov .f3{animation-duration:.3s;animation-delay:-.08s}
  .ov .glo{animation:heat 1.1s ease-in-out infinite alternate}.ov .glo.g2{animation-duration:.8s}
  .ov .em{animation:ember 1s ease-in-out infinite alternate}.ov .e2{animation-delay:-.4s}.ov .e3{animation-delay:-.7s}
  .ov .smk circle{transform-box:fill-box;transform-origin:50% 50%;opacity:0;animation:smoke 2.4s linear infinite}
  .ov .smk circle:nth-child(2){animation-delay:.8s}.ov .smk circle:nth-child(3){animation-delay:1.6s}
  .ov .plate{opacity:0;transform-box:fill-box;transform-origin:50% 50%}
  .ov .st path{opacity:0}
  .ov .spk{opacity:0;transform-box:fill-box;transform-origin:50% 50%}
  .ov.out .peel{animation:peelOut .8s cubic-bezier(.3,.7,.2,1) forwards}
  .ov.out .pz{animation:pzOut .8s cubic-bezier(.3,.7,.2,1) forwards}
  .ov.out .pzi{animation:pzGrow .8s cubic-bezier(.3,.7,.2,1) forwards}
  .ov.out .crust{animation:none;fill:#DE9A4E}
  .ov.out .ch{animation:none;opacity:1}
  .ov.out .oven{animation:dim .6s ease .35s forwards}
  .ov.out .smk{opacity:0;transition:opacity .3s}
  .ov.out .plate{animation:plateIn .45s cubic-bezier(.2,.8,.2,1) .3s forwards}
  .ov.out .st path{animation:steam 1.3s ease-in-out .7s infinite}
  .ov.out .st .s2{animation-delay:.9s}.ov.out .st .s3{animation-delay:1.1s}
  .ov.out .spk{animation:spark .7s ease .75s forwards}
  @keyframes pzIn{from{transform:translate(80px,0)}to{transform:none}}
  @keyframes peelIn{0%{transform:translate(80px,0);opacity:1}62%{transform:none;opacity:1}100%{transform:translate(92px,0);opacity:0}}
  @keyframes bake{from{fill:#EBC88E}to{fill:#DE9A4E}}
  @keyframes char{to{opacity:1}}
  @keyframes flick{from{transform:scale(1,1) skewX(0)}to{transform:scale(.86,1.2) skewX(-4deg)}}
  @keyframes heat{from{opacity:.38}to{opacity:.7}}
  @keyframes ember{from{opacity:.35}to{opacity:1}}
  @keyframes smoke{0%{transform:translate(0,0) scale(.6);opacity:0}15%{opacity:.55}100%{transform:translate(-7px,-19px) scale(1.9);opacity:0}}
  @keyframes peelOut{0%{transform:translate(92px,0);opacity:0}24%{transform:none;opacity:1}62%{transform:translate(40px,-6px);opacity:.9}100%{transform:translate(84px,-4px);opacity:0}}
  @keyframes pzOut{0%,24%{transform:none}62%{transform:translate(44px,-32px)}100%{transform:translate(72px,-25px)}}
  @keyframes pzGrow{0%,24%{transform:scale(1,.34)}62%{transform:scale(1.7,1.3)}100%{transform:scale(2.15,2.15)}}
  @keyframes dim{to{opacity:.68}}
  @keyframes plateIn{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
  @keyframes steam{0%{opacity:0;transform:translateY(5px)}45%{opacity:.8}100%{opacity:0;transform:translateY(-7px)}}
  @keyframes spark{0%{opacity:0;transform:scale(0) rotate(0)}60%{opacity:1;transform:scale(1.3) rotate(45deg)}100%{opacity:.9;transform:scale(1) rotate(90deg)}}

  @keyframes fade{from{opacity:0}to{opacity:1}}
  @keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  @keyframes pop{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:none}}
  @keyframes sheen{from{background-position:100% 0}to{background-position:-160% 0}}
  @media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}.shim{-webkit-text-fill-color:currentColor}}
  `;

  /* ---------- Bygg en chatt ----------
     mount(config)                         flytande, i hörnet av sidan
     mount(config, { inline: el })         fyller el (testchatten)
     mount(config, { container: el, layout: 'mobile' | 'desktop' })  för förhandsvisning i en ram */
  function mount(C, O) {
    C = norm(C); O = O || {};
    var inline = !!O.inline, box = O.inline || O.container || document.body, framed = box !== document.body && !inline;
    var id = 'ss:' + String(C.id || C.slug || C.voiceflow.projectID || C.name || 'chatt').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    var alive = true, T = assign({}, TEXTS, C.texts || {});
    // Läget (dator, mobil, inbäddad) och fönstrets mått räknas ut innan chatten läggs in. Annars hinner webbläsaren räkna fram panelen
    // som öppen innan den vet att den är stängd, och då tonar den ut synligt när sidan laddas om.
    var firstSize = sizeNow();
    var host = document.createElement('div');
    if (!inline && !framed) host.id = 'smartsvar-chat';
    host.style.cssText = inline ? 'display:block;height:100%' : 'position:fixed;z-index:' + (C.zIndex || 2147483000);
    box.appendChild(host);
    var root = host.attachShadow({ mode: 'open' });
    root.innerHTML = '<style>' + CSS + '</style>' + (C.stylesheet ? '<link rel="stylesheet" href="' + esc(abs(C.stylesheet)) + '">' : '') + '<style class="own"></style><div class="w" data-m="' + firstSize.m + '" style="--vh:' + firstSize.h + 'px;--vw:' + firstSize.wd + 'px;--kb:' + firstSize.kb + 'px">' +
      (inline ? '' : '<div class="scrim"></div>') +
      '<section class="panel" role="dialog">' +
        '<span class="grab" aria-hidden="true"></span>' +
        '<header class="top"><div class="bar">' +
          '<div class="who"><span class="av"></span><img class="lg" alt=""><span class="name"></span></div>' +
          '<button class="ib rs" type="button" aria-label="' + esc(T.reset) + '" title="' + esc(T.reset) + '">' + svg(UI.reset, 17) + '</button>' +
          '<button class="ib x" type="button" aria-label="' + esc(T.minimize) + '" title="' + esc(T.minimize) + '">' + svg(UI.down, 21) + '</button></div></header>' +
        '<div class="veil" aria-hidden="true"></div>' +
        '<div class="scroll"><div class="msgs" role="log" aria-live="polite"></div></div>' +
        '<form class="composer"><div class="field"><textarea rows="1" enterkeyhint="send" aria-label="' + esc(T.input) + '"></textarea>' +
          '<button class="send" type="submit" aria-label="' + esc(T.send) + '" disabled>' + svg(UI.send) + '</button></div>' +
          '<div class="foot"></div></form>' +
      '</section>' +
      (inline ? '' : '<div class="teaser" role="button" tabindex="0" hidden><button class="tx-x" type="button" aria-label="' + esc(T.close) + '">' + svg(UI.x, 14) + '</button>' +
        '<div class="tn"><span class="av"></span><span class="tname"></span></div><p></p><div class="chips"></div></div>' +
        '<button class="launch" type="button" aria-expanded="false"><span class="li">' + CHAT_ICON + '</span><span class="av"></span><span class="lt"></span><span class="lc">' + svg(UI.down, 24) + '</span></button>') +
      '</div>';

    var q = function (s) { return root.querySelector(s); };
    var w = q('.w'), panel = q('.panel'), scroll = q('.scroll'), msgs = q('.msgs'),
        ta = q('textarea'), sendB = q('.send'), launch = q('.launch'), teaser = q('.teaser');
    var busy = false, inputLocked = false, log = [], isOpen = inline, squareLogo = false, logoWide = false, lastUser = '', waitText = '';
    if (inline) w.classList.add('open');

    function suggestions() { return (C.suggestions || []).map(clean).filter(Boolean).slice(0, 3); }
    function opening() { return clean(C.opening) || 'Hej! Vad kan jag hjälpa dig med?'; }

    /* Utseende: kan anropas igen med ny konfiguration utan att samtalet försvinner */
    function apply(next) {
      if (next) { C = norm(next); T = assign({}, TEXTS, C.texts || {}); }
      var L = look(C);
      q('style.own').textContent = String(C.css || '').replace(/<[/]?style/gi, '');
      for (var k in L.v) w.style.setProperty(k, L.v[k]);
      loadFonts(L.fonts);
      var name = C.name || 'Kundtjänst', ai = clean(T.ai);
      q('.name').textContent = name;
      panel.setAttribute('aria-label', 'Chatt med ' + name);
      ta.placeholder = C.placeholder || 'Skriv din fråga…';
      var foot = q('.foot'), note = clean(C.footnote), by = C.poweredBy === '' ? '' : (C.poweredBy || 'Smartsvar');
      foot.innerHTML = note ? esc(note) : (by ? esc(T.poweredBy) + ' <a href="' + esc(C.poweredUrl || 'https://smartsvar.se') + '" target="_blank" rel="noopener">' + esc(by) + '</a>' : '');
      foot.hidden = !foot.innerHTML;
      var hero = q('.hero'); if (hero) paintHero(hero);
      var intro = q('.intro'); if (intro) paintIntro(intro);
      var sc = q('.start'); if (sc) sc.parentNode.replaceChild(startBox(), sc);
      if (launch) {
        q('.lt').textContent = clean(C.launcherText) || 'Fråga oss'; launch.setAttribute('aria-label', T.chatWith.replace('{name}', name));
        q('.tname').innerHTML = '<b>' + esc(name) + '</b>' + (ai ? ' · ' + esc(ai) : '');
        teaser.querySelector('p').textContent = clean(C.teaser) || opening();
        var tc = teaser.querySelector('.chips'); tc.innerHTML = '';
        suggestions().slice(0, 2).forEach(function (t) {
          var b = document.createElement('button'); b.type = 'button'; b.textContent = t;
          b.onclick = function (e) { e.stopPropagation(); hideTeaser(); send(t); }; tc.appendChild(b);
        });
      }
      // En kvadratisk logga blir symbol. En bred logga står uppe till vänster i headern i stället för namnet.
      squareLogo = C.logoShape === 'square'; logoWide = C.logoShape === 'wide'; paintHeader(); paintMark();
      if (C.logo && C.logoShape !== 'square' && C.logoShape !== 'wide') {
        var im = new Image(), src = C.logo;
        im.onload = function () { if (C.logo !== src || !alive) return; var r = im.naturalWidth / (im.naturalHeight || 1); squareLogo = r > 0.7 && r < 1.4; logoWide = r >= 1.4; paintHeader(); paintMark(); };
        im.onerror = function () { if (C.logo === src) { squareLogo = false; logoWide = false; paintHeader(); paintMark(); } };
        im.referrerPolicy = 'no-referrer'; im.src = src;
      }
    }
    // Symbolen: C.symbol väljer "image", "icon" eller "monogram"; tomt betyder bild, sedan ikon, sedan bokstav.
    function mark() {
      var sym = C.symbol || '', own = cleanSvg(C.iconSvg);
      if (sym !== 'icon' && sym !== 'monogram') {
        var src = C.mark || (squareLogo && C.logo);
        if (src) return { img: true, html: '<img src="' + esc(src) + '" alt="" referrerpolicy="no-referrer" decoding="async">' };
      }
      if (sym !== 'monogram') {
        if (own) return { own: true, html: own };
        if (ICONS[C.icon]) return { html: svg(ICONS[C.icon], 18) };
      }
      var mono = clean(C.monogram) || String(C.name || '?').trim().charAt(0);
      return { html: esc(mono.slice(0, 2).toUpperCase()) };
    }
    function size(a) { var p = a.parentNode.classList; return p.contains('launch') ? 20 : p.contains('who') ? 17 : p.contains('tn') ? 12 : 14; }
    function paintAv(a, m) {
      a.innerHTML = m.html.replace(/width="18" height="18"/, 'width="' + size(a) + '" height="' + size(a) + '"');
      a.classList.toggle('img', !!m.img); a.classList.toggle('cs', !!m.own);
      var img = a.querySelector('img');
      if (img) img.onerror = function () { squareLogo = false; if (C.mark && img.src.indexOf(C.mark) >= 0) C.mark = ''; paintMark(); };
    }
    // Chattknappen visar kundens logga bara om den är en riktig bild, annars chattbubblan (aldrig en bokstav).
    function paintMark() { var m = mark(); [].forEach.call(root.querySelectorAll('.av'), function (a) { paintAv(a, m); }); if (launch) launch.classList.toggle('logo', !!m.img); }

    /* ---------- Meddelanden ---------- */
    function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    function addMe(text) { var m = el('div', 'me'); m.textContent = text; msgs.appendChild(m); return m; }
    function addBot(html) { var m = el('div', 'bot', '<div class="tx">' + html + '</div>'); msgs.appendChild(m); return m; }
    /* Headern: kundens breda logga uppe till vänster, annars symbolen och namnet. */
    function wordmark() { return C.wordmark ? abs(C.wordmark) : (C.logo && logoWide ? C.logo : ''); }
    function dropLogo() { logoWide = false; C.wordmark = ''; paintHeader(); paintMark(); }
    function paintHeader() {
      var wm = wordmark(), lg = q('.lg');
      q('.who').classList.toggle('wm', !!wm);
      if (wm) { lg.alt = C.name || ''; lg.referrerPolicy = 'no-referrer'; lg.onerror = dropLogo; if (lg.getAttribute('src') !== wm) lg.src = wm; } else lg.removeAttribute('src');
    }
    /* Överst i samtalet: den stora rubriken och en rad om företaget. De står kvar under samtalet och rullar bort när det blir längre. */
    function paintIntro(n) {
      n.querySelector('.hl').textContent = clean(C.headline) || T.headline;
      var tg = n.querySelector('.tg'), tl = clean(C.tagline);
      tg.textContent = tl; tg.hidden = !tl;
    }
    // När besökaren skriver första gången tonar rubriken ut på plats. Den ligger kvar osynlig och rullar bort med samtalet.
    function foldIntro() {
      var n = msgs.querySelector('.intro'); if (!n || n.classList.contains('fold')) return;
      n.classList.add('fold'); n.setAttribute('aria-hidden', 'true');
    }
    function introEl() { var n = el('div', 'intro', '<h2 class="hl"></h2><p class="tg"></p>'); paintIntro(n); return n; }
    /* Starten nederst: öppningstexten och förslagen. */
    function paintHero(h) { if (!h.dataset.vf) h.querySelector('.op').innerHTML = md(opening()); }
    function heroEl() { var h = el('div', 'hero', '<div class="op"></div>'); paintHero(h); return h; }
    // Byter öppningstexten. Med soft tonar den gamla ut och den nya in, så att det inte blir ett hopp.
    function setOp(h, html, soft) {
      var op = h.querySelector('.op'); if (op.innerHTML === html) return;
      if (!soft || reduce) { op.innerHTML = html; return; }
      op.classList.add('swap'); setTimeout(function () { op.innerHTML = html; op.classList.remove('swap'); }, 320);
    }
    // Voiceflows egen öppning: texten hamnar i starten, knapparna ersätter förslagen, kort och bilder läggs under.
    function fillHero(h, blocks, soft) {
      var txt = textOfBlocks(blocks);
      if (clean(txt)) { h.dataset.vf = '1'; setOp(h, md(clean(txt)), soft); }
      var btns = []; blocks.forEach(function (b) { if (b.t === 'btns') btns = btns.concat(b.items); });
      if (btns.length && !w.classList.contains('has')) { var old = h.querySelector('.chips'); if (old) old.remove(); h.appendChild(chips(el('div', 'chips' + (C.startStyle === 'list' ? ' stack' : '')), btns)); }
      var rest = blocks.filter(function (b) { return b.t !== 'text' && b.t !== 'btns'; });
      if (rest.length) renderBlocks(rest);
    }
    function addDay(text) { var d = el('div', 'day'); d.textContent = text; msgs.appendChild(d); return d; }
    function stamp() { var t = new Date(); return T.today + ' ' + ('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2); }
    function chips(box, list) {
      box.innerHTML = '';
      list.forEach(function (it) {
        var b = el('button'); b.type = 'button'; b.textContent = it.name || it;
        b.onclick = function () { choose(typeof it === 'string' ? { name: it } : it); }; box.appendChild(b);
      });
      return box;
    }
    // Förslagen: bredvid varandra ("chips") eller under varandra ("list").
    function startBox() { return chips(el('div', 'chips start' + (C.startStyle === 'list' ? ' stack' : '')), suggestions()); }
    // En knapp från Voiceflow kan öppna en länk och skickar sin egen förfrågan tillbaka.
    function choose(b) {
      var req = b.request, acts = req && req.payload && req.payload.actions;
      if (acts && acts.forEach) acts.forEach(function (a) { if (a && a.type === 'open_url' && a.payload && a.payload.url) window.open(a.payload.url, '_blank', 'noopener'); });
      send(b.name, req && req.type ? req : null);
    }
    function cardEl(c) {
      var d = el('div', 'card');
      if (c.img) { var im = el('img', 'ci'); im.src = c.img; im.alt = ''; im.loading = 'lazy'; im.onerror = function () { im.remove(); }; d.appendChild(im); }
      var b = el('div', 'cb');
      if (c.title) b.appendChild(el('div', 'ct', esc(clean(c.title))));
      if (c.text) b.appendChild(el('div', 'cd', esc(clean(c.text))));
      if (c.buttons && c.buttons.length) {
        var s = el('div', 'cs');
        c.buttons.forEach(function (bt, i) {
          var x = el('button', 'cbtn' + (i === 0 ? ' first' : '')); x.type = 'button'; x.textContent = clean(bt.name);
          x.onclick = function () { choose(bt); }; s.appendChild(x);
        });
        b.appendChild(s);
      }
      d.appendChild(b);
      return d;
    }
    function carouselEl(cards) {
      var wrap = el('div', 'carw'), tr = el('div', 'car');
      cards.forEach(function (c) { tr.appendChild(cardEl(c)); });
      wrap.appendChild(tr);
      var l = el('button', 'carb l', svg(UI.left, 16)), r = el('button', 'carb r', svg(UI.right, 16));
      l.type = r.type = 'button'; l.setAttribute('aria-label', T.prev); r.setAttribute('aria-label', T.next);
      l.onclick = function () { tr.scrollBy({ left: -238, behavior: reduce ? 'auto' : 'smooth' }); };
      r.onclick = function () { tr.scrollBy({ left: 238, behavior: reduce ? 'auto' : 'smooth' }); };
      function edges() { l.disabled = tr.scrollLeft < 8; r.disabled = tr.scrollLeft + tr.clientWidth > tr.scrollWidth - 8; }
      tr.addEventListener('scroll', edges, { passive: true }); setTimeout(edges, 60);
      wrap.appendChild(l); wrap.appendChild(r);
      return wrap;
    }

    /* Ett svar som redan finns (efter ett sidbyte, eller Voiceflows öppning) visas direkt: text, bild, kort, karusell och knappar. */
    function renderBlocks(blocks) {
      var btns = [];
      blocks.forEach(function (b) {
        if (b.t === 'text') { var txt = showText(b.text); if (txt) addBot(md(txt)); return; }
        if (b.t === 'btns') { btns = btns.concat(b.items); return; }
        var node = richEl(b); if (node) { node.classList.add('still'); msgs.appendChild(node); }
      });
      if (btns.length) msgs.appendChild(chips(el('div', 'chips next'), btns));
    }
    function richEl(b) {
      var node = el('div', 'rich');
      if (b.t === 'img') { var p = el('div', 'pic'), im = el('img'); im.src = b.src; im.alt = ''; im.loading = 'lazy'; p.appendChild(im); node.appendChild(p); }
      else if (b.t === 'card') node.appendChild(cardEl(b.card));
      else if (b.t === 'car') node.appendChild(carouselEl(b.cards));
      else return null;
      return node;
    }

    /* ---------- Svaret skrivs ut på plats ----------
       Texten byggs upp ord för ord direkt i svaret. Rutan växer mjukt i takt med texten och reserverar aldrig plats i förväg.
       Kommer texten i bitar från Voiceflow (streaming) visas den så fort den kommer. Kommer den hel skrivs den ut i lugn takt (cirka 20 ord i sekunden, högst drygt 7 s). */
    var typers = [], stick = true, pinOn = false, pinUntil = 0, FADE = 600, epoch = 0;
    // Medan svaret skrivs följer vyn med nedåt, tills besökaren själv rullar uppåt.
    function pin() {
      if (!stick || pinOn) return; pinOn = true;
      (function loop() {
        if (!stick || !alive) { pinOn = false; return; }
        var max = scroll.scrollHeight - scroll.clientHeight;
        if (max > scroll.scrollTop) scroll.scrollTop = max;
        if (typers.length || Date.now() < pinUntil) requestAnimationFrame(loop); else pinOn = false;
      })();
    }
    function wake(ty) { if (ty.ok && !ty.timer && !ty.done) ty.timer = setTimeout(function () { tick(ty); }, 0); }
    function typer(take) {
      var ty = { src: '', ended: false, shown: 0, birth: [], dom: 0, young: 0, row: null, box: null, inner: null, timer: 0, last: 0, bulk: null, n0: 0, done: false, instant: false, ok: null, take: take };
      ty.feed = function (t) { ty.src += t; wake(ty); };
      ty.end = function () { ty.ended = true; wake(ty); };
      // Svaret började om mitt i: raden visar direkt den nya versionen, lika långt som det som redan syntes, och fortsätter sedan.
      ty.redo = function (t) {
        ty.src = t;
        var text = showText(t), ends = tokenEnds(text);
        ty.shown = Math.min(ty.shown, ends.length); ty.birth = []; ty.dom = 0; ty.young = 0;
        if (ty.row && !ty.done) paint(ty, ty.shown ? closeBold(text.slice(0, ends[ty.shown - 1])) : '');
        wake(ty);
      };
      ty.run = function () { return new Promise(function (ok) { ty.ok = ok; typers.push(ty); wake(ty); }); };
      return ty;
    }
    // Raden byggs först när det finns ett ord att visa. Den första texten tar över raden där "Tänker" stod.
    function build(ty) {
      var think = ty.take && ty.take(), row = think || addBot(''), tx = row.querySelector('.tx'), h0 = think ? tx.offsetHeight : 0;
      tx.innerHTML = '<div class="tb"><div class="ti"></div></div>';
      ty.row = row; ty.box = tx.firstChild; ty.inner = ty.box.firstChild;
      ty.box.style.height = h0 + 'px'; void ty.box.offsetHeight;
      msgs.setAttribute('aria-busy', 'true');
    }
    // Nya ord tonar in. Raden ritas om vid varje nytt ord, så de ord som ännu tonar in får sin animation fortsatt från rätt punkt.
    function fade(ty) {
      var now = Date.now(), tw = document.createTreeWalker(ty.inner, NodeFilter.SHOW_TEXT), nodes = [], c, cnt = 0, i;
      while ((c = tw.nextNode())) { nodes.push(c); cnt += (c.nodeValue.match(/\S+/g) || []).length; }
      for (i = ty.dom; i < cnt; i++) ty.birth[i] = now;
      ty.dom = cnt; ty.birth.length = cnt;
      while (ty.young < cnt && now - ty.birth[ty.young] >= FADE) ty.young++;
      var idx = 0;
      nodes.forEach(function (t) {
        var n = (t.nodeValue.match(/\S+/g) || []).length;
        if (idx + n <= ty.young) { idx += n; return; }
        var frag = document.createDocumentFragment(), changed = false;
        t.nodeValue.split(/(\s+)/).forEach(function (p) {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
          var age = now - (ty.birth[idx++] || now);
          if (age < FADE) { var sp = el('span', 'wd'); sp.textContent = p; sp.style.animationDelay = (-age) + 'ms'; frag.appendChild(sp); changed = true; }
          else frag.appendChild(document.createTextNode(p));
        });
        if (changed) t.parentNode.replaceChild(frag, t);
      });
    }
    // Tonen överst: full före första meddelandet, sedan bleknar den i takt med att samtalet fyller chatten (borta när chatten är full).
    function glow() {
      var g = 1;
      if (w.classList.contains('has')) {
        var used = 0;
        [].forEach.call(msgs.children, function (n) { if (!n.classList.contains('intro')) used += n.offsetHeight + 14; });
        g = 1 - Math.min(1, Math.max(0, (used / Math.max(1, scroll.clientHeight) - .15) / .85));
      }
      panel.style.setProperty('--glow', g.toFixed(3));
    }
    function paint(ty, text) {
      if (!ty.row) build(ty);
      ty.inner.innerHTML = md(text);
      fade(ty);
      ty.box.style.height = ty.inner.offsetHeight + 'px';
      pinUntil = Date.now() + 600; pin(); glow();
    }
    function tick(ty) {
      ty.timer = 0;
      if (ty.done) return;
      if (!alive || (ty.row && !ty.row.isConnected)) return finishT(ty, null);
      var text = showText(ty.src), ends = tokenEnds(text), total = ends.length;
      if (!ty.ended) {
        // Ett ord som kanske inte är klart, och en länk som inte är hel, visas inte än.
        if (total && !/\s$/.test(ty.src)) total--;
        if (total) { var o = openLinkAt(text.slice(0, ends[total - 1])); if (o >= 0) { while (total > 0 && ends[total - 1] > o) total--; } }
      }
      if (ty.bulk === null) { ty.bulk = ty.ended; ty.n0 = total; }
      var backlog = total - ty.shown, now = Date.now();
      if (backlog <= 0) { if (ty.ended) finishT(ty, text); return; }
      var step = ty.instant || reduce ? 0 : ty.bulk ? Math.max(28, Math.min(50, 7000 / Math.max(ty.n0, 1))) : (backlog > 12 ? Math.max(14, 38 * 12 / backlog) : 38);
      var n = step ? Math.max(1, Math.min(backlog, Math.floor((now - (ty.last || now - step)) / step))) : backlog;
      ty.shown += n; ty.last = now;
      var all = ty.ended && ty.shown >= ends.length;
      paint(ty, all ? text : closeBold(text.slice(0, ends[ty.shown - 1])));
      if (all) return finishT(ty, text, true);
      if (ty.shown < total) ty.timer = setTimeout(function () { tick(ty); }, step);
    }
    function finishT(ty, text, painted) {
      if (ty.done) return; ty.done = true; clearTimeout(ty.timer); ty.timer = 0;
      var i = typers.indexOf(ty); if (i >= 0) typers.splice(i, 1);
      if (!typers.length) msgs.setAttribute('aria-busy', 'false');
      if (text != null && ty.row && ty.row.isConnected) {
        if (!painted) paint(ty, text);
        // De sista orden får tona in klart, sedan byts raden mot den rena texten och rutan får växa fritt igen.
        setTimeout(function () {
          if (!ty.row.isConnected) return;
          ty.inner.innerHTML = md(text); ty.box.style.height = ''; ty.box.classList.add('done');
        }, FADE + 120);
      }
      if (ty.ok) ty.ok();
    }
    // Visa allt som hunnit komma direkt (när besökaren skriver något nytt, eller något går fel).
    function flushTypers() {
      typers.slice().forEach(function (ty) { ty.instant = true; clearTimeout(ty.timer); ty.timer = 0; if (ty.ok) tick(ty); });
    }
    function dropTypers() { typers.slice().forEach(function (ty) { ty.done = true; clearTimeout(ty.timer); if (ty.ok) ty.ok(); }); typers = []; msgs.setAttribute('aria-busy', 'false'); }

    /* Ett svar byggs upp medan det kommer: text som skrivs ut (först den på raden där "Tänker" stod), sedan bilder, kort och knappar, i tur och ordning. */
    function makeReply(think) {
      var blocks = [], cur = null, chain = Promise.resolve(), btns = [], shown = false, said = false, rp = {}, ep = epoch;
      var oven = C.thinking === 'oven' && !reduce, served = false, t0 = Date.now();
      function lane(fn) { chain = chain.then(function () { return ep === epoch ? fn() : null; }); chain.catch(function () {}); return chain; }
      // Pizzaugnen: när det första av svaret kommer tas pizzan ut på fatet. Svaret väntar i kö tills pizzan är serverad,
      // sedan tonar ugnen bort och texten skrivs fram på samma rad. Pizzan hinner alltid in i ugnen först.
      function serve() {
        if (!oven || served || !think) return;
        served = true;
        var row = think;
        lane(function () {
          var art = row.querySelector('.ov'), box = row.querySelector('.ov-row');
          if (!art || !row.isConnected) return null;
          return sleep(Math.max(0, 900 - (Date.now() - t0))).then(function () {
            if (!row.isConnected || !row.querySelector('.ov')) return null;
            art.classList.add('out');
            var sh = row.querySelector('.shim'); if (sh) sh.textContent = clean(T.ovenDone) || OVEN_DONE;
            pinUntil = Date.now() + 1600; pin();
            return sleep(C.ovenHold == null ? 1300 : num(C.ovenHold, 1300)).then(function () {
              if (box) box.classList.add('gone');
              return sleep(200);
            });
          });
        });
      }
      function takeThink() { var t = think; think = null; return t; }
      function dropThink() { if (think) { think.remove(); think = null; } }
      function hasText() { return blocks.some(function (b) { return b.t === 'text' && showText(b.text); }); }
      function leadText(kind) { var l = guessLang(lastUser, C.language || 'sv'), m = kind === 'btns' ? CHOOSE : OPTIONS; return m[l] || m.sv; }
      // Kommer knappar eller kort utan någon text skrivs en kort inledning först (där "Tänker" stod).
      function placed(node, kind) {
        if (!said) {
          said = true;
          var t = leadText(kind), row = takeThink() || addBot(''); row.querySelector('.tx').innerHTML = md(t);
          if (!hasText()) blocks.unshift({ t: 'text', text: t });
        }
        dropThink(); shown = true; msgs.appendChild(node); pinUntil = Date.now() + 600; pin(); glow();
      }
      rp.blocks = blocks;
      rp.shown = function () { return shown; };
      rp.open = function () {
        if (cur) return;
        serve();
        var ty = typer(function () { shown = true; said = true; return takeThink(); }), blk = { t: 'text', text: '' };
        blocks.push(blk); ty.blk = blk; cur = ty;
        lane(function () { return ty.run(); });
      };
      rp.delta = function (t) { if (!cur) rp.open(); cur.feed(t); cur.blk.text = cur.src; };
      rp.redo = function (t) { if (cur) { cur.redo(t); cur.blk.text = cur.src; } };
      rp.close = function () { if (cur) { cur.end(); cur = null; } };
      rp.text = function (t) { rp.open(); rp.delta(t); rp.close(); };
      rp.block = function (b) {
        rp.close(); blocks.push(b); serve();
        lane(function () { var n = richEl(b); if (n) placed(n, 'rich'); });
      };
      rp.btns = function (items) { btns = btns.concat(items); blocks.push({ t: 'btns', items: items }); };
      rp.finish = function () {
        rp.close();
        if (btns.length && !hasText() && !said) blocks.unshift({ t: 'text', text: leadText('btns') }); // så att inledningen också följer med i historiken
        if (btns.length) serve();
        return lane(function () { if (btns.length) placed(chips(el('div', 'chips next'), btns), 'btns'); dropThink(); });
      };
      // Något gick fel: det som hunnit komma visas, och felet står under (eller där "Tänker" stod).
      rp.fail = function (retry) {
        rp.close(); flushTypers();
        var row = shown ? addBot('') : (takeThink() || addBot('')), tx = row.querySelector('.tx');
        tx.innerHTML = md(clean(C.errorText) || (T.failed + (C.phone ? ' ' + T.callUs.replace('{phone}', C.phone) : '')));
        var b = el('button', 'retry'); b.type = 'button'; b.textContent = T.retry;
        b.onclick = function () { if (busy) return; row.remove(); busy = true; sync(); retry(); };
        (tx.lastElementChild || tx).appendChild(b);
      };
      return rp;
    }
    function thinkLabel() {
      var s = T.thinking || (C.strings && C.strings.thinking);
      if (typeof s === 'string' && s.trim()) return s.trim();
      return THINK[guessLang(lastUser, C.language || 'sv')] || THINK.sv;
    }
    function ovenLabel() {
      var s = T.oven || T.thinking;
      if (typeof s === 'string' && s.trim()) return s.trim();
      return OVEN[guessLang(lastUser, C.language || 'sv')] || OVEN.sv;
    }
    function thinkHtml() {
      if (C.thinking === 'oven') return '<span class="think ov-row" role="status">' + ovenSvg() + '<span class="shim">' + esc(waitText || ovenLabel()) + '</span></span>';
      var art = C.thinking === 'art' ? cleanSvg(C.thinkingSvg) : '';
      return '<span class="think" role="status">' + (art ? '<span class="art" aria-hidden="true">' + art + '</span>' : '') + '<span class="shim">' + esc(waitText || thinkLabel()) + '</span></span>';
    }
    function save() { if (C.persist !== false) store(id, JSON.stringify(log.slice(-40))); }

    /* ---------- Voiceflow ---------- */
    var V = C.voiceflow, RUNTIME = String(C.runtimeUrl || 'https://general-runtime.voiceflow.com').replace(/[/]+$/, '');
    function vfUser() {
      var u = store(id + ':u');
      if (!u) { u = 'ss-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); store(id + ':u', u); }
      return u;
    }
    var streamOK = null; // null = inte provat än, true = fungerar, false = används inte (då tas den vanliga vägen)
    function enc(x) { return encodeURIComponent(x); }
    // Den vanliga vägen: hela svaret kommer först när Voiceflow är klart.
    function vfPlain(action, onTrace) {
      return fetch(RUNTIME + '/public/' + enc(V.projectID) + '/state/user/' + enc(vfUser()) + '/interact', {
        method: 'POST', headers: { 'Content-Type': 'application/json', versionID: V.versionID || 'production' },
        body: JSON.stringify({ action: action, config: { tts: false, stripSSML: true } })
      }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (res) { tracesOf(res).forEach(onTrace); });
    }
    // Streaming: samma publika väg som Voiceflows egen chatt använder. Svaret kommer i bitar (Server-Sent Events) medan det skrivs.
    function vfStream(action, env, onTrace) {
      var got = false;
      return fetch(RUNTIME + '/v2/public/project/' + enc(V.projectID) + '/user/' + enc(vfUser()) + '/interact/stream?audio_events=false&completion_events=true&environment=' + env, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' }, body: JSON.stringify({ action: action })
      }).then(function (r) {
        if (!r.ok) { var e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
        function frame(fr) {
          var ev = '', data = [];
          fr.split(/\r?\n/).forEach(function (l) { if (l.indexOf('event:') === 0) ev = l.slice(6).trim(); else if (l.indexOf('data:') === 0) data.push(l.slice(5).replace(/^ /, '')); });
          if (ev && ev !== 'trace') return;
          var tr; try { tr = JSON.parse(data.join('\n').replace(/[\u0000-\u001f]/g, ' ')); } catch (x) { return; }
          if (tr && tr.type) { got = true; onTrace(tr); }
        }
        if (!r.body || !r.body.getReader || !window.TextDecoder) return r.text().then(function (t) { t.split(/\r?\n\r?\n/).forEach(frame); });
        var rd = r.body.getReader(), dec = new TextDecoder('utf-8'), buf = '';
        return (function pump() {
          return rd.read().then(function (x) {
            if (x.done) { buf += dec.decode(); if (buf.trim()) frame(buf); return; }
            buf += dec.decode(x.value, { stream: true });
            var parts = buf.split(/\r?\n\r?\n/); buf = parts.pop(); parts.forEach(frame);
            return pump();
          });
        })();
      }).catch(function (e) { e.got = got; throw e; });
    }
    // Strömmar om det går (bara "production" och "development" har en stream-väg), annars den vanliga vägen.
    function vfCall(action, onTrace) {
      var env = V.versionID === 'development' ? 'development' : (!V.versionID || V.versionID === 'production') ? 'production' : '';
      if (C.stream === false || streamOK === false || !env || !window.fetch) return vfPlain(action, onTrace);
      return vfStream(action, env, onTrace).then(function () { streamOK = true; }, function (e) {
        // Det första anropet (öppningen) är ofarligt att göra om. Går det inte att strömma används den vanliga vägen resten av besöket.
        if (streamOK !== null || e.got) throw e;
        streamOK = false; return vfPlain(action, onTrace);
      });
    }
    function tracesOf(res) { return Array.isArray(res) ? res : ((res && (res.trace || res.traces)) || []); }
    function leafText(n) {
      var t = n.text; if (!t) return '';
      var fw = n.fontWeight, strong = n.bold === true || fw === 'bold' || Number(fw) >= 600, m = /^(\s*)([\s\S]*?)(\s*)$/.exec(t);
      return strong && m[2] ? m[1] + '**' + m[2] + '**' + m[3] : t;
    }
    function nodeText(n) {
      if (n == null) return '';
      if (typeof n.text === 'string') return leafText(n);
      var kids = n.children || [], inner = kids.map(nodeText).join(kids.some(function (k) { return k && k.children && k.type !== 'link'; }) ? '\n' : '');
      return n.type === 'link' && n.url ? '[' + (inner || n.url) + '](' + n.url + ')' : inner;
    }
    function slateText(sl) { var c = sl && (sl.content || sl); return Array.isArray(c) ? c.map(nodeText).join('\n') : ''; }
    // Texten i en text-trace: Slate om den har länkar eller fetstil (Voiceflows "message" är bara ren text), annars message.
    function textOf(p) {
      var msg = typeof p.message === 'string' ? p.message : '', sl = slateText(p.slate);
      return sl && (/\]\(|\*\*/.test(sl) || !msg.trim()) ? sl : msg;
    }
    function cardOf(c) {
      var d = c.description || {}, text = typeof d === 'string' ? d : (d.text || slateText(d.slate));
      return { title: c.title || '', text: text || '', img: c.imageUrl || c.image || '',
        buttons: (c.buttons || []).filter(function (b) { return b && b.name; }).map(function (b) { return { name: b.name, request: b.request }; }) };
    }
    /* Samma uppgifter som den klassiska widgetens BrowserData-tillägg skickade tillbaka. */
    function browserData(apiKey) {
      function cookies() { try { return document.cookie.split(';').reduce(function (acc, c) { var p = c.split('='); var k = (p.shift() || '').trim(); if (k) acc[k] = p.join('=').trim(); return acc; }, {}); } catch (e) { return {}; } }
      function browser() {
        var ua = navigator.userAgent, m;
        if (/crios/i.test(ua)) { m = ua.match(/crios[/]([\d.]+)/i); return { name: 'Chrome (iOS)', version: m ? m[1] : 'Unknown' }; }
        if (/chrome/i.test(ua)) { m = ua.match(/chrome[/]([\d.]+)/i); return { name: 'Chrome', version: m ? m[1] : 'Unknown' }; }
        if (/firefox/i.test(ua)) { m = ua.match(/firefox[/]([\d.]+)/i); return { name: 'Firefox', version: m ? m[1] : 'Unknown' }; }
        if (/safari/i.test(ua)) { m = ua.match(/version[/]([\d.]+)/i); return { name: 'Safari', version: m ? m[1] : 'Unknown' }; }
        return { name: 'Unknown', version: 'Unknown' };
      }
      var none = { ip: 'Unavailable', country: 'Unknown' };
      var geo = apiKey ? Promise.race([
        fetch('https://api.ipgeolocation.io/ipgeo?apiKey=' + encodeURIComponent(apiKey)).then(function (r) { return r.ok ? r.json() : Promise.reject(); }).then(function (d) { return { ip: d.ip, country: d.country_name || 'Unknown' }; }),
        sleep(2500).then(function () { return none; })
      ]).catch(function () { return none; }) : Promise.resolve(none);
      return geo.then(function (g) {
        var b = browser();
        return {
          ip: g.ip, country: g.country, url: location.href, params: new URLSearchParams(location.search).toString(), cookies: cookies(),
          timezone: new Date().toISOString(), time: new Date().toLocaleTimeString(), ts: Math.floor(Date.now() / 1000), userAgent: navigator.userAgent,
          browserName: b.name, browserVersion: b.version, lang: navigator.language, supportsCookies: navigator.cookieEnabled, platform: navigator.platform,
          screenResolution: screen.width + 'x' + screen.height,
          viewportSize: Math.max(document.documentElement.clientWidth || 0, innerWidth || 0) + 'x' + Math.max(document.documentElement.clientHeight || 0, innerHeight || 0)
        };
      });
    }
    /* Voiceflows AI-agent skriver ibland samma svar två gånger i samma tur: först svaret, sedan en finputsad kopia som ett eget meddelande.
       Ett andra AI-meddelande i samma tur hålls därför tillbaka tills det syns att det inte är en kopia. Kopior visas aldrig, allt annat visas som vanligt. */
    function wordList(s) { return clean(s).replace(/\]\([^)]*\)/g, ' ').toLowerCase().replace(/[^0-9a-zåäöæøüéèáàíóúñ]+/g, ' ').trim().split(' ').filter(Boolean); }
    function likeness(a, b) {
      if (!a.length || !b.length) return 0;
      var n = {}, hit = 0;
      a.forEach(function (x) { n[x] = (n[x] || 0) + 1; });
      b.forEach(function (x) { if (n[x]) { n[x]--; hit++; } });
      return 2 * hit / (a.length + b.length);
    }
    function pairSet(a) { var o = {}; for (var i = 1; i < a.length; i++) o[a[i - 1] + ' ' + a[i]] = 1; return o; }
    function within(b, a) { var pa = pairSet(a), k = Object.keys(pairSet(b)); return k.length ? k.filter(function (x) { return pa[x]; }).length / k.length : 0; }
    // part: bara början av det nya meddelandet har kommit. Då räcker en svag likhet för att vänta in resten.
    function copyOf(text, prev, part) {
      var b = wordList(text);
      return prev.some(function (p) {
        var a = wordList(p);
        if (a.join(' ') === b.join(' ')) return true;
        if (b.length < 4 || a.length < 4) return false;
        if (part) return likeness(b, a.slice(0, b.length)) >= .35 || within(b, a) >= .5;
        return likeness(a, b) >= .6 || within(b, a) >= .85;
      });
    }
    // Började svaret om mitt i (samma svar en gång till)? Ger var den sista nya början står, annars -1.
    // Ihopklistrat ("…ditt namnFör 40 personer…"): de första 12 orden liknar svarets början. Efter ett vanligt stycke: först när
    // meddelandet är klart, och bara om resten är en nästan exakt kopia som börjar med samma fyra ord.
    function restartAt(text, final) {
      var re = /([a-zåäöæøüé0-9.!?)\]*])([A-ZÅÄÖÆØÜÉ])|([.!?]["”’)*]*[ \t]+|\n\s*)(?=[A-ZÅÄÖÆØÜÉ[*])/g, m, best = -1;
      while ((m = re.exec(text))) {
        var glued = !!m[2], k = glued ? m.index + 1 : m.index + m[0].length;
        if (glued) re.lastIndex = k;
        if (!glued && !final) continue;
        var a = wordList(text.slice(0, k)), b = wordList(text.slice(k)), n = Math.min(b.length, 12);
        if (a.length < 8 || b.length < 8) continue;
        if (glued ? likeness(b.slice(0, n), a.slice(0, n)) >= .6 : b.length >= .6 * a.length && a.slice(0, 4).join(' ') === b.slice(0, 4).join(' ') && likeness(a, b) >= .8 && within(b, a) >= .7) best = k;
      }
      return best;
    }
    function aiStart(st, rp) { st.cur = { text: '', held: st.said.length > 0, chk: 0 }; if (!st.cur.held) rp.open(); }
    function aiMore(st, rp, t) {
      if (!st.cur) aiStart(st, rp);
      var c = st.cur; c.text += t;
      // Börjar svaret om mitt i visas bara den nya versionen.
      if (c.text.length - c.chk >= 12) {
        c.chk = c.text.length;
        var k = restartAt(c.text);
        if (k > 0) { c.text = c.text.slice(k); c.chk = c.text.length; if (!c.held) { rp.redo(c.text); return; } }
      }
      if (!c.held) { rp.delta(t); return; }
      // Ett meddelande som tydligt är något annat släpps fram så fort det syns och strömmar sedan som vanligt.
      if (wordList(c.text).length >= 20 && !copyOf(c.text, st.said, true)) { c.held = false; rp.open(); rp.delta(c.text); }
    }
    function aiEnd(st, rp) {
      var c = st.cur; if (!c) return;
      st.cur = null;
      var k = restartAt(c.text, true);
      if (k > 0) { c.text = c.text.slice(k); if (!c.held) rp.redo(c.text); }
      if (!c.held) rp.close();
      else if (showText(c.text) && !copyOf(c.text, st.said)) rp.text(c.text);
      if (showText(c.text)) st.said.push(c.text);
    }
    /* Ett svar från Voiceflow är en lista "traces". Texten skrivs ut medan den kommer, bilder, kort och knappar följer efter; ext_-meddelandena är order till chatten. */
    function handleTrace(tr, rp, st) {
      var p = (tr && tr.payload) || {}, type = tr && tr.type, none = Promise.resolve(null);
      if (type === 'text' || type === 'speak') {
        var m = textOf(p);
        // En text som bara upprepar ett svar som redan kommit i samma tur (till exempel det som just strömmades) visas inte igen.
        if (m && m.trim()) { aiEnd(st, rp); var k = restartAt(m, true); if (k > 0) m = m.slice(k); if (!copyOf(m, st.said)) rp.text(m); st.said.push(m); }
        return none;
      }
      if (type === 'completion') {
        // En ny del (till exempel efter ett verktygsanrop) börjar alltid en egen text, så att två delar aldrig klistras ihop.
        if (p.state === 'start') { aiEnd(st, rp); aiStart(st, rp); }
        else if (p.state === 'end') aiEnd(st, rp);
        else if (typeof p.content === 'string') aiMore(st, rp, p.content);
        return none;
      }
      if (type === 'visual' && p.image) { rp.block({ t: 'img', src: p.image }); return none; }
      if (type === 'choice' && Array.isArray(p.buttons)) {
        var items = p.buttons.filter(function (b) { return b && b.name; }).map(function (b) { return { name: b.name, request: b.request }; });
        if (items.length) rp.btns(items);
        return none;
      }
      if (type === 'cardV2') { rp.block({ t: 'card', card: cardOf(p) }); return none; }
      if (type === 'carousel' && Array.isArray(p.cards)) { rp.block({ t: 'car', cards: p.cards.map(cardOf) }); return none; }
      // Tilläggen från den klassiska widgeten. Flödet väntar på svar från chatten, annars händer ingenting.
      if (type === 'ext_placeholder') { if (!C.placeholder && p.placeholder) ta.placeholder = String(p.placeholder); return none; }
      if (type === 'ext_browserData') return browserData(p.apiKey).then(function (data) { return { type: 'complete', payload: data }; });
      if (type === 'ext_waitingAnimation') {
        waitText = typeof p.text === 'string' ? clean(p.text) : '';
        var sh = q('.think .shim'); if (sh && waitText) sh.textContent = waitText;
        return Promise.resolve({ type: 'continue' });
      }
      if (type === 'ext_doneAnimation') { waitText = ''; return sleep(300).then(function () { return { type: 'continue' }; }); }
      if (type === 'ext_disableInput') { inputLocked = !!p.isDisabled; ta.disabled = inputLocked; sync(); return none; }
      return none; // block, flow, end och annat som bara är felsökning
    }
    function exchange(action, rp) {
      var hops = 0, st = { said: [], cur: null };
      function step(req) {
        if (!req || hops++ > 8) { rp.close(); return Promise.resolve(); }
        var next = null, chain = Promise.resolve();
        return vfCall(req, function (tr) {
          chain = chain.then(function () { return handleTrace(tr, rp, st); }).then(function (n) { if (n) next = n; });
          chain.catch(function () {});
        }).then(function () { return chain; }).then(function () { aiEnd(st, rp); rp.close(); return step(next); });
      }
      return step(action);
    }
    // Samlar ett svar utan att visa det (Voiceflows öppning).
    function collector() {
      var blocks = [], cur = null, c = { blocks: blocks };
      c.open = function () { if (!cur) { cur = { t: 'text', text: '' }; blocks.push(cur); } };
      c.delta = function (t) { c.open(); cur.text += t; };
      c.redo = function (t) { if (cur) cur.text = t; };
      c.close = function () { cur = null; };
      c.text = function (t) { c.open(); c.delta(t); c.close(); };
      c.block = function (b) { c.close(); blocks.push(b); };
      c.btns = function (items) { c.close(); blocks.push({ t: 'btns', items: items }); };
      return c;
    }
    var launchP = null;
    function launched() {
      if (store(id + ':on')) return Promise.resolve([]);
      if (!launchP) {
        var col = collector();
        launchP = exchange({ type: 'launch', payload: { currentURL: location.href, currentTime: new Date().toISOString(), userLanguage: navigator.language || navigator.userLanguage } }, col)
          .then(function () { store(id + ':on', '1'); return col.blocks; }, function (e) { launchP = null; throw e; });
      }
      return launchP;
    }
    /* Svar: Voiceflow skarpt, förinspelade svar i demo. */
    function answer(action, rp) {
      if (C.demo) return new Promise(function (ok) {
        var a = C.demo[action.payload] || C.demo['*'] || 'Det här är en demo.';
        setTimeout(function () {
          rp.text(typeof a === 'string' ? a : a.t);
          if (a.c && a.c.length) rp.btns(a.c.map(function (x) { return { name: x }; }));
          ok();
        }, 900 + Math.random() * 700);
      });
      if (!V.projectID) return Promise.reject(new Error('projectID saknas i konfigurationen'));
      return launched().then(function () { return exchange(action, rp); });
    }

    /* ---------- Öppning, skicka, börja om ---------- */
    var greeted = false;
    function visible(blocks) { return (blocks || []).filter(function (b) { return b.t !== 'text' || showText(b.text); }); }
    function textOfBlocks(blocks) { return blocks.filter(function (b) { return b.t === 'text'; }).map(function (b) { return b.text; }).join('\n\n'); }
    function greet() {
      if (greeted) return; greeted = true;
      msgs.appendChild(introEl());
      var h = heroEl(), known = C.demo ? null : lstore(id + ':welcome'); msgs.appendChild(h);
      // Har Voiceflow-flödet en egen öppning visas den direkt (den som minns från förra besöket), annars den som står i inställningarna.
      if (known) { h.dataset.vf = '1'; h.querySelector('.op').innerHTML = md(known); }
      if (!w.classList.contains('has') && suggestions().length) h.appendChild(startBox());
      log.push({ r: 'bot', o: 1, blocks: [{ t: 'text', text: known || opening() }] }); save();
      // Voiceflow-flödets egen öppning ersätter den inställda så fort den kommer, så länge besökaren inte har skrivit något.
      if (!C.demo && V.projectID && !store(id + ':on')) launched().then(function (blocks) {
        if (!alive) return;
        var vis = visible(blocks), txt = clean(textOfBlocks(vis));
        lstore(id + ':welcome', txt || null); // minns öppningen till nästa besök, tomt om flödet inte har någon
        if (w.classList.contains('has')) return;
        if (!txt && known) { delete h.dataset.vf; setOp(h, md(opening()), true); log = [{ r: 'bot', o: 1, blocks: [{ t: 'text', text: opening() }] }]; save(); }
        if (!vis.length) return;
        fillHero(h, vis, true);
        log = [{ r: 'bot', o: 1, blocks: vis }]; save();
      }).catch(function () {});
    }
    // Frågan hamnar strax under den suddiga zonen när svaret är långt. Annars ligger samtalet kvar nederst.
    function follow(me) { scroll.scrollTo({ top: Math.max(0, me.offsetTop - 32), behavior: reduce ? 'auto' : 'smooth' }); }
    function send(text, req) {
      text = String(text || '').trim();
      if (!text || busy || inputLocked) return;
      open(); hideTeaser(); flushTypers();
      [].forEach.call(msgs.querySelectorAll('.chips,.list'), function (n) { n.remove(); });
      if (!w.classList.contains('has')) { foldIntro(); var dt = stamp(); addDay(dt); log.push({ r: 'day', text: dt }); }
      w.classList.add('has');
      lastUser = text;
      var me = addMe(text); log.push({ r: 'me', text: text }); save();
      ta.value = ''; grow(); busy = true; sync(); glow();
      if (w.dataset.m === 'mobile') ta.blur();
      ask(req || { type: 'text', payload: text }, me);
    }
    function ask(action, me) {
      var think = addBot(thinkHtml()), rp = makeReply(think);
      stick = true;
      setTimeout(function () { follow(me); }, 30);
      answer(action, rp).then(function () {
        if (!alive) return;
        var done = rp.finish(), vis = visible(rp.blocks);
        if (!vis.length) throw new Error('Tomt svar från Voiceflow');
        log.push({ r: 'bot', blocks: vis }); save();
        done.catch(function (e) { console.warn('[Smartsvar]', e); });
      }).catch(function (err) {
        if (!alive) return;
        console.warn('[Smartsvar]', err);
        rp.fail(function () { ask(action, me); });
      }).then(function () { waitText = ''; busy = false; sync(); });
    }
    function reset() {
      if (busy) return;
      dropTypers(); epoch++; stick = true;
      log = []; store(id, null); store(id + ':u', null); store(id + ':on', null);
      launchP = null; waitText = ''; lastUser = ''; inputLocked = false; ta.disabled = false;
      msgs.innerHTML = ''; w.classList.remove('has'); scroll.scrollTop = 0; glow();
      greeted = false; greet(); sync();
    }

    /* ---------- Öppna, stäng, layout ---------- */
    var locked = false, prevH = '', prevB = '';
    function lock(onOff) {
      if (framed || inline || onOff === locked) return; locked = onOff;
      if (onOff) { prevH = document.documentElement.style.overflow; prevB = document.body.style.overflow; document.documentElement.style.overflow = 'hidden'; document.body.style.overflow = 'hidden'; }
      else { document.documentElement.style.overflow = prevH; document.body.style.overflow = prevB; }
    }
    function open() {
      if (isOpen) return; isOpen = true;
      w.classList.add('open'); launch.setAttribute('aria-expanded', 'true'); hideTeaser(); greet();
      if (w.dataset.m === 'mobile') lock(true);
      else setTimeout(function () { ta.focus({ preventScroll: true }); }, 120);
      if (!framed) store(id + ':open', '1');
      requestAnimationFrame(function () { scroll.scrollTop = scroll.scrollHeight; });
    }
    function close() {
      if (inline || !isOpen) return; isOpen = false;
      w.classList.remove('open'); launch.setAttribute('aria-expanded', 'false'); ta.blur(); lock(false);
      store(id + ':open', null);
    }
    function sizeNow() {
      var vv = window.visualViewport, h, wd, kb = 0;
      if (framed) { h = box.clientHeight; wd = box.clientWidth; }
      else { h = vv ? vv.height : innerHeight; wd = innerWidth; kb = vv ? Math.max(0, innerHeight - vv.height - vv.offsetTop) : 0; }
      var m = inline ? 'inline' : (O.layout && O.layout !== 'auto') ? O.layout : (wd <= 600 || (h <= 500 && matchMedia('(pointer:coarse)').matches)) ? 'mobile' : 'desktop';
      return { h: h, wd: wd, kb: kb, m: m };
    }
    function measure() {
      var z = sizeNow();
      w.style.setProperty('--vh', z.h + 'px'); w.style.setProperty('--vw', z.wd + 'px'); w.style.setProperty('--kb', z.kb + 'px');
      if (w.dataset.m !== z.m) { w.dataset.m = z.m; lock(isOpen && z.m === 'mobile'); }
      if (typeof glow === 'function' && msgs) glow();
    }
    function hideTeaser() { if (teaser) teaser.hidden = true; }
    function sync() { sendB.disabled = busy || inputLocked || !ta.value.trim(); }
    function grow() { ta.style.height = '42px'; ta.style.height = Math.min(ta.scrollHeight, 124) + 'px'; }

    /* ---------- Händelser ---------- */
    q('form').onsubmit = function (e) { e.preventDefault(); send(ta.value); };
    var topEl = q('.top');
    // Följer med nedåt medan svaret skrivs, tills besökaren själv rullar uppåt (och igen när hen rullat ned till slutet).
    scroll.addEventListener('wheel', function (e) { if (e.deltaY < 0) stick = false; }, { passive: true });
    scroll.addEventListener('touchmove', function () { stick = false; }, { passive: true });
    scroll.addEventListener('scroll', function () { if (scroll.scrollHeight - scroll.clientHeight - scroll.scrollTop < 4) stick = true; }, { passive: true });
    ta.oninput = function () { grow(); sync(); };
    ta.onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(ta.value); } };
    q('.rs').onclick = reset; q('.x').onclick = close;
    if (launch) {
      launch.onclick = function () { isOpen ? close() : open(); };
      q('.scrim').onclick = close;
      teaser.onclick = function () { hideTeaser(); open(); };
      teaser.onkeydown = function (e) { if (e.key === 'Enter') { hideTeaser(); open(); } };
      q('.tx-x').onclick = function (e) { e.stopPropagation(); hideTeaser(); store(id + ':teased', '1'); };
      // Dra ned arket på mobilen för att stänga
      var y0 = null, dy = 0, top = q('.top');
      top.addEventListener('touchstart', function (e) { if (w.dataset.m !== 'mobile' || e.target.closest('button')) return; y0 = e.touches[0].clientY; dy = 0; panel.style.transition = 'none'; }, { passive: true });
      top.addEventListener('touchmove', function (e) { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); panel.style.transform = 'translateY(' + dy + 'px)'; }, { passive: true });
      top.addEventListener('touchend', function () { if (y0 == null) return; y0 = null; panel.style.transition = ''; panel.style.transform = ''; if (dy > 90) close(); }, { passive: true });
    }
    function onKey(e) { if (e.key === 'Escape') { if (isOpen) close(); else hideTeaser(); } }
    // Länkar på sajten med "chat=open" i adressen öppnar chatten.
    function onDocClick(e) {
      var a = e.target && e.target.closest ? e.target.closest('a') : null;
      if (a && (a.getAttribute('href') || '').indexOf('chat=open') >= 0) { e.preventDefault(); open(); }
    }
    document.addEventListener('keydown', onKey);
    // Tangenttryck inne i chatten stannar i chatten. Sajtens egna skript (till exempel mjuk rullning) tar annars mellanslag, piltangenter,
    // Home och End: de ser inte att besökaren skriver, eftersom skrivrutan ligger i chattens egen slutna ruta. Escape sköts därför här.
    ['keydown', 'keypress', 'keyup'].forEach(function (t) {
      w.addEventListener(t, function (e) { if (t === 'keydown') onKey(e); e.stopPropagation(); });
    });
    if (!inline && !framed) document.addEventListener('click', onDocClick);
    var ro = framed && window.ResizeObserver ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(box);
    else { window.addEventListener('resize', measure); if (window.visualViewport) { visualViewport.addEventListener('resize', measure); visualViewport.addEventListener('scroll', measure); } }

    /* ---------- Start: samtalet följer med mellan sidbyten ---------- */
    measure(); apply();
    try { log = C.persist === false ? [] : JSON.parse(store(id) || '[]') || []; } catch (e) { log = []; }
    if (log.length) {
      greeted = true;
      if (!log.some(function (m) { return m.r === 'me'; })) msgs.appendChild(introEl());
      log.forEach(function (m) {
        if (m.r === 'me') { addMe(m.text); lastUser = m.text; }
        else if (m.r === 'day') addDay(m.text);
        else if (m.r === 'bot' && m.o) {
          var h = heroEl(), vb = visible(m.blocks); msgs.appendChild(h);
          if (!(vb.length === 1 && vb[0].t === 'text' && clean(vb[0].text) === opening())) fillHero(h, vb);
        }
        else if (m.r === 'bot') renderBlocks(m.blocks || [{ t: 'text', text: m.text || '' }]);
      });
      if (log.some(function (m) { return m.r === 'me'; })) {
        w.classList.add('has');
        [].forEach.call(msgs.querySelectorAll('.chips'), function (n) { if (n !== msgs.lastElementChild) n.remove(); });
        requestAnimationFrame(glow);
      } else if (suggestions().length && !msgs.querySelector('.chips')) (q('.hero') || msgs).appendChild(startBox());
      requestAnimationFrame(function () { scroll.scrollTop = scroll.scrollHeight; });
    } else if (inline) greet();
    if (!inline && store(id + ':open') && w.dataset.m === 'desktop') open();
    if (!inline && /[?&]chat=open(?:&|$)/.test(location.search)) {
      open();
      try { history.replaceState({}, document.title, location.origin + location.pathname + location.hash); } catch (e) {}
    }
    if (!inline && C.teaser !== '' && !log.length && !store(id + ':teased')) setTimeout(function () {
      if (isOpen || !alive) return; teaser.hidden = false; if (!framed) store(id + ':teased', '1');
    }, C.teaserDelay == null ? 4000 : num(C.teaserDelay, 4000));

    return {
      update: apply, open: open, close: close, ask: send, send: send,
      toggle: function () { isOpen ? close() : open(); },
      destroy: function () {
        alive = false; lock(false);
        document.removeEventListener('keydown', onKey); document.removeEventListener('click', onDocClick);
        if (ro) ro.disconnect(); else { window.removeEventListener('resize', measure); if (window.visualViewport) { visualViewport.removeEventListener('resize', measure); visualViewport.removeEventListener('scroll', measure); } }
        host.remove();
      }
    };
  }

  /* ---------- Publikt API ---------- */
  var current = null;
  var API = window.SmartsvarChat = {
    __v: '4.1.0', base: BASE, mount: mount,
    init: function (config) { API.destroy(); current = mount(config || {}); return API; },
    destroy: function () { if (current) { current.destroy(); current = null; } return API; },
    update: function (config) { if (current) current.update(config); return API; },
    open: function () { if (current) current.open(); return API; },
    close: function () { if (current) current.close(); return API; },
    toggle: function () { if (current) current.toggle(); return API; },
    send: function (text) { if (current) current.send(text); return API; }
  };

  /* ---------- Autostart ----------
     Hos kunden: widget.js läser chat.js i samma mapp (alla inställningar och texter i en fil).
     I Botfactory: data-bot="kund" läser clients/kund.json. Finns window.SMARTSVAR redan används den. */
  var slug = script && script.getAttribute('data-bot'), file = script && script.getAttribute('data-config');
  function loadScript(src) {
    return new Promise(function (ok, fail) {
      var s = document.createElement('script'); s.src = src; s.async = true;
      s.onload = ok; s.onerror = function () { fail(new Error('kunde inte ladda ' + src)); };
      (document.head || document.documentElement).appendChild(s);
    });
  }
  function start() {
    var inlineCfg = window.SMARTSVAR || window.SMARTSVAR_CHAT || null;
    if (slug) {
      fetch(abs('clients/' + encodeURIComponent(slug) + '.json')).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (cfg) { API.init(assign({ slug: slug }, cfg, inlineCfg || {})); })
        .catch(function (e) { console.warn('[Smartsvar] Kunde inte ladda clients/' + slug + '.json', e); if (inlineCfg) API.init(inlineCfg); });
      return;
    }
    if (inlineCfg && !file) { API.init(inlineCfg); return; }
    var src = file || 'chat.js';
    if (/[.]json([?#]|$)/i.test(src)) {
      fetch(abs(src)).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (cfg) { API.init(cfg); })
        .catch(function (e) { console.warn('[Smartsvar] Kunde inte ladda ' + src, e); });
      return;
    }
    loadScript(abs(src)).then(function () {
      if (window.SMARTSVAR) API.init(window.SMARTSVAR);
      else console.warn('[Smartsvar] ' + src + ' satte inga inställningar (window.SMARTSVAR saknas). Kolla kommatecken och citattecken i filen.');
    }).catch(function (e) { console.warn('[Smartsvar] Hittar inte inställningarna: ' + e.message); });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
