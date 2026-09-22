/**
 * LETRIX – Configurações Globais do Frontend e Integração API
 */

// URL base da API Backend Node.js
const API_URL = 'http://localhost:3000/api';

/**
 * Envia o resultado de uma sessão de jogo para o backend MySQL
 * @param {string} nome_paciente - Nome da criança/paciente
 * @param {string} jogo - Nome do jogo (ex: 'Letrix Palavras', 'Letrix Arrastar', 'Letrix Memória')
 * @param {number} pontuacao - Pontuação obtida
 * @param {number} duracao_segundos - Duração da partida em segundos
 */
async function salvarResultadoAPI(nome_paciente, jogo, pontuacao, duracao_segundos) {
  try {
    const response = await fetch(`${API_URL}/resultados`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nome_paciente: nome_paciente || 'Convidado',
        jogo: jogo || 'Letrix',
        pontuacao: Number(pontuacao) || 0,
        duracao_segundos: Number(duracao_segundos) || 0
      })
    });
    return await response.json();
  } catch (err) {
    console.warn('[Letrix Frontend] Servidor API offline ou indisponível. Dados retidos localmente (IndexedDB).');
    return null;
  }
}
