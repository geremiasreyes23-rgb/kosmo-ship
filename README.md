# Kosmo Ship

Plataforma de paquetería y courier de **Kosmo Space**, construida sobre la base de Kosmo.

Kosmo Ship está pensada para empresas en Estados Unidos que reciben, consolidan y envían paquetes a sus clientes (modelo de casillero / suite). Reúne en un solo sistema el centro de operaciones de la oficina y una app instalable para el cliente final, el almacén y los choferes.

> **Origen:** este repositorio es una copia independiente de `kosmo-crm` (CRM de Alliance Insurance). Todo el historial original se conserva. El README original está en [`docs/kosmo-crm-README.md`](docs/kosmo-crm-README.md). Kosmo Ship evoluciona por separado y usa su propia base de datos y su propio despliegue.

## Recorrido de la demo

1. El cliente registra una **prealerta** desde su teléfono.
2. El almacén **recibe y escanea** el paquete (peso, dimensiones, foto).
3. El cliente recibe una **notificación** con foto, peso y monto a pagar.
4. El paquete se **consolida** en un manifiesto y se despacha.
5. El cliente sigue el **estado** hasta la entrega.
6. El dueño ve todo en el **dashboard**.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript, Node.js 22+ |
| Interfaz | Tailwind CSS 4 (temas por variables CSS), lucide-react, Recharts |
| Datos | PostgreSQL en Neon, Prisma 5 (`prisma/schema.prisma` + migraciones) |
| Escritura | Server Actions de Next.js |
| Tiempo real | Server-Sent Events (notificaciones y cambios de estado) |
| Seguridad | Sesiones propias (bcrypt), roles y permisos en BD, AES-256-GCM para datos sensibles |
| Hosting | Railway |

## Arquitectura

Un solo proyecto Next.js sirve las tres experiencias:

| Experiencia | Cómo se entrega | Dispositivo |
|---|---|---|
| Centro de operaciones | La web, con los módulos de paquetería | Computadora / tablet |
| App del cliente | La misma web como **PWA instalable**, con vista de cliente | Teléfono |
| App de almacén y chofer | La misma web como **PWA**, con vistas operativas | Teléfono / tablet |

## Documentación de Kosmo Ship

- [Modelo de datos](docs/kosmo-ship/modelo-de-datos.md) y [borrador del esquema](docs/kosmo-ship/ship.prisma)
- [Flujo de estados](docs/kosmo-ship/flujo-de-estados.md)
- [Roles y vistas por dispositivo](docs/kosmo-ship/roles-y-vistas.md)
- [Integraciones y endpoints externos](docs/kosmo-ship/api.md)

## Hoja de ruta

- [x] Copia independiente de Kosmo y documentación de la vertical
- [x] Modelos de paquetería en `prisma/schema.prisma`, migración `20261011190000_kosmo_ship_paqueteria` y permisos (`packages`, `manifests`, `shipping:admin`)
- [x] Base de datos propia en Neon (proyecto `kosmo-ship`)
- [ ] PWA instalable (`app/manifest.ts`, íconos, service worker)
- [ ] Recepción en almacén (escaneo, peso, medidas, foto)
- [ ] Vista del cliente en el teléfono (mis paquetes, prealerta)
- [ ] Manifiestos y despacho
- [ ] Notificaciones en tiempo real al cliente
- [ ] Dashboard de operación
- [ ] Rebranding: quitar referencias a Alliance Insurance y a los módulos de seguros que no apliquen

## Desarrollo local

```bash
npm install
cp .env.example .env   # configurar DATABASE_URL y DIRECT_URL de la base de datos de Kosmo Ship
npm run db:migrate
npm run db:seed
npm run dev
```
