/**
 * LETRIX – Gerenciador de PWA, Instalação e Funcionamento Offline
 */

(function () {
  'use strict';

  let deferredPrompt = null;

  // 1. Registro do Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then((reg) => {
          console.log('[Letrix PWA] Service Worker registrado com sucesso:', reg.scope);
        })
        .catch((err) => {
          console.error('[Letrix PWA] Falha ao registrar Service Worker:', err);
        });
    });
  }

  // 2. Verificar se o app já está rodando instalado (Standalone)
  function isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')
    );
  }

  // 3. Captura do Evento de Instalação (Android, Windows, ChromeOS, macOS)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[Letrix PWA] Evento beforeinstallprompt capturado');
    mostrarBotaoInstalacao();
  });

  // Evento disparado quando o app é instalado com sucesso
  window.addEventListener('appinstalled', () => {
    console.log('[Letrix PWA] Aplicativo instalado com sucesso!');
    deferredPrompt = null;
    ocultarBotaoInstalacao();
    exibirToast('🎉 Letrix instalado com sucesso! Acesse direto da sua tela inicial.');
  });

  // 4. Exibir e gerenciar botões de instalação
  function mostrarBotaoInstalacao() {
    if (isStandalone()) return;

    // Se houver um botão com id 'btn-install-pwa', habilita ele
    const btnInstall = document.getElementById('btn-install-pwa');
    if (btnInstall) {
      btnInstall.style.display = 'inline-flex';
      btnInstall.onclick = acionarInstalacaoPWA;
    }

    // Também cria um banner flutuante discreto na página inicial se necessário
    if (!document.getElementById('pwa-install-banner') && document.querySelector('.cta-area')) {
      const banner = document.createElement('div');
      banner.id = 'pwa-install-banner';
      banner.className = 'pwa-install-banner';
      banner.innerHTML = `
        <div class="pwa-banner-content">
          <span class="pwa-banner-icon">📲</span>
          <div class="pwa-banner-text">
            <strong>Instale o App Letrix</strong>
            <small>Jogue offline e acesse rápido na tela inicial!</small>
          </div>
          <button class="pwa-btn-banner" id="pwa-banner-btn-action">Instalar</button>
          <button class="pwa-btn-close" id="pwa-banner-btn-close">✕</button>
        </div>
      `;
      document.body.appendChild(banner);

      document.getElementById('pwa-banner-btn-action').onclick = acionarInstalacaoPWA;
      document.getElementById('pwa-banner-btn-close').onclick = () => {
        banner.remove();
      };
    }
  }

  function ocultarBotaoInstalacao() {
    const btnInstall = document.getElementById('btn-install-pwa');
    if (btnInstall) btnInstall.style.display = 'none';

    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.remove();
  }

  function acionarInstalacaoPWA() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('[Letrix PWA] Usuário aceitou a instalação');
        } else {
          console.log('[Letrix PWA] Usuário recusou a instalação');
        }
        deferredPrompt = null;
      });
    } else if (isIOS()) {
      exibirGuiaiOS();
    } else {
      exibirToast('ℹ️ Para instalar: abra o menu do seu navegador e selecione "Adicionar à tela inicial".');
    }
  }

  // 5. Suporte especial a dispositivos iOS Safari
  function isIOS() {
    const ua = window.navigator.userAgent;
    return /iPhone|iPad|iPod/.test(ua) && !window.MSStream;
  }

  function exibirGuiaiOS() {
    let iosModal = document.getElementById('ios-install-modal');
    if (!iosModal) {
      iosModal = document.createElement('div');
      iosModal.id = 'ios-install-modal';
      iosModal.className = 'pwa-ios-modal';
      iosModal.innerHTML = `
        <div class="pwa-ios-content">
          <button class="pwa-ios-close" onclick="document.getElementById('ios-install-modal').style.display='none'">✕</button>
          <div class="pwa-ios-icon">📲</div>
          <h3>Instalar Letrix no iPhone ou iPad</h3>
          <ol>
            <li>Toque no botão de <strong>Compartilhar</strong> <span style="font-size:18px;">⎋</span> no rodapé do Safari.</li>
            <li>Role a lista e selecione <strong>"Adicionar à Tela de Início"</strong> ➕.</li>
            <li>Toque em <strong>Adicionar</strong> no canto superior direito.</li>
          </ol>
          <button class="pwa-ios-btn-ok" onclick="document.getElementById('ios-install-modal').style.display='none'">Entendi!</button>
        </div>
      `;
      document.body.appendChild(iosModal);
    }
    iosModal.style.display = 'flex';
  }

  // Exibe botão no iOS se não estiver em standalone
  window.addEventListener('DOMContentLoaded', () => {
    if (isIOS() && !isStandalone()) {
      const btnInstall = document.getElementById('btn-install-pwa');
      if (btnInstall) {
        btnInstall.style.display = 'inline-flex';
        btnInstall.onclick = acionarInstalacaoPWA;
      }
    }
  });

  // 6. Monitor de estado Online / Offline
  function atualizarStatusRede() {
    if (!navigator.onLine) {
      exibirToast('⚡ Modo Offline Ativo: O Letrix continua funcionando sem internet!');
    } else {
      // Exibe apenas se esteve offline antes
      if (sessionStorage.getItem('was_offline') === 'true') {
        exibirToast('🌐 Conexão reestabelecida!');
        sessionStorage.removeItem('was_offline');
      }
    }
    if (!navigator.onLine) {
      sessionStorage.setItem('was_offline', 'true');
    }
  }

  window.addEventListener('online', atualizarStatusRede);
  window.addEventListener('offline', atualizarStatusRede);

  // 7. Utilitário de Toast / Notificações Flutuantes
  function exibirToast(mensagem) {
    let toast = document.getElementById('letrix-pwa-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'letrix-pwa-toast';
      toast.className = 'pwa-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = mensagem;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 4500);
  }

  // Exporta função global para acionar pelo botão do menu caso necessário
  window.instalarLetrixPWA = acionarInstalacaoPWA;
})();
