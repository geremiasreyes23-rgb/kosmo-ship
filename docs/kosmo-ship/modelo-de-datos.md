# Modelo de datos

Kosmo Ship se agrega a Kosmo como una **línea de negocio más**, siguiendo los principios del `schema.prisma` de Kosmo: perfiles 1:1 con `Client`, catálogos configurables y trazabilidad de cada cambio. El borrador completo está en [`prisma/ship.prisma`](ship.prisma) y valida sin errores junto al esquema actual de Kosmo.

## Qué se reutiliza de Kosmo y qué es nuevo

| Kosmo (existente) | Uso en Kosmo Ship |
|---|---|
| `Client` | El cliente del courier. Solo gana la relación `shippingProfile`. |
| `User`, `Role`, `Permission` | Roles nuevos: Almacén, Chofer, Despacho; el cliente final como usuario con vista propia. |
| `Document` | Factura de compra de la prealerta (gana `packageId`). |
| `Notification` + SSE | Avisos `package_received`, `package_status`, `package_ready`. |
| `AuditLog` | Cambios sobre `Package` y `Manifest`. |
| `CustomField` | Campos extra por empresa sin tocar el esquema. |

| Nuevo | Equivalente en Kosmo | Para qué |
|---|---|---|
| `ShippingProfile` | `MedicareProfile` | Casillero del cliente (`SDQ-2031`), destino, tarifa, canal de aviso |
| `Package` | `Lead` / `Sale` | El paquete, de prealerta a entrega. ID visible `PKG-000123` |
| `PackageEvent` | `PipelineHistory` | Historial de cada cambio de estado |
| `PackagePhoto` | — | Fotos de recepción, entrega o daño |
| `Manifest` | — | Consolidación y despacho (aéreo o marítimo). ID visible `MAN-000045` |
| `ShippingDestination` | `Carrier` | Catálogo de destinos; da el prefijo del casillero |
| `ShippingRate` | `CommissionRate` | Precio por libra, mínimo, divisor volumétrico, seguro, entrega |

## Cálculo del cobro

Al recibir el paquete en almacén:

```
peso_volumétrico = (largo × ancho × alto) / divisorVolumetrico   // 166 por defecto
peso_cobrable    = max(peso_real, peso_volumétrico)
monto            = max(peso_cobrable × precioPorLibra, cargoMínimo)
```

`billableWeightLb` y `amount` se guardan en el paquete al recibirlo, para que un cambio de tarifa posterior no altere lo ya cobrado.

## Estados

Ver [flujo de estados](flujo-de-estados.md). En código: `PREALERTED → RECEIVED → CONSOLIDATED → DISPATCHED → IN_TRANSIT → IN_CUSTOMS → READY → DELIVERED`, con `ON_HOLD` como desvío desde Recibido.
