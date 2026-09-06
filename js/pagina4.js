const lineasConsola = document.getElementById('lineasConsola');
const contador = document.getElementById('contador');
const avisoFinal = document.getElementById('avisoFinal');
const botonRevelar = document.getElementById('botonRevelar');

const LINEAS = [
  '> Conectando a tu dispositivo…',
  '> Acceso a la cámara concedido.',
  '> Dirección IP detectada: 203.0.113.7',
  '> Escaneando archivos personales…',
  '> Se han extraído fotos de tu galería.',
  '> Enviando datos al servidor remoto…',
  '> Finalizando conexión…'
];

const SEGUNDOS_INICIALES = 15;

let finalizado = false;

function esperar(ms) {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

function escribirLinea(texto) {
  const linea = document.createElement('div');
  linea.className = 'linea';
  linea.textContent = texto;
  lineasConsola.appendChild(linea);
  lineasConsola.scrollTop = lineasConsola.scrollHeight;
}

async function iniciar() {
  contador.textContent = 'BLOQUEO EN 15 s';

  let segundos = SEGUNDOS_INICIALES;
  const temporizador = setInterval(() => {
    segundos--;
    if (segundos <= 0) {
      clearInterval(temporizador);
      finalizarBroma();
      return;
    }
    contador.textContent = 'BLOQUEO EN ' + String(segundos).padStart(2, '0') + ' s';
  }, 1000);

  for (const texto of LINEAS) {
    escribirLinea(texto);
    await esperar(700 + Math.random() * 400);
  }

  await esperar(500);
  escribirLinea('[ SISTEMA BLOQUEADO ]');
}

function finalizarBroma() {
  if (finalizado) return;
  finalizado = true;
  contador.classList.add('oculto');
  avisoFinal.classList.remove('oculto');
  botonRevelar.classList.remove('oculto');
}

botonRevelar.addEventListener('click', () => {
  window.location.href = '../index.html';
});

iniciar();