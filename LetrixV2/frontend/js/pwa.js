/**
 * LETRIX – Gerenciador de PWA e Instalação (Download)
 * 
 * Controla o registro do Service Worker, escuta o evento 'beforeinstallprompt',
 * gerencia a instalação no Chrome/Edge/Android, e fornece suporte/instruções para iOS e Desktop.
 */

(function () {
  'use strict';

  let deferredPrompt = null;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  // 1. Registro do Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registrado com sucesso. Escopo:', reg.scope);
          
          // Verifica atualizações periódicas
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] Nova versão do Letrix disponível.');
                }
              };
            }
          };
        })
        .catch((err) => {
          console.error('[PWA] Erro ao registrar Service Worker:', err);
        });
    });
  }

  // 2. Captura do evento de instalação nativo
  window.addEventListener('beforeinstallprompt', (e) => {
    // Impede o mini-infobar padrão dos navegadores Chromium
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA] Evento beforeinstallprompt capturado com sucesso.');

    // Atualiza estado visual de botões de instalação existentes
    atualizarBotoesInstalacao(true);

    // Exibe o banner promocional se não tiver sido dispensado na sessão
    verificarExibicaoBanner();
  });

  // 3. Evento de conclusão de instalação
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] Letrix instalado com sucesso!');
    deferredPrompt = null;
    atualizarBotoesInstalacao(false, true);
    ocultarBanner();
    mostrarNotificacaoToast('🎉 Parabéns! O Letrix foi instalado no seu dispositivo.');
  });

  // 4. Função principal de instalação (Download)
  window.instalarPWA = async function () {
    if (isStandalone) {
      mostrarNotificacaoToast('✅ O Letrix já está instalado e rodando em modo aplicativo!');
      return;
    }

    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('[PWA] Escolha do usuário na instalação:', outcome);
        if (outcome === 'accepted') {
          mostrarNotificacaoToast('🚀 Instalando o Letrix...');
        }
        deferredPrompt = null;
      } catch (err) {
        console.error('[PWA] Falha ao invocar prompt nativo:', err);
        abrirModalInstrucoes();
      }
    } else {
      // Se não há prompt nativo disponível (ex: iOS Safari, Firefox ou já acionado), abre modal com instruções ilustradas
      abrirModalInstrucoes();
    }
  };

  // 5. Atualização visual dos botões da página
  function atualizarBotoesInstalacao(disponivel, instalado = false) {
    const botoes = document.querySelectorAll('#btn-pwa-install, .btn-pwa-install');
    botoes.forEach((btn) => {
      if (isStandalone || instalado) {
        btn.innerHTML = '<span class="btn-icon">✅</span> App Instalado';
        btn.classList.add('installed');
        btn.title = 'Aplicativo Letrix instalado e pronto!';
      } else {
        btn.innerHTML = '<span class="btn-icon">📲</span> Baixar App';
        btn.classList.remove('installed');
        btn.title = 'Baixar e instalar o Letrix no celular ou computador';
      }
    });
  }

  // 6. Notificações Toast no topo/rodapé
  function mostrarNotificacaoToast(mensagem) {
    let toast = document.getElementById('pwa-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'pwa-toast';
      toast.className = 'pwa-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = mensagem;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 4000);
  }

  // 7. Modal de instruções para diferentes plataformas (iOS Safari, Android, Desktop)
  function abrirModalInstrucoes() {
    let modal = document.getElementById('pwa-instruction-modal');
    if (!modal) {
      criarModalInstrucoes();
      modal = document.getElementById('pwa-instruction-modal');
    }
    modal.style.display = 'flex';
  }

  window.fecharModalPWA = function () {
    const modal = document.getElementById('pwa-instruction-modal');
    if (modal) modal.style.display = 'none';
  };

  function detectarPlataforma() {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /android/.test(userAgent);
    return { isIOS, isAndroid };
  }

  function criarModalInstrucoes() {
    const { isIOS, isAndroid } = detectarPlataforma();

    let instrucaoHTML = '';

    if (isIOS) {
      instrucaoHTML = `
        <div class="pwa-platform-card active">
          <div class="pwa-card-header">
            <span class="pwa-card-icon">🍎</span>
            <h4>No iPhone ou iPad (Safari)</h4>
          </div>
          <ol class="pwa-steps">
            <li>Toque no botão <strong>Compartilhar</strong> <span class="badge-icon">📤</span> no menu inferior do Safari.</li>
            <li>Role a lista para baixo e toque em <strong>"Adicionar à Tela de Início"</strong> <span class="badge-icon">➕</span>.</li>
            <li>No canto superior direito, toque em <strong>"Adicionar"</strong>.</li>
            <li>Pronto! O ícone do Letrix aparecerá na sua tela inicial como um aplicativo nativo.</li>
          </ol>
        </div>
      `;
    } else if (isAndroid) {
      instrucaoHTML = `
        <div class="pwa-platform-card active">
          <div class="pwa-card-header">
            <span class="pwa-card-icon">🤖</span>
            <h4>No Android (Chrome ou Samsung Internet)</h4>
          </div>
          <ol class="pwa-steps">
            <li>Toque no menu de três pontos <span class="badge-icon">⋮</span> no canto superior direito do navegador.</li>
            <li>Selecione a opção <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong> <span class="badge-icon">📲</span>.</li>
            <li>Confirme tocando em <strong>"Instalar"</strong>.</li>
            <li>O Letrix será adicionado aos seus aplicativos e funcionará sem internet!</li>
          </ol>
        </div>
      `;
    } else {
      instrucaoHTML = `
        <div class="pwa-platform-card active">
          <div class="pwa-card-header">
            <span class="pwa-card-icon">💻</span>
            <h4>No Computador (Chrome, Edge ou Opera)</h4>
          </div>
          <ol class="pwa-steps">
            <li>Localize o ícone de instalação <span class="badge-icon">⤓</span> no lado direito da barra de endereços (URL).</li>
            <li>Clique no ícone e depois selecione <strong>"Instalar"</strong>.</li>
            <li>Ou clique no menu de opções <span class="badge-icon">⋮</span> e selecione <strong>"Instalar Letrix..."</strong>.</li>
            <li>O Letrix abrirá em uma janela exclusiva, rápido e pronto para jogar!</li>
          </ol>
        </div>
      `;
    }

    const modalHTML = `
      <div id="pwa-instruction-modal" class="pwa-modal-backdrop" style="display:none;" onclick="if(event.target === this) fecharModalPWA()">
        <div class="pwa-modal-content">
          <button class="pwa-modal-close" onclick="fecharModalPWA()" aria-label="Fechar">&times;</button>
          <div class="pwa-modal-hero">
            <img src="assets/lion_mascot.png" alt="Letrix" class="pwa-modal-mascot">
            <h3>Baixar o Letrix</h3>
            <p>Instale o Letrix no seu aparelho para jogar palavras, labirintos e memória com som e tela cheia, mesmo sem conexão de internet!</p>
          </div>
          ${instrucaoHTML}
          <div class="pwa-modal-footer">
            <button class="btn-pwa-primary" onclick="fecharModalPWA()">Entendi, vamos lá! 🚀</button>
          </div>
        </div>
      </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = modalHTML;
    document.body.appendChild(div.firstElementChild);
  }

  // 8. Banner de rodapé inteligente
  function verificarExibicaoBanner() {
    if (isStandalone) return;
    if (sessionStorage.getItem('letrix_pwa_banner_dismissed') === 'true') return;

    // Se já estiver na página index.html, cria o banner se não existir
    if (!document.getElementById('pwa-bottom-banner')) {
      criarBannerInstalacao();
    }
  }

  function criarBannerInstalacao() {
    const banner = document.createElement('div');
    banner.id = 'pwa-bottom-banner';
    banner.className = 'pwa-bottom-banner';
    banner.innerHTML = `
      <div class="pwa-banner-content">
        <span class="pwa-banner-icon">📲</span>
        <div class="pwa-banner-text">
          <strong>Baixar o aplicativo Letrix</strong>
          <p>Jogue sem internet, com acesso rápido direto da sua tela inicial!</p>
        </div>
      </div>
      <div class="pwa-banner-actions">
        <button class="pwa-banner-btn-install" onclick="instalarPWA()">Baixar Agora</button>
        <button class="pwa-banner-btn-close" onclick="fecharBannerPWA()" title="Depois">&times;</button>
      </div>
    `;
    document.body.appendChild(banner);

    // Animação de entrada
    setTimeout(() => {
      banner.classList.add('visible');
    }, 600);
  }

  window.fecharBannerPWA = function () {
    const banner = document.getElementById('pwa-bottom-banner');
    if (banner) {
      banner.classList.remove('visible');
      setTimeout(() => banner.remove(), 400);
    }
    sessionStorage.setItem('letrix_pwa_banner_dismissed', 'true');
  };

  function ocultarBanner() {
    const banner = document.getElementById('pwa-bottom-banner');
    if (banner) banner.remove();
  }

  // Inicialização no carregamento
  document.addEventListener('DOMContentLoaded', () => {
    atualizarBotoesInstalacao(false, isStandalone);

    // Adiciona listener de clique para qualquer elemento com #btn-pwa-install ou .btn-pwa-install
    const botoes = document.querySelectorAll('#btn-pwa-install, .btn-pwa-install');
    botoes.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.instalarPWA();
      });
    });

    // Se não estiver em modo standalone e não for dispensado, exibe o banner após 2.5s
    if (!isStandalone && sessionStorage.getItem('letrix_pwa_banner_dismissed') !== 'true') {
      setTimeout(() => {
        verificarExibicaoBanner();
      }, 2500);
    }
  });

})();
