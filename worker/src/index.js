// ============================================================================
// CLOUDFLARE WORKER — "webd-notificar"
// Backend serverless: recibe el nombre del visitante y avisa a Telegram.
//
// SECRETOS:
// TELEGRAM_BOT_TOKEN -> configurado con:
//   npx wrangler secret put TELEGRAM_BOT_TOKEN
//
// TELEGRAM_CHAT_ID -> configurado con:
//   npx wrangler secret put TELEGRAM_CHAT_ID
// ============================================================================

const LONGITUD_MAXIMA_NOMBRE = 100;

// ============================================================================
// URL DE GITHUB PAGES
// Solo el origen, sin ruta ni barra final.
// ============================================================================
const ORIGENES_PERMITIDOS = [
  'https://qfranz140.github.io'
];

function esOrigenPermitido(origen) {
  if (!origen) {
    return false;
  }

  return ORIGENES_PERMITIDOS.indexOf(origen) !== -1;
}

function cabecerasCORS(origen) {
  if (!esOrigenPermitido(origen)) {
    return {};
  }

  return {
    'Access-Control-Allow-Origin': origen,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function responderJSON(origen, estado, cuerpo) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...cabecerasCORS(origen)
    }
  });
}

function responderPreflight(origen) {
  if (!esOrigenPermitido(origen)) {
    return new Response(null, { status: 403 });
  }

  return new Response(null, {
    status: 204,
    headers: cabecerasCORS(origen)
  });
}

async function leerCuerpo(solicitud) {
  try {
    return await solicitud.json();
  } catch {
    return null;
  }
}

function validarNombre(nombre) {
  if (typeof nombre !== 'string') {
    return null;
  }

  const limpio = nombre
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim();

  if (!limpio) {
    return null;
  }

  if (limpio.length > LONGITUD_MAXIMA_NOMBRE) {
    return null;
  }

  if (!/^[\p{L}\p{N}\s.'-]+$/u.test(limpio)) {
    return null;
  }

  return limpio;
}

export default {
  async fetch(solicitud, entorno) {
    const origen = solicitud.headers.get('Origin');
    const metodo = solicitud.method;

    // Petición CORS previa
    if (metodo === 'OPTIONS') {
      return responderPreflight(origen);
    }

    // Solo aceptamos POST
    if (metodo !== 'POST') {
      return responderJSON(origen, 405, {
        ok: false,
        error: 'Método no permitido.'
      });
    }

    // Leer JSON enviado por la página
    const cuerpo = await leerCuerpo(solicitud);
    const nombre = cuerpo ? validarNombre(cuerpo.nombre) : null;

    if (!nombre) {
      return responderJSON(origen, 400, {
        ok: false,
        error: 'Nombre inválido.'
      });
    }

    // Obtener secretos de Cloudflare
    const token = entorno.TELEGRAM_BOT_TOKEN;
    const chatId = entorno.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      console.error(
        'Falta TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID en los secretos del Worker.'
      );

      return responderJSON(origen, 500, {
        ok: false,
        error: 'Servidor sin configurar.'
      });
    }

    // Mensaje que llegará a Telegram
    const texto =
      '🔔 Nueva visita a la página\n\n👤 Nombre: ' + nombre;

    const controlador = new AbortController();

    const temporizador = setTimeout(() => {
      controlador.abort();
    }, 10000);

    try {
      const respuestaTelegram = await fetch(
        'https://api.telegram.org/bot' + token + '/sendMessage',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: texto
          }),
          signal: controlador.signal
        }
      );

      clearTimeout(temporizador);

      const datos = await respuestaTelegram.json();

      if (!respuestaTelegram.ok || !datos.ok) {
        console.error(
          'Telegram rechazó la petición:',
          JSON.stringify(datos)
        );

        return responderJSON(origen, 502, {
          ok: false,
          error: 'Telegram rechazó la notificación.'
        });
      }

      return responderJSON(origen, 200, {
        ok: true
      });

    } catch (error) {
      clearTimeout(temporizador);

      console.error(
        'Error al contactar Telegram:',
        error.message
      );

      return responderJSON(origen, 502, {
        ok: false,
        error: 'Error de conexión con Telegram.'
      });
    }
  }
};