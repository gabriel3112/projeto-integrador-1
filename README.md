# Letrix – Alfabetização Lúdica 🧩🔤

> **Projeto Integrador / Trabalho de Conclusão de Curso**  
> **Curso**: Análise e Desenvolvimento de Sistemas (ADS) – CEUB  
> **Desenvolvedores**: Gabriel Matheus Silva Souza e Davi Arthur Altino De Souza  

O **Letrix** é uma solução pedagógica e lúdica desenvolvida como **Progressive Web App (PWA)** com suporte a funcionamento offline e integração com API backend Node.js e banco de dados MySQL. O projeto auxilia crianças no processo de alfabetização, treino de coordenação motora fina e exercícios de memória visual.

---

## 📁 Estrutura do Repositório

O projeto é organizado na pasta `LetrixV2/` dividido em duas camadas principais:

```text
LetrixV2/
├── backend/                  # Servidor API Node.js/Express e Banco MySQL
│   ├── .env                  # Variáveis de ambiente locais (porta, banco de dados)
│   ├── .env.example          # Modelo de configuração das variáveis
│   ├── .gitignore            # Ignora node_modules e .env
│   ├── package.json          # Gerenciador de dependências (Express, MySQL2, CORS, Dotenv)
│   ├── schema.sql            # Script SQL de criação do banco e tabelas
│   └── server.js             # Servidor HTTP com rotas REST e pool de conexões MySQL
└── frontend/                 # Interface do Usuário (PWA Instalável)
    ├── assets/               # Imagens, mascote e áudios interativos
    ├── css/                  # Estilos dos jogos, animações e componentes PWA
    ├── js/
    │   ├── config.js         # Configuração centralizada da URL da API (API_URL)
    │   ├── audio.js          # Gerenciador de áudio global persistente
    │   ├── dashboard.js      # Métricas e relatórios pedagógicos
    │   ├── db.js             # Persistência offline local (IndexedDB)
    │   ├── game-palavras.js  # Lógica do jogo Letrix Palavras
    │   ├── game-drag.js      # Lógica do jogo Letrix Arrastar (labirinto)
    │   └── game-memoria.js   # Lógica do jogo Letrix Memória
    ├── creditos.html         # Informações do projeto e autores
    ├── dashboard.html        # Painel Pedagógico de desempenho
    ├── drag.html             # Tela do jogo de coordenação
    ├── index.html            # Tela principal / Menu inicial
    ├── jogar.html            # Tela do jogo de alfabetização
    ├── memoria.html          # Tela do jogo de memória
    ├── portfolio.html        # Portfólio da profissional pedagógica
    ├── manifest.json         # Manifesto do Web App (PWA)
    └── sw.js                 # Service Worker (Cache First offline)
```

---

## 🛠️ Pré-requisitos

Para executar o projeto completo (Frontend PWA + Backend API + Banco MySQL), certifique-se de ter instalado no computador:

- **Node.js** (versão 18 ou superior) -> [Download Node.js](https://nodejs.org/)
- **MySQL Server** (versão 8.0+) ou MariaDB (via XAMPP, WAMP ou instalação direta)

---

## 🚀 Passo a Passo de Execução

### 1. Configurar o Banco de Dados (MySQL)
1. Abra o seu gerenciador de banco de dados MySQL (MySQL Workbench, phpMyAdmin, DBeaver ou CLI).
2. Execute o script contido em `LetrixV2/backend/schema.sql`:
   ```sql
   CREATE DATABASE IF NOT EXISTS LETRIX;
   USE LETRIX;

   CREATE TABLE IF NOT EXISTS resultados (
       id INT AUTO_INCREMENT PRIMARY KEY,
       nome_paciente VARCHAR(100) NOT NULL,
       jogo VARCHAR(50) NOT NULL,
       pontuacao INT NOT NULL,
       duracao_segundos INT,
       data_sessao DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   ```

### 2. Configurar e Iniciar o Backend (API Node.js)
1. Navegue até o diretório do backend:
   ```bash
   cd LetrixV2/backend
   ```
2. Crie o arquivo `.env` baseado no `.env.example`:
   ```bash
   cp .env.example .env
   ```
   *Edite o arquivo `.env` se a senha do seu MySQL local for diferente de vazia.*

3. Instale as dependências:
   ```bash
   npm install
   ```
4. Inicie o servidor:
   ```bash
   npm start
   ```
   *A API estará rodando em `http://localhost:3000`.*

---

### 3. Executar o Frontend (PWA)
1. Abra a pasta `LetrixV2/frontend/` em um servidor web local:
   - **Opção A (VS Code)**: Clique com o botão direito em `LetrixV2/frontend/index.html` e selecione **Open with Live Server**.
   - **Opção B (npx serve)**:
     ```bash
     npx serve LetrixV2/frontend
     ```
2. Abra o endereço indicado no navegador (ex: `http://localhost:5500` ou `http://localhost:3000`).
3. **Instalação PWA**: Clique no botão **"📲 Instalar App"** na tela inicial para instalar o aplicativo nativamente no celular ou computador.

---

## 🌐 Endpoints da API RESTful (`http://localhost:3000/api`)

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Verifica o estado de funcionamento da API |
| `POST` | `/api/resultados` | Salva o resultado de uma partida no banco MySQL |
| `GET` | `/api/resultados` | Retorna o histórico de resultados gravados no banco |

---

## 💡 Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (ES6+), Web App Manifest, Service Workers (Cache API), IndexedDB.
- **Backend**: Node.js, Express, MySQL2 (`mysql2/promise` com Connection Pool), CORS, Dotenv.
- **Banco de Dados**: MySQL 8.0+.