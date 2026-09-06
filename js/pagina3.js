const lienzo = document.getElementById('lienzo');
const contexto = lienzo.getContext('2d');
const tituloPagina = document.getElementById('tituloPagina');
const botonCamara = document.getElementById('botonCamara');
const mensajeEstado = document.getElementById('mensajeEstado');

const COLORES_AMBIENTALES = [
  '#ff3b30', '#ff9500', '#ffd60a', '#ff2d55',
  '#5ac8fa', '#0a84ff', '#a163ff', '#30d158',
  '#fca5a5', '#00e5ff', '#ff5cb8', '#b0ff57'
];

let estallidos = [];
let marco = 0;

function redimensionarLienzo() {
  const factor = window.devicePixelRatio || 1;
  const ancho = window.innerWidth;
  const alto = window.innerHeight;
  lienzo.width = Math.floor(ancho * factor);
  lienzo.height = Math.floor(alto * factor);
  lienzo.style.width = ancho + 'px';
  lienzo.style.height = alto + 'px';
  contexto.setTransform(factor, 0, 0, factor, 0, 0);
}

function envolverLetras(elemento) {
  const texto = elemento.textContent;
  elemento.textContent = '';
  Array.from(texto).forEach((caracter, indice) => {
    const intervalo = document.createElement('span');
    intervalo.className = 'letra';
    intervalo.textContent = caracter === ' ' ? '\u00A0' : caracter;
    intervalo.style.setProperty('--i', indice);
    elemento.appendChild(intervalo);
  });
}

function crearEstallidoAmbiental() {
  const origenX = window.innerWidth * (0.1 + Math.random() * 0.8);
  const origenY = window.innerHeight * (0.04 + Math.random() * 0.3);
  const cantidad = 25 + Math.floor(Math.random() * 20);
  const colorA = COLORES_AMBIENTALES[Math.floor(Math.random() * COLORES_AMBIENTALES.length)];
  const colorB = COLORES_AMBIENTALES[Math.floor(Math.random() * COLORES_AMBIENTALES.length)];
  for (let i = 0; i < cantidad; i++) {
    const angulo = Math.random() * Math.PI * 2;
    const velocidad = 1.5 + Math.random() * 6;
    const vida = 45 + Math.random() * 50;
    const aleatorio = Math.random();
    const color = aleatorio < 0.5 ? colorA : aleatorio < 0.8 ? colorB : '#ffffff';
    estallidos.push({
      x: origenX,
      y: origenY,
      px: origenX,
      py: origenY,
      vx: Math.cos(angulo) * velocidad,
      vy: Math.sin(angulo) * velocidad,
      vida,
      vidaMaxima: vida,
      color,
      tamano: 1 + Math.random() * 2.2
    });
  }
}

function actualizarYDibujar() {
  contexto.clearRect(0, 0, window.innerWidth, window.innerHeight);

  if (marco % 12 === 0 && Math.random() < 0.5) {
    crearEstallidoAmbiental();
  }

  estallidos = estallidos.filter((estallido) => estallido.vida > 0);
  estallidos.forEach((estallido) => {
    estallido.px = estallido.x;
    estallido.py = estallido.y;
    estallido.vy += 0.09;
    estallido.vx *= 0.985;
    estallido.x += estallido.vx;
    estallido.y += estallido.vy;
    estallido.vida--;

    const alfa = Math.max(0, estallido.vida / estallido.vidaMaxima);
    contexto.globalAlpha = alfa;
    contexto.strokeStyle = estallido.color;
    contexto.lineWidth = Math.max(0.5, estallido.tamano);
    contexto.beginPath();
    contexto.moveTo(estallido.px, estallido.py);
    contexto.lineTo(estallido.x, estallido.y);
    contexto.stroke();
  });

  contexto.globalAlpha = 1;
}

function bucle() {
  marco++;
  actualizarYDibujar();
  requestAnimationFrame(bucle);
}

let temporizadorRedimension = null;

function reiniciarEscena() {
  estallidos = [];
  marco = 0;
}

function iniciar() {
  redimensionarLienzo();
  window.addEventListener('resize', () => {
    redimensionarLienzo();
    clearTimeout(temporizadorRedimension);
    temporizadorRedimension = setTimeout(reiniciarEscena, 250);
  });
  envolverLetras(tituloPagina);
  bucle();
}

botonCamara.addEventListener('click', async () => {
  botonCamara.disabled = true;
  botonCamara.textContent = 'Verificando…';
  mensajeEstado.classList.remove('oculto');

  let corriente = null;
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      corriente = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
    }
  } catch {
    corriente = null;
  }

  if (corriente) {
    corriente.getTracks().forEach((pista) => pista.stop());
    mensajeEstado.textContent = 'Acceso verificado. Redirigiendo…';
  } else {
    mensajeEstado.textContent = 'No se pudo comprobar. Redirigiendo…';
  }

  setTimeout(() => {
    window.location.href = 'pagina4.html';
  }, 800);
});

iniciar();