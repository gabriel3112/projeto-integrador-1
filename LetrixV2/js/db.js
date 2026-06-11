/**
 * LETRIX – Gerenciador de Banco de Dados local (IndexedDB)
 * 
 * Este arquivo cria e gerencia o banco de dados 'LetrixDB' no navegador da criança.
 * Ele permite armazenar o histórico individual detalhado de todas as partidas jogadas,
 * fornecendo persistência robusta sem necessidade de servidores externos.
 */

const DB_NAME = 'LetrixDB'; // Nome do banco de dados
const DB_VERSION = 1;      // Versão do banco de dados
const STORE_NAME = 'partidas'; // Nome da tabela/loja de objetos de partidas

/**
 * Abre a conexão com o banco de dados IndexedDB
 * @returns {Promise<IDBDatabase>} Promise que resolve com o banco de dados aberto
 */
function abrirDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // Evento disparado caso a versão mude ou seja a primeira criação do banco
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Cria a loja de objetos 'partidas' com chave autoincrementável (id)
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        
        // Cria índice baseado na data/timestamp para facilitar a ordenação cronológica
        store.createIndex('data', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result); // Conexão estabelecida com sucesso
    };

    request.onerror = (event) => {
      console.error("Erro ao abrir o banco de dados IndexedDB:", event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Salva um novo registro de partida no banco de dados de forma assíncrona
 * @param {object} partida - Dados da partida (jogo, resultado, tempo, timestamp, detalhes)
 * @returns {Promise<number>} Promise que resolve com o ID gerado para o registro
 */
function salvarPartida(partida) {
  return new Promise((resolve, reject) => {
    abrirDB().then(db => {
      // Abre uma transação de leitura e escrita
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Adiciona o registro com o timestamp atual automático se não for fornecido
      if (!partida.timestamp) {
        partida.timestamp = new Date().getTime();
      }

      // Se existir um usuário logado globalmente, anexa ao registro (login sem senha support)
      try {
        const user = localStorage.getItem('letrix_user');
        if (user) partida.user = user;
      } catch (e) {
        // Ignora erros de localStorage
      }

      const request = store.add(partida);

      request.onsuccess = (event) => {
        resolve(event.target.result); // Retorna o ID auto-incremental do registro inserido
      };

      request.onerror = (event) => {
        console.error("Erro ao salvar partida no banco de dados:", event.target.error);
        reject(event.target.error);
      };
    }).catch(reject);
  });
}

/**
 * Recupera todos os registros de partidas salvos no banco de dados
 * @returns {Promise<Array>} Promise que resolve com um array de objetos de partida ordenados por data decrescente
 */
function obterPartidas() {
  return new Promise((resolve, reject) => {
    abrirDB().then(db => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('data');
      
      const partidas = [];

      // Abre cursor no índice de data de trás para frente (IDBCursorWithValue.prev) para listar as mais recentes primeiro
      const request = index.openCursor(null, 'prev');

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          partidas.push(cursor.value);
          cursor.continue(); // Avança para o próximo registro
        } else {
          resolve(partidas); // Fim da leitura, retorna lista completa
        }
      };

      request.onerror = (event) => {
        console.error("Erro ao ler histórico do banco de dados:", event.target.error);
        reject(event.target.error);
      };
    }).catch(reject);
  });
}

/**
 * Limpa completamente todos os registros do banco de dados IndexedDB
 * @returns {Promise<void>}
 */
function limparBancoDados() {
  return new Promise((resolve, reject) => {
    abrirDB().then(db => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        resolve(); // Limpeza concluída
      };

      request.onerror = (event) => {
        console.error("Erro ao limpar banco de dados:", event.target.error);
        reject(event.target.error);
      };
    }).catch(reject);
  });
}
