/* ==========================================================================
   data.js — FUENTE ÚNICA DE VERDAD del negocio
   --------------------------------------------------------------------------
   Acá va TODO dato que aparece en más de un lugar del sitio. Si cambiás el
   teléfono, la dirección, un horario o un link, cambialo SOLO acá.

   Consumidores:
     - js/horarios.js  -> HORARIOS  (tabla + estado abierto/cerrado)
     - js/seo.js       -> genera el JSON-LD desde TODO este objeto
     - js/main.js      -> links de navegación, WhatsApp flotante
   ========================================================================== */

window.PANCHIEVO = {

  /* --- Identidad ------------------------------------------------------- */
  nombre: 'Panchievo',
  claim: 'El pancho que no te deja en paz',
  ciudad: 'Dock Sud, Avellaneda',

  /* --- Contacto --------------------------------------------------------
     Verificado en denirohamburgueseria.com.ar.
     `telE164` es el formato para links tel: y WhatsApp (sin signos). */
  direccion: 'Nicolás Avellaneda 1996',
  cp: 'B1871AFV',
  localidad: 'Dock Sud',
  provincia: 'Buenos Aires',
  telefonoLegible: '011 4093-8213',
  telE164: '+541140938213',
  coords: {
    lat: -34.657398,
    lng: -58.34778
  },

  /* --- Enlaces ---------------------------------------------------------- */
  menuOnline: 'https://menu.fu.do/panchievo',
  instagram: 'https://www.instagram.com/panchievo/',
  tiktok: 'https://www.tiktok.com/@panchievo',
  facebook: 'https://www.facebook.com/p/Panchievo-61566835832949/',

  /* --- Reputación ------------------------------------------------------
     9.6/50 viene del directorio de hamburgueserías. Google muestra 4.7/13.
     NO promediar los dos: son escalas y fuentes distintas. */
  rating: {
    valor: 9.6,
    cantidad: 50
  },

  /* --- Fotografía ------------------------------------------------------
     Archivo local en assets/img/. Reemplazalo si llegás con fotos propias. */
  imagenPrincipal: 'assets/img/local-panchievo.jpg',

  /* --- Cifras del hero y la barra de stats -----------------------------
     Duplicadas acá a propósito. Son copy editorial, no lógica: si se
     leyeran del JSON-LD (que genera seo.js) o de la tabla de horarios
     (que dibuja horarios.js) no existirían en el HTML estático, que es lo
     que indexan los buscadores. */
  anioApertura: 2024,
  videosPorDia: 10,
  chicosEnRetos: '20+',

  /* --- Horarios ---------------------------------------------------------
     FUENTE OFICIAL: historias de Instagram del dueño (actualizado 2026).
     Dos tipos de horario DISTINTOS:
       1) GRABACIÓN (retos/videos): Mié-Sáb 16:00-19:00. Dom/Lun/Mar = CERRADO.
       2) COMIDAS (atención al público): Mié-Jue 20:00-00:00, Vie-Sáb 20:00-02:00.
          Martes = CERRADO todo el día.
          Domingo y Lunes = SIN CONFIRMAR (TODO: confirmar con dueño).

     Formato: clave = día según Date.getDay() (0 domingo … 6 sábado),
     valor = array de [apertura, cierre].

     IMPORTANTE: los cierres posteriores a medianoche se escriben como
     "24:00" y "26:00" (minutos absolutos desde las 00:00), NO como "00:00".
     Así el rango del mismo día sigue siendo comparable con la hora actual.
     La lógica de apertura junto a medianoche la maneja js/horarios.js.

     Estos valores también alimentan el JSON-LD, que sí necesita "00:00"/"02:00";
     js/seo.js hace esa conversión solo. */

  /* Horarios de GRABACIÓN (retos). Solo Mié-Sáb 16:00-19:00. */
  horariosGrabacion: {
    0: [],                 // Domingo — CERRADO
    1: [],                 // Lunes — CERRADO
    2: [],                 // Martes — CERRADO
    3: [['16:00', '19:00']], // Miércoles
    4: [['16:00', '19:00']], // Jueves
    5: [['16:00', '19:00']], // Viernes
    6: [['16:00', '19:00']]  // Sábado
  },

  /* Horarios de COMIDAS (atención al público).
     Estos son los que usa el indicador "Abierto ahora". */
  horariosComidas: {
    0: [],                 // Domingo — TODO: confirmar con dueño
    1: [],                 // Lunes — TODO: confirmar con dueño
    2: [],                 // Martes — CERRADO todo el día
    3: [['20:00', '24:00']], // Miércoles
    4: [['20:00', '24:00']], // Jueves
    5: [['20:00', '26:00']], // Viernes — hasta las 02:00
    6: [['20:00', '26:00']]  // Sábado — hasta las 02:00
  },

  /* Alias de compatibilidad: horarios.js y seo.js leen esto para el estado
     "abierto ahora" y el JSON-LD. Apunta a horariosComidas. */
  horarios: {}, // se rellena al final del objeto

  /* Notas que se muestran junto al día en la tabla de horarios. */
  notasHorario: {
    0: 'TODO: confirmar horario de comidas con el dueño',
    1: 'TODO: confirmar horario de comidas con el dueño',
    2: 'Cerrado todo el día',
    6: 'Solo noche (comidas)'
  },

  /* --- Navegación del header ------------------------------------------- */
  nav: [
    { texto: 'Retos',   href: '#retos' },
    { texto: 'Carta',   href: '#carta' },
    { texto: 'Horarios', href: '#horarios' },
    { texto: 'Dónde',   href: '#mapa' },
    { texto: 'Colabs',  href: '#colabs' },
    { texto: 'FAQ',     href: '#faq' },
    { texto: 'Pedir',   href: '#pedir', clase: 'cta' }
  ]
};

/* Alias de compatibilidad para horarios.js y seo.js (apunta a comidas) */
window.PANCHIEVO.horarios = window.PANCHIEVO.horariosComidas;

/* URL limpia del menú online para la sección "Pedí acá" */
window.PANCHIEVO.menuPedido = 'https://menu.fu.do/panchievo/promos-del-dia?utm_source=sitio_web&utm_medium=web&utm_content=boton_pedir';
