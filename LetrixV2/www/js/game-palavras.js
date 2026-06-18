/**
 * LETRIX – Lógica do Jogo Letrix Palavras (Spelling)
 * 
 * Este arquivo gerencia o fluxo de formação de palavras, controle de tempo (30s),
 * dicas, vidas/erros e envio dos dados pedagógicos de desempenho ao Dashboard.
 */

// --- VARIÁVEIS DE ESTADO E CONFIGURAÇÃO ---
let WORDS = []; // Lista carregada e formatada contendo as palavras do jogo
const COLORS = ['#FF6B6B','#74B9FF','#55EFC4','#A29BFE','#FDCB6E','#FD79A8','#FF8E53','#00b894']; // Paleta lúdica para letras
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; // Alfabeto base para geração de letras extras (distratores)

let currentIdx = 0, streak = 0, lives = 3; // Estado do jogo: índice da palavra, respostas seguidas e corações
let timerSec = 30, timerInterval = null; // Controle de tempo: segundos restantes e intervalo do timer
let filledSlots = [], usedLetterEls = [], hintUsed = false; // Controle de slots de letras e uso de dicas
let hasFailedThisWord = false; // Rastreia se a criança errou pelo menos uma tentativa na palavra atual (para o dashboard)

/**
 * Inicializa a lista de palavras a partir do banco de dados (palavras.js)
 * Formata os dados de string bruta e aciona o embaralhamento e carregamento
 */
function initWords() {
  if (typeof CONTEUDO_TXT === 'undefined') {
    console.error("Dados de palavras não carregados!");
    return;
  }
  
  // Divide a string bruta em linhas e formata o objeto da palavra
  const lines = CONTEUDO_TXT.split('\n').filter(l => l.trim() !== '');
  WORDS = lines.map(line => {
    const parts = line.split('|');
    const word = parts[0].trim().toUpperCase();
    return {
      word: word,                                                    // Palavra correta
      emoji: parts[1] ? parts[1].trim() : '❓',                        // Pictograma/emoji correspondente
      badge: parts[2] ? parts[2].trim() : 'Geral',                    // Categoria pedagógica (Ex: Animais)
      color: COLORS[Math.floor(Math.random() * COLORS.length)],      // Cor aleatória da paleta lúdica
      extra: generateExtraLetters(word, 3)                           // Gera 3 letras extras para distração
    };
  });
  
  // Embaralha a ordem das palavras para novas sessões
  WORDS = shuffle(WORDS);
  // Carrega a primeira palavra
  loadWord();
}

/**
 * Gera letras extras que não pertencem à palavra para servir de distratores na grade
 * @param {string} word - Palavra atual
 * @param {number} count - Quantidade de letras a gerar
 */
function generateExtraLetters(word, count) {
  let extras = [];
  while(extras.length < count) {
    const l = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    // Garante que a letra extra não está na palavra e não é duplicada
    if(!word.includes(l) && !extras.includes(l)) extras.push(l);
  }
  return extras;
}

/**
 * Função utilitária para embaralhar um array (algoritmo simples de ordenação aleatória)
 */
function shuffle(arr) { 
  return [...arr].sort(() => Math.random() - 0.5); 
}

/**
 * Renderiza os ícones de corações de vida na tela
 */
function renderLives() {
  const el = document.getElementById('lives-display');
  if (!el) return;
  el.innerHTML = '';
  // Cria 3 corações, aplicando estilo de "perdido" (opacidade reduzida) nos corações consumidos
  for (let i = 0; i < 3; i++) {
    const h = document.createElement('span');
    h.className = 'heart' + (i >= lives ? ' lost' : '');
    h.textContent = '❤️';
    el.appendChild(h);
  }
}

/**
 * Atualiza o painel superior de progresso (Texto da palavra atual, porcentagem e barra de preenchimento)
 */
function updateProgress() {
  const pct = Math.round(((currentIdx) / WORDS.length) * 100);
  document.getElementById('progress-text').textContent = `Palavra ${currentIdx + 1} de ${WORDS.length}`;
  document.getElementById('progress-pct').textContent = pct + '%';
  document.getElementById('progress-fill').style.width = pct + '%';
}

/**
 * Inicia o cronômetro regressivo de 30 segundos
 */
function startTimer() {
  clearInterval(timerInterval);
  timerSec = 30;
  const el = document.getElementById('timer-val');
  if (el) {
    el.classList.remove('timer-urgent');
    el.textContent = timerSec;
  }
  timerInterval = setInterval(() => {
    timerSec--; 
    if (el) el.textContent = timerSec;
    // Adiciona efeito pulsante vermelho se faltarem menos de 10 segundos (urgência visual)
    if (timerSec <= 10 && el) el.classList.add('timer-urgent');
    if (timerSec <= 0) timeUp();
  }, 1000);
}

/**
 * Prepara a interface para a palavra atual
 */
function loadWord() {
  // Se concluímos a lista, exibe tela de vitória final
  if (currentIdx >= WORDS.length) {
    showOverlay("🏆", "Zerou!", "Você completou todas as palavras!", false);
    return;
  }

  const data = WORDS[currentIdx];
  filledSlots = Array(data.word.length).fill(null); // Reinicia os slots de letras preenchidos
  usedLetterEls = []; // Limpa referências
  hintUsed = false; // Reset da dica
  hasFailedThisWord = false; // Reset da sinalização de erros para a palavra

  // Atualiza emoji e cores no card visual
  document.getElementById('word-emoji').textContent = data.emoji;
  document.getElementById('image-frame').style.background = data.color + '22';
  
  // Atualiza o crachá/badge da categoria
  const badge = document.getElementById('category-badge');
  badge.textContent = data.badge;
  badge.style.background = data.color + '22';
  badge.style.color = data.color;
  badge.style.border = '2px solid ' + data.color + '66';

  // Renderiza dinamicamente os slots/quadrados onde as letras digitadas ficarão
  const slotsEl = document.getElementById('word-slots');
  slotsEl.innerHTML = '';
  for (let i = 0; i < data.word.length; i++) {
    const s = document.createElement('div');
    s.className = 'slot';
    // Permite remover a letra ao clicar no próprio slot preenchido
    s.addEventListener('click', () => removeFromSlot(i));
    slotsEl.appendChild(s);
  }

  // Combina as letras corretas com as 3 letras extras/distratores e as embaralha
  const letters = shuffle([...data.word.split(''), ...data.extra]);
  
  // Renderiza a grade de botões de letras na parte inferior da tela
  const grid = document.getElementById('letter-grid');
  grid.innerHTML = '';
  letters.forEach((letter, i) => {
    const btn = document.createElement('div');
    btn.className = 'lc'; btn.textContent = letter;
    const color = COLORS[i % COLORS.length];
    // Estilos lúdicos e bordas coloridas nos botões de letras
    btn.style.background = color + '18';
    btn.style.borderColor = color;
    btn.style.color = color;
    btn.dataset.letter = letter;
    // Evento de seleção de letra
    btn.addEventListener('click', () => pickLetter(btn));
    grid.appendChild(btn);
  });

  // Desabilita o botão confirmar até que todos os slots estejam ocupados
  document.getElementById('btn-confirm').disabled = true;
  startTimer(); 
  updateProgress(); 
  renderLives();
}

/**
 * Seleciona uma letra da grade inferior e insere no primeiro slot livre
 * @param {HTMLElement} btn - Elemento do botão da letra selecionada
 */
function pickLetter(btn) {
  if (btn.classList.contains('used')) return; // Bloqueia se a letra já foi usada
  
  const nextEmpty = filledSlots.findIndex(v => v === null);
  if (nextEmpty === -1) return; // Retorna se todos os slots já estiverem preenchidos

  // Registra a letra e o elemento do botão correspondente no slot
  filledSlots[nextEmpty] = { letter: btn.dataset.letter, el: btn };
  btn.classList.add('used'); // Marca o botão da grade como usado (opacidade reduzida)

  // Atualiza visualmente o quadrado do slot com a letra selecionada
  const slotEls = document.getElementById('word-slots').children;
  const slotEl = slotEls[nextEmpty];
  slotEl.textContent = btn.dataset.letter;
  slotEl.className = 'slot filled';
  slotEl.style.background = btn.style.background;
  slotEl.style.borderColor = btn.style.borderColor;
  slotEl.style.color = btn.style.color;

  // Habilita o confirmar se todos os espaços forem preenchidos
  document.getElementById('btn-confirm').disabled = filledSlots.includes(null);
}

/**
 * Remove a letra de um slot específico e reativa o botão original na grade
 * @param {number} idx - Índice do slot
 */
function removeFromSlot(idx) {
  if (!filledSlots[idx]) return;
  // Reativa o botão correspondente na grade
  filledSlots[idx].el.classList.remove('used');
  filledSlots[idx] = null; // Esvazia o registro do slot

  // Limpa o visual do slot
  const slotEl = document.getElementById('word-slots').children[idx];
  slotEl.textContent = '';
  slotEl.className = 'slot';
  slotEl.style.background = 'white';
  slotEl.style.borderColor = '#d0d0d0';
  document.getElementById('btn-confirm').disabled = true;
}

/**
 * Limpa todos os slots de letras digitadas de uma vez
 */
function clearAllSlots() {
  filledSlots.forEach((_, i) => removeFromSlot(i));
}

/**
 * Revela a letra correta no primeiro slot vazio (Função de Ajuda/Dica)
 */
function useHint() {
  if (hintUsed) return; // Limita a apenas uma dica por palavra
  hintUsed = true;
  
  const currentWord = WORDS[currentIdx].word;
  const nextEmpty = filledSlots.findIndex(v => v === null);
  if (nextEmpty !== -1) {
    const correctLetter = currentWord[nextEmpty];
    const btns = Array.from(document.getElementById('letter-grid').children);
    // Localiza um botão não utilizado contendo a letra correta
    const correctBtn = btns.find(b => b.dataset.letter === correctLetter && !b.classList.contains('used'));
    if(correctBtn) pickLetter(correctBtn);
  }
}

/**
 * Valida a palavra formulada pelo usuário
 */
function confirmWord() {
  const currentWord = WORDS[currentIdx].word;
  const userWord = filledSlots.map(s => s.letter).join('');

  if (userWord === currentWord) {
    // --- ACERTOU A PALAVRA ---
    clearInterval(timerInterval);
    streak++; // Incrementa contador de acertos seguidos
    document.getElementById('streak-val').textContent = streak;

    // Registra métrica de acerto no localStorage do Portal Pedagógico
    if (typeof trackSpellingWord === 'function') {
      const timeSpent = 30 - timerSec;
      trackSpellingWord(true, !hasFailedThisWord, hintUsed, timeSpent, WORDS[currentIdx].badge);
    }

    // Registra a jogada detalhada no banco de dados IndexedDB
    if (typeof salvarPartida === 'function') {
      const timeSpent = 30 - timerSec;
      salvarPartida({
        jogo: 'Letrix Palavras',
        resultado: 'Vitória',
        tempo: timeSpent,
        detalhes: `Palavra: ${currentWord} | Categoria: ${WORDS[currentIdx].badge} | Dica: ${hintUsed ? 'Sim' : 'Não'}`
      });
    }

    // Exibe overlay modal de parabéns
    showOverlay(WORDS[currentIdx].emoji, "Arrasou!", "A palavra era " + currentWord, true);
    launchConfetti(); // Dispara animação lúdica de confete
  } else {
    // --- ERROU A PALAVRA ---
    streak = 0; // Reseta sequida
    document.getElementById('streak-val').textContent = streak;
    lives--; // Reduz vida
    renderLives();
    hasFailedThisWord = true; // Sinaliza que o estudante errou esta palavra

    // Aplica animação CSS de vibração vermelha nos slots (feedback visual de erro)
    const slots = document.getElementById('word-slots').children;
    Array.from(slots).forEach(el => {
      el.classList.add('wrong');
      setTimeout(() => el.classList.remove('wrong'), 400);
    });
    
    // Fim de jogo se ficar sem vidas
    if (lives <= 0) {
      if (typeof trackSpellingWord === 'function') {
        const timeSpent = 30 - timerSec;
        trackSpellingWord(false, false, hintUsed, timeSpent, WORDS[currentIdx].badge);
      }
      gameOver();
    }
  }
}

/**
 * Evento disparado quando o tempo de 30 segundos se esgota
 */
function timeUp() {
  lives--; // Perda de vida
  renderLives();
  hasFailedThisWord = true;
  if (lives <= 0) {
    if (typeof trackSpellingWord === 'function') {
      trackSpellingWord(false, false, hintUsed, 30, WORDS[currentIdx].badge);
    }
    gameOver();
  } else {
    alert("Tempo esgotado! Uma vida perdida."); 
    startTimer(); // Reinicia cronômetro para outra tentativa
  }
}

/**
 * Trata o estado de derrota total (sem vidas)
 */
function gameOver() {
  clearInterval(timerInterval);

  // Registra a derrota no banco de dados IndexedDB
  if (typeof salvarPartida === 'function') {
    const timeSpent = 30 - timerSec;
    salvarPartida({
      jogo: 'Letrix Palavras',
      resultado: 'Derrota',
      tempo: timeSpent,
      detalhes: `Ficou sem vidas na palavra: ${WORDS[currentIdx].word}`
    });
  }

  showOverlay("😢", "Fim de Jogo!", "Você ficou sem vidas.", false);
}

/**
 * Exibe o modal overlay de feedback
 * @param {string} emoji - Iconografia lúdica do status
 * @param {string} title - Título de feedback (Ex: "Arrasou!")
 * @param {string} sub - Detalhes do feedback (Ex: "A palavra era...")
 * @param {boolean} isWin - Define a estilização do botão de avançar (sucesso/falha)
 */
function showOverlay(emoji, title, sub, isWin) {
  document.getElementById('ov-emoji').textContent = emoji;
  document.getElementById('ov-title').textContent = title;
  document.getElementById('ov-sub').textContent = sub;
  
  const btn = document.getElementById('btn-next');
  btn.className = 'btn-next ' + (isWin ? 'ok' : 'fail');
  
  if(!isWin) {
    btn.textContent = '🔄 Jogar de novo';
    // Se perdeu ou zerou, ao clicar redireciona para a tela inicial
    btn.onclick = () => window.location.href = 'index.html';
  } else {
    btn.textContent = 'Próxima ➜';
    // Se acertou, avança o índice e carrega nova palavra
    btn.onclick = () => {
      document.getElementById('overlay').classList.remove('show');
      currentIdx++;
      if (currentIdx >= WORDS.length) {
        showOverlay("🏆", "Zerou!", "Você completou todas as palavras!", false);
      } else {
        loadWord();
      }
    };
  }
  document.getElementById('overlay').classList.add('show');
}

/**
 * Gera dinamicamente confetes flutuantes coloridos na tela (recompensa lúdica)
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

// --- CONFIGURAÇÃO DOS EVENTOS DOM ---
document.addEventListener('DOMContentLoaded', () => {
  // Listener do botão de apagar slots
  document.getElementById('btn-clear').addEventListener('click', clearAllSlots);
  // Listener do botão de dica
  document.getElementById('hint-btn').addEventListener('click', useHint);
  // Listener do botão de confirmar palavra
  document.getElementById('btn-confirm').addEventListener('click', confirmWord);
  
  // Inicia o jogo de palavras
  initWords();
});
