/**
 * Security Module
 * Validaciones y protección de seguridad
 * Autor: Luis Antonio Canales Guerrero
 */

class SecurityModule {
  constructor() {
    this.validationRules = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      accountName: /^[a-zA-Z0-9\s\-_áéíóúñ]{1,50}$/,
      description: /^[a-zA-Z0-9\s\-_.,áéíóúñ]{1,200}$/,
      amount: /^\d+(\.\d{1,2})?$/,
      url: /^https?:\/\/.+/
    };

    this.maxLengths = {
      accountName: 50,
      description: 200,
      contactMessage: 1000,
      email: 100
    };

    this.rateLimit = {
      maxRequests: 10,
      timeWindow: 60000 // 1 minuto
    };

    this.requestLog = [];
  }

  /**
   * Validar email
   */
  validateEmail(email) {
    if (!email || email.length > this.maxLengths.email) {
      return { valid: false, error: 'Email inválido o muy largo' };
    }

    if (!this.validationRules.email.test(email)) {
      return { valid: false, error: 'Formato de email inválido' };
    }

    return { valid: true };
  }

  /**
   * Validar nombre de cuenta
   */
  validateAccountName(name) {
    if (!name || name.trim().length === 0) {
      return { valid: false, error: 'El nombre de la cuenta es requerido' };
    }

    if (name.length > this.maxLengths.accountName) {
      return { valid: false, error: `El nombre no debe exceder ${this.maxLengths.accountName} caracteres` };
    }

    if (!this.validationRules.accountName.test(name)) {
      return { valid: false, error: 'El nombre contiene caracteres no permitidos' };
    }

    return { valid: true };
  }

  /**
   * Validar descripción
   */
  validateDescription(description) {
    if (!description || description.trim().length === 0) {
      return { valid: false, error: 'La descripción es requerida' };
    }

    if (description.length > this.maxLengths.description) {
      return { valid: false, error: `La descripción no debe exceder ${this.maxLengths.description} caracteres` };
    }

    if (!this.validationRules.description.test(description)) {
      return { valid: false, error: 'La descripción contiene caracteres no permitidos' };
    }

    return { valid: true };
  }

  /**
   * Validar monto
   */
  validateAmount(amount) {
    if (amount === null || amount === undefined || amount === '') {
      return { valid: false, error: 'El monto es requerido' };
    }

    const numAmount = Number(amount);

    if (isNaN(numAmount)) {
      return { valid: false, error: 'El monto debe ser un número' };
    }

    if (numAmount <= 0) {
      return { valid: false, error: 'El monto debe ser mayor a 0' };
    }

    if (numAmount > 999999999.99) {
      return { valid: false, error: 'El monto es demasiado grande' };
    }

    if (!this.validationRules.amount.test(amount)) {
      return { valid: false, error: 'Formato de monto inválido' };
    }

    return { valid: true };
  }

  /**
   * Validar fecha
   */
  validateDate(date) {
    if (!date) {
      return { valid: false, error: 'La fecha es requerida' };
    }

    const dateObj = new Date(date);

    if (isNaN(dateObj.getTime())) {
      return { valid: false, error: 'Formato de fecha inválido' };
    }

    // No permitir fechas futuras
    if (dateObj > new Date()) {
      return { valid: false, error: 'No se permiten fechas futuras' };
    }

    return { valid: true };
  }

  /**
   * Validar mensaje de contacto
   */
  validateContactMessage(message) {
    if (!message || message.trim().length === 0) {
      return { valid: false, error: 'El mensaje es requerido' };
    }

    if (message.length < 10) {
      return { valid: false, error: 'El mensaje debe tener al menos 10 caracteres' };
    }

    if (message.length > this.maxLengths.contactMessage) {
      return { valid: false, error: `El mensaje no debe exceder ${this.maxLengths.contactMessage} caracteres` };
    }

    return { valid: true };
  }

  /**
   * Sanitizar entrada de usuario
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') {
      return input;
    }

    // Remover caracteres peligrosos
    let sanitized = input
      .replace(/[<>]/g, '') // Remover < y >
      .replace(/javascript:/gi, '') // Remover javascript:
      .replace(/on\w+=/gi, ''); // Remover event handlers

    return sanitized.trim();
  }

  /**
   * Escapar HTML
   */
  escapeHTML(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };

    return text.replace(/[&<>"']/g, (char) => map[char]);
  }

  /**
   * Verificar rate limit
   */
  checkRateLimit(identifier = 'global') {
    const now = Date.now();

    // Limpiar requests antiguos
    this.requestLog = this.requestLog.filter(
      (req) => now - req.timestamp < this.rateLimit.timeWindow
    );

    // Contar requests del identificador
    const recentRequests = this.requestLog.filter(
      (req) => req.identifier === identifier
    ).length;

    if (recentRequests >= this.rateLimit.maxRequests) {
      return {
        allowed: false,
        error: 'Demasiadas solicitudes. Por favor, intenta más tarde.'
      };
    }

    // Registrar nuevo request
    this.requestLog.push({
      identifier,
      timestamp: now
    });

    return { allowed: true };
  }

  /**
   * Encriptar datos (básico)
   */
  encryptData(data, key = 'default') {
    try {
      const json = JSON.stringify(data);
      return btoa(json); // Base64 encoding (no es encriptación real)
    } catch (error) {
      console.error('Error encriptando datos:', error);
      return null;
    }
  }

  /**
   * Desencriptar datos (básico)
   */
  decryptData(encryptedData, key = 'default') {
    try {
      const json = atob(encryptedData); // Base64 decoding
      return JSON.parse(json);
    } catch (error) {
      console.error('Error desencriptando datos:', error);
      return null;
    }
  }

  /**
   * Generar hash simple
   */
  generateHash(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Validar integridad de datos
   */
  validateDataIntegrity(data, hash) {
    const computedHash = this.generateHash(JSON.stringify(data));
    return computedHash === hash;
  }

  /**
   * Registrar evento de seguridad
   */
  logSecurityEvent(event, severity = 'info') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      severity,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    const securityLog = JSON.parse(localStorage.getItem('securityLog') || '[]');
    securityLog.push(logEntry);

    // Mantener solo los últimos 100 eventos
    if (securityLog.length > 100) {
      securityLog.shift();
    }

    localStorage.setItem('securityLog', JSON.stringify(securityLog));

    console.log(`[${severity.toUpperCase()}] ${event}`);
  }

  /**
   * Detectar comportamiento sospechoso
   */
  detectSuspiciousBehavior() {
    const events = {
      rapidClicks: 0,
      failedValidations: 0,
      unusualPatterns: false
    };

    // Implementar lógica de detección
    return events;
  }

  /**
   * Obtener reporte de seguridad
   */
  getSecurityReport() {
    const securityLog = JSON.parse(localStorage.getItem('securityLog') || '[]');

    return {
      totalEvents: securityLog.length,
      criticalEvents: securityLog.filter(e => e.severity === 'critical').length,
      warningEvents: securityLog.filter(e => e.severity === 'warning').length,
      infoEvents: securityLog.filter(e => e.severity === 'info').length,
      lastEvent: securityLog[securityLog.length - 1] || null,
      events: securityLog.slice(-10) // Últimos 10 eventos
    };
  }

  /**
   * Validar todas las entradas de un formulario
   */
  validateForm(formData, rules) {
    const errors = {};

    for (const [field, value] of Object.entries(formData)) {
      if (rules[field]) {
        const validation = rules[field](value);
        if (!validation.valid) {
          errors[field] = validation.error;
        }
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
}

// Instancia global
const securityModule = new SecurityModule();

// Registrar evento de carga
securityModule.logSecurityEvent('Aplicación cargada', 'info');
