/**
 * Admin Alerts Module
 * Sistema de alertas automáticas para Luis Antonio Canales Guerrero
 * Notificaciones de fallos, sincronizaciones y eventos importantes
 * Email: luisantoniocg3005@outlook.com
 */

class AdminAlerts {
  constructor() {
    this.adminEmail = 'luisantoniocg3005@outlook.com';
    this.alertThresholds = {
      errorCount: 5,
      timeWindow: 3600000 // 1 hora
    };
    this.alertLog = [];
    this.errorLog = [];
  }

  /**
   * Inicializar sistema de alertas
   */
  initialize() {
    console.log('Inicializando sistema de alertas del administrador...');
    this.loadAlertLog();
    this.setupErrorTracking();
    this.setupPerformanceMonitoring();
    this.checkAlertThresholds();
  }

  /**
   * Registrar error
   */
  logError(error, context = {}) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      message: error.message || String(error),
      stack: error.stack || '',
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      severity: this.calculateSeverity(error)
    };

    this.errorLog.push(errorEntry);
    this.alertLog.push(errorEntry);

    // Mantener solo los últimos 100 errores
    if (this.errorLog.length > 100) {
      this.errorLog.shift();
    }

    localStorage.setItem('errorLog', JSON.stringify(this.errorLog));
    localStorage.setItem('alertLog', JSON.stringify(this.alertLog));

    console.error(`[ERROR LOGGED] ${error.message}`);

    // Verificar si se debe enviar alerta
    this.checkAndSendAlert();
  }

  /**
   * Registrar evento importante
   */
  logEvent(eventName, data = {}) {
    const event = {
      timestamp: new Date().toISOString(),
      event: eventName,
      data,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.alertLog.push(event);

    // Mantener solo los últimos 200 eventos
    if (this.alertLog.length > 200) {
      this.alertLog.shift();
    }

    localStorage.setItem('alertLog', JSON.stringify(this.alertLog));

    console.log(`[EVENT] ${eventName}`, data);
  }

  /**
   * Calcular severidad del error
   */
  calculateSeverity(error) {
    const message = error.message || String(error);

    if (message.includes('critical') || message.includes('fatal')) {
      return 'critical';
    } else if (message.includes('error') || message.includes('failed')) {
      return 'error';
    } else if (message.includes('warning')) {
      return 'warning';
    }

    return 'info';
  }

  /**
   * Verificar umbrales de alerta
   */
  checkAlertThresholds() {
    const now = Date.now();
    const recentErrors = this.errorLog.filter(
      (error) => now - new Date(error.timestamp).getTime() < this.alertThresholds.timeWindow
    );

    if (recentErrors.length >= this.alertThresholds.errorCount) {
      this.sendCriticalAlert(
        `⚠️ ALERTA CRÍTICA: ${recentErrors.length} errores en la última hora`,
        recentErrors
      );
    }
  }

  /**
   * Enviar alerta crítica
   */
  sendCriticalAlert(title, details = []) {
    const alert = {
      timestamp: new Date().toISOString(),
      type: 'critical',
      title,
      details,
      recipient: this.adminEmail
    };

    this.alertLog.push(alert);
    localStorage.setItem('alertLog', JSON.stringify(this.alertLog));

    console.error(`[CRITICAL ALERT] ${title}`);
    console.error('Detalles:', details);

    // En producción, enviar email real
    this.sendEmailAlert(title, details);
  }

  /**
   * Enviar alerta por email
   */
  async sendEmailAlert(subject, details) {
    try {
      // En producción, esto se haría desde un backend
      const emailPayload = {
        to: this.adminEmail,
        subject: `[ALERTA] ${subject}`,
        body: this.formatEmailBody(subject, details),
        timestamp: new Date().toISOString()
      };

      // Guardar localmente
      const emailAlerts = JSON.parse(localStorage.getItem('emailAlerts') || '[]');
      emailAlerts.push(emailPayload);
      localStorage.setItem('emailAlerts', JSON.stringify(emailAlerts));

      console.log(`Alerta enviada a ${this.adminEmail}`);

      // En producción:
      // await fetch('/api/send-admin-alert', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(emailPayload)
      // });
    } catch (error) {
      console.error('Error enviando alerta por email:', error);
    }
  }

  /**
   * Formatear cuerpo del email
   */
  formatEmailBody(subject, details) {
    let body = `<h2>${subject}</h2>\n`;
    body += `<p>Timestamp: ${new Date().toISOString()}</p>\n`;
    body += `<p>URL: ${window.location.href}</p>\n`;

    if (Array.isArray(details) && details.length > 0) {
      body += '<h3>Detalles:</h3>\n<ul>\n';
      details.forEach((detail) => {
        body += `<li>${detail.message || JSON.stringify(detail)}</li>\n`;
      });
      body += '</ul>\n';
    }

    return body;
  }

  /**
   * Configurar seguimiento de errores
   */
  setupErrorTracking() {
    // Capturar errores globales
    window.addEventListener('error', (event) => {
      this.logError(event.error || new Error(event.message), {
        type: 'uncaught_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Capturar promesas rechazadas
    window.addEventListener('unhandledrejection', (event) => {
      this.logError(event.reason || new Error('Unhandled Promise Rejection'), {
        type: 'unhandled_rejection'
      });
    });
  }

  /**
   * Configurar monitoreo de rendimiento
   */
  setupPerformanceMonitoring() {
    // Monitorear tiempo de carga
    if (window.performance && window.performance.timing) {
      window.addEventListener('load', () => {
        const timing = window.performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;

        if (loadTime > 5000) {
          this.logEvent('slow_page_load', {
            loadTime: `${loadTime}ms`,
            threshold: '5000ms'
          });
        }
      });
    }

    // Monitorear memoria (si está disponible)
    if (performance.memory) {
      setInterval(() => {
        const memoryUsage = performance.memory.usedJSHeapSize / 1048576; // MB

        if (memoryUsage > 100) {
          this.logEvent('high_memory_usage', {
            usage: `${memoryUsage.toFixed(2)}MB`,
            threshold: '100MB'
          });
        }
      }, 30000); // Cada 30 segundos
    }
  }

  /**
   * Verificar y enviar alerta
   */
  checkAndSendAlert() {
    this.checkAlertThresholds();
  }

  /**
   * Cargar historial de alertas
   */
  loadAlertLog() {
    const savedLog = localStorage.getItem('alertLog');
    if (savedLog) {
      try {
        this.alertLog = JSON.parse(savedLog);
      } catch (error) {
        console.error('Error cargando historial de alertas:', error);
      }
    }

    const savedErrors = localStorage.getItem('errorLog');
    if (savedErrors) {
      try {
        this.errorLog = JSON.parse(savedErrors);
      } catch (error) {
        console.error('Error cargando historial de errores:', error);
      }
    }
  }

  /**
   * Obtener reporte de alertas
   */
  getAlertReport() {
    const now = Date.now();
    const lastHour = this.errorLog.filter(
      (error) => now - new Date(error.timestamp).getTime() < 3600000
    );
    const lastDay = this.errorLog.filter(
      (error) => now - new Date(error.timestamp).getTime() < 86400000
    );

    return {
      totalErrors: this.errorLog.length,
      errorsLastHour: lastHour.length,
      errorsLastDay: lastDay.length,
      criticalErrors: this.errorLog.filter((e) => e.severity === 'critical').length,
      errorErrors: this.errorLog.filter((e) => e.severity === 'error').length,
      warningErrors: this.errorLog.filter((e) => e.severity === 'warning').length,
      recentErrors: this.errorLog.slice(-5),
      adminEmail: this.adminEmail
    };
  }

  /**
   * Enviar reporte diario
   */
  async sendDailyReport() {
    const report = this.getAlertReport();

    const emailPayload = {
      to: this.adminEmail,
      subject: '[REPORTE DIARIO] Aplicación de Contabilidad',
      body: this.formatReportEmail(report),
      timestamp: new Date().toISOString()
    };

    try {
      const emailAlerts = JSON.parse(localStorage.getItem('emailAlerts') || '[]');
      emailAlerts.push(emailPayload);
      localStorage.setItem('emailAlerts', JSON.stringify(emailAlerts));

      console.log('Reporte diario preparado para envío');
    } catch (error) {
      console.error('Error preparando reporte diario:', error);
    }
  }

  /**
   * Formatear email de reporte
   */
  formatReportEmail(report) {
    return `
      <h2>📊 Reporte Diario - Aplicación de Contabilidad</h2>
      <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
      
      <h3>📈 Estadísticas</h3>
      <ul>
        <li><strong>Total de errores:</strong> ${report.totalErrors}</li>
        <li><strong>Errores última hora:</strong> ${report.errorsLastHour}</li>
        <li><strong>Errores último día:</strong> ${report.errorsLastDay}</li>
        <li><strong>Errores críticos:</strong> ${report.criticalErrors}</li>
        <li><strong>Errores normales:</strong> ${report.errorErrors}</li>
        <li><strong>Advertencias:</strong> ${report.warningErrors}</li>
      </ul>
      
      <h3>⚠️ Últimos 5 Errores</h3>\n      <ol>\n        ${report.recentErrors.map((e) => `<li>${e.message} (${e.timestamp})</li>`).join('\n')}\n      </ol>\n      \n      <p><strong>Administrador:</strong> ${report.adminEmail}</p>\n      <p><em>Este es un reporte automático. Por favor, no responder.</em></p>\n    `;
  }

  /**
   * Limpiar logs antiguos
   */
  cleanOldLogs(daysToKeep = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    this.errorLog = this.errorLog.filter(
      (error) => new Date(error.timestamp) > cutoffDate
    );

    this.alertLog = this.alertLog.filter(
      (alert) => new Date(alert.timestamp) > cutoffDate
    );

    localStorage.setItem('errorLog', JSON.stringify(this.errorLog));
    localStorage.setItem('alertLog', JSON.stringify(this.alertLog));

    console.log(`Logs limpiados. Manteniendo últimos ${daysToKeep} días.`);
  }
}

// Instancia global
const adminAlerts = new AdminAlerts();

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    adminAlerts.initialize();
  });
} else {
  adminAlerts.initialize();
}

// Enviar reporte diario a las 8 AM
const now = new Date();
const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(8, 0, 0, 0);

const timeUntilReport = tomorrow.getTime() - now.getTime();

setTimeout(() => {
  adminAlerts.sendDailyReport();
  // Repetir cada 24 horas
  setInterval(() => {
    adminAlerts.sendDailyReport();
  }, 24 * 60 * 60 * 1000);
}, timeUntilReport);
