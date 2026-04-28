/**
 * Firebase Configuration Module
 * Integración completa de Firebase para autenticación y sincronización de datos
 * Autor: Luis Antonio Canales Guerrero
 * Email: luisantoniocg3005@outlook.com
 */

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAXMpsy8ottnyxdYD9c9cae5OXY7GK40S4",
  authDomain: "pagina-de-contabilidad.firebaseapp.com",
  projectId: "pagina-de-contabilidad",
  storageBucket: "pagina-de-contabilidad.firebasestorage.app",
  messagingSenderId: "806853581942",
  appId: "1:806853581942:web:1d703bb7a9afaac514d357",
  measurementId: "G-0B0VFTFPK1"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

console.log('✅ Firebase inicializado correctamente');

/**
 * Firebase Manager Class
 */
class FirebaseManager {
  constructor() {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.adminEmail = 'luisantoniocg3005@outlook.com';
    this.syncInterval = null;
  }

  /**
   * Inicializar Firebase Manager
   */
  initialize() {
    console.log('Inicializando Firebase Manager...');
    
    // Escuchar cambios de autenticación
    auth.onAuthStateChanged((user) => {
      if (user) {
        this.currentUser = user;
        this.isAuthenticated = true;
        console.log(`✅ Usuario autenticado: ${user.email}`);
        this.setupAutoSync();
        this.updateAuthUI();
        this.logEvent('user_authenticated', { email: user.email });
      } else {
        this.currentUser = null;
        this.isAuthenticated = false;
        console.log('❌ Usuario no autenticado');
        this.stopAutoSync();
        this.updateAuthUI();
      }
    });
  }

  /**
   * Registrar nuevo usuario con email y contraseña
   */
  async registerUser(email, password) {
    try {
      const result = await auth.createUserWithEmailAndPassword(email, password);
      
      // Crear documento de usuario en Firestore
      await db.collection('users').doc(result.user.uid).set({
        email: result.user.email,
        createdAt: new Date().toISOString(),
        displayName: email.split('@')[0],
        lastSync: null
      });

      this.logEvent('user_registered', { email });
      this.sendAdminAlert(`Nuevo usuario registrado: ${email}`, 'info');
      
      return { success: true, user: result.user };
    } catch (error) {
      console.error('Error registrando usuario:', error);
      this.logEvent('registration_error', { email, error: error.message });
      this.sendAdminAlert(`Error en registro: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Iniciar sesión con email y contraseña
   */
  async loginUser(email, password) {
    try {
      const result = await auth.signInWithEmailAndPassword(email, password);
      this.logEvent('user_login', { email });
      this.sendAdminAlert(`Usuario inició sesión: ${email}`, 'info');
      return { success: true, user: result.user };
    } catch (error) {
      console.error('Error iniciando sesión:', error);
      this.logEvent('login_error', { email, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Cerrar sesión
   */
  async logout() {
    try {
      const email = this.currentUser?.email;
      await auth.signOut();
      this.logEvent('user_logout', { email });
      this.sendAdminAlert(`Usuario cerró sesión: ${email}`, 'info');
      return { success: true };
    } catch (error) {
      console.error('Error cerrando sesión:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sincronizar datos a Firestore
   */
  async syncToFirebase() {
    if (!this.isAuthenticated) {
      console.warn('Usuario no autenticado. No se puede sincronizar.');
      return false;
    }

    try {
      const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
      const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');

      const syncData = {
        accounts,
        transactions,
        lastSync: new Date().toISOString(),
        userEmail: this.currentUser.email
      };

      // Guardar en Firestore
      await db.collection('users').doc(this.currentUser.uid).collection('data').doc('sync').set(syncData);

      // Guardar cuentas individuales
      for (const account of accounts) {
        await db.collection('users').doc(this.currentUser.uid).collection('accounts').doc(account.id).set(account);
      }

      // Guardar transacciones individuales
      for (const transaction of transactions) {
        await db.collection('users').doc(this.currentUser.uid).collection('transactions').doc(transaction.id).set(transaction);
      }

      console.log('✅ Datos sincronizados a Firebase');
      this.logEvent('data_synced', { accountsCount: accounts.length, transactionsCount: transactions.length });
      this.sendAdminAlert(`${this.currentUser.email} sincronizó datos (${accounts.length} cuentas, ${transactions.length} transacciones)`, 'info');

      return true;
    } catch (error) {
      console.error('Error sincronizando datos:', error);
      this.logEvent('sync_error', { error: error.message });
      this.sendAdminAlert(`Error sincronizando datos para ${this.currentUser.email}: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Cargar datos desde Firestore
   */
  async loadFromFirebase() {
    if (!this.isAuthenticated) {
      console.warn('Usuario no autenticado. No se puede cargar datos.');
      return false;
    }

    try {
      const syncDoc = await db.collection('users').doc(this.currentUser.uid).collection('data').doc('sync').get();

      if (syncDoc.exists) {
        const data = syncDoc.data();
        localStorage.setItem('accounts', JSON.stringify(data.accounts || []));
        localStorage.setItem('transactions', JSON.stringify(data.transactions || []));

        console.log('✅ Datos cargados desde Firebase');
        this.logEvent('data_loaded', { accountsCount: data.accounts?.length || 0 });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error cargando datos:', error);
      this.logEvent('load_error', { error: error.message });
      return false;
    }
  }

  /**
   * Configurar sincronización automática
   */
  setupAutoSync() {
    // Sincronizar cada 5 minutos
    this.syncInterval = setInterval(() => {
      this.syncToFirebase();
    }, 5 * 60 * 1000);

    // Sincronizar antes de cerrar la página
    window.addEventListener('beforeunload', () => {
      this.syncToFirebase();
    });

    // Sincronizar cuando hay cambios en localStorage
    window.addEventListener('storage', () => {
      this.syncToFirebase();
    });

    console.log('✅ Sincronización automática configurada');
  }

  /**
   * Detener sincronización automática
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('❌ Sincronización automática detenida');
    }
  }

  /**
   * Registrar evento en Firestore
   */
  async logEvent(eventName, data = {}) {
    try {
      await db.collection('events').add({
        event: eventName,
        data,
        timestamp: new Date().toISOString(),
        userId: this.currentUser?.uid || 'anonymous',
        userEmail: this.currentUser?.email || 'anonymous'
      });

      console.log(`📊 Evento registrado: ${eventName}`);
    } catch (error) {
      console.error('Error registrando evento:', error);
    }
  }

  /**
   * Enviar alerta al administrador
   */
  async sendAdminAlert(message, severity = 'info') {
    try {
      await db.collection('admin_alerts').add({
        message,
        severity,
        timestamp: new Date().toISOString(),
        userId: this.currentUser?.uid || 'anonymous',
        userEmail: this.currentUser?.email || 'anonymous',
        recipient: this.adminEmail
      });

      console.log(`🚨 Alerta enviada: ${message}`);
    } catch (error) {
      console.error('Error enviando alerta:', error);
    }
  }

  /**
   * Actualizar UI de autenticación
   */
  updateAuthUI() {
    const authContainer = document.getElementById('authContainer');
    if (!authContainer) return;

    if (this.isAuthenticated) {
      authContainer.innerHTML = `
        <div class="auth-panel auth-logged-in">
          <p>✅ Autenticado como: <strong>${this.currentUser.email}</strong></p>
          <button id="syncButton" class="btn-primary">🔄 Sincronizar ahora</button>
          <button id="logoutButton" class="btn-secondary">Cerrar sesión</button>
        </div>
      `;

      document.getElementById('syncButton')?.addEventListener('click', () => this.syncToFirebase());
      document.getElementById('logoutButton')?.addEventListener('click', () => this.logout());
    } else {
      authContainer.innerHTML = `
        <div class="auth-panel auth-logged-out">
          <h3>Autenticación</h3>
          <form id="authForm">
            <div class="form-group">
              <label for="authEmail">Email</label>
              <input type="email" id="authEmail" required />
            </div>
            <div class="form-group">
              <label for="authPassword">Contraseña</label>
              <input type="password" id="authPassword" required />
            </div>
            <div class="form-group" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
              <button type="button" id="loginBtn" class="btn-primary">Iniciar sesión</button>
              <button type="button" id="registerBtn" class="btn-secondary">Registrarse</button>
            </div>
          </form>
        </div>
      `;

      document.getElementById('loginBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('authEmail').value;
        const password = document.getElementById('authPassword').value;
        const result = await this.loginUser(email, password);
        if (!result.success) alert(result.error);
      });

      document.getElementById('registerBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('authEmail').value;
        const password = document.getElementById('authPassword').value;
        if (password.length < 6) {
          alert('La contraseña debe tener al menos 6 caracteres');
          return;
        }
        const result = await this.registerUser(email, password);
        if (!result.success) alert(result.error);
      });
    }
  }

  /**
   * Obtener estado actual
   */
  getStatus() {
    return {
      isAuthenticated: this.isAuthenticated,
      currentUser: this.currentUser,
      email: this.currentUser?.email || null
    };
  }
}

// Instancia global
const firebaseManager = new FirebaseManager();

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    firebaseManager.initialize();
  });
} else {
  firebaseManager.initialize();
}
