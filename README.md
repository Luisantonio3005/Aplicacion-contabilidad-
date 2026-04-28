# Aplicación de Contabilidad con Cuentas T

Una aplicación web moderna para gestionar contabilidad con el método de Cuentas T. Permite registrar cuentas, transacciones de débito y crédito, y visualizar estados financieros en tiempo real.

## Características

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

## Tecnologías

- **Frontend**: React 19 + TypeScript
- **Estilos**: Tailwind CSS 4
- **Componentes**: shadcn/ui
- **Enrutamiento**: Wouter
- **Build**: Vite

## Instalación

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

## Estructura del Proyecto

```
client/
├── public/          # Archivos estáticos
├── src/
│   ├── pages/       # Componentes de página
│   ├── components/  # Componentes reutilizables
│   ├── contexts/    # Contextos de React
│   ├── hooks/       # Hooks personalizados
│   ├── lib/         # Utilidades
│   ├── App.tsx      # Componente raíz
│   ├── main.tsx     # Punto de entrada
│   └── index.css    # Estilos globales
server/              # Servidor Express (placeholder)
shared/              # Código compartido
```

## Uso

1. **Agregar Cuenta**: Completa el formulario con nombre, tipo, saldo inicial y moneda
2. **Registrar Transacción**: Selecciona una cuenta, tipo de movimiento y monto
3. **Ver Estados**: Los estados financieros se actualizan automáticamente
4. **Cambiar Tema**: Usa el botón de tema en la esquina superior derecha

## Correcciones Implementadas

- ✅ Fondo de pantalla cambia correctamente en modo oscuro
- ✅ Títulos h2 se visualizan en blanco en modo oscuro
- ✅ Transiciones suaves entre temas
- ✅ Interfaz responsiva y accesible

## Licencia

MIT

## Autor

Desarrollado con Manus
