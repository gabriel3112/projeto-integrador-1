const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração dos middlewares
app.use(cors());
app.use(express.json());

// Criação do Pool de Conexões do MySQL utilizando mysql2/promise
const dbPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'LETRIX',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Teste inicial de conexão ao iniciar a API
(async () => {
  try {
    const connection = await dbPool.getConnection();
    console.log(`[Letrix API] Conexão com o banco de dados MySQL '${process.env.DB_NAME || 'LETRIX'}' estabelecida com sucesso!`);
    connection.release();
  } catch (err) {
    console.error('[Letrix API] Alerta: Não foi possível conectar ao MySQL local no arranque.', err.message);
  }
})();

// Endpoint de verificação de saúde da API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API Letrix rodando perfeitamente!' });
});

/**
 * POST /api/resultados
 * Salva um novo resultado de jogo/sessão na tabela `resultados`
 * Corpo da requisição: { nome_paciente, jogo, pontuacao, duracao_segundos }
 */
app.post('/api/resultados', async (req, res) => {
  try {
    const { nome_paciente, jogo, pontuacao, duracao_segundos } = req.body;

    // Validação básica dos campos obrigatórios
    if (!nome_paciente || !jogo || pontuacao === undefined || pontuacao === null) {
      return res.status(400).json({
        error: 'Campos obrigatórios ausentes. Forneça: nome_paciente, jogo e pontuacao.'
      });
    }

    const duracao = duracao_segundos ? parseInt(duracao_segundos, 10) : 0;
    const pont = parseInt(pontuacao, 10);

    const query = `
      INSERT INTO resultados (nome_paciente, jogo, pontuacao, duracao_segundos, data_sessao)
      VALUES (?, ?, ?, ?, NOW())
    `;

    const [result] = await dbPool.execute(query, [
      nome_paciente.trim(),
      jogo.trim(),
      isNaN(pont) ? 0 : pont,
      isNaN(duracao) ? 0 : duracao
    ]);

    return res.status(201).json({
      message: 'Resultado salvo com sucesso!',
      id: result.insertId,
      dados: {
        id: result.insertId,
        nome_paciente,
        jogo,
        pontuacao: pont,
        duracao_segundos: duracao
      }
    });

  } catch (error) {
    console.error('[Letrix API] Erro ao inserir resultado:', error);
    return res.status(500).json({
      error: 'Erro interno ao salvar resultado no banco de dados.',
      detalhes: error.message
    });
  }
});

/**
 * GET /api/resultados
 * Lista os resultados armazenados no banco de dados (útil para relatórios)
 */
app.get('/api/resultados', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM resultados ORDER BY data_sessao DESC');
    return res.json(rows);
  } catch (error) {
    console.error('[Letrix API] Erro ao buscar resultados:', error);
    return res.status(500).json({
      error: 'Erro interno ao consultar resultados no banco de dados.',
      detalhes: error.message
    });
  }
});

// Inicialização do servidor Express
app.listen(PORT, () => {
  console.log(`[Letrix API] Servidor rodando na porta ${PORT}`);
  console.log(`[Letrix API] Endpoint de criação: POST http://localhost:${PORT}/api/resultados`);
});
