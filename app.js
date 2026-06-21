'use strict';

var SAMPLE = '';


// ── LANDING PAGE ──
var landingTrace = 'evidence';
var landingPosture = 50;
var landingWords = [];
var landingSelStart = -1, landingSelEnd = -1;
var landingSelecting = false, landingSelAnchor = -1;
var landingNoteOpen = false;
var landingNoteRange = null;

function initLanding() {
  var container = document.getElementById('landing-text');
  if (!container) return;
  container.innerHTML = '';

  // Découper en mots avec index global
  var paras = BARTHES_FULL.split('\n\n');
  var globalIdx = 0;
  landingWords = [];

  paras.forEach(function(para, pi) {
    var p = document.createElement('p');
    p.style.cssText = 'margin:0 0 1.6em 0;';
    var wordsArr = para.trim().split(/\s+/);
    wordsArr.forEach(function(w, wi) {
      var span = document.createElement('span');
      span.dataset.idx = globalIdx;
      span.textContent = w;
      span.style.cssText = 'display:inline;cursor:text;font-family:PPNeueMontreal,DM Sans,sans-serif;font-weight:300;transition:color .15s;';
      if (wi < wordsArr.length - 1) {
        span.textContent = w + ' ';
      }
      p.appendChild(span);
      landingWords.push({ el: span, txt: w, annotated: false, trace: null, posture: 50, note: '' });
      globalIdx++;
    });
    container.appendChild(p);
  });

  // Scroll aléatoire — arriver au milieu du texte
  setTimeout(function() {
    var zone = document.getElementById('landing-text-zone');
    var maxScroll = zone.scrollHeight - zone.clientHeight;
    if (maxScroll > 0) {
      // Éviter le début et la fin (20%–80% du texte)
      var ratio = 0.2 + Math.random() * 0.6;
      zone.scrollTop = maxScroll * ratio;
    }
  }, 50);

  // Sélection souris
  var isDown = false, anchor = -1;
  container.addEventListener('mousedown', function(e) {
    var span = e.target.closest('span[data-idx]');
    if (!span) return;
    isDown = true;
    anchor = parseInt(span.dataset.idx);
    landingSelStart = anchor; landingSelEnd = anchor;
    clearLandingSel();
    e.preventDefault();
  });
  document.addEventListener('mousemove', function(e) {
    if (!isDown) return;
    var el = document.elementFromPoint(e.clientX, e.clientY);
    var span = el && el.closest ? el.closest('span[data-idx]') : null;
    if (!span && el && el.dataset && el.dataset.idx !== undefined) span = el;
    if (span && span.dataset.idx !== undefined) {
      var idx = parseInt(span.dataset.idx);
      landingSelStart = Math.min(anchor, idx);
      landingSelEnd   = Math.max(anchor, idx);
      updateLandingSelHighlight();
    }
  });
  document.addEventListener('mouseup', function() {
    if (!isDown) return;
    isDown = false;
    if (landingSelStart >= 0 && landingSelEnd >= landingSelStart) {
      landingApplyImmediate('');
    }
  });
}

function clearLandingSel() {
  landingWords.forEach(function(w) {
    if (!w.annotated) w.el.style.background = '';
  });
}
function updateLandingSelHighlight() {
  landingWords.forEach(function(w, i) {
    if (!w.annotated) {
      w.el.style.background = (i >= landingSelStart && i <= landingSelEnd)
        ? 'rgba(254,87,42,0.1)' : '';
    }
  });
}

// Ouvre le popup de l'interface (réutilisation exacte)
function landingOpenPopup() {
  if (landingSelStart < 0 || landingSelEnd < landingSelStart) return;

  // Afficher le passage dans le popup
  var txt = landingWords.slice(landingSelStart, landingSelEnd + 1).map(function(w) { return w.txt; }).join(' ');
  var passEl = document.getElementById('popup-passage');
  if (passEl) passEl.textContent = txt;

  // Cacher les éléments spécifiques à la phase lecture
  var meta = document.getElementById('popup-passage-meta');
  if (meta) meta.style.display = 'none';

  // Reset trace buttons
  document.querySelectorAll('.trace-btn').forEach(function(b) { b.classList.remove('active'); });
  var first = document.querySelector('.trace-btn[data-trace="evidence"]');
  if (first) first.classList.add('active');
  landingTrace = 'evidence';

  // Reset slider et note
  var slider = document.getElementById('posture-slider');
  if (slider) { slider.value = 50; landingPosture = 50; }
  var noteEl = document.getElementById('popup-note');
  if (noteEl) noteEl.value = '';

  // Rebrancher les boutons trace pour la landing
  document.querySelectorAll('.trace-btn').forEach(function(b) {
    b.onclick = function() {
      document.querySelectorAll('.trace-btn').forEach(function(x) { x.classList.remove('active'); });
      b.classList.add('active');
      landingTrace = b.dataset.trace;
    };
  });
  // Rebrancher le slider
  if (slider) {
    slider.oninput = function() { landingPosture = parseInt(this.value); };
  }

  // Bouton confirmer → appliquer
  var confirmBtn = document.querySelector('#annot-popup .btn-confirm');
  if (confirmBtn) {
    confirmBtn._landingHandler = function() {
      var note = document.getElementById('popup-note') ? document.getElementById('popup-note').value.trim() : '';
      landingApplyImmediate(note);
      closeLandingPopup();
    };
    confirmBtn.onclick = confirmBtn._landingHandler;
  }
  // Bouton annuler
  var cancelBtn = document.querySelector('#annot-popup .btn-cancel-flat');
  if (cancelBtn) cancelBtn.onclick = closeLandingPopup;

  // Overlay
  var overlay = document.getElementById('popup-overlay');
  if (overlay) {
    overlay.classList.remove('hidden');
    overlay.onclick = closeLandingPopup;
  }

  document.getElementById('annot-popup').classList.remove('hidden');
}

function closeLandingPopup() {
  document.getElementById('annot-popup').classList.add('hidden');
  var overlay = document.getElementById('popup-overlay');
  if (overlay) overlay.classList.add('hidden');
  // Restaurer le comportement normal des boutons pour la phase lecture
  document.querySelectorAll('.trace-btn').forEach(function(b) {
    b.onclick = function() { selectTrace(b); };
  });
  var slider = document.getElementById('posture-slider');
  if (slider) slider.oninput = function() { currentPosture = parseInt(this.value); };
  var overlay2 = document.getElementById('popup-overlay');
  if (overlay2) overlay2.onclick = cancelAnnot;
  var meta = document.getElementById('popup-passage-meta');
  if (meta) meta.style.display = '';
}

var landingLastRange = null;

function landingApplyImmediate(note) {
  var start = landingSelStart, end = landingSelEnd;
  if (start < 0 || end < start) return;
  var trace   = landingTrace;
  var posture = landingPosture;
  note = note || '';
  // Taille uniforme — pas de vague, pas de compression
  var sizeBoost = note ? Math.min(1.45, 1.08 + note.length / 120) : 1.18;
  var col = '#FE572A';

  for (var i = start; i <= end; i++) {
    var w = landingWords[i];
    w.annotated = true; w.trace = trace; w.posture = posture; w.note = note;
    var span = w.el;
    var postureN   = posture / 100;
    var fontFace   = postureN < 0.2 ? 'ArizonaSans,sans-serif' : 'ArizonaSerif,Georgia,serif';
    var fontWeight = postureN > 0.5 ? Math.round(lerp(300, 600, (postureN - 0.5) * 2)) : 300;

    span.style.background   = '';
    span.style.color        = col;
    span.style.fontFamily   = fontFace;
    span.style.fontWeight   = fontWeight;
    span.style.display      = 'inline';
    span.style.transform    = '';
    span.style.transformOrigin = '';
    span.style.opacity      = '';
    span.style.webkitTextStroke = '';
    span.style.fontSize     = '';
    span.style.verticalAlign = '';
    span.style.animation    = '';

    if (trace === 'evidence') {
      span.style.fontSize = (sizeBoost * 100).toFixed(1) + '%';
    } else if (trace === 'dialogue') {
      span.style.fontSize  = (sizeBoost * 100).toFixed(1) + '%';
      span.style.animation = 'landing-pulse 840ms ease-in-out infinite alternate';
    } else if (trace === 'note') {
      span.style.fontSize = (sizeBoost * 100).toFixed(1) + '%';
      var strokeW = note ? '1px' : '0.5px';
      span.style.webkitTextStroke = strokeW + ' ' + col;
    }
    if (note && trace !== 'note') span.style.webkitTextStroke = '0.4px ' + col;
  }

  if (note) showLandingNote(start, note);
  landingLastRange = { start: start, end: end };
  landingSelStart = -1; landingSelEnd = -1;
  clearLandingSel();
}

// Ré-appliquer taille en temps réel pendant la frappe de note
function landingReapplyWithNote(start, end, note) {
  var sizeBoost = note ? Math.min(1.45, 1.08 + note.length / 120) : 1.18;
  for (var i = start; i <= end; i++) {
    var span = landingWords[i].el;
    span.style.fontSize = (sizeBoost * 100).toFixed(1) + '%';
    if (note) span.style.webkitTextStroke = '0.4px #FE572A';
  }
}

function showLandingNote(wordIdx, note) {
  var span  = landingWords[wordIdx].el;
  var zone  = document.getElementById('landing-text-zone');
  var zRect = zone.getBoundingClientRect();
  var rect  = span.getBoundingClientRect();
  // Taille proportionnelle à la longueur de la note, comme dans la galerie
  var baseSize = 28;
  var size = Math.min(72, baseSize + note.length * 0.5);
  var div   = document.createElement('div');
  div.className = 'landing-note-float';
  div.dataset.wordIdx = wordIdx;
  div.style.cssText = [
    'position:absolute;',
    'left:' + Math.max(0, rect.left - zRect.left + zone.scrollLeft) + 'px;',
    'top:'  + (rect.top - zRect.top + zone.scrollTop - size * 1.2) + 'px;',
    'color:#FE572A;font-family:PPNeueMontreal,sans-serif;',
    'font-size:' + size + 'px;font-weight:300;line-height:1.15;',
    'pointer-events:none;white-space:pre-wrap;max-width:600px;',
    'letter-spacing:-0.01em;'
  ].join('');
  div.textContent = note;
  zone.style.position = 'relative';
  zone.appendChild(div);
}

function landingSelectTrace(btn) {
  document.querySelectorAll('.landing-trace-btn[data-trace]').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  if (btn.dataset.trace) landingTrace = btn.dataset.trace;
}

function landingPostureChange(val) {
  landingPosture = parseInt(val);
}

// "écrire note" : cible sélection active OU dernier passage annoté
function landingOpenNote() {
  var range = null;
  if (landingSelStart >= 0 && landingSelEnd >= landingSelStart) {
    // Appliquer d'abord l'effet du trace actif, puis ouvrir la note
    landingApplyImmediate('');
    range = landingLastRange;
  } else if (landingLastRange) {
    range = landingLastRange;
  }
  if (!range) return;

  landingNoteRange = range;
  var noteEl = document.getElementById('landing-note-inline');
  var input  = document.getElementById('landing-note-input');
  input.value = landingWords[range.start].note || '';

  var firstSpan = landingWords[range.start].el;
  var rect = firstSpan.getBoundingClientRect();
  noteEl.style.left = Math.max(8, rect.left) + 'px';
  noteEl.style.top  = (rect.bottom + 8) + 'px';
  noteEl.classList.remove('hidden');
  input.focus();

  input.oninput = function() {
    landingReapplyWithNote(landingNoteRange.start, landingNoteRange.end, input.value);
    // Aperçu en grand pendant la frappe
    var existing = document.getElementById('landing-note-preview');
    if (!existing) {
      existing = document.createElement('div');
      existing.id = 'landing-note-preview';
      var zone = document.getElementById('landing-text-zone');
      var firstSpan = landingWords[landingNoteRange.start].el;
      var zRect = zone.getBoundingClientRect();
      var rect  = firstSpan.getBoundingClientRect();
      existing.style.cssText = [
        'position:fixed;',
        'left:' + Math.max(8, rect.left) + 'px;',
        'top:'  + (rect.top - 80) + 'px;',
        'color:#FE572A;font-family:PPNeueMontreal,sans-serif;',
        'font-weight:300;line-height:1.15;letter-spacing:-0.01em;',
        'pointer-events:none;white-space:pre-wrap;max-width:600px;',
        'z-index:50;'
      ].join('');
      document.body.appendChild(existing);
    }
    var size = Math.min(72, 28 + input.value.length * 0.5);
    existing.style.fontSize = size + 'px';
    existing.style.top = (parseInt(existing.style.top) || 0) + 'px';
    existing.textContent = input.value;
  };

  input.onkeydown = function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      var val = input.value.trim();
      noteEl.classList.add('hidden');
      var preview = document.getElementById('landing-note-preview');
      if (preview) preview.remove();
      for (var i = landingNoteRange.start; i <= landingNoteRange.end; i++) {
        landingWords[i].note = val;
      }
      // Supprimer uniquement la note flottante de ce passage
      document.querySelectorAll('.landing-note-float').forEach(function(d) {
        if (parseInt(d.dataset.wordIdx) === landingNoteRange.start) d.remove();
      });
      if (val) showLandingNote(landingNoteRange.start, val);
      landingNoteRange = null;
    }
    if (e.key === 'Escape') {
      noteEl.classList.add('hidden');
      landingNoteRange = null;
    }
  };
}


function landingImport(input) {
  if (!input.files || !input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('text-input').value = e.target.result;
    var name = input.files[0].name.replace(/\.[^.]+$/, '');
    document.getElementById('doc-title').value = name;
    
    document.getElementById('lc-setup').classList.remove('hidden');
    var s=document.getElementById('lc-setup');if(s)setTimeout(function(){s.scrollIntoView({behavior:'smooth'});},100);
    updateProfileNameInputs();
  };
  reader.readAsText(input.files[0]);
}

window.addEventListener('DOMContentLoaded', function() {
  initLanding();
  _injectRisoFilter();
});

function _injectRisoFilter() {
  if (document.getElementById('riso-svg-defs')) return;
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = 'riso-svg-defs';
  svg.setAttribute('aria-hidden','true');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;';
  svg.innerHTML = '<defs>' +
    '<filter id="riso-tram" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="1" seed="3" result="noise"/>' +
      '<feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 6 -2" in="noise" result="grain"/>' +
      '<feComposite in="SourceGraphic" in2="grain" operator="in" result="grained"/>' +
      '<feBlend in="SourceGraphic" in2="grained" mode="normal" result="blended"/>' +
    '</filter>' +
  '</defs>';
  document.body.insertBefore(svg, document.body.firstChild);
}



var words = [], wordById = {}, annotations = [], annotIdCtr = 0;
var floatingThoughts = [];
var docTitle = '', currentPhase = 'lecture';
var selStart = -1, selEnd = -1, isDragging = false, pendingIds = [];
var selectedTrace = 'souligne';
var currentPosture = 50; // 0=analytique, 100=personnel
var thoughtPosture = 50;
var pendingThoughtY = 0;
var currentIntensity = 1;
var isNeutral = false;
var galViewMode = 'large';
var renderRaf = null;
var highlightedAnnot = null;
var _lastLayout = null;
var _lastFS = 17;
var _lastPAD = 160;
var _lastW = 820;
var _hoveredProfile = null; // null = show all, number = show only that profile
var currentProfile = 1;
var dimUnannotated = false; // toggle opacité texte non-annoté
var hideAnnotations  = false; // "texte neutre" : masque toutes les annotations/gestes (lecture brute)
var monochromeReading = false; // "n&b" : annotations visibles mais en noir et blanc
var NEUTRAL_COL     = 'rgba(12,12,10,0.7)';
var NEUTRAL_COL_BOLD= '#0C0C0A';
/* Retourne la couleur d'un profil pour la lecture, ou la couleur neutre si "n&b" est actif */
function pcolor(profileIdx, bold) {
  if (monochromeReading) return bold ? NEUTRAL_COL_BOLD : NEUTRAL_COL;
  var p = profiles[profileIdx];
  if (!p) return bold ? '#111' : '#111';
  return bold ? (p.colorBold || p.color || '#111') : (p.color || '#111');
}
/* Retourne la couleur d'un thème, ou la couleur neutre si "n&b" est actif */
function tcolor(theme) {
  if (monochromeReading) return NEUTRAL_COL_BOLD;
  return (theme && theme.color) || '#FE572A';
}
var profiles = []; // [{name, color}]
// Palette pastel — pour overlays dans le texte (soulignements, surlignements, entourés)
var PALETTE = [
  '#F28B82', // 1 rouge rosé
  '#FBBC04', // 2 jaune ambre
  '#A8D5A2', // 3 vert menthe
  '#A0C4F8', // 4 bleu ciel
  '#C5A6E8', // 5 lavande
  '#FF80AB', // 6 rose fluo
  '#55E0CB', // 7 turquoise
  '#8C9EE8', // 9 bleu indigo
];
// Palette bold — même teintes, plus saturées, pour notes en marge et texte annoté
var PALETTE_BOLD = [
  '#D93025', // 1 rouge
  '#E37400', // 2 orange brûlé
  '#1E8B3C', // 3 vert
  '#1A6FBF', // 4 bleu
  '#7B3FC4', // 5 violet
  '#F50057', // 6 rose foncé fluo
  '#00897B', // 7 turquoise foncé
  '#C0392B', // 8 rouge brûlé foncé
  '#283593', // 9 indigo foncé
];

// Couleurs fixes des 9 palettes — utilisées par le color-picker
var PALETTE_SWATCHES = [
  { pastel: '#F28B82', bold: '#D93025' }, // 1 rouge
  { pastel: '#FBBC04', bold: '#E37400' }, // 2 ambre
  { pastel: '#A8D5A2', bold: '#1E8B3C' }, // 3 vert
  { pastel: '#A0C4F8', bold: '#1A6FBF' }, // 4 bleu
  { pastel: '#C5A6E8', bold: '#7B3FC4' }, // 5 lavande
  { pastel: '#FF80AB', bold: '#F50057' }, // 6 rose fluo
  { pastel: '#55E0CB', bold: '#00897B' }, // 7 turquoise
  { pastel: '#F4A261', bold: '#C0392B' }, // 8 rouge-orangé brûlé
  { pastel: '#8C9EE8', bold: '#283593' }, // 9 indigo
];

function lerp(a, b, t) { return a + (b - a) * t; }
function ease(t) { return t < .5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function seededRand(s) { var x = s+1; return function() { x=(x*16807)%2147483647; return (x-1)/2147483646; }; }
function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

/* Trouve le mot dont le centre vertical est le plus proche de yPx
   (coordonnées document, relatives à reading-zone + scroll — même
   repère que topIdeal). N'est appelé qu'une fois par pensée flottante
   (mise en cache ensuite), donc un parcours linéaire est largement
   suffisant même sur un texte de plusieurs milliers de mots. */
function _nearestWordIdAtY(yPx, rzRect, scrollT) {
  var best = null, bestDist = Infinity;
  for (var i = 0; i < words.length; i++) {
    var w = words[i];
    if (!w.el) continue;
    var r = w.el.getBoundingClientRect();
    var wordY = (r.top + r.bottom) / 2 - rzRect.top + scrollT;
    var dist = Math.abs(wordY - yPx);
    if (dist < bestDist) { bestDist = dist; best = w.el.id; }
  }
  return best;
}

/* Insère les espaces insécables/fines avant la ponctuation française —
   même règle que la normalisation du texte principal (cf. startReading),
   réutilisée ici pour les notes de marge et pensées flottantes afin
   qu'un « ;», «?» ou «!» ne se retrouve plus seul en début de ligne. */
function _frenchSpacing(t) {
  if (!t) return t;
  t = t.replace(/[ \u00A0\u202F]*:/g, '\u00A0:');
  t = t.replace(/[ \u00A0\u202F]*;/g, '\u202F;');
  t = t.replace(/[ \u00A0\u202F]*\?/g, '\u202F?');
  t = t.replace(/[ \u00A0\u202F]*!/g, '\u202F!');
  return t;
}

// ── MATCHING ALGO ──
// Recherche de passage par sous-chaîne sur texte normalisé (char-level),
// avec retour vers les indices de mots (spanIds).
// Corrige : sauts de ligne \n\n, apostrophes typo, guillemets, occurrences multiples.

function _matchNormalize(s) {
  return s
    .replace(/[\u00A0\u202F\u2009]/g, ' ')  // espaces insécables → espace normale
    .replace(/\s+/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, '.')                // … → . (aligné avec _buildMatchStructures)
    .replace(/\u2013|\u2014/g, '-')         // tirets → tiret simple
    .trim();
}

/* Vérifie que les spanIds importés correspondent bien au passage attendu dans le document actuel.
   Évite le décalage massif quand un JSON d'annotations est importé sur un autre document
   (ou une version différente) où les mêmes IDs (wNNNN) pointent vers d'autres mots. */
function _spanIdsMatchPassage(spanIds, passage) {
  var words2 = spanIds.map(function(sid) {
    var w = wordById[sid];
    return w ? w.txt.replace(/[\u00A0\u202F\u2009]/g, ' ') : null;
  });
  if (words2.indexOf(null) >= 0) return false;
  var rebuilt = _matchNormalize(words2.join(' '));
  var pNorm = _matchNormalize(passage);
  if (rebuilt === pNorm) return true;
  // Tolérance : comparer sans espaces/ponctuation pour absorber les petites différences
  // de tokenisation, mais rejeter si la correspondance est manifestement mauvaise.
  var strip = function(s){ return s.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase(); };
  var a = strip(rebuilt), b = strip(pNorm);
  if (!a.length || !b.length) return false;
  if (a === b) return true;
  // Si l'un contient l'autre presque entièrement (différence de bordure de mot), accepter
  var shorter = a.length < b.length ? a : b;
  var longer  = a.length < b.length ? b : a;
  if (longer.indexOf(shorter) >= 0 && shorter.length / longer.length > 0.85) return true;
  return false;
}

/* Version multi-segments : gère les passages "seg1 / seg2" créés par
   les annotations multi-passages. Compare uniquement les mots des spanIds
   (sans les séparateurs " / " synthétiques) contre le passage nettoyé. */
function _spanIdsMatchPassageMulti(spanIds, passage) {
  if (_spanIdsMatchPassage(spanIds, passage)) return true;
  if (passage.indexOf(' / ') < 0) return false;
  var passageStripped = passage.split(' / ').join(' ');
  return _spanIdsMatchPassage(spanIds, passageStripped);
}

function _buildMatchStructures() {
  // Reconstruit le texte brut depuis les mots, en normalisant les NBSP
  // pour que la recherche de passage fonctionne indépendamment des espaces insécables
  var rawText = words.map(function(w){
    return w.txt.replace(/[\u00A0\u202F\u2009]/g, ' ');
  }).join(' ');

  var normChars = [], normToRaw = [], prevSpace = false;
  for (var i = 0; i < rawText.length; i++) {
    var c = rawText[i];
    if (c === '\r' || c === '\n' || c === '\t') c = ' ';
    if (c === '\u2018' || c === '\u2019') c = "'";
    if (c === '\u201C' || c === '\u201D') c = '"';
    if (c === '\u2026') { c = '.'; } // simplifié
    if (c === '\u2013' || c === '\u2014') c = '-'; // tirets → tiret simple, aligné avec _matchNormalize
    if (c === ' ') {
      if (!prevSpace) { normChars.push(' '); normToRaw.push(i); prevSpace = true; }
    } else {
      normChars.push(c); normToRaw.push(i); prevSpace = false;
    }
  }
  var textNorm = normChars.join('');

  // charToWord[rawCharPos] = wordIndex
  var charToWord = new Array(rawText.length).fill(-1);
  var pos = 0;
  words.forEach(function(w, wi) {
    // each word is separated by a single space in rawText
    for (var j = 0; j < w.txt.length; j++) charToWord[pos + j] = wi;
    pos += w.txt.length + 1; // +1 for the space
  });

  return { textNorm: textNorm, normToRaw: normToRaw, charToWord: charToWord };
}

function _findPassageSpanIds(passage, occurrence, structs) {
  var pNorm = _matchNormalize(passage);
  var textNorm = structs.textNorm;
  var normToRaw = structs.normToRaw;
  var charToWord = structs.charToWord;

  var count = 0, searchFrom = 0;
  while (true) {
    var found = textNorm.indexOf(pNorm, searchFrom);
    if (found === -1) return [];
    if (count === occurrence) {
      // trouver le dernier char non-espace du passage
      var endIdx = found + pNorm.length - 1;
      while (endIdx > found && textNorm[endIdx] === ' ') endIdx--;
      var rawStart = normToRaw[found];
      var rawEnd   = normToRaw[endIdx];
      var wiStart  = charToWord[rawStart];
      var wiEnd    = charToWord[rawEnd];
      if (wiStart === -1 || wiEnd === -1) return [];
      var ids = [];
      for (var k = wiStart; k <= wiEnd; k++) ids.push('w' + k);
      return ids;
    }
    count++; searchFrom = found + 1;
  }
}

/* Recherche un passage multi-segments ("seg1 / seg2 / seg3") en cherchant
   chaque segment séparément dans le texte (le séparateur " / " est une
   construction du JSON, il n'existe pas tel quel dans le document).
   Retourne un tableau de spanIds concaténés (avec les "trous" naturels
   entre segments), ou [] si un seul segment est introuvable. */
function _findMultiSegmentSpanIds(passage, occurrenceCounter, structs) {
  var segments = passage.split(' / ').map(function(s){ return s.trim(); }).filter(Boolean);
  if (!segments.length) return [];
  var allIds = [];
  for (var i = 0; i < segments.length; i++) {
    var seg = segments[i];
    var key = 'SEG::' + _matchNormalize(seg);
    var occ = occurrenceCounter[key] || 0;
    occurrenceCounter[key] = occ + 1;
    var ids = _findPassageSpanIds(seg, occ, structs);
    if (!ids.length) return []; // un segment manquant invalide tout le passage
    allIds = allIds.concat(ids);
  }
  return allIds;
}

// ── SETUP ──

// ── TOAST — notification non-bloquante (post-it discret en bas de l'écran),
//   remplace les alert() natifs pour les retours d'import/export : un
//   alert() bloque l'interface entière et tranche avec l'esthétique du
//   reste de l'outil, pour un message qui n'a rien d'une urgence. ──
var _toastTimer = null;
function showToast(message, opts) {
  opts = opts || {};
  var el = document.getElementById('margin-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'margin-toast';
    el.className = 'margin-toast';
    var body = document.createElement('div');
    body.className = 'margin-toast-body';
    var close = document.createElement('div');
    close.className = 'margin-toast-close';
    close.textContent = '\u00d7';
    close.setAttribute('aria-label', 'fermer');
    close.onclick = function() { hideToast(); };
    el.appendChild(body);
    el.appendChild(close);
    document.body.appendChild(el);
  }
  el.querySelector('.margin-toast-body').textContent = message;
  el.classList.toggle('margin-toast-error', !!opts.error);
  // Forcer un reflow avant d'ajouter la classe visible si le toast était
  // déjà affiché juste avant (re-déclenche proprement la transition).
  el.classList.remove('margin-toast-visible');
  void el.offsetWidth;
  el.classList.add('margin-toast-visible');
  if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; }
  var duration = opts.duration !== undefined ? opts.duration : 4200;
  if (duration > 0) _toastTimer = setTimeout(hideToast, duration);
}
function hideToast() {
  var el = document.getElementById('margin-toast');
  if (el) el.classList.remove('margin-toast-visible');
  if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; }
}

var _pendingJsonData = null;

function handleJsonImport(input) {
  var f = input.files[0]; if (!f) return;
  var r = new FileReader();
  r.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);
      _pendingJsonData = data;
      if (data.profiles) {
        // Pre-populate profiles array directly (no DOM inputs needed anymore)
        profiles = data.profiles.map(function(p, i) {
          return {
            name: p.name || ('lecteur.ice ' + (i + 1)),
            color: p.color || PALETTE[i % PALETTE.length],
            colorBold: p.colorBold || PALETTE_BOLD[i % PALETTE_BOLD.length]
          };
        });
      }
    } catch(err) { alert('Erreur de lecture du fichier JSON'); }
  };
  r.readAsText(f, 'UTF-8'); input.value = '';
}

function injectJsonAnnotations() {
  if (!_pendingJsonData || !_pendingJsonData.annotations) return;
  var data = _pendingJsonData;

  // ── Restaurer les thèmes ──
  if (data.themes && data.themes.length) {
    themes = data.themes.map(function(t, i) {
      return {
        id: t.id || ('th' + (++themeIdCtr)),
        name: t.name || ('Thème ' + (i + 1)),
        color: t.color || _themeColor(i),
        creatorProfileIdx: t.creatorProfileIdx || 0
      };
    });
    themes.forEach(function(t) {
      var n = parseInt(t.id.replace('th',''));
      if (!isNaN(n) && n > themeIdCtr) themeIdCtr = n;
    });
  }

  // ── Restaurer les profils ──
  if (data.profiles) {
    data.profiles.forEach(function(p, i) {
      if (profiles[i]) profiles[i].color = p.color || profiles[i].color;
    });
  }

  var matched = 0;
  var unmatched = 0;
  var structs = null;
  var occurrenceCounter = {};
  data.annotations.forEach(function(a) {
    var passage = (a.passage || a.selText || '').trim();
    if (!passage) return;
    var spanIds;
    var aSpanIds = a.spanIds;
    // Utiliser les spanIds directement seulement s'ils correspondent vraiment
    // au passage dans CE document — sinon (autre version du texte, autre
    // tokenisation), ça place l'annotation au mauvais endroit en silence.
    if (aSpanIds && aSpanIds.length && wordById[aSpanIds[0]] && _spanIdsMatchPassageMulti(aSpanIds, passage)) {
      spanIds = aSpanIds;
    } else {
      if (!structs) structs = _buildMatchStructures();
      if (passage.indexOf(' / ') >= 0) {
        spanIds = _findMultiSegmentSpanIds(passage, occurrenceCounter, structs);
      } else {
        var key = _matchNormalize(passage);
        var occ = occurrenceCounter[key] || 0;
        occurrenceCounter[key] = occ + 1;
        spanIds = _findPassageSpanIds(passage, occ, structs);
      }
    }
    if (!spanIds || !spanIds.length) { unmatched++; return; }
    annotIdCtr++;
    var annot = {
      id: 'a' + annotIdCtr,
      selText: passage,
      note: a.note || '',
      spanIds: spanIds,
      trace: a.trace || 'evidence',
      dialogue: !!(a.dialogue),
      posture: a.posture !== undefined ? parseInt(a.posture) : 50,
      profile: a.profile !== undefined ? parseInt(a.profile) : currentProfile,
      themeId: a.themeId || null,
      linked: a.linked || []
    };
    annotations.push(annot);
    spanIds.forEach(function(sid) { var w = wordById[sid]; if (w) w.el.classList.add('annotated'); });
    matched++;
  });

  // ── Restaurer les pensées flottantes ──
  // On réutilise l'ancre mot-à-mot (anchorId) si elle existe et que le mot
  // correspondant existe bien dans CE document : la position se recalcule
  // alors exactement contre ce mot, comme pour une pensée jamais déplacée.
  // Le y brut (pixels absolus au moment de l'export) n'est gardé qu'en
  // secours pour les anciens fichiers sans anchorId, ou si le document a
  // changé entre-temps — il sert alors de point de départ à la recherche
  // du mot le plus proche, mais peut diverger si la mise en page diffère.
  if (data.floatingThoughts && data.floatingThoughts.length) {
    data.floatingThoughts.forEach(function(t) {
      var validAnchor = t.anchorId && wordById[t.anchorId] ? t.anchorId : undefined;
      floatingThoughts.push({
        id: 'ft' + Date.now() + Math.random(),
        text: t.text || '',
        posture: t.posture !== undefined ? parseInt(t.posture) : 50,
        dialogue: !!(t.dialogue),
        profile: t.profile !== undefined ? parseInt(t.profile) : 0,
        y: t.y || 0,
        anchorId: validAnchor,
        anchorOffset: validAnchor ? (t.anchorOffset || 0) : undefined
      });
    });
  }

  updateAnnotCount();
  _pendingJsonData = null;
  var msg = matched + ' annotations injectées sur ' + data.annotations.length + '.';
  if (unmatched > 0) {
    msg += '\n' + unmatched + ' passage(s) introuvable(s) dans ce texte ont été ignorés (texte différent de celui utilisé lors de l\'export, ou passage modifié).';
  }
  alert(msg);
  renderLiveMarginNotes();
}

function handleTxtImport(input) {
  var f = input.files[0]; if (!f) return;
  var r = new FileReader();
  r.onload = function(e) {
    document.getElementById('text-input').value = e.target.result;
    var name = f.name.replace(/\.txt$/i,'');
    document.getElementById('doc-title').value = name;
  };
  r.readAsText(f, 'UTF-8'); input.value = '';
}

function updateProfileNameInputs() {
  // Profile inputs are now managed in the menu postit during annotation.
  // This function is kept for compatibility but does nothing.
}

function goToProfiles() { startReading(); }
function goToNames() { startReading(); }

function startReading() {
  var txt = document.getElementById('text-input').value.trim(); if (!txt) return;

  // ── Normalisation typographique française (selon norme) ──
  txt = (function(t) {
    // 0. Normaliser fins de ligne Windows
    t = t.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 1. Apostrophes typographiques
    t = t.replace(/[\u0060\u00B4\u2018\u2019\u201A\u02BC]/g, '\u0027');

    // 2. Guillemets français « » avec espaces fines insécables à l'intérieur
    //    « espace fine insécable → contenu → espace fine insécable »
    t = t.replace(/"([^"]*)"/g, function(_, inner) {
      return '\u00AB\u202F' + inner.trim() + '\u202F\u00BB';
    });
    // Guillemets déjà présents : normaliser les espaces intérieures
    t = t.replace(/\u00AB[ \u00A0\u202F]*/g, '\u00AB\u202F');
    t = t.replace(/[ \u00A0\u202F]*\u00BB/g, '\u202F\u00BB');

    // 3. Points de suspension : ... → …
    t = t.replace(/\.{3}/g, '\u2026');

    // 4. Tirets
    //    Tiret cadratin/demi-cadratin en début de réplique → demi-cadratin + espace insécable
    t = t.replace(/^[\u2013\u2014][ \t]*/gm, '\u2013\u00A0');
    //    Double tiret → demi-cadratin
    t = t.replace(/([^\-])--([^\-])/g, '$1\u2013$2');
    //    Tirets incises en milieu de phrase : espace + — + espace → \u00A0—\u00A0
    //    (les deux espaces autour du tiret deviennent insécables)
    t = t.replace(/[ \u00A0](\u2013|\u2014)[ \u00A0]/g, '\u00A0$1\u00A0');

    // 5. Espaces insécables selon la norme typographique française :
    //    — Virgule : pas d'espace avant, espace sécable après → rien à corriger
    //    — Point : pas d'espace avant, espace sécable après → rien à corriger
    //    — Deux-points : espace insécable (\u00A0) avant, espace sécable après
    t = t.replace(/[ \u00A0\u202F]*:/g, '\u00A0:');
    //    — Point-virgule : espace fine insécable (\u202F) avant, espace sécable après
    t = t.replace(/[ \u00A0\u202F]*;/g, '\u202F;');
    //    — Point d'interrogation : espace fine insécable avant, espace sécable après
    t = t.replace(/[ \u00A0\u202F]*\?/g, '\u202F?');
    //    — Point d'exclamation : espace fine insécable avant, espace sécable après
    t = t.replace(/[ \u00A0\u202F]*!/g, '\u202F!');
    //    — Guillemet ouvrant « : espace sécable avant (pas de modification), espace fine insécable après
    //      → déjà géré au point 2
    //    — Guillemet fermant » : espace fine insécable avant (déjà géré), espace sécable après
    //    — Parenthèses : pas d'espace intérieure → supprimer espace éventuelle
    t = t.replace(/\( /g, '(');
    t = t.replace(/ \)/g, ')');
    //    — Trait d'union : pas d'espace → rien
    //    — Tiret (long/moyen) : espace sécable extérieur, insécable intérieur → déjà géré

    // 6. Majuscules accentuées (courantes dans les TXT bruts)
    var accents = {'A\u0300':'À','E\u0300':'È','E\u0301':'É','E\u0302':'Ê','U\u0300':'Ù'};
    Object.keys(accents).forEach(function(k){ t = t.split(k).join(accents[k]); });

    return t;
  })(txt);
  var title = document.getElementById('doc-title').value.trim() || 'Sans titre';
  var author = document.getElementById('doc-author').value.trim();
  docTitle = title + (author ? ' · ' + author : '');

  // Start with a single default profile if no profiles yet
  if (!profiles.length) {
    profiles = [{ name: 'lecteur.ice', color: PALETTE[0], colorBold: PALETTE_BOLD[0] }];
  }
  currentProfile = 0;
  if (typeof _updateScrollbarColor === 'function') _updateScrollbarColor();
  var tb=document.getElementById('tb-profiles');
  if(tb){tb.innerHTML='';profiles.forEach(function(p,i){var b=document.createElement('button');b.className='tb-profile-btn'+(i===0?' active':'');b.dataset.idx=i;b.textContent=p.name;b.onclick=(function(pi){return function(){switchProfile(pi);};})(i);tb.appendChild(b);});}
  var tbT=document.getElementById('tb-title');if(tbT)tbT.textContent=docTitle;
  // Populate reading title top-left
  var rtSharp = document.getElementById('rt-sharp-text');
  var rtBlurred = document.getElementById('rt-blurred-text');
  var rtAuthorSharp = document.getElementById('rt-author-sharp');
  var rtAuthorBlurred = document.getElementById('rt-author-blurred');
  var titleText = title.toUpperCase();
  var authorText = author ? '[ ' + author + ' ]' : '';
  if (rtSharp) rtSharp.textContent = titleText;
  if (rtBlurred) rtBlurred.textContent = titleText;
  if (rtAuthorSharp) rtAuthorSharp.textContent = authorText;
  if (rtAuthorBlurred) rtAuthorBlurred.textContent = authorText;
  document.getElementById('landing').classList.add('hidden');
  buildWords(txt);
  showPhase('lecture');
  if (_pendingJsonData) setTimeout(injectJsonAnnotations, 200);
}
function showPhase(name) {
  ['lecture','galerie'].forEach(function(p) {
    var el = document.getElementById('phase-'+p);
    if (el) el.classList.add('hidden');
  });
  var el = document.getElementById('phase-'+name);
  if (el) el.classList.remove('hidden');
  currentPhase = name;
  if (name === 'galerie') {
    document.getElementById('gal-title').textContent = docTitle;
    activeProfiles = [];
    setTimeout(function() { buildProfileFilters(); buildGalleryHTML(); }, 50);
  }
  if (name === 'lecture') {
    var rz = document.getElementById('reading-zone');
    if (rz && !rz._marginScrollBound) {
      rz._marginScrollBound = true;
      rz.addEventListener('scroll', function() {
        scheduleOverlayReposition();
      });
    }
    if (typeof _activeThemeFilter !== 'undefined' && _activeThemeFilter) {
      setTimeout(function() { renderThemeHighlights(); showThemeBanner(); }, 60);
    }
  }

}
function startGallery() {
  currentIntensity = 1;
  isNeutral = false;
  showPhase('galerie');
}

// Init setup — créer le champ profil 1 par défaut
updateProfileNameInputs();

// ── NOTES EN MARGE TEMPS RÉEL ──
function renderLiveMarginNotes() {
  var mc = document.getElementById('margin-col');
  if (!mc) return;
  mc.querySelectorAll('.live-margin-note, .annot-bracket-margin').forEach(function(e){ e.remove(); });
  if (hideAnnotations) return;

  var rz = document.getElementById('reading-zone');
  if (!rz) return;
  var rzRect  = rz.getBoundingClientRect();
  var scrollT = rz.scrollTop;

  var notesToPlace = [];
  // Cache rects for all needed words in one pass (avoids interleaved layout/read)
  var neededWords = {};
  annotations.forEach(function(a) {
    if (!a.note || !a.note.trim() || a.dialogue) return;
    if ((activeProfiles.length > 0 && activeProfiles.indexOf(parseInt(a.profile)) < 0) || !_postureMatch(a) || !_traceMatch(a)) return;
    neededWords[a.spanIds[0]] = true;
    neededWords[a.spanIds[a.spanIds.length - 1]] = true;
  });
  var rectCache = {};
  Object.keys(neededWords).forEach(function(sid) {
    var w = wordById[sid];
    if (w) rectCache[sid] = w.el.getBoundingClientRect();
  });

  annotations.forEach(function(a) {
    if (!a.note || !a.note.trim()) return;
    if (a.dialogue) return;
    if ((activeProfiles.length > 0 && activeProfiles.indexOf(parseInt(a.profile)) < 0) || !_postureMatch(a) || !_traceMatch(a)) return;
    var firstW = wordById[a.spanIds[0]];
    var lastW  = wordById[a.spanIds[a.spanIds.length - 1]];
    if (!firstW) {
      console.warn('[renderLiveMarginNotes] mot introuvable pour l\'annotation ' + a.id + ' (spanIds[0]=' + a.spanIds[0] + ') — note de marge ignorée.');
      return;
    }
    var rFirst = rectCache[a.spanIds[0]] || firstW.el.getBoundingClientRect();
    var rLast  = lastW ? (rectCache[a.spanIds[a.spanIds.length - 1]] || lastW.el.getBoundingClientRect()) : rFirst;
    var midPx = ((rFirst.top + rFirst.bottom) / 2 + (rLast.top + rLast.bottom) / 2) / 2;
    var topPx = midPx - rzRect.top + scrollT;
    var col    = pcolor(a.profile, true);
    var post   = (a.posture != null ? a.posture : 50) / 100;
    var fontSz  = Math.round(Math.min(32, Math.max(18, 26 - a.note.length * 0.015)));
    var srff    = Math.round(post * 100); // 0=analytique (sans-serif), 100=personnel (serif)
    notesToPlace.push({ kind: 'note', topIdeal: topPx, col: col, fontSize: fontSz,
      srff: srff, text: _frenchSpacing(a.note), annotId: a.id });
  });

  // Pensées flottantes — injectées dans le même pipeline de placement que
  // les notes d'annotation (au lieu d'être posées brutalement à leur y
  // d'origine) pour qu'elles évitent les collisions, entre elles ET avec
  // les notes de marge, exactement comme renderLiveMarginNotes le fait
  // déjà pour les notes — sinon rien n'empêchait deux pensées/notes
  // proches de s'afficher l'une sur l'autre.
  floatingThoughts.forEach(function(t) {
    // Mêmes filtres que pour les notes d'annotation (profil / posture /
    // trace) — jusqu'ici les pensées flottantes n'étaient jamais filtrées
    // du tout et s'affichaient donc dans la marge quel que soit le filtre
    // actif (ex. analytique/personnel), y compris les dialogues.
    if ((activeProfiles.length > 0 && activeProfiles.indexOf(parseInt(t.profile)) < 0) || !_postureMatchThought(t) || !_traceMatchThought(t)) return;
    // Ancrage au mot le plus proche — une pensée flottante n'avait
    // jusqu'ici qu'un y en pixels absolus figé à la création, sans aucun
    // lien avec le texte. Dès que la page reflow (resize, import, note
    // qui change la taille d'un mot voisin...), ce y devient faux et peut
    // coïncider par pur hasard avec la position — elle correctement
    // recalculée — d'une autre note, d'où les superpositions illisibles
    // signalées. On calcule l'ancre une seule fois (à la création ou,
    // pour les pensées déjà existantes, au premier rendu suivant ce
    // correctif) et on la mémorise sur l'objet ; ensuite la position se
    // recalcule chaque fois à partir du mot, comme pour les notes.
    if (t.anchorId === undefined && words && words.length > 0) {
      var nid = _nearestWordIdAtY(t.y, rzRect, scrollT);
      t.anchorId = nid || null;
      t.anchorOffset = 0;
      if (nid && wordById[nid]) {
        var rA = wordById[nid].el.getBoundingClientRect();
        t.anchorOffset = t.y - ((rA.top + rA.bottom) / 2 - rzRect.top + scrollT);
      }
    }
    var ty = t.y;
    if (t.anchorId && wordById[t.anchorId]) {
      var rAnchor = wordById[t.anchorId].el.getBoundingClientRect();
      ty = (rAnchor.top + rAnchor.bottom) / 2 - rzRect.top + scrollT + (t.anchorOffset || 0);
    }
    var tcol = monochromeReading ? NEUTRAL_COL_BOLD : ((profiles[t.profile] && profiles[t.profile].colorBold) || (profiles[t.profile] && profiles[t.profile].color) || '#0C0C0A');
    var tpost = (t.posture != null ? t.posture : 50) / 100;
    var noteLen   = t.text.length;
    var tfontSize = Math.round(Math.min(32, Math.max(20, 26 - noteLen * 0.018)));
    var isDialogue = !!(t.dialogue);
    var tSRFF = Math.round(tpost * 100);
    var tfvs = isDialogue
      ? '"wght" 700, "wdth" 75, "SRFF" 25, "slnt" 0'
      : '"wght" 400, "SRFF" ' + tSRFF;
    var displayText  = isDialogue ? ('[' + _frenchSpacing(t.text) + ']') : _frenchSpacing(t.text);
    var fontSizePx   = isDialogue ? Math.round(tfontSize * 1.15) : tfontSize;
    notesToPlace.push({ kind: 'thought', topIdeal: ty, col: tcol, fontSize: fontSizePx,
      text: displayText, id: t.id, dialogue: isDialogue, fvs: tfvs });
  });

  notesToPlace.sort(function(a, b){ return a.topIdeal - b.topIdeal; });

  var MIN_GAP = 20;
  function stableCol(id) {
    var s = String(id), h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
    return h % 3;
  }

  var mcW = mc.offsetWidth || 600;
  var padL = 10, padR = 18, gap = 8;
  var colW = Math.floor((mcW - padL - padR - gap * 2) / 3);
  var colDefs = [
    { left: padL,                      width: colW },
    { left: padL + colW + gap,         width: colW },
    { left: padL + colW * 2 + gap * 2, width: colW },
  ];

  // Seuil pour passer à 2 colonnes — note longue > 70 caractères
  var LONG_NOTE = 70;

  // Mesure réelle de la hauteur de chaque note/pensée — remplace l'ancienne
  // estimation par nombre de caractères, qui divergeait du rendu réel à
  // certaines largeurs de colonne (le retour à la ligne par mot ne suit
  // pas une moyenne de caractères) et pouvait sous-estimer l'espace
  // nécessaire, provoquant des superpositions illisibles malgré l'anti-
  // collision. On mesure une fois hors écran, avec exactement le même
  // CSS que le rendu final, par lot (tous les append puis toutes les
  // lectures) pour ne forcer qu'un seul reflow au lieu d'un par note.
  var _measureDivs = [];
  notesToPlace.forEach(function(n) {
    n.isLong = n.text.length > LONG_NOTE;
    n.boxWidth = n.isLong ? (colW * 2 + gap) : colW;
    var md = document.createElement('div');
    md.style.cssText = [
      'position:absolute', 'visibility:hidden', 'pointer-events:none',
      'top:0', 'left:-99999px',
      'width:' + n.boxWidth + 'px',
      'font-size:' + n.fontSize + 'px',
      'font-family: Arizona, ArizonaSerif, Georgia, serif',
      'line-height:1.05', 'text-align:center', 'word-break:break-word',
      n.dialogue ? 'letter-spacing:-0.02em' : 'letter-spacing:normal',
    ].join(';');
    md.textContent = n.text;
    mc.appendChild(md);
    _measureDivs.push(md);
  });
  notesToPlace.forEach(function(n, i) {
    n.h = _measureDivs[i].offsetHeight || Math.round(n.fontSize * 1.3);
  });
  _measureDivs.forEach(function(md) { mc.removeChild(md); });

  // Helper: find next available Y (centre, car le rendu utilise
  // translateY(-50%)) pour une note de hauteur newH dans un ensemble de
  // colonnes, après un Y idéal donné. Il ne suffit pas de renvoyer le
  // bord bas de la note précédente + marge : comme la nouvelle note est
  // elle aussi positionnée par son centre, il faut décaler ce point d'au
  // moins newH/2 de plus, sinon la nouvelle note remonte dans la
  // précédente dès qu'elle est plus haute que la marge (exactement ce
  // qui provoquait les superpositions illisibles signalées, d'autant
  // plus visibles que la note est grande — donc sur colonnes étroites).
  function colNextY(spanCols, idealY, newH) {
    var y = idealY;
    spanCols.forEach(function(sc) {
      var cp = columnPlaced[sc];
      for (var i = cp.length - 1; i >= 0; i--) {
        var bottom = cp[i].top + cp[i].h / 2 + MIN_GAP + newH / 2;
        if (y < bottom) y = bottom;
        else break;
      }
    });
    return y;
  }

  var columnPlaced = [[], [], []], placed = [];
  // Compteurs d'usage pour équilibrer activement les choix à égalité —
  // un simple hash par note pouvait, par malchance, faire retomber
  // plusieurs notes longues consécutives (même passage très annoté) du
  // même côté ; en suivant l'usage réel on force l'alternance.
  var leftSpanCount = 0, rightSpanCount = 0;
  var colUsageCount = [0, 0, 0];

  notesToPlace.forEach(function(n) {
    try {
    var isLong = n.isLong;
    var ci = stableCol(n.annotId || n.id || n.text);
    var col, spanCols;

    if (isLong) {
      // Long note: try both 2-col spans, pick the one with least displacement
      var opt0 = { startCol: 0, spanCols: [0, 1] };
      var opt1 = { startCol: 1, spanCols: [1, 2] };
      var y0 = colNextY(opt0.spanCols, n.topIdeal, n.h);
      var y1 = colNextY(opt1.spanCols, n.topIdeal, n.h);
      var d0 = Math.abs(y0 - n.topIdeal), d1 = Math.abs(y1 - n.topIdeal);
      var chosen;
      if (d0 !== d1) {
        chosen = (d0 < d1) ? opt0 : opt1;
      } else {
        // Égalité — c'est le cas le plus fréquent (aucune collision réelle
        // ne force un côté plutôt que l'autre) : départager par l'usage
        // courant plutôt que par un hash, pour garantir une vraie
        // alternance même sur une suite de notes longues qui se
        // chevauchent toutes (sinon rien n'empêchait qu'elles tombent
        // toutes du même côté par malchance, laissant la colonne 2 vide).
        chosen = (leftSpanCount <= rightSpanCount) ? opt0 : opt1;
      }
      if (chosen === opt0) leftSpanCount++; else rightSpanCount++;
      spanCols = chosen.spanCols;
      col = {
        left: colDefs[chosen.startCol].left,
        width: colDefs[chosen.startCol].width + gap + colDefs[chosen.startCol + 1].width
      };
    } else {
      // Placement court : parmi les colonnes libres à la même Y (déplacement ≤ 4px),
      // choisir la colonne stable-hash pour distribuer. Si aucune n'est libre à cette Y,
      // choisir celle avec le moins de déplacement (fallback : descendre dans la moins occupée).
      var SNAP = 4; // tolérance px pour "même hauteur"
      var freeCols = [];
      var bestDisp = Infinity, bestC = ci;
      for (var c = 0; c < 3; c++) {
        var candidateY = colNextY([c], n.topIdeal, n.h);
        var disp = Math.abs(candidateY - n.topIdeal);
        if (disp <= SNAP) freeCols.push(c);
        if (disp < bestDisp || (disp === bestDisp && c === ci)) { bestDisp = disp; bestC = c; }
      }
      // Si plusieurs colonnes libres à la même Y : préférer la hash-stable
      // si elle en fait partie, sinon prendre celle la moins utilisée
      // jusqu'ici plutôt que systématiquement la plus à gauche.
      if (freeCols.length > 0) {
        if (freeCols.indexOf(ci) >= 0) {
          bestC = ci;
        } else {
          bestC = freeCols[0];
          freeCols.forEach(function(fc) { if (colUsageCount[fc] < colUsageCount[bestC]) bestC = fc; });
        }
      }
      colUsageCount[bestC]++;
      spanCols = [bestC];
      col = colDefs[bestC];
    }

    n.spanCols = spanCols;
    // n.h déjà mesuré réellement (voir passe de mesure plus haut) —
    // le div est centré via translateY(-50%) : zone occupée = [top-h/2, top+h/2].
    var top = colNextY(spanCols, n.topIdeal, n.h);
    n.top = top; n.colDef = col;
    spanCols.forEach(function(sc) { columnPlaced[sc].push(n); });
    placed.push(n);
    } catch (err) {
      console.error('[renderLiveMarginNotes] échec du placement d\'une note (' + (n.annotId || n.id || '?') + '), ignorée sans bloquer les autres :', err);
    }
  });

  var filetX = mcW - padR;

  placed.forEach(function(n) {
    try {
    if (n.kind === 'thought') {
      var tdiv = document.createElement('div');
      tdiv.className = 'floating-thought live-margin-note';
      tdiv.dataset.id = n.id;
      tdiv.textContent = n.text;
      tdiv.style.cssText = [
        'position:absolute', 'top:' + n.top + 'px', 'transform:translateY(-50%)',
        'left:' + n.colDef.left + 'px', 'right:auto', 'width:' + n.colDef.width + 'px',
        'color:' + n.col, 'font-size:' + n.fontSize + 'px',
        'font-family: Arizona, ArizonaSerif, Georgia, serif',
        'font-variation-settings:' + n.fvs,
        n.dialogue ? 'letter-spacing:-0.02em' : 'letter-spacing:normal',
        'font-style:normal',
        'line-height:1.05', 'text-align:center', 'mix-blend-mode:multiply',
        'opacity:0.85', 'word-break:break-word',
        'cursor:pointer', 'pointer-events:auto',
        'transition:opacity 0.15s, filter 0.2s, text-shadow 0.2s',
      ].join(';');
      tdiv.addEventListener('mouseenter', function() {
        tdiv.style.filter = 'drop-shadow(0 2px 8px rgba(0,0,0,0.18))';
        tdiv.style.textShadow = '0 0 20px rgba(255,255,255,0.9), 0 0 8px rgba(255,255,255,0.7)';
      });
      tdiv.addEventListener('mouseleave', function() {
        tdiv.style.filter = '';
        tdiv.style.textShadow = '';
      });
      tdiv.addEventListener('click', function(e) {
        e.stopPropagation();
        openEditThought(n.id);
      });
      mc.appendChild(tdiv);
      return;
    }

    var div = document.createElement('div');
    div.className = 'live-margin-note';
    if (n.annotId) div.dataset.annotId = n.annotId;
    div.textContent = n.text;
    var fvs = '"wght" 400, "SRFF" ' + (n.srff !== undefined ? n.srff : 50);
    div.style.cssText = [
      'position:absolute',
      'top:'        + n.top + 'px',
      'transform:translateY(-50%)',
      'left:'       + n.colDef.left + 'px',
      'right:auto',
      'width:'      + n.colDef.width + 'px',
      'color:'      + n.col,
      'font-size:'  + n.fontSize + 'px',
      'font-family: Arizona, ArizonaSerif, Georgia, serif',
      'font-variation-settings:' + fvs,
      'line-height:1.05',
      'text-align:center',
      'cursor:pointer',
      'pointer-events:auto',
      'word-break:break-word',
      'transition:opacity 0.15s, transform 0.3s cubic-bezier(0.22,1,0.36,1), filter 0.3s ease, text-shadow 0.3s ease',
      'transform-origin:center center',
    ].join(';');
    div.addEventListener('mouseenter', function() {
      div.style.transform = 'translateY(-50%) scale(1.06)';
      div.style.filter = 'drop-shadow(0 2px 8px rgba(0,0,0,0.18))';
      div.style.textShadow = '0 0 20px rgba(255,255,255,0.9), 0 0 8px rgba(255,255,255,0.7)';
      div.style.zIndex = '30';
    });
    div.addEventListener('mouseleave', function() {
      div.style.transform = 'translateY(-50%) scale(1)';
      div.style.filter = '';
      div.style.textShadow = '';
      div.style.zIndex = '';
    });
    div.addEventListener('click', function(e) {
      e.stopPropagation();
      if (n.annotId) openEditPopup(n.annotId);
    });
    // Hover → mettre en valeur le passage annoté
    if (n.annotId) {
      var _noteT = null;
      function _applyGlow() {
        if (_noteT) clearTimeout(_noteT);
        var annot = annotations.find(function(x){ return x.id === n.annotId; });
        if (!annot) return;
        // En mode filtre thème, ne réagir qu'aux annotations du thème actif
        if (_activeThemeFilter && annot.themeId !== _activeThemeFilter) return;
        var bracket = mc.querySelector('svg[data-annot-id="' + n.annotId + '"]');
        if (bracket) bracket.style.opacity = '1';
        var posture = (annot.posture != null ? annot.posture : 50);
        annot.spanIds.forEach(function(sid) {
          var w = wordById[sid];
          if (w) {
            w.el.style.textShadow = '0 0 12px ' + n.col + ', 0 0 4px ' + n.col;
          }
        });
      }
      function _clearGlow() {
        if (_noteT) clearTimeout(_noteT);
        _noteT = setTimeout(function() {
          var annot2 = annotations.find(function(x){ return x.id === n.annotId; });
          if (!annot2) return;
          var bracket2 = mc.querySelector('svg[data-annot-id="' + n.annotId + '"]:not(.crochet-bracket)');
          if (bracket2) bracket2.style.opacity = '0';
          annot2.spanIds.forEach(function(sid) {
            var w = wordById[sid];
            if (w) {
              w.el.style.textShadow = '';
            }
          });
        }, 2000);
      }
      div.addEventListener('mouseenter', _applyGlow);
      div.addEventListener('mouseleave', _clearGlow);
      // NOTE: no hover on passage spans — highlight only triggers from the margin note
    }
    mc.appendChild(div);

    if (!n.annotId) return;
    var annot = annotations.filter(function(x){ return x.id === n.annotId; })[0];
    if (!annot) return;
    // Pas de bracket SVG depuis la boucle placed — pour 'crochet' il est
    // dessiné dans la section dédiée ci-dessous ; pour les autres traces
    // on supprime les crochets (le shadow de survol suffit).
    return;
    var strokeW = 1.5;
    var noteRight = n.colDef.left + n.colDef.width + 6;
    var armLen = Math.max(8, filetX - noteRight);
    var svgW = armLen + strokeW * 2;
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', svgW); svg.setAttribute('height', height);
    svg.setAttribute('viewBox', '0 0 ' + svgW + ' ' + height);
    svg.setAttribute('class', 'annot-bracket-margin');
    svg.setAttribute('data-annot-id', n.annotId);
    svg.style.cssText = 'position:absolute;left:' + noteRight + 'px;top:' + topDoc + 'px;overflow:visible;pointer-events:none;z-index:4;opacity:0;transition:opacity 0.15s;';
    var bx = strokeW/2, ax = bx + armLen, y0 = strokeW/2, y1 = height - strokeW/2;
    var pth = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pth.setAttribute('d', 'M'+ax+','+y0+' L'+bx+','+y0+' L'+bx+','+y1+' L'+ax+','+y1);
    pth.setAttribute('fill', 'none'); pth.setAttribute('stroke', n.col);
    pth.setAttribute('stroke-width', strokeW); pth.setAttribute('stroke-linecap', 'square');
    svg.appendChild(pth); mc.appendChild(svg);
    } catch (err) {
      console.error('[renderLiveMarginNotes] échec du rendu d\'une note (' + (n.annotId || n.id || '?') + '), ignorée sans bloquer les autres :', err);
    }
  });

  // ── Crochets verticaux — même système de coordonnées que les brackets existants ──
  // X = filetX (bord droit du margin-col), Y = rFw.top - rzRect.top + scrollT
  annotations.forEach(function(a) {
    if (a.trace !== 'crochet') return;
    if ((activeProfiles.length > 0 && activeProfiles.indexOf(parseInt(a.profile)) < 0)) return;
    if (!_traceMatch(a)) return;
    if (!_postureMatch(a)) return;
    var fw = wordById[a.spanIds[0]];
    var lw = wordById[a.spanIds[a.spanIds.length - 1]];
    if (!fw || !lw) return;
    var rFw = fw.el.getBoundingClientRect();
    var rLw = lw.el.getBoundingClientRect();
    // Exactement comme les brackets existants : rFw.top - rzRect.top + scrollT
    var yTop    = rFw.top    - rzRect.top + scrollT - 2;
    var yBottom = rLw.bottom - rzRect.top + scrollT + 2;
    var height  = Math.max(yBottom - yTop, 10);
    var col = pcolor(a.profile, true);

    var svgW = 12;
    // X : filetX est le bord droit du margin-col — le crochet [ est positionné ici, ouvert vers le texte
    var leftX = filetX;

    // Trouver le bord droit de la colonne de note associée pour le hover
    var placedNote = placed.filter(function(pn){ return pn.annotId === a.id; })[0];
    var noteRightEdge = placedNote ? (placedNote.colDef.left + placedNote.colDef.width) : null;

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', svgW);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', '0 0 ' + svgW + ' ' + height);
    svg.setAttribute('class', 'annot-bracket-margin crochet-bracket');
    svg.setAttribute('data-annot-id', a.id);
    svg.dataset.yTop = yTop;
    svg.dataset.yBottom = yBottom;
    svg.dataset.leftX = leftX;
    svg.dataset.svgW = svgW;
    if (noteRightEdge !== null) svg.dataset.noteRightEdge = noteRightEdge;
    svg.style.cssText = 'position:absolute;left:' + leftX + 'px;top:' + yTop + 'px;overflow:visible;pointer-events:none;z-index:4;opacity:1;';

    // Trait vertical à gauche, bras courts pointant vers la droite (vers le texte)
    var pth = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    var vx = 2; // trait vertical à gauche
    var armLen = 5;
    var d = 'M' + (vx+armLen) + ',2 L' + vx + ',2 L' + vx + ',' + (height-2) + ' L' + (vx+armLen) + ',' + (height-2);
    pth.setAttribute('d', d);
    pth.setAttribute('fill', 'none');
    pth.setAttribute('stroke', col);
    pth.setAttribute('stroke-width', '1.4');
    pth.setAttribute('stroke-linecap', 'round');
    pth.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(pth);
    mc.appendChild(svg);
  });

  // ── Hover sur les mots annotés crochet — bras s'étend horizontalement vers la note ──
  annotations.forEach(function(a) {
    if (a.trace !== 'crochet') return;
    var svgEl = mc.querySelector('.crochet-bracket[data-annot-id="' + a.id + '"]');
    if (!svgEl) return;
    var pthEl = svgEl.querySelector('path');
    if (!pthEl) return;
    var _crochetT = null;
    var _crochetHovered = false;

    function _drawCrochet(totalW, h) {
      // Trait vertical à droite, bras courts vers la gauche (vers la note) — forme ]
      var vx = totalW - 2;
      var armLen = 5;
      pthEl.setAttribute('d',
        'M'+(vx-armLen)+',2'+
        ' L'+vx+',2'+
        ' L'+vx+','+(h-2)+
        ' L'+(vx-armLen)+','+(h-2)
      );
    }

    function _setCrochetHover(on) {
      var origLeftX = parseFloat(svgEl.dataset.leftX);
      var origSvgW  = parseFloat(svgEl.dataset.svgW);
      var h = parseFloat(svgEl.getAttribute('height'));

      if (on && svgEl.dataset.noteRightEdge) {
        // Étendre le SVG vers la droite jusqu'au bord du texte
        var noteRight = parseFloat(svgEl.dataset.noteRightEdge);
        var newW = origLeftX + origSvgW - noteRight;
        var newLeft = noteRight;
        svgEl.style.left = newLeft + 'px';
        svgEl.setAttribute('width', newW);
        svgEl.setAttribute('viewBox', '0 0 ' + newW + ' ' + h);
        // Trait vertical à gauche, bras allongés vers la droite
        var vxE = 2;
        var armE = Math.max(8, newW - 4);
        pthEl.setAttribute('d',
          'M'+(vxE+armE)+',2 L'+vxE+',2 L'+vxE+','+(h-2)+' L'+(vxE+armE)+','+(h-2)
        );
        pthEl.setAttribute('stroke-width', '1.8');
      } else {
        // Revenir à la taille originale
        svgEl.style.left = origLeftX + 'px';
        svgEl.setAttribute('width', origSvgW);
        svgEl.setAttribute('viewBox', '0 0 ' + origSvgW + ' ' + h);
        var vxr = 2, armr = 5;
        pthEl.setAttribute('d', 'M'+(vxr+armr)+',2 L'+vxr+',2 L'+vxr+','+(h-2)+' L'+(vxr+armr)+','+(h-2));
        pthEl.setAttribute('stroke-width', '1.4');
      }
      svgEl.style.opacity = '1';
    }

    // Hover sur la NOTE EN MARGE (pas sur le texte)
    var noteDiv2 = mc.querySelector('.live-margin-note[data-annot-id="' + a.id + '"]');
    if (noteDiv2) {
      noteDiv2.addEventListener('mouseenter', function() {
        // En mode filtre thème, ne pas glow les annotations hors-thème
        if (_activeThemeFilter && a.themeId !== _activeThemeFilter) return;
        var col2 = pcolor(a.profile, true);
        a.spanIds.forEach(function(sid) {
          var w2 = wordById[sid]; if (!w2) return;
          w2.el.style.textShadow = '0 0 12px ' + col2 + ', 0 0 4px ' + col2;
        });
      });
      noteDiv2.addEventListener('mouseleave', function() {
        a.spanIds.forEach(function(sid) {
          var w2 = wordById[sid]; if (!w2) return;
          w2.el.style.textShadow = '';
        });
      });
    }
  });

  // Hover : listener sur reading-zone
  var rz2 = document.getElementById('reading-zone');
  if (mc._marginHoverHandler) rz2.removeEventListener('mousemove', mc._marginHoverHandler);
  if (mc._marginLeaveHandler) rz2.removeEventListener('mouseleave', mc._marginLeaveHandler);
  var _activeNote = null;
  function _clearHover() {
    if (!_activeNote) return;
    // Exclure les crochet-bracket (ils restent toujours visibles)
    var annot0 = annotations.filter(function(x){ return x.id === _activeNote.annotId; })[0];
    if (!annot0 || annot0.trace !== 'crochet') {
      var s = mc.querySelector('.annot-bracket-margin:not(.crochet-bracket)[data-annot-id="'+_activeNote.annotId+'"]');
      if (s) s.style.opacity = '0';
    }
    document.querySelectorAll('.hover-linked').forEach(function(el){ el.classList.remove('hover-linked'); el.style.removeProperty('text-shadow'); });
    _activeNote = null;
  }
  function _applyHover(n) {
    if (_activeNote === n) return;
    _clearHover(); _activeNote = n;
    var s = mc.querySelector('.annot-bracket-margin:not(.crochet-bracket)[data-annot-id="'+n.annotId+'"]');
    if (s) s.style.opacity = '1';
    var annot = annotations.filter(function(x){ return x.id === n.annotId; })[0]; if (!annot) return;
    var c = n.col.replace('#',''); if (c.length===3) c=c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
    var rv=parseInt(c.slice(0,2),16)||180, gv=parseInt(c.slice(2,4),16)||60, bv=parseInt(c.slice(4,6),16)||30;
    var glow='0 0 10px rgba('+rv+','+gv+','+bv+',0.6), 0 0 3px rgba('+rv+','+gv+','+bv+',0.4)';
    annot.spanIds.forEach(function(sid){ var w=wordById[sid]; if(!w) return; w.el.classList.add('hover-linked'); var ex=w.el.style.textShadow; w.el.style.textShadow=ex?ex+', '+glow:glow; });
  }
  var _placedRef = placed;
  mc._marginHoverHandler = function(e) {
    var mcRect = mc.getBoundingClientRect();
    if (e.clientX < mcRect.left || e.clientX > mcRect.right) { _clearHover(); return; }
    var scrollT2 = rz2.scrollTop;
    var cy = e.clientY - mcRect.top + scrollT2, cx = e.clientX - mcRect.left;
    var hit = null;
    for (var i=0; i<_placedRef.length; i++) {
      var n=_placedRef[i]; if (!n.annotId) continue;
      if (cy >= n.top - n.h/2 && cy <= n.top + n.h/2 && cx >= n.colDef.left && cx <= n.colDef.left+n.colDef.width) { hit=n; break; }
    }
    if (hit) _applyHover(hit); else _clearHover();
  };
  mc._marginLeaveHandler = function() { _clearHover(); };
  rz2.addEventListener('mousemove', mc._marginHoverHandler);
  rz2.addEventListener('mouseleave', mc._marginLeaveHandler);
  // Also attach directly to margin-col for more reliable hit detection
  if (mc._mcMoveHandler) mc.removeEventListener('mousemove', mc._mcMoveHandler);
  mc._mcMoveHandler = mc._marginHoverHandler;
  mc.addEventListener('mousemove', mc._mcMoveHandler);
}

// ── WORDS ──
function buildWords(txt) {
  var disp = document.getElementById('text-display');
  disp.innerHTML = ''; words = []; wordById = {};
  var idx = 0;
  txt.split(/\n\n+/).forEach(function(para) {
    if (!para.trim()) return;
    var p = document.createElement('p');
    // Splitter le paragraphe en lignes (sauts de ligne simples)
    var lines = para.trim().split('\n');
    lines.forEach(function(line, li) {
      // Splitter uniquement sur espaces normales — les \u00A0 et \u202F restent
      // collés au mot précédent, ce qui empêche le retour à la ligne entre eux
      var tokens = line.trim().split(' ');
      tokens.forEach(function(w, i, arr) {
        if (!w) return;
        var sp = document.createElement('span');
        sp.id = 'w'+idx; sp.dataset.idx = idx; sp.textContent = w;
        p.appendChild(sp);
        if (i < arr.length-1) p.appendChild(document.createTextNode(' '));
        words.push({el:sp, idx:idx, txt:w}); wordById['w'+idx] = words[words.length-1]; idx++;
      });
      // Ajouter un <br> après chaque ligne sauf la dernière du paragraphe
      if (li < lines.length - 1) p.appendChild(document.createElement('br'));
    });
    disp.appendChild(p);
  });
}

// ── SELECTION ──
var pendingSegments = [];
var _selSet = []; // tracks currently .sel words — avoids full-array scan
var isLinkingMode = false; // true = popup sur le côté, on sélectionne des passages à lier

document.addEventListener('mousedown', function(e) {
  if (currentPhase !== 'lecture') return;
  var td = document.getElementById('text-display');
  if (!td) return;
  var sp = e.target.closest('span[data-idx]');
  if (!sp || !td.contains(sp)) return;
  // Don't interfere with inputs inside postitss
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  e.preventDefault(); isDragging = true;
  selStart = parseInt(sp.dataset.idx); selEnd = selStart;
  if (typeof _captureSelecting !== 'undefined' && _captureSelecting) { highlightSel(); return; }
  if (!isLinkingMode) highlightSel();
});
document.addEventListener('mousemove', function(e) {
  if (!isDragging) return;
  var sp = e.target.closest('span[data-idx]');
  if (!sp) return;
  // Vérifier que le curseur est bien DANS le span verticalement (pas dans l'interligne)
  var rect = sp.getBoundingClientRect();
  if (e.clientY < rect.top || e.clientY > rect.bottom) return;
  selEnd = parseInt(sp.dataset.idx);
  highlightSel();
});
document.addEventListener('mouseup', function() {
  if (!isDragging) return; isDragging = false;
  var lo = Math.min(selStart, selEnd), hi = Math.max(selStart, selEnd);
  if (lo < 0) return;
  var newIds = []; for (var i = lo; i <= hi; i++) if (words[i]) newIds.push('w'+i);
  if (!newIds.length) return;

  if (typeof _captureSelecting !== 'undefined' && _captureSelecting) {
    onCaptureRangeSelected(lo, hi);
    return;
  }

  if (isLinkingMode) {
    // En mode liaison → ajouter le segment et mettre à jour l'indice visuel
    pendingSegments.push({lo:lo, hi:hi});
    rebuildPendingIds();
    highlightAllPending();
    updateLinkingBar();
    return;
  }

  // Si clic simple sur un mot annoté (lo==hi) → ouvrir l'édition
  if (lo === hi && words[lo] && words[lo].el.classList.contains('annotated')) {
    var clicked = annotations.find(function(a) {
      return a.spanIds.indexOf('w'+lo) >= 0 &&
        (activeProfiles.length === 0 || activeProfiles.indexOf(parseInt(a.profile)) >= 0);
    });
    if (clicked) {
      openEditPopup(clicked.id);
      // Ne pas vider pendingIds : openEditPopup les reconstruit depuis l'annotation
      clearSel();
      return;
    }
  }

  // Sélection normale → premier segment, ouvrir le popup
  pendingSegments = [{lo:lo, hi:hi}];
  rebuildPendingIds();
  openPopup();
});

function rebuildPendingIds() {
  var allIds = {};
  pendingSegments.forEach(function(seg) {
    for (var i = seg.lo; i <= seg.hi; i++) if (words[i]) allIds['w'+i] = true;
  });
  pendingIds = Object.keys(allIds).sort(function(a,b){return parseInt(a.slice(1))-parseInt(b.slice(1));});
}

function highlightSel() {
  var lo = Math.min(selStart, selEnd), hi = Math.max(selStart, selEnd);
  for (var ci = 0; ci < _selSet.length; ci++) {
    _selSet[ci].el.classList.remove('sel');
    _selSet[ci].el.classList.remove('sel-linked');
  }
  _selSet = [];
  for (var i = lo; i <= hi; i++) {
    if (!words[i]) continue;
    words[i].el.classList.add('sel');
    _selSet.push(words[i]);
  }
  pendingSegments.forEach(function(s) {
    for (var j = s.lo; j <= s.hi; j++) {
      if (!words[j] || (j >= lo && j <= hi)) continue;
      words[j].el.classList.add('sel');
      if (isLinkingMode) words[j].el.classList.add('sel-linked');
      _selSet.push(words[j]);
    }
  });
  drawSelOverlay();
}
function highlightAllPending() {
  for (var ci = 0; ci < _selSet.length; ci++) {
    _selSet[ci].el.classList.remove('sel');
    _selSet[ci].el.classList.remove('sel-linked');
  }
  _selSet = [];
  pendingSegments.forEach(function(s) {
    for (var i = s.lo; i <= s.hi; i++) {
      if (!words[i]) continue;
      words[i].el.classList.add('sel');
      if (isLinkingMode) words[i].el.classList.add('sel-linked');
      _selSet.push(words[i]);
    }
  });
  drawSelOverlay();
}

// Returns a semi-transparent version of the current profile color for selection highlight
function _getProfileSelColor(opacity) {
  var op = (opacity !== undefined) ? opacity : 0.28;
  var p = profiles[currentProfile];
  if (!p || !p.color) return 'rgba(253,207,90,'+op+')';
  var hex = p.color.replace('#','');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  var r = parseInt(hex.slice(0,2),16);
  var g = parseInt(hex.slice(2,4),16);
  var b = parseInt(hex.slice(4,6),16);
  return 'rgba('+r+','+g+','+b+','+op+')';
}

// ── OVERLAY DE SÉLECTION — sticky au texte (position:absolute dans text-display) ──
function drawSelOverlay() {
  var td = document.getElementById('text-display');
  if (!td) return;

  // Overlay inside text-display so it scrolls with the content
  var ol = td.querySelector('.sel-overlay-inner');
  if (!ol) {
    ol = document.createElement('div');
    ol.className = 'sel-overlay-inner';
    ol.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2;overflow:visible;';
    td.appendChild(ol);
  }
  ol.innerHTML = '';

  var tdRect = td.getBoundingClientRect();
  var scrollTop = (document.getElementById('reading-zone') || {scrollTop:0}).scrollTop;

  if (isLinkingMode && pendingSegments.length) {
    pendingSegments.forEach(function(seg) {
      var segSpans = [];
      for (var i = seg.lo; i <= seg.hi; i++) {
        if (words[i]) segSpans.push(words[i].el);
      }
      _drawSpanGroup(ol, segSpans, _getProfileSelColor(0.18), true, tdRect, scrollTop);
    });
    if (selStart >= 0 && selEnd >= 0) {
      var lo = Math.min(selStart, selEnd), hi = Math.max(selStart, selEnd);
      var curSpans = [];
      for (var i = lo; i <= hi; i++) {
        if (words[i] && !pendingSegments.some(function(s){ return i >= s.lo && i <= s.hi; }))
          curSpans.push(words[i].el);
      }
      _drawSpanGroup(ol, curSpans, _getProfileSelColor(), false, tdRect, scrollTop);
    }
    return;
  }

  var selSpans = [];
  td.querySelectorAll('span.sel').forEach(function(sp){ selSpans.push(sp); });
  var selCol = _getProfileSelColor();
  _drawSpanGroup(ol, selSpans, selCol, false, tdRect, scrollTop);
}

function _drawSpanGroup(container, spans, bgColor, dashed, tdRect, scrollTop) {
  if (!spans.length) return;
  var lines = [];
  spans.forEach(function(sp) {
    var r = sp.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var existing = lines.find(function(l){ return Math.abs(l.top - r.top) < 4; });
    if (existing) {
      existing.left   = Math.min(existing.left,  r.left);
      existing.right  = Math.max(existing.right, r.right);
      existing.bottom = Math.max(existing.bottom, r.bottom);
    } else {
      lines.push({ top:r.top, bottom:r.bottom, left:r.left, right:r.right });
    }
  });
  lines.forEach(function(l) {
    var div = document.createElement('div');
    div.style.cssText = [
      'position:absolute',
      'left:'   + (l.left   - tdRect.left - 1) + 'px',
      'top:'    + (l.top    - tdRect.top  - 1)  + 'px',
      'width:'  + (l.right  - l.left + 2)       + 'px',
      'height:' + (l.bottom - l.top  + 2)       + 'px',
      'background:' + bgColor,
      'border-radius:2px',
      dashed ? 'border-bottom:1.5px dashed rgba(12,12,10,0.3)' : '',
      'pointer-events:none',
    ].join(';');
    container.appendChild(div);
  });
}

function clearSel() {
  for (var i = 0; i < _selSet.length; i++) {
    _selSet[i].el.classList.remove('sel');
    _selSet[i].el.classList.remove('sel-linked');
  }
  _selSet = [];
  var td = document.getElementById('text-display');
  if (td) { var ol = td.querySelector('.sel-overlay-inner'); if (ol) ol.innerHTML = ''; }
  selStart = -1; selEnd = -1; pendingSegments = [];
}

// ── ÉDITION D'ANNOTATION ──
var _editingAnnotId = null;

function openEditPopup(annotId) {
  var a = annotations.find(function(x){ return x.id === annotId; });
  if (!a) return;
  _editingAnnotId = annotId;

  pendingSegments = a.segments ? a.segments.map(function(s){ return {lo:s.lo, hi:s.hi}; })
                               : [{lo: parseInt(a.spanIds[0].slice(1)), hi: parseInt(a.spanIds[a.spanIds.length-1].slice(1))}];
  rebuildPendingIds();

  // Afficher le popup immédiatement
  isLinkingMode = false;
  updatePopupPassage();
  document.getElementById('popup-note').value = a.note || '';
  _pendingAnnotThemeId = (a && a.themeId) ? a.themeId : null;
  var sl = document.getElementById('posture-slider');
  if (sl) sl.value = a.posture !== undefined ? a.posture : 50;
  currentPosture = a.posture !== undefined ? a.posture : 50;
  updatePostureLabels(currentPosture);
  selectedTrace = a.trace || 'evidence';
  document.querySelectorAll('.trace-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.trace === selectedTrace);
  });
  var extras = document.getElementById('popup-note-extras');
  if (extras) extras.classList.toggle('hidden', !(a.note && a.note.trim()));
  var dcheck = document.getElementById('popup-dialogue-check');
  if (dcheck) dcheck.checked = !!(a.dialogue);
  onDialogueCheck();
  var popup = document.getElementById('annot-popup');
  popup.classList.remove('popup-aside');
  popup.classList.remove('hidden');
  document.getElementById('popup-overlay').classList.remove('hidden');

  // Dim + chip différés pour ne pas bloquer l'affichage
  requestAnimationFrame(function() {
    var td = document.getElementById('text-display');
    if (td) {
      td.classList.add('editing-mode');
      a.spanIds.forEach(function(sid) {
        var w = wordById[sid]; if (w) w.el.classList.add('edit-highlighted');
      });
      td.dataset.editAnnotId = a.id;
    }
    if (typeof refreshThemeChip === 'function') refreshThemeChip();
  });
}

function _exitEditingMode() {
  var td = document.getElementById('text-display');
  if (td) {
    td.classList.remove('editing-mode');
    td.querySelectorAll('.edit-highlighted').forEach(function(el){ el.classList.remove('edit-highlighted'); });
  }
  _editingAnnotId = null;
}

// ── MODE LIAISON ──
function enterLinkingMode() {
  isLinkingMode = true;
  document.getElementById('popup-overlay').classList.add('hidden');
  // Décaler le popup vers la gauche pour voir le texte
  var popup = document.getElementById('annot-popup');
  if (popup) popup.classList.add('popup-aside');
  highlightAllPending();
}

function exitLinkingMode() {
  isLinkingMode = false;
  document.getElementById('popup-overlay').classList.remove('hidden');
  hideLinkingBar();
  highlightAllPending();
  updatePopupPassage();
}

function showLinkingBar() { /* removed */ }
function updateLinkingBar() { /* removed */ }
function hideLinkingBar() {
  var bar = document.getElementById('linking-bar');
  if (bar) bar.classList.add('hidden');
}

// ── FLOATING THOUGHT ──
function startFloatingThought(y) {
  pendingThoughtY = y || 0;
  thoughtPosture = 50;
  document.getElementById('thought-popup').classList.remove('hidden');
  document.getElementById('popup-overlay').classList.remove('hidden');
  document.getElementById('thought-text').value = '';
  var extras = document.getElementById('thought-note-extras');
  if (extras) extras.classList.add('hidden');
  var sl = document.getElementById('thought-posture-slider');
  if (sl) sl.value = 50;
  var dcheck = document.getElementById('thought-dialogue-check');
  if (dcheck) dcheck.checked = false;
  // .closest() (supporté depuis très longtemps) plutôt que :has() en
  // querySelector — :has() n'est supporté qu'à partir de Safari 15.4 et,
  // contrairement à un sélecteur simplement "non concluant", un sélecteur
  // non supporté fait lever une SyntaxError par querySelector : ça
  // cassait toute la fonction (et donc la création de pensées flottantes)
  // sur les Mac plus anciens bloqués sur un Safari antérieur.
  var postureSection = sl ? sl.closest('.popup-section') : null;
  if (postureSection) postureSection.style.display = '';
  document.querySelectorAll('.thought-posture-label').forEach(function(l){ l.classList.remove('active'); });
  setTimeout(function() { document.getElementById('thought-text').focus(); }, 50);
}

// Click on empty margin space → floating thought
document.addEventListener('click', function(e) {
  if (currentPhase !== 'lecture') return;
  var margin = document.getElementById('margin-col');
  if (!margin || !margin.contains(e.target)) return;
  // Don't trigger on existing notes, brackets, or buttons
  if (e.target.closest('.margin-note,.floating-thought,.live-margin-note,.annot-bracket-margin,.margin-icon-btn')) return;
  var rz = document.getElementById('reading-zone');
  var rzRect = rz ? rz.getBoundingClientRect() : {top:0};
  var scrollT = rz ? rz.scrollTop : 0;
  var y = e.clientY - rzRect.top + scrollT;
  startFloatingThought(y);
});
var _editingThoughtId = null;
function cancelThought() {
  _editingThoughtId = null;
  document.getElementById('thought-popup').classList.add('hidden');
  document.getElementById('popup-overlay').classList.add('hidden');
}
function onThoughtNoteInput() {
  var note = document.getElementById('thought-text').value;
  var extras = document.getElementById('thought-note-extras');
  if (extras) extras.classList.toggle('hidden', !note.trim());
}
function updateThoughtPostureLabels(val) {
  thoughtPosture = parseInt(val);
  var v = parseInt(val);
  document.querySelectorAll('.thought-posture-label').forEach(function(l, i) {
    l.classList.toggle('active', i === 0 ? v < 40 : v > 60);
  });
}
function confirmThought() {
  var txt = document.getElementById('thought-text').value.trim();
  if (!txt) { cancelThought(); return; }
  var dcheck = document.getElementById('thought-dialogue-check');
  // Édition d'une pensée existante
  if (_editingThoughtId) {
    var existing = floatingThoughts.find(function(x){ return x.id === _editingThoughtId; });
    if (existing) {
      existing.text = txt;
      existing.posture = thoughtPosture;
      existing.dialogue = !!(dcheck && dcheck.checked);
      // Réinitialiser l'ancre pour recalcul
      existing.anchorId = undefined;
    }
    _editingThoughtId = null;
    scheduleAnnotRender();
    cancelThought();
    return;
  }
  var thought = {
    id: 't'+(++annotIdCtr),
    text: txt,
    y: pendingThoughtY,
    profile: currentProfile,
    posture: thoughtPosture,
    dialogue: !!(dcheck && dcheck.checked)
  };
  floatingThoughts.push(thought);
  // Re-render all floating thoughts via renderLiveMarginNotes (handles scroll correctly)
  scheduleAnnotRender();
  cancelThought();
}
function renderFloatingThought(thought) {
  // No-op: floating thoughts are now rendered inside renderLiveMarginNotes
}

function openEditThought(thoughtId) {
  var t = floatingThoughts.find(function(x){ return x.id === thoughtId; });
  if (!t) return;
  _editingThoughtId = thoughtId;
  pendingThoughtY = t.y;
  thoughtPosture = t.posture !== undefined ? t.posture : 50;
  document.getElementById('thought-popup').classList.remove('hidden');
  document.getElementById('popup-overlay').classList.remove('hidden');
  var textEl = document.getElementById('thought-text');
  if (textEl) textEl.value = t.text || '';
  var extras = document.getElementById('thought-note-extras');
  if (extras) extras.classList.toggle('hidden', !(t.text && t.text.trim()));
  var sl = document.getElementById('thought-posture-slider');
  if (sl) { sl.value = thoughtPosture; updateThoughtPostureLabels(thoughtPosture); }
  var dcheck = document.getElementById('thought-dialogue-check');
  if (dcheck) dcheck.checked = !!(t.dialogue);
  var postureSection = sl ? sl.closest('.popup-section') : null;
  if (postureSection) postureSection.style.display = t.dialogue ? 'none' : '';
  setTimeout(function() { if (textEl) textEl.focus(); }, 50);
}

// ── POPUP ──
function _passageSummary() {
  var parts = pendingSegments.map(function(seg) {
    var txt = '';
    for (var i = seg.lo; i <= seg.hi; i++) { if (words[i]) txt += (txt?' ':'')+words[i].txt; }
    return txt;
  });
  var full = parts.join(' / ');
  return full.length > 80 ? '« '+full.slice(0,80)+'… »' : '« '+full+' »';
}
function updatePopupPassage() {
  var el = document.getElementById('popup-passage');
  if (el) el.textContent = _passageSummary();
  // Mettre à jour le compteur de passages liés
  var counter = document.getElementById('popup-link-count');
  if (counter) {
    counter.textContent = pendingSegments.length > 1
      ? pendingSegments.length+' passages liés'
      : '';
  }
}
function onPopupNoteInput() {
  var note = document.getElementById('popup-note').value;
  var extras = document.getElementById('popup-note-extras');
  if (extras) extras.classList.toggle('hidden', !note.trim());
}

function onDialogueCheck() {
  var dcheck = document.getElementById('popup-dialogue-check');
  // .closest() seul — voir commentaire dans startFloatingThought sur :has()
  var slider0 = document.getElementById('posture-slider');
  var postureSection = slider0 ? slider0.closest('.popup-section') : null;
  if (!postureSection) return;
  if (dcheck && dcheck.checked) {
    // Dialogue = forcément personnel : masquer le slider, forcer posture à 100
    postureSection.style.display = 'none';
    currentPosture = 100;
    var slider = document.getElementById('posture-slider');
    if (slider) slider.value = 100;
  } else {
    postureSection.style.display = '';
  }
}

function onThoughtDialogueCheck() {
  var dcheck = document.getElementById('thought-dialogue-check');
  // .closest() seul — voir commentaire dans startFloatingThought sur :has()
  var slider1 = document.getElementById('thought-posture-slider');
  var postureSection = slider1 ? slider1.closest('.popup-section') : null;
  if (!postureSection) return;
  if (dcheck && dcheck.checked) {
    // Dialogue = forcément personnel : masquer le slider, forcer posture à 100
    postureSection.style.display = 'none';
    thoughtPosture = 100;
    var slider = document.getElementById('thought-posture-slider');
    if (slider) slider.value = 100;
    updateThoughtPostureLabels(100);
  } else {
    postureSection.style.display = '';
  }
}

function openPopup() {
  isLinkingMode = false;
  _pendingAnnotThemeId = null;
  updatePopupPassage();
  document.getElementById('popup-note').value = '';
  document.getElementById('posture-slider').value = 50;
  currentPosture = 50;
  updatePostureLabel(50);
  selectedTrace = 'evidence';
  // Hide posture+dialogue until note is typed
  var extras = document.getElementById('popup-note-extras');
  if (extras) extras.classList.add('hidden');
  var dcheck = document.getElementById('popup-dialogue-check');
  if (dcheck) dcheck.checked = false;
  // Réafficher le slider de posture (peut avoir été caché par un dialogue précédent)
  var slider = document.getElementById('posture-slider');
  if (slider) {
    var ps = slider.closest('.popup-section');
    if (ps) ps.style.display = '';
  }
  // Reset posture labels
  document.querySelectorAll('.posture-label').forEach(function(l){ l.classList.remove('active'); });
  document.querySelectorAll('.trace-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.trace === 'evidence');
  });
  var lbl = document.getElementById('note-label');
  if (lbl) lbl.textContent = 'Note associée (optionnel)';
  var popup = document.getElementById('annot-popup');
  popup.classList.remove('popup-aside');
  popup.classList.remove('hidden');
  document.getElementById('popup-overlay').classList.remove('hidden');
  hideLinkingBar();
}
function cancelAnnot() {
  isLinkingMode = false;
  _exitEditingMode();
  _pendingAnnotThemeId = null;
  var themePanel = document.getElementById('theme-panel');
  if (themePanel) themePanel.classList.add('hidden');
  var themeDisp = document.getElementById('theme-selected-display');
  if (themeDisp) themeDisp.innerHTML = '';
  document.getElementById('annot-popup').classList.remove('popup-aside');
  document.getElementById('annot-popup').classList.add('hidden');
  document.getElementById('popup-overlay').classList.add('hidden');
  hideLinkingBar();
  clearSel(); pendingIds = [];
}
function selectTrace(btn) {
  selectedTrace = btn.dataset.trace;
  document.querySelectorAll('.trace-btn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  var lbl = document.getElementById('note-label');
  if (lbl) lbl.textContent = selectedTrace === 'note' ? 'Texte de la note *' : selectedTrace === 'crochet' ? 'Note associée…' : 'Note associée (optionnel)';
}
function updatePostureLabel(val) {
  currentPosture = parseInt(val);
}
function updatePostureLabels(val) {
  currentPosture = parseInt(val);
  var v = parseInt(val);
  var labels = document.querySelectorAll('.posture-label');
  if (labels.length >= 2) {
    labels[0].classList.toggle('active', v < 40); // analytique
    labels[1].classList.toggle('active', v > 60); // personnel
  }
}
function confirmAnnot() {
  if (!pendingIds.length) return;
  var note = document.getElementById('popup-note').value.trim();
  // If editing an existing annotation, update it
  if (_editingAnnotId) {
    var existing = annotations.find(function(x){ return x.id === _editingAnnotId; });
    if (existing) {
      existing.note = note;
      existing.trace = selectedTrace;
      existing.posture = currentPosture;
      var dcheck = document.getElementById('popup-dialogue-check');
      existing.dialogue = !!(dcheck && dcheck.checked);
      existing.themeId = _pendingAnnotThemeId !== undefined ? _pendingAnnotThemeId : (existing.themeId || null);
      existing.spanIds = pendingIds.slice();
      existing.segments = pendingSegments.map(function(s){ return {lo:s.lo, hi:s.hi}; });
      existing.selText = pendingSegments.map(function(seg) {
        var txt = ''; for (var i=seg.lo;i<=seg.hi;i++){if(words[i])txt+=(txt?' ':'')+words[i].txt;} return txt;
      }).join(' / ');
    }
    _exitEditingMode();
    cancelAnnot();
    scheduleAnnotRender();
    renderLiveMarginNotes();
    return;
  }
  // selText = texte de chaque segment séparé par ' / '
  var selText = pendingSegments.map(function(seg) {
    var txt = '';
    for (var i=seg.lo; i<=seg.hi; i++) { if (words[i]) txt += (txt?' ':'')+words[i].txt; }
    return txt;
  }).join(' / ');
  var dcheck = document.getElementById('popup-dialogue-check');
  var a = {
    id: 'a'+(++annotIdCtr),
    selText: selText,
    note: note,
    spanIds: pendingIds.slice(),
    segments: pendingSegments.map(function(s){return {lo:s.lo,hi:s.hi};}),
    trace: selectedTrace,
    posture: currentPosture,
    dialogue: !!(dcheck && dcheck.checked),
    profile: currentProfile
  };
  a.themeId = _pendingAnnotThemeId || null;
  annotations.push(a);
  _pendingAnnotThemeId = null;
  cancelAnnot();
  updateAnnotCount();
  scheduleAnnotRender();
}
function switchProfile(n) {
  currentProfile = n;
  document.querySelectorAll('.tb-profile-btn').forEach(function(b){b.classList.toggle('active',parseInt(b.dataset.idx)===n);});
  _updateScrollbarColor();
  scheduleAnnotRender();
  updateAnnotCount();
}

function _updateScrollbarColor() {
  var p = profiles[currentProfile];
  var col = (p && (p.colorBold || p.color)) || '#333333';
  var thumbCol;
  if (col && col[0] === '#') {
    var r = parseInt(col.slice(1,3),16), g = parseInt(col.slice(3,5),16), bv = parseInt(col.slice(5,7),16);
    thumbCol = 'rgba(' + r + ',' + g + ',' + bv + ',0.5)';
  } else {
    thumbCol = col;
  }
  var styleEl = document.getElementById('_scrollbar-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = '_scrollbar-style';
    document.head.appendChild(styleEl);
  }
  // Use higher opacity for better visibility
  var thumbColStrong = thumbCol.replace(/,[\d.]+\)$/, ',0.75)');
  styleEl.textContent = [
    '#reading-zone, #liste-postit { scrollbar-color: ' + thumbColStrong + ' transparent !important; }',
    '#reading-zone::-webkit-scrollbar, #liste-postit::-webkit-scrollbar { width: 4px !important; }',
    '#reading-zone::-webkit-scrollbar-track, #liste-postit::-webkit-scrollbar-track { background: transparent !important; }',
    '#reading-zone::-webkit-scrollbar-thumb, #liste-postit::-webkit-scrollbar-thumb { background: ' + thumbColStrong + ' !important; border-radius: 2px !important; }',
  ].join('\n');
  // Also update CSS variable for potential use in rules
  document.documentElement.style.setProperty('--profile-scrollbar-color', thumbCol);
}

function updateAnnotCount() {
  // count silently
}

// ── CANVAS RENDERING ──
var _arizonaFontsLoaded = false;
function loadFonts(cb) {
  if (_arizonaFontsLoaded) { cb(); return; }
  var done=false;
  function finish(){ if(!done){done=true;_arizonaFontsLoaded=true;cb();} }
  Promise.all([
    document.fonts.load('300 32px ArizonaSerif'),
    document.fonts.load('700 32px ArizonaSerif'),
    document.fonts.load('300 32px ArizonaSans'),
    document.fonts.load('700 32px ArizonaSans')
  ]).then(finish).catch(finish);
  setTimeout(finish, 2000); // fallback
}

function computeFSToFit(W, H) {
  var lo=6, hi=40, best=8;
  while (lo <= hi) {
    var mid = Math.round((lo+hi)/2);
    var tmp = document.createElement('canvas');
    var tc = tmp.getContext('2d');
    tc.font = '300 '+mid+'px ArizonaSerif';
    var spW = tc.measureText(' ').width;
    var TW = W-48, lines=1, curX=0;
    words.forEach(function(w) {
      var ww = tc.measureText(w.txt).width;
      if (curX>0 && curX+spW+ww>TW) { lines++; curX=0; }
      curX += (curX>0?spW:0)+ww;
    });
    if (lines*mid*2.1+48 <= H) { best=mid; lo=mid+1; } else hi=mid-1;
  }
  return best;
}

function renderLive() {
  document.fonts.ready.then(function() {
    _arizonaFontsLoaded = true;
    _renderLive();
  });
}

function _renderLive() {
  var mc = document.getElementById('gal-canvas'); if (!mc) return;
  var mainEl = document.getElementById('gal-main');
  var W = mainEl ? mainEl.clientWidth : 700;
  if (W < 100) W = 700;
  var dpr = window.devicePixelRatio || 1;
  var H, FS, PAD;

  if (galViewMode === 'full') {
    H = mainEl ? mainEl.clientHeight : 500;
    if (H < 100) H = 500;
    FS = computeFSToFit(W, H);
    PAD = 24;
  } else {
    W = Math.min(W, 820);
    FS = 17; PAD = 160;
    var tmp = document.createElement('canvas');
    var tc = tmp.getContext('2d');
    tc.font = '300 '+FS+'px ArizonaSerif,Georgia,serif';
    var spW = tc.measureText(' ').width;
    if (spW < 1) spW = FS * 0.28;
    var TW = W-PAD*2, lines=1, curX=0;
    words.forEach(function(w) {
      var ww = tc.measureText(w.txt).width;
      if (curX>0 && curX+ww+spW>TW) { lines++; curX=0; }
      curX += (curX>0?spW:0)+ww;
    });
    H = Math.max(600, PAD*2+lines*(FS*2.2)+PAD);
  }

  mc.width = W*dpr; mc.height = H*dpr;
  mc.style.width = W+'px'; mc.style.height = H+'px';
  mc.style.display = 'block'; mc.style.maxWidth = 'none';

  _lastLayout = null;
  _lastFS = FS; _lastPAD = PAD; _lastW = W;
  // Test if ArizonaSerif loaded correctly
  var testCtx = document.createElement('canvas').getContext('2d');
  testCtx.font = '300 32px ArizonaSerif';
  var arizonaW = testCtx.measureText('M').width;
  testCtx.font = '300 32px serif';
  var serifW = testCtx.measureText('M').width;
  // If widths are identical, Arizona didn't load — use Georgia fallback
  if (Math.abs(arizonaW - serifW) < 1) {
    console.warn('ArizonaSerif not loaded, using Georgia fallback');
    window._fontFallback = true;
  } else {
    window._fontFallback = false;
  }
  drawState(mc, currentIntensity, FS, PAD, W, H);
}

// ── DRAW ──
// posture 0=analytique (sans-serif), 100=personnel (serif)
// trace: souligne=light weight, entoure=medium, note=heavy
function traceToWeight(trace) {
  if (trace === 'souligne') return 0.3;  // léger
  if (trace === 'entoure')  return 0.6;  // moyen
  if (trace === 'note')     return 1.0;  // fort
  if (trace === 'crochet')    return 0.0;  // aucune marque visuelle
  return 0.3;
}

function drawState(canvas, intensity, BASE_FS, PAD, W, H) {
  var dpr = window.devicePixelRatio || 1;
  var ctx = canvas.getContext('2d');
  ctx.save(); ctx.scale(dpr, dpr);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,W,H);

  var ev = ease(intensity);
  var TW = W-PAD*2;

  // Build annotation index
  var annotByWord = {};
  annotations.forEach(function(a) {
    a.spanIds.forEach(function(sid) {
      annotByWord[parseInt(sid.slice(1))] = a;
    });
  });

  // Base font: thin ArizonaSerif — neutral state (SRFF=50 = mid, stays serif at rest)
  var _ff=window._fontFallback?'Georgia,serif':'ArizonaSerif,Georgia,serif';
  ctx.font = '300 '+BASE_FS+'px '+_ff;
  ctx.textBaseline = 'alphabetic';
  var spW = ctx.measureText(' ').width;

  // Layout — uniform at base size
  var layout = [];
  var curX = PAD, curY = PAD+BASE_FS*1.3, lineH = BASE_FS*1.9;
  words.forEach(function(w) {
    var ww = ctx.measureText(w.txt).width;
    if (curX > PAD && curX+ww > PAD+TW) { curX=PAD; curY+=lineH; }
    layout.push({w:w, x:curX, y:curY, ww:ww, baseY:curY});
    curX += ww + spW;
  });
  _lastLayout = layout; // cache for hover hit testing

  // PASS 1: draw immerger (note) strokes first — on top of base layer
  // PASS 0: base text
  layout.forEach(function(item) {
    var a = annotByWord[item.w.idx];
    var isHL = highlightedAnnot && a && a.id === highlightedAnnot;
    var profileColor = a ? (profiles[a.profile]?profiles[a.profile].color:'#0d0d0d') : '#0d0d0d';
    var ev2 = ease(intensity);

    // Font based on posture — 50=neutral=ArizonaSerif, 0=analytique=ArizonaSans, 100=personnel=ArizonaSerif bold
    var fontFace = 'ArizonaSerif';
    var fontW = 300;

    if (a && intensity > 0.01) {
      var posture = a.posture / 100; // 0=analytique 1=personnel
      // Neutral (0.5) = no change. Diverge from center:
      // personal → heavier serif; analytical → lighter sans
      if (posture > 0.5) {
        // personal: stays serif, gets heavier
        fontFace = 'ArizonaSerif';
        fontW = Math.round(lerp(300, 700, ev2 * (posture-0.5)*2));
      } else {
        // analytical: goes sans, stays light
        var sansFactor = ev2 * (0.5-posture)*2;
        fontFace = sansFactor > 0.4 ? 'ArizonaSans' : 'ArizonaSerif';
        fontW = 300;
      }
    }

    ctx.font = fontW+' '+BASE_FS+'px '+(window._fontFallback?'Georgia,serif':fontFace+',Georgia,serif');
    ctx.fillStyle = isHL ? '#ff1493' : profileColor;
    ctx.globalAlpha = 1;

    if (!a || intensity < 0.01) {
      ctx.fillText(item.w.txt, item.x, item.y);
      return;
    }

    var ev2 = ease(intensity);

    if (a.trace === 'crochet') {
      // Aucune marque visuelle sur le texte — juste la note en marge
      ctx.fillText(item.w.txt, item.x, item.y);
    }
    else if (a.trace === 'evidence') {
      // WAVE: letters drift off their baseline, gently
      var waveAmp = lerp(0, BASE_FS*0.55, ev2);
      var wfreq = 0.18;
      var wordIdx = item.w.idx;
      var waveY = waveAmp * Math.sin(wordIdx * wfreq);
      var waveX = lerp(0, BASE_FS*0.08, ev2) * Math.cos(wordIdx * wfreq + 0.5);
      // slight scale variation
      var scaleY = 1 + lerp(0, 0.3, ev2) * Math.abs(Math.sin(wordIdx*wfreq*0.7));
      ctx.save();
      ctx.translate(item.x + item.ww*0.5 + waveX, item.y + waveY);
      ctx.scale(1, scaleY);
      ctx.fillText(item.w.txt, -item.ww*0.5, 0);
      ctx.restore();
    }
    else if (a.trace === 'note') {
      // Draw background block behind word, then text on top — clean, no stroke overlap
      var pad = BASE_FS * 0.18;
      ctx.save();
      ctx.font = fontW+' '+BASE_FS+'px '+(window._fontFallback?'Georgia,serif':fontFace+',Georgia,serif');
      // 1. colored background rectangle
      ctx.fillStyle = isHL ? '#ff1493' : profileColor;
      ctx.globalAlpha = lerp(0, 0.15, ev2);
      ctx.fillRect(item.x-pad, item.y-BASE_FS*1.0, item.ww+pad*2, BASE_FS*1.35);
      // 2. thin border
      ctx.strokeStyle = isHL ? '#ff1493' : profileColor;
      ctx.lineWidth = lerp(0, 1.2, ev2);
      ctx.globalAlpha = lerp(0, 0.6, ev2);
      ctx.strokeRect(item.x-pad, item.y-BASE_FS*1.0, item.ww+pad*2, BASE_FS*1.35);
      // 3. text on top, full opacity
      ctx.fillStyle = isHL ? '#ff1493' : '#0d0d0d';
      ctx.globalAlpha = 1;
      ctx.fillText(item.w.txt, item.x, item.y);
      ctx.restore();
    }
  });

  // Draw all annotation notes in left margin — always visible, opacity grows with intensity
  var allNoteAnnots = annotations.filter(function(a) { return a.note && a.note.trim() && (activeProfiles.length===0||activeProfiles.indexOf(parseInt(a.profile))>=0); });
  if (allNoteAnnots.length) {
    var noteFS = Math.max(8, BASE_FS*0.68);
    ctx.textBaseline = 'alphabetic';
    var noteMaxW = PAD - 16;
    var noteX = Math.max(4, PAD * 0.12); // décalé vers la gauche, quasi centré dans la colonne
    if (noteMaxW > 20) {
      allNoteAnnots.forEach(function(a) {
        var firstIdx = parseInt(a.spanIds[0].slice(1));
        var item = layout[firstIdx];
        if (!item) return;
        var noteY = item.y; // aligné sur la baseline du premier mot du passage
        var pCol = profiles[a.profile] ? profiles[a.profile].color : '#0d0d0d';
        ctx.save();
        ctx.font = '300 '+noteFS+'px ArizonaSerif'; // sans italique
        ctx.fillStyle = pCol;
        ctx.globalAlpha = 0.35 + ease(intensity)*0.5;
        var wds = a.note.split(' ');
        var lineW=0, line=[];
        wds.forEach(function(wd) {
          var ww=ctx.measureText(wd+' ').width;
          if (lineW+ww>noteMaxW&&line.length) {
            ctx.fillText(line.join(' '),noteX,noteY);
            noteY+=noteFS*1.4; line=[wd]; lineW=ww;
          } else { line.push(wd); lineW+=ww; }
        });
        if(line.length) ctx.fillText(line.join(' '),noteX,noteY);
        ctx.restore();
      });
    }
  }

  // DIALOGUE: interleave annotation words into the text passage
  if (intensity > 0.01) {
    var dialogueAnnots = annotations.filter(function(a){ return a.trace==='dialogue' && a.note && a.note.trim() && (_hoveredProfile===null||a.profile===_hoveredProfile); });
    dialogueAnnots.forEach(function(a) {
      var ev2 = ease(intensity);
      var pCol = profiles[a.profile]?profiles[a.profile].color:'#0d0d0d';
      var noteWords = a.note.trim().split(/\s+/);
      var passageItems = a.spanIds.map(function(sid){
        return layout[parseInt(sid.slice(1))];
      }).filter(Boolean);
      if (!passageItems.length || !noteWords.length) return;

      // Distribute note words between passage words
      // ratio: one note word every N passage words
      var noteFS = BASE_FS * 0.85;
      ctx.font = 'italic 300 '+noteFS+'px ArizonaSerif';
      var noteWordIdx = 0;
      var step = Math.max(1, Math.floor(passageItems.length / noteWords.length));

      passageItems.forEach(function(item, i) {
        if (noteWordIdx >= noteWords.length) return;
        if (i % step === Math.floor(step/2)) {
          // Insert note word between passage words
          var nw = noteWords[noteWordIdx++];
          var nwW = ctx.measureText(nw).width;
          // Position: slightly above the baseline, between words
          var nx = item.x - nwW*0.5 - 2;
          var ny = item.y - BASE_FS * lerp(0, 0.45, ev2);
          ctx.save();
          ctx.globalAlpha = lerp(0, 0.75, ev2);
          ctx.fillStyle = pCol;
          ctx.font = 'italic 300 '+noteFS+'px ArizonaSerif';
          ctx.textBaseline = 'alphabetic';
          ctx.fillText(nw, nx, ny);
          ctx.restore();
        }
      });

      // Draw remaining note words after the last passage word
      if (noteWordIdx < noteWords.length && passageItems.length) {
        var lastItem = passageItems[passageItems.length-1];
        var extraX = lastItem.x + lastItem.ww + 4;
        var extraY = lastItem.y - BASE_FS * lerp(0, 0.45, ev2);
        ctx.save();
        ctx.globalAlpha = lerp(0, 0.75, ev2);
        ctx.fillStyle = pCol;
        ctx.font = 'italic 300 '+noteFS+'px ArizonaSerif';
        ctx.textBaseline = 'alphabetic';
        while (noteWordIdx < noteWords.length) {
          var nw = noteWords[noteWordIdx++];
          ctx.fillText(nw, extraX, extraY);
          extraX += ctx.measureText(nw+' ').width;
        }
        ctx.restore();
      }
    });
  }

  // Draw floating thoughts in left margin — même variables que notes de marge
  floatingThoughts.forEach(function(t) {
    var tpost    = (t.posture != null ? t.posture : 50) / 100;
    var noteLen  = t.text.length;
    var noteFS   = Math.round(Math.min(BASE_FS, Math.max(BASE_FS*0.6, BASE_FS*0.8 - noteLen * 0.003)));
    var vfWght   = Math.round(Math.min(800, Math.max(300, 300 + (noteLen / 120) * 500)));
    var tcol     = (profiles[t.profile] && profiles[t.profile].colorBold) || '#0d0d0d';
    ctx.save();
    ctx.font = vfWght + ' ' + noteFS + 'px ArizonaSerif, Georgia, serif';
    ctx.fillStyle = tcol;
    ctx.globalAlpha = 0.82 + tpost * 0.08;
    ctx.textBaseline = 'alphabetic';
    var noteX = 4, noteY = t.y || PAD;
    var noteMaxW = PAD - 8;
    var lineW = 0, line = [];
    t.text.split(' ').forEach(function(wd) {
      var ww = ctx.measureText(wd + ' ').width;
      if (lineW + ww > noteMaxW && line.length) {
        ctx.fillText(line.join(' '), noteX, noteY);
        noteY += noteFS * 1.35; line = [wd]; lineW = ww;
      } else { line.push(wd); lineW += ww; }
    });
    if (line.length) ctx.fillText(line.join(' '), noteX, noteY);
    ctx.restore();
  });

  ctx.restore();
}

// ── GALLERY CONTROLS ──

// ── GALLERY HTML/CSS ──
var activeProfiles = [];
var activePostureFilter = null; // null = tous | 'analytique' | 'personnel'
var activeTraceFilter   = null; // null = tous | 'evidence' | 'entoure' | 'note' | 'dialogue'
var isMonochrome = false;
var wordAnnotsAll = {};

function setProfileFilter(profileIdx) {
  profileIdx = parseInt(profileIdx);
  var idx = activeProfiles.indexOf(profileIdx);
  if (idx >= 0) {
    activeProfiles.splice(idx, 1);
  } else {
    activeProfiles.push(profileIdx);
  }
  // Update filter buttons
  document.querySelectorAll('.gal-profile-filter').forEach(function(btn) {
    var pi = parseInt(btn.dataset.profile);
    btn.classList.toggle('active', activeProfiles.indexOf(pi) >= 0 || activeProfiles.length === 0);
  });
  buildGalleryHTML();
}

function buildProfileFilters() {
  var container = document.getElementById('gal-profile-filters');
  if (!container) return;
  container.innerHTML = '';
  // "Tous" button
  var allBtn = document.createElement('button');
  allBtn.className = 'gal-profile-filter active';
  allBtn.textContent = 'Tous';
  allBtn.dataset.profile = '-1';
  allBtn.onclick = function() {
    activeProfiles = [];
    document.querySelectorAll('.gal-profile-filter').forEach(function(b){b.classList.toggle('active', b.dataset.profile==='-1');});
    buildGalleryHTML();
  };
  container.appendChild(allBtn);
  profiles.forEach(function(p, i) {
    var btn = document.createElement('button');
    btn.className = 'gal-profile-filter';
    btn.textContent = p.name;
    btn.dataset.profile = i;
    btn.style.setProperty('--pcol', p.color);
    btn.onclick = (function(pi) { return function() {
      document.querySelector('.gal-profile-filter[data-profile="-1"]').classList.remove('active');
      setProfileFilter(pi);
      document.querySelectorAll('.gal-profile-filter:not([data-profile="-1"])').forEach(function(b){
        b.classList.toggle('active', activeProfiles.indexOf(parseInt(b.dataset.profile))>=0);
      });
      if (activeProfiles.length === 0) {
        document.querySelector('.gal-profile-filter[data-profile="-1"]').classList.add('active');
      }
    }; })(i);
    container.appendChild(btn);
  });
}

function buildGalleryHTML() {
  var container = document.getElementById('gal-text');
  if (!container) return;
  container.innerHTML = '';

  var canvas = document.createElement('canvas');
  canvas.id = 'orbital-canvas';
  canvas.style.cssText = 'display:block;width:100%;height:100%;cursor:grab;touch-action:none;';
  container.style.cssText = 'position:relative;overflow:hidden;width:100%;height:100%;padding:0;max-width:none;background:#fff;';
  container.appendChild(canvas);

  // ── DONNÉES ─────────────────────────────────────────────────────────────────

  var annotByWord = {};
  annotations.forEach(function(a) {
    if ((activeProfiles.length > 0 && activeProfiles.indexOf(parseInt(a.profile)) < 0) || !_postureMatch(a) || !_traceMatch(a)) return;
    a.spanIds.forEach(function(sid) {
      var idx = parseInt(sid.slice(1));
      if (!annotByWord[idx]) annotByWord[idx] = [];
      annotByWord[idx].push(a);
    });
  });

  // Précalcul typo par mot
  var REF = 60;
  var off = document.createElement('canvas').getContext('2d');
  var wordMeta = words.map(function(w) {
    var annots = annotByWord[w.idx] || [];
    var a = annots[0] || null;
    var baseBoost = 1;
    if (a && a.note) baseBoost = Math.min(1.45, 1.08 + a.note.length / 120);
    else if (a && !a.note) baseBoost = 1.18;
    var sizeBoost = a ? baseBoost : 1;
    var wdth  = 1; // pas de compression horizontale
    var waveY = 0; // pas de vague verticale
    off.font = '300 ' + REF + 'px ArizonaSerif,Georgia,serif';
    var normW = (off.measureText(w.txt).width / REF) * sizeBoost * wdth;
    return {
      w: w, a: a, sizeBoost: sizeBoost, wdth: wdth, waveY: waveY, normW: normW,
      col: a ? (profiles[a.profile] ? profiles[a.profile].color : '#0d0d0d') : '#0d0d0d',
      trace: a ? a.trace : null
    };
  });

  // Paragraphes
  var paraBreaks = {};
  var origText = document.getElementById('text-display');
  if (origText) {
    origText.querySelectorAll('p').forEach(function(p) {
      var spans = p.querySelectorAll('span[data-idx]');
      if (spans.length > 0) paraBreaks[parseInt(spans[0].dataset.idx)] = true;
    });
  }

  var LINE_H = 2.2, SP = 0.26, LINE_W = 42;

  // ── ANNOTATIONS ──────────────────────────────────────────────────────────────

  function buildLayout(lw) {
    var result = [], cx = 0, cy = 0;
    wordMeta.forEach(function(m, i) {
      if (paraBreaks[m.w.idx] && i > 0) { cx = 0; cy += LINE_H * 1.6; }
      if (cx > 0 && cx + m.normW > lw) { cx = 0; cy += LINE_H; }
      result.push({ meta: m, x: cx, y: cy });
      cx += m.normW + SP;
    });
    return result;
  }

  function computeTotalH(layout) {
    if (!layout.length) return 10;
    var last = layout[layout.length - 1];
    return last.y + LINE_H + 2;
  }

  // Calcule anchorY d'une annotation dans un layout donné
  function computeAnchorY(a, layout) {
    var totalY = 0, count = 0;
    layout.forEach(function(item) {
      if (a.spanIds.indexOf('w' + item.meta.w.idx) >= 0) {
        totalY += item.y; count++;
      }
    });
    return count > 0 ? totalY / count : 0;
  }

  // Layout de référence (LINE_W) pour positions initiales
  var baseLayout = buildLayout(LINE_W);
  var totalH0 = computeTotalH(baseLayout);

  // Construire annotNodes
  var annotNodes = [];
  var seenIds = {};

  // Distribuer les annotations sur ~3 niveaux de profondeur dans la marge
  // pour occuper tout l'espace gauche
  var depthLevels = [-12, -28, -48]; // em depuis x=0
  var depthIdx = 0;

  annotations.forEach(function(a) {
    if ((activeProfiles.length > 0 && activeProfiles.indexOf(parseInt(a.profile)) < 0) || !_postureMatch(a) || !_traceMatch(a)) return;
    if (seenIds[a.id]) return;
    seenIds[a.id] = true;
    if (!a.spanIds || !a.spanIds.length) return;

    var anchorY = computeAnchorY(a, baseLayout);
    var col = profiles[a.profile] ? profiles[a.profile].color : '#0d0d0d';

    var posture = typeof a.posture === 'number' ? a.posture : 50;
    // Distance à la marge : analytique (0) = proche du texte (-8em), personnel (100) = loin (-52em)
    var depthBase = -8 - (posture / 100) * 44;
    var ax = depthBase + (Math.random() - 0.5) * 8;
    var ay = anchorY;

    annotNodes.push({
      a: a, col: col,
      anchorY: anchorY,  // mis à jour à chaque reflow
      ax: ax, ay: ay,
      _relAy: 0,         // distance relative à anchorY après force-layout
      note: a.note || '',
      passageTxt: a.selText || ''
    });
  });

  // Force-layout : anti-chevauchement vertical dans la marge
  (function forceLayout() {
    for (var iter = 0; iter < 120; iter++) {
      annotNodes.forEach(function(n) {
        var fay = 0;
        annotNodes.forEach(function(m) {
          if (m === n) return;
          var day = n.ay - m.ay;
          var minSep = 2.8;
          if (Math.abs(day) < minSep) {
            var f = (minSep - Math.abs(day)) / minSep * 0.35;
            fay += day >= 0 ? f : -f;
          }
        });
        // Attraction vers anchorY — douce
        fay += (n.anchorY - n.ay) * 0.04;
        n.ay += fay;
      });
    }
    // Stocker la distance relative
    annotNodes.forEach(function(n) { n._relAy = n.ay - n.anchorY; });
  })();

  // Recompute anchors when layout changes
  var prevLW = -1;
  function recomputeAnchors() {
    var lw = colW();
    if (Math.abs(lw - prevLW) < 0.05) return;
    prevLW = lw;
    var lay = buildLayout(lw);
    annotNodes.forEach(function(n) {
      n.anchorY = computeAnchorY(n.a, lay);
      n.ay = n.anchorY + n._relAy;
    });
  }

  // ── CAMÉRA ───────────────────────────────────────────────────────────────────

  var W = 0, H = 0, ctx;
  var zoom = 14;        // px par em
  var MIN_ZOOM = 2, MAX_ZOOM = 60;
  var panX = 0;         // em, positif = vers la marge gauche
  var panY = 0;         // em

  // Le bord droit de la colonne texte est fixé à W-24px (quand panX=0)
  // Au dézoom max : texte centré, occupe tout l'écran
  // Au zoom normal : texte ferré à droite, marge gauche disponible
  function colW() {
    var t = Math.max(0, Math.min(1, (zoom - MIN_ZOOM) / (14 - MIN_ZOOM)));
    // Dézoom max : colonne = largeur de l'écran entière (calculée en em)
    var fullW = W / zoom; // largeur écran en em à ce niveau de zoom
    return fullW + t * (LINE_W - fullW);
  }

  function toScreen(ex, ey) {
    var lw = colW();
    var t = Math.max(0, Math.min(1, (zoom - MIN_ZOOM) / (14 - MIN_ZOOM)));
    // Dézoomé : texte centré | Zoomé : texte ferré à droite
    var originXCenter = W / 2 - (lw * zoom) / 2;
    var originXRight  = (W - 24) - lw * zoom;
    var originX = originXCenter + t * (originXRight - originXCenter);
    return {
      sx: originX + (ex - panX) * zoom,
      sy: H / 2 + (ey + panY) * zoom
    };
  }

  function computeTotalHCur() {
    var lw = colW();
    return computeTotalH(buildLayout(lw));
  }

  function clampPanY() {
    var lh = computeTotalHCur();
    // toScreen(0, 0).sy = H/2 + panY*zoom → pour y=0 en haut : panY = -H/(2*zoom) + marge/zoom
    var topPan = 40 / zoom - H / (2 * zoom);
    var botPan  = (H - 40) / zoom - H / (2 * zoom) - lh;
    if (botPan > topPan) botPan = topPan;
    panY = Math.max(botPan, Math.min(topPan, panY));
  }

  function applyZoom(newZoom) {
    // Conserver le point monde au centre de l'écran
    var lw0 = colW();
    var ox0 = (W - 24) - lw0 * zoom;
    var worldCY = (H / 2 - H / 2) / zoom - panY;
    zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    panY = (H / 2 - H / 2) / zoom - worldCY;
    panX = Math.max(0, panX);
    clampPanY();
  }

  function initZoom() {
    // Zoom initial : texte lisible, ferré à droite
    zoom = 14;
    panX = 0;
    panY = 40 / zoom - H / (2 * zoom);
  }

  function fitAll() {
    // Zoom pour faire tenir tout le texte dans l'écran
    // À MIN_ZOOM, colW() = W/zoom donc le texte occupe exactement la largeur
    // On cherche le zoom tel que totalH * zoom = H - 80px
    var lh = computeTotalH(buildLayout(W / MIN_ZOOM));
    var zoomFit = (H - 80) / lh;
    zoom = Math.max(MIN_ZOOM, Math.min(14, zoomFit));
    panX = 0;
    panY = 40 / zoom - H / (2 * zoom);
    clampPanY();
  }

  // Wrapper texte canvas
  function fillTextWrapped(context, text, x, y, maxW, lineH) {
    if (!text) return 0;
    var parts = text.split(' '), line = '', ly = y;
    for (var i = 0; i < parts.length; i++) {
      var test = line ? line + ' ' + parts[i] : parts[i];
      if (context.measureText(test).width > maxW && line) {
        context.fillText(line, x, ly); ly += lineH; line = parts[i];
      } else { line = test; }
    }
    if (line) context.fillText(line, x, ly);
    return ly;
  }

  // ── POPUP ────────────────────────────────────────────────────────────────────

  var popupEl = null;
  function createPopup() {
    popupEl = document.createElement('div');
    popupEl.style.cssText = [
      'position:absolute;background:#fff;',
      'border-radius:2px;padding:28px 32px 24px;width:320px;',
      'box-shadow:0 2px 40px rgba(0,0,0,0.13);z-index:100;pointer-events:all;',
      'font-family:PPNeueMontreal,DM Sans,sans-serif;line-height:1.5;',
      'display:none;'
    ].join('');
    container.appendChild(popupEl);
  }

  function showPopup(n, screenX, screenY) {
    if (!popupEl) createPopup();

    // Passage en italic serif petit
    var passageHtml = n.passageTxt
      ? '<div style="font-family:ArizonaSerif,Georgia,serif;font-style:italic;font-size:11px;' +
        'color:#aaa;line-height:1.6;margin-bottom:16px;border-left:2px solid ' + n.col + ';' +
        'padding-left:10px;">' + esc(n.passageTxt) + '</div>'
      : '';

    // Note grande dans la couleur
    var noteHtml = n.note
      ? '<div style="font-size:18px;font-weight:300;color:' + n.col + ';line-height:1.4;margin-bottom:16px;">' +
        esc(n.note) + '</div>'
      : '<div style="font-size:13px;color:#ccc;font-style:italic;margin-bottom:16px;">Passage surligné</div>';

    // Nom du profil + trace
    var traceLabel = { evidence: 'mise en évidence', dialogue: 'dialogue', note: 'note dans la marge' };
    var metaHtml = '<div style="font-size:10px;color:#bbb;text-transform:uppercase;letter-spacing:.1em;">' +
      esc(profiles[n.a.profile] ? profiles[n.a.profile].name : '') +
      (n.a.trace ? ' · ' + (traceLabel[n.a.trace] || n.a.trace) : '') + '</div>';

    // Bouton fermer
    var closeHtml = '<button onclick="this.parentNode._hidePopup()" style="position:absolute;top:12px;right:14px;' +
      'background:none;border:none;color:#bbb;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;"><svg viewBox="0 0 30.1 20.93" width="14" height="10" style="display:inline-block"><use href="#croix-svg"/></svg></button>';

    popupEl.innerHTML = closeHtml + passageHtml + noteHtml + metaHtml;
    popupEl._hidePopup = hidePopup;
    popupEl.style.display = 'block';

    // Position : à gauche du clic, centré verticalement
    var ph = popupEl.offsetHeight;
    var pw = 320;
    var px = screenX - pw - 16;
    if (px < 8) px = screenX + 16;
    var py = screenY - ph / 2;
    if (py < 8) py = 8;
    if (py + ph > H - 8) py = H - ph - 8;
    popupEl.style.left = px + 'px';
    popupEl.style.top  = py + 'px';
  }

  function hidePopup() {
    if (popupEl) popupEl.style.display = 'none';
    activeAnnotId = null;
    scheduleRender();
  }

  var activeAnnotId = null;

  // ── RENDER ───────────────────────────────────────────────────────────────────

  var rafId = null, lastFont = '';
  function sf(f) { if (f !== lastFont) { ctx.font = f; lastFont = f; } }

  function render() {
    if (!W || !H || !ctx) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    lastFont = '';

    recomputeAnchors();
    var lw = colW();
    var dynLayout = buildLayout(lw);

    // Facteurs de transition — texte toujours visible, annotations apparaissent en zoomant
    var tText  = Math.max(0.15, Math.min(1, (zoom - MIN_ZOOM) / (8 - MIN_ZOOM) * 0.85 + 0.15));
    var tAnnot = Math.max(0, Math.min(1, (zoom - 5) / 4));
    var sepFactor = Math.max(0, Math.min(1, (zoom - 8) / 6));

    // ── TRAITS ───────────────────────────────────────────────────────────────
    if (tAnnot > 0.01) {
      annotNodes.forEach(function(n) {
        var ay = n.anchorY + (n.ay - n.anchorY) * sepFactor;
        var scA = toScreen(0, n.anchorY);
        var scN = toScreen(n.ax, ay);
        ctx.save();
        ctx.globalAlpha = tAnnot * 0.18;
        ctx.strokeStyle = n.col;
        ctx.lineWidth = 0.7;
        ctx.setLineDash([2, 5]);
        ctx.beginPath(); ctx.moveTo(scN.sx, scN.sy); ctx.lineTo(scA.sx, scA.sy); ctx.stroke();
        ctx.setLineDash([]); ctx.restore();
      });
    }

    // ── ANNOTATIONS ──────────────────────────────────────────────────────────
    if (tAnnot > 0.01) {
      annotNodes.forEach(function(n) {
        if (!n.note) return;
        var ay = n.anchorY + (n.ay - n.anchorY) * sepFactor;
        var sc = toScreen(n.ax, ay);
        if (sc.sx < -W * 3 || sc.sx > W * 2 || sc.sy < -H * 2 || sc.sy > H * 2) return;
        var isActive = n.a.id === activeAnnotId;

        // Trace → graisse PPNeueMontreal
        var weight = n.a.trace === 'evidence' ? '700'
                   : n.a.trace === 'dialogue' ? '500'
                   : '300'; // note dans la marge = thin

        // Trace → letter-spacing
        var ls = n.a.trace === 'evidence' ? '-0.01em'
               : n.a.trace === 'note'     ? '0.06em'
               : '0.01em'; // dialogue = normal

        var baseBoost = Math.min(2.4, 1.05 + n.note.length / 55);
        var nfs = Math.max(10, Math.min(64, zoom * 1.3 * baseBoost));
        var wdth = 1; // pas de condensation sur les annotations dans la marge

        // Canvas ne supporte pas letter-spacing directement — on l'applique
        // en dessinant lettre par lettre si ls ≠ 0
        ctx.save();
        ctx.globalAlpha = tAnnot * (isActive ? 1 : 0.88);
        ctx.fillStyle = n.col;
        ctx.textAlign = 'left';
        ctx.translate(sc.sx, sc.sy);
        ctx.scale(wdth, 1);
        ctx.font = weight + ' ' + nfs.toFixed(1) + 'px PPNeueMontreal,DM Sans,sans-serif';
        lastFont = ctx.font;

        var lsEm = parseFloat(ls) || 0;
        var lsPx = lsEm * nfs;
        var parts = n.note.split(' '), line = '', ly = 0;
        var maxW = 32 * zoom / wdth;
        var lineH = nfs * 1.35;

        if (Math.abs(lsPx) < 0.5) {
          // Pas de letter-spacing : fillTextWrapped normal
          fillTextWrapped(ctx, n.note, 0, 0, maxW, lineH);
        } else {
          // Letter-spacing : on dessine mot par mot avec espacement supplémentaire
          var drawWithLS = function(text, x, y) {
            var chars = text.split('');
            var cx2 = x;
            chars.forEach(function(ch) {
              ctx.fillText(ch, cx2, y);
              cx2 += ctx.measureText(ch).width + lsPx;
            });
            return cx2 - x;
          };
          parts.forEach(function(word) {
            var test = line ? line + ' ' + word : word;
            var testW = ctx.measureText(test).width + lsPx * test.length;
            if (testW > maxW && line) {
              // draw line
              var dx = 0;
              line.split(' ').forEach(function(w2, wi) {
                if (wi > 0) dx += ctx.measureText(' ').width + lsPx;
                dx += drawWithLS(w2, dx, ly);
              });
              ly += lineH; line = word;
            } else { line = test; }
          });
          if (line) {
            var dx2 = 0;
            line.split(' ').forEach(function(w2, wi) {
              if (wi > 0) dx2 += ctx.measureText(' ').width + lsPx;
              dx2 += drawWithLS(w2, dx2, ly);
            });
          }
        }
        ctx.restore();
        ctx.globalAlpha = 1;
      });
    }

    // ── TEXTE ────────────────────────────────────────────────────────────────
    if (tText > 0.01) {
      // Index : mot → toutes les couleurs des profils qui l'ont annoté
      var wordColors = {};
      annotations.forEach(function(a) {
        if ((activeProfiles.length > 0 && activeProfiles.indexOf(parseInt(a.profile)) < 0) || !_postureMatch(a) || !_traceMatch(a)) return;
        var col = profiles[a.profile] ? profiles[a.profile].color : '#0d0d0d';
        a.spanIds.forEach(function(sid) {
          var idx = parseInt(sid.slice(1));
          if (!wordColors[idx]) wordColors[idx] = [];
          if (wordColors[idx].indexOf(col) < 0) wordColors[idx].push(col);
        });
      });

      var margin = 4 * zoom;
      dynLayout.forEach(function(item) {
        var m = item.meta;
        var sc = toScreen(item.x, item.y);
        var sx = sc.sx, sy = sc.sy;
        if (sx < -margin || sx > W + margin || sy < -margin * 2 || sy > H + margin * 2) return;
        var fs = Math.max(4, Math.min(200, zoom * m.sizeBoost));
        var isDialogue = m.trace === 'dialogue';
        sf('300 ' + fs.toFixed(1) + 'px ArizonaSerif,Georgia,serif');
        ctx.save();
        ctx.globalAlpha = tText * (m.a ? 1 : 0.92);
        ctx.fillStyle = m.a ? m.col : '#050505';
        ctx.textAlign = 'left';
        ctx.translate(sx, sy + m.waveY * zoom);
        ctx.scale(m.wdth, 1);
        if (isDialogue) {
          ctx.globalAlpha = tText * (0.4 + 0.5 * Math.abs(Math.sin(Date.now() / 400)));
          ctx.fillText(m.w.txt, 0, 0);
        } else {
          ctx.fillText(m.w.txt, 0, 0);
          if (m.trace === 'note') {
            ctx.globalAlpha = tText * 0.5;
            ctx.strokeStyle = m.col;
            ctx.lineWidth = Math.max(0.4, fs * 0.04);
            ctx.strokeText(m.w.txt, 0, 0);
          }
        }
        ctx.restore();

        // Contour multi-profils : stroke typographique autour des lettres
        // si le mot est annoté par 2+ profils
        var wColors = wordColors[m.w.idx];
        if (wColors && wColors.length > 1) {
          ctx.save();
          ctx.textAlign = 'left';
          ctx.translate(sx, sy + m.waveY * zoom);
          ctx.scale(m.wdth, 1);
          ctx.font = sf('300 ' + fs.toFixed(1) + 'px ArizonaSerif,Georgia,serif') || ctx.font;
          ctx.font = '300 ' + fs.toFixed(1) + 'px ArizonaSerif,Georgia,serif';
          var strokeW = Math.max(0.5, fs * 0.04);
          // Dessiner un stroke par couleur, légèrement décalé en épaisseur
          wColors.forEach(function(c, ci) {
            ctx.globalAlpha = tText * 0.6;
            ctx.strokeStyle = c;
            ctx.lineWidth = strokeW * (wColors.length - ci);
            ctx.lineJoin = 'round';
            ctx.strokeText(m.w.txt, 0, 0);
          });
          ctx.restore();
          ctx.globalAlpha = 1;
        }
      });
    }
  }

  function scheduleRender() {
    if (rafId) return;
    rafId = requestAnimationFrame(function() { rafId = null; render(); updateScrollbar(); });
  }

  // ── SCROLLBAR ────────────────────────────────────────────────────────────────
  var scrollEl = document.createElement('div');
  scrollEl.style.cssText = [
    'position:absolute;right:6px;top:8px;bottom:8px;width:4px;',
    'border-radius:2px;background:rgba(0,0,0,0.06);z-index:10;cursor:pointer;'
  ].join('');
  var thumbEl = document.createElement('div');
  thumbEl.style.cssText = [
    'position:absolute;left:0;right:0;border-radius:2px;',
    'background:rgba(0,0,0,0.22);transition:background .15s;cursor:grab;'
  ].join('');
  scrollEl.appendChild(thumbEl);
  container.appendChild(scrollEl);

  function updateScrollbar() {
    var lh = computeTotalHCur();
    var topPan  =  40 / zoom - H / (2 * zoom);
    var botPan  = (H - 40) / zoom - H / (2 * zoom) - lh;
    var range = topPan - botPan;
    if (range <= 0) { thumbEl.style.height = '100%'; thumbEl.style.top = '0'; return; }
    var trackH = scrollEl.offsetHeight;
    var thumbH = Math.max(24, trackH * (H / zoom) / lh);
    var progress = range > 0 ? (topPan - panY) / range : 0;
    thumbEl.style.height = thumbH + 'px';
    thumbEl.style.top = (progress * (trackH - thumbH)) + 'px';
  }

  var scrollDragging = false, scrollStartY = 0, scrollStartPanY = 0;
  thumbEl.addEventListener('mousedown', function(e) {
    scrollDragging = true; scrollStartY = e.clientY; scrollStartPanY = panY;
    e.preventDefault(); e.stopPropagation();
  });
  window.addEventListener('mousemove', function(e) {
    if (!scrollDragging) return;
    var lh = computeTotalHCur();
    var topPan  =  40 / zoom - H / (2 * zoom);
    var botPan  = (H - 40) / zoom - H / (2 * zoom) - lh;
    var range = topPan - botPan;
    var trackH = scrollEl.offsetHeight;
    var thumbH = Math.max(24, trackH * (H / zoom) / lh);
    var dy = e.clientY - scrollStartY;
    panY = scrollStartPanY - dy / (trackH - thumbH) * range;
    clampPanY(); updateScrollbar(); scheduleRender();
  });
  window.addEventListener('mouseup', function() { scrollDragging = false; });

  // ── RESIZE ───────────────────────────────────────────────────────────────────
  var firstResize = true;
  function resize() {
    var dpr = window.devicePixelRatio || 1;
    W = canvas.offsetWidth; H = canvas.offsetHeight;
    canvas.width  = W * dpr; canvas.height = H * dpr;
    ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    prevLW = -1;
    if (firstResize) { firstResize = false; fitAll(); } else { clampPanY(); }
    render();
  }
  new ResizeObserver(resize).observe(canvas);
  setTimeout(resize, 30);

  // ── INTERACTIONS — scroll vertical uniquement, pas de drag ──────────────────
  canvas.style.cursor = 'default';

  canvas.addEventListener('wheel', function(e) {
    e.preventDefault();
    panY -= e.deltaY / (zoom * 5);
    clampPanY(); scheduleRender();
  }, { passive: false });

  // Clic → popup annotation
  canvas.addEventListener('click', function(e) {
    var rect = canvas.getBoundingClientRect();
    var mx = e.clientX - rect.left, my = e.clientY - rect.top;
    var lw2 = colW();
    var dynL = buildLayout(lw2);
    var sepF = Math.max(0, Math.min(1, (zoom - 8) / 6));

    // Chercher d'abord dans les annotations (marge)
    var hitAnnot = null;
    annotNodes.forEach(function(n) {
      if (hitAnnot) return;
      var ay = n.anchorY + (n.ay - n.anchorY) * sepF;
      var sc = toScreen(n.ax, ay);
      var nfs = Math.max(10, Math.min(64, zoom * 1.3 * Math.min(2.4, 1.05 + (n.note || '').length / 55)));
      // Zone de hit approximative
      if (mx >= sc.sx - 4 && mx <= sc.sx + 200 && my >= sc.sy - nfs * 1.2 && my <= sc.sy + nfs * 0.5) {
        hitAnnot = n;
      }
    });

    if (hitAnnot) {
      if (activeAnnotId === hitAnnot.a.id) { hidePopup(); return; }
      activeAnnotId = hitAnnot.a.id;
      showPopup(hitAnnot, mx, my);
      scheduleRender(); return;
    }

    // Chercher dans le texte (mots annotés)
    var hitWord = null;
    for (var i = 0; i < dynL.length; i++) {
      var item = dynL[i];
      if (!item.meta.a) continue;
      var sc2 = toScreen(item.x, item.y);
      var ww = item.meta.normW * zoom;
      var wh = zoom * item.meta.sizeBoost * 1.4;
      if (mx >= sc2.sx && mx <= sc2.sx + ww && my >= sc2.sy - wh && my <= sc2.sy + 4) {
        hitWord = item.meta;
        break;
      }
    }
    if (hitWord && hitWord.a) {
      var n2 = annotNodes.find(function(n) { return n.a.id === hitWord.a.id; });
      if (n2) {
        activeAnnotId = n2.a.id;
        var sc3 = toScreen(hitWord.normW + 0.5, baseLayout.find(function(it) { return it.meta === hitWord; }) ? 0 : 0);
        showPopup(n2, mx, my);
        scheduleRender(); return;
      }
    }

    hidePopup();
    scheduleRender();
  });

  // Boutons zoom
  var btnStyle = 'position:absolute;bottom:20px;right:20px;width:36px;height:36px;' +
    'border:1px solid #ddd;background:#fff;font-size:18px;cursor:pointer;' +
    'display:flex;align-items:center;justify-content:center;border-radius:4px;line-height:1;';
  var zoomIn  = document.createElement('button');
  var zoomOut = document.createElement('button');
  zoomIn.textContent  = '+';
  zoomOut.textContent = '−';
  zoomIn.setAttribute('style',  btnStyle + 'bottom:62px;');
  zoomOut.setAttribute('style', btnStyle + 'bottom:20px;');
  container.appendChild(zoomIn);
  container.appendChild(zoomOut);

  zoomIn.addEventListener('click',  function() { applyZoom(zoom * 1.3); scheduleRender(); });
  zoomOut.addEventListener('click', function() { applyZoom(zoom * 0.77); scheduleRender(); });

  // Touch
  var lTX = 0, lTY = 0, lPD = 0;
  canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    if (e.touches.length === 1) { dragging = true; lTX = e.touches[0].clientX; lTY = e.touches[0].clientY; }
    else { dragging = false; lPD = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY); }
  }, { passive: false });
  canvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
    if (e.touches.length === 1 && dragging) {
      panX -= (e.touches[0].clientX-lTX)/zoom; panY -= (e.touches[0].clientY-lTY)/zoom;
      panX = Math.max(0, panX);
      lTX = e.touches[0].clientX; lTY = e.touches[0].clientY; clampPanY(); scheduleRender();
    } else if (e.touches.length === 2) {
      var d = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
      applyZoom(zoom * d / lPD); lPD = d; scheduleRender();
    }
  }, { passive: false });
  canvas.addEventListener('touchend', function() { dragging = false; });
}






// ── ANNOTATIONS PANEL ──
function toggleAnnotPanel() {
  var panel = document.getElementById('annot-panel');
  if (!panel) return;
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) buildAnnotPanel();
}

function buildAnnotPanel() {
  var list = document.getElementById('annot-panel-list');
  if (!list) return;
  list.innerHTML = '';
  if (!annotations.length) {
    list.innerHTML = '<div style="padding:16px;font-style:italic;color:#999;font-size:12px;">Aucune annotation</div>';
    return;
  }
  var TL = {'evidence':'mise en évidence','dialogue':'dialogue','note':'note'};
  annotations.forEach(function(a) {
    var pColor = profiles[parseInt(a.profile)] ? profiles[parseInt(a.profile)].color : '#333';
    var pName = profiles[parseInt(a.profile)] ? profiles[parseInt(a.profile)].name : 'lecteur.ice '+(parseInt(a.profile)+1);
    var passage = a.selText ? (a.selText.length>40 ? a.selText.slice(0,40)+'...' : a.selText) : '';
    var item = document.createElement('div');
    item.className = 'ap-item';
    var dot = document.createElement('span');
    dot.className = 'ap-dot'; dot.style.background = pColor;
    var nameEl = document.createElement('span');
    nameEl.className = 'ap-name'; nameEl.textContent = pName;
    var traceEl = document.createElement('span');
    traceEl.className = 'ap-trace'; traceEl.textContent = TL[a.trace]||a.trace;
    var del = document.createElement('button');
    del.className = 'ap-delete'; del.appendChild(_makeCrossSVG(14));
    del.onclick = (function(id){return function(){deleteAnnotation(id);};})(a.id);
    var header = document.createElement('div');
    header.className = 'ap-item-header';
    header.appendChild(dot); header.appendChild(nameEl); header.appendChild(traceEl); header.appendChild(del);
    var passEl = document.createElement('div');
    passEl.className = 'ap-passage'; passEl.textContent = '« '+passage+' »';
    var sel = document.createElement('select');
    sel.className = 'ap-select';
    Object.keys(TL).forEach(function(t){
      var opt = document.createElement('option');
      opt.value = t; opt.textContent = TL[t];
      if (a.trace===t) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.onchange = (function(id){return function(){editAnnotTrace(id,this.value);};})(a.id);
    var slider = document.createElement('input');
    slider.type='range'; slider.min=0; slider.max=100; slider.value=a.posture||50;
    slider.className='ap-posture';
    slider.onchange=(function(id){return function(){editAnnotPosture(id,parseInt(this.value));};})(a.id);
    var editRow = document.createElement('div');
    editRow.className='ap-edit-row';
    editRow.appendChild(sel); editRow.appendChild(slider);
    var noteArea = document.createElement('textarea');
    noteArea.className='ap-note-edit'; noteArea.value=a.note||''; noteArea.placeholder='Note...';
    noteArea.onchange=(function(id){return function(){editAnnotNote(id,this.value);};})(a.id);
    item.appendChild(header); item.appendChild(passEl); item.appendChild(editRow); item.appendChild(noteArea);
    list.appendChild(item);
  });
}

function deleteAnnotation(id) {
  var a=annotations.find(function(x){return x.id===id;});
  if(a) a.spanIds.forEach(function(sid){
    var w=wordById[sid];
    if(w&&!annotations.find(function(b){return b.id!==id&&b.spanIds.indexOf(sid)>=0;}))
      w.el.classList.remove('annotated');
  });
  annotations=annotations.filter(function(x){return x.id!==id;});
  updateAnnotCount(); buildAnnotPanel();
}
function editAnnotTrace(id,val){var a=annotations.find(function(x){return x.id===id;});if(a)a.trace=val;}
function editAnnotPosture(id,val){var a=annotations.find(function(x){return x.id===id;});if(a)a.posture=val;}
function editAnnotNote(id,val){var a=annotations.find(function(x){return x.id===id;});if(a)a.note=val;}

function toggleNeutral() {
  // Dans la vue orbitale, "texte neutre" retire les couleurs de profil
  isNeutral = !isNeutral;
  var btn = document.getElementById('btn-neutral');
  if (btn) btn.classList.toggle('active', isNeutral);
  buildGalleryHTML();
}

function toggleMonochrome() {
  isMonochrome = !isMonochrome;
  var btn = document.getElementById('btn-mono');
  if (btn) btn.classList.toggle('active', isMonochrome);
  buildGalleryHTML();
}

function exportCanvas() {
  var canvas = document.getElementById('orbital-canvas');
  if (!canvas) { alert('Aucune vue orbitale à exporter.'); return; }
  canvas.toBlob(function(blob) {
    var a = document.createElement('a');
    a.download = (docTitle||'marge').replace(/\s+/g,'_') + '.jpg';
    a.href = URL.createObjectURL(blob);
    a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 1000);
  }, 'image/jpeg', 0.93);
}

function handleJsonImportLive(input) {
  var f = input.files[0]; if (!f) return;
  var r = new FileReader();
  r.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);
      if (!data.annotations) { showToast('Fichier JSON invalide.', { error: true }); return; }

      if (data.themes && Array.isArray(data.themes)) {
        var themeIdMap = {};
        data.themes.forEach(function(th) {
          var existing = themes.filter(function(x){ return x.name === th.name; })[0];
          if (existing) {
            themeIdMap[th.id] = existing.id;
          } else {
            var newId = 'th' + Date.now() + Math.floor(Math.random()*100000);
            themes.push({ id: newId, name: th.name || '', color: th.color || '#FE572A' });
            themeIdMap[th.id] = newId;
          }
        });
        /* Remapper les themeId des annotations qu'on va importer */
        data.annotations.forEach(function(a) {
          if (a.themeId && themeIdMap[a.themeId]) a.themeId = themeIdMap[a.themeId];
        });
      }

      var matched = 0, unmatched = 0, structs = null, occurrenceCounter = {};
      data.annotations.forEach(function(a) {
        var passage = ((a.passage || a.selText || '')).trim();
        if (!passage) return;
        var spanIds;
        var aSpanIds = a.spanIds;
        // Utiliser les spanIds directement seulement s'ils correspondent vraiment
        // au passage dans ce document (sinon ça place l'annotation au mauvais endroit).
        if (aSpanIds && aSpanIds.length && wordById[aSpanIds[0]] && _spanIdsMatchPassageMulti(aSpanIds, passage)) {
          spanIds = aSpanIds;
        } else {
          if (!structs) structs = _buildMatchStructures();
          if (passage.indexOf(' / ') >= 0) {
            spanIds = _findMultiSegmentSpanIds(passage, occurrenceCounter, structs);
          } else {
            var key = _matchNormalize(passage);
            var occ = occurrenceCounter[key] || 0;
            occurrenceCounter[key] = occ + 1;
            spanIds = _findPassageSpanIds(passage, occ, structs);
          }
        }
        if (!spanIds || !spanIds.length) { unmatched++; return; }
        annotIdCtr++;
        annotations.push({
          id: 'a' + annotIdCtr, selText: passage, note: a.note || '',
          spanIds: spanIds, trace: a.trace || 'evidence', dialogue: !!(a.dialogue),
          posture: a.posture !== undefined ? parseInt(a.posture) : 50,
          profile: currentProfile,
          themeId: a.themeId || null, linked: a.linked || []
        });
        spanIds.forEach(function(sid) { var w = wordById[sid]; if (w) w.el.classList.add('annotated'); });
        matched++;
      });

      if (data.floatingThoughts) {
        data.floatingThoughts.forEach(function(t) {
          var validAnchor = t.anchorId && wordById[t.anchorId] ? t.anchorId : undefined;
          floatingThoughts.push({
            id: 'ft' + Date.now() + Math.random(), text: t.text || '',
            posture: t.posture !== undefined ? parseInt(t.posture) : 50,
            dialogue: !!(t.dialogue), profile: currentProfile, y: t.y || 0,
            anchorId: validAnchor,
            anchorOffset: validAnchor ? (t.anchorOffset || 0) : undefined
          });
        });
      }

      updateAnnotCount();
      input.value = '';
      scheduleAnnotRender();
      if (typeof buildMenuPostit === 'function') { buildMenuPostit(); buildFiltrePostit(); }
      var liveMsg = matched + ' annotations importées sur ' + data.annotations.length + '.';
      if (unmatched > 0) {
        liveMsg += '\n' + unmatched + ' passage(s) introuvable(s) dans ce texte ont été ignorés.';
      }
      showToast(liveMsg, { error: unmatched > 0, duration: unmatched > 0 ? 0 : 4200 });
    } catch(err) { showToast('Erreur d\'import\u00a0: ' + err.message, { error: true }); }
  };
  r.readAsText(f, 'UTF-8');
}

function exportAnnotationsJSON() {
  var profileIdx = parseInt(prompt('Numéro du profil à exporter (commence à 0) :'));
  if (isNaN(profileIdx)) return;
  var profAnnots = annotations.filter(function(a){ return parseInt(a.profile)===profileIdx; });
  if (!profAnnots.length) { alert('Aucune annotation pour ce profil.'); return; }
  var data = {
    profiles: profiles,
    annotations: profAnnots.map(function(a){
      return {
        passage: a.selText||'',
        note: a.note||'',
        trace: a.trace||'evidence',
        dialogue: !!(a.dialogue),
        posture: a.posture||50,
        profile: parseInt(a.profile),
        spanIds: a.spanIds||[]
      };
    }),
    floatingThoughts: floatingThoughts.filter(function(t){
      return parseInt(t.profile||0) === profileIdx;
    }).map(function(t) {
      return { text: t.text, posture: t.posture||50, dialogue: !!(t.dialogue),
               profile: parseInt(t.profile||0), y: t.y||0,
               anchorId: t.anchorId || null, anchorOffset: t.anchorOffset || 0 };
    })
  };
  var blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
  var url = URL.createObjectURL(blob);
  var link = document.createElement('a');
  var pName = profiles[profileIdx]?profiles[profileIdx].name:('profil_'+profileIdx);
  link.download = 'annotations_'+(docTitle||'marge').replace(/\s+/g,'_')+'_'+pName+'.json';
  link.href = url;
  link.click();
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
}

function toggleLegend() {
  var leg = document.getElementById('gal-legend'); if (!leg) return;
  leg.classList.toggle('hidden');
  if (!leg.classList.contains('hidden')) buildLegend(currentIntensity);
}
var highlightSet = {};
function drawHighlight() {
  renderLive();
}



// ── LEGEND ──
var TRACE_LABELS = { evidence:'◻ mise en évidence', dialogue:'↩ dialogue / réaction', note:'✎ note' };
function buildLegend(intensity) {
  var el = document.getElementById('gal-legend-content'); if (!el) return;
  el.innerHTML = '';
  annotations.forEach(function(a, i) {
    var div = document.createElement('div');
    div.className = 'legend-annot' + (highlightedAnnot===a.id?' highlighted':'');
    var pt = a.selText.length>40 ? a.selText.slice(0,40)+'…' : a.selText;
    var postureLabel = a.posture < 33 ? 'analytique' : a.posture > 66 ? 'personnel' : 'entre-deux';
    var pColor = profiles[a.profile]?profiles[a.profile].color:'#0d0d0d';
    var pName = profiles[a.profile]?profiles[a.profile].name:('lecteur.ice '+(a.profile+1));
    var html = '<div class="legend-annot-num">Annotation '+(i+1)+'</div>';
    html += '<div class="legend-annot-passage">« '+esc(pt)+' »</div>';
    if (a.note) html += '<div class="legend-annot-note">'+esc(a.note.slice(0,70))+'</div>';
    html += '<div class="legend-annot-meta">';
    html += '<span class="legend-meta-geste">'+(TRACE_LABELS[a.trace]||a.trace)+'</span>';
    html += '<span class="legend-meta-sep">·</span>';
    html += '<span class="legend-meta-regime">'+postureLabel+'</span>';
    html += '</div>';
    div.innerHTML = html;
    div.addEventListener('click', function() {
      highlightedAnnot = highlightedAnnot===a.id ? null : a.id;
      buildLegend(currentIntensity);
      renderLive();
    });
    el.appendChild(div);
  });

  // Floating thoughts
  if (floatingThoughts.length) {
    var sep = document.createElement('div');
    sep.className = 'legend-sep';
    sep.textContent = 'Pensées flottantes';
    el.appendChild(sep);
    floatingThoughts.forEach(function(t) {
      var div = document.createElement('div');
      div.className = 'legend-annot';
      div.innerHTML = '<div class="legend-annot-note">'+esc(t.text)+'</div>';
      el.appendChild(div);
    });
  }
}

// ── RESET ──
// ── TOGGLE OPACITÉ TEXTE NON-ANNOTÉ ──
function toggleDimUnannotated() {
  dimUnannotated = !dimUnannotated;
  var btn = document.getElementById('btn-dim-unannotated');
  if (btn) btn.classList.toggle('active', dimUnannotated);
  applyDimUnannotated();
}
function applyDimUnannotated() {
  words.forEach(function(w) {
    var isAnnotated = w.el.classList.contains('annotated');
    if (dimUnannotated && !isAnnotated) {
      w.el.style.opacity = '0.15';
    } else if (!isAnnotated) {
      w.el.style.opacity = '';
    }
  });
}

function toggleHideAnnotations() {
  hideAnnotations = !hideAnnotations;
  var btn = document.getElementById('btn-neutral-reading');
  if (btn) btn.classList.toggle('active', hideAnnotations);
  applyAnnotStyles();
  renderLiveMarginNotes();
  scheduleOverlayReposition();
}

function toggleMonochromeReading() {
  monochromeReading = !monochromeReading;
  var btn = document.getElementById('btn-monochrome-reading');
  if (btn) btn.classList.toggle('active', monochromeReading);
  applyAnnotStyles();
  renderLiveMarginNotes();
  scheduleOverlayReposition();
}

function resetAll() {
  /* Supprime uniquement les annotations, pensées flottantes et thèmes —
     conserve les profils, le titre/auteur, et reste dans la lecture */
  annotations = []; annotIdCtr = 0; floatingThoughts = [];
  themes = [];
  activeProfiles = [];
  activeTraceFilter = null;
  activePostureFilter = null;
  dimUnannotated = false;
  hideAnnotations = false;
  monochromeReading = false;
  _activeThemeFilter = null;

  /* Retirer la classe "annotated" et les styles inline posés par applyAnnotStyles */
  words.forEach(function(w) {
    w.el.classList.remove('annotated');
    w.el.style.color = '';
    w.el.style.fontSize = '';
    w.el.style.fontVariationSettings = '';
    w.el.style.fontFamily = '';
    w.el.style.opacity = '';
    w.el.style.cursor = '';
    w.el.style.position = '';
    w.el.style.zIndex = '';
    w.el.style.textShadow = '';
    w.el.onclick = null;
  });

  var mc = document.getElementById('margin-col');
  if (mc) mc.querySelectorAll('.live-margin-note,.floating-thought,.annot-bracket-margin').forEach(function(e){ e.remove(); });

  /* Nettoyer les overlays/SVG/inserts/labels de thèmes */
  document.querySelectorAll('.annot-overlay, .annot-dialogue-insert, .annot-ghost, .annot-bracket, .theme-riso-label, .theme-tab').forEach(function(n){ n.remove(); });

  var tip = document.querySelector('.margin-tooltip'); if (tip) tip.remove();
  if (typeof hideThemeBanner === 'function') hideThemeBanner();
  if (typeof closeThemesOverlay === 'function') closeThemesOverlay();

  updateAnnotCount();
  if (typeof buildMenuPostit === 'function') buildMenuPostit();
  if (typeof buildFiltrePostit === 'function') buildFiltrePostit();
  if (typeof buildAnnotPanel === 'function') buildAnnotPanel();
  applyDimUnannotated();
}

// ── HOVER on gallery canvas ──
function setupGalleryHover() {
  var mc = document.getElementById('gal-canvas');
  if (!mc || mc._hoverSetup) return;
  mc._hoverSetup = true;
  mc.addEventListener('mousemove', function(e) {
    if (!_lastLayout) return;
    var rect = mc.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;
    var BASE_FS = _lastFS;
    var hit = null;
    for (var i=0;i<_lastLayout.length;i++) {
      var item=_lastLayout[i];
      if (mx>=item.x-2&&mx<=item.x+item.ww+2&&my>=item.y-BASE_FS*1.1&&my<=item.y+BASE_FS*0.3){hit=item;break;}
    }
    var newHovered = null;
    if (hit) {
      var annotByWord={};
      annotations.forEach(function(a){
        a.spanIds.forEach(function(sid){
          var idx=parseInt(sid.slice(1));
          if(!annotByWord[idx])annotByWord[idx]=[];
          annotByWord[idx].push(a);
        });
      });
      var annots=annotByWord[hit.w.idx];
      if(annots&&annots.length>0) newHovered=annots[0].profile;
    }
    if(newHovered!==_hoveredProfile){
      _hoveredProfile=newHovered;
      if(renderRaf)cancelAnimationFrame(renderRaf);
      renderRaf=requestAnimationFrame(function(){renderLive();});
    }
  });
  mc.addEventListener('mouseleave',function(){
    if(_hoveredProfile!==null){_hoveredProfile=null;renderLive();}
  });
}

/* ═══════════════════════════════════════
   HOVER — passages liés + tooltip multi-profil
═══════════════════════════════════════ */
(function() {
  var tip = null;
  var _lastSid = null;

  function getTip() {
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'hover-tip';
      tip.style.cssText = [
        'position:fixed',
        'z-index:600',
        'background:rgba(253,252,249,0.82)',
        'backdrop-filter:blur(18px)',
        '-webkit-backdrop-filter:blur(18px)',
        'box-shadow:0 0 0 1.5px rgba(12,12,10,0.15),0 0 0 2px rgba(12,12,10,0.35),0 0 8px 3px rgba(12,12,10,0.18)',
        'padding:14px 20px 12px',
        'pointer-events:none',
        'display:none',
        'max-width:240px',
        'min-width:120px',
      ].join(';');
      document.body.appendChild(tip);
    }
    return tip;
  }

  function getWordAnnotMap() {
    var map = {};
    annotations.forEach(function(a) {
      if ((activeProfiles.length > 0 && activeProfiles.indexOf(parseInt(a.profile)) < 0) || !_postureMatch(a) || !_traceMatch(a)) return;
      a.spanIds.forEach(function(sid) {
        if (!map[sid]) map[sid] = [];
        map[sid].push(a);
      });
    });
    return map;
  }

  function _clearLinkedHighlight() {
    document.querySelectorAll('.hover-linked').forEach(function(el){
      el.classList.remove('hover-linked');
      el.style.removeProperty('text-shadow');
    });
  }

  // Apply glow to all words in linked segments of annotation a
  function _applyLinkedGlow(a) {
    if (!a.segments || a.segments.length <= 1) return;
    if (_activeThemeFilter && a.themeId !== _activeThemeFilter) return;
    var col = (profiles[a.profile] && profiles[a.profile].colorBold) || '#111';
    // Parse hex to rgb for glow
    var c = col.replace('#','');
    if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
    var r = parseInt(c.slice(0,2),16), g = parseInt(c.slice(2,4),16), b = parseInt(c.slice(4,6),16);
    var glow = '0 0 8px rgba('+r+','+g+','+b+',0.55), 0 0 2px rgba('+r+','+g+','+b+',0.35)';
    a.segments.forEach(function(seg) {
      for (var i = seg.lo; i <= seg.hi; i++) {
        if (!words[i]) continue;
        words[i].el.classList.add('hover-linked');
        // Stack with existing text-shadow if any
        var existing = words[i].el.style.textShadow;
        words[i].el.style.textShadow = existing ? existing + ', ' + glow : glow;
      }
    });
  }

  document.addEventListener('mousemove', function(e) {
    if (currentPhase !== 'lecture') return;
    var sp = e.target.closest && e.target.closest('span[data-idx]');
    var td = document.getElementById('text-display');
    if (!sp || !td || !td.contains(sp)) {
      getTip().style.display = 'none';
      _clearLinkedHighlight();
      _clearLinkedHighlight();
      _lastSid = null;
      return;
    }

    var sid = 'w' + sp.dataset.idx;
    if (sid === _lastSid) return; // no recompute when still on same word
    _lastSid = sid;

    var map = getWordAnnotMap();
    var annots = map[sid];
    _clearLinkedHighlight();

    // En mode filtre thème, ne montrer/glow que les annotations du thème actif
    if (annots && _activeThemeFilter) {
      annots = annots.filter(function(a){ return a.themeId != null && a.themeId === _activeThemeFilter; });
    }

    if (!annots || !annots.length) { getTip().style.display = 'none'; return; }

    // ── Glow on linked passages (single or multi-profile) ──
    annots.forEach(function(a) { _applyLinkedGlow(a); });

    // ── Tooltip only for multi-profile ──
    if (annots.length < 2) { getTip().style.display = 'none'; return; }

    var html = '';
    annots.forEach(function(a) {
      var p    = (a.profile < profiles.length) ? profiles[a.profile] : null;
      var col  = (p && p.colorBold) || '#111';
      var name = (p && p.name) || ('lecteur.ice ' + (a.profile + 1));
      var postureVal = (a.posture !== undefined) ? a.posture : 50;
      var postureLabel = postureVal < 35 ? 'analytique' : postureVal > 65 ? 'personnel' : 'entre-deux';
      var postureItalic = (postureVal < 35 || postureVal > 65);

      // Nom du profil — Migra light
      html += '<div style="display:flex;align-items:center;gap:7px;margin-bottom:2px;">'
            + '<span style="width:6px;height:6px;border-radius:50%;background:'+col+';flex-shrink:0;display:inline-block;"></span>'
            + '<span style="font-family:Migra,Georgia,serif;font-weight:200;font-size:18px;letter-spacing:-0.025em;line-height:1;color:'+col+';">'+esc(name)+'</span>'
            + '</div>';

      // Note — Migra light, même taille que postit-item
      if (a.note) {
        html += '<div style="font-family:Migra,Georgia,serif;font-weight:200;font-size:14px;letter-spacing:-0.01em;line-height:1.4;color:rgba(12,12,10,0.55);padding-left:13px;margin-bottom:6px;">'
              + esc(a.note.slice(0, 80)) + (a.note.length > 80 ? '\u2026' : '')
              + '</div>';
      }
    });

    var t = getTip();
    t.innerHTML = html;
    t.style.display = 'block';

    // Position: left of cursor by default (margin side)
    var tx = e.clientX - t.offsetWidth - 20;
    if (tx < 8) tx = e.clientX + 20;
    var ty = e.clientY - 12;
    if (ty + t.offsetHeight > window.innerHeight - 8) ty = window.innerHeight - t.offsetHeight - 8;
    t.style.left = tx + 'px';
    t.style.top  = ty + 'px';
  });

  document.addEventListener('mouseleave', function() {
    if (tip) tip.style.display = 'none';
    _clearLinkedHighlight();
    _lastSid = null;
  }, true);
})();


// ── THROTTLED RENDER ──
var _annotRafPending = false;
var _annotRenderTimer = null;
function scheduleAnnotRender() {
  if (_annotRafPending) return;
  _annotRafPending = true;
  requestAnimationFrame(function() {
    _annotRafPending = false;
    applyAnnotStyles();
    // Re-apply theme filter after applyAnnotStyles resets all word classes/styles
    if (_activeThemeFilter) {
      var td2 = document.getElementById('text-display');
      if (td2) td2.classList.add('theme-filter-mode');
      // Construire l'ensemble des spanIds appartenant au thème actif (comparaison stricte)
      var themeSpanIds = {};
      annotations.filter(function(a){ return a.themeId != null && a.themeId === _activeThemeFilter; }).forEach(function(a) {
        a.spanIds.forEach(function(sid) {
          themeSpanIds[sid] = true;
          var w = wordById[sid];
          if (w) { w.el.classList.add('theme-active-span'); w.el.style.opacity = '1'; }
        });
      });
      // Dimmer les mots annotés qui ne sont pas dans le thème
      words.forEach(function(w) {
        if (w.el.classList.contains('annotated') && !themeSpanIds[w.el.id]) {
          w.el.style.opacity = '0.1';
        }
      });
    }
    renderLiveMarginNotes();
  });
}

// On scroll: throttle with rAF, reposition overlays and margin notes
var _repositionRafPending = false;
function scheduleOverlayReposition() {
  if (_repositionRafPending) return;
  _repositionRafPending = true;
  requestAnimationFrame(function() {
    _repositionRafPending = false;
    _repositionOverlays();
    // On recharge le layout complet des notes (anti-chevauchement inclus)
    // plutôt que de juste translater les positions existantes, ce qui
    // annulerait le quinconce calculé dans renderLiveMarginNotes.
    renderLiveMarginNotes();
  });
}

// Redimensionnement de la fenêtre : tout ce qui est positionné en marge
// (notes, postits de thème, crochets, surlignages) est calculé une fois
// en pixels absolus à partir des dimensions courantes (largeur de
// margin-col, position des mots). Le texte se réajuste nativement via
// CSS au resize, mais ces positions JS restaient figées tant que rien
// ne les recalculait — d'où un décalage visible dès qu'on agrandit ou
// réduit la fenêtre. On recalcule tout après un court débounce (le
// resize peut déclencher des dizaines d'événements par seconde pendant
// un drag de bord de fenêtre).
var _resizeDebounce = null;
window.addEventListener('resize', function() {
  if (currentPhase !== 'lecture') return;
  if (_resizeDebounce) clearTimeout(_resizeDebounce);
  _resizeDebounce = setTimeout(function() {
    scheduleAnnotRender();
  }, 150);
});

function _repositionMarginNotes() {
  var mc = document.getElementById('margin-col');
  var rz = document.getElementById('reading-zone');
  if (!mc || !rz) return;
  var rzRect = rz.getBoundingClientRect(), scrollT = rz.scrollTop;
  mc.querySelectorAll('.live-margin-note[data-annot-id]').forEach(function(div) {
    var a = annotations.filter(function(x){ return x.id === div.dataset.annotId; })[0]; if (!a) return;
    var fw = wordById[a.spanIds[0]], lw = wordById[a.spanIds[a.spanIds.length-1]];
    if (!fw) return;
    var rFw = fw.el.getBoundingClientRect(), rLw = lw ? lw.el.getBoundingClientRect() : rFw;
    var midPx = ((rFw.top+rFw.bottom)/2 + (rLw.top+rLw.bottom)/2) / 2;
    div.style.top = (midPx - rzRect.top + scrollT) + 'px';
  });
  mc.querySelectorAll('.annot-bracket-margin[data-annot-id]').forEach(function(svg) {
    var a = annotations.filter(function(x){ return x.id === svg.dataset.annotId; })[0]; if (!a) return;
    var fw = wordById[a.spanIds[0]], lw = wordById[a.spanIds[a.spanIds.length-1]]; if (!fw||!lw) return;
    var rFw = fw.el.getBoundingClientRect(), rLw = lw.el.getBoundingClientRect();
    var topDoc = rFw.top - rzRect.top + scrollT;
    var height = Math.max(rLw.bottom - rzRect.top + scrollT - topDoc, 8);
    svg.style.top = topDoc + 'px';
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', '0 0 ' + svg.getAttribute('width') + ' ' + height);
    var pth = svg.querySelector('path');
    if (pth) {
      if (svg.classList.contains('crochet-bracket')) {
        // Repositionnement vertical uniquement — ne pas toucher width/viewBox/path
        // pour ne pas écraser l'état étendu du hover (_setCrochetHover)
        svg.dataset.yTop = topDoc;
        svg.dataset.yBottom = topDoc + height;
      } else {
        var sw=1.5,bx=sw/2,ax=parseFloat(svg.getAttribute('width'))-sw/2,y0=sw/2,y1=height-sw/2;
        pth.setAttribute('d','M'+ax+','+y0+' L'+bx+','+y0+' L'+bx+','+y1+' L'+ax+','+y1);
      }
    }
  });
}

function _repositionOverlays() {
  var td = document.getElementById('text-display');
  if (!td) return;
  td.querySelectorAll('.annot-overlay').forEach(function(n){ n.remove(); });
  if (hideAnnotations) return;
  var tdRect = td.getBoundingClientRect();

  // Batch-read all rects first to avoid layout thrashing
  var batchRects = {};
  annotations.forEach(function(a) {
    if ((activeProfiles.length > 0 && activeProfiles.indexOf(parseInt(a.profile)) < 0) || !_postureMatch(a) || !_traceMatch(a)) return;
    if (a.trace === 'dialogue' || a.trace === 'crochet') return;
    a.spanIds.forEach(function(sid) {
      if (!batchRects[sid]) {
        var ww = wordById[sid];
        if (ww) {
          /* getClientRects() donne les bornes exactes des glyphes,
             sans les espaces étirés par text-align:justify */
          var rects = ww.el.getClientRects();
          var arr = [];
          for (var ri=0; ri<rects.length; ri++) {
            if (rects[ri].width >= 0.5) arr.push(rects[ri]);
          }
          batchRects[sid] = arr;
        }
      }
    });
  });

  annotations.forEach(function(a) {
    if ((activeProfiles.length > 0 && activeProfiles.indexOf(parseInt(a.profile)) < 0) || !_postureMatch(a) || !_traceMatch(a)) return;
    var col = pcolor(a.profile, true);
    var trace = a.trace;
    if (trace === 'dialogue' || trace === 'crochet') return;

    /* Collecter tous les rects individuels (un par ligne par mot) */
    var allRects = [];
    a.spanIds.forEach(function(sid) {
      var rects = batchRects[sid];
      if (!rects) return;
      rects.forEach(function(r) {
        allRects.push({top:r.top, bottom:r.bottom, left:r.left, right:r.right});
      });
    });
    if (!allRects.length) return;

    /* Trier par baseline (bottom) puis par position horizontale (left).
       On utilise bottom plutôt que top : les mots d'une même ligne partagent
       la même baseline quelle que soit la variation sub-pixel de leur top. */
    var lineTol = 6;
    allRects.sort(function(p,q){
      return Math.abs(p.bottom-q.bottom) < lineTol ? p.left-q.left : p.bottom-q.bottom;
    });

    var lines = [];
    allRects.forEach(function(r) {
      if (!lines.length) { lines.push({top:r.top,bottom:r.bottom,left:r.left,right:r.right}); return; }
      var last = lines[lines.length-1];
      if (Math.abs(r.bottom-last.bottom) < lineTol) {
        last.left   = Math.min(last.left,   r.left);
        last.right  = Math.max(last.right,  r.right);
        last.top    = Math.min(last.top,    r.top);
        last.bottom = Math.max(last.bottom, r.bottom);
      } else {
        lines.push({top:r.top,bottom:r.bottom,left:r.left,right:r.right});
      }
    });
    if (!lines.length) return;

    if (trace === 'evidence') {
      var lightCol = pcolor(a.profile, false);
      lines.forEach(function(lg) {
        var el = document.createElement('div');
        el.className = 'annot-overlay';
        el.dataset.annotId = a.id;
        el.style.cssText = ['position:absolute','left:'+(lg.left-tdRect.left)+'px','top:'+(lg.bottom-tdRect.top-2)+'px','width:'+(lg.right-lg.left)+'px','height:5px','background:'+lightCol,'mix-blend-mode:multiply','pointer-events:none','z-index:3'].join(';');
        if (_activeThemeFilter && a.themeId === _activeThemeFilter) el.classList.add('theme-active-overlay');
        td.appendChild(el);
      });
    } else if (trace === 'entoure') {
      var boldCol2=pcolor(a.profile, false);
      lines.forEach(function(lg,li){
        var h=lg.bottom-lg.top;
        var W2=lg.right-lg.left+12;
        var H2=h*0.80;
        var padX=6,padY=2;
        var amp=H2*(0.04+(li%3)*0.01);
        var freq=0.006+(li%2)*0.002;
        var pts=48,topPts=[],botPts=[];
        var offsetY=h*0.10;
        for(var pi=0;pi<=pts;pi++){var rx=(pi/pts)*W2;var wave=amp*Math.sin(rx*freq*Math.PI*2+li*1.3);topPts.push(rx+','+(padY+offsetY+wave).toFixed(2));botPts.push(rx+','+(padY+offsetY+H2+wave).toFixed(2));}
        function _ptsCurve(pp){if(pp.length<2)return'M'+pp[0];var dd='M'+pp[0];for(var kk=1;kk<pp.length;kk++){var pv=pp[kk-1].split(',').map(Number);var cu=pp[kk].split(',').map(Number);var cx=(pv[0]+cu[0])/2;dd+=' Q'+cx+','+pv[1]+' '+cu[0]+','+cu[1];}return dd;}
        var topC=_ptsCurve(topPts);var botC=_ptsCurve(botPts.slice().reverse());
        var d=topC+' L'+botPts[pts]+' '+botC.slice(1)+' Z';
        var svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
        var svgH=H2+padY*2+amp*2;
        svg.setAttribute('width',W2+padX*2);svg.setAttribute('height',svgH);svg.setAttribute('viewBox','0 0 '+(W2+padX*2)+' '+svgH);
        svg.className.baseVal='annot-overlay';
        svg.style.cssText=['position:absolute','left:'+(lg.left-tdRect.left-padX)+'px','top:'+(lg.top-tdRect.top-padY)+'px','pointer-events:none','z-index:0','overflow:visible'].join(';');
        var path=document.createElementNS('http://www.w3.org/2000/svg','path');
        path.setAttribute('d',d);path.setAttribute('fill',boldCol2);
        path.setAttribute('style','mix-blend-mode:difference;opacity:0.35');
        svg.appendChild(path);td.appendChild(svg);
      });
    } else if (trace === 'note') {
      var borderCol=pcolor(a.profile, true);
      var px=5,py=3;
      lines.forEach(function(lg){
        var el=document.createElement('div');
        el.className='annot-overlay';
        el.style.cssText=['position:absolute','left:'+(lg.left-tdRect.left-px)+'px','top:'+(lg.top-tdRect.top-py)+'px','width:'+(lg.right-lg.left+px*2)+'px','height:'+(lg.bottom-lg.top+py*2)+'px','border:2px solid '+borderCol,'border-radius:20px','pointer-events:none','z-index:3'].join(';');
        td.appendChild(el);
      });
    }
  });
}


// ── FILTRE SVG DOUBLE-CONTOUR pour trace 'note' ──
// Crée (une seule fois par couleur) un filtre SVG feMorphology qui dilate le texte
// en deux couches : couleur-large (externe) + blanc-medium (interne) + texte original
var _noteFilterCache = {};
function _ensureNoteFilter(col) {
  if (_noteFilterCache[col]) return _noteFilterCache[col];
  var safeId = 'note-filter-' + col.replace('#','');
  _noteFilterCache[col] = safeId;
  // Récupérer ou créer le container SVG defs
  var defs = document.getElementById('riso-svg-defs');
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg','svg');
    defs.id = 'riso-svg-defs';
    defs.setAttribute('aria-hidden','true');
    defs.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;';
    var defsEl = document.createElementNS('http://www.w3.org/2000/svg','defs');
    defs.appendChild(defsEl);
    document.body.insertBefore(defs, document.body.firstChild);
  }
  var svgDefs = defs.querySelector('defs');
  if (!svgDefs) {
    svgDefs = document.createElementNS('http://www.w3.org/2000/svg','defs');
    defs.appendChild(svgDefs);
  }
  // Ne pas recréer si déjà présent
  if (svgDefs.querySelector('#' + safeId)) return safeId;
  // Couleur → rgb() pour les flood
  var hex = col.replace('#','');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  var r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
  // Filtre : 3 passes superposées
  // 1. Dilate couleur (grande) — couche externe
  // 2. Dilate blanc (moyenne) — halo blanc
  // 3. Source originale par-dessus
  var f = document.createElementNS('http://www.w3.org/2000/svg','filter');
  f.setAttribute('id', safeId);
  f.setAttribute('x','-30%'); f.setAttribute('y','-80%');
  f.setAttribute('width','160%'); f.setAttribute('height','260%');
  f.setAttribute('color-interpolation-filters','sRGB');
  // Technique "blob arrondi" : blur → threshold → flood
  // Couche EXTERNE couleur (grand blur + seuil bas = coins très arrondis)
  // Couche INTERNE blanche (blur moyen)
  // Texte original par-dessus
  f.innerHTML =
    // ── Couche externe couleur ──
    '<feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur-col"/>' +
    '<feColorMatrix in="blur-col" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 18 -6" result="thresh-col"/>' +
    '<feFlood flood-color="rgb('+r+','+g+','+b+')" flood-opacity="1" result="flood-col"/>' +
    '<feComposite in="flood-col" in2="thresh-col" operator="in" result="stroke-col"/>' +
    // ── Couche interne blanche ──
    '<feGaussianBlur in="SourceAlpha" stdDeviation="2.8" result="blur-white"/>' +
    '<feColorMatrix in="blur-white" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 22 -8" result="thresh-white"/>' +
    '<feFlood flood-color="white" flood-opacity="1" result="flood-white"/>' +
    '<feComposite in="flood-white" in2="thresh-white" operator="in" result="stroke-white"/>' +
    // ── Merge : couleur externe + blanc interne + texte ──
    '<feMerge>' +
      '<feMergeNode in="stroke-col"/>' +
      '<feMergeNode in="stroke-white"/>' +
      '<feMergeNode in="SourceGraphic"/>' +
    '</feMerge>';
  svgDefs.appendChild(f);
  return safeId;
}

function applyAnnotStyles() {
  // Reset: only touch words that have been styled (faster for large texts)
  var resetList = words.filter(function(w){ return w.el.classList.contains('annotated') || w.el.style.cssText; });
  resetList.forEach(function(w) {
    // Restaurer onclick si dialogue
    if (w.el.onclick) w.el.onclick = null;
    w.el.classList.remove('annotated');
    w.el.removeAttribute('style');
    w.el.className = 'word';
  });
  if (!resetList.length) {
    words.forEach(function(w) { w.el.className = 'word'; });
  }
  var td0 = document.getElementById('text-display');
  if (td0) td0.querySelectorAll('.annot-overlay, .annot-dialogue-insert, .annot-ghost, .annot-bracket, .theme-riso-label, .theme-tab').forEach(function(n){ n.remove(); });
  // Note: .annot-bracket-margin is owned by renderLiveMarginNotes, not cleared here

  // "texte neutre" : lecture brute, aucune annotation/geste affiché
  if (hideAnnotations) return;

  // ── Map mot → annotations ordonnées ──
  var wordAnnotMap = {};
  annotations.forEach(function(a) {
    if ((activeProfiles.length > 0 && activeProfiles.indexOf(parseInt(a.profile)) < 0) || !_postureMatch(a) || !_traceMatch(a)) return;
    a.spanIds.forEach(function(sid) {
      if (!wordAnnotMap[sid]) wordAnnotMap[sid] = [];
      wordAnnotMap[sid].push(a);
    });
  });

  // Reset dialogue segment cache
  annotations.forEach(function(a) { delete a._dsi; });

  annotations.forEach(function(a) {
    if ((activeProfiles.length > 0 && activeProfiles.indexOf(parseInt(a.profile)) < 0) || !_postureMatch(a) || !_traceMatch(a)) return;

    var col     = pcolor(a.profile, false);
    var post    = (a.posture != null ? a.posture : 50) / 100;
    var trace   = a.trace;

    var noteWght = 400; // graisse fixe

    a.spanIds.forEach(function(sid) {
      var w = wordById[sid];
      if (!w) return;
      w.el.classList.add('annotated');

      var annots = wordAnnotMap[sid] || [a];
      var nAnnots = annots.length;

      // Taille fixe — pas de boost de taille, on utilise le poids
      w.el.style.fontSize = '100%';
      // Poids : 400 pour 1 annotateur, plus gras pour plusieurs (multi-profil)
      var multiAnnotWght = nAnnots > 1
        ? Math.min(700, 400 + (nAnnots - 1) * 100)
        : noteWght;
      w.el.style.fontVariationSettings = '"wght" ' + multiAnnotWght;

      if (a.dialogue && a.note && a.note.trim()) {
        // DIALOGUE : texte original visible + [note] inséré DANS le texte après le passage
        var dCol = pcolor(a.profile, true);
        // Style du passage — couleur + poids variable
        w.el.style.color = dCol;
        w.el.style.cursor = 'pointer';
        w.el.onclick = (function(id) {
          return function(e) { e.stopPropagation(); openEditPopup(id); };
        })(a.id);

        // Insérer [note] après le DERNIER span — une seule fois par annotation
        var lastSpanId = a.spanIds[a.spanIds.length - 1];
        if (sid === lastSpanId && !document.getElementById('dialogue-insert-' + a.id)) {
          var insert = document.createElement('span');
          insert.id = 'dialogue-insert-' + a.id;
          insert.className = 'annot-dialogue-insert';
          insert.dataset.annotId = a.id;
          insert.style.cssText = [
            'display:inline',
            'color:' + dCol,
            'font-family:Arizona,ABCArizonaSuperfamilyVariable-Trial,ArizonaSerif,Georgia,serif',
            'font-variation-settings:"wght" 700, "wdth" 75, "SRFF" 25, "slnt" 0',
            'font-size:1.45em',
            'letter-spacing:-0.02em',
            'cursor:pointer',
            'margin-left:0.18em',
          ].join(';');
          insert.textContent = '[' + a.note + ']';
          insert.onclick = (function(id) {
            return function(e) { e.stopPropagation(); openEditPopup(id); };
          })(a.id);
          // Hover sur le dialogue → shadow sur le passage, comme les notes en marge
          (function(annot2, ins) {
            ins.addEventListener('mouseenter', function() {
              var dColHover = pcolor(annot2.profile, true);
              ins.style.textShadow = '0 0 12px ' + dColHover + ', 0 0 4px ' + dColHover;
              annot2.spanIds.forEach(function(sid) {
                var wh = wordById[sid]; if (!wh) return;
                wh.el.style.textShadow = '0 0 12px ' + dColHover + ', 0 0 4px ' + dColHover;
              });
            });
            ins.addEventListener('mouseleave', function() {
              ins.style.textShadow = '';
              annot2.spanIds.forEach(function(sid) {
                var wh = wordById[sid]; if (!wh) return;
                wh.el.style.textShadow = '';
              });
            });
          })(a, insert);
          // Insérer [note] juste après le dernier mot du passage — élément
          // inline normal : il s'écoule avec le texte et passe à la ligne
          // naturellement, sans casser le mot précédent ni forcer un
          // retour à la ligne dans le vide.
          w.el.parentNode.insertBefore(insert, w.el.nextSibling);
        }

            } else if (trace === 'entoure') {
        var boldEntoure = pcolor(annots[0].profile, true);
        w.el.style.color = boldEntoure;
        w.el.style.fontVariationSettings = '"wght" ' + noteWght;
        w.el.style.position = 'relative';
        w.el.style.zIndex = '3';
        w.el.style.textShadow = '';
      } else if (trace === 'note') {
        var noteCol = pcolor(annots[0].profile, true);
        w.el.style.color = noteCol;
        w.el.style.fontVariationSettings = '"wght" ' + noteWght;
      } else {
        var baseCol = pcolor(annots[0].profile, true);
        w.el.style.color = baseCol;
        w.el.style.fontVariationSettings = '"wght" ' + noteWght;
        if (annots.length > 1) {
          // Multi-profils : text-shadow décalé léger pour chaque profil supplémentaire
          var shadows = [];
          for (var k = 1; k < annots.length; k++) {
            var sCol = pcolor(annots[k].profile, true);
            // Offset alterné gauche/droite, minimal pour rester lisible
            var dy2 = k * 1.5;
            var dx2 = k % 2 === 0 ? 0.3 : -0.3;
            shadows.push(dx2 + 'px ' + dy2 + 'px 0 ' + sCol);
          }
          w.el.style.textShadow = shadows.join(', ');
        } else {
          w.el.style.textShadow = '';
        }
      }
    });

  });  // fin annotations.forEach

  // ── Opacité texte non-annoté ──
  applyDimUnannotated();
  // Un seul rAF pour tous les overlays (DOM repeint avant les rects)
  requestAnimationFrame(function() {
    var td = document.getElementById('text-display');
    if (!td) return;
    td.querySelectorAll('.annot-overlay').forEach(function(n){ n.remove(); });
    var tdRect = td.getBoundingClientRect();

    // ── Batch-read all span rects BEFORE writing any DOM ──
    var allSpanRects = {};
    annotations.forEach(function(a) {
      if ((activeProfiles.length > 0 && activeProfiles.indexOf(parseInt(a.profile)) < 0) || !_postureMatch(a) || !_traceMatch(a)) return;
      if (a.trace === 'dialogue' || a.trace === 'crochet') return;
      a.spanIds.forEach(function(sid) {
        if (allSpanRects[sid]) return;
        var ww = wordById[sid];
        if (ww) allSpanRects[sid] = ww.el.getBoundingClientRect();
      });
    });

    annotations.forEach(function(a) {
      if ((activeProfiles.length > 0 && activeProfiles.indexOf(parseInt(a.profile)) < 0) || !_postureMatch(a) || !_traceMatch(a)) return;
      var col   = pcolor(a.profile, true);
      var trace = a.trace;

      var lineMap = {};
      a.spanIds.forEach(function(sid) {
        var r = allSpanRects[sid];
        if (!r) return;
        var key = Math.round(r.bottom / 6) * 6; // group by baseline
        if (!lineMap[key]) {
          lineMap[key] = { top:r.top, bottom:r.bottom, left:r.left, right:r.right };
        } else {
          lineMap[key].left   = Math.min(lineMap[key].left,   r.left);
          lineMap[key].right  = Math.max(lineMap[key].right,  r.right);
          lineMap[key].bottom = Math.max(lineMap[key].bottom, r.bottom);
          lineMap[key].top    = Math.min(lineMap[key].top,    r.top);
        }
      });
      var lines = Object.keys(lineMap).sort(function(a,b){return +a-+b;}).map(function(k){ return lineMap[k]; });
      if (!lines.length) return;

      // Mark if this annotation is being edited
      var isEditTarget = td.dataset.editAnnotId && td.dataset.editAnnotId === a.id;

      if (trace === 'evidence') {

        lines.forEach(function(lg) {
          var el = document.createElement('div');
          el.className = 'annot-overlay' + (isEditTarget ? ' edit-overlay-highlighted' : '');
          el.dataset.annotId = a.id;
          if (_activeThemeFilter && a.themeId === _activeThemeFilter) el.classList.add('theme-active-overlay');
          el.style.cssText = [
            'position:absolute',
            'left:'  + (lg.left   - tdRect.left)     + 'px',
            'top:'   + (lg.bottom - tdRect.top - 3)  + 'px',
            'width:' + (lg.right  - lg.left)          + 'px',
            'height:3px',
            'background:' + col,
            'mix-blend-mode:multiply',
            'pointer-events:none',
            'z-index:3',
          ].join(';');
          td.appendChild(el);
        });

      } else if (trace === 'entoure') {
        var boldCol = pcolor(a.profile, false);
        lines.forEach(function(lg, li) {
          var h = lg.bottom - lg.top;
          var W2 = lg.right - lg.left + 12;
          var H2 = h * 0.80;
          var padX = 6, padY = 2;
          var amp = H2 * (0.04 + (li % 3) * 0.01);
          var freq = 0.006 + (li % 2) * 0.002;
          var pts = 48;
          var topPts = [], botPts = [];
          var offsetY = h * 0.10;
          for (var pi = 0; pi <= pts; pi++) {
            var rx = (pi / pts) * W2;
            var wave = amp * Math.sin(rx * freq * Math.PI * 2 + li * 1.3);
            topPts.push(rx + ',' + (padY + offsetY + wave).toFixed(2));
            botPts.push(rx + ',' + (padY + offsetY + H2 + wave).toFixed(2));
          }
          function ptsToCurve(pts) {
            if (pts.length < 2) return 'M' + pts[0];
            var d2 = 'M' + pts[0];
            for (var k = 1; k < pts.length; k++) {
              var prev = pts[k-1].split(',').map(Number);
              var cur  = pts[k].split(',').map(Number);
              var cpx  = (prev[0] + cur[0]) / 2;
              d2 += ' Q' + cpx + ',' + prev[1] + ' ' + cur[0] + ',' + cur[1];
            }
            return d2;
          }
          var topCurve = ptsToCurve(topPts);
          var botCurve = ptsToCurve(botPts.slice().reverse());
          var d = topCurve + ' L' + botPts[pts] + ' ' + botCurve.slice(1) + ' Z';
          var svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
          var svgH = H2 + padY * 2 + amp * 2;
          svg.setAttribute('width', W2 + padX * 2);
          svg.setAttribute('height', svgH);
          svg.setAttribute('viewBox', '0 0 ' + (W2 + padX * 2) + ' ' + svgH);
          svg.className.baseVal = 'annot-overlay' + (isEditTarget ? ' edit-overlay-highlighted' : '');
          svg.dataset.annotId = a.id;
          if (_activeThemeFilter && a.themeId === _activeThemeFilter) svg.classList.add('theme-active-overlay');
          svg.style.cssText = [
            'position:absolute',
            'left:'   + (lg.left - tdRect.left - padX) + 'px',
            'top:'    + (lg.top  - tdRect.top  - padY) + 'px',
            'pointer-events:none',
            'z-index:0',
            'overflow:visible',
          ].join(';');
          var path = document.createElementNS('http://www.w3.org/2000/svg','path');
          path.setAttribute('d', d);
          path.setAttribute('fill', boldCol);
          path.setAttribute('style', 'mix-blend-mode:difference;opacity:0.35');
          svg.appendChild(path);
          td.appendChild(svg);
        });

      } else if (trace === 'note') {
        var borderCol = pcolor(a.profile, true);
        var px = 5, py = 3;
        lines.forEach(function(lg) {
          var el = document.createElement('div');
          el.className = 'annot-overlay' + (isEditTarget ? ' edit-overlay-highlighted' : '');
          el.dataset.annotId = a.id;
          if (_activeThemeFilter && a.themeId === _activeThemeFilter) el.classList.add('theme-active-overlay');
          el.style.cssText = [
            'position:absolute',
            'left:'   + (lg.left  - tdRect.left - px) + 'px',
            'top:'    + (lg.top   - tdRect.top  - py) + 'px',
            'width:'  + (lg.right - lg.left + px * 2) + 'px',
            'height:' + (lg.bottom - lg.top  + py * 2) + 'px',
            'border:2px solid ' + borderCol,
            'border-radius:20px',
            'pointer-events:none',
            'z-index:3',
          ].join(';');
          td.appendChild(el);
        });
      }
    });

    // ── Postits thème — rectangles fins collés au bord gauche, qui
    // s'élargissent au hover pour révéler le nom du thème ──
    document.querySelectorAll('.theme-tab').forEach(function(n){ n.remove(); });
    var themeTabData = [];
    annotations.forEach(function(a) {
      if (!a.themeId) return;
      if ((activeProfiles.length > 0 && activeProfiles.indexOf(parseInt(a.profile)) < 0) || !_postureMatch(a) || !_traceMatch(a)) return;
      var th = themes.find(function(x){ return x.id === a.themeId; });
      if (!th) return;
      var firstW = wordById[a.spanIds[0]];
      var lastW  = wordById[a.spanIds[a.spanIds.length - 1]];
      if (!firstW) return;
      var rFirst = firstW.el.getBoundingClientRect();
      var rLast  = lastW ? lastW.el.getBoundingClientRect() : rFirst;
      if (!rFirst.width || !rFirst.height) return;
      var rz2  = document.getElementById('reading-zone');
      var rzRect2 = rz2 ? rz2.getBoundingClientRect() : {top:0};
      var scrollT2 = rz2 ? rz2.scrollTop : 0;
      var topY    = Math.min(rFirst.top, rLast.top) - rzRect2.top + scrollT2;
      var bottomY = Math.max(rFirst.bottom, rLast.bottom) - rzRect2.top + scrollT2;
      themeTabData.push({ th: th, topY: topY, bottomY: bottomY, annotId: a.id });
    });

    // Fusionner les tabs d'un même thème qui se chevauchent verticalement
    // (évite plusieurs postits identiques côte à côte pour un même thème).
    themeTabData.sort(function(a, b){ return a.topY - b.topY; });
    var mergedTabs = [];
    themeTabData.forEach(function(item) {
      var prev = mergedTabs[mergedTabs.length - 1];
      if (prev && prev.th.id === item.th.id && item.topY <= prev.bottomY + 8) {
        prev.bottomY = Math.max(prev.bottomY, item.bottomY);
      } else {
        mergedTabs.push({ th: item.th, topY: item.topY, bottomY: item.bottomY });
      }
    });

    // Quinconce — quand des postits de thèmes différents se chevauchent
    // verticalement, ils s'empilaient tous à la même largeur : seul le
    // dernier peint était survolable, et le voisinage avec les notes/
    // brackets de marge rendait les bandes étroites pénibles à attraper.
    // On les déplace dans un rail dédié à droite du texte (n'impacte plus
    // la lisibilité des annotations) et on les répartit en "voies"
    // télescopiques (lane scheduling glouton, comme des événements
    // d'agenda qui se recouvrent), empilées avec la voie 0 au-dessus —
    // chaque tranche est donc toujours couverte (pas de blanc), tout en
    // gardant à chaque voie sa propre lisière survolable.
    var TAB_LANE_GAP    = 6;  // tolérance anti-faux-positif de chevauchement
    var TAB_BASE_WIDTH  = 16; // largeur de la voie 0 — rail dédié, donc plus large qu'avant
    var TAB_LANE_STEP   = 16; // largeur ajoutée par voie supplémentaire
    var laneEnds = [];
    mergedTabs.forEach(function(item) {
      var lane = 0;
      while (lane < laneEnds.length && laneEnds[lane] > item.topY + TAB_LANE_GAP) lane++;
      laneEnds[lane] = item.bottomY;
      item.lane = lane;
    });

    var railRight = document.getElementById('theme-rail-right');
    mergedTabs.forEach(function(item) {
      try {
      var th = item.th;
      var lane = item.lane || 0;
      var height = Math.max(36, item.bottomY - item.topY);

      var tab = document.createElement('div');
      tab.className = 'theme-tab theme-tab-right' + (_activeThemeFilter === th.id ? ' theme-tab-active' : '');
      tab.dataset.themeId = th.id;
      var isLight = _isLightColor(th.color);
      tab.style.setProperty('--theme-tab-color', th.color);
      tab.style.setProperty('--theme-tab-color-dark', _darkenColor(th.color, 0.55));
      tab.style.setProperty('--theme-tab-color-fill', _hexToRgba(th.color, 0.92));
      // Texte sombre + halo clair sur fond clair ; texte clair + halo
      // sombre sur fond sombre — pour rester lisible quelle que soit
      // la couleur du thème.
      tab.style.setProperty('--theme-tab-text-color', isLight ? _darkenColor(th.color, 0.6) : _lightenColor(th.color, 0.75));
      tab.style.setProperty('--theme-tab-halo-color', isLight ? 'rgba(255,255,255,0.9)' : 'rgba(12,12,10,0.55)');
      tab.style.top    = item.topY + 'px';
      tab.style.height = height + 'px';
      tab.style.width  = (TAB_BASE_WIDTH + lane * TAB_LANE_STEP) + 'px';
      // Voie 0 au-dessus (z-index décroissant) : chaque voie n'est donc
      // visible/survolable que sur la tranche qu'elle ajoute au-delà des
      // voies précédentes, sans jamais laisser de blanc entre elles.
      tab.style.zIndex = String(20 - lane);
      tab.dataset.lane = lane;

      var label = document.createElement('span');
      label.className = 'theme-tab-label';
      var labelText = _normalizeThemeName(th.name);
      // Effet blur double : blurred + sharp superposés
      // Blur via text-shadow : suit le texte sans décalage de position
      label.textContent = labelText;
      label.style.textShadow = '0 0 8px currentColor, 0 0 3px currentColor';
      tab.appendChild(label);

      tab.onclick = function(e) {
        e.stopPropagation();
        if (_activeThemeFilter === th.id) {
          clearThemeFilter();
        } else {
          clearThemeFilter();
          activateThemeFilter(th.id);
        }
      };

      if (railRight) railRight.appendChild(tab);
      else if (td) td.appendChild(tab);
      } catch (err) {
        console.error('[applyAnnotStyles] échec du rendu d\'un postit de thème, ignoré :', err);
      }
    });

  });
}


function buildMenuPostit() {
  var el = document.getElementById('menu-profiles-list');
  if (!el) return;
  el.innerHTML = '';

  profiles.forEach(function(p, i) {
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:0;padding:0 14px 0 24px;';

    // Editable name — color is the identity
    var inp = document.createElement('input');
    inp.type = 'text';
    inp.value = p.name;
    var isCurrent = (i === currentProfile);
    inp.style.cssText = [
      'flex:1',
      'font-family:var(--f-display)',
      'font-weight:200',
      'font-size:18px',
      'letter-spacing:-0.02em',
      'line-height:1.5',
      'color:' + (p.colorBold || p.color),
      'font-style:normal',
      'background:none',
      'border:none',
      'outline:none',
      'cursor:pointer',
      'padding:2px 0',
      isCurrent ? 'text-shadow: 0 0 4px ' + (p.colorBold || p.color) : '',
    ].filter(Boolean).join(';');
    if (isCurrent) { inp.setAttribute('data-name', p.name); inp.classList.add('menu-profile-current'); }
    inp.addEventListener('focus', function() {
      if (currentProfile !== i) {
        currentProfile = i;
        document.querySelectorAll('.tb-profile-btn').forEach(function(b){
          b.classList.toggle('active', parseInt(b.dataset.idx) === i);
        });
        _updateScrollbarColor();
        scheduleAnnotRender();
      }
      el.querySelectorAll('input[type="text"]').forEach(function(inp2, j) {
        inp2.style.fontStyle = 'normal';
        inp2.style.textShadow = j === i ? ('0 0 4px ' + (profiles[j] ? (profiles[j].colorBold || profiles[j].color) : '#000')) : 'none';
      });
    });
    inp.addEventListener('input', function() {
      profiles[i].name = inp.value || ('lecteur.ice ' + (i + 1));
    });
    inp.addEventListener('mousedown', function(e) { e.stopPropagation(); });
    inp.addEventListener('click', function(e) { e.stopPropagation(); });

    // Color swatch dot — opens inline swatch picker
    var colorDot = document.createElement('button');
    colorDot.style.cssText = [
      'width:10px', 'height:10px', 'border-radius:50%',
      'background:' + (p.colorBold || p.color),
      'border:none', 'cursor:pointer', 'flex-shrink:0',
      'margin-right:4px', 'transition:transform .15s',
    ].join(';');
    colorDot.title = 'Changer la couleur';
    (function(pi, dot) {
      dot.addEventListener('mouseenter', function() { dot.style.transform = 'scale(1.4)'; });
      dot.addEventListener('mouseleave', function() { dot.style.transform = 'scale(1)'; });
      dot.onclick = function(e) {
        e.stopPropagation();
        // Toggle inline picker row
        var existingPicker = row.nextSibling;
        if (existingPicker && existingPicker.dataset && existingPicker.dataset.pickerFor === String(pi)) {
          existingPicker.remove(); return;
        }
        // Remove any other open pickers
        el.querySelectorAll('[data-picker-for]').forEach(function(p) { p.remove(); });
        var pickerRow = document.createElement('div');
        pickerRow.dataset.pickerFor = String(pi);
        pickerRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;padding:6px 24px 8px 24px;';
        PALETTE_SWATCHES.forEach(function(sw, si) {
          var swatch = document.createElement('button');
          var isActive = sw.bold === (profiles[pi].colorBold || profiles[pi].color) ||
                         sw.pastel === profiles[pi].color;
          swatch.style.cssText = [
            'width:16px', 'height:16px', 'border-radius:50%',
            'background:' + sw.bold,
            'border:' + (isActive ? '2px solid #0C0C0A' : '2px solid transparent'),
            'cursor:pointer', 'transition:transform .12s, border-color .12s',
          ].join(';');
          swatch.addEventListener('mouseenter', function() { swatch.style.transform = 'scale(1.25)'; });
          swatch.addEventListener('mouseleave', function() { swatch.style.transform = 'scale(1)'; });
          swatch.addEventListener('mousedown', function(e) { e.stopPropagation(); });
          swatch.onclick = function(e) {
            e.stopPropagation();
            profiles[pi].color     = sw.pastel;
            profiles[pi].colorBold = sw.bold;
            pickerRow.remove();
            buildMenuPostit();
            scheduleAnnotRender();
          };
          pickerRow.appendChild(swatch);
        });
        pickerRow.addEventListener('mousedown', function(e) { e.stopPropagation(); });
        pickerRow.addEventListener('click', function(e) { e.stopPropagation(); });
        row.parentNode.insertBefore(pickerRow, row.nextSibling);
      };
    })(i, colorDot);

    // Delete button (only if more than 1 profile)
    var del = document.createElement('button');
    del.appendChild(_makeCrossSVG(12));
    del.style.cssText = 'color:rgba(12,12,10,0.18);padding:0 0 0 6px;transition:color .1s;background:none;border:none;cursor:pointer;display:inline-flex;align-items:center;';
    del.addEventListener('mouseover', function(){ del.style.color='rgba(12,12,10,0.6)'; });
    del.addEventListener('mouseout',  function(){ del.style.color='rgba(12,12,10,0.18)'; });
    del.onclick = function(e) {
      e.stopPropagation();
      if (profiles.length <= 1) return;
      var delIdx = i;
      // Supprimer les annotations du profil supprimé
      annotations = annotations.filter(function(a) { return parseInt(a.profile) !== delIdx; });
      // Décrémenter l'index de profil des annotations des profils suivants
      annotations.forEach(function(a) {
        if (parseInt(a.profile) > delIdx) a.profile = parseInt(a.profile) - 1;
      });
      // Idem pour les pensées flottantes
      if (typeof floatingThoughts !== 'undefined') {
        floatingThoughts = floatingThoughts.filter(function(t) { return parseInt(t.profile) !== delIdx; });
        floatingThoughts.forEach(function(t) {
          if (parseInt(t.profile) > delIdx) t.profile = parseInt(t.profile) - 1;
        });
      }
      profiles.splice(delIdx, 1);
      if (currentProfile >= profiles.length) currentProfile = profiles.length - 1;
      scheduleAnnotRender();
      buildMenuPostit();
    };
    if (profiles.length <= 1) del.style.visibility = 'hidden';

    row.appendChild(inp);
    row.appendChild(colorDot);
    row.appendChild(del);
    el.appendChild(row);
  });

  // Add profile button
  if (profiles.length < 9) {
    var addBtn = document.createElement('button');
    addBtn.className = 'postit-item';
    addBtn.style.cssText = 'color:rgba(12,12,10,0.3);font-size:14px;padding-top:4px;';
    addBtn.textContent = '+ ajouter un profil';
    addBtn.onclick = function(e) {
      e.stopPropagation();
      var i = profiles.length;
      // Choisir une couleur non encore utilisée parmi les swatches
      var usedBolds = profiles.map(function(p){ return p.colorBold || p.color; });
      var sw = PALETTE_SWATCHES.find(function(s){ return usedBolds.indexOf(s.bold) < 0; })
               || PALETTE_SWATCHES[i % PALETTE_SWATCHES.length];
      profiles.push({ name: 'lecteur.ice', color: sw.pastel, colorBold: sw.bold });
      switchProfile(i);
      buildMenuPostit();
      // Focus the new name input
      setTimeout(function() {
        var inputs = el.querySelectorAll('input[type=text],input:not([type])');
        if (inputs[i]) inputs[i].focus();
      }, 50);
    };
    el.appendChild(addBtn);
  }
}

function _postureMatch(a) {
  if (!activePostureFilter) return true;
  if (activePostureFilter === 'dialogue') return !!(a.dialogue && a.note && a.note.trim());
  // Dialogue a son propre filtre : on l'exclut d'analytique/personnel
  // même si sa posture vaut 100 (forcée à la création).
  if (a.dialogue) return false;
  var p = (a.posture != null ? a.posture : 50);
  if (activePostureFilter === 'analytique') return p < 40;
  if (activePostureFilter === 'personnel')  return p > 60;
  return true;
}
function _traceMatch(a) {
  if (!activeTraceFilter) return true;
  if (activeTraceFilter === 'dialogue') return !!(a.dialogue && a.note && a.note.trim());
  if (activeTraceFilter === 'crochet')  return a.trace === 'crochet';
  // Pour les autres traces, filtrer par trace indépendamment du flag dialogue
  return a.trace === activeTraceFilter;
}
function _postureMatchThought(t) {
  if (!activePostureFilter) return true;
  if (activePostureFilter === 'dialogue') return !!(t.dialogue && t.text && t.text.trim());
  // Dialogue a son propre filtre : on l'exclut d'analytique/personnel
  // même si sa posture vaut 100 (forcée à la création).
  if (t.dialogue) return false;
  var p = (t.posture != null ? t.posture : 50);
  if (activePostureFilter === 'analytique') return p < 40;
  if (activePostureFilter === 'personnel')  return p > 60;
  return true;
}
function _traceMatchThought(t) {
  if (!activeTraceFilter) return true;
  if (activeTraceFilter === 'dialogue') return !!(t.dialogue && t.text && t.text.trim());
  // Une pensée flottante n'a pas de trace (soulignement / surlignement /
  // entouré / crochet) : ce n'est pas une marque posée sur une sélection
  // de texte. Un filtre de trace précis ne doit donc jamais en montrer.
  return false;
}

// ── PANNEAU LISTE ANNOTATIONS ──
function toggleListePostit(e) {
  if(e) e.stopPropagation();
  var el = document.getElementById('liste-postit');
  if (!el) return;
  var hidden = el.classList.toggle('hidden');
  if (!hidden) { buildListePostit(); _positionPostit('liste-postit');
    var _lh = el.querySelector('.postit-title'); if (_lh && !el._draggable) { _makeDraggable(el, _lh); el._draggable = true; }
  }
}

var _listeActiveTab = 'annotations'; // 'annotations' | 'themes' | 'profils'

function buildListePostit() {
  var container = document.getElementById('liste-annotations-content');
  if (!container) return;
  container.innerHTML = '';

  // ── Tabs bar ──
  var tabs = document.createElement('div');
  tabs.className = 'liste-tabs';

  [
    { key: 'annotations', label: 'Annotations' },
    { key: 'themes',      label: 'Thèmes' },
    { key: 'profils',     label: 'Profils' },
  ].forEach(function(tab) {
    var btn = document.createElement('button');
    btn.className = 'liste-tab-btn' + (_listeActiveTab === tab.key ? ' active' : '');
    btn.textContent = tab.label;
    btn.onclick = function(e) {
      e.stopPropagation();
      _listeActiveTab = tab.key;
      buildListePostit();
    };
    tabs.appendChild(btn);
  });
  container.appendChild(tabs);

  // ── Tab content ──
  if (_listeActiveTab === 'annotations') {
    _buildListeAnnotationsTab(container);
  } else if (_listeActiveTab === 'themes') {
    _buildListeThemesTab(container);
  } else {
    _buildListeProfilsTab(container);
  }
}

var _listeProfileFilter = null; // null = tous

function _buildListeAnnotationsTab(container) {
  // ── Dropdown profil ──
  var dropRow = document.createElement('div');
  dropRow.style.cssText = 'padding:10px 20px 8px;';
  var sel = document.createElement('select');
  sel.style.cssText = 'font-family:var(--f-display);font-weight:200;font-size:16px;letter-spacing:-0.025em;background:rgba(253,252,249,0.92);border:none;border-radius:6px;box-shadow:0 0 0 1px rgba(12,12,10,0.12),0 0 8px 2px rgba(12,12,10,0.08);outline:none;color:var(--ink,#0C0C0A);cursor:pointer;width:100%;padding:8px 14px;-webkit-appearance:none;appearance:none;';
  var optAll = document.createElement('option');
  optAll.value = ''; optAll.textContent = 'tous les lecteurs';
  sel.appendChild(optAll);
  profiles.forEach(function(p, i) {
    var opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = p.name || ('lecteur.ice ' + (i+1));
    opt.style.color = p.colorBold || p.color;
    if (_listeProfileFilter === i) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.value = _listeProfileFilter !== null ? String(_listeProfileFilter) : '';
  sel.onchange = function(e) {
    e.stopPropagation();
    _listeProfileFilter = sel.value === '' ? null : parseInt(sel.value);
    buildListePostit();
  };
  dropRow.appendChild(sel);
  container.appendChild(dropRow);

  var visible = annotations.filter(function(a) {
    if (_listeProfileFilter !== null && parseInt(a.profile) !== _listeProfileFilter) return false;
    return (activeProfiles.length === 0 || activeProfiles.indexOf(parseInt(a.profile)) >= 0)
        && _postureMatch(a);
  });

  if (!visible.length) {
    var empty = document.createElement('div');
    empty.className = 'liste-annot-empty';
    empty.textContent = 'aucune annotation';
    container.appendChild(empty);
    return;
  }

  visible.sort(function(a, b) {
    var ia = parseInt((a.spanIds[0]||'w0').slice(1));
    var ib = parseInt((b.spanIds[0]||'w0').slice(1));
    return ia - ib;
  });

  var wrap = document.createElement('div');
  wrap.style.cssText = 'padding-bottom:8px;';

  visible.forEach(function(a) {
    var p = a.profile < profiles.length ? profiles[a.profile] : null;
    var col = (p && p.colorBold) || '#111';
    var pname = (p && p.name) || ('lecteur.ice ' + (a.profile + 1));
    var traceStr = a.dialogue ? 'dialogue' : a.trace === 'note' ? 'entouré' : a.trace === 'entoure' ? 'surligné' : a.trace === 'crochet' ? 'crochet' : 'souligné';

    var item = document.createElement('div');
    item.className = 'liste-annot-item';
    item.onclick = function() {
      var w = wordById[a.spanIds[0]];
      if (w) w.el.scrollIntoView({ behavior:'smooth', block:'center' });
      // Ferme le panneau pour voir le texte, mais n'ouvre pas le popup d'édition
      document.getElementById('liste-postit').classList.add('hidden');
    };
    item.addEventListener('mouseenter', function() {
      var col = pcolor(a.profile, true);
      a.spanIds.forEach(function(sid) {
        var ww = wordById[sid];
        if (ww) ww.el.style.textShadow = '0 0 12px ' + col + ', 0 0 4px ' + col;
      });
    });
    item.addEventListener('mouseleave', function() {
      a.spanIds.forEach(function(sid) {
        var ww = wordById[sid];
        if (ww) ww.el.style.textShadow = '';
      });
    });

    var profRow = document.createElement('div');
    profRow.className = 'liste-annot-profil';
    var nm = document.createElement('span');
    nm.className = 'liste-annot-name';
    nm.style.color = col;
    nm.textContent = pname;
    profRow.appendChild(nm);

    // Passage avec rendu visuel de la trace intégré
    var pass = document.createElement('div');
    pass.className = 'liste-annot-passage';
    var selTxt = (a.selText || '').slice(0, 55) + (a.selText && a.selText.length > 55 ? '…' : '');
    if (a.trace === 'evidence') {
      // Soulignement : texte normal + border-bottom couleur
      var sp = document.createElement('span');
      sp.style.cssText = 'border-bottom:2px solid '+col+';padding-bottom:1px;';
      sp.textContent = selTxt;
      pass.appendChild(document.createTextNode(''));
      pass.appendChild(sp);
    } else if (a.trace === 'entoure') {
      // Surlignement : texte blanc sur fond couleur
      var sp = document.createElement('span');
      sp.style.cssText = 'background:'+col+';color:white;padding:0 3px;border-radius:2px;';
      sp.textContent = selTxt;
      pass.appendChild(sp);
    } else if (a.trace === 'note') {
      // Entouré : texte couleur + border arrondie
      var sp = document.createElement('span');
      sp.style.cssText = 'color:'+col+';border:1.5px solid '+col+';border-radius:12px;padding:0 5px;';
      sp.textContent = selTxt;
      pass.appendChild(sp);
    } else if (a.trace === 'crochet') {
      // Crochet : trait vertical à gauche
      var sp = document.createElement('span');
      sp.style.cssText = 'border-left:2px solid '+col+';padding-left:6px;margin-left:2px;';
      sp.textContent = selTxt;
      pass.appendChild(sp);
    } else {
      pass.textContent = selTxt;
    }

    var note = document.createElement('div');
    note.className = 'liste-annot-note';
    note.style.color = col;
    note.textContent = a.note || '';

    // Bouton supprimer — discret, apparaît au survol
    var del = document.createElement('button');
    del.appendChild(_makeCrossSVG(12));
    del.style.cssText = [
      'position:absolute',
      'top:6px',
      'right:10px',
      'line-height:1',
      'color:rgba(12,12,10,0.2)',
      'padding:0 4px',
      'background:none',
      'border:none',
      'cursor:pointer',
      'transition:color .12s',
      'font-family:var(--f-display)',
      'font-weight:200',
    ].join(';');
    del.addEventListener('mouseover', function() { del.style.color = 'rgba(12,12,10,0.7)'; });
    del.addEventListener('mouseout',  function() { del.style.color = 'rgba(12,12,10,0.2)'; });
    del.onclick = function(e) {
      e.stopPropagation();
      deleteAnnotation(a.id);
      scheduleAnnotRender();
      buildListePostit();
    };
    item.style.position = 'relative';
    item.style.paddingRight = '28px';

    item.appendChild(profRow);
    item.appendChild(pass);
    if (a.note) item.appendChild(note);
    item.appendChild(del);
    wrap.appendChild(item);
  });

  container.appendChild(wrap);

  // ── Pensées flottantes ──
  var visibleThoughts = floatingThoughts.filter(function(t) {
    if (_listeProfileFilter !== null && parseInt(t.profile || 0) !== _listeProfileFilter) return false;
    return true;
  });
  if (visibleThoughts.length) {
    var sep = document.createElement('div');
    sep.style.cssText = 'padding:12px 24px 4px;font-family:var(--f-display);font-weight:200;font-size:13px;letter-spacing:0.02em;color:rgba(12,12,10,0.5);';
    sep.textContent = 'Pensées flottantes';
    container.appendChild(sep);

    var thoughtWrap = document.createElement('div');
    thoughtWrap.style.cssText = 'padding-bottom:8px;';
    visibleThoughts.forEach(function(t) {
      var p = (t.profile !== undefined && profiles[t.profile]) ? profiles[t.profile] : null;
      var tcol = (p && p.colorBold) || (p && p.color) || '#111';
      var pname = (p && p.name) || ('lecteur.ice ' + ((t.profile || 0) + 1));

      var item = document.createElement('div');
      item.className = 'liste-annot-item';
      item.style.position = 'relative';
      item.style.paddingRight = '28px';
      item.onclick = function() {
        openEditThought(t.id);
        document.getElementById('liste-postit').classList.add('hidden');
      };

      var profRow2 = document.createElement('div');
      profRow2.className = 'liste-annot-profil';
      var nm2 = document.createElement('span');
      nm2.className = 'liste-annot-name';
      nm2.style.color = tcol;
      nm2.textContent = pname;
      var traceTag = document.createElement('span');
      traceTag.className = 'liste-annot-trace';
      traceTag.textContent = t.dialogue ? 'dialogue flottant' : 'pensée flottante';
      profRow2.appendChild(nm2);
      profRow2.appendChild(traceTag);

      var noteEl2 = document.createElement('div');
      noteEl2.className = 'liste-annot-note';
      noteEl2.style.color = tcol;
      noteEl2.textContent = t.text || '';

      var del2 = document.createElement('button');
      del2.appendChild(_makeCrossSVG(12));
      del2.style.cssText = 'position:absolute;top:6px;right:10px;line-height:1;color:rgba(12,12,10,0.2);padding:0 4px;background:none;border:none;cursor:pointer;transition:color .12s;';
      del2.addEventListener('mouseover', function() { del2.style.color = 'rgba(12,12,10,0.7)'; });
      del2.addEventListener('mouseout',  function() { del2.style.color = 'rgba(12,12,10,0.2)'; });
      del2.onclick = function(e) {
        e.stopPropagation();
        floatingThoughts = floatingThoughts.filter(function(x){ return x.id !== t.id; });
        scheduleAnnotRender();
        buildListePostit();
      };

      item.appendChild(profRow2);
      item.appendChild(noteEl2);
      item.appendChild(del2);
      thoughtWrap.appendChild(item);
    });
    container.appendChild(thoughtWrap);
  }
}

function _buildListeThemesTab(container) {
  var wrap = document.createElement('div');
  wrap.style.cssText = 'padding:8px 0;';

  if (!themes.length) {
    var empty = document.createElement('div');
    empty.className = 'liste-annot-empty';
    empty.textContent = 'aucun thème créé';
    wrap.appendChild(empty);
    container.appendChild(wrap);
    return;
  }

  themes.forEach(function(t) {
    var creator = (t.creatorProfileIdx !== undefined && profiles[t.creatorProfileIdx])
      ? profiles[t.creatorProfileIdx].name : null;
    var count = annotations.filter(function(a){ return a.themeId === t.id; }).length;
    var item = document.createElement('div');
    item.className = 'liste-theme-item';

    // Rond couleur cliquable → swatch picker (comme les profils)
    var colorDot = document.createElement('button');
    colorDot.style.cssText = 'width:10px;height:10px;border-radius:50%;background:'+t.color+';border:none;cursor:pointer;flex-shrink:0;margin-right:8px;transition:transform .15s;position:relative;';
    colorDot.title = 'Changer la couleur';
    (function(tid, dot) {
      // Input color caché derrière le dot
      var colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = t.color;
      colorInput.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;border:none;padding:0;';
      colorInput.addEventListener('input', function(e) {
        e.stopPropagation();
        var th = themes.find(function(x){ return x.id === tid; });
        if (!th) return;
        th.color = colorInput.value;
        dot.style.background = colorInput.value;
        // Mettre à jour le span du nom si visible
        var nameEl = item.querySelector('.liste-theme-name');
        if (nameEl) nameEl.style.color = colorInput.value;
      });
      colorInput.addEventListener('change', function(e) {
        e.stopPropagation();
        scheduleAnnotRender();
        buildListePostit();
      });
      colorInput.addEventListener('mousedown', function(e){ e.stopPropagation(); });
      colorInput.addEventListener('click', function(e){ e.stopPropagation(); });
      dot.addEventListener('mouseenter', function(){ dot.style.transform='scale(1.4)'; });
      dot.addEventListener('mouseleave', function(){ dot.style.transform='scale(1)'; });
      dot.appendChild(colorInput);
    })(t.id, colorDot);

    var name = document.createElement('span');
    name.className = 'liste-theme-name';
    name.style.color = t.color;
    name.textContent = _normalizeThemeName(t.name);

    var right = document.createElement('span');
    right.style.cssText = 'display:flex;align-items:center;gap:8px;flex-shrink:0;';

    var countEl = document.createElement('span');
    countEl.className = 'count-badge';
    countEl.textContent = '(' + count + ')';
    right.appendChild(countEl);

    if (creator) {
      var creatorEl = document.createElement('span');
      creatorEl.style.cssText = 'font-family:Migra,Georgia,serif;font-weight:200;font-size:10px;letter-spacing:0.04em;text-transform:uppercase;color:rgba(12,12,10,0.3);line-height:1;';
      creatorEl.textContent = creator;
      right.appendChild(creatorEl);
    }

    var deleteBtn = document.createElement('button');
    deleteBtn.className = 'liste-theme-action';
    deleteBtn.title = 'Supprimer';
    while(deleteBtn.firstChild) deleteBtn.removeChild(deleteBtn.firstChild);
    deleteBtn.appendChild(_makeCrossSVG(12));
    deleteBtn.onclick = function(e) {
      e.stopPropagation();
      deleteTheme(t.id);
    };
    right.appendChild(deleteBtn);

    item.appendChild(colorDot);
    item.appendChild(name);
    item.appendChild(right);

    name.style.cursor = 'pointer';
    name.onclick = function(e) {
      e.stopPropagation();
      renameTheme(t.id);
    };
    item._themeId = t.id;
    item.onclick = function() {
      document.getElementById('liste-postit').classList.add('hidden');
      clearThemeFilter();
      activateThemeFilter(t.id);
    };

    wrap.appendChild(item);
  });

  container.appendChild(wrap);
}

function _buildListeProfilsTab(container) {
  var wrap = document.createElement('div');
  wrap.style.cssText = 'padding:8px 0;';

  if (!profiles.length) {
    var empty = document.createElement('div');
    empty.className = 'liste-annot-empty';
    empty.textContent = 'aucun profil';
    wrap.appendChild(empty);
    container.appendChild(wrap);
    return;
  }

  profiles.forEach(function(p, i) {
    var count = annotations.filter(function(a){ return parseInt(a.profile) === i; }).length;
    var item = document.createElement('div');
    item.className = 'liste-profil-item';

    var name = document.createElement('span');
    name.className = 'liste-profil-name';
    name.style.color = p.colorBold || p.color;
    /* pas d'italique — blur via text-shadow si profil courant */
    if (i === currentProfile) name.style.textShadow = '0 0 6px ' + (p.colorBold || p.color);
    name.textContent = p.name || ('lecteur.ice ' + (i + 1));

    var cnt = document.createElement('span');
    cnt.className = 'liste-profil-count';
    cnt.textContent = count + ' annot.';

    item.appendChild(name);
    item.appendChild(cnt);
    wrap.appendChild(item);
  });

  container.appendChild(wrap);
}

function _makeFilterBtn(label, isActive, color, onclick) {
  var btn = document.createElement('button');
  btn.className = 'postit-item';
  var col = color || 'rgba(12,12,10,0.8)';
  btn.style.cssText = [
    'color:' + col,
    'font-weight:' + (isActive ? '400' : '200'),
    'opacity:' + (isActive ? '1' : '0.65'),
    isActive ? 'text-shadow: 0 0 5px ' + col : ''
  ].filter(Boolean).join(';');
  btn.textContent = label;
  btn.onclick = function(e) { e.stopPropagation(); onclick(); };
  return btn;
}

function buildFiltrePostit() {
  var el = document.getElementById('filtre-profiles-list');
  if (!el) return;
  el.innerHTML = '';

  // ── Toggles "seulement annotations" / "texte neutre" / "n&b" — 2 colonnes ──
  var togglesRow = document.createElement('div');
  togglesRow.className = 'filtre-cols';
  var togglesColA = document.createElement('div'); togglesColA.className = 'filtre-col';
  var togglesColB = document.createElement('div'); togglesColB.className = 'filtre-col';

  var btnOnly = document.createElement('button');
  btnOnly.className = 'postit-item';
  btnOnly.id = 'btn-dim-unannotated';
  btnOnly.style.cssText = [
    'font-weight:' + (dimUnannotated ? '400' : '200'),
    'opacity:' + (dimUnannotated ? '1' : '0.65'),
    dimUnannotated ? 'text-shadow:0 0 5px rgba(12,12,10,0.8)' : ''
  ].filter(Boolean).join(';');
  btnOnly.textContent = 'seulement annotations';
  btnOnly.onclick = function(e) {
    e.stopPropagation();
    toggleDimUnannotated();
    buildFiltrePostit();
  };

  var btnNeutral = document.createElement('button');
  btnNeutral.className = 'postit-item';
  btnNeutral.id = 'btn-neutral-reading';
  btnNeutral.style.cssText = [
    'font-weight:' + (hideAnnotations ? '400' : '200'),
    'opacity:' + (hideAnnotations ? '1' : '0.65'),
    hideAnnotations ? 'text-shadow:0 0 5px rgba(12,12,10,0.8)' : ''
  ].filter(Boolean).join(';');
  btnNeutral.textContent = 'texte neutre';
  btnNeutral.onclick = function(e) {
    e.stopPropagation();
    toggleHideAnnotations();
    buildFiltrePostit();
  };

  var btnMono = document.createElement('button');
  btnMono.className = 'postit-item';
  btnMono.id = 'btn-monochrome-reading';
  btnMono.style.cssText = [
    'font-weight:' + (monochromeReading ? '400' : '200'),
    'opacity:' + (monochromeReading ? '1' : '0.65'),
    monochromeReading ? 'text-shadow:0 0 5px rgba(12,12,10,0.8)' : ''
  ].filter(Boolean).join(';');
  btnMono.textContent = 'n&b';
  btnMono.onclick = function(e) {
    e.stopPropagation();
    toggleMonochromeReading();
    buildFiltrePostit();
  };

  togglesColA.appendChild(btnOnly);
  togglesColA.appendChild(btnMono);
  togglesColB.appendChild(btnNeutral);
  togglesRow.appendChild(togglesColA);
  togglesRow.appendChild(togglesColB);
  el.appendChild(togglesRow);

  var divider0 = document.createElement('div');
  divider0.className = 'postit-divider';
  el.appendChild(divider0);

  // ── Section profils ──
  var labelP = document.createElement('div');
  labelP.className = 'postit-section-label';
  labelP.textContent = 'Profils';
  el.appendChild(labelP);

  // Si plus de 4 profils : "tous" + profils répartis sur 2 colonnes équilibrées
  // colA = [tous, profil 1..n], colB = [profil n+1..]
  if (profiles.length > 4) {
    var profCols = document.createElement('div');
    profCols.className = 'filtre-cols';
    var colA = document.createElement('div'); colA.className = 'filtre-col';
    var colB = document.createElement('div'); colB.className = 'filtre-col';

    colA.appendChild(_makeFilterBtn('tous', activeProfiles.length === 0, null, function() {
      activeProfiles = []; scheduleAnnotRender(); buildFiltrePostit();
    }));

    // colA reçoit (n+1) items au total (tous + profils), colB reçoit le reste
    var splitAt = Math.ceil((profiles.length + 1) / 2) - 1;
    profiles.forEach(function(p, i) {
      var isActive = activeProfiles.indexOf(i) >= 0;
      var col = p.colorBold || p.color;
      var btn = _makeFilterBtn(p.name, isActive, col, function() {
        var idx = activeProfiles.indexOf(i);
        if (idx >= 0) activeProfiles.splice(idx, 1); else activeProfiles.push(i);
        scheduleAnnotRender(); buildFiltrePostit();
      });
      (i < splitAt ? colA : colB).appendChild(btn);
    });
    profCols.appendChild(colA);
    profCols.appendChild(colB);
    el.appendChild(profCols);
  } else {
    el.appendChild(_makeFilterBtn('tous', activeProfiles.length === 0, null, function() {
      activeProfiles = []; scheduleAnnotRender(); buildFiltrePostit();
    }));
    profiles.forEach(function(p, i) {
      var isActive = activeProfiles.indexOf(i) >= 0;
      var col = p.colorBold || p.color;
      el.appendChild(_makeFilterBtn(p.name, isActive, col, function() {
        var idx = activeProfiles.indexOf(i);
        if (idx >= 0) activeProfiles.splice(idx, 1); else activeProfiles.push(i);
        scheduleAnnotRender(); buildFiltrePostit();
      }));
    });
  }

  // ── Colonnes posture + trace ──
  var cols = document.createElement('div');
  cols.className = 'filtre-cols';

  // Colonne posture
  var colP = document.createElement('div');
  colP.className = 'filtre-col';
  var lP = document.createElement('div');
  lP.className = 'postit-section-label';
  lP.textContent = 'Posture';
  colP.appendChild(lP);
  [
    { key: null,         label: 'toutes' },
    { key: 'analytique', label: 'analytique' },
    { key: 'personnel',  label: 'personnelle' },
    { key: 'dialogue',   label: 'dialogue' },
  ].forEach(function(opt) {
    colP.appendChild(_makeFilterBtn(opt.label, activePostureFilter === opt.key, null, function() {
      activePostureFilter = opt.key; scheduleAnnotRender(); buildFiltrePostit();
    }));
  });

  // Colonne trace
  var colT = document.createElement('div');
  colT.className = 'filtre-col';
  var lT = document.createElement('div');
  lT.className = 'postit-section-label';
  lT.textContent = 'Trace';
  colT.appendChild(lT);
  [
    { key: null,       label: 'toutes' },
    { key: 'evidence', label: 'soulignement' },
    { key: 'entoure',  label: 'surlignement' },
    { key: 'note',     label: 'entouré' },
    { key: 'crochet',  label: 'crochet' },
  ].forEach(function(opt) {
    colT.appendChild(_makeFilterBtn(opt.label, activeTraceFilter === opt.key, null, function() {
      activeTraceFilter = opt.key; scheduleAnnotRender(); buildFiltrePostit();
    }));
  });

  cols.appendChild(colP);
  cols.appendChild(colT);
  el.appendChild(cols);
}

// Positions fixes décalées — style post-its sur la gauche
// Positions aléatoires décalées à chaque ouverture — style post-its

// ── Croix SVG personnalisée ──
// ── SVG Croix — injecté une fois, réutilisé via <use href="#croix-svg"> ──
function _initCroixSVG() {
  if (document.getElementById('croix-svg')) return;
  var container = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  container.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;';
  container.innerHTML = '<symbol id="croix-svg" viewBox="0 0 30.1 20.93"><g><g><g><g><path fill="currentColor" d="M27.47,17.61h-.06c.13,.02,.06,0,.06,0Z"/><path fill="currentColor" d="M28.22,17.99h0l.11,.13c-.04-.06-.13-.16-.1-.13Z"/><path fill="currentColor" d="M28.12,17.93c.21,.67,.04-.13,.11,.1l.08,.14-.14-.25v.02s-.07-.2-.03-.05c.02,.08,0,.13-.03,.04Z"/><path fill="currentColor" d="M27.88,16.6s0-.04,0,0c0,.02,0-.04,0,0l.02,.22v-.04l-.02-.19Z"/><path fill="currentColor" d="M27.9,16.8c.03,.2-.02-.13,0,0h0Z"/><path fill="currentColor" d="M27.85,16.58l.03-.24c0-.17-.01-.21,0-.32-.01,.13-.03,.3-.02,.57Z"/><path fill="currentColor" d="M27.79,17.1l.03-.1c0-.07,0-.09-.03,.1Z"/><path fill="currentColor" d="M27.87,16.78l-.05,.22c0,.12,0,.35,.02-.08-.01,.21,0,0,.02-.14Z"/><path fill="currentColor" d="M27.88,16.89c0,.15,.03,.25,.01,.5,.06-.1,0-.6-.01-.5Z"/><path fill="currentColor" d="M28.27,18.65l.1,.19-.02-.24c.01,.12-.13-.16-.08,.05Z"/><path fill="currentColor" d="M27.67,16.19c-.03,.15-.06,.4-.09,.59,.03-.05,.05-.11,.07-.16,0-.1-.03-.21,.01-.43Z"/><path fill="currentColor" d="M27.58,16.78l-.12,.24c.06,.04,.1-.07,.12-.24Z"/><path fill="currentColor" d="M27.73,17.89c.05-.18,.09-.36,.13-.54-.04,.18-.09,.36-.15,.55h.02Z"/><polygon fill="currentColor" points="27.43 16.11 27.56 15.78 27.35 16.28 27.43 16.11"/><path fill="currentColor" d="M27.23,16.12c.12-.27,.1-.49,.18-.65-.06,.03-.18,.26-.29,.46,.08-.1,.12-.06,.11,.19Z"/><path fill="currentColor" d="M26.95,16.22c.05-.06,.11-.17,.17-.29-.04,.06-.1,.14-.17,.29Z"/><path fill="currentColor" d="M27.35,16.92c.02-.09,.06-.32,.04-.44l-.07,.42h.03Z"/><path fill="currentColor" d="M27.32,16.92h0s-.05-.05-.06-.06l.06,.06Z"/><path fill="currentColor" d="M27.36,16.93h0s0,.05,0,0Z"/><path fill="currentColor" d="M27.58,17.49c-.07,.23-.23,.47-.18,.84,.08-.28,.06-.5,.18-.84Z"/><path fill="currentColor" d="M27.27,17.45l.07,.11c.02-.11,.04-.28,.08-.39l-.15,.27Z"/><polygon fill="currentColor" points="27.2 17.58 27.27 17.45 27.25 17.41 27.2 17.58"/><path fill="currentColor" d="M26.98,16.65c-.1,.16-.15,.16-.21,.18,.03,.1,.07,.16,.13,.18,.05-.13,.14-.35,.08-.35Z"/><path fill="currentColor" d="M27.13,16.82l-.02,.02s0,.05,.02-.02Z"/><path fill="currentColor" d="M26.26,16.64l-.02,.08,.03-.07h0Z"/><path fill="currentColor" d="M26.88,17.08c.02,.09,.07,0,.13-.12-.04,.03-.08,.05-.12,.04-.02,.06-.03,.09-.01,.08Z"/><path fill="currentColor" d="M26.75,16.36c0,.09,0,.17,0,.25,.02-.14,.05-.35,0-.25Z"/><path fill="currentColor" d="M27.14,16.73v-.02c.02-.09,.01-.05,0,.02Z"/><path fill="currentColor" d="M27.14,16.73c-.04,.05-.08,.15-.12,.24,.03-.03,.07-.06,.1-.12l.02-.12Z"/><path fill="currentColor" d="M25.05,19.11c.16-.36,.43-.65,.39-.2,.22-.23,.61-1.48,.79-2.19-.07,.16-.12,.31-.32,.48-.05,.22,.05,.57-.17,.86-.22,.13-.07-.18-.06-.4-.12,.48-.46,.59-.71,1.27l.24-.18c-.04,.11-.16,.25-.16,.36Z"/><path fill="currentColor" d="M26.41,16.82l.06-.03c-.02-.08,0-.24,.05-.55-.13,.16-.2,.29-.26,.41l.18,.13-.03,.05Z"/><path fill="currentColor" d="M26.65,16.86c-.17,.4-.34,.53-.43,.99,.14,.02,.21-.31,.34-.46-.23,.04,.13-.21,.07-.49,.06-.06,.1-.07,.14-.08-.02-.06-.03-.13-.03-.22v.03h0c0,.06-.02,.09-.02,.06h0l-.06,.16c-.03-.1,.03-.11,.06-.15l.02-.06h0l-.27,.15c.02,.07,.08,.08,.18,.07Z"/><path fill="currentColor" d="M27.12,19.22s0-.07,.01-.1c-.02,.05-.04,.08-.01,.1Z"/><path fill="currentColor" d="M27.08,18.95c.03-.06,.08-.22,.12-.17,.02,.14-.04,.2-.06,.34,.06-.1,.17-.28,.11-.51l-.03,.05c-.06-.17-.05-.71-.02-.77-.06,.38-.1,.66-.11,1.04Z"/><path fill="currentColor" d="M26.77,18.01c-.08,.05-.15,.1-.23,.15l-.02,.39,.06-.22c.08,.11,.13-.16,.19-.32Z"/><polygon fill="currentColor" points="26.32 16.43 26.5 16.02 26.17 16.57 26.32 16.43"/><polygon fill="currentColor" points="26.09 16.39 26.25 16.03 26.1 16.23 26.09 16.39"/><path fill="currentColor" d="M10.86,12.48l-.12,.05s.08-.03,.12-.05Z"/><path fill="currentColor" d="M11.2,12.76l.12-.15c-.08,.07-.13,.13-.12,.15Z"/><path fill="currentColor" d="M20.68,13.41c.13-.36,.36-.89,.13-.51l-.21,.38c.09-.03,.11,.03,.09,.13Z"/><path fill="currentColor" d="M15.5,13.02l-.05,.12,.29-.3-.23,.18Z"/><path fill="currentColor" d="M14.42,14.45l.07-.3c-.03,.09-.06,.19-.07,.3Z"/><path fill="currentColor" d="M8.63,11.41l-.32,.31c.09,.06,.18-.14,.32-.31Z"/><path fill="currentColor" d="M23.78,15.43c.02-.18,0-.27-.03-.32-.05,.26-.17,.62,.03,.32Z"/><path fill="currentColor" d="M13.72,8.87c-.08,.04-.14,.1-.2,.18,.07-.04,.14-.09,.2-.18Z"/><path fill="currentColor" d="M23.57,15.02l-.02,.11c.08-.04,.16-.06,.2,0,.03-.19,.03-.33-.18-.1Z"/><path fill="currentColor" d="M1.85,6.07v-.05s-.02,.06,0,.05Z"/><path fill="currentColor" d="M1.66,.97s.1,.01,.16,.03c-.02-.04-.06-.05-.16-.03Z"/><path fill="currentColor" d="M25.3,15.83c.06,0,.03-.04,0,0h0Z"/><path fill="currentColor" d="M24.8,17.49s-.07,.09-.11,.18c.05-.09,.08-.15,.11-.18Z"/><path fill="currentColor" d="M21.74,17.08h0c-.03,.08-.02,.06,0,0Z"/><path fill="currentColor" d="M25.29,16.04c0-.06,0-.11,0-.14,0,.03,0,.08,0,.14Z"/><path fill="currentColor" d="M25.37,15.85l.02,.06c.04-.06,.05-.11-.02-.06Z"/><path fill="currentColor" d="M25.23,15.82s.04,.04,.05,.08c0-.03,.01-.05,.02-.07-.02,0-.04,0-.07,0Z"/><path fill="currentColor" d="M6.27,7.77v-.04c-.14,.11-.1,.1,0,.04Z"/><path fill="currentColor" d="M16.95,16.35h.02v-.03l-.02,.03Z"/><path fill="currentColor" d="M16.6,16.5c.38-.4,.38-.31,.37-.18l.64-1.08-1.01,1.26Z"/><path fill="currentColor" d="M9.93,11.95l-.11,.4c-.52,.41-.49,.16-.71,.68,.82-1.08,.54,.22,1.36-.86l-.09,.29s-.07,.04-.08,0c-.23,.63,.69-.71,.77-.41,0,.13-.06,.33-.2,.42l.35-.16c.03,.05-.12,.24-.15,.18l.29,.08-.03,.03c.16-.15,.43-.36,.55-.45-.06,.2-.11,.09-.2,.24l.32-.17c-.16,.32-.46,.52-.52,.42-.68,1.18,.31-.2,.1,.63l-.22,.05c-.38,.68-.12,.52-.26,1.01,.11-.23,.44-1.18,.78-1.35-.02,.11,0,.19,.24,.02-.28,.39-.14,.35-.03,.39l-.38,.51c.21-.08,.39-.35,.62-.54,.07,.13-.19,.55-.41,.91,.12,.21,.34-.73,.62-.68,0,.3,.26,.17,.66-.02-.03,.25-.25,.3-.32,.48l.39-.35s-.08,.15-.13,.21c.19-.11,.38-.51,.6-.57,.44-.55-.35,1.02,.26,.47-.07,.17-.25,.31-.38,.52,.51-.28,.4-.18,.98-.64l-.1,.45c.17-.47,.64-.83,1.02-1.13,.1-.22,.18-.4,.22-.5l.39-.15c-.04,.1-.18,.27-.37,.46l.12-.1c-.07,.24-.32,.52-.57,.78,.05-.12,.11-.24,.16-.37-.27,.28-.56,.6-.77,.92,.05-.05,.12-.09,.16-.1-.07,.08-.14,.15-.17,.21-.03,.06,.07-.04,.19-.15l-.37,.61,.17-.22v.54c.58-.46,1.34-1.22,1.79-1.27-.37,.38-.5,.69-.86,1.2,.3-.59-.38,.08-.45-.14,.04,.11-.15,.34-.23,.41l.6-.31c-.3,.41-.16,.35-.21,.57,.52-.86,.58-.41,.86-.59-.18,.28-.41,.55-.49,.39-.28,.72,.85-.84,.63-.21-.04-.02-.02-.07-.13,.06,.24-.19,.29,.13,.08,.34l-.04-.02c.14,.24,.65,.45,1.15-.23-.06,.09-.6,.83-.71,.96l1.98-2.12c-.44,.58-1.28,2.12-1.69,2.34,0,.12-.01,.26,.24,.12,.02-.11,.5-.94,.59-.96-.32,.76-.15,.42-.37,1.11,.03-.17,.73-1.08,.79-1-.11,.13-.62,.95-.71,1.03l.83-.8c-.16,.14-.53,.79-.66,1.09,.1-.2,.17,.14,.29,.08l.05-.28c.14,.3,1.1-1.17,1.29-.97-.15,.18-.85,1.16-.8,1.35,.37-.45,1.74-2.17,2.18-2.42l-.14,.3,.35-.22c-.56,.68-1.81,2.04-2.35,2.53-.05,.28-.19,.34-.04,.4-.12,.29-.33,.35-.38,.34l.21,.37c.35-.58,.6-.42,.89-.9l-.71,.37c.35-.57,1.22-1.48,1.37-1.25-.09,.26-.68,.99-.79,1.18,.15-.18,.45-.24,.38-.09l-.28,.25c0,.29,.67-.63,.48,0,.03,.07-.3,.83-.08,.5,.32-.71,1.55-2.74,1.9-3.19-.01,.05-.13,.78-.26,1.14-.23,.57-.87,1.15-1.07,1.63,.1-.16,.26-.32,.32-.37-.03,.17-.32,.47-.16,.47,.37-.57,.21,.19,.35-.46,.22-.1,.05,.19,.2,.25,.18-.4,.89-1.22,1.09-1.32-.09,.15-.18,.36-.22,.45,.2,.19,.17,.53,.39,.66-.06,.16-.05,.39-.24,.62,.09-.09,.23-.27,.31-.25-.15,.59-.2,0-.44,.67,.2-.34,.45-.38,.66-.54,.26-.55-.17-.23-.39-.07,.41-.74,1.01-1.41,1.42-1.63,.28-.09-.18,.52-.09,.43,.27,.31,.97-1.15,.96-.47-.14,.53-.48,.95-.64,1.31-.24,.11-.07-.42-.18-.45v.29c-.12,.13-.29,.2-.27,.03-.13,.48,.54,.39,.62,.92,.13-.14,.29-.27,.35-.48l-.12,.03c.11-.43,.42-.46,.4-.7,.25-.22,.57-.6,.62-.3l-.23,.57c.07-.16,.05-.38-.07-.23,.18-.21-.1,.87,.3,.17l.07-.44c.24-.23,.63-.77,.68-.54,.18-.58-.06,.05,.13-.64-.28,.84-.31-.18-.56,.72,.25-.79-.02-.39,.16-1.08-.08,.18-.12,.37-.19,.23l-.1,.15v0s-.03,.03,0,0c-.01,.09-.04,.2-.08,.3-.25,.39-.43,.29-.59,.48-.02-.12,.13-.19,.19-.41l-.25,.28c.19-.41,.16-.76,.43-.91l-.13-.09c.03-.27-.03-.41-.18-.28-.02-.12-.39,.35-.17,.07l-.35,.13,.05-.1c-.18-.16-.8,.41-.65-.44-.13,.06-.27,.13-.33-.05l.17-.35c-.16,.06-.08-.49-.32-.17,.43-.96-.33-.46-.39-.72l-.27,.43c-.1-.09-.28-.03-.52,.05l-.23,.39c-.32,.24-.14-.46-.35-.54,.1-.14,.13-.07,.11,.04,.32-1-.87,.32-.68-.44-.14,.1-.15,.03-.12-.08,0,0,.01,0,.03-.01,0,0,0-.01-.02-.02l.06-.25c-.04,.11-.07,.19-.07,.24-.04-.02-.13-.01-.25,.05l.24-.42s-.01,0-.02,0c.04-.19-.17,.16-.34,.48-.07,.05-.15,.11-.24,.19,.38-.68-.3,.12,.09-.62-.26,.31-.46,.06-.96,.75,.06-.09,.07-.15,.11-.13-.01-.12-.02-.25-.22-.09l.31-.53-.6,.59c.12-.37,.21-.57,.55-.91-.61,.46-.32,.11-.9,.59l.23-.32c-.07-.03-.47,.34-.32,.04,.28-.72-.64-.56-.6-1.39-.6,1.01,.13-.54-.4,.19,.14-.24,.18-.4,.37-.56-.34,.1-.02-.55-.59-.01,.14-.24,.27-.3,.35-.45-.05,.04-.2,.16-.12,0,.08-.15,.16-.17,.26-.25-.21-.09-.72,.59-1.19,1.23,.12-.38,.04-.36-.33,.01,.12-.24,.22-.5,.39-.49-.04-.08-.18-.59-.55-.08,.07-.15-.06-.1-.12-.06-.12-.14-.1-.19-.28-.25l-.02,.11c-.51,.59-.22,.05-.39,.05l.05-.06c.06-.64-.27,.13-.16-.57l-.27,.4c-.63,.82,.12-.66-.26-.45l-.11,.26c-.29,.23,.59-1.3,.58-1.47,.03-.09,.11-.1,.18-.13,.14-.65-.4,.49-.64,.49,.17-.3,.54-.67,.47-.8,.11-.26-.96,.66-.73,.03-.12,.23-.24,.47-.43,.57-.17,0,.27-1.02-.32-.44,.03-.07,.06-.13,.1-.18-.21,.11-.49,.07-.81,.4,.9-1.39-1.03,.25-.12-.98l-.32-.13,.1-.12c-.11-.21-.39,.04-.67,.29,.02-.11,.14-.21,.19-.27-.07-.43-.13-.4-.8,.05l.27-.41c-.23,.19,.1-.9-.5-.61,.04-.04,.1-.12,.16-.16-.63,.26,.15-1.6-1.03-.23l-.45,.22c.16,.29-.5,.6-.58,.92-.16,.02,.08-.62,.25-.61l-.04,.09c.6-.73-.1-.49,.29-1-.5-.31-.65-1.07-1.07-1.43l-.38,.63-.13-.15c.06-.17,.28-.5,.38-.4,.19-.38-.39,.14-.49,.27-.04-.4,.59-.63,.53-.69l-.12-.02-.03,.08c-.25,.19-.44,.44-.55,.31,0-.18,.22-.4,.21-.44,.03-.04,.03-.07-.04-.05l-.16-.19-.26,.52c-.25,.17-.17-.16-.46,.44,.46-.91-.52-.82-.42-1.14-.37,.25-.48,.16-.61,.01-.03,.12-.39,.67-.47,.51,.82-1.06,.1-.64,.55-1.51-.27,.59-.47-.13-.84,.71-.05-.17,.28-.42,.38-.73-.56,.24-.39-.68-.83-.76-.1,.14-.2,.4-.41,.57l.31-.85c-.12,.03-.62,.81-.41,.22-.06,.14-.16,.34-.24,.36-.1-.57-.54-.65-.95-.79-.42-.15-.73-.35-.92-1.31,0,.37-.1,.36-.22,.33,.04,.1-.17,.4-.25,.63-.06-.26-.1-.52-.25-.79-.31,.59-.54-.07-.71,.56l.15-.11c-.28,.72-.1,1.66-.37,2.59,.14-.4,.1-.09,.07,.19-.03,.27-.07,.5,.27,0-.05,.19-.16,.27-.24,.48,.21-.36,.31-.41,.33-.19l-.06,.08c.34,.06,.28,.5,.47,.93l.22-.42c.04,.1-.02,.24-.05,.36,.46-.56-.19-.17,.3-.79-.4,.88,.54,.35,.01,1.32,.11,.08,.26-.48,.38-.4l-.13,.27,.24-.3c.04,.1-.12,.44-.26,.65,0-.04-.09,.02-.12,.03-.09,.36,.34,.08,.31,.2v-.23c.46-.02,.63,.57,1.29,.29l.1-.2c.48-.17,.05,.34,.42,.36l-.04,.04c.18-.14,.32-.19,.37-.11-.22,.17-.17,.5-.42,.68,.52-.18,.33-.19,.98-.75l-.18,.33c.25-.23,.36-.37,.55-.35-.29,.18-.25,.52-.61,.77-.2,.85,.89-.37,.32,.68,.73-.74,.1-.63,.3-.76,.14-.31,.55-.55,.58-.4,.07,.08-.62,1.17-.39,1.31-.02-.02-.07,.04-.09,.02-.07,.27,.37-.17,.22,.25,.42-.46,.11,.12,.59-.5h-.31c.24-.08,.89-.75,.82-.25-.11,.12-.29,.25-.4,.31-.08,.23,.2-.05,.11,.19-.48,.63-.35-.04-.83,.36-.14,.31,.57-.29,0,.35,.73-.81,.13,.27,.78-.29l-.29,.38c.07-.04,.25-.19,.29-.15l-.44,.44c.43-.33-.04,.54,.24,.4-.25-.17,.28-.5,.39-.85,.68-.29-.56,1.13-.1,1.19-.08,.02,0-.35,.2-.48,0,.13-.02,.33-.13,.56,.28,.08,.26-.42,.52-.58-.27,.52,.25-.11,.46-.19l-.29,.39c.07,.44,.66-.76,.67-.29l-.49,.47,.22-.05-.35,.42c.37-.23,.35-.12,.38,.1,.17-.29,.54-.69,.66-.62-.09,.29-.32,.34-.12,.4-.22,.22-.48,.49-.28,.08-.11,.11-.21,.22-.32,.34-.11,.33,.16,.21,.22,.25-.01-.03-.02-.07,0-.14l.63-.37c-.07,.17-.19,.27-.3,.36,.08,0,.24-.16,.34-.14-.25,.3-.49,.63-.69,.71l.48-.19c-.09,.15-.17,.46-.28,.55-.02,.28,.75-.39,.73-.03,.05-.05,.11-.1,.18-.12,.1,.18-.05,.67,.45,.37l-.32,.64c.24-.02,.39-.81,.78-.85,.3-.06-.29,.53-.35,.73,.29-.22,.87-.7,.68-.12-.13,.07-.11-.04-.19-.04Zm1.94,1.03c-.09,.06-.35,.26-.2,.01,.36-.42,.24-.18,.2-.01Zm3.37,.98c-.12,.11-.11,.02-.05-.16,.06,0,.08,.03,.05,.16Zm9.39,1.96v.02c0-.21-.01-.13,0-.02Zm.06,.27c.05-.05,.08-.11,.1-.18-.07,.1-.11,.09-.13,.04-.05,.12-.06,.21,.03,.13ZM7.69,4.79l-.04,.12c-.15,.06-.06-.03,.04-.12Z"/><path fill="currentColor" d="M14.54,14.29c.04-.07,.09-.15,.14-.22-.06,.06-.11,.13-.14,.22Z"/><polygon fill="currentColor" points="8.69 11.35 8.69 11.34 8.63 11.41 8.69 11.35"/><path fill="currentColor" d="M20.09,18.31c0-.08,.03-.17,.06-.25-.06,.1-.1,.19-.06,.25Z"/><path fill="currentColor" d="M25.86,15.85l-.15,.07c.06,0,.03,.1,.02,.18,.04-.1,.09-.26,.13-.25Z"/><path fill="currentColor" d="M25.64,18.99s.04,0,.08-.04l.07-.21c-.08-.01-.19,.14-.15,.25Z"/><path fill="currentColor" d="M25.3,17.36c-.16,.37-.03,.28,.07,.24,0,0-.01,0-.01,0,.25-.51,.1-.37-.06-.24Z"/><path fill="currentColor" d="M25.4,17.6s.06,0,.07,.02c.1-.21,0-.05-.07-.02Z"/><path fill="currentColor" d="M25.01,16.06c-.01,.11,.25-.46,.2-.3,.27-.44-.5,.45-.2,.3Z"/><polygon fill="currentColor" points="24.83 18.61 25 18.14 24.79 18.49 24.83 18.61"/><path fill="currentColor" d="M24.36,17.99l.06,.18c.03-.08,.07-.11,.11-.14-.07-.05-.11-.18-.17-.05Z"/><path fill="currentColor" d="M24.53,18.04s.08,.04,.13-.03c-.02,0-.08-.01-.13,.03Z"/><polygon fill="currentColor" points="24.59 18.67 24.6 18.56 24.52 18.48 24.59 18.67"/><path fill="currentColor" d="M23.09,17.23l-.2,.05c-.1,.14-.11,.26-.03,.22,.09-.09,.17-.12,.23-.28Z"/><path fill="currentColor" d="M22.85,18.66c.01-.11,.06-.21,.12-.37l-.29,.55,.18-.18Z"/><path fill="currentColor" d="M22.38,18.57c-.1,.14-.44,.32-.24,.39,.1-.14,.3-.19,.24-.39Z"/><polygon fill="currentColor" points="20.77 16.73 20.81 16.74 21.33 15.87 20.77 16.73"/><path fill="currentColor" d="M17.73,17.69c.02,.31,.38-.5,.35-.16,.17-.18,.02-.28,.17-.43-.23,.15-.2,0-.52,.59Z"/><path fill="currentColor" d="M18.25,17.1s.08-.05,.13-.1c-.06,.04-.1,.07-.13,.1Z"/><path fill="currentColor" d="M1.07,.24c-.05-.08-.1-.16-.15-.24l.06,.35,.09-.12Z"/><path fill="currentColor" d="M.61,.95l.06-.65-.17,.6s.11-.09,.12,.05Z"/><path fill="currentColor" d="M11.36,14.23l.1-.12c.08-.15,.07-.17,.04-.23l-.14,.35Z"/><polygon fill="currentColor" points="10.36 12.9 10.38 12.93 10.68 12.43 10.36 12.9"/><path fill="currentColor" d="M8.85,12.72c.03,.05,.16-.02,.19,.04-.16,.02,.24-.63-.19-.04Z"/></g><g><path fill="currentColor" d="M6.15,17.5c.06,.02-.04-.38-.05-.46-.08,.11,.08,.56,.05,.46Z"/><polygon fill="currentColor" points="5.55 18.63 5.52 18.47 5.53 18.9 5.55 18.63"/><path fill="currentColor" d="M4.91,18.83c.26,.67,.18-.18,.37,.03l.07,.15-.12-.56c-.11,.13-.18,.55-.32,.39Z"/><path fill="currentColor" d="M4.24,17.42c.08,.27,.02,.24,.06,.07l-.03-.07s-.02,0-.04,0Z"/><path fill="currentColor" d="M4.28,17.42s-.08-.22,0,0h0Z"/><path fill="currentColor" d="M4.45,18.54l-.16-.86c.05,.19,.18,1.01,.13,.71,.12,.59,.09,.43,.03,.16Z"/><path fill="currentColor" d="M4.54,19.02l-.04-.26,.04,.26Z"/><path fill="currentColor" d="M4.35,17.98l.09,.5,.06,.27c-.02-.07,0,0-.06-.25,0,.02,0,.02-.01-.05l-.08-.47Z"/><path fill="currentColor" d="M4.34,17.88c.04,.15,.08,.24,.11,.49,0-.05,0-.2-.04-.32-.04-.12-.08-.21-.07-.16Z"/><path fill="currentColor" d="M5.1,19.54l.12,.18-.02-.25c0,.12-.18-.15-.11,.07Z"/><path fill="currentColor" d="M4.51,20.12h0s-.01,0-.02,.02c.01-.02,.03-.02,.03-.02Z"/><path fill="currentColor" d="M4.5,20.12s0,0,.01,0c.03-.02,.06-.04,.09-.05-.04,.02-.08,.04-.1,.05h0Z"/><path fill="currentColor" d="M4.55,19.11c-.01-.16-.04-.31-.07-.46-.05-.17-.04-.2-.05-.31v.14l.07,.26c.03,.18,.06,.36,.06,.55v-.18Z"/><path fill="currentColor" d="M5.69,20.03h-.17l-.1-.02c.09,.03,.35,.02,.53,.04l-.26-.02Z"/><path fill="currentColor" d="M7.19,20.28c-.34-.06,.47,.09,.11,.02,.1,.02,.23,.05,.4,.08l.18,.04-.07-.02c-.09-.03-.21-.06-.32-.09,.06,.02,.08,.03,.06,.03h-.07l-.3-.06Z"/><path fill="currentColor" d="M7.19,20.2c.07,.03,.19,.07,.31,.1-.07-.02-.16-.05-.31-.1Z"/><path fill="currentColor" d="M5.07,20s.09-.01,.3,0h-.3Z"/><path fill="currentColor" d="M5.22,19.99h0c.16,0,.26,.03,.32,.03-.05,0-.14-.03-.33-.03Z"/><path fill="currentColor" d="M5.04,20h0Z"/><path fill="currentColor" d="M4.54,20.03s-.05,.12-.05,.11c.02-.02-.02,.03,.02-.02,.03-.05,0,.03,.03-.08Z"/><path fill="currentColor" d="M4.85,20.03c-.13,.02-.15,0-.23,.04,0,0,.04-.01-.01,0,.09-.04,.11-.02,.25-.04Z"/><path fill="currentColor" d="M5.05,20c-.07,0-.13,.02-.2,.03l.15-.02h.05Z"/><path fill="currentColor" d="M6.8,20.16c-.18-.06-.19-.08-.21-.11-.09,0-.14,.02-.14,.04,.13,.03,.36,.09,.35,.07Z"/><path fill="currentColor" d="M6.43,20.11h0Z"/><path fill="currentColor" d="M6.7,19.72l-.07-.02,.07,.03h0Z"/><path fill="currentColor" d="M6.36,20.07c-.08,0,0,.05,.14,.06-.05,0-.06-.04-.06-.05-.06-.02-.1-.02-.08-.01Z"/><path fill="currentColor" d="M7.03,20.07c-.09-.01-.17-.02-.24-.02,.13,.02,.35,.06,.24,.02Z"/><path fill="currentColor" d="M6.58,20.14h-.04c.09,0,.07,0,.04,0Z"/><path fill="currentColor" d="M6.58,20.14c.23,.04-.01,0-.07,0h.06s.04,0,.02,0l-.1-.02,.09,.02Z"/><path fill="currentColor" d="M4.2,18.58c.36,.17,.66,.4,.22,.35,.24,.2,1.5,.53,2.2,.77-.16-.06-.31-.11-.51-.25-.21-.07-.53-.05-.84-.22-.15-.17,.17-.03,.38,0-.47-.14-.61-.41-1.27-.7l.18,.22c-.11-.04-.25-.16-.36-.16Z"/><path fill="currentColor" d="M6.54,19.79l.04,.04c.08-.01,.23,.01,.54,.08-.17-.1-.31-.14-.43-.2-.03,0-.06,.06-.09,.1l-.05-.03Z"/><path fill="currentColor" d="M6.54,19.97c-.41-.14-.55-.28-1.02-.37,0,.11,.32,.18,.49,.28-.06-.16,.21,.11,.48,.08,.06,.05,.08,.07,.09,.09h.17c-.05-.01-.09-.02-.05-.02h0c-.06-.02-.11-.04-.15-.06,.1-.01,.11,.03,.15,.05l.06,.02h0l-.18-.2c-.07,.01-.07,.05-.04,.13Z"/><path fill="currentColor" d="M4.39,20.21l.08-.06s-.08,.05-.08,.06Z"/><path fill="currentColor" d="M4.6,20.08l-.05,.02s-.05,.03-.04,.02c-.03,.02,.04-.03-.04,.03,.08-.06,0,0,.04-.03h0s.13-.09,.18-.08c.07-.01,.11,0,.1,0-.04,0-.09,0-.19,.03Z"/><path fill="currentColor" d="M5.45,19.96c-.07-.03-.13-.08-.19-.14h-.38l.22,.03c-.09,.04,.18,.07,.35,.11Z"/><path fill="currentColor" d="M6.9,19.79l.42,.17c-.2-.08-.39-.17-.59-.26l.16,.09Z"/><polygon fill="currentColor" points="6.88 19.7 7.24 19.86 7.03 19.75 6.88 19.7"/><path fill="currentColor" d="M11.63,7.95l-.04-.12s.02,.08,.04,.12Z"/><path fill="currentColor" d="M11.35,8.19l.13,.15c-.06-.09-.11-.15-.13-.15Z"/><path fill="currentColor" d="M9.84,16.44c.3,.23,.74,.6,.44,.28l-.3-.31c.01,.09-.05,.08-.13,.03Z"/><path fill="currentColor" d="M10.83,11.93l-.11-.08c.09,.12,.18,.23,.26,.33-.05-.08-.1-.16-.15-.25Z"/><path fill="currentColor" d="M9.6,10.62l.27,.13c-.08-.05-.17-.1-.27-.13Z"/><path fill="currentColor" d="M12.73,6.23l-.27-.36c-.06,.07,.12,.2,.27,.36Z"/><path fill="currentColor" d="M7.64,18.39c.16,.07,.24,.09,.28,.08-.22-.12-.54-.33-.28-.08Z"/><path fill="currentColor" d="M14.75,11.35c-.03-.08-.09-.15-.15-.22,.03,.08,.07,.15,.15,.22Z"/><path fill="currentColor" d="M8.02,18.35l-.09-.05c.02,.08,.04,.15,0,.16,.17,.09,.29,.13,.1-.11Z"/><path fill="currentColor" d="M17.96,1.41l.05,.02s-.05-.04-.05-.02Z"/><path fill="currentColor" d="M22.62,2.78s-.02,.06-.03,.09c.03,0,.05-.01,.03-.09Z"/><path fill="currentColor" d="M7.27,19.4s.04,.03,0,0h0Z"/><path fill="currentColor" d="M5.74,18.6s-.09-.07-.17-.13c.09,.06,.14,.1,.17,.13Z"/><path fill="currentColor" d="M6.39,16.16h0c-.07-.05-.06-.04,0,0Z"/><path fill="currentColor" d="M7.08,19.33c.05,.02,.09,.03,.13,.04-.03-.01-.07-.03-.13-.04Z"/><path fill="currentColor" d="M7.26,19.44h-.05c.06,.04,.1,.06,.05,0Z"/><path fill="currentColor" d="M7.27,19.36s-.03,.02-.06,.01c.03,.01,.05,.02,.06,.03,0-.01,0-.03,0-.05Z"/><path fill="currentColor" d="M16.16,4.96l.04,.02c-.09-.16-.09-.13-.04-.02Z"/><path fill="currentColor" d="M7.74,12.28v.02h.03l-.03-.02Z"/><path fill="currentColor" d="M7.63,11.93c.32,.44,.24,.42,.13,.37l.88,.89-1.01-1.26Z"/><path fill="currentColor" d="M12.17,7.25l-.36-.2c-.35-.56-.12-.47-.58-.79,.94,.98-.23,.42,.7,1.4l-.26-.15s-.03-.07,0-.07c-.56-.36,.61,.78,.33,.78-.12-.03-.29-.13-.37-.28l.13,.35c-.05,.01-.21-.16-.16-.18l-.09,.24-.03-.03c.13,.18,.3,.46,.37,.59-.18-.1-.08-.12-.21-.23l.14,.33c-.28-.21-.45-.53-.35-.56-1.03-.89,.16,.32-.58-.06l-.03-.21c-.6-.5-.47-.23-.9-.48,.2,.16,1.04,.67,1.18,1.01-.1-.05-.17-.04-.03,.2-.34-.34-.31-.21-.36-.12l-.44-.46c.06,.2,.29,.43,.45,.68-.12,.03-.49-.3-.8-.58-.2,.05,.64,.48,.58,.72-.28-.07-.17,.19-.03,.59-.23-.08-.26-.29-.42-.4l.29,.43s-.13-.11-.18-.17c.08,.2,.44,.46,.48,.67,.47,.53-.9-.56-.45,.12-.15-.1-.26-.29-.44-.46,.22,.52,.14,.4,.51,1.02l-.4-.2c.41,.27,.72,.77,.96,1.18,.19,.14,.36,.26,.44,.31l.11,.38c-.09-.06-.23-.23-.4-.44l.08,.13c-.21-.12-.45-.41-.67-.7,.1,.07,.22,.15,.33,.23-.24-.31-.51-.65-.78-.91,.04,.06,.07,.12,.08,.17-.07-.08-.13-.16-.17-.2-.05-.04,.03,.07,.13,.21l-.53-.48,.19,.21-.49-.14c.38,.64,1.01,1.5,1.02,1.9-.32-.42-.59-.62-1.03-1.06,.52,.41-.04-.35,.16-.36-.1,0-.3-.22-.36-.3l.23,.61c-.35-.36-.31-.23-.5-.33,.74,.67,.33,.61,.47,.9-.24-.23-.47-.49-.32-.53-.63-.43,.7,.96,.15,.61,.02-.03,.07,0-.05-.13,.16,.26-.14,.22-.31-.01l.02-.03c-.22,.05-.42,.39,.13,1.04-.07-.08-.68-.77-.79-.9,.57,.77,1.12,1.56,1.67,2.35-.47-.56-1.73-1.77-1.88-2.18-.11-.04-.23-.1-.13,.16,.09,.06,.77,.73,.78,.81-.64-.52-.36-.26-.93-.68,.14,.08,.87,.97,.78,1-.1-.14-.76-.84-.82-.95l.6,.97c-.1-.18-.63-.72-.87-.92,.16,.15-.14,.1-.11,.22l.24,.14c-.28,.02,.88,1.33,.68,1.44-.13-.19-.9-1.11-1.08-1.14,.34,.47,1.67,2.22,1.82,2.68l-.25-.22,.14,.38c-.51-.7-1.53-2.24-1.89-2.87-.24-.14-.28-.27-.35-.16-.24-.2-.26-.4-.24-.44l-.36,.06c.46,.49,.28,.66,.66,1.06l-.22-.74c.46,.49,1.13,1.54,.9,1.6-.22-.16-.77-.91-.93-1.08,.13,.19,.14,.47,.02,.36l-.17-.33c-.26-.1,.46,.79-.09,.42-.07,0-.7-.53-.44-.23,.59,.5,2.21,2.23,2.57,2.69-.05-.03-.68-.37-.98-.6-.47-.38-.9-1.12-1.3-1.45,.12,.14,.25,.33,.28,.4-.15-.08-.38-.43-.4-.29,.46,.5-.21,.12,.36,.45,.05,.22-.18-.02-.26,.1,.34,.29,.97,1.15,1.03,1.36-.12-.13-.29-.27-.38-.33-.2,.11-.5-.01-.66,.14-.13-.1-.35-.16-.54-.39,.07,.11,.22,.28,.18,.34-.52-.3,.03-.18-.55-.58,.28,.28,.28,.5,.4,.74,.48,.38,.23-.08,.12-.32,.62,.57,1.16,1.29,1.33,1.69,.05,.25-.46-.31-.38-.21-.31,.14,.98,1.13,.37,.92-.48-.26-.85-.65-1.17-.87-.08-.24,.4,.05,.44-.03l-.27-.07c-.11-.14-.16-.3,0-.24-.44-.24-.41,.36-.92,.31,.12,.14,.24,.31,.43,.4l-.02-.11c.39,.19,.42,.45,.64,.49,.2,.25,.56,.58,.29,.55l-.54-.3c.15,.09,.36,.12,.22,0,.2,.18-.82-.25-.15,.2l.41,.14c.23,.23,.77,.59,.56,.57,.56,.24-.05-.05,.6,.23-.8-.37,.11-.13-.73-.52,.73,.37,.35,.09,.99,.4-.17-.11-.34-.19-.22-.19l-.14-.11h0s-.03-.03,0,0c-.08-.04-.18-.08-.28-.14-.37-.28-.29-.38-.46-.56,.11,.01,.18,.15,.37,.25l-.25-.27c.37,.25,.68,.34,.83,.58l.07-.07c.24,.11,.35,.11,.24-.05,.11,.02-.3-.41-.06-.15l-.11-.31,.09,.07c.15-.09-.31-.77,.43-.38-.04-.12-.09-.27,.07-.25l.29,.26c-.04-.15,.44,.1,.18-.21,.8,.68,.44-.11,.68-.08l-.34-.37c.1-.05,.07-.22,.02-.46l-.31-.32c-.16-.35,.43,.03,.54-.12,.11,.14,.04,.13-.05,.08,.84,.6-.15-.86,.5-.45-.07-.16,0-.14,.1-.08,0,0,0,.01,0,.03,0,0,.01,0,.02-.01l.21,.13c-.09-.07-.16-.12-.2-.14,.02-.03,.03-.11,0-.24l.34,.34s0,0,0-.02c.16,.09-.12-.2-.38-.45-.03-.08-.07-.17-.14-.27,.55,.55-.06-.3,.54,.28-.24-.33,.02-.43-.52-1.08,.08,.08,.12,.11,.1,.14,.11,.03,.23,.05,.11-.17l.43,.44-.44-.71c.32,.22,.49,.35,.74,.76-.33-.68-.05-.33-.4-.98l.26,.3c.04-.06-.25-.51,0-.31,.31,.22,.48,.1,.64-.04,.16-.13,.33-.28,.7-.16-.87-.78,.49,.25-.14-.4,.21,.18,.35,.26,.48,.47-.06-.32,.5,.11,.06-.52,.21,.18,.26,.32,.38,.42-.03-.05-.13-.21,0-.11,.13,.1,.14,.18,.21,.29,.1-.17-.48-.78-1.03-1.36,.33,.2,.33,.13,.01-.29,.21,.16,.44,.32,.42,.47,.07-.02,.56-.01,.11-.47,.13,.1,.1-.03,.06-.1,.13-.08,.18-.05,.24-.19l-.1-.05c-.5-.59-.03-.21-.01-.36l.05,.06c.58,.21-.1-.27,.53,0l-.35-.33c-.7-.75,.6,.27,.43-.12l-.23-.16c-.19-.31,1.15,.84,1.3,.87,.08,.05,.08,.12,.11,.19,.58,.28-.42-.47-.4-.69,.26,.22,.57,.64,.7,.61,.23,.16-.54-1.01,.03-.66-.21-.16-.41-.33-.49-.52,.02-.15,.92,.48,.42-.18,.06,.04,.11,.09,.16,.13-.08-.22-.04-.46-.31-.82,1.22,1.13-.16-.97,.91,.12l.14-.25,.1,.12c.2-.05-.01-.36-.23-.66,.1,.05,.18,.17,.23,.23,.4,.04,.38-.03,0-.72l.36,.34c-.16-.25,.81,.29,.59-.3,.04,.04,.1,.11,.14,.18-.2-.62,1.46,.49,.26-.87l-.18-.45c-.27,.07-.53-.58-.81-.72,0-.14,.56,.21,.54,.36l-.08-.05c.63,.7,.45,.02,.9,.48,.31-.37,1.01-.34,1.37-.64l-.56-.48,.14-.08c.15,.09,.45,.36,.35,.42,.34,.25-.11-.38-.22-.49,.37,.05,.55,.66,.61,.62l.03-.1-.08-.05c-.16-.26-.38-.49-.26-.56,.16,.04,.35,.28,.4,.28,.04,.04,.06,.05,.05-.02l.19-.1-.47-.35c-.14-.26,.15-.11-.38-.5,.82,.61,.78-.28,1.06-.13-.22-.38-.13-.47,.02-.54-.11-.06-.6-.49-.45-.53,.93,.96,.59,.23,1.36,.82-.53-.37,.14-.38-.62-.9,.15,0,.37,.34,.65,.5-.2-.55,.64-.19,.74-.55-.13-.12-.36-.27-.5-.5l.76,.47c-.02-.11-.7-.73-.18-.4-.12-.09-.3-.22-.31-.29,1.07,.11,.35-1.42,1.98-.84-.31-.16-.3-.23-.27-.28-.09-.02-.32-.29-.51-.44l.68,.23c-.46-.47,.16-.25-.3-.69l.03,.14c-.49-.58-1.35-.97-2.06-1.62,.56,.65-1.16-.59-.38,.37-.18-.1-.21-.23-.39-.36,.27,.31,.3,.41,.08,.38l-.07-.08c-.14,.31-.53,.14-.97,.22l.37,.3c-.1,.01-.22-.07-.33-.13,.47,.55,.18-.13,.71,.46-.78-.57-.38,.4-1.24-.29-.08,.08,.43,.35,.34,.43l-.24-.18,.26,.28c-.1,.01-.4-.21-.58-.38,.03,0-.02-.09-.02-.12-.32-.16-.11,.29-.21,.24l.21,.04c-.02,.43-.58,.45-.35,1.09l.18,.14c.13,.46-.31-.03-.36,.29l-.03-.04c.12,.19,.16,.32,.09,.36-.14-.23-.45-.26-.6-.53,.14,.5,.16,.33,.64,1.04l-.29-.23c.2,.28,.32,.4,.3,.57-.15-.3-.46-.33-.68-.71-.77-.37,.3,.87-.64,.13,.65,.81,.58,.23,.68,.43,.28,.19,.48,.61,.34,.6-.08,.05-1.05-.81-1.19-.64,.02-.01-.04-.07-.02-.08-.25-.12,.14,.37-.24,.14,.4,.48-.12,.07,.43,.64v-.27c.08,.23,.66,.96,.21,.78-.1-.12-.21-.31-.27-.42-.21-.12,.03,.19-.18,.06-.55-.57,.05-.3-.29-.81-.28-.19,.24,.57-.32-.08,.71,.83-.25,.06,.23,.75l-.33-.34c.04,.07,.16,.26,.12,.29l-.38-.49c.29,.46-.49-.16-.37,.13,.16-.18,.44,.36,.76,.53,.24,.66-1-.75-1.08-.35-.01-.08,.32,.08,.43,.29-.12-.02-.3-.09-.51-.24-.09,.23,.37,.32,.51,.59-.46-.35,.09,.24,.15,.45l-.34-.34c-.4-.04,.66,.76,.23,.66l-.4-.54,.04,.21-.37-.41c.19,.38,.09,.34-.11,.32,.26,.22,.6,.63,.53,.72-.26-.15-.29-.36-.36-.19-.19-.24-.42-.54-.06-.27-.1-.12-.19-.24-.29-.36-.29-.18-.2,.09-.24,.14,.03,0,.07,0,.12,.04l.3,.64c-.15-.1-.24-.23-.31-.35,0,.07,.14,.25,.11,.33-.26-.29-.55-.58-.61-.78l.15,.47c-.13-.11-.41-.25-.49-.38-.25-.08,.32,.76-.01,.65,.05,.06,.09,.12,.1,.19-.17,.05-.61-.2-.36,.31l-.57-.43c0,.21,.72,.53,.74,.89,.04,.28-.47-.38-.64-.48,.19,.31,.59,.93,.08,.63-.06-.13,.05-.08,.04-.16Zm-1.06,1.47c-.05-.1-.22-.37,0-.18,.36,.42,.15,.25,0,.18Zm-1.13,2.73c-.09-.13,0-.1,.15,0,0,.05-.03,.06-.15,0Zm-2.83,7.43l-.02-.02c.18,.07,.11,.04,.02,.02Zm-.24-.03s.1,.09,.16,.13c-.09-.08-.08-.11-.04-.11-.11-.07-.18-.11-.12-.02ZM18.83,6.88l-.11-.07c-.05-.15,.03-.05,.11,.07Z"/><path fill="currentColor" d="M9.75,10.77c.06,.05,.13,.11,.19,.18-.05-.07-.11-.13-.19-.18Z"/><polygon fill="currentColor" points="12.78 6.3 12.79 6.3 12.73 6.23 12.78 6.3"/><path fill="currentColor" d="M5.53,14.33c.07,.03,.15,.08,.22,.13-.08-.09-.16-.15-.22-.13Z"/><path fill="currentColor" d="M7.32,19.74l-.09-.1s-.08-.01-.16-.04c.1,.05,.24,.13,.25,.14Z"/><path fill="currentColor" d="M4.35,19.09c.05,.03,0,.03,.05,.06l.21,.07c0-.06-.15-.16-.26-.13Z"/><path fill="currentColor" d="M5.89,19.01c-.36-.19-.26-.08-.22,0,0,0,0,0,0,0,.5,.27,.36,.14,.22,0Z"/><path fill="currentColor" d="M5.67,19.03s0,.04-.01,.05c.2,.1,.05,0,.01-.05Z"/><path fill="currentColor" d="M7.05,19.13c-.1-.04,.42,.31,.27,.23,.4,.32-.41-.49-.27-.23Z"/><polygon fill="currentColor" points="4.68 18.43 5.14 18.64 4.8 18.42 4.68 18.43"/><path fill="currentColor" d="M5.28,18.14l-.18,.02c.07,.04,.11,.08,.13,.12,.05-.05,.17-.05,.05-.13Z"/><path fill="currentColor" d="M5.23,18.28s-.04,.06,.02,.12c0-.02,.01-.06-.02-.12Z"/><polygon fill="currentColor" points="4.63 18.22 4.73 18.24 4.8 18.18 4.63 18.22"/><path fill="currentColor" d="M6.07,17.27l-.03-.19c-.12-.12-.22-.17-.2-.09,.07,.1,.09,.18,.23,.27Z"/><path fill="currentColor" d="M4.78,16.68c.1,.04,.19,.11,.33,.2l-.48-.4,.14,.2Z"/><path fill="currentColor" d="M4.92,16.28c-.12-.12-.24-.47-.33-.32,.12,.12,.14,.32,.33,.32Z"/><polygon fill="currentColor" points="6.85 15.43 6.83 15.46 7.54 16.2 6.85 15.43"/><path fill="currentColor" d="M6.47,12.49c-.27-.08,.39,.49,.09,.36,.13,.2,.25,.11,.36,.29-.1-.25,.03-.17-.45-.65Z"/><path fill="currentColor" d="M6.91,13.14s.04,.09,.07,.15c-.02-.06-.05-.11-.07-.15Z"/><polygon fill="currentColor" points="23.27 2.88 23.49 2.94 23.19 2.76 23.27 2.88"/><path fill="currentColor" d="M22.82,2.24l.5,.41-.4-.43s.02,.1-.1,.02Z"/><path fill="currentColor" d="M10.01,7.97l.1,.12c.13,.11,.15,.1,.2,.09l-.31-.21Z"/><polygon fill="currentColor" points="11.28 7.42 11.25 7.42 11.69 7.81 11.28 7.42"/><path fill="currentColor" d="M11.53,6.12s0,.14-.04,.16c0-.14,.56,.36,.04-.16Z"/></g></g></g></g></symbol>';
  document.body.appendChild(container);
}
function _makeCrossSVG(size) {
  _initCroixSVG();
  size = size || 16;
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 30.1 20.93');
  svg.setAttribute('width', size);
  svg.setAttribute('height', Math.round(size * 20.93 / 30.1));
  svg.style.cssText = 'display:inline-block;vertical-align:middle;flex-shrink:0;';
  var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', '#croix-svg');
  svg.appendChild(use);
  return svg;
}
// ── Drag des postits par leur titre ──
function _makeDraggable(el, handle) {
  handle = handle || el;
  handle.style.cursor = 'grab';
  var _dx = 0, _dy = 0, _dragging = false;
  handle.addEventListener('mousedown', function(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    _dragging = true;
    var rect = el.getBoundingClientRect();
    _dx = e.clientX - rect.left;
    _dy = e.clientY - rect.top;
    handle.style.cursor = 'grabbing';
    document.addEventListener('mousemove', _onMove);
    document.addEventListener('mouseup', _onUp);
  });
  function _onMove(e) {
    if (!_dragging) return;
    var x = Math.max(0, Math.min(window.innerWidth  - el.offsetWidth,  e.clientX - _dx));
    var y = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, e.clientY - _dy));
    el.style.left = x + 'px';
    el.style.top  = y + 'px';
    el.style.right  = 'auto';
    el.style.bottom = 'auto';
  }
  function _onUp() {
    _dragging = false;
    handle.style.cursor = 'grab';
    document.removeEventListener('mousemove', _onMove);
    document.removeEventListener('mouseup', _onUp);
  }
}

var _postitBaseX = { 'menu-postit': 10,  'filtre-postit': 250, 'liste-postit': 20 };
var _postitBaseY = { 'menu-postit': 72,  'filtre-postit': 24,  'liste-postit': 30  };
function _rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function _positionPostit(id) {
  var el = document.getElementById(id); if(!el) return;
  var bx = _postitBaseX[id] || 0;
  var by = _postitBaseY[id] || 72;
  var x = Math.max(8, bx + _rand(-20, 20));
  var y = Math.max(60, by + _rand(-30, 60));
  el.style.left = x + 'px'; el.style.top = y + 'px';
  el.style.right = 'auto'; el.style.bottom = 'auto';
}
function toggleMenuPostit(e) {
  if(e) e.stopPropagation();
  var el = document.getElementById('menu-postit'); if(!el) return;
  if(el.classList.contains('hidden')){ buildMenuPostit(); _positionPostit('menu-postit'); el.classList.remove('hidden');
    var _mh = el.querySelector('.postit-title'); if (_mh && !el._draggable) { _makeDraggable(el, _mh); el._draggable = true; }
  } else el.classList.add('hidden');
}
function toggleFiltrePostit(e) {
  if(e) e.stopPropagation();
  var el = document.getElementById('filtre-postit'); if(!el) return;
  if(el.classList.contains('hidden')){ buildFiltrePostit(); _positionPostit('filtre-postit'); el.classList.remove('hidden');
    var _fh = el.querySelector('.postit-title'); if (_fh && !el._draggable) { _makeDraggable(el, _fh); el._draggable = true; }
  }
  else el.classList.add('hidden');
}
function closeMenuPostit()   { var e=document.getElementById('menu-postit');   if(e) e.classList.add('hidden'); }
function closeFiltrePostit() { var e=document.getElementById('filtre-postit'); if(e) e.classList.add('hidden'); }
function toggleColophonPostit(e) {
  if(e) e.stopPropagation();
  var el = document.getElementById('colophon-postit'); if(!el) return;
  el.classList.toggle('hidden');
}

function openAboutTab(e) {
  if (e) e.stopPropagation();
  var el = document.getElementById('lc-text-tab'); if (!el) return;
  el.classList.add('lc-text-tab-active');
}
document.addEventListener('click', function(e) {
  var el = document.getElementById('lc-text-tab');
  if (el && el.classList.contains('lc-text-tab-active') && !el.contains(e.target)) {
    el.classList.remove('lc-text-tab-active');
  }
});

document.addEventListener('click', function(e) {
  ['menu-postit','filtre-postit','colophon-postit'].forEach(function(id) {
    var el = document.getElementById(id);
    if(el && !el.classList.contains('hidden') && !el.contains(e.target)) el.classList.add('hidden');
  });
});

/* ═══════════════════════════════════════
   EXPORTS
═══════════════════════════════════════ */
function exportAnnotationsJSONQuick() {
  closeMenuPostit();

  // Overlay transparent — fermeture au clic extérieur sans assombrir l'interface
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:900;';

  // Popup : exactement le style .postit de l'interface
  var popup = document.createElement('div');
  popup.style.cssText = [
    'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);',
    'z-index:901;',
    'background:rgba(253,252,249,0.82);',
    'backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);',
    'box-shadow:0 0 0 1.5px rgba(12,12,10,0.15),0 0 0 2px rgba(12,12,10,0.35),0 0 8px 3px rgba(12,12,10,0.18),0 0 24px 6px rgba(12,12,10,0.08);',
    'border-radius:0;',
    'min-width:260px;width:min(320px,90vw);',
    'font-family:PPNeueMontreal,sans-serif;',
    'display:flex;flex-direction:column;'
  ].join('');

  function closeJsonPopup() {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (popup.parentNode)   popup.parentNode.removeChild(popup);
  }
  overlay.addEventListener('click', function(e) { if (e.target === overlay) closeJsonPopup(); })

  function doExport(profileIdxSet) {
    var filteredAnnots = profileIdxSet
      ? annotations.filter(function(a) { return profileIdxSet.indexOf(parseInt(a.profile)) >= 0; })
      : annotations;
    var filteredThoughts = profileIdxSet
      ? floatingThoughts.filter(function(t) { return profileIdxSet.indexOf(parseInt(t.profile || 0)) >= 0; })
      : floatingThoughts;
    var filteredProfiles = profileIdxSet
      ? profiles.filter(function(p, i) { return profileIdxSet.indexOf(i) >= 0; })
      : profiles;
    // Renormaliser les indices globaux → locaux (0, 1, 2…)
    var globalToLocal = {};
    if (profileIdxSet) {
      profileIdxSet.forEach(function(gIdx, lIdx) { globalToLocal[gIdx] = lIdx; });
    } else {
      profiles.forEach(function(_, i) { globalToLocal[i] = i; });
    }
    var data = {
      profiles: filteredProfiles,
      themes: (typeof themes !== 'undefined') ? themes : [],
      annotations: filteredAnnots.map(function(a) {
        return { passage: a.selText || '', note: a.note || '', trace: a.trace || 'evidence',
                 dialogue: !!(a.dialogue), posture: a.posture != null ? a.posture : 50,
                 profile: globalToLocal[parseInt(a.profile)] !== undefined ? globalToLocal[parseInt(a.profile)] : 0,
                 spanIds: a.spanIds || [], themeId: a.themeId || null };
      }),
      floatingThoughts: filteredThoughts.map(function(t) {
        var gp = parseInt(t.profile || 0);
        return { text: t.text, posture: t.posture != null ? t.posture : 50, dialogue: !!(t.dialogue),
                 profile: globalToLocal[gp] !== undefined ? globalToLocal[gp] : 0, y: t.y || 0,
                 anchorId: t.anchorId || null, anchorOffset: t.anchorOffset || 0 };
      })
    };
    var suffix = (profileIdxSet && profileIdxSet.length === 1)
      ? '_' + ((profiles[profileIdxSet[0]] && profiles[profileIdxSet[0]].name)
          ? profiles[profileIdxSet[0]].name.replace(/\s+/g, '_')
          : ('profil' + profileIdxSet[0]))
      : '';
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url  = URL.createObjectURL(blob);
    var lnk  = document.createElement('a');
    lnk.download = 'annotations_' + (docTitle || 'marge').replace(/\s+/g, '_') + suffix + '.json';
    lnk.href = url; lnk.click();
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    closeJsonPopup();
  }

  /* Header — vraies classes CSS de l'interface */
  var header = document.createElement('div');
  header.className = 'postit-title';  // padding, font, centré, overflow:visible

  var titleInner = document.createElement('span');
  titleInner.className = 'postit-title-inner';  // barre jaune via ::after, position:relative

  var titleBlurred = document.createElement('span');
  titleBlurred.className = 'postit-title-blurred';
  titleBlurred.setAttribute('aria-hidden','true');
  titleBlurred.textContent = 'exporter';

  var titleSharp = document.createElement('span');
  titleSharp.className = 'postit-title-sharp';
  titleSharp.textContent = 'exporter';

  titleInner.appendChild(titleBlurred);
  titleInner.appendChild(titleSharp);
  header.appendChild(titleInner);
  popup.appendChild(header);

  var list = document.createElement('div');
  list.style.cssText = 'padding:4px 0 8px;';

  function makeProfileBtn(col, name, idxSet, count) {
    var btn = document.createElement('button');
    btn.className = 'postit-item';  // font, taille, padding, couleur — tout via CSS
    btn.addEventListener('click', function() { doExport(idxSet); });
    // Point couleur
    if (col && col !== 'transparent') {
      var dot = document.createElement('span');
      dot.style.cssText = 'display:inline-block;width:7px;height:7px;border-radius:50%;background:'+col+';margin-right:9px;vertical-align:middle;position:relative;top:-1px;flex-shrink:0;';
      btn.appendChild(dot);
    }
    var label = document.createTextNode(name);
    btn.appendChild(label);
    var counter = document.createElement('span');
    counter.className = 'count-badge';
    counter.style.marginLeft = '6px';
    counter.textContent = '(' + count + ')';
    btn.appendChild(counter);
    return btn;
  }

  /* Tous les profils */
  var allBtn = makeProfileBtn('transparent', 'tous les profils', null, annotations.length);
  list.appendChild(allBtn);

  /* Un bouton par profil */
  profiles.forEach(function(p, i) {
    var cnt = annotations.filter(function(a) { return parseInt(a.profile) === i; }).length;
    list.appendChild(makeProfileBtn(p.color, p.name, [i], cnt));
  });
  popup.appendChild(list);

  /* Pied — annuler */
  var foot = document.createElement('div');
  foot.style.cssText = 'padding:0 0 6px;';
  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'postit-item';
  cancelBtn.style.opacity = '0.22';
  cancelBtn.textContent = 'annuler';
  cancelBtn.addEventListener('mouseenter', function() { cancelBtn.style.opacity = '0.7'; });
  cancelBtn.addEventListener('mouseleave', function() { cancelBtn.style.opacity = '0.22'; });
  cancelBtn.addEventListener('click', closeJsonPopup);
  foot.appendChild(cancelBtn);
  popup.appendChild(foot);

  document.body.appendChild(overlay);
  document.body.appendChild(popup);
}
function exportEdition() { if(window._exportEditionOverride){window._exportEditionOverride();}else{closeMenuPostit();exportAnnotationsJSON();} }

/* ─ Patch startReading ─ */
(function(){
  var orig = window.startReading;
  window.startReading = function() {
    orig();
    setTimeout(function(){ buildMenuPostit(); buildFiltrePostit(); }, 150);
  };
})();



// Convertit une couleur hex en CSS filter pour coloriser un SVG noir
// Technique : on passe par une approximation hue-rotate + saturate + brightness

/* ═══════════════════════════════════════════════════════
   THÈMES — système complet
═══════════════════════════════════════════════════════ */

// Structure : { id, name, color, creatorProfileIdx }
var themes = [];
var themeIdCtr = 0;
var _pendingAnnotThemeId = null; // thème sélectionné dans le popup en cours
var _activeThemeFilter = null;   // thème mis en valeur dans la phase lecture

// Palette riso — couleurs très fluos, esprit risographie
var THEME_PALETTE = [
  '#F7323F', // Riso Red
  '#FE8B05', // Riso Orange
  '#0078BF', // Riso Blue
  '#00A95C', // Riso Green
  '#F364B2', // Riso Fluorescent Pink
  '#765BA7', // Riso Purple
  '#00AEEF', // Riso Light Blue
  '#FF48B0', // Riso Hot Pink
  '#12A02C', // Riso Kelly Green
  '#FF6C2F', // Riso Fluorescent Orange
];

function _themeColor(idx) {
  return THEME_PALETTE[idx % THEME_PALETTE.length];
}

/* ── POPUP THÈME ── */

function openThemePanel() {
  var panel = document.getElementById('theme-panel');
  if (!panel) return;
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) {
    buildThemeExistingList();
    var inp = document.getElementById('theme-new-name');
    if (inp) { inp.value = ''; inp.focus(); }
  }
}

function buildThemeExistingList() {
  var el = document.getElementById('theme-existing-list');
  if (!el) return;
  el.innerHTML = '';
  if (!themes.length) {
    var empty = document.createElement('div');
    empty.style.cssText = 'font-family:var(--f-display);font-weight:200;font-size:14px;color:rgba(12,12,10,0.25);padding:4px 16px 6px;font-style:italic;';
    empty.textContent = 'aucun thème existant';
    el.appendChild(empty);
    return;
  }
  themes.forEach(function(t) {
    var item = document.createElement('div');
    item.className = 'theme-existing-item' + (t.id === _pendingAnnotThemeId ? ' selected' : '');
    var dot = document.createElement('span');
    dot.className = 'theme-existing-dot';
    dot.style.background = t.color;
    var name = document.createElement('span');
    name.textContent = _normalizeThemeName(t.name);
    item.appendChild(dot); item.appendChild(name);
    item.onclick = function(e) {
      e.stopPropagation();
      if (_pendingAnnotThemeId === t.id) {
        _pendingAnnotThemeId = null;
      } else {
        _pendingAnnotThemeId = t.id;
      }
      buildThemeExistingList();
      refreshThemeChip();
      document.getElementById('theme-panel').classList.add('hidden');
    };
    el.appendChild(item);
  });
}

function refreshThemeChip() {
  var disp = document.getElementById('theme-selected-display');
  if (!disp) return;
  disp.innerHTML = '';
  if (!_pendingAnnotThemeId) return;
  var t = themes.find(function(x){ return x.id === _pendingAnnotThemeId; });
  if (!t) return;
  var chip = document.createElement('span');
  chip.className = 'theme-chip';
  // Pass color as CSS custom property for the ::before dot
  chip.style.setProperty('--theme-color', t.color);
  chip.innerHTML = t.name + ' <span class="theme-chip-remove"><svg viewBox="0 0 30.1 20.93" width="11" height="8" style="display:inline-block;vertical-align:middle"><use href="#croix-svg"/></svg></span>';
  chip.onclick = function(e) {
    e.stopPropagation();
    _pendingAnnotThemeId = null;
    refreshThemeChip();
  };
  disp.appendChild(chip);
}

/* Normalise les apostrophes droites en apostrophes typographiques */
function _normalizeThemeName(name) {
  return (name || '').replace(/[\u0060\u00B4\u2018\u2019\u201A\u02BC']/g, '\u2019');
}

function createAndSelectTheme() {
  var inp = document.getElementById('theme-new-name');
  if (!inp) return;
  var name = _normalizeThemeName(inp.value.trim());
  if (!name) return;
  var colorPicker = document.getElementById('theme-new-color');
  var color = (colorPicker && colorPicker.value) ? colorPicker.value : _themeColor(themes.length);
  var t = {
    id: 'th' + (++themeIdCtr),
    name: name,
    color: color,
    creatorProfileIdx: currentProfile
  };
  themes.push(t);
  _pendingAnnotThemeId = t.id;
  inp.value = '';
  // Reset picker to next riso color for next theme
  if (colorPicker) colorPicker.value = _themeColor(themes.length);
  refreshThemeChip();
  document.getElementById('theme-panel').classList.add('hidden');
}

/* ── Renommer un thème ── */
function renameTheme(themeId) {
  // Inline rename: ouvre un mini-popup sous le nom du thème dans la liste
  var t = themes.find(function(x){ return x.id === themeId; });
  if (!t) return;
  // Chercher le span du nom dans la liste
  var lp = document.getElementById('liste-postit');
  if (!lp) { var newN = prompt('Renommer :', t.name); if (newN) { t.name = _normalizeThemeName(newN.trim()); buildListePostit(); } return; }
  // Trouver le liste-theme-item correspondant
  var items = lp.querySelectorAll('.liste-theme-item');
  var targetItem = null;
  items.forEach(function(it) { if (it._themeId === themeId) targetItem = it; });
  if (!targetItem) return;
  var nameEl = targetItem.querySelector('.liste-theme-name');
  if (!nameEl) return;
  // Remplacer le span par un input
  var inp = document.createElement('input');
  inp.type = 'text';
  inp.value = t.name;
  inp.style.cssText = [
    'font-family:var(--f-display)', 'font-weight:200', 'font-size:18px',
    'letter-spacing:-0.02em', 'color:' + t.color,
    'background:none', 'border:none', 'outline:none', 'flex:1',
    'padding:0', 'width:100%',
  ].join(';');
  nameEl.replaceWith(inp);
  inp.focus(); inp.select();
  function _commit() {
    var val = _normalizeThemeName(inp.value.trim()) || t.name;
    t.name = val;
    var sp = document.createElement('span');
    sp.className = 'liste-theme-name';
    sp.style.cursor = 'pointer';
    sp.style.color = t.color;
    sp.textContent = val;
    sp.onclick = function(e) { e.stopPropagation(); renameTheme(themeId); };
    inp.replaceWith(sp);
    if (typeof renderThemeHighlights === 'function') renderThemeHighlights();
  }
  inp.addEventListener('blur', _commit);
  inp.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { inp.blur(); }
    if (e.key === 'Escape') { inp.value = t.name; inp.blur(); }
  });
  inp.addEventListener('mousedown', function(e) { e.stopPropagation(); });
  inp.addEventListener('click', function(e) { e.stopPropagation(); });
}

/* ── Supprimer un thème ── */
function deleteTheme(themeId) {
  var t = themes.find(function(x){ return x.id === themeId; });
  if (!t) return;
  var count = annotations.filter(function(a){ return a.themeId === t.id; }).length;
  var msg = count > 0
    ? 'Supprimer le thème « ' + t.name + ' » ? ' + count + ' annotation(s) ne seront plus associées à ce thème.'
    : 'Supprimer le thème « ' + t.name + ' » ?';
  if (!confirm(msg)) return;
  themes = themes.filter(function(x){ return x.id !== themeId; });
  annotations.forEach(function(a){ if (a.themeId === themeId) a.themeId = null; });
  if (_activeThemeFilter === themeId) clearThemeFilter();
  if (typeof toggleListePostit === 'function') {
    var lp = document.getElementById('liste-postit');
    if (lp && !lp.classList.contains("hidden")) buildListePostit();
  }
  if (typeof renderThemeHighlights === 'function') renderThemeHighlights();
  if (typeof applyAnnotStyles === 'function') applyAnnotStyles();
}

/* ── Initialisation du popup pour les thèmes ── */
function initThemeInPopup() {
  _pendingAnnotThemeId = null;
  var disp = document.getElementById('theme-selected-display');
  if (disp) disp.innerHTML = '';
  var panel = document.getElementById('theme-panel');
  if (panel) panel.classList.add('hidden');
  var btn = document.querySelector('.theme-add-btn');
  if (btn) btn.textContent = '+ ajouter un thème';
}

/* ── Pré-remplir le thème en mode édition ── */
function initThemeInEditPopup(annotId) {
  var a = annotations.find(function(x){ return x.id === annotId; });
  _pendingAnnotThemeId = a ? (a.themeId || null) : null;
  refreshThemeChip();
  var panel = document.getElementById('theme-panel');
  if (panel) panel.classList.add('hidden');
}


var _activeTileId = null;

function _activateTile(tile, tileH, baseZ, themeId) {
  // Désactiver toute tile précédemment active
  var container = document.getElementById('themes-tiles-container');
  if (container) {
    container.querySelectorAll('.tile-active').forEach(function(t) {
      t.classList.remove('tile-active');
      t.dataset.origStyle && (t.style.cssText = t.dataset.origStyle);
    });
  }
  // Sauvegarder le style original
  tile.dataset.origStyle = tile.style.cssText;
  _activeTileId = themeId;

  // Animation tiroir vers la gauche
  var bodyH = window.innerHeight;
  var drawerW = Math.min(320, window.innerWidth * 0.32);
  var drawerH = Math.round(Math.min(bodyH * 0.55, Math.max(tileH, 260)));
  var drawerTop = Math.round((bodyH - drawerH) / 2);

  tile.classList.add('tile-active');
  tile.style.left   = '64px';
  tile.style.top    = drawerTop + 'px';
  tile.style.width  = drawerW + 'px';
  tile.style.height = drawerH + 'px';
  tile.style.zIndex = 500;
  tile.style.transform = '';
  tile.style.boxShadow = '4px 0 32px rgba(0,0,0,0.12)';

  // Activer le filtre thème après l'animation
  setTimeout(function() {
    closeThemesOverlay();
    setTimeout(function() { activateThemeFilter(themeId); }, 30);
  }, 120);
}

function _deactivateTile(tile, origLeft, origTop, origW, origH, baseZ) {
  tile.classList.remove('tile-active');
  tile.style.left   = origLeft + 'px';
  tile.style.top    = origTop  + 'px';
  tile.style.width  = origW + 'px';
  tile.style.height = origH + 'px';
  tile.style.zIndex = baseZ;
  tile.style.boxShadow = '';
  _activeTileId = null;
}


function _hexToRgba(hex, alpha) {
  var r = parseInt(hex.slice(1,3),16);
  var g = parseInt(hex.slice(3,5),16);
  var b = parseInt(hex.slice(5,7),16);
  return 'rgba('+r+','+g+','+b+','+alpha+')';
}

/* ── Assombrit une couleur hex en la mélangeant avec du noir.
   amount = 0..1, 1 = noir pur. ── */
function _darkenColor(hex, amount) {
  hex = (hex || '#FE572A').replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(function(c){ return c+c; }).join('');
  var r = parseInt(hex.substr(0,2), 16);
  var g = parseInt(hex.substr(2,2), 16);
  var b = parseInt(hex.substr(4,2), 16);
  r = Math.round(r * (1 - amount));
  g = Math.round(g * (1 - amount));
  b = Math.round(b * (1 - amount));
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

/* ── Éclaircit une couleur hex en la mélangeant avec du blanc.
   amount = 0..1, 1 = blanc pur. ── */
function _lightenColor(hex, amount) {
  hex = (hex || '#FE572A').replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(function(c){ return c+c; }).join('');
  var r = parseInt(hex.substr(0,2), 16);
  var g = parseInt(hex.substr(2,2), 16);
  var b = parseInt(hex.substr(4,2), 16);
  r = Math.round(r + (255 - r) * amount);
  g = Math.round(g + (255 - g) * amount);
  b = Math.round(b + (255 - b) * amount);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

/* ── Luminance relative d'une couleur hex — true si la couleur est claire. ── */
function _isLightColor(hex) {
  hex = (hex || '#FE572A').replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(function(c){ return c+c; }).join('');
  var r = parseInt(hex.substr(0,2), 16);
  var g = parseInt(hex.substr(2,2), 16);
  var b = parseInt(hex.substr(4,2), 16);
  var lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6;
}

/* ── PHASE THÈMES (overlay) ── */

function buildThemesPhase() {
  var container = document.getElementById('themes-tiles-container');
  var emptyEl   = document.getElementById('themes-empty');
  var overlay   = document.getElementById('themes-overlay');
  if (!container || !overlay) return;

  container.innerHTML = '';
  container.classList.remove('has-active');
  _activeTileId = null;

  var allThemes = themes.map(function(t) {
    var count = annotations.filter(function(a){ return a.themeId === t.id; }).length;
    return { theme: t, count: count };
  });

  if (!allThemes.length) {
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');

  allThemes.forEach(function(item) {
    var t = item.theme;
    var count = item.count;

    var word = document.createElement('div');
    var dispName = _normalizeThemeName(t.name);
    word.className = 'riso-theme-word' +
      (dispName.length > 18 ? ' riso-name-xlong' : dispName.length > 10 ? ' riso-name-long' : '');
    word.dataset.themeId = t.id;
    // Inline styles critiques — color + transform garantis inline pour spécificité max
    word.style.color = t.color;
    word.style.writingMode = 'vertical-rl';
    word.style.textOrientation = 'mixed';
    word.style.transform = 'rotate(180deg)';

    // Texte du nom — apostrophes typographiques contre-tournées
    // (en vertical-rl + rotate(180deg), les lettres latines sont
    // remises debout mais les apostrophes/ponctuations "upright"
    // restent couchées : on les contre-tourne individuellement).
    word.innerHTML = dispName.replace(/[\u2018\u2019\u201A\u201B\u02BC\u0027\u0060\u00B4]/g, function(ch) {
      return '<span style="display:inline-block;transform:rotate(-90deg);transform-origin:center;">' + ch + '</span>';
    });

    // Badge count
    var badge = document.createElement('span');
    badge.className = 'riso-theme-count';
    badge.style.color = t.color;
    badge.textContent = count > 0 ? String(count) : '';
    word.appendChild(badge);

    word.addEventListener('click', function(e) {
      e.stopPropagation();
      var wasActive = word.classList.contains('riso-active');

      container.querySelectorAll('.riso-theme-word').forEach(function(w) {
        w.classList.remove('riso-active');
      });
      container.classList.remove('has-active');
      clearThemeFilter();

      if (!wasActive) {
        word.classList.add('riso-active');
        container.classList.add('has-active');
        var themeId = t.id;
        setTimeout(function() {
          closeThemesOverlay();
          setTimeout(function() { activateThemeFilter(themeId); }, 40);
        }, 200);
      }
    });

    container.appendChild(word);
  });
}

function openThemesOverlay() {
  var overlay = document.getElementById('themes-overlay');
  if (!overlay) return;
  if (!overlay.classList.contains('hidden')) {
    closeThemesOverlay();
    return;
  }
  overlay.classList.remove('hidden');
  // Backdrop cliquable pour fermer
  overlay.style.pointerEvents = 'auto';
  buildThemesPhase();

  overlay._bgHandler = function(e) {
    // Ferme si on clique sur le fond (pas sur un mot-thème)
    if (!e.target.closest('.riso-theme-word')) {
      closeThemesOverlay();
    }
  };
  overlay.addEventListener('click', overlay._bgHandler);
}

function closeThemesOverlay() {
  var overlay = document.getElementById('themes-overlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  overlay.style.pointerEvents = 'none';
  if (overlay._bgHandler) overlay.removeEventListener('click', overlay._bgHandler);
  // Vider le container — le rail disparaît avec l'overlay
  var container = document.getElementById('themes-tiles-container');
  if (container) container.innerHTML = '';
}

/* ── Highlight thème dans la phase lecture ── */

function activateThemeFilter(themeId) {
  _activeThemeFilter = themeId;
  renderThemeHighlights();
  // Banner supprimée — le tab actif indique le filtre
  _syncThemeTabActiveStates();
  // Dim margin notes not belonging to this theme
  var mc = document.getElementById('margin-col');
  var railRight = document.getElementById('theme-rail-right');
  if (railRight) railRight.classList.add('theme-filter-mode');
  if (mc) {
    mc.classList.add('theme-filter-mode');
    var themeAnnotIds = {};
    annotations.filter(function(a){ return a.themeId === themeId; }).forEach(function(a){ themeAnnotIds[a.id] = true; });
    mc.querySelectorAll('.live-margin-note[data-annot-id]').forEach(function(el) {
      el.classList.toggle('theme-active-note', !!themeAnnotIds[el.dataset.annotId]);
    });
  }
}

function clearThemeFilter() {
  _activeThemeFilter = null;
  clearThemeHighlights();
  _syncThemeTabActiveStates();
  var mc = document.getElementById('margin-col');
  var railRight = document.getElementById('theme-rail-right');
  if (railRight) railRight.classList.remove('theme-filter-mode');
  if (mc) {
    mc.classList.remove('theme-filter-mode');
    mc.querySelectorAll('.theme-active-note').forEach(function(el){ el.classList.remove('theme-active-note'); });
  }
}

/* Met à jour la classe .theme-tab-active sur tous les postits de thème
   visibles, sans reconstruire le DOM. */
function _syncThemeTabActiveStates() {
  document.querySelectorAll('.theme-tab').forEach(function(tab) {
    tab.classList.remove('theme-tab-active');
  });
  if (!_activeThemeFilter) return;
  // On retrouve les tabs correspondant au thème actif via leur couleur,
  // car l'id du thème n'est pas stocké sur l'élément (pas d'attribut
  // dédié) ; on stocke plutôt dataset.themeId à la création pour fiabilité.
  document.querySelectorAll('.theme-tab[data-theme-id="' + _activeThemeFilter + '"]').forEach(function(tab) {
    tab.classList.add('theme-tab-active');
  });
}

function renderThemeHighlights() {
  clearThemeHighlights();
  if (!_activeThemeFilter) return;
  var t = themes.find(function(x){ return x.id === _activeThemeFilter; });
  if (!t) return;

  var themeAnnots = annotations.filter(function(a){ return a.themeId === _activeThemeFilter; });
  var td = document.getElementById('text-display');
  if (!td) return;

  td.classList.add('theme-filter-mode');
  var themeSpanSet = {};
  themeAnnots.forEach(function(a) {
    a.spanIds.forEach(function(sid) {
      themeSpanSet[sid] = true;
      var w = wordById[sid];
      if (w) { w.el.classList.add('theme-active-span'); w.el.style.opacity = '1'; }
    });
  });
  // Dimmer en inline les mots annotés hors-thème (style.color bypass l'opacité CSS)
  words.forEach(function(w) {
    if (w.el.classList.contains('annotated') && !themeSpanSet[w.el.id]) {
      w.el.style.opacity = '0.1';
    }
  });

  // Re-render overlays so they pick up theme-active-overlay class
  requestAnimationFrame(function() {
    _repositionOverlays();
    // Re-sync margin notes after renderLiveMarginNotes may have rebuilt them
    var mc2 = document.getElementById('margin-col');
    var railRight2 = document.getElementById('theme-rail-right');
    if (railRight2 && _activeThemeFilter) railRight2.classList.add('theme-filter-mode');
    if (mc2 && _activeThemeFilter) {
      mc2.classList.add('theme-filter-mode');
      var tIds = {};
      annotations.filter(function(a){ return a.themeId === _activeThemeFilter; }).forEach(function(a){ tIds[a.id]=true; });
      mc2.querySelectorAll('.live-margin-note[data-annot-id]').forEach(function(el){
        el.classList.toggle('theme-active-note', !!tIds[el.dataset.annotId]);
      });
    }
  });
}

function clearThemeHighlights() {
  var td = document.getElementById('text-display');
  if (!td) return;
  td.classList.remove('theme-filter-mode');
  document.querySelectorAll('.theme-active-span').forEach(function(el){ el.classList.remove('theme-active-span'); });
  // Retirer les opacités inline forcées par le filtre thème
  words.forEach(function(w) { if (w.el.style.opacity) w.el.style.opacity = ''; });
}

function showThemeBanner() {
  var banner = document.getElementById('theme-active-banner');
  if (!banner || !_activeThemeFilter) return;
  var t = themes.find(function(x){ return x.id === _activeThemeFilter; });
  if (!t) return;
  banner.innerHTML =
    '<span class="banner-theme-name"><span class="banner-dot" style="background:' + t.color + '"></span>' + t.name + '</span>' +
    '<button onclick="clearThemeFilter()">effacer <svg viewBox="0 0 30.1 20.93" width="12" height="8" style="display:inline-block;vertical-align:middle"><use href="#croix-svg"/></svg></button>';
  banner.classList.add('visible');
}

function hideThemeBanner() {
  var banner = document.getElementById('theme-active-banner');
  if (banner) banner.classList.remove('visible');
}


/* ── Injecter le banner dans le DOM ── */
(function() {
  var banner = document.createElement('div');
  banner.id = 'theme-active-banner';
  banner.innerHTML = '';
  document.body.appendChild(banner);
})();





/* ── Import/export thèmes et champs complets géré directement dans handleJsonImportLive et injectJsonAnnotations ── */



/* ── Expose global functions for inline HTML handlers ── */
window.landingImport             = landingImport;
window.startReading              = startReading;
window.cancelAnnot               = cancelAnnot;
window.confirmAnnot              = confirmAnnot;
window.selectTrace               = selectTrace;
window.onPopupNoteInput          = onPopupNoteInput;
window.onDialogueCheck           = onDialogueCheck;
window.onThoughtDialogueCheck    = onThoughtDialogueCheck;
window.enterLinkingMode          = enterLinkingMode;
window.openThemePanel            = openThemePanel;
window.createAndSelectTheme      = createAndSelectTheme;
window.cancelThought             = cancelThought;
window.confirmThought            = confirmThought;
window.openEditThought           = openEditThought;
window.onThoughtNoteInput        = onThoughtNoteInput;
window.updatePostureLabels       = updatePostureLabels;
window.updateThoughtPostureLabels= updateThoughtPostureLabels;
window.toggleMenuPostit          = toggleMenuPostit;
window.closeMenuPostit           = closeMenuPostit;
window.toggleFiltrePostit        = toggleFiltrePostit;
window.toggleListePostit         = toggleListePostit;
window.openThemesOverlay         = openThemesOverlay;
window.handleJsonImportLive      = handleJsonImportLive;
window.showToast                 = showToast;
window.hideToast                 = hideToast;
window.exportAnnotationsJSONQuick= exportAnnotationsJSONQuick;
// exportEdition est déjà globale via sa déclaration function — pas de réassignation ici
window.toggleDimUnannotated      = toggleDimUnannotated;
window.resetAll                  = resetAll;
