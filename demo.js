/* ═══════════════════════════════════════════════════════
   margin.alia — TEXTE D'EXEMPLE (portfolio)
   Quand l'adresse contient ?demo (c'est le cas dans le portfolio),
   l'accueil normal s'affiche avec, sous « importer un texte à
   annoter », un lien « ou essayer avec un texte d'exemple ».
   Il charge Les Nuits blanches comme si on avait importé le
   fichier : on passe par l'étape titre / auteur / commencer, puis
   le texte s'ouvre avec les annotations des lectrices.
   Sans ?demo, l'interface fonctionne exactement comme avant.

   Le contenu est dans contenu/demo-data.js (chargé comme un script,
   ce qui marche aussi quand on ouvre le site en local, sans serveur).
   ═══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var params = new URLSearchParams(location.search);
  if (!params.has('demo')) return;

  var DATA_URL = 'contenu/demo-data.js';

  /* ── Style du lien : en Satoshi, comme le reste du portfolio,
        pour qu'on comprenne que c'est une option du portfolio ── */
  var css = document.createElement('style');
  css.textContent =
    '@font-face{font-family:"Satoshi";src:url("../fonts/satoshi-regular.woff2") format("woff2");font-weight:400;font-style:normal;font-display:swap}' +
    '#lc-demo{position:absolute;left:50%;top:83%;transform:translateX(-50%);z-index:4;' +
    'padding:.3em .5em;border:0;background:none;cursor:pointer;white-space:nowrap;' +
    'font-family:"Satoshi",system-ui,sans-serif;font-weight:400;font-style:normal;' +
    'font-size:clamp(13px,1.5vw,26px);letter-spacing:0;line-height:1;color:#000;' +
    'opacity:.55;transition:opacity .3s cubic-bezier(.22,.61,.36,1)}' +
    '#lc-demo:hover{opacity:1}' +
    '#lc-demo u{text-decoration-thickness:1px;text-underline-offset:.2em}';
  document.head.appendChild(css);

  /* Langue du portfolio autour (fr / en) */
  var LABELS = {
    fr: 'ou <u>essayer avec un texte d’exemple</u>',
    en: 'or <u>try it with a sample text</u>'
  };
  function parentLang() {
    try { return window.parent.document.documentElement.dataset.lang === 'en' ? 'en' : 'fr'; }
    catch (e) { return params.get('lang') === 'en' ? 'en' : 'fr'; }
  }

  function loadData() {
    return new Promise(function (resolve, reject) {
      if (window.MARGINALIA_DEMO) { resolve(window.MARGINALIA_DEMO); return; }
      var s = document.createElement('script');
      s.src = DATA_URL;
      s.onload = function () {
        window.MARGINALIA_DEMO ? resolve(window.MARGINALIA_DEMO) : reject(new Error('contenu vide'));
      };
      s.onerror = function () { reject(new Error(DATA_URL + ' introuvable')); };
      document.head.appendChild(s);
    });
  }

  /* L'import d'annotations affiche une alerte « X annotations injectées » :
     on la coupe pour l'exemple (les autres alertes restent normales) */
  var realAlert = window.alert;
  window.alert = function (msg) {
    if (typeof msg === 'string' && msg.indexOf('annotations injectées') !== -1) return;
    return realAlert.apply(window, arguments);
  };

  /* Même étape que landingImport() : on remplit le texte et le titre,
     puis on affiche l'écran titre / auteur / commencer */
  function useExample() {
    loadData().then(function (demo) {
      document.getElementById('text-input').value = demo.texte;
      document.getElementById('doc-title').value = demo.titre || '';
      document.getElementById('doc-author').value = demo.auteur || '';

      if (demo.annotations) {
        // Prépare les profils des lectrices et leurs annotations,
        // injectées automatiquement au clic sur « commencer »
        var file = new File([JSON.stringify(demo.annotations)], 'annotations.json', { type: 'application/json' });
        handleJsonImport({ files: [file], value: '' });
      }

      var setup = document.getElementById('lc-setup');
      setup.classList.remove('hidden');
      if (typeof updateProfileNameInputs === 'function') updateProfileNameInputs();
    }).catch(function (err) {
      console.warn('margin.alia — exemple indisponible :', err);
    });
  }

  function addButton() {
    /* Dans le portfolio, l'import normal fait un scrollIntoView sur
       l'écran titre / auteur, ce qui faisait aussi défiler la page autour :
       cet écran est déjà par-dessus tout, on supprime ce défilement */
    var setup = document.getElementById('lc-setup');
    if (setup) setup.scrollIntoView = function () {};

    var canvas = document.getElementById('landing-canvas');
    if (!canvas || document.getElementById('lc-demo')) return;
    var btn = document.createElement('button');
    btn.id = 'lc-demo';
    btn.type = 'button';
    var setLabel = function () { btn.innerHTML = LABELS[parentLang()]; };
    setLabel();
    try {                                   // suit le bouton fr/eng du portfolio
      new MutationObserver(setLabel).observe(window.parent.document.documentElement, { attributes: true, attributeFilter: ['data-lang'] });
    } catch (e) {}
    btn.addEventListener('click', function (e) { e.stopPropagation(); useExample(); });
    canvas.appendChild(btn);
    loadData().catch(function () {});      // préchargement discret
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addButton);
  else addButton();
})();
