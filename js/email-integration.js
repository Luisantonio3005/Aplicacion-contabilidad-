/**
 * Email Integration Module
 * Integración con Gmail, Outlook, Microsoft y correos institucionales
 * Autor: Luis Antonio Canales Guerrero
 */

class EmailIntegration {
  constructor() {
    this.providers = {
      gmail: {
        name: 'Gmail',
        icon: '📧',
        apiUrl: 'https://www.googleapis.com/gmail/v1',
        clientId: 'YOUR_GMAIL_CLIENT_ID', // Reemplazar con tu Client ID
        scopes: ['https://www.googleapis.com/auth/gmail.send']
      },
      outlook: {
        name: 'Outlook',
        icon: '📬',
        apiUrl: 'https://graph.microsoft.com/v1.0/me/sendMail',
        clientId: 'YOUR_OUTLOOK_CLIENT_ID', // Reemplazar con tu Client ID
        scopes: ['Mail.Send']
      },
      microsoft: {
        name: 'Microsoft 365',
        icon: '☁️',
        apiUrl: 'https://graph.microsoft.com/v1.0/me/sendMail',
        clientId: 'YOUR_MICROSOFT_CLIENT_ID', // Reemplazar con tu Client ID
        scopes: ['Mail.Send']
      },
      institutional: {
        name: 'Correo Institucional',
        icon: '🏢',
        smtpServer: 'smtp.institutional.com', // Configurar según tu institución
        port: 587,
        requiresAuth: true
      }
    };

    this.currentProvider = null;
    this.isAuthenticated = false;
    this.userEmail = null;
  }

  /**
   * Inicializar integración de correos
   */
  async initialize() {
    console.log('Inicializando integración de correos...');
    this.loadAuthTokens();
    this.setupEmailForm();
  }

  /**
   * Cargar tokens de autenticación guardados
   */
  loadAuthTokens() {
    const savedTokens = localStorage.getItem('emailTokens');
    if (savedTokens) {
      try {
        const tokens = JSON.parse(savedTokens);
        this.currentProvider = tokens.provider;
        this.isAuthenticated = tokens.isAuthenticated;
        this.userEmail = tokens.userEmail;
      } catch (error) {
        console.error('Error cargando tokens:', error);
      }
    }
  }

  /**
   * Guardar tokens de autenticación
   */
  saveAuthTokens(provider, token, email) {
    const tokens = {
      provider,
      token,
      email,
      isAuthenticated: true,
      timestamp: new Date().getTime()
    };
    localStorage.setItem('emailTokens', JSON.stringify(tokens));
    this.currentProvider = provider;
    this.isAuthenticated = true;
    this.userEmail = email;
  }

  /**
   * Autenticar con Gmail
   */
  async authenticateGmail() {
    try {
      // Cargar Google API
      await this.loadGoogleAPI();

      const auth2 = gapi.auth2.getAuthInstance();
      const googleUser = await auth2.signIn();
      const profile = googleUser.getBasicProfile();

      this.saveAuthTokens('gmail', googleUser.getAuthResponse().id_token, profile.getEmail());
      this.showNotification(`Autenticado con Gmail: ${profile.getEmail()}`, 'success');
      return true;
    } catch (error) {
      console.error('Error autenticando con Gmail:', error);
      this.showNotification('Error autenticando con Gmail', 'error');
      return false;
    }
  }

  /**
   * Autenticar con Outlook/Microsoft
   */
  async authenticateMicrosoft() {
    try {
      // Usar MSAL (Microsoft Authentication Library)
      const msalConfig = {
        auth: {
          clientId: this.providers.microsoft.clientId,
          authority: 'https://login.microsoftonline.com/common',
          redirectUri: window.location.origin
        },
        cache: {
          cacheLocation: 'localStorage'
        }
      };

      const msalInstance = new msal.PublicClientApplication(msalConfig);
      const loginResponse = await msalInstance.loginPopup({
        scopes: this.providers.microsoft.scopes
      });

      this.saveAuthTokens('microsoft', loginResponse.accessToken, loginResponse.account.username);
      this.showNotification(`Autenticado con Microsoft: ${loginResponse.account.username}`, 'success');
      return true;
    } catch (error) {
      console.error('Error autenticando con Microsoft:', error);
      this.showNotification('Error autenticando con Microsoft', 'error');
      return false;
    }
  }

  /**
   * Configurar correo institucional
   */
  async configureInstitutionalEmail(email, password, smtpServer = null) {
    try {
      // Validar email
      if (!this.validateEmail(email)) {
        throw new Error('Email inválido');
      }

      // Guardar configuración (encriptada en producción)
      const config = {
        email,
        smtpServer: smtpServer || this.providers.institutional.smtpServer,
        port: this.providers.institutional.port,
        requiresAuth: true
      };

      // En producción, encriptar la contraseña
      localStorage.setItem('institutionalEmailConfig', JSON.stringify(config));
      this.saveAuthTokens('institutional', btoa(password), email);
      
      this.showNotification(`Correo institucional configurado: ${email}`, 'success');
      return true;
    } catch (error) {
      console.error('Error configurando correo institucional:', error);
      this.showNotification('Error configurando correo institucional', 'error');
      return false;
    }
  }

  /**
   * Enviar correo
   */
  async sendEmail(to, subject, body, attachments = []) {
    if (!this.isAuthenticated) {
      this.showNotification('Por favor, autentica primero', 'error');
      return false;
    }

    try {
      const emailData = {
        to,
        subject,
        body,
        from: this.userEmail,
        attachments,
        timestamp: new Date().toISOString()
      };

      // Enviar según el proveedor
      switch (this.currentProvider) {
        case 'gmail':
          return await this.sendViaGmail(emailData);
        case 'outlook':
        case 'microsoft':
          return await this.sendViaMicrosoft(emailData);
        case 'institutional':
          return await this.sendViaInstitutional(emailData);
        default:
          throw new Error('Proveedor no soportado');
      }
    } catch (error) {
      console.error('Error enviando correo:', error);
      this.showNotification('Error enviando correo', 'error');
      return false;
    }
  }

  /**
   * Enviar vía Gmail
   */
  async sendViaGmail(emailData) {
    try {
      const message = this.createMimeMessage(emailData);
      const response = await fetch(
        `${this.providers.gmail.apiUrl}/users/me/messages/send`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('gmailToken')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            raw: btoa(message).replace(/\+/g, '-').replace(/\//g, '_')
          })
        }
      );

      if (response.ok) {
        this.showNotification('Correo enviado exitosamente vía Gmail', 'success');
        this.logEmailSent(emailData);
        return true;
      } else {
        throw new Error('Error en respuesta de Gmail');
      }
    } catch (error) {
      console.error('Error enviando vía Gmail:', error);
      throw error;
    }
  }

  /**
   * Enviar vía Microsoft/Outlook
   */
  async sendViaMicrosoft(emailData) {
    try {
      const response = await fetch(
        this.providers.microsoft.apiUrl,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('microsoftToken')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: {
              subject: emailData.subject,
              body: {
                contentType: 'HTML',
                content: emailData.body
              },
              toRecipients: [
                {
                  emailAddress: {
                    address: emailData.to
                  }
                }
              ]
            },
            saveToSentItems: true
          })
        }
      );

      if (response.ok) {
        this.showNotification('Correo enviado exitosamente vía Microsoft', 'success');
        this.logEmailSent(emailData);
        return true;
      } else {
        throw new Error('Error en respuesta de Microsoft');
      }
    } catch (error) {
      console.error('Error enviando vía Microsoft:', error);
      throw error;
    }
  }

  /**
   * Enviar vía correo institucional
   */
  async sendViaInstitutional(emailData) {
    try {
      // En producción, esto se haría desde el backend
      const response = await fetch('/api/send-institutional-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });

      if (response.ok) {
        this.showNotification('Correo enviado exitosamente vía correo institucional', 'success');
        this.logEmailSent(emailData);
        return true;
      } else {
        throw new Error('Error enviando correo institucional');
      }
    } catch (error) {
      console.error('Error enviando vía correo institucional:', error);
      throw error;
    }
  }

  /**
   * Crear mensaje MIME
   */
  createMimeMessage(emailData) {
    const boundary = '===============' + Date.now() + '==';
    let message = `From: ${emailData.from}\r\n`;
    message += `To: ${emailData.to}\r\n`;
    message += `Subject: ${emailData.subject}\r\n`;
    message += `MIME-Version: 1.0\r\n`;
    message += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;
    message += `--${boundary}\r\n`;
    message += `Content-Type: text/html; charset="UTF-8"\r\n`;
    message += `Content-Transfer-Encoding: 7bit\r\n\r\n`;
    message += emailData.body + '\r\n';

    return message;
  }

  /**
   * Validar email
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Registrar correo enviado
   */
  logEmailSent(emailData) {
    const emailLog = JSON.parse(localStorage.getItem('emailLog') || '[]');
    emailLog.push({
      ...emailData,
      sentAt: new Date().toISOString(),
      provider: this.currentProvider
    });
    localStorage.setItem('emailLog', JSON.stringify(emailLog));
  }

  /**
   * Mostrar notificación
   */
  showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Crear elemento de notificación
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
   * Obtener historial de correos
   */
  getEmailHistory() {
    return JSON.parse(localStorage.getItem('emailLog') || '[]');
  }

  /**
   * Limpiar sesión
   */
  logout() {
    localStorage.removeItem('emailTokens');
    localStorage.removeItem('gmailToken');
    localStorage.removeItem('microsoftToken');
    this.isAuthenticated = false;
    this.currentProvider = null;
    this.userEmail = null;
    this.showNotification('Sesión cerrada', 'info');
  }
}

// Instancia global
const emailIntegration = new EmailIntegration();

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    emailIntegration.initialize();
  });
} else {
  emailIntegration.initialize();
}
