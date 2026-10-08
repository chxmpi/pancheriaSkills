/* ==========================================================================
   horarios.js — lógica de "abierto ahora" y tabla de horarios
   --------------------------------------------------------------------------
   Carga js/data.js antes que este archivo (ver el orden en index.html).
   Lee window.PANCHIEVO.horariosComidas (para estado) y horariosGrabacion
   (para mostrar en la tabla) y escribe en el DOM.

   Lógica de cruce de medianoche (solo para horarios de COMIDAS):
     Un tramo como 20:00-26:00 (viernes) sigue vigente a la 01:00 del sábado.
     El tramo del día actual no alcanza para detectarlo, así que se revisa
     además el bloque del día anterior: si su cierre supera las 24:00 y la
     hora actual es menor que (cierre - 24:00), el local sigue abierto.

   Zona horaria: America/Argentina/Buenos_Aires (la del navegador del usuario).
   ========================================================================== */

(function () {
  "use strict";

  var CFG = window.PANCHIEVO;
  if (!CFG) return;

  var DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  var DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  /* Minutos absolutos desde las 00:00 del día.
     "24:00" -> 1440, "26:00" -> 1560. NO se envuelve a 0/120: si lo hacés,
     la comparación del rango del mismo día se rompe. */
  function aMin(h) {
    var p = h.split(':');
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }

  function rangoMin(actual, ini, fin) {
    return actual >= aMin(ini) && actual < aMin(fin);
  }

  /* 26:00 -> "02:00" para mostrar. Solo para presentación. */
  function aHoraLegible(h) {
    var p = h.split(':');
    var hh = (parseInt(p[0], 10) % 24);
    return (hh < 10 ? '0' : '') + hh + ':' + p[1];
  }

  /* Rango legible: "11:00 - 14:00". Guiones con espacios para que se lea
     como rango y no como un intervalo compacto tipo "11:00–14:00".

     El cierre de medianoche se deja como "24:00" y no como "00:00":
     "20:00 - 00:00" se lee como dato roto, mientras que "20:00 - 24:00"
     dice sin ambigüedad que el local sigue abierto hasta la medianoche. */
  function fmtRango(ini, fin) {
    var cierre = (fin === '24:00') ? '24:00' : aHoraLegible(fin);
    return aHoraLegible(ini) + ' - ' + cierre;
  }

  /* ------------------------------------------------------------------
     Renderiza la tabla combinada: GRABACIÓN + COMIDAS.
     Cada día muestra dos filas (o una nota si no hay datos).
     Escribe dentro de #horList.
     ------------------------------------------------------------------ */
  function renderTabla() {
    var box = document.getElementById('horList');
    if (!box) return;

    var hoy = new Date().getDay();
    var html = '';

    for (var d = 0; d < 7; d++) {
      var grab = CFG.horariosGrabacion[d] || [];
      var comi = CFG.horariosComidas[d] || [];
      var nota = CFG.notasHorario && CFG.notasHorario[d];
      var esHoy = (d === hoy);

      // Fila de GRABACIÓN
      if (grab.length) {
        var franjasGrab = grab.map(function (b, i) {
          var partes = [];
          if (i > 0) partes.push('<span class="sep">y</span>');
          partes.push('<span class="rango">' + fmtRango(b[0], b[1]) + '</span>');
          return partes.join('');
        }).join('');

        html += '<div class="hor-row hor-grabacion' + (esHoy ? ' today' : '') + '">' +
                  '<span class="dia"><span class="badge-grab">GRABACIÓN</span> ' + DIAS[d] + '</span>' +
                  '<div>' + franjasGrab + '</div>' +
                '</div>';
      } else {
        html += '<div class="hor-row hor-grabacion' + (esHoy ? ' today' : '') + '">' +
                  '<span class="dia"><span class="badge-grab">GRABACIÓN</span> ' + DIAS[d] + '</span>' +
                  '<div><span class="cerrado">Cerrado</span></div>' +
                '</div>';
      }

      // Fila de COMIDAS
      if (comi.length) {
        var franjasComi = comi.map(function (b, i) {
          var partes = [];
          if (i > 0) partes.push('<span class="sep">y</span>');
          partes.push('<span class="rango">' + fmtRango(b[0], b[1]) + '</span>');
          return partes.join('');
        }).join('');

        html += '<div class="hor-row hor-comidas' + (esHoy ? ' today' : '') + '">' +
                  '<span class="dia"><span class="badge-comi">COMIDAS</span> ' + DIAS[d] + '</span>' +
                  '<div>' + franjasComi + '</div>' +
                '</div>';
      } else {
        html += '<div class="hor-row hor-comidas' + (esHoy ? ' today' : '') + '">' +
                  '<span class="dia"><span class="badge-comi">COMIDAS</span> ' + DIAS[d] + '</span>' +
                  '<div><span class="cerrado">' + (nota || 'Cerrado') + '</span></div>' +
                '</div>';
      }

      // Nota adicional (solo una vez por día, debajo de comidas)
      if (nota && !comi.length) {
        // ya se mostró en la fila de comidas
      } else if (nota && comi.length) {
        // la nota ya está en notasHorario pero solo para días sin comidas
        // para días con comidas, no repetimos
      }
    }

    box.innerHTML = html;
  }

  /* ------------------------------------------------------------------
     Estado abierto/cerrado — usa SOLO horariosComidas.
     Devuelve { abierto, proximo }.
     proximo = { dia, hora } o null.
     ------------------------------------------------------------------ */
  function calcularEstado(fecha) {
    var dia = fecha.getDay();
    var mins = fecha.getHours() * 60 + fecha.getMinutes();
    var abierto = false;
    var proximo = null;
    var i, j, d, bloques, cierre;

    // Tramos del día de hoy (incluidos los que cruzan la medianoche)
    (CFG.horariosComidas[dia] || []).forEach(function (b) {
      if (rangoMin(mins, b[0], b[1])) abierto = true;
    });

    // Tramo que empezó ayer y todavía sigue vigente (cruce medianoche)
    var ayer = (dia + 6) % 7;
    (CFG.horariosComidas[ayer] || []).forEach(function (b) {
      cierre = aMin(b[1]);
      if (cierre > 1440 && mins < cierre - 1440) abierto = true;
    });

    // Próxima apertura: hoy si quedó un tramo por empezar, si no el siguiente día
    if (!abierto) {
      for (i = 0; i < 8; i++) {
        d = (dia + i) % 7;
        bloques = CFG.horariosComidas[d] || [];
        for (j = 0; j < bloques.length; j++) {
          if (i === 0 && aMin(bloques[j][0]) <= mins) continue;
          proximo = { dia: d, hora: bloques[j][0] };
          break;
        }
        if (proximo) break;
      }
    }

    return { abierto: abierto, proximo: proximo };
  }

  /* ------------------------------------------------------------------
     Pinta el indicador de la barra superior.
     ------------------------------------------------------------------ */
  function pintarEstado() {
    var dot = document.querySelector('#status .dot');
    var txt = document.getElementById('statusText');
    if (!dot || !txt) return;

    var r = calcularEstado(new Date());

    if (r.abierto) {
      dot.className = 'dot abierto';
      txt.innerHTML = "<strong style='color:#3ddc84'>Abierto ahora</strong> · ¡animate antes de que se llene!";
    } else {
      dot.className = 'dot cerrado';
      var diaHoy = new Date().getDay();
      var cuando = r.proximo
        ? (r.proximo.dia === diaHoy ? 'hoy' : DIAS[r.proximo.dia].toLowerCase())
        : 'pronto';
      txt.innerHTML = "<strong style='color:#ff9b9b'>Cerrado ahora</strong> · Abre " +
                      cuando + ' a las ' + aHoraLegible(r.proximo.hora);
    }
  }

  /* API pública: main.js la usa para inicializar y refrescar. */
  window.PanchievoHorarios = {
    init: function () {
      renderTabla();
      pintarEstado();
      // Refresca cada minuto para corregir el cambio de franja horaria
      setInterval(pintarEstado, 60000);
    },
    // Expuestos para pruebas
    _calcularEstado: calcularEstado,
    _aMin: aMin
  };
})();