/**
 * LETRIX – Gerenciador de Áudio Persistente
 * 
 * Este script gerencia a música de fundo entre transições de páginas,
 * mantendo o estado de reprodução (ligado/desligado) e a posição do áudio.
 */

class AudioManager {
  constructor() {
    this.audioFile = 'assets/The_Toybox_Sprint.mp3'; // Caminho físico do áudio de fundo
    this.audio = null; // Instância interna do elemento HTML Audio
    this.isPlaying = false; // Controle interno se a música está tocando
    this.storageKeyEnabled = 'letrix_audio_enabled'; // Chave localStorage para a preferência de liga/desliga
    this.storageKeyTime = 'letrix_audio_time'; // Chave localStorage para salvar o progresso da música em segundos
    this.init(); // Inicializa o player
  }

  init() {
    // Se for o primeiro acesso da criança no jogo (localStorage vazio), o áudio inicia ativado por padrão
    if (localStorage.getItem(this.storageKeyEnabled) === null) {
      localStorage.setItem(this.storageKeyEnabled, 'true');
    }

    // Cria o objeto nativo de áudio do JavaScript
    this.audio = new Audio(this.audioFile);
    this.audio.loop = true; // Loop contínuo
    this.audio.volume = 0.4; // Define volume agradável de fundo (40%)

    // Recupera configurações persistidas
    const audioEnabled = localStorage.getItem(this.storageKeyEnabled) === 'true';
    const savedTime = localStorage.getItem(this.storageKeyTime);

    // Retorna a música para o segundo exato onde ela parou na página anterior
    if (savedTime && !isNaN(savedTime)) {
      this.audio.currentTime = parseFloat(savedTime);
    }

    // Tenta iniciar a reprodução se a configuração do usuário estiver ligada
    if (audioEnabled) {
      this.playAudio();
    }

    // Eventos para salvar o estado antes da página fechar ou recarregar (essencial para persistência de transição)
    window.addEventListener('beforeunload', () => this.saveState());
    window.addEventListener('pagehide', () => this.saveState());

    // Atualiza periodicamente o tempo no localStorage enquanto toca para evitar perda caso feche repentinamente
    this.audio.addEventListener('timeupdate', () => {
      if (this.audio.currentTime > 0) {
        localStorage.setItem(this.storageKeyTime, this.audio.currentTime.toString());
      }
    });

    // Contorna restrições de reprodução automática (Autoplay Policy) dos navegadores
    // Ativa a música na primeira interação real (clique ou toque) do usuário com a tela
    const startPlayOnInteraction = () => {
      const isEnabled = localStorage.getItem(this.storageKeyEnabled) === 'true';
      if (isEnabled && this.audio.paused) {
        this.playAudio();
      }
      // Remove listeners de interação após iniciar com sucesso para economizar processamento
      if (!this.audio.paused) {
        window.removeEventListener('click', startPlayOnInteraction);
        window.removeEventListener('touchstart', startPlayOnInteraction);
      }
    };
    window.addEventListener('click', startPlayOnInteraction);
    window.addEventListener('touchstart', startPlayOnInteraction);
  }

  /**
   * Executa a música
   */
  playAudio() {
    this.audio.play()
      .then(() => {
        this.isPlaying = true;
        localStorage.setItem(this.storageKeyEnabled, 'true');
        this.updateButtonsUI(); // Atualiza botões
      })
      .catch(err => {
        console.warn("Autoplay bloqueado pelo navegador. Aguardando interação do usuário.", err);
        this.isPlaying = false;
        this.updateButtonsUI(); // Atualiza UI correspondente
      });
  }

  /**
   * Pausa a música e salva a posição de parada
   */
  pauseAudio() {
    this.audio.pause();
    this.isPlaying = false;
    localStorage.setItem(this.storageKeyEnabled, 'false');
    this.saveState();
    this.updateButtonsUI();
  }

  /**
   * Alterna entre tocar e pausar (Mute/Unmute)
   */
  toggleAudio() {
    const isEnabled = localStorage.getItem(this.storageKeyEnabled) === 'true';
    if (isEnabled) {
      this.pauseAudio(); // Se estava tocando, fica mudo
    } else {
      this.playAudio(); // Se estava mudo, volta a tocar
    }
  }

  /**
   * Salva o tempo e preferências no localStorage
   */
  saveState() {
    if (this.audio) {
      localStorage.setItem(this.storageKeyTime, this.audio.currentTime.toString());
      const isEnabled = localStorage.getItem(this.storageKeyEnabled) === 'true';
      localStorage.setItem(this.storageKeyEnabled, isEnabled ? 'true' : 'false');
    }
  }

  /**
   * Varre a página atual em busca de botões de som (.btn-som) e atualiza visualmente seu emoji e cor
   */
  updateButtonsUI() {
    const isEnabled = localStorage.getItem(this.storageKeyEnabled) === 'true';
    const buttons = document.querySelectorAll('.btn-som, #btn-som');
    buttons.forEach(btn => {
      if (isEnabled) {
        btn.textContent = '🔊'; // Emoji ativo
        btn.style.background = '#55EFC4'; // Cor verde de ativo
      } else {
        btn.textContent = '🔇'; // Emoji silenciado
        btn.style.background = '#ff7e5f'; // Cor laranja/vermelho inativo
      }
    });
  }
}

// Inicializa a instância global de gerenciamento de áudio ao incluir o arquivo
const letrixAudio = new AudioManager();

// Função auxiliar global para facilitar a chamada via onclick nos botões HTML
function toggleMusica() {
  letrixAudio.toggleAudio();
}

// Garante atualização visual da interface assim que a página carregar
document.addEventListener('DOMContentLoaded', () => {
  letrixAudio.updateButtonsUI();
});
