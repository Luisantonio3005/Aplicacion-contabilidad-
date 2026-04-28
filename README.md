# Aplicación de Contabilidad con Cuentas T

Una aplicación web moderna para gestionar contabilidad con el método de Cuentas T. Permite registrar cuentas, transacciones de débito y crédito, y visualizar estados financieros en tiempo real.

## 🚀 Despliegue en GitHub Pages

**La aplicación se despliega automáticamente en:** https://luisantonio3005.github.io/Aplicacion-contabilidad-/

El despliegue se realiza automáticamente cuando haces push a la rama `master` gracias al workflow de GitHub Actions.

## ✨ Características

✅ **Gestión de Cuentas**
- Crear cuentas de diferentes tipos: Activos, Pasivos, Patrimonio, Ingresos, Gastos
- Saldo inicial configurable
- Soporte para múltiples monedas (MXN, USD, EUR)
- Clasificación de gastos (Fijos, Variables)

✅ **Registro de Transacciones**
- Registrar entradas (débitos) y salidas (créditos)
- Fecha, descripción y monto para cada transacción
- Eliminar transacciones registradas
- Actualización automática de saldos

✅ **Estados Financieros**
- Estado de Resultados (Ingresos, Gastos, Utilidad/Pérdida)
- Balance General (Activos, Pasivos, Patrimonio)
- Resumen de Cuentas T con saldos actualizados

✅ **Tema Oscuro/Claro**
- Cambio de tema con un clic
- Persistencia del tema en localStorage
- Transiciones suaves entre temas

## 🛠️ Tecnologías

- **Frontend**: React 19 + TypeScript
- **Estilos**: CSS3 con variables personalizadas
- **Componentes**: shadcn/ui
- **Enrutamiento**: Wouter
- **Build**: Vite
- **Despliegue**: GitHub Pages con GitHub Actions

## 📦 Instalación Local

```bash
# Instalar dependencias
pnpm install

# Ejecutar en desarrollo
pnpm dev

# Compilar para producción
pnpm build

# Vista previa de producción
pnpm preview
```

## 📁 Estructura del Proyecto

```
├── client/
│   ├── public/          # Archivos estáticos
│   ├── src/
│   │   ├── pages/       # Componentes de página
│   │   ├── components/  # Componentes reutilizables
│   │   ├── contexts/    # Contextos de React
│   │   ├── hooks/       # Hooks personalizados
│   │   ├── lib/         # Utilidades
│   │   ├── App.tsx      # Componente raíz
│   │   ├── main.tsx     # Punto de entrada
│   │   └── index.css    # Estilos globales
│   └── index.html       # HTML principal
├── server/              # Servidor Express (placeholder)
├── shared/              # Código compartido
├── index.html           # Punto de entrada para GitHub Pages
├── .github/
│   └── workflows/
│       └── deploy.yml   # Workflow de despliegue automático
└── README.md            # Este archivo
```

## 📖 Uso

1. **Agregar Cuenta**: Completa el formulario con nombre, tipo, saldo inicial y moneda
2. **Registrar Transacción**: Selecciona una cuenta, tipo de movimiento y monto
3. **Ver Estados**: Los estados financieros se actualizan automáticamente
4. **Cambiar Tema**: Usa el botón de tema en la esquina superior derecha

## 🎨 Sistema de Temas

La aplicación incluye un sistema de temas completo con:

- **Modo Claro**: Fondo blanco, textos oscuros, colores azules y verdes
- **Modo Oscuro**: Fondo azul muy oscuro (#0f172a), textos claros, colores ajustados para contraste

Todos los elementos se adaptan automáticamente al cambio de tema con transiciones suaves.

## 📝 Correcciones Implementadas

- ✅ Fondo de pantalla cambia correctamente en modo oscuro
- ✅ Títulos h2 se visualizan en blanco en modo oscuro
- ✅ Transiciones suaves entre temas
- ✅ Interfaz responsiva y accesible
- ✅ Colores optimizados para legibilidad
- ✅ Despliegue automático en GitHub Pages

## 🚀 Despliegue Automático

El proyecto incluye un workflow de GitHub Actions que:

1. Se ejecuta automáticamente cuando haces push a `master`
2. Instala dependencias
3. Compila la aplicación
4. Despliega en GitHub Pages

**No requiere configuración adicional.**

## Licencia

MIT

## Autor

Desarrollado con Manus
