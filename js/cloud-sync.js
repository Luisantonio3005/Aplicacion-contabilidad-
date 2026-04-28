/**
 * Cloud Sync Module
 * Sincronización de datos en la nube con Gmail, Outlook y correos institucionales
 * Los usuarios guardan su progreso en la nube
 * Autor: Luis Antonio Canales Guerrero
 */

class CloudSync {
  constructor() {
    this.adminEmail = 'luisantoniocg3005@outlook.com';
    
    this.providers = {
      gmail: {
        name: 'Gmail',
        icon: '📧',
        clientId: 'YOUR_GMAIL_CLIENT_ID.apps.googleusercontent.com',
        scope: 'https://www.googleapis.com/auth/drive.file',
        apiUrl: 'https://www.googleapis.com/drive/v3'
      },
      outlook: {
        name: 'Outlook',
        icon: '📬',
        clientId: 'YOUR_OUTLOOK_CLIENT_ID',
        scope: 'Files.ReadWrite',
        apiUrl: 'https://graph.microsoft.com/v1.0/me/drive/root'
      },
      institutional: {
        name: 'Correo Institucional',
        icon: '🏢',
        requiresManualSetup: true
      }
    };

    this.currentUser = null;
    this.isAuthenticated = false;
    this.syncStatus = 'idle'; // idle, syncing, synced, error
    this.lastSync = null;
  }

  /**
   * Inicializar sincronización en la nube
   */
  async initialize() {
    console.log('Inicializando sincronización en la nube...');
    this.loadUserSession();
    this.setupSyncUI();
    this.setupAutoSync();
  }

  /**
   * Cargar sesión de usuario guardada
   */
  loadUserSession() {
    const savedSession = localStorage.getItem('cloudSyncSession');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        this.currentUser = session.user;
        this.isAuthenticated = session.isAuthenticated;
        this.lastSync = session.lastSync;
        this.updateSyncUI();
      } catch (error) {
        console.error('Error cargando sesión:', error);
      }
    }
  }

  /**
   * Autenticar con Gmail
   */
  async authenticateWithGmail() {
    try {
      this.setSyncStatus('syncing');
      
      // Cargar Google API
      await this.loadGoogleAPI();

      const auth2 = gapi.auth2.getAuthInstance();
      const googleUser = await auth2.signIn();
      const profile = googleUser.getBasicProfile();

      this.currentUser = {
        provider: 'gmail',
        email: profile.getEmail(),
        name: profile.getName(),
        id: profile.getId(),
        accessToken: googleUser.getAuthResponse().id_token
      };

      this.saveUserSession();
      this.isAuthenticated = true;
      
      // Crear carpeta de sincronización
      await this.createSyncFolder('Gmail');
      
      this.setSyncStatus('synced');
      this.showNotification(`Autenticado con Gmail: ${profile.getEmail()}`, 'success');
      
      return true;
    } catch (error) {
      console.error('Error autenticando con Gmail:', error);
      this.setSyncStatus('error');
      this.showNotification('Error autenticando con Gmail', 'error');
      this.logAlert('Gmail authentication failed', 'warning');
      return false;
    }
  }

  /**
   * Autenticar con Outlook/Microsoft
   */
  async authenticateWithOutlook() {
    try {
      this.setSyncStatus('syncing');

      // Usar MSAL (Microsoft Authentication Library)
      const msalConfig = {
        auth: {
          clientId: this.providers.outlook.clientId,
          authority: 'https://login.microsoftonline.com/common',
          redirectUri: window.location.origin
        },
        cache: {
          cacheLocation: 'localStorage'
        }
      };

      const msalInstance = new msal.PublicClientApplication(msalConfig);
      const loginResponse = await msalInstance.loginPopup({
        scopes: ['Files.ReadWrite']
      });

      this.currentUser = {
        provider: 'outlook',
        email: loginResponse.account.username,
        name: loginResponse.account.name,
        id: loginResponse.account.homeAccountId,
        accessToken: loginResponse.accessToken
      };

      this.saveUserSession();
      this.isAuthenticated = true;

      // Crear carpeta de sincronización
      await this.createSyncFolder('Outlook');

      this.setSyncStatus('synced');
      this.showNotification(`Autenticado con Outlook: ${loginResponse.account.username}`, 'success');

      return true;
    } catch (error) {
      console.error('Error autenticando con Outlook:', error);
      this.setSyncStatus('error');
      this.showNotification('Error autenticando con Outlook', 'error');
      this.logAlert('Outlook authentication failed', 'warning');
      return false;
    }
  }

  /**
   * Guardar sesión de usuario
   */
  saveUserSession() {
    const session = {
      user: this.currentUser,
      isAuthenticated: this.isAuthenticated,
      lastSync: new Date().toISOString()
    };
    localStorage.setItem('cloudSyncSession', JSON.stringify(session));
  }

  /**
   * Sincronizar datos con la nube
   */
  async syncToCloud() {
    if (!this.isAuthenticated) {
      this.showNotification('Por favor, autentica primero', 'error');
      return false;
    }

    try {
      this.setSyncStatus('syncing');

      // Obtener datos locales
      const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
      const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');

      const syncData = {
        user: this.currentUser.email,
        timestamp: new Date().toISOString(),
        data: {
          accounts,
          transactions
        }
      };

      // Enviar a la nube según el proveedor
      switch (this.currentUser.provider) {
        case 'gmail':
          await this.syncToGmail(syncData);
          break;
        case 'outlook':
          await this.syncToOutlook(syncData);
          break;
        default:
          throw new Error('Proveedor no soportado');
      }

      this.lastSync = new Date().toISOString();
      this.saveUserSession();
      this.setSyncStatus('synced');
      this.showNotification('Datos sincronizados exitosamente', 'success');
      
      // Enviar alerta al admin
      await this.sendAdminAlert(`Usuario ${this.currentUser.email} sincronizó datos`, 'info');

      return true;
    } catch (error) {
      console.error('Error sincronizando:', error);
      this.setSyncStatus('error');
      this.showNotification('Error sincronizando datos', 'error');
      this.logAlert(`Sync failed for ${this.currentUser.email}`, 'error');
      return false;
    }
  }

  /**
   * Sincronizar con Gmail Drive
   */
  async syncToGmail(data) {
    try {
      const fileContent = JSON.stringify(data, null, 2);
      const fileName = `contabilidad-backup-${new Date().toISOString().split('T')[0]}.json`;

      // Crear archivo en Google Drive
      const response = await fetch(
        `${this.providers.gmail.apiUrl}/files?uploadType=multipart`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.currentUser.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: fileName,
            mimeType: 'application/json',
            parents: ['appDataFolder']
          })
        }
      );

      if (!response.ok) {
        throw new Error('Error uploading to Gmail');
      }

      console.log('Datos sincronizados con Gmail Drive');
    } catch (error) {
      console.error('Error sincronizando con Gmail:', error);
      throw error;
    }
  }

  /**
   * Sincronizar con Outlook OneDrive
   */
  async syncToOutlook(data) {
    try {
      const fileContent = JSON.stringify(data, null, 2);
      const fileName = `contabilidad-backup-${new Date().toISOString().split('T')[0]}.json`;

      const response = await fetch(
        `${this.providers.outlook.apiUrl}/children`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.currentUser.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: fileName,
            file: {},
            '@microsoft.graph.conflictBehavior': 'rename'
          })
        }
      );

      if (!response.ok) {
        throw new Error('Error uploading to Outlook');
      }

      console.log('Datos sincronizados con Outlook OneDrive');
    } catch (error) {
      console.error('Error sincronizando con Outlook:', error);
      throw error;
    }
  }

  /**
   * Crear carpeta de sincronización
   */
  async createSyncFolder(providerName) {
    console.log(`Creando carpeta de sincronización para ${providerName}...`);
    // Implementación específica según el proveedor
  }

  /**
   * Establecer estado de sincronización
   */
  setSyncStatus(status) {
    this.syncStatus = status;
    this.updateSyncUI();
  }

  /**
   * Actualizar UI de sincronización
   */
  updateSyncUI() {
    const syncButton = document.getElementById('syncButton');
    const syncStatus = document.getElementById('syncStatus');

    if (!syncButton || !syncStatus) return;

    if (this.isAuthenticated) {
      syncButton.textContent = `🔄 Sincronizar (${this.currentUser.email})`;
      syncButton.disabled = false;
      syncStatus.textContent = `Estado: ${this.syncStatus}`;
      syncStatus.style.color = this.syncStatus === 'synced' ? '#10b981' : '#f59e0b';
    } else {
      syncButton.textContent = '☁️ Conectar nube';
      syncButton.disabled = false;
      syncStatus.textContent = 'No autenticado';
      syncStatus.style.color = '#6b7280';
    }
  }

  /**
   * Configurar sincronización automática
   */
  setupAutoSync() {
    // Sincronizar cada 5 minutos si está autenticado
    setInterval(() => {
      if (this.isAuthenticated && this.syncStatus !== 'syncing') {
        this.syncToCloud();
      }
    }, 5 * 60 * 1000);

    // Sincronizar antes de cerrar la página
    window.addEventListener('beforeunload', () => {
      if (this.isAuthenticated) {
        this.syncToCloud();
      }
    });
  }

  /**
   * Configurar UI de sincronización
   */
  setupSyncUI() {
    const syncContainer = document.getElementById('syncContainer');
    if (!syncContainer) return;

    syncContainer.innerHTML = `
      <div class="sync-panel">
        <h3>☁️ Sincronización en la nube</h3>
        <p>Guarda tu progreso en Gmail, Outlook o correo institucional</p>
        
        <div class="sync-buttons">
          <button id="gmailButton" class="btn-sync btn-gmail">📧 Gmail</button>
          <button id="outlookButton" class="btn-sync btn-outlook">📬 Outlook</button>
          <button id="institutionalButton" class="btn-sync btn-institutional">🏢 Correo Institucional</button>
        </div>
        
        <div id="syncStatus" class="sync-status">No autenticado</div>
        <button id="syncButton" class="btn-primary" style="margin-top: 1rem;">☁️ Conectar nube</button>
      </div>
    `;

    // Event listeners
    document.getElementById('gmailButton')?.addEventListener('click', () => this.authenticateWithGmail());
    document.getElementById('outlookButton')?.addEventListener('click', () => this.authenticateWithOutlook());
    document.getElementById('institutionalButton')?.addEventListener('click', () => this.setupInstitutionalEmail());
    document.getElementById('syncButton')?.addEventListener('click', () => this.syncToCloud());
  }

  /**
   * Configurar correo institucional
   */
  setupInstitutionalEmail() {
    const email = prompt('Ingresa tu correo institucional:');
    if (email && securityModule.validateEmail(email).valid) {
      this.currentUser = {
        provider: 'institutional',
        email: email,
        name: email.split('@')[0],
        id: email
      };
      this.saveUserSession();
      this.isAuthenticated = true;
      this.updateSyncUI();
      this.showNotification(`Correo institucional configurado: ${email}`, 'success');
    }
  }

  /**
   * Enviar alerta al administrador
   */
  async sendAdminAlert(message, severity = 'info') {
    try {
      const alert = {
        timestamp: new Date().toISOString(),
        message,
        severity,
        user: this.currentUser?.email || 'anonymous',
        userAgent: navigator.userAgent
      };

      // Guardar alerta localmente
      const alerts = JSON.parse(localStorage.getItem('adminAlerts') || '[]');
      alerts.push(alert);
      localStorage.setItem('adminAlerts', JSON.stringify(alerts));

      // En producción, enviar a servidor
      // await fetch('/api/admin-alert', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(alert)
      // });

      console.log(`[ADMIN ALERT] ${message}`);
    } catch (error) {
      console.error('Error enviando alerta:', error);
    }
  }

  /**
   * Registrar alerta
   */
  logAlert(message, severity = 'info') {
    this.sendAdminAlert(message, severity);
  }

  /**
   * Mostrar notificación
   */
  showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 5px;
      background-color: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 4000);
  }

  /**
   * Cargar Google API
   */
  loadGoogleAPI() {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        resolve();
      } else {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/platform.js';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          gapi.load('auth2', resolve);
        };
        script.onerror = reject;
        document.head.appendChild(script);
      }
    });
  }

  /**
   * Cerrar sesión
   */
  logout() {
    this.currentUser = null;
    this.isAuthenticated = false;
    localStorage.removeItem('cloudSyncSession');
    this.updateSyncUI();
    this.showNotification('Sesión cerrada', 'info');
  }

  /**
   * Obtener estado de sincronización
   */
  getStatus() {
    return {
      isAuthenticated: this.isAuthenticated,
      currentUser: this.currentUser,
      syncStatus: this.syncStatus,
      lastSync: this.lastSync
    };
  }
}

// Instancia global
const cloudSync = new CloudSync();

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    cloudSync.initialize();
  });
} else {
  cloudSync.initialize();
}
