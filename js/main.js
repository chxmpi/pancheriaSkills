/* ==========================================================================
   main.js — arranque del sitio
   --------------------------------------------------------------------------
   Orquesta los módulos y aplica los datos de js/data.js a los puntos del DOM
   que se rellenan desde JS (nav, links de contacto, mapa, WhatsApp).

   Todo lo que dependa de PANCHIEVO.horarios vive en horarios.js.
   Todo lo que dependa de PANCHIEVO.* para SEO vive en seo.js.
   ========================================================================== */

(function () {
  "use strict";

  var CFG = window.PANCHIEVO;
  if (!CFG) return;

  /* ------------------------------------------------------------------
     Links del header — generados desde data.js para no duplicarlos.
     ------------------------------------------------------------------ */
  function renderNav() {
    var nav = document.getElementById('nav');
    if (!nav) return;

    var html = '';
    CFG.nav.forEach(function (item) {
      var extra = item.clase ? ' class="' + item.clase + '"' : '';
      var target = (item.href && item.href.startsWith('http')) ? ' target="_blank" rel="noopener"' : '';
      html += '<a href="' + item.href + '"' + extra + target + '>' + item.texto + '</a>';
    });

    nav.insertAdjacentHTML('beforeend', html);
  }

  /* ------------------------------------------------------------------
     Sustituye los placeholders de la barra de estado y el mapa.
     Marcador en el HTML: {{tel}}, {{telE164}}, {{telLink}}, {{direccionCompleta}}
     ------------------------------------------------------------------ */
  function rellenarLinks() {
    var q = CFG.coords;
    var coordsTxt = q.lat + ',' + q.lng;
    var direccionCompleta =
      CFG.direccion + ', ' + CFG.cp + ' · ' + CFG.localidad + ', ' + CFG.provincia;

    var reemplazos = {
      '{{tel}}': CFG.telefonoLegible,
      '{{telE164}}': CFG.telE164,
      '{{telLink}}': 'tel:' + CFG.telE164,
      '{{coords}}': coordsTxt,
      '{{direccionCompleta}}': direccionCompleta,
      /* Link para abrir la app de Maps */
      '{{gmaps}}': 'https://www.google.com/maps/search/?api=1&query=' + coordsTxt,
      /* Mapa embebido. La variante output=embed es la que permite Google
         Maps sin clave de API; la oficial (maps/embed/v1) exige una key y
         no sirve para este proyecto. */
      '{{mapaEmbed}}': 'https://www.google.com/maps?q=' + coordsTxt +
                       '&hl=es&z=17&output=embed',
      '{{imagenPrincipal}}': CFG.imagenPrincipal,
      '{{ratingValor}}': String(CFG.rating.valor),
      '{{ratingCantidad}}': String(CFG.rating.cantidad),
      '{{anioApertura}}': String(CFG.anioApertura),
      '{{videosPorDia}}': String(CFG.videosPorDia),
      '{{chicosEnRetos}}': CFG.chicosEnRetos,
      '{{menuOnline}}': CFG.menuOnline,
      '{{menuPedido}}': CFG.menuPedido,
      '{{instagram}}': CFG.instagram,
      '{{tiktok}}': CFG.tiktok,
      '{{facebook}}': CFG.facebook,
      '{{waLink}}': 'https://wa.me/' + CFG.telE164.replace(/\D/g, '') +
                   '?text=Hola%20Panchievo%21'
    };

    // Sólo nodos de texto y atributos; nunca innerHTML completo.
    Object.keys(reemplazos).forEach(function (token) {
      var valor = reemplazos[token];
      var nodos = document.querySelectorAll('[data-txt="' + token + '"]');
      Array.prototype.forEach.call(nodos, function (n) { n.textContent = valor; });

      nodos = document.querySelectorAll('[data-href="' + token + '"]');
      Array.prototype.forEach.call(nodos, function (n) { n.setAttribute('href', valor); });

      nodos = document.querySelectorAll('[data-src="' + token + '"]');
      Array.prototype.forEach.call(nodos, function (n) { n.setAttribute('src', valor); });
    });
  }

  /* ------------------------------------------------------------------
     Menú desplegable en mobile.
     ------------------------------------------------------------------ */
  function initMenuMovil() {
    var burger = document.getElementById('burger');
    var nav = document.getElementById('nav');
    if (!burger || !nav) return;

    function toggle(abrir) {
      nav.classList.toggle('open', abrir);
      burger.setAttribute('aria-expanded', abrir ? 'true' : 'false');
      burger.setAttribute('aria-label', abrir ? 'Cerrar menú' : 'Abrir menú');
    }

    burger.addEventListener('click', function () {
      toggle(!nav.classList.contains('open'));
    });

    // Al tocar un link se cierra (navegación a un ancla)
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') toggle(false);
    });

    // Escape cierra
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') toggle(false);
    });
  }

  /* ------------------------------------------------------------------
     Scrollspy: marca en el nav la sección que se está viendo.
     Usa IntersectionObserver con rootMargin afinado para que el ítem
     se active cuando la sección cruza la franja del header.
     ------------------------------------------------------------------ */
  function initScrollspy() {
    var nav = document.getElementById('nav');
    if (!nav || !('IntersectionObserver' in window)) return;

    var links = Array.prototype.filter.call(
      nav.querySelectorAll('a[href^="#"]'),
      function (a) { return document.querySelector(a.getAttribute('href')); }
    );
    if (!links.length) return;

    var visibles = {};

    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        visibles[e.target.id] = e.isIntersecting;
      });

      // Se queda con el primer enlace cuya sección esté visible;
      // si ninguna está visible, no marca ninguna.
      var activo = null;
      for (var i = 0; i < links.length && !activo; i++) {
        var id = links[i].getAttribute('href').slice(1);
        if (visibles[id]) activo = links[i];
      }

      links.forEach(function (a) {
        a.classList.toggle('activo', a === activo);
      });
    }, {
      rootMargin: '-45% 0px -50% 0px',
      threshold: 0
    });

    links.forEach(function (a) {
      obs.observe(document.querySelector(a.getAttribute('href')));
    });
  }

  /* ------------------------------------------------------------------
     Año del footer, para no editarlo cada año.
     ------------------------------------------------------------------ */
  function initAnio() {
    var n = document.getElementById('anio');
    if (n) n.textContent = new Date().getFullYear();
  }

  /* ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', function () {
    renderNav();
    rellenarLinks();
    initMenuMovil();
    initScrollspy();
    initAnio();

    if (window.PanchievoSeo) window.PanchievoSeo.init();
    if (window.PanchievoHorarios) window.PanchievoHorarios.init();
  });
})();
