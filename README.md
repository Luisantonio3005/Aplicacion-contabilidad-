# Aplicación de Contabilidad con Cuentas T

Una aplicación web moderna, responsiva y completamente funcional para gestionar contabilidad usando el método de Cuentas T. Registra cuentas, transacciones de débito y crédito, y visualiza estados financieros en tiempo real.

## 🚀 Acceso Rápido

**URL de la aplicación:** https://luisantonio3005.github.io/Aplicacion-contabilidad-/

La aplicación está completamente funcional y lista para usar. No requiere instalación.

## ✨ Características Principales

### 📊 Gestión de Cuentas
- Crear cuentas de diferentes tipos: **Activos**, **Pasivos**, **Patrimonio**, **Ingresos**, **Gastos**
- Saldo inicial configurable para cada cuenta
- Soporte para múltiples monedas: **MXN**, **USD**, **EUR**
- Clasificación de gastos: **Fijo**, **Variable**, **Pasivo**
- Visualización clara de todas las cuentas registradas

### 💰 Registro de Transacciones
- Registrar entradas (débitos) y salidas (créditos)
- Fecha automática (hoy por defecto)
- Descripción detallada de cada movimiento
- Monto flexible con validación
- Eliminación de transacciones registradas
- Actualización automática de saldos

### 📈 Estados Financieros
- **Estado de Resultados**: Ingresos, Gastos, Utilidad/Pérdida
- **Balance General**: Activos, Pasivos, Patrimonio
- **Resumen de Cuentas T**: Saldos actualizados en tiempo real
- Totales de débitos y créditos

### 🎨 Tema Oscuro/Claro
- Cambio de tema con un clic (botón 🌙/☀️)
- Persistencia del tema en el navegador
- Transiciones suaves entre temas
- Colores optimizados para máxima legibilidad
- Interfaz completamente adaptada en ambos modos

### 📱 Diseño Responsivo
- Funciona perfectamente en desktop, tablet y móvil
- Interfaz adaptativa que se ajusta a cualquier pantalla
- Tablas con scroll horizontal en dispositivos pequeños

## 🛠️ Tecnologías Utilizadas

- **HTML5**: Estructura semántica
- **CSS3**: Estilos avanzados con variables personalizadas
- **JavaScript Vanilla**: Lógica sin dependencias externas
- **LocalStorage**: Persistencia de datos en el navegador
- **GitHub Pages**: Despliegue automático

## 📖 Cómo Usar

### 1. Agregar una Cuenta
1. Completa el formulario "Agregar cuenta" con:
   - **Nombre**: Identificador de la cuenta (ej: Caja, Ventas)
   - **Tipo**: Selecciona entre Activo, Pasivo, Patrimonio, Ingreso, Gasto
   - **Saldo inicial**: Monto inicial (opcional)
   - **Clasificación**: Fijo, Variable o Pasivo
   - **Moneda**: MXN, USD o EUR
2. Haz clic en "Agregar cuenta"

### 2. Registrar una Transacción
1. Completa el formulario "Registrar transacción" con:
   - **Fecha**: Se rellena automáticamente con hoy
   - **Descripción**: Detalle del movimiento
   - **Cuenta**: Selecciona una cuenta existente
   - **Movimiento**: Entrada (Débito) o Salida (Crédito)
   - **Monto**: Cantidad del movimiento
2. Haz clic en "Registrar transacción"

### 3. Ver Estados Financieros
Los estados se actualizan automáticamente:
- **Resumen de Cuentas T**: Muestra todas las cuentas y sus saldos
- **Estado de Resultados**: Ingresos menos gastos
- **Balance General**: Verificación de la ecuación contable

### 4. Cambiar Tema
Haz clic en el botón 🌙 (modo claro) o ☀️ (modo oscuro) en la esquina superior derecha.

## 💾 Persistencia de Datos

La aplicación guarda automáticamente:
- Todas las cuentas registradas
- Todas las transacciones
- Tu preferencia de tema (claro/oscuro)

Los datos se guardan en el navegador y se recuperan automáticamente al recargar la página.

## 🎨 Sistema de Temas

### Modo Claro
- Fondo blanco (#ffffff)
- Textos oscuros (#1f2937)
- Botones azules (#2563eb)
- Perfecto para ambientes bien iluminados

### Modo Oscuro
- Fondo azul muy oscuro (#0f172a)
- Textos claros (#f1f5f9)
- Botones azul claro (#3b82f6)
- Ideal para trabajo nocturno

## 📊 Estructura de Datos

### Cuentas
```javascript
{
  id: "unique-id",
  name: "Nombre de la cuenta",
  type: "Activo|Pasivo|Patrimonio|Ingreso|Gasto",
  costType: "Fijo|Variable|Pasivo",
  initialBalance: 1000,
  currency: "MXN|USD|EUR",
  debits: [{ amount: 500 }],
  credits: [{ amount: 200 }]
}
```

### Transacciones
```javascript
{
  id: "unique-id",
  date: "2024-04-28",
  description: "Venta de productos",
  accountId: "account-id",
  accountName: "Ventas",
  movement: "Entrada|Salida",
  amount: 1500
}
```

## 🔧 Instalación Local (Opcional)

Si deseas ejecutar la aplicación localmente:

```bash
# Clonar el repositorio
git clone https://github.com/Luisantonio3005/Aplicacion-contabilidad-.git

# Navegar al directorio
cd Aplicacion-contabilidad-

# Abrir en el navegador
# Simplemente abre el archivo index.html en tu navegador
```

## 📝 Validaciones Implementadas

- ✅ Nombre de cuenta requerido y no vacío
- ✅ Tipo de cuenta obligatorio
- ✅ Cuenta válida para transacciones
- ✅ Monto debe ser mayor a 0
- ✅ Fecha requerida
- ✅ Descripción requerida
- ✅ Validación de formatos de entrada

## 🎯 Características Destacadas

| Característica | Estado |
|---|---|
| Gestión de cuentas | ✅ Completo |
| Registro de transacciones | ✅ Completo |
| Estados financieros | ✅ Completo |
| Modo oscuro/claro | ✅ Completo |
| Persistencia de datos | ✅ Completo |
| Diseño responsivo | ✅ Completo |
| Validaciones | ✅ Completo |
| Sin dependencias externas | ✅ Completo |

## 🚀 Despliegue

La aplicación se despliega automáticamente en GitHub Pages desde el archivo `index.html` en la rama `master`.

**No requiere configuración adicional.**

## 📄 Licencia

MIT

## 👨‍💻 Autor

Desarrollado con Manus

---

## 📞 Soporte

Para reportar problemas o sugerencias, crea un issue en el repositorio de GitHub.

**Versión actual:** 1.0.0  
**Última actualización:** Abril 2026
