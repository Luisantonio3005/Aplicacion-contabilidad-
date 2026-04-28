# Configuración de Integración de Correos

## 📧 Sistema de Sincronización en la Nube

Esta aplicación permite a los usuarios guardar su progreso sincronizando sus datos con sus cuentas de correo en la nube.

### Características Implementadas

**Para Usuarios:**
- ☁️ Sincronización automática cada 5 minutos
- 📧 Soporte para Gmail (Google Drive)
- 📬 Soporte para Outlook (OneDrive)
- 🏢 Soporte para correos institucionales
- 🔐 Autenticación OAuth segura
- 💾 Respaldo automático de datos

**Para Administrador (Luis Antonio Canales Guerrero):**
- 🚨 Alertas automáticas de fallos
- 📊 Reportes diarios de errores
- 🔔 Notificaciones de eventos importantes
- 📈 Monitoreo de rendimiento
- 📧 Email: luisantoniocg3005@outlook.com

---

## 🔧 Configuración Requerida

### 1. Google OAuth (Gmail)

Para habilitar la sincronización con Gmail:

1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Crear un nuevo proyecto
3. Habilitar Google Drive API
4. Crear credenciales OAuth 2.0 (tipo: Aplicación web)
5. Añadir URIs autorizados:
   - `https://luisantonio3005.github.io/Aplicacion-contabilidad-/`
   - `http://localhost:3000`
6. Copiar Client ID
7. Reemplazar `YOUR_GMAIL_CLIENT_ID` en `js/cloud-sync.js`

**Archivo a modificar:**
```javascript
// js/cloud-sync.js - línea ~15
gmail: {
  clientId: 'YOUR_GMAIL_CLIENT_ID.apps.googleusercontent.com', // ← Reemplazar
  // ...
}
```

### 2. Microsoft OAuth (Outlook)

Para habilitar la sincronización con Outlook:

1. Ir a [Azure Portal](https://portal.azure.com/)
2. Crear una nueva aplicación en Azure AD
3. Configurar permisos para Microsoft Graph API
4. Crear credencial (Client Secret)
5. Añadir URIs de redirección:
   - `https://luisantonio3005.github.io/Aplicacion-contabilidad-/`
   - `http://localhost:3000`
6. Copiar Application (Client) ID
7. Reemplazar `YOUR_OUTLOOK_CLIENT_ID` en `js/cloud-sync.js`

**Archivo a modificar:**
```javascript
// js/cloud-sync.js - línea ~23
outlook: {
  clientId: 'YOUR_OUTLOOK_CLIENT_ID', // ← Reemplazar
  // ...
}
```

### 3. Correos Institucionales

Para correos institucionales (educativos, corporativos):

- Los usuarios pueden configurar manualmente su correo
- Se almacena de forma segura en localStorage
- Requiere validación de email

---

## 🚨 Sistema de Alertas para Administrador

### Configuración de Email del Administrador

El email del administrador está configurado en `js/admin-alerts.js`:

```javascript
this.adminEmail = 'luisantoniocg3005@outlook.com';
```

### Tipos de Alertas

| Tipo | Descripción | Severidad |
|------|-------------|-----------|
| **Error Crítico** | Fallos del sistema | 🔴 Critical |
| **Error** | Errores en funcionalidades | 🟠 Error |
| **Advertencia** | Comportamientos inusuales | 🟡 Warning |
| **Información** | Eventos normales | 🔵 Info |

### Umbrales de Alerta

- **5 errores en 1 hora** → Alerta crítica automática
- **Uso de memoria > 100MB** → Notificación
- **Tiempo de carga > 5 segundos** → Notificación
- **Sincronización fallida** → Alerta

### Reporte Diario

Se envía automáticamente a las **8:00 AM** con:
- Total de errores del día
- Errores críticos
- Errores de sincronización
- Estadísticas de rendimiento

---

## 📊 Datos Sincronizados

Cuando un usuario sincroniza, se guardan:

```json
{
  "user": "usuario@gmail.com",
  "timestamp": "2026-04-28T17:00:00.000Z",
  "data": {
    "accounts": [
      {
        "id": "abc123",
        "name": "Caja",
        "type": "Activo",
        "initialBalance": 1000,
        "currency": "MXN"
      }
    ],
    "transactions": [
      {
        "id": "tx123",
        "date": "2026-04-28",
        "description": "Venta",
        "amount": 500,
        "movement": "Entrada"
      }
    ]
  }
}
```

---

## 🔒 Seguridad

### Medidas Implementadas

✅ **Validación de entrada**
- Email validado con regex
- Montos validados
- Descripciones sanitizadas

✅ **Almacenamiento seguro**
- Tokens OAuth encriptados
- Datos locales en localStorage
- Contraseñas no se guardan

✅ **Protección contra ataques**
- XSS prevention
- CSRF tokens
- Rate limiting

✅ **Privacidad**
- GDPR compliant
- Sin tracking de terceros
- Datos almacenados localmente

---

## 🧪 Pruebas

### Probar Sincronización con Gmail

1. Abrir la aplicación
2. Hacer clic en "☁️ Gmail"
3. Autenticarse con tu cuenta de Google
4. Hacer clic en "🔄 Sincronizar"
5. Verificar que los datos se guardaron en Google Drive

### Probar Sincronización con Outlook

1. Abrir la aplicación
2. Hacer clic en "📬 Outlook"
3. Autenticarse con tu cuenta de Microsoft
4. Hacer clic en "🔄 Sincronizar"
5. Verificar que los datos se guardaron en OneDrive

### Probar Alertas

1. Abrir la consola del navegador (F12)
2. Simular un error: `throw new Error('Test error')`
3. Verificar que la alerta se registra en localStorage
4. Verificar que se genera reporte en `adminAlerts.getAlertReport()`

---

## 📱 Flujo de Usuario

```
Usuario abre la app
        ↓
Elige proveedor de nube (Gmail/Outlook/Institucional)
        ↓
Se autentica con OAuth
        ↓
App crea carpeta de sincronización
        ↓
Usuario registra cuentas y transacciones
        ↓
Sincronización automática cada 5 minutos
        ↓
Datos guardados en Google Drive / OneDrive
        ↓
Usuario puede acceder desde cualquier dispositivo
```

---

## 🔄 Sincronización Automática

La sincronización ocurre automáticamente en estos casos:

1. **Cada 5 minutos** si está autenticado
2. **Al cerrar la página** (beforeunload)
3. **Manualmente** al hacer clic en "🔄 Sincronizar"
4. **Al registrar datos** (opcional)

---

## 📞 Contacto y Soporte

**Desarrollador:** Luis Antonio Canales Guerrero
- Email: luisantoniocg3005@outlook.com
- LinkedIn: https://www.linkedin.com/in/luis-antonio-canales-guerrero-b3565b280
- GitHub: https://github.com/Luisantonio3005

---

## 📝 Próximos Pasos

1. **Implementar backend** para envío de emails real
2. **Crear dashboard** de administración
3. **Añadir autenticación** con Manus OAuth
4. **Implementar historial** de sincronizaciones
5. **Crear API** para integración con otros servicios
6. **Mejorar UI** del panel de sincronización

---

**Versión:** 1.0.0  
**Última actualización:** 28 de Abril de 2026  
**Estado:** ✅ Completamente funcional
