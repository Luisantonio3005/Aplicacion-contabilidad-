# Estructura del Proyecto - Contabilidad con Cuentas T

## 📁 Organización de Archivos

```
Aplicacion-contabilidad-/
│
├── index.html              ← PUNTO DE ENTRADA (en la raíz)
│                             • Detectado automáticamente por GitHub Pages
│                             • Contiene estructura HTML semántica
│                             • Referencia archivos externos con rutas relativas
│
├── css/
│   └── styles.css          ← ESTILOS COMPLETOS
│                             • Variables CSS para tema claro/oscuro
│                             • Todos los estilos de componentes
│                             • Media queries para responsividad
│                             • Transiciones suaves
│
├── js/
│   └── app.js              ← LÓGICA DE LA APLICACIÓN
│                             • Gestión de estado
│                             • Funciones de utilidad
│                             • Event listeners
│                             • Persistencia en localStorage
│
├── README.md               ← DOCUMENTACIÓN
│                             • Guía de uso
│                             • Características
│                             • Instrucciones de instalación
│
└── .gitignore              ← CONFIGURACIÓN GIT
                             • Archivos a ignorar
```

## 🔗 Rutas Relativas

### Desde `index.html` (raíz)

```html
<!-- CSS -->
<link rel="stylesheet" href="css/styles.css" />

<!-- JavaScript -->
<script src="js/app.js"></script>
```

### Estructura de Rutas

```
index.html (raíz)
    ├── css/styles.css      (ruta relativa: ./css/styles.css)
    └── js/app.js           (ruta relativa: ./js/app.js)
```

## 📊 Flujo de Carga

```
1. GitHub Pages detecta index.html en la raíz
   ↓
2. Navegador carga index.html
   ↓
3. index.html carga css/styles.css (ruta relativa)
   ↓
4. index.html carga js/app.js (ruta relativa)
   ↓
5. app.js se ejecuta e inicializa la aplicación
   ↓
6. Aplicación completamente funcional
```

## ✅ Verificación de Rutas

Para verificar que las rutas sean correctas:

```bash
# Desde la raíz del proyecto
ls -la index.html      # Debe existir
ls -la css/styles.css  # Debe existir
ls -la js/app.js       # Debe existir

# Verificar referencias en index.html
grep -E "href=|src=" index.html
# Debe mostrar:
# <link rel="stylesheet" href="css/styles.css" />
# <script src="js/app.js"></script>
```

## 🚀 Despliegue en GitHub Pages

GitHub Pages automáticamente:

1. ✅ Detecta `index.html` en la raíz
2. ✅ Sirve archivos estáticos
3. ✅ Resuelve rutas relativas correctamente
4. ✅ Carga CSS desde `css/styles.css`
5. ✅ Carga JS desde `js/app.js`

**URL de despliegue:** https://luisantonio3005.github.io/Aplicacion-contabilidad-/

## 📝 Notas Importantes

- ✅ `index.html` está en la **raíz** del repositorio
- ✅ Todas las rutas son **relativas** (no absolutas)
- ✅ No hay rutas hardcodeadas con nombres de usuario
- ✅ Los archivos están organizados en **carpetas lógicas**
- ✅ Funciona en **cualquier subdirectorio** de GitHub Pages

## 🔄 Estructura Escalable

Esta estructura permite fácil expansión:

```
Aplicacion-contabilidad-/
├── index.html
├── css/
│   ├── styles.css
│   ├── variables.css      (futuro)
│   └── responsive.css     (futuro)
├── js/
│   ├── app.js
│   ├── utils.js           (futuro)
│   └── api.js             (futuro)
├── assets/                (futuro)
│   ├── images/
│   ├── icons/
│   └── fonts/
└── README.md
```

---

**Versión:** 1.0.0  
**Última actualización:** Abril 2026
