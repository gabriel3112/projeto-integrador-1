/**
 * LETRIX – Lógica do Jogo Letrix Arrastar (Labirinto de Coordenação)
 * 
 * Este arquivo gerencia a movimentação do foguete pelo caminho, detecção de colisões
 * com as paredes, progressão de fases e envio de métricas para o Dashboard.
 */

// --------------------------------------------------
// CONFIGURAÇÃO DOS NÍVEIS DO LABIRINTO
// --------------------------------------------------
const LEVELS = [
  {
    // Nível Fácil: caminho reto horizontal simples (para introdução da mecânica)
    name: 'Fácil',
    gap: 70,          // Largura em pixels do corredor (tolerância da coordenação)
    timeSec: 60,      // Tempo limite do cronômetro
    points: [
      {x:40,  y:180},
      {x:448, y:180}
    ]
  },
  {
    // Nível Médio: caminho em formato "L" (adiciona mudança de direção)
    name: 'Médio',
    gap: 55,          // Corredor ligeiramente mais estreito
    timeSec: 50,
    points: [
      {x:44,  y:290},
      {x:44,  y:90},
      {x:444, y:90},
      {x:444, y:270}
    ]
  },
  {
    // Nível Difícil: caminho em ziguezague (exige alta precisão motora)
    name: 'Difícil',
    gap: 44,          // Corredor estreito (alta dificuldade)
    timeSec: 40,
    points: [
      {x:44,  y:300},
      {x:44,  y:90},
      {x:200, y:90},
      {x:200, y:270},
      {x:360, y:270},
      {x:360, y:90},
      {x:444, y:90}
    ]
  }
];

// --------------------------------------------------
// VARIÁVEIS DE ESTADO E REFERÊNCIAS DO JOGO
// --------------------------------------------------
let currentLevel = 0;  // Índice do nível selecionado (0 = Fácil, 1 = Médio, 2 = Difícil)
let lives       = 3;   // Corações de vidas do foguete
let timerSec    = 60;  // Segundos restantes
let timerHandle = null;// Referência do intervalo do cronômetro
let isDragging  = false;// Rastreia se o foguete está sendo arrastado no momento
let gameActive  = false;// Define se o jogo está ativo e aceita interação
let dragOffX    = 0, dragOffY = 0; // Deslocamento de pixels (offset) entre o ponteiro e o centro do foguete
let levelWallHits = 0; // Rastreia a quantidade de colisões com as paredes roxas para estatísticas pedagógicas

// Referências diretas dos Elementos do DOM (HTML)
const arena      = document.getElementById('arena');
const pathSVG    = document.getElementById('path-svg');
const overlay    = document.getElementById('overlay');
const livesEl    = document.getElementById('lives-val');
const levelEl    = document.getElementById('level-val');
const timerEl    = document.getElementById('timer-val');
const ovEmoji    = document.getElementById('ov-emoji');
const ovTitle    = document.getElementById('ov-title');
const ovSub      = document.getElementById('ov-sub');
const ovStatus   = document.getElementById('ov-status');
const btnRestart = document.getElementById('btn-restart');

// --------------------------------------------------
// CONSTRUÇÃO DO CAMINHO SVG
// Desenha o polígono que representa o corredor navegável
// --------------------------------------------------
function buildPath(points, gap) {
  const svgNS = 'http://www.w3.org/2000/svg';
  pathSVG.innerHTML = ''; // Limpa elementos antigos do SVG

  // Fundo do SVG: representa as "paredes" roxas (colisão ao sair do corredor)
  const bg = document.createElementNS(svgNS, 'rect');
  bg.setAttribute('x', 0); bg.setAttribute('y', 0);
  bg.setAttribute('width', 488); bg.setAttribute('height', 360);
  bg.setAttribute('fill', '#EDE7F6'); // Cor suave roxa
  pathSVG.appendChild(bg);

  // Constrói o corredor: desenha retângulos rotacionados e arredondados entre cada ponto do nível
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i], p2 = points[i + 1];
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const len = Math.sqrt(dx*dx + dy*dy); // Calcula a distância entre os dois pontos
    const angle = Math.atan2(dy, dx) * 180 / Math.PI; // Obtém o ângulo de rotação em graus
    const cx = (p1.x + p2.x) / 2, cy = (p1.y + p2.y) / 2; // Ponto médio do segmento

    const seg = document.createElementNS(svgNS, 'rect');
    seg.setAttribute('x', cx - len/2);
    seg.setAttribute('y', cy - gap/2);
    seg.setAttribute('width', len);
    seg.setAttribute('height', gap);
    seg.setAttribute('rx', gap/2); // Arredonda as pontas para visual lúdico fluido
    seg.setAttribute('fill', '#E8F4FD'); // Cor azul do caminho
    seg.setAttribute('stroke', '#74B9FF'); // Borda azul escuro
    seg.setAttribute('stroke-width', '3');
    seg.setAttribute('transform', `rotate(${angle},${cx},${cy})`);
    pathSVG.appendChild(seg);

    // Junção circular nos cantos para suavizar dobras e evitar glitches de colisão
    if (i > 0) {
      const junc = document.createElementNS(svgNS, 'circle');
      junc.setAttribute('cx', p1.x); junc.setAttribute('cy', p1.y);
      junc.setAttribute('r', gap/2 + 1);
      junc.setAttribute('fill', '#E8F4FD');
      junc.setAttribute('stroke', '#74B9FF');
      junc.setAttribute('stroke-width', '3');
      pathSVG.appendChild(junc);
    }
  }

  // Linha tracejada indicativa no meio do caminho para ajudar a criança na orientação
  const arrowPath = points.map((p,i) => (i===0?'M':'L')+p.x+' '+p.y).join(' ');
  const arrow = document.createElementNS(svgNS, 'path');
  arrow.setAttribute('d', arrowPath);
  arrow.setAttribute('fill', 'none');
  arrow.setAttribute('stroke', '#74B9FF');
  arrow.setAttribute('stroke-width', '1.5');
  arrow.setAttribute('stroke-dasharray', '10 8'); // Efeito de tracejado
  arrow.setAttribute('opacity', '0.5');
  pathSVG.appendChild(arrow);
}

// --------------------------------------------------
// POSICIONAMENTO E SCALING
// Converte coordenadas do SVG (viewBox) para pixels físicos do HTML
// --------------------------------------------------
function vbToPx(vbX, vbY) {
  const rect = arena.getBoundingClientRect();
  const scaleX = rect.width  / 488;
  const scaleY = rect.height / 360;
  return { x: vbX * scaleX, y: vbY * scaleY };
}

/**
 * Cria as bandeiras de Início, Fim e o Foguete nas posições correspondentes do labirinto
 */
function placeZones(points) {
  // Limpa elementos de zonas anteriores
  document.querySelectorAll('.zone, #draggable').forEach(e => e.remove());

  const start = points[0];
  const end   = points[points.length - 1];

  // Zona inicial (Bandeira 🏁)
  const zStart = document.createElement('div');
  zStart.className = 'zone zone-start';
  zStart.textContent = '🏁';
  const ps = vbToPx(start.x, start.y);
  zStart.style.left = (ps.x - 27) + 'px';
  zStart.style.top  = (ps.y - 27) + 'px';
  arena.appendChild(zStart);

  // Zona final (Estrela ⭐)
  const zEnd = document.createElement('div');
  zEnd.className = 'zone zone-end';
  zEnd.id = 'zone-end';
  zEnd.textContent = '⭐';
  const pe = vbToPx(end.x, end.y);
  zEnd.style.left = (pe.x - 27) + 'px';
  zEnd.style.top  = (pe.y - 27) + 'px';
  arena.appendChild(zEnd);

  // Foguete Arrastável (🚀)
  const drag = document.createElement('div');
  drag.id = 'draggable';
  drag.textContent = '🚀';
  drag.style.left = (ps.x - 22) + 'px';
  drag.style.top  = (ps.y - 22) + 'px';
  arena.appendChild(drag);

  // Associa eventos de arrastar para mouse e toques de tela (mobile)
  drag.addEventListener('mousedown', onDragStart);
  drag.addEventListener('touchstart', onDragStart, { passive: false });
}

// --------------------------------------------------
// CÁLCULO DE DETECÇÃO DE COLISÃO
// Verifica se o centro do foguete está dentro das bordas do caminho
// --------------------------------------------------
function pointToSegmentDist(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const apx = px - ax, apy = py - ay;
  // Calcula a projeção do ponto no segmento
  const t = Math.max(0, Math.min(1, (apx*abx + apy*aby) / (abx*abx + aby*aby)));
  const dx = px - (ax + t*abx);
  const dy = py - (ay + t*aby);
  return Math.sqrt(dx*dx + dy*dy); // Distância real
}

/**
 * Retorna true se a coordenada do foguete está no corredor navegável do nível
 */
function isInsidePath(cx, cy) {
  const rect = arena.getBoundingClientRect();
  // Converte pixel do DOM de volta para o sistema de coordenadas do SVG viewBox (488x360)
  const scaleX = 488 / rect.width;
  const scaleY = 360 / rect.height;
  const vx = cx * scaleX;
  const vy = cy * scaleY;

  const lv  = LEVELS[currentLevel];
  const pts = lv.points;
  const halfGap = lv.gap / 2;

  // Verifica se o ponto está a uma distância menor do que a metade da largura do caminho em qualquer segmento
  for (let i = 0; i < pts.length - 1; i++) {
    const d = pointToSegmentDist(vx, vy, pts[i].x, pts[i].y, pts[i+1].x, pts[i+1].y);
    if (d <= halfGap) return true;
  }
  return false; // Fora do caminho (colidiu)
}

/**
 * Retorna true se o foguete alcançou a estrela final
 */
function isAtEnd(cx, cy) {
  const lv  = LEVELS[currentLevel];
  const end = lv.points[lv.points.length - 1];
  const pe  = vbToPx(end.x, end.y);
  const dx  = cx - pe.x, dy = cy - pe.y;
  return Math.sqrt(dx*dx + dy*dy) < 30; // Tolerância de aproximação
}

// --------------------------------------------------
// FLUXO DE EVENTOS DO ARRASTO (DRAG)
// --------------------------------------------------

/**
 * Acionado ao clicar/tocar no foguete
 */
function onDragStart(e) {
  if (!gameActive) return;
  e.preventDefault();

  isDragging = true;
  const drag = document.getElementById('draggable');
  drag.classList.add('dragging'); // Escala levemente o foguete

  // Coordenada absoluta de clique/toque
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  const rect = drag.getBoundingClientRect();
  
  // Mantém a posição relativa onde o ponteiro tocou dentro do círculo para evitar pulos
  dragOffX = clientX - rect.left - 22;
  dragOffY = clientY - rect.top  - 22;

  // Escuta movimentos em nível de janela (document) para evitar perda de foco rápido
  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup',   onDragEnd);
  document.addEventListener('touchmove', onDragMove, { passive: false });
  document.addEventListener('touchend',  onDragEnd);
}

/**
 * Atualiza a posição do foguete e valida colisões
 */
function onDragMove(e) {
  if (!isDragging) return;
  e.preventDefault();

  const drag = document.getElementById('draggable');
  const arenaRect = arena.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  // Novas posições baseadas no mouse/dedo e offset de clique
  let newLeft = clientX - arenaRect.left - dragOffX;
  let newTop  = clientY - arenaRect.top  - dragOffY;

  // Limita o movimento estritamente dentro da borda física da arena
  newLeft = Math.max(0, Math.min(arenaRect.width  - 44, newLeft));
  newTop  = Math.max(0, Math.min(arenaRect.height - 44, newTop));

  drag.style.left = newLeft + 'px';
  drag.style.top  = newTop  + 'px';

  // Obtém o centro do foguete para cálculos matemáticos
  const cx = newLeft + 22, cy = newTop + 22;

  // 1. Detecção de Colisão com as paredes roxas
  if (!isInsidePath(cx, cy)) {
    onHitWall();
    return;
  }

  // 2. Detecção de Chegada à estrela final
  if (isAtEnd(cx, cy)) {
    onWin();
  }
}

/**
 * Solta o arrasto e limpa os listeners temporários da tela
 */
function onDragEnd(e) {
  if (!isDragging) return;
  isDragging = false;
  const drag = document.getElementById('draggable');
  if (drag) drag.classList.remove('dragging');
  document.removeEventListener('mousemove', onDragMove);
  document.removeEventListener('mouseup',   onDragEnd);
  document.removeEventListener('touchmove', onDragMove);
  document.removeEventListener('touchend',  onDragEnd);
}

// --------------------------------------------------
// CONSEQUÊNCIAS DE COLISÃO E VITÓRIA
// --------------------------------------------------

/**
 * Acionado ao colidir com as paredes roxas
 */
function onHitWall() {
  if (!gameActive) return;
  onDragEnd(); // Cancela o arrasto imediato

  lives--; // Desconta vida
  levelWallHits++; // Incrementa contador de colisões para métricas
  livesEl.textContent = lives;

  const drag = document.getElementById('draggable');
  drag.classList.add('error'); // Vibração e piscar vermelho por CSS

  // Aciona vibração nativa do celular (se compatível)
  if (navigator.vibrate) navigator.vibrate(200);

  setTimeout(() => {
    drag.classList.remove('error');
    resetDraggable(); // Retorna o foguete para a largada

    if (lives <= 0) {
      gameOver(); // Se ficar sem vidas, fim de jogo
    }
  }, 600);
}

/**
 * Acionado ao guiar o foguete com sucesso até o fim
 */
function onWin() {
  if (!gameActive) return;
  gameActive = false;
  clearInterval(timerHandle); // Pausa cronômetro
  onDragEnd();

  const drag = document.getElementById('draggable');
  drag.classList.add('win'); // Efeito CSS de giro e sucesso verde

  // Registra a vitória no Dashboard do Portal Pedagógico
  if (typeof trackDragAttempt === 'function') {
    const timeTaken = LEVELS[currentLevel].timeSec - timerSec;
    trackDragAttempt(true, levelWallHits, timeTaken);
  }

  // Registra a partida jogada com vitória no banco de dados IndexedDB
  if (typeof salvarPartida === 'function') {
    const timeTaken = LEVELS[currentLevel].timeSec - timerSec;
    salvarPartida({
      jogo: 'Letrix Arrastar',
      resultado: 'Vitória',
      tempo: timeTaken,
      detalhes: `Dificuldade: ${LEVELS[currentLevel].name} | Batidas na parede: ${levelWallHits}`
    });
  }

  setTimeout(() => {
    launchConfetti(); // Confetes
    showOverlay(true); // Exibe overlay de avanço
  }, 600);
}

/**
 * Acionado sob derrota (sem vidas ou sem tempo)
 */
function gameOver() {
  gameActive = false;
  clearInterval(timerHandle);

  // Registra a derrota no Dashboard do Portal Pedagógico
  if (typeof trackDragAttempt === 'function') {
    const timeTaken = LEVELS[currentLevel].timeSec - timerSec;
    trackDragAttempt(false, levelWallHits, timeTaken);
  }

  // Registra a partida jogada com derrota no banco de dados IndexedDB
  if (typeof salvarPartida === 'function') {
    const timeTaken = LEVELS[currentLevel].timeSec - timerSec;
    salvarPartida({
      jogo: 'Letrix Arrastar',
      resultado: 'Derrota',
      tempo: timeTaken,
      detalhes: `Dificuldade: ${LEVELS[currentLevel].name} | Batidas na parede: ${levelWallHits} | Vidas ou tempo esgotado`
    });
  }

  showOverlay(false);
}

// --------------------------------------------------
// INTERFAZ DO MODAL OVERLAY
// --------------------------------------------------
function showOverlay(win) {
  ovEmoji.textContent = win ? '🎉' : '😢';
  ovTitle.textContent = win ? 'Arrasou!'   : 'Que pena!';
  
  if (win) {
    if (currentLevel < LEVELS.length - 1) {
      // Avanço Progressivo de Fase
      ovSub.textContent = `Você concluiu a fase! Excelente coordenação! 🚀`;
      ovStatus.textContent = `Fase Concluída!`;
      ovStatus.className = 'ov-status ok';
      btnRestart.className = 'btn-restart ok';
      btnRestart.textContent = '🚀 Próxima Fase ➜';
      btnRestart.onclick = () => {
        currentLevel++; // Avança nível
        // Atualiza a seleção visual dos chips de dificuldade
        document.querySelectorAll('.lv-chip').forEach((c, idx) => {
          if (idx === currentLevel) c.classList.add('active');
          else c.classList.remove('active');
        });
        initGame();
      };
    } else {
      // Concluiu todos os níveis
      ovSub.textContent = 'Parabéns! Você concluiu todos os caminhos do Letrix Arrastar!';
      ovStatus.textContent = 'Vitória Total! ⭐';
      ovStatus.className = 'ov-status ok';
      btnRestart.className = 'btn-restart ok';
      btnRestart.textContent = '🔄 Jogar de Novo';
      btnRestart.onclick = () => {
        currentLevel = 0; // Reinicia no fácil
        document.querySelectorAll('.lv-chip').forEach((c, idx) => {
          if (idx === 0) c.classList.add('active');
          else c.classList.remove('active');
        });
        initGame();
      };
    }
  } else {
    // Derrota
    ovSub.textContent = 'Suas vidas acabaram. Tente de novo!';
    ovStatus.textContent = 'Fim de jogo';
    ovStatus.className = 'ov-status fail';
    btnRestart.className = 'btn-restart fail';
    btnRestart.textContent = '🔄 Tentar de novo';
    btnRestart.onclick = () => {
      initGame();
    };
  }
  overlay.classList.add('show');
}

/**
 * Retorna o foguete para a posição inicial de largada
 */
function resetDraggable() {
  const drag = document.getElementById('draggable');
  if (!drag) return;
  const start = LEVELS[currentLevel].points[0];
  const ps = vbToPx(start.x, start.y);
  drag.style.left = (ps.x - 22) + 'px';
  drag.style.top  = (ps.y - 22) + 'px';
}

// --------------------------------------------------
// INICIALIZAÇÃO DA PARTIDA
// --------------------------------------------------
function initGame() {
  overlay.classList.remove('show');
  const lv = LEVELS[currentLevel];

  lives    = 3; // Inicializa corações
  levelWallHits = 0; // Reseta colisões do nível
  timerSec = lv.timeSec; // Ajusta cronômetro da dificuldade
  gameActive = true;
  isDragging = false;

  livesEl.textContent = lives;
  levelEl.textContent = currentLevel + 1;
  timerEl.textContent = timerSec;
  timerEl.style.color = '';

  // Reconstrói a pista SVG
  buildPath(lv.points, lv.gap);

  // Aguarda frame de animação de tela para calcular as dimensões reais renderizadas
  requestAnimationFrame(() => {
    placeZones(lv.points);
  });

  // Timer
  clearInterval(timerHandle);
  timerHandle = setInterval(() => {
    timerSec--;
    timerEl.textContent = timerSec;
    if (timerSec <= 10) timerEl.style.color = '#e17055'; // Fica vermelho sob urgência
    if (timerSec <= 0) {
      clearInterval(timerHandle);
      lives = 0;
      livesEl.textContent = 0;
      gameOver();
    }
  }, 1000);
}

// --------------------------------------------------
// CONFETES RITMADOS
// --------------------------------------------------
function launchConfetti() {
  const wrap = document.getElementById('conf-wrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  wrap.classList.add('show');
  const cols = ['#FF6B6B','#55EFC4','#FDCB6E','#A29BFE','#74B9FF','#FD79A8'];
  for (let i = 0; i < 55; i++) {
    const c = document.createElement('div');
    c.className = 'conf';
    c.style.left = Math.random() * 100 + '%';
    c.style.top  = '-20px';
    c.style.background = cols[Math.floor(Math.random() * cols.length)];
    const s = 6 + Math.random() * 9;
    c.style.width  = s + 'px';
    c.style.height = s + 'px';
    c.style.animationDelay    = (Math.random() * 0.8) + 's';
    c.style.animationDuration = (0.9 + Math.random() * 0.7) + 's';
    wrap.appendChild(c);
  }
  setTimeout(() => wrap.classList.remove('show'), 2500);
}

// --------------------------------------------------
// CONFIGURAÇÃO DOS EVENTOS DOM E REDIMENSIONAMENTO
// --------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Configura seletores de chips de dificuldade
  document.querySelectorAll('.lv-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.lv-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentLevel = parseInt(chip.dataset.lv);
      initGame();
    });
  });

  // Redesenha e recalcula posições caso a janela mude de tamanho (essencial para compatibilidade de ecrã)
  window.addEventListener('resize', () => {
    const lv = LEVELS[currentLevel];
    buildPath(lv.points, lv.gap);
    requestAnimationFrame(() => placeZones(lv.points));
  });

  // Inicializa o jogo de arrastar
  initGame();
});
