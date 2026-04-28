/**
 * Admin Panel Module
 * Panel de administración para Luis Antonio Canales Guerrero
 * Ver usuarios, eventos y estadísticas
 */

class AdminPanel {
  constructor() {
    this.adminEmail = 'luisantoniocg3005@outlook.com';
    this.isAdmin = false;
    this.users = [];
    this.events = [];
  }

  /**
   * Inicializar panel de administración
   */
  initialize() {
    this.checkAdminAccess();
    this.setupAdminUI();
    this.loadAdminData();
  }

  /**
   * Verificar si el usuario actual es administrador
   */
  checkAdminAccess() {
    if (firebaseManager.currentUser?.email === this.adminEmail) {
      this.isAdmin = true;
      console.log('✅ Acceso de administrador confirmado');
    }
  }

  /**
   * Crear UI del panel de administración
   */
  setupAdminUI() {
    if (!this.isAdmin) return;

    const adminContainer = document.getElementById('adminPanel');
    if (!adminContainer) {
      const newContainer = document.createElement('div');
      newContainer.id = 'adminPanel';
      newContainer.className = 'card';
      document.querySelector('main').insertBefore(newContainer, document.querySelector('footer'));
    }

    this.updateAdminUI();
  }

  /**
   * Actualizar UI del panel de administración
   */
  updateAdminUI() {
    const adminContainer = document.getElementById('adminPanel');
    if (!adminContainer) return;

    adminContainer.innerHTML = `
      <div class="admin-panel">
        <h2>👨‍💼 Panel de Administración</h2>
        <p>Bienvenido, Luis Antonio. Aquí puedes ver estadísticas y eventos de la aplicación.</p>
        
        <div class="admin-tabs">
          <button class="admin-tab-btn active" data-tab="stats">📊 Estadísticas</button>
          <button class="admin-tab-btn" data-tab="users">👥 Usuarios</button>
          <button class="admin-tab-btn" data-tab="events">📋 Eventos</button>
          <button class="admin-tab-btn" data-tab="backup">💾 Backup</button>
        </div>

        <div id="stats-tab" class="admin-tab-content active">
          <h3>Estadísticas Generales</h3>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value" id="totalUsers">0</div>
              <div class="stat-label">Usuarios Registrados</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" id="totalEvents">0</div>
              <div class="stat-label">Eventos Registrados</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" id="lastSync">--</div>
              <div class="stat-label">Última Sincronización</div>
            </div>
          </div>
        </div>

        <div id="users-tab" class="admin-tab-content">
          <h3>Usuarios Activos</h3>
          <div id="usersList" class="users-list"></div>
        </div>

        <div id="events-tab" class="admin-tab-content">
          <h3>Historial de Eventos</h3>
          <div id="eventsList" class="events-list"></div>
        </div>

        <div id="backup-tab" class="admin-tab-content">
          <h3>Gestión de Backups</h3>
          <button id="backupBtn" class="btn-primary">📥 Crear Backup Ahora</button>
          <div id="backupStatus"></div>
        </div>
      </div>
    `;

    // Event listeners para tabs
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });

    // Event listener para backup
    document.getElementById('backupBtn')?.addEventListener('click', () => this.createBackup());

    this.refreshStats();
  }

  /**
   * Cambiar tab activo
   */
  switchTab(tabName) {
    // Ocultar todos los tabs
    document.querySelectorAll('.admin-tab-content').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    // Mostrar tab seleccionado
    document.getElementById(`${tabName}-tab`)?.classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

    // Cargar datos según el tab
    if (tabName === 'users') this.loadUsers();
    if (tabName === 'events') this.loadEvents();
  }

  /**
   * Actualizar estadísticas
   */
  async refreshStats() {
    try {
      const usersSnapshot = await db.collection('users').get();
      const eventsSnapshot = await db.collection('events').get();

      document.getElementById('totalUsers').textContent = usersSnapshot.size;
      document.getElementById('totalEvents').textContent = eventsSnapshot.size;
      document.getElementById('lastSync').textContent = new Date().toLocaleTimeString();

      this.users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      this.events = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  }

  /**
   * Cargar y mostrar usuarios
   */
  async loadUsers() {
    const usersList = document.getElementById('usersList');
    if (!usersList) return;

    if (this.users.length === 0) {
      usersList.innerHTML = '<p>No hay usuarios registrados.</p>';
      return;
    }

    let html = '<table class="admin-table"><thead><tr><th>Email</th><th>Fecha Registro</th><th>Última Sincronización</th></tr></thead><tbody>';
    
    this.users.forEach(user => {
      const createdAt = new Date(user.createdAt).toLocaleDateString('es-ES');
      const lastSync = user.lastSync ? new Date(user.lastSync).toLocaleString('es-ES') : 'Nunca';
      html += `<tr><td>${user.email}</td><td>${createdAt}</td><td>${lastSync}</td></tr>`;
    });

    html += '</tbody></table>';
    usersList.innerHTML = html;
  }

  /**
   * Cargar y mostrar eventos
   */
  async loadEvents() {
    const eventsList = document.getElementById('eventsList');
    if (!eventsList) return;

    if (this.events.length === 0) {
      eventsList.innerHTML = '<p>No hay eventos registrados.</p>';
      return;
    }

    let html = '<table class="admin-table"><thead><tr><th>Evento</th><th>Usuario</th><th>Fecha</th><th>Detalles</th></tr></thead><tbody>';
    
    this.events.slice(-20).reverse().forEach(event => {
      const date = new Date(event.timestamp).toLocaleString('es-ES');
      const details = JSON.stringify(event.data).substring(0, 50) + '...';
      html += `<tr><td>${event.event}</td><td>${event.userEmail}</td><td>${date}</td><td>${details}</td></tr>`;
    });

    html += '</tbody></table>';
    eventsList.innerHTML = html;
  }

  /**
   * Crear backup
   */
  async createBackup() {
    const backupStatus = document.getElementById('backupStatus');
    if (!backupStatus) return;

    backupStatus.innerHTML = '⏳ Creando backup...';

    try {
      const backupData = {
        timestamp: new Date().toISOString(),
        users: this.users,
        events: this.events,
        accounts: JSON.parse(localStorage.getItem('accounts') || '[]'),
        transactions: JSON.parse(localStorage.getItem('transactions') || '[]')
      };

      // Guardar en Firestore
      await db.collection('backups').add({
        data: backupData,
        createdAt: new Date().toISOString(),
        createdBy: firebaseManager.currentUser.email
      });

      // Descargar como JSON
      const dataStr = JSON.stringify(backupData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup-contabilidad-${new Date().toISOString().split('T')[0]}.json`;
      link.click();

      backupStatus.innerHTML = '✅ Backup creado y descargado exitosamente';
      firebaseManager.logEvent('backup_created', { size: dataStr.length });
    } catch (error) {
      console.error('Error creando backup:', error);
      backupStatus.innerHTML = `❌ Error: ${error.message}`;
    }
  }
}

// Instancia global
const adminPanel = new AdminPanel();

// Inicializar cuando Firebase esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => adminPanel.initialize(), 1000);
  });
} else {
  setTimeout(() => adminPanel.initialize(), 1000);
}
