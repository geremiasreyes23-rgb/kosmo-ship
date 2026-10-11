# Flujo de estados del paquete

```
Prealertado → Recibido → Consolidado → Despachado → En tránsito → En aduana → Listo para entrega → Entregado
                 ↓
            Retenido (falta factura, pago, o problema)
```

| Estado | Quién lo cambia | Disparador / automatización |
|---|---|---|
| **Prealertado** | Cliente (app) | Opcional. El cliente sube tracking y factura antes de que llegue. |
| **Recibido** | Almacén (escaneo) | Notificación al cliente con foto, peso y monto. |
| **Retenido** | Almacén / oficina | Aviso al cliente con el motivo (falta factura, valor alto, etc.). |
| **Consolidado** | Almacén | El paquete entra en un manifiesto abierto. |
| **Despachado** | Despacho | Al cerrar el manifiesto, todos sus paquetes cambian a la vez. |
| **En tránsito** | Despacho / integración | Aviso al cliente con fecha estimada. |
| **En aduana** | Agente en destino | — |
| **Listo para entrega** | Oficina destino | Aviso al cliente: retirar en oficina o programar entrega. Habilita pago. |
| **Entregado** | Chofer / mostrador | Foto o firma como prueba de entrega. |

Los nombres y el orden de los estados son configurables por empresa.
