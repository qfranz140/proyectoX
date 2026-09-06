const lienzo = document.getElementById('lienzo');
const contexto = lienzo.getContext('2d');
const textoBienvenida = document.getElementById('textoBienvenida');
const botonSiguiente = document.getElementById('botonSiguiente');

const PALETAS = {
  H: ['#ff3b30', '#ff9500', '#ffd60a', '#ffcc66', '#ff6a00', '#ffffff'],
  O: ['#ffd60a', '#ffb340', '#fff2b0', '#ff8c00', '#ff2d55', '#ffffff'],
  L: ['#ff2d55', '#ff7bac', '#ff9ff5', '#c86bff', '#ff5cb8', '#00e5ff', '#ffffff'],
  A: ['#5ac8fa', '#0a84ff', '#6deadc', '#a5e8ff', '#30d158', '#ffd60a', '#ffffff']
};

const COLORES_AMBIENTALES = [
  '#ff3b30', '#ff9500', '#ffd60a', '#ff2d55',
  '#5ac8fa', '#0a84ff', '#a163ff', '#30d158',
  '#fca5a5', '#00e5ff', '#ff5cb8', '#b0ff57'
];

const TIEMPOS_DE_LETRAS = [1, 14, 28, 42];

let particulas = [];
let estallidos = [];
let letras = [];
let letraActual = 0;
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

function obtenerLetrasMuestra() {
  const lienzoAuxiliar = document.createElement('canvas');
  let contextoAuxiliar = lienzoAuxiliar.getContext('2d');
  const tamFuente = 300;
  const familia = '900 ' + tamFuente + "px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
  contextoAuxiliar.font = familia;
  const anchoBruto = Math.ceil(contextoAuxiliar.measureText('HOLA').width);
  const altoBruto = Math.ceil(tamFuente * 1.2);

  const anchoMaximoDisponible = window.innerWidth * 0.8;
  const altoMaximoDisponible = window.innerHeight * 0.38;
  const escala = Math.min(1, anchoMaximoDisponible / anchoBruto, altoMaximoDisponible / altoBruto);

  const anchoFinal = Math.max(1, Math.ceil(anchoBruto * escala));
  const altoFinal = Math.max(1, Math.ceil(altoBruto * escala));

  lienzoAuxiliar.width = anchoFinal;
  lienzoAuxiliar.height = altoFinal;
  contextoAuxiliar = lienzoAuxiliar.getContext('2d');
  contextoAuxiliar.font = '900 ' + (tamFuente * escala) + "px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
  contextoAuxiliar.textBaseline = 'top';
  contextoAuxiliar.fillStyle = '#ffffff';
  contextoAuxiliar.fillText('HOLA', 0, 0);

  const datos = contextoAuxiliar.getImageData(0, 0, anchoFinal, altoFinal).data;

  const limites = [];
  let acumulado = 0;
  Array.from('HOLA').forEach((letra) => {
    acumulado += contextoAuxiliar.measureText(letra).width;
    limites.push({ hasta: acumulado });
  });

  const letrasMuestra = Array.from('HOLA').map((nombre) => ({ nombre, puntos: [] }));
  const paso = Math.max(2, Math.round(4 * escala));

  for (let y = 0; y < altoFinal; y += paso) {
    for (let x = 0; x < anchoFinal; x += paso) {
      const alfa = datos[(y * anchoFinal + x) * 4 + 3];
      if (alfa > 110 && Math.random() < 0.6) {
        let indice = 3;
        for (let i = 0; i < limites.length; i++) {
          if (x <= limites[i].hasta) {
            indice = i;
            break;
          }
        }
        letrasMuestra[indice].puntos.push({ x, y });
      }
    }
  }

  const xInicio = (window.innerWidth - anchoFinal) / 2;
  const yInicio = window.innerHeight * 0.36 - altoFinal / 2;

  letrasMuestra.forEach((letra) => {
    if (letra.puntos.length > 1100) {
      letra.puntos = letra.puntos.filter(() => Math.random() < 0.5);
    }
    letra.puntos = letra.puntos.map((punto) => ({ x: punto.x + xInicio, y: punto.y + yInicio }));
    let sumaX = 0;
    let sumaY = 0;
    letra.puntos.forEach((punto) => {
      sumaX += punto.x;
      sumaY += punto.y;
    });
    const cantidad = letra.puntos.length || 1;
    letra.centro = { x: sumaX / cantidad, y: sumaY / cantidad };
  });

  return letrasMuestra;
}

function crearParticulasDeLetra(letra) {
  const paleta = PALETAS[letra.nombre] || PALETAS.H;
  letra.puntos.forEach((punto) => {
    const angulo = Math.random() * Math.PI * 2;
    const radio = 18 + Math.random() * 150;
    const inicioX = letra.centro.x + Math.cos(angulo) * radio;
    const inicioY = letra.centro.y + Math.sin(angulo) * radio * 0.6;
    particulas.push({
      x: inicioX,
      y: inicioY,
      px: inicioX,
      py: inicioY,
      objetivo: punto,
      vx: Math.cos(angulo) * (4 + Math.random() * 10),
      vy: Math.sin(angulo) * (4 + Math.random() * 10) + 0.6,
      reposo: marco + 10 + Math.random() * 16,
      color: paleta[Math.floor(Math.random() * paleta.length)],
      tamano: 1.2 + Math.random() * 1.8,
      fase: Math.random() * Math.PI * 2,
      asentada: false
    });
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

function lanzarLetras() {
  if (letraActual < letras.length && marco >= TIEMPOS_DE_LETRAS[letraActual]) {
    crearParticulasDeLetra(letras[letraActual]);
    letraActual++;
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

  particulas.forEach((particula) => {
    particula.px = particula.x;
    particula.py = particula.y;
    if (marco < particula.reposo) {
      particula.vx *= 0.94;
      particula.vy = particula.vy * 0.94 + 0.05;
      particula.x += particula.vx;
      particula.y += particula.vy;
    } else {
      const deltaX = particula.objetivo.x - particula.x;
      const deltaY = particula.objetivo.y - particula.y;
      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) {
        particula.x = particula.objetivo.x;
        particula.y = particula.objetivo.y;
        particula.asentada = true;
      } else {
        particula.x += deltaX * 0.12;
        particula.y += deltaY * 0.12;
      }
    }
  });

  particulas.forEach((particula) => {
    if (particula.asentada) {
      const vibracion = Math.sin(marco * 0.25 + particula.fase) * 0.6;
      contexto.globalAlpha = 0.55 + 0.35 * Math.abs(Math.sin(marco * 0.15 + particula.fase));
      contexto.fillStyle = particula.color;
      contexto.beginPath();
      contexto.arc(particula.x + vibracion, particula.y + vibracion * 0.6, particula.tamano, 0, Math.PI * 2);
      contexto.fill();
    } else {
      const alfa = Math.min(1, 0.35 + (marco / (particula.reposo + 20)) * 0.9);
      contexto.globalAlpha = alfa;
      contexto.strokeStyle = particula.color;
      contexto.lineWidth = Math.max(0.6, particula.tamano * 0.9);
      contexto.beginPath();
      contexto.moveTo(particula.px, particula.py);
      contexto.lineTo(particula.x, particula.y);
      contexto.stroke();

      contexto.globalAlpha = alfa * 0.7;
      contexto.fillStyle = '#ffffff';
      contexto.beginPath();
      contexto.arc(particula.x, particula.y, Math.max(0.6, particula.tamano * 0.8), 0, Math.PI * 2);
      contexto.fill();
    }
  });

  contexto.globalAlpha = 1;
}

function bucle() {
  marco++;
  lanzarLetras();
  actualizarYDibujar();
  requestAnimationFrame(bucle);
}

let temporizadorRedimension = null;

function reiniciarEscena() {
  particulas = [];
  estallidos = [];
  letraActual = 0;
  marco = 0;
  letras = obtenerLetrasMuestra();
}

function iniciar() {
  redimensionarLienzo();
  window.addEventListener('resize', () => {
    redimensionarLienzo();
    clearTimeout(temporizadorRedimension);
    temporizadorRedimension = setTimeout(reiniciarEscena, 250);
  });
  envolverLetras(textoBienvenida);
  letras = obtenerLetrasMuestra();
  bucle();
}

botonSiguiente.addEventListener('click', () => {
  window.location.href = 'pages/pagina2.html';
});

iniciar();