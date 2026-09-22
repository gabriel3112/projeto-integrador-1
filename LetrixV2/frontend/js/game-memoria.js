/**
 * LETRIX – Lógica do Jogo Letrix Memória
 * 
 * Este arquivo gerencia o embaralhamento de cartas, a seleção de pares (Associação de Emoji a Palavra),
 * contagem de jogadas, vidas/erros, temporizador e registro de métricas de aprendizado.
 */

// --- VARIÁVEIS DE ESTADO E CONFIGURAÇÃO ---
let WORDS = []; // Base de palavras carregada do palavras.js
const COLORS = ['#FF6B6B','#74B9FF','#55EFC4','#A29BFE','#FDCB6E','#FD79A8','#FF8E53','#00b894']; // Cores para decoração

let cards = []; // Array que armazena os dados das 12 cartas da partida
let firstCard = null; // Primeira carta selecionada no turno
let secondCard = null; // Segunda carta selecionada no turno
let lockBoard = false; // Bloqueio temporário para impedir cliques extras durante validações
let matchesFound = 0; // Pares corretos encontrados até o momento (máximo = 6)

let lives = 3; // Corações de vida restantes
let moves = 0; // Quantidade de tentativas de combinação de par efetuadas
let wrongPairsCount = 0; // Contador acumulador de erros (a cada 3 erros, subtrai 1 vida)

let timerSec = 60; // Segundos totais da rodada
let timerInterval = null; // Intervalo de contagem do temporizador

/**
 * Inicializa a rodada do Jogo de Memória
 */
function initMemoryGame() {
  if (typeof CONTEUDO_TXT === 'undefined') {
    console.error("Dados de palavras não carregados!");
    return;
  }

  // Divide as linhas brutas contendo palavras e emojis
  const lines = CONTEUDO_TXT.split('\n').filter(l => l.trim() !== '');
  WORDS = lines.map(line => {
    const parts = line.split('|');
    return {
      word: parts[0].trim().toUpperCase(),
      emoji: parts[1] ? parts[1].trim() : '❓',
      badge: parts[2] ? parts[2].trim() : 'Geral'
    };
  });

  // Seleciona 6 palavras aleatórias distintas da lista geral para compor a grade
  const selectedWords = shuffle(WORDS).slice(0, 6);

  // Cria 12 cartas (6 contendo a representação visual (Emoji) e 6 contendo a representação textual (Palavra escrita))
  cards = [];
  selectedWords.forEach(w => {
    cards.push({
      id: Math.random(),
      type: 'emoji', // Identificador do tipo
      value: w.emoji, // Valor exibido na frente da carta
      word: w.word    // Palavra-chave para verificar a correspondência do par
    });
    cards.push({
      id: Math.random(),
      type: 'word',
      value: w.word,
      word: w.word
    });
  });

  // Embaralha de forma aleatória as 12 cartas criadas
  cards = shuffle(cards);

  // Reinicia variáveis de estado da partida
  firstCard = null;
  secondCard = null;
  lockBoard = false;
  matchesFound = 0;
  lives = 3;
  moves = 0;
  wrongPairsCount = 0;
  timerSec = 60;

  // Atualiza exibição inicial na tela
  document.getElementById('moves-val').textContent = moves;

  renderLives();
  renderCards();
  startTimer();
  updateProgress();
}

/**
 * Função auxiliar para ordenar aleatoriamente um array
 */
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

/**
 * Desenha os corações vermelhos de vida
 */
function renderLives() {
  const el = document.getElementById('lives-display');
  if (!el) return;
  el.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const h = document.createElement('span');
    h.className = 'heart' + (i >= lives ? ' lost' : '');
    h.textContent = '❤️';
    el.appendChild(h);
  }
}

/**
 * Atualiza o indicador visual da barra de progresso lexical
 */
function updateProgress() {
  const pct = Math.round((matchesFound / 6) * 100);
  document.getElementById('progress-text').textContent = `Pares Encontrados: ${matchesFound} de 6`;
  document.getElementById('progress-pct').textContent = pct + '%';
  document.getElementById('progress-fill').style.width = pct + '%';
}

/**
 * Gerencia a contagem regressiva de tempo (60 segundos no total)
 */
function startTimer() {
  clearInterval(timerInterval);
  const el = document.getElementById('timer-val');
  if (el) {
    el.classList.remove('timer-urgent');
    el.textContent = timerSec;
  }
  timerInterval = setInterval(() => {
    timerSec--;
    if (el) el.textContent = timerSec;
    // Efeito pulsante vermelho quando faltarem menos de 10s
    if (timerSec <= 10 && el) el.classList.add('timer-urgent');
    if (timerSec <= 0) timeUp();
  }, 1000);
}

/**
 * Cria a estrutura física 3D de cada carta em HTML e as adiciona na grade
 */
function renderCards() {
  const grid = document.getElementById('card-grid');
  grid.innerHTML = ''; // Limpa tabuleiro antigo

  cards.forEach(cardData => {
    // Wrapper principal da carta
    const cardEl = document.createElement('div');
    cardEl.className = 'card';
    cardEl.dataset.word = cardData.word;
    cardEl.dataset.type = cardData.type;

    // Div interna necessária para obter a rotação e perspectiva 3D
    const inner = document.createElement('div');
    inner.className = 'card-inner';

    // Costas da carta (exibe estrela roxa por padrão antes da virada)
    const back = document.createElement('div');
    back.className = 'card-back';

    // Frente da carta (revela o conteúdo quando virada)
    const front = document.createElement('div');
    front.className = 'card-front';

    // Formata o elemento interno dependendo se é emoji ou texto
    if (cardData.type === 'emoji') {
      const emojiSpan = document.createElement('span');
      emojiSpan.className = 'card-content-emoji';
      emojiSpan.textContent = cardData.value;
      front.appendChild(emojiSpan);
    } else {
      const wordSpan = document.createElement('span');
      wordSpan.className = 'card-content-word';
      wordSpan.textContent = cardData.value;
      front.appendChild(wordSpan);
    }

    inner.appendChild(back);
    inner.appendChild(front);
    cardEl.appendChild(inner);

    // Evento de clique para virar a carta
    cardEl.addEventListener('click', () => flipCard(cardEl));
    grid.appendChild(cardEl);
  });
}

/**
 * Trata o clique de virar carta
 * @param {HTMLElement} cardEl - Elemento da carta clicada
 */
function flipCard(cardEl) {
  if (lockBoard) return; // Retorna se a grade estiver congelada
  // Impede virar a mesma carta duas vezes ou re-clicar em cartas já combinadas
  if (cardEl.classList.contains('flipped') || cardEl.classList.contains('matched')) return;

  cardEl.classList.add('flipped'); // Aplica efeito de rotação CSS 3D

  // Primeira carta selecionada da jogada
  if (!firstCard) {
    firstCard = cardEl;
    return;
  }

  // Segunda carta selecionada da jogada
  secondCard = cardEl;
  moves++; // Incrementa contador de jogadas
  document.getElementById('moves-val').textContent = moves;

  // Compara se o par é equivalente
  checkForMatch();
}

/**
 * Compara se as duas cartas selecionadas possuem a mesma palavra-chave correspondente
 */
function checkForMatch() {
  const isMatch = firstCard.dataset.word === secondCard.dataset.word;

  if (isMatch) {
    disableCards(); // Par correto
  } else {
    unflipCards(); // Par incorreto
  }
}

/**
 * Trava as cartas correspondentes na tela (Par correto)
 */
function disableCards() {
  firstCard.classList.add('matched');
  secondCard.classList.add('matched');

  matchesFound++; // Incrementa progresso de pares
  updateProgress();

  resetBoard();

  // Checa se todos os 6 pares foram localizados (Vitória)
  if (matchesFound === 6) {
    winGame();
  }
}

/**
 * Desvira as cartas (Par incorreto) e desconta vida se necessário
 */
function unflipCards() {
  lockBoard = true; // Congela cliques adicionais
  wrongPairsCount++; // Incrementa contador de erros

  // A cada 3 combinações de pares erradas, perde 1 vida
  if (wrongPairsCount >= 3) {
    wrongPairsCount = 0;
    lives--; // Reduz corações de vida
    renderLives();
    
    // Altera a cor das bordas das cartas erradas para vermelho temporariamente (indicação de erro)
    firstCard.querySelector('.card-front').style.borderColor = '#e74c3c';
    secondCard.querySelector('.card-front').style.borderColor = '#e74c3c';
    
    // Morte se ficar sem vidas
    if (lives <= 0) {
      setTimeout(() => {
        gameOver();
      }, 500);
      return;
    }
  }

  // Aguarda 1 segundo para a criança visualizar o conteúdo antes de desvirar
  setTimeout(() => {
    firstCard.classList.remove('flipped');
    secondCard.classList.remove('flipped');
    
    // Limpa a cor vermelha de erro
    firstCard.querySelector('.card-front').style.borderColor = '';
    secondCard.querySelector('.card-front').style.borderColor = '';

    resetBoard();
  }, 1000);
}

/**
 * Libera a grade e reseta os ponteiros de seleção
 */
function resetBoard() {
  [firstCard, secondCard] = [null, null];
  lockBoard = false;
}

/**
 * Executa sequência de comemoração de vitória
 */
function winGame() {
  clearInterval(timerInterval);

  // Envia estatísticas de vitória para o localStorage (Dashboard)
  if (typeof trackMemoryAttempt === 'function') {
    const timeSpent = 60 - timerSec;
    trackMemoryAttempt(true, moves, timeSpent);
  }

  // Registra a partida com vitória no banco de dados IndexedDB
  if (typeof salvarPartida === 'function') {
    const timeSpent = 60 - timerSec;
    salvarPartida({
      jogo: 'Letrix Memória',
      resultado: 'Vitória',
      tempo: timeSpent,
      detalhes: `Tentativas de pares: ${moves} | Vidas restantes: ${lives}`
    });
  }

  setTimeout(() => {
    launchConfetti(); // Confetes
    showOverlay("🏆", "Você Venceu!", "Parabéns! Excelente memória!", `Jogadas: ${moves}`, true);
  }, 600);
}

/**
 * Chamado sob fim de tempo de 60 segundos
 */
function timeUp() {
  lives--;
  renderLives();
  if (lives <= 0) {
    gameOver();
  } else {
    alert("Tempo esgotado! Uma vida perdida.");
    startTimer();
  }
}

/**
 * Trata tela de fim de jogo (derrota)
 */
function gameOver() {
  clearInterval(timerInterval);

  // Envia estatísticas de derrota para o localStorage (Dashboard)
  if (typeof trackMemoryAttempt === 'function') {
    const timeSpent = 60 - timerSec;
    trackMemoryAttempt(false, moves, timeSpent);
  }

  // Registra a partida com derrota no banco de dados IndexedDB
  if (typeof salvarPartida === 'function') {
    const timeSpent = 60 - timerSec;
    salvarPartida({
      jogo: 'Letrix Memória',
      resultado: 'Derrota',
      tempo: timeSpent,
      detalhes: `Tentativas de pares: ${moves} | Ficou sem vidas`
    });
  }

  showOverlay("😢", "Fim de Jogo!", "Suas vidas acabaram.", `Jogadas: ${moves}`, false);
}

/**
 * Renderiza o modal de feedback
 * @param {string} emoji - Iconografia
 * @param {string} title - Título do feedback
 * @param {string} sub - Descrição lúdica
 * @param {string} ptsText - Texto estatístico (Ex: "Jogadas: X")
 * @param {boolean} isWin - Define o fluxo de ação dos botões
 */
function showOverlay(emoji, title, sub, ptsText, isWin) {
  document.getElementById('ov-emoji').textContent = emoji;
  document.getElementById('ov-title').textContent = title;
  document.getElementById('ov-sub').textContent = sub;
  
  const ptsEl = document.getElementById('ov-status');
  ptsEl.textContent = ptsText;
  ptsEl.className = 'overlay-status ' + (isWin ? 'ok' : 'fail');
  
  const btn = document.getElementById('btn-next');
  btn.className = 'btn-next ' + (isWin ? 'ok' : 'fail');
  
  if(!isWin) {
    btn.textContent = '🔄 Tentar de Novo';
    btn.onclick = () => {
      document.getElementById('overlay').classList.remove('show');
      initMemoryGame(); // Reinicia rodada
    };
  } else {
    btn.textContent = '🏠 Menu Principal';
    btn.onclick = () => {
      window.location.href = 'index.html'; // Volta ao menu
    };
  }
  document.getElementById('overlay').classList.add('show');
}

/**
 * Cria confetes festivos flutuantes
 */
function launchConfetti() {
  const wrap = document.getElementById('confetti-wrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  for (let i = 0; i < 40; i++) {
    const c = document.createElement('div');
    c.className = 'conf';
    c.style.left = Math.random() * 100 + '%';
    c.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];
    c.style.width = (6 + Math.random() * 8) + 'px';
    c.style.height = (10 + Math.random() * 10) + 'px';
    c.style.animationDelay = (Math.random() * 0.5) + 's';
    wrap.appendChild(c);
  }
}

// --- INICIALIZAÇÃO DO EVENTO DOM ---
document.addEventListener('DOMContentLoaded', () => {
  initMemoryGame();
});
