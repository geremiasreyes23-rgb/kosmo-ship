# Roles y vistas por dispositivo

Principio: **mismos datos, distinta vista** según quién inicia sesión y en qué dispositivo.

| Rol | Dispositivo | Pantallas principales |
|---|---|---|
| Cliente | Teléfono (PWA) | Mis paquetes, detalle con foto, prealerta, pagar, mi casillero (dirección en EE. UU.) |
| Almacén | Teléfono / tablet (PWA) | Escanear, registrar peso y medidas, foto, asignar casillero, consolidar |
| Chofer | Teléfono (PWA) | Ruta del día, confirmar entrega con foto o firma |
| Despacho | Tablet / computadora | Lista por estado + detalle, manifiestos |
| Oficina / dueño | Computadora (resumen en teléfono) | Dashboard, clientes, tarifas, cobros, reportes |

## Reglas de diseño por dispositivo

**Teléfono**
- Una tarea por pantalla.
- Tablas → tarjetas.
- Menú → barra inferior de 4–5 íconos.
- Botones grandes, alcanzables con el pulgar.
- Uso de cámara para escaneo y fotos.

**Tablet**
- Dos paneles: lista a la izquierda, detalle a la derecha.

**Computadora**
- Tablas completas, filtros, dashboards y reportes.
