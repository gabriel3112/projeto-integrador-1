/**
 * LETRIX – Sistema de Estatísticas e Métricas Educativas (Dashboard)
 * 
 * Este arquivo fornece funções para rastrear o progresso do estudante,
 * armazenar os dados de forma persistente e gerar análises para os pais/professores.
 */

// Chave utilizada para salvar o objeto JSON de estatísticas no localStorage
const STORAGE_KEY_STATS = 'letrix_stats';

// Estrutura padrão de dados pedagógicos coletados (inicialização)
const DEFAULT_STATS = {
  spelling: {
    played: 0,             // Total de palavras tentadas
    correct: 0,            // Total de acertos
    correctFirstTry: 0,    // Acertos de primeira tentativa (sem ajuda e sem erro)
    hintsUsed: 0,          // Total de vezes que pediu dica
    totalTimeSec: 0,       // Tempo acumulado em segundos
    categories: {}         // Mapa de interesse de termos (frequência por categoria de palavra)
  },
  drag: {
    played: 0,             // Níveis de coordenação motora tentados
    wins: 0,               // Níveis concluídos até o fim
    wallHits: 0,           // Quantidade acumulada de batidas na parede (indicador de precisão espacial)
    totalTimeSec: 0,       // Tempo total em segundos
    fastestTimeSec: null   // Menor tempo registrado de conclusão (tempo recorde)
  },
  memory: {
    played: 0,             // Rodadas de jogo de memória iniciadas
    wins: 0,               // Rodadas em que encontrou todos os pares
    totalMoves: 0,         // Acumulador de viradas de cartas (movimentos efetuados)
    totalTimeSec: 0,       // Tempo total jogado
    fastestTimeSec: null   // Tempo recorde para esvaziar o tabuleiro
  }
};

/**
 * Carrega e analisa as estatísticas atuais salvas no localStorage do navegador
 * @returns {object} Objeto com dados do progresso da criança
 */
function getStats() {
  const data = localStorage.getItem(STORAGE_KEY_STATS);
  // Se for o primeiro acesso, clona e retorna a estrutura padrão inicial
  if (!data) {
    return JSON.parse(JSON.stringify(DEFAULT_STATS));
  }
  try {
    const parsed = JSON.parse(data);
    // Garante que todas as propriedades e estruturas novas existam (fallback sob atualizações)
    return {
      spelling: { ...DEFAULT_STATS.spelling, ...parsed.spelling },
      drag: { ...DEFAULT_STATS.drag, ...parsed.drag },
      memory: { ...DEFAULT_STATS.memory, ...parsed.memory }
    };
  } catch (e) {
    console.error("Erro ao analisar dados de estatísticas:", e);
    return JSON.parse(JSON.stringify(DEFAULT_STATS));
  }
}

/**
 * Persiste as estatísticas estruturadas de volta no localStorage do navegador
 * @param {object} stats - Objeto de estatísticas atualizado
 */
function saveStats(stats) {
  localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
}

/**
 * Apaga e redefine todas as métricas para o valor padrão (reinício de progresso)
 */
function resetStats() {
  saveStats(DEFAULT_STATS);
  // Atualiza dinamicamente o painel caso a tela do dashboard esteja aberta
  if (typeof updateDashboardUI === 'function') {
    updateDashboardUI();
  }
}

/**
 * Registra dados de desempenho de uma palavra no Letrix Palavras
 * @param {boolean} isCorrect - Se o usuário acertou
 * @param {boolean} isFirstTry - Se resolveu de primeira (sem errar e sem dicas)
 * @param {boolean} hintUsed - Se utilizou o recurso de dica
 * @param {number} timeSec - Tempo gasto em segundos
 * @param {string} category - Categoria da palavra (Ex: Frutas)
 */
function trackSpellingWord(isCorrect, isFirstTry, hintUsed, timeSec, category) {
  const stats = getStats();
  
  stats.spelling.played++;
  if (isCorrect) {
    stats.spelling.correct++;
    if (isFirstTry) {
      stats.spelling.correctFirstTry++;
    }
  }
  if (hintUsed) {
    stats.spelling.hintsUsed++;
  }
  stats.spelling.totalTimeSec += timeSec;

  // Incrementa a categoria no mapa para análise de interesse lexical da criança
  if (category) {
    if (!stats.spelling.categories[category]) {
      stats.spelling.categories[category] = 0;
    }
    stats.spelling.categories[category]++;
  }

  saveStats(stats);
}

/**
 * Registra dados de desempenho de uma rodada no Letrix Arrastar (labirinto)
 * @param {boolean} isWin - Se chegou à estrela final
 * @param {number} wallHits - Batidas na parede ocorridas na fase
 * @param {number} timeSec - Tempo gasto
 */
function trackDragAttempt(isWin, wallHits, timeSec) {
  const stats = getStats();

  stats.drag.played++;
  if (isWin) {
    stats.drag.wins++;
    stats.drag.totalTimeSec += timeSec;

    // Atualiza o tempo recorde se for a menor duração registrada
    if (stats.drag.fastestTimeSec === null || timeSec < stats.drag.fastestTimeSec) {
      stats.drag.fastestTimeSec = timeSec;
    }
  }
  stats.drag.wallHits += wallHits;

  saveStats(stats);
}

/**
 * Registra dados de desempenho de uma rodada no Letrix Memória
 * @param {boolean} isWin - Se completou todos os pares
 * @param {number} moves - Total de jogadas (tentativas de pares)
 * @param {number} timeSec - Tempo total decorrido
 */
function trackMemoryAttempt(isWin, moves, timeSec) {
  const stats = getStats();

  stats.memory.played++;
  if (isWin) {
    stats.memory.wins++;
    stats.memory.totalTimeSec += timeSec;
    
    // Atualiza o tempo recorde se for a menor duração registrada
    if (stats.memory.fastestTimeSec === null || timeSec < stats.memory.fastestTimeSec) {
      stats.memory.fastestTimeSec = timeSec;
    }
  }
  stats.memory.totalMoves += moves;

  saveStats(stats);
}
