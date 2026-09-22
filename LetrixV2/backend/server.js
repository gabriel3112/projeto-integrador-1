/**
 * LETRIX – Servidor API RESTful Node.js / Express
 * 
 * Gerencia a comunicação com o banco de dados MySQL para salvar e listar
 * os resultados das partidas dos jogos educativos (Letrix Palavras, Arrastar e Memória).
 */

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração de Middlewares
app.use(cors());
app.use(express.json());

// Criação do Pool de Conexões do MySQL com mysql2/promise
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'LETRIX',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Teste inicial de conexão ao iniciar o servidor
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`[Letrix API] Conexão com o banco de dados MySQL '${process.env.DB_NAME || 'LETRIX'}' estabelecida.`);
    connection.release();
  } catch (err) {
    console.warn('[Letrix API] Aviso: Não foi possível conectar ao MySQL no arranque. Verifique se o MySQL está ativo e as variáveis do .env.');
  }
})();

/**
 * GET /api/health
 * Verificação de funcionamento e estado da API
 */
app.get('/api/health', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'API Letrix operacional',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/resultados
 * Registra o resultado de uma sessão de jogo no banco de dados MySQL
 * Corpo da requisição: { nome_paciente, jogo, pontuacao, duracao_segundos }
 */
app.post('/api/resultados', async (req, res) => {
  try {
    const { nome_paciente, jogo, pontuacao, duracao_segundos } = req.body;

    // Validação dos dados de entrada
    if (!nome_paciente || !jogo || pontuacao === undefined || pontuacao === null) {
      return res.status(400).json({
        success: false,
        error: 'Dados obrigatórios ausentes. Informe: nome_paciente, jogo e pontuacao.'
      });
    }

    const duracao = duracao_segundos ? parseInt(duracao_segundos, 10) : 0;
    const pont = parseInt(pontuacao, 10);

    const query = `
      INSERT INTO resultados (nome_paciente, jogo, pontuacao, duracao_segundos, data_sessao)
      VALUES (?, ?, ?, ?, NOW())
    `;

    const [result] = await pool.execute(query, [
      nome_paciente.toString().trim(),
      jogo.toString().trim(),
      isNaN(pont) ? 0 : pont,
      isNaN(duracao) ? 0 : duracao
    ]);

    return res.status(201).json({
      success: true,
      message: 'Resultado registrado com sucesso',
      data: {
        id: result.insertId,
        nome_paciente,
        jogo,
        pontuacao: pont,
        duracao_segundos: duracao
      }
    });

  } catch (error) {
    console.error('[Letrix API] Erro ao inserir resultado:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao salvar resultado no banco de dados.'
    });
  }
});

/**
 * GET /api/resultados
 * Retorna o histórico completo de partidas gravadas no MySQL
 */
app.get('/api/resultados', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM resultados ORDER BY data_sessao DESC');
    return res.status(200).json({
      success: true,
      total: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('[Letrix API] Erro ao buscar resultados:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao consultar resultados no banco de dados.'
    });
  }
});

// Middleware para tratamento de rotas não encontradas (404)
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    error: 'Rota não encontrada'
  });
});

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`[Letrix API] Servidor rodando na porta ${PORT}`);
});
