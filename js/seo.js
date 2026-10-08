/* ==========================================================================
   seo.js — genera el JSON-LD (schema.org/Restaurant)
   --------------------------------------------------------------------------
   Evita tener el horario duplicado a mano en el HTML: lee
   window.PANCHIEVO.horarios y arma el bloque automáticamente.

   Conversión necesaria: los horarios internos usan "24:00"/"26:00"
   (minutos absolutos). Schema.org exige la convención HH:MM real, así que
   24:00 -> 00:00 y 26:00 -> 02:00.

   Requiere en el HTML un <script id="ld-restaurant" type="application/ld+json"></script>
   vacío, que este archivo rellena.
   ========================================================================== */

(function () {
  "use strict";

  var CFG = window.PANCHIEVO;
  if (!CFG) return;

  var DIAS_SCHEMA = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];

  /* "26:00" -> "02:00". Schema.org no admite horas mayores a 24. */
  function aSchemaHora(h) {
    var p = h.split(':');
    var hh = parseInt(p[0], 10) % 24;
    return (hh < 10 ? '0' : '') + hh + ':' + p[1];
  }

  function buildOpeningHours(horarios) {
    var specs = [];
    Object.keys(horarios).forEach(function (dia) {
      var bloques = horarios[dia];
      for (var i = 0; i < bloques.length; i++) {
        specs.push({
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: DIAS_SCHEMA[dia],
          opens: aSchemaHora(bloques[i][0]),
          closes: aSchemaHora(bloques[i][1])
        });
      }
    });
    return specs;
  }

  window.PanchievoSeo = {
    init: function () {
      var destino = document.getElementById('ld-restaurant');
      if (!destino) return;

      var q = CFG.coords;
      var direccionMapa =
        'https://www.google.com/maps/search/?api=1&query=' + q.lat + ',' + q.lng;

      var datos = {
        '@context': 'https://schema.org',
        '@type': 'Restaurant',
        name: CFG.nombre,
        description: "Hamburguesería y panchería de barrio en Dock Sud. Panchos completos, " +
                     'hamburguesas, tequeños y milanesas al panko, más los retos virales ' +
                     "'Bailando por un Pancho'.",
        image: CFG.imagenPrincipal,
        url: CFG.menuOnline,
        telephone: CFG.telE164,
        servesCuisine: ['Comida rápida', 'Hamburguesas', 'Panchos', 'Milanesas'],
        priceRange: '$$',
        currenciesAccepted: 'ARS',
        address: {
          '@type': 'PostalAddress',
          streetAddress: CFG.direccion,
          addressLocality: CFG.localidad,
          addressRegion: CFG.provincia,
          postalCode: CFG.cp,
          addressCountry: 'AR'
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: q.lat,
          longitude: q.lng
        },
        hasMap: direccionMapa,
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: CFG.rating.valor,
          reviewCount: CFG.rating.cantidad
        },
        openingHoursSpecification: buildOpeningHours(CFG.horarios),
        acceptsReservations: 'False',
        hasMenu: CFG.menuOnline,
        sameAs: [CFG.instagram, CFG.tiktok, CFG.facebook]
      };

      destino.textContent = JSON.stringify(datos, null, 2);
    }
  };
})();
