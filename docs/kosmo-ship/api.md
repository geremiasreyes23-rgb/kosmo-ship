# Integraciones y endpoints externos

Kosmo no tiene una API REST aparte: la interfaz guarda y edita con **Server Actions** y recibe tiempo real por **Server-Sent Events**. Kosmo Ship sigue el mismo patrón.

## 1. Server Actions (uso interno de la app)

Todas las pantallas (web y PWA) usan Server Actions. Cada acción valida la sesión y el rol antes de escribir.

| Acción | Rol | Efecto |
|---|---|---|
| `crearPrealerta(data)` | Cliente | Crea un paquete en estado Prealertado |
| `recibirPaquete(data)` | Almacén | Busca por tracking o casillero, registra peso, medidas y fotos; estado → Recibido; emite evento |
| `retenerPaquete(id, motivo)` | Almacén, oficina | Estado → Retenido; notifica al cliente |
| `agregarAManifiesto(paqueteId, manifiestoId)` | Almacén | Estado → Consolidado |
| `cerrarManifiesto(id)` | Despacho | Todos sus paquetes → Despachado, en una transacción |
| `cambiarEstado(id, estado)` | Según estado | Valida la transición permitida |
| `confirmarEntrega(id, foto/firma)` | Chofer, mostrador | Estado → Entregado |

## 2. Tiempo real (SSE)

Se reutiliza el canal SSE de notificaciones de Kosmo. Eventos nuevos:

- `paquete.recibido`: al cliente dueño del casillero y al dashboard.
- `paquete.estado_cambiado`: al cliente y a la oficina.
- `manifiesto.despachado`: a oficina y despacho.

## 3. Route Handlers (`app/api/...`), solo para terceros

Solo se exponen cuando algo **fuera** de Kosmo necesita hablar con él.

| Método | Ruta | Uso |
|---|---|---|
| POST | `/api/ship/webhooks/carrier` | Actualizaciones de tracking de navieras o aerolíneas |
| POST | `/api/ship/webhooks/whatsapp` | Respuestas del cliente por WhatsApp Business |
| POST | `/api/ship/paquetes` | Recepción desde un escáner o báscula externa |
| GET | `/api/ship/tracking/{tracking}` | Consulta pública de estado (sin datos sensibles) |

Autenticación de terceros: token por integración guardado cifrado en BD, nunca la sesión de un usuario.

Ejemplo de respuesta de `GET /api/ship/tracking/1Z999AA10123456784`:

```json
{
  "id": "PKG-10482",
  "estado": "En tránsito",
  "actualizado": "2026-10-14T15:20:00-04:00"
}
```

## 4. Notificaciones salientes

Al emitir un evento, un manejador envía el mensaje por el canal preferido del cliente (WhatsApp, SMS o email). Para la demo puede bastar con la notificación push de la PWA.
