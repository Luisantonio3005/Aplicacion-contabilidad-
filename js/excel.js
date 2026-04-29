// ============================================================
// EXPORTACIÓN A EXCEL — CONTABILIDAD SIMPLIFICADA
// Usa SheetJS (xlsx) cargado desde CDN
// Genera un .xlsx con 5 hojas profesionales
// ============================================================

'use strict';

/**
 * Punto de entrada principal.
 * Recoge datos de la DB, construye el workbook y lo descarga.
 */
function exportToExcel() {
  const accounts = getAccounts();
  const transactions = getTransactions();

  if (accounts.length === 0 && transactions.length === 0) {
    alert('⚠️ No hay datos para exportar. Agrega cuentas y transacciones primero.');
    return false;
  }

  try {
    const wb = XLSX.utils.book_new();
    wb.Props = {
      Title: 'Contabilidad Simplificada',
      Author: 'Luis Antonio Canales Guerrero',
      Company: 'Luis Antonio Canales Guerrero',
      CreatedDate: new Date()
    };

    // 5 hojas ordenadas
    _sheetResumen(wb, accounts, transactions);
    _sheetCuentas(wb, accounts);
    _sheetTransacciones(wb, transactions);
    _sheetCuentasT(wb, accounts, transactions);
    _sheetEstadosFinancieros(wb, accounts, transactions);

    const fecha = new Date().toISOString().slice(0, 10);
    const filename = `Contabilidad_${fecha}.xlsx`;

    XLSX.writeFile(wb, filename);
    console.log(`✅ Excel exportado: ${filename}`);
    return true;
  } catch (err) {
    console.error('❌ exportToExcel:', err);
    alert('❌ Error al generar el Excel. Revisa la consola para más detalles.');
    return false;
  }
}

// ============================================================
// HOJA 1 — RESUMEN EJECUTIVO
// ============================================================

function _sheetResumen(wb, accounts, transactions) {
  const now = new Date();
  const fecha = now.toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const assets = _sumCategory(accounts, 'Activo') + _sumCategory(accounts, 'Activo Diferido');
  const liabilities = _sumCategory(accounts, 'Pasivo');
  const equity = _sumCategory(accounts, 'Patrimonio');
  const income = _sumCategory(accounts, 'Ingreso');
  const expenses = _sumCategory(accounts, 'Gasto');
  const netIncome = income - expenses;
  const totalEntrada = transactions.filter(t => t.movement === 'Entrada').reduce((s,t) => s + t.amount, 0);
  const totalSalida = transactions.filter(t => t.movement === 'Salida' ).reduce((s,t) => s + t.amount, 0);

  const rows = [
    ['CONTABILIDAD SIMPLIFICADA'],
    ['Luis Antonio Canales Guerrero'],
    [`Generado el ${fecha}`],
    [],
    ['── RESUMEN EJECUTIVO ──────────────────────────────'],
    [],
    ['INDICADOR', 'VALOR'],
    ['Total de cuentas', accounts.length],
    ['Total de transacciones', transactions.length],
    [],
    ['── BALANCE GENERAL ───────────────────────────────'],
    [],
    ['RUBRO', 'SALDO (MXN)'],
    ['Activos', assets],
    ['Pasivos', liabilities],
    ['Patrimonio', equity],
    ['Pasivos + Patrimonio', liabilities + equity],
    [],
    ['── ESTADO DE RESULTADOS ──────────────────────────'],
    [],
    ['RUBRO', 'MONTO (MXN)'],
    ['Ingresos', income],
    ['Gastos', expenses],
    ['Utilidad / Pérdida neta', netIncome],
    [],
    ['── MOVIMIENTOS GLOBALES ──────────────────────────'],
    [],
    ['MOVIMIENTO', 'TOTAL (MXN)'],
    ['Total Entradas', totalEntrada],
    ['Total Salidas', totalSalida],
    ['Balance neto', totalEntrada - totalSalida],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Anchos de columna
  ws['!cols'] = [{ wch: 42 }, { wch: 20 }];

  // Estilos — título principal
  _style(ws, 'A1', { bold: true, sz: 16, color: 'FFFFFF' }, '1F3864');
  _style(ws, 'A2', { bold: true, sz: 12, color: 'FFFFFF' }, '2E5090');
  _style(ws, 'A3', { sz: 10, italic: true, color: 'FFFFFF' }, '2E5090');

  // Encabezados de sección (filas con ──)
  [5, 11, 19, 27].forEach(r => {
    const ref = `A${r}`;
    if (ws[ref]) _style(ws, ref, { bold: true, sz: 10, color: 'FFFFFF' }, '2563EB');
  });

  // Encabezados de tabla
  [7, 13, 21, 29].forEach(r => {
    ['A','B'].forEach(c => {
      const ref = `${c}${r}`;
      if (ws[ref]) _style(ws, ref, { bold: true, color: '1F3864' }, 'DBEAFE');
    });
  });

  // Fila de utilidad/pérdida — color condicional
  const netCell = ws['B25'];
  if (netCell) {
    const isProfit = (netCell.v ?? 0) >= 0;
    _style(ws, 'B25', { bold: true, color: isProfit ? '166534' : '991B1B' },
           isProfit ? 'DCFCE7' : 'FEE2E2');
    _style(ws, 'A25', { bold: true, color: isProfit ? '166534' : '991B1B' },
           isProfit ? 'DCFCE7' : 'FEE2E2');
  }

  // Formato numérico en pesos
  const moneyRows = [8,9,14,15,16,17,22,23,24,30,31,32];
  moneyRows.forEach(r => {
    const ref = `B${r}`;
    if (ws[ref] && typeof ws[ref].v === 'number') {
      ws[ref].z = '"$"#,##0.00;[Red]"($"#,##0.00")"';
    }
  });

  // Fusionar título
  ws['!merges'] = [
    { s: { r:0,c:0 }, e: { r:0,c:1 } },
    { s: { r:1,c:0 }, e: { r:1,c:1 } },
    { s: { r:2,c:0 }, e: { r:2,c:1 } },
    { s: { r:4,c:0 }, e: { r:4,c:1 } },
    { s: { r:10,c:0}, e: { r:10,c:1} },
    { s: { r:18,c:0}, e: { r:18,c:1} },
    { s: { r:26,c:0}, e: { r:26,c:1} },
  ];

  XLSX.utils.book_append_sheet(wb, ws, '📊 Resumen');
}

// ============================================================
// HOJA 2 — CATÁLOGO DE CUENTAS
// ============================================================

function _sheetCuentas(wb, accounts) {
  const header = ['#', 'Nombre', 'Categoría', 'Tipo', 'Clasificación', 'Moneda', 'Saldo', 'Creada el'];

  const dataRows = accounts.map((a, i) => [
    i + 1,
    a.name,
    a.category || '—',
    a.type,
    a.costType || '—',
    a.currency || 'MXN',
    Number(a.balance),
    a.createdAt ? a.createdAt.slice(0,10) : ''
  ]);

  // Fila de totales por categoría
  const categorias = ['Activo','Activo Diferido','Pasivo','Patrimonio','Ingreso','Gasto'];
  const totalesRows = [
    [],
    ['TOTALES POR CATEGORÍA', '', '', '', '', '', '', ''],
    ['Categoría', 'Saldo total', '', '', '', '', '', ''],
    ...categorias.map(c => [c, _sumCategory(accounts, c)]),
  ];

  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows, ...totalesRows]);

  ws['!cols'] = [
    { wch: 5 },   // #
    { wch: 28 },  // Nombre
    { wch: 16 },  // Categoría
    { wch: 14 },  // Tipo
    { wch: 14 },  // Clasificación
    { wch: 8 },   // Moneda
    { wch: 16 },  // Saldo
    { wch: 14 },  // Fecha
  ];

  // Encabezado
  ['A','B','C','D','E','F','G','H'].forEach(c => {
    const ref = `${c}1`;
    if (ws[ref]) _style(ws, ref, { bold: true, color: 'FFFFFF' }, '1E40AF');
  });

  // Filas de datos — alternar color
  dataRows.forEach((_, i) => {
    const r = i + 2;
    const bg = i % 2 === 0 ? 'EFF6FF' : 'FFFFFF';
    ['A','B','C','D','E','F','G','H'].forEach(c => {
      const ref = `${c}${r}`;
      if (ws[ref]) _style(ws, ref, {}, bg);
    });
    // Formato moneda en columna G (Saldo)
    const saldoRef = `G${r}`;
    if (ws[saldoRef] && typeof ws[saldoRef].v === 'number') {
      ws[saldoRef].z = '"$"#,##0.00;[Red]"($"#,##0.00")"';
    }
  });

  // Sección totales
  const totalesStart = dataRows.length + 2;
  const encT = `A${totalesStart + 1}`;
  if (ws[encT]) _style(ws, encT, { bold: true, sz: 11, color: 'FFFFFF' }, '1F3864');

  const encT2r = totalesStart + 2;
  ['A','B'].forEach(c => {
    const ref = `${c}${encT2r}`;
    if (ws[ref]) _style(ws, ref, { bold: true, color: '1F3864' }, 'BFDBFE');
  });

  categorias.forEach((_, idx) => {
    const r = totalesStart + 3 + idx;
    const ref = `B${r}`;
    if (ws[ref] && typeof ws[ref].v === 'number') {
      ws[ref].z = '"$"#,##0.00;[Red]"($"#,##0.00")"';
    }
  });

  // Freeze primera fila
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  XLSX.utils.book_append_sheet(wb, ws, '📋 Cuentas');
}

// ============================================================
// HOJA 3 — LIBRO DE TRANSACCIONES
// ============================================================

function _sheetTransacciones(wb, transactions) {
  if (transactions.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Sin transacciones registradas']
    ]);
    XLSX.utils.book_append_sheet(wb, ws, '📒 Transacciones');
    return;
  }

  const header = ['#', 'Fecha', 'Descripción', 'Cuenta', 'Categoría', 'Movimiento', 'Monto', 'Efecto en saldo', 'Moneda', 'Registrada el'];

  const dataRows = transactions.map((t, i) => [
    i + 1,
    t.date,
    t.description,
    t.accountName,
    t.accountType || '—',
    t.movement === 'Entrada' ? 'Entrada' : 'Salida',
    Number(t.amount),
    Number(t.balanceDelta ?? 0),
    t.currency || 'MXN',
    t.createdAt ? t.createdAt.slice(0,10) : ''
  ]);

  // Fila de totales
  const totalEntrada = transactions.filter(t => t.movement === 'Entrada').reduce((s,t) => s + t.amount, 0);
  const totalSalida = transactions.filter(t => t.movement === 'Salida' ).reduce((s,t) => s + t.amount, 0);

  const dataLen = dataRows.length;
  const totalesRows = [
    [],
    ['', '', '', '', '', 'TOTAL ENTRADAS', totalEntrada, '', '', ''],
    ['', '', '', '', '', 'TOTAL SALIDAS', totalSalida, '', '', ''],
    ['', '', '', '', '', 'BALANCE NETO', totalEntrada - totalSalida, '', '', ''],
  ];

  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows, ...totalesRows]);

  ws['!cols'] = [
    { wch: 5 },   // #
    { wch: 12 },  // Fecha
    { wch: 32 },  // Descripción
    { wch: 22 },  // Cuenta
    { wch: 16 },  // Categoría
    { wch: 12 },  // Movimiento
    { wch: 16 },  // Monto
    { wch: 16 },  // Efecto en saldo
    { wch: 9 },   // Moneda
    { wch: 14 },  // Registrada
  ];

  // Encabezado
  ['A','B','C','D','E','F','G','H'].forEach(c => {
    const ref = `${c}1`;
    if (ws[ref]) _style(ws, ref, { bold: true, color: 'FFFFFF' }, '1E40AF');
  });

  // Filas de datos con color por movimiento
  dataRows.forEach((row, i) => {
    const r = i + 2;
    const isEntrada = row[5] === 'Entrada';
    const bg = i % 2 === 0
      ? (isEntrada ? 'ECFDF5' : 'FFF1F2')
      : (isEntrada ? 'D1FAE5' : 'FFE4E6');

    ['A','B','C','D','E','F','G','H'].forEach(c => {
      const ref = `${c}${r}`;
      if (ws[ref]) _style(ws, ref, {}, bg);
    });

    // Columna Movimiento — texto en color
    const movRef = `F${r}`;
    if (ws[movRef]) {
      _style(ws, movRef, { bold: true, color: isEntrada ? '166534' : '9F1239' },
             isEntrada ? (i%2===0 ? 'ECFDF5' : 'D1FAE5') : (i%2===0 ? 'FFF1F2' : 'FFE4E6'));
    }

    // Formato moneda
    const montoRef = `G${r}`;
    if (ws[montoRef] && typeof ws[montoRef].v === 'number') {
      ws[montoRef].z = '"$"#,##0.00;[Red]"($"#,##0.00")"';
    }
  });

  // Filas de totales
  const t1 = dataLen + 3;
  const t2 = dataLen + 4;
  const t3 = dataLen + 5;

  [
    [t1, '166534', 'DCFCE7'],
    [t2, '9F1239', 'FFE4E6'],
    [t3, '1F3864', 'DBEAFE'],
  ].forEach(([r, color, bg]) => {
    ['F','G'].forEach(c => {
      const ref = `${c}${r}`;
      if (ws[ref]) _style(ws, ref, { bold: true, color }, bg);
    });
    const fRef = `G${r}`;
    if (ws[fRef] && typeof ws[fRef].v === 'number') {
      ws[fRef].z = '"$"#,##0.00;[Red]"($"#,##0.00")"';
    }
  });

  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  XLSX.utils.book_append_sheet(wb, ws, '📒 Transacciones');
}

// ============================================================
// HOJA 4 — CUENTAS T (Resumen por cuenta)
// ============================================================

function _sheetCuentasT(wb, accounts, transactions) {
  // Calcular totales de entrada y salida por cuenta en una pasada
  const totals = {};
  for (const t of transactions) {
    if (!totals[t.accountId]) totals[t.accountId] = { entrada: 0, salida: 0 };
    if (t.movement === 'Entrada') totals[t.accountId].entrada += t.amount;
    else totals[t.accountId].salida += t.amount;
  }

  const header = ['Cuenta', 'Categoría', 'Tipo', 'Moneda', 'Total Entradas', 'Total Salidas', 'Saldo Actual'];

  const dataRows = accounts.map(a => {
    const { entrada = 0, salida = 0 } = totals[a.id] || {};
    return [
      a.name,
      a.category || '—',
      a.type,
      a.currency || 'MXN',
      entrada,
      salida,
      Number(a.balance),
    ];
  });

  // Totales globales
  const gEntrada = dataRows.reduce((s, r) => s + r[4], 0);
  const gSalida = dataRows.reduce((s, r) => s + r[5], 0);

  const totalesRow = ['TOTALES', '', '', '', gEntrada, gSalida, ''];

  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows, [], totalesRow]);

  ws['!cols'] = [
    { wch: 28 },  // Cuenta
    { wch: 16 },  // Categoría
    { wch: 13 },  // Tipo
    { wch: 8 },   // Moneda
    { wch: 16 },  // Entradas
    { wch: 16 },  // Salidas
    { wch: 16 },  // Saldo
  ];

  // Encabezado
  ['A','B','C','D','E','F','G'].forEach(c => {
    const ref = `${c}1`;
    if (ws[ref]) _style(ws, ref, { bold: true, color: 'FFFFFF' }, '1E40AF');
  });

  // Sub-encabezados semánticos
  if (ws['E1']) _style(ws, 'E1', { bold: true, color: 'FFFFFF' }, '166534');
  if (ws['F1']) _style(ws, 'F1', { bold: true, color: 'FFFFFF' }, '9F1239');

  // Datos
  dataRows.forEach((row, i) => {
    const r = i + 2;
    const bg = i % 2 === 0 ? 'EFF6FF' : 'FFFFFF';
    ['A','B','C','D','E','F','G'].forEach(c => {
      const ref = `${c}${r}`;
      if (ws[ref]) _style(ws, ref, {}, bg);
    });

    // Entradas verde, salidas rojo
    if (ws[`E${r}`]) _style(ws, `E${r}`, { color: '166534' }, bg);
    if (ws[`F${r}`]) _style(ws, `F${r}`, { color: '991B1B' }, bg);

    // Formato moneda columnas E F G
    ['E','F','G'].forEach(c => {
      const ref = `${c}${r}`;
      if (ws[ref] && typeof ws[ref].v === 'number') {
        ws[ref].z = '"$"#,##0.00;[Red]"($"#,##0.00")"';
      }
    });
  });

  // Fila de totales
  const totalRow = dataRows.length + 3;
  ['A','B','C','D','E','F','G'].forEach(c => {
    const ref = `${c}${totalRow}`;
    if (ws[ref]) _style(ws, ref, { bold: true, color: 'FFFFFF' }, '1F3864');
  });
  ['E','F'].forEach(c => {
    const ref = `${c}${totalRow}`;
    if (ws[ref] && typeof ws[ref].v === 'number') {
      ws[ref].z = '"$"#,##0.00;[Red]"($"#,##0.00")"';
    }
  });

  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  XLSX.utils.book_append_sheet(wb, ws, '⚖️ Cuentas T');
}

// ============================================================
// HOJA 5 — ESTADOS FINANCIEROS
// ============================================================

function _sheetEstadosFinancieros(wb, accounts, transactions) {
  const assets = _sumCategory(accounts, 'Activo') + _sumCategory(accounts, 'Activo Diferido');
  const liabilities = _sumCategory(accounts, 'Pasivo');
  const equity = _sumCategory(accounts, 'Patrimonio');
  const income = _sumCategory(accounts, 'Ingreso');
  const expenses = _sumCategory(accounts, 'Gasto');
  const netIncome = income - expenses;

  const fecha = new Date().toLocaleDateString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  // Detalle de cuentas por categoría
  const byCategory = (category) => accounts.filter(a => a.category === category);

  const rows = [
    // Estado de Resultados
    ['ESTADO DE RESULTADOS'],
    [`Al ${fecha}`],
    [],
    ['INGRESOS', ''],
    ...byCategory('Ingreso').map(a => [`  ${a.name}`, Number(a.balance)]),
    ['Total Ingresos', income],
    [],
    ['GASTOS', ''],
    ...byCategory('Gasto').map(a => [`  ${a.name}`, Number(a.balance)]),
    ['Total Gastos', expenses],
    [],
    ['UTILIDAD / PÉRDIDA NETA', netIncome],
    [],
    [],
    // Balance General
    ['BALANCE GENERAL'],
    [`Al ${fecha}`],
    [],
    ['ACTIVOS', ''],
    ...byCategory('Activo').map(a => [`  ${a.name}`, Number(a.balance)]),
    ['Subtotal Activos', _sumCategory(accounts, 'Activo')],
    [],
    ['ACTIVOS DIFERIDOS', ''],
    ...byCategory('Activo Diferido').map(a => [`  ${a.name}`, Number(a.balance)]),
    ['Subtotal Activos Diferidos', _sumCategory(accounts, 'Activo Diferido')],
    [],
    ['Total Activos', assets],
    [],
    ['PASIVOS', ''],
    ...byCategory('Pasivo').map(a => [`  ${a.name}`, Number(a.balance)]),
    ['Total Pasivos', liabilities],
    [],
    ['PATRIMONIO', ''],
    ...byCategory('Patrimonio').map(a => [`  ${a.name}`, Number(a.balance)]),
    ['Total Patrimonio', equity],
    [],
    ['TOTAL PASIVOS + PATRIMONIO', liabilities + equity],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 40 }, { wch: 20 }];

  // Función auxiliar para encontrar fila por texto
  const findRow = (text) => {
    for (let r = 1; r <= rows.length; r++) {
      const cell = ws[`A${r}`];
      if (cell && cell.v === text) return r;
    }
    return -1;
  };

  // Título Estado de Resultados
  const r1 = findRow('ESTADO DE RESULTADOS');
  if (r1 > 0) {
    _style(ws, `A${r1}`, { bold: true, sz: 14, color: 'FFFFFF' }, '1E40AF');
    ws['!merges'] = ws['!merges'] || [];
    ws['!merges'].push({ s:{r:r1-1,c:0}, e:{r:r1-1,c:1} });
  }

  // Título Balance General
  const r2 = findRow('BALANCE GENERAL');
  if (r2 > 0) {
    _style(ws, `A${r2}`, { bold: true, sz: 14, color: 'FFFFFF' }, '1E40AF');
    ws['!merges'] = ws['!merges'] || [];
    ws['!merges'].push({ s:{r:r2-1,c:0}, e:{r:r2-1,c:1} });
  }

  // Estilo de secciones (INGRESOS, GASTOS, ACTIVOS, etc.)
  const secciones = ['INGRESOS','GASTOS','ACTIVOS','ACTIVOS DIFERIDOS','PASIVOS','PATRIMONIO'];
  secciones.forEach(sec => {
    const r = findRow(sec);
    if (r > 0) {
      _style(ws, `A${r}`, { bold: true, color: '1F3864' }, 'DBEAFE');
      _style(ws, `B${r}`, { bold: true, color: '1F3864' }, 'DBEAFE');
    }
  });

  // Estilo filas de totales
  const totales = [
    'Total Ingresos','Total Gastos',
    'Subtotal Activos','Subtotal Activos Diferidos','Total Activos',
    'Total Pasivos','Total Patrimonio',
    'UTILIDAD / PÉRDIDA NETA','TOTAL PASIVOS + PATRIMONIO'
  ];
  totales.forEach(label => {
    const r = findRow(label);
    if (r < 0) return;
    const isNet = label === 'UTILIDAD / PÉRDIDA NETA';
    const isMain = label === 'TOTAL PASIVOS + PATRIMONIO';
    const numCell = ws[`B${r}`];
    const val = numCell ? (numCell.v ?? 0) : 0;
    let bg, color;
    if (isNet || isMain) {
      color = val >= 0 ? '166534' : '991B1B';
      bg = val >= 0 ? 'DCFCE7' : 'FEE2E2';
    } else {
      color = '1F3864';
      bg = 'EFF6FF';
    }
    _style(ws, `A${r}`, { bold: true, color }, bg);
    _style(ws, `B${r}`, { bold: true, color }, bg);
    if (numCell && typeof numCell.v === 'number') {
      numCell.z = '"$"#,##0.00;[Red]"($"#,##0.00")"';
    }
  });

  // Formato moneda para todas las celdas numéricas en col B
  for (let r = 1; r <= rows.length + 1; r++) {
    const ref = `B${r}`;
    if (ws[ref] && typeof ws[ref].v === 'number' && !ws[ref].z) {
      ws[ref].z = '"$"#,##0.00;[Red]"($"#,##0.00")"';
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, '📈 Estados Financieros');
}

// ============================================================
// UTILIDADES INTERNAS
// ============================================================

/** Suma saldos de todas las cuentas de una categoría */
function _sumCategory(accounts, category) {
  return accounts
    .filter(a => a.category === category)
    .reduce((s, a) => s + (Number(a.balance) || 0), 0);
}

/**
 * Aplica font + fill a una celda de la hoja.
 * @param {object} ws     - worksheet de SheetJS
 * @param {string} ref    - referencia de celda, ej. 'A1'
 * @param {object} font   - propiedades de fuente { bold, sz, color, italic }
 * @param {string} bgColor - color de fondo ARGB sin '#', ej. '2563EB'
 */
function _style(ws, ref, font = {}, bgColor = null) {
  if (!ws[ref]) return;

  ws[ref].s = {
    font: {
      name: 'Arial',
      bold: font.bold ?? false,
      italic: font.italic ?? false,
      sz: font.sz ?? 10,
      color: font.color ? { rgb: font.color } : undefined,
    },
    fill: bgColor
      ? { patternType: 'solid', fgColor: { rgb: bgColor } }
      : undefined,
    alignment: {
      vertical: 'center',
      wrapText: true,
    },
    border: {
      top: { style: 'thin', color: { rgb: 'D1D5DB' } },
      bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
      left: { style: 'thin', color: { rgb: 'D1D5DB' } },
      right: { style: 'thin', color: { rgb: 'D1D5DB' } },
    }
  };
}
