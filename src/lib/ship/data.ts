import "server-only";

import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { formatPackageCode, type PackageStatusKey } from "./format";

/**
 * Kosmo Ship — lecturas de paquetería para el dashboard, el módulo
 * Paquetes y el buscador global. A diferencia de leads/clientes del CRM de
 * seguros, los paquetes NO se filtran por agente: el almacén y la oficina
 * operan sobre todos los paquetes de la empresa. Quién puede verlos lo
 * decide el permiso "packages:view" en cada página.
 */

export interface PackageRow {
  id: string;
  code: string;
  clientName: string;
  lockerCode: string;
  originTracking: string | null;
  originCarrier: string | null;
  description: string | null;
  weightLb: number | null;
  amount: number | null;
  isPaid: boolean;
  status: PackageStatusKey;
  manifestId: string | null;
  updatedAt: string;
}

const packageSelect = {
  id: true,
  packageNumber: true,
  originTracking: true,
  originCarrier: true,
  description: true,
  weightLb: true,
  amount: true,
  isPaid: true,
  status: true,
  manifestId: true,
  updatedAt: true,
  shippingProfile: {
    select: { lockerCode: true, client: { select: { firstName: true, lastName: true } } },
  },
} satisfies Prisma.PackageSelect;

type PackageWithProfile = Prisma.PackageGetPayload<{ select: typeof packageSelect }>;

function toRow(p: PackageWithProfile): PackageRow {
  return {
    id: p.id,
    code: formatPackageCode(p.packageNumber),
    clientName: `${p.shippingProfile.client.firstName} ${p.shippingProfile.client.lastName}`,
    lockerCode: p.shippingProfile.lockerCode,
    originTracking: p.originTracking,
    originCarrier: p.originCarrier,
    description: p.description,
    weightLb: p.weightLb == null ? null : Number(p.weightLb),
    amount: p.amount == null ? null : Number(p.amount),
    isPaid: p.isPaid,
    status: p.status,
    manifestId: p.manifestId,
    updatedAt: p.updatedAt.toISOString(),
  };
}

/** Filtro de texto: código PKG, tracking de origen, casillero o nombre. */
function textFilter(query: string): Prisma.PackageWhereInput {
  const q = query.trim();
  const pkgNumber = /^(pkg-?)?\d+$/i.test(q) ? Number(q.replace(/^pkg-?/i, "")) : null;
  return {
    OR: [
      { originTracking: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { shippingProfile: { lockerCode: { contains: q, mode: "insensitive" } } },
      { shippingProfile: { client: { firstName: { contains: q, mode: "insensitive" } } } },
      { shippingProfile: { client: { lastName: { contains: q, mode: "insensitive" } } } },
      ...(pkgNumber != null && Number.isSafeInteger(pkgNumber) && pkgNumber <= 2147483647
        ? [{ packageNumber: pkgNumber }]
        : []),
    ],
  };
}

export async function listPackages(filters: {
  status?: PackageStatusKey;
  query?: string;
  take?: number;
}): Promise<PackageRow[]> {
  const where: Prisma.PackageWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.query && filters.query.trim().length >= 2 ? textFilter(filters.query) : {}),
  };
  const rows = await prisma.package.findMany({
    where,
    select: packageSelect,
    orderBy: { updatedAt: "desc" },
    take: filters.take ?? 200,
  });
  return rows.map(toRow);
}

/** Conteo de paquetes por estado (para pestañas y dashboard). */
export async function countPackagesByStatus(): Promise<Record<PackageStatusKey, number>> {
  const groups = await prisma.package.groupBy({ by: ["status"], _count: { _all: true } });
  const counts = {
    PREALERTED: 0,
    RECEIVED: 0,
    ON_HOLD: 0,
    CONSOLIDATED: 0,
    DISPATCHED: 0,
    IN_TRANSIT: 0,
    IN_CUSTOMS: 0,
    READY: 0,
    DELIVERED: 0,
  } satisfies Record<PackageStatusKey, number>;
  for (const g of groups) counts[g.status] = g._count._all;
  return counts;
}

export interface ShipDashboardSummary {
  byStatus: Record<PackageStatusKey, number>;
  receivedToday: number;
  pendingCollection: number;
  activeLockers: number;
  openManifests: number;
  receivedLast14Days: { dia: string; paquetes: number }[];
  recentPackages: PackageRow[];
}

export async function getShipDashboard(): Promise<ShipDashboardSummary> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const since = new Date(startOfToday);
  since.setDate(since.getDate() - 13);

  const [byStatus, receivedToday, unpaid, activeLockers, openManifests, receivedRecent, recentPackages] =
    await Promise.all([
      countPackagesByStatus(),
      prisma.package.count({ where: { receivedAt: { gte: startOfToday } } }),
      prisma.package.aggregate({
        where: { isPaid: false, amount: { not: null }, status: { not: "PREALERTED" } },
        _sum: { amount: true },
      }),
      prisma.shippingProfile.count(),
      prisma.manifest.count({ where: { status: "OPEN" } }),
      prisma.package.findMany({
        where: { receivedAt: { gte: since } },
        select: { receivedAt: true },
      }),
      listPackages({ take: 8 }),
    ]);

  const perDay = new Map<string, number>();
  for (let i = 0; i < 14; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    perDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const p of receivedRecent) {
    if (!p.receivedAt) continue;
    const key = p.receivedAt.toISOString().slice(0, 10);
    if (perDay.has(key)) perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }
  const dayLabel = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" });

  return {
    byStatus,
    receivedToday,
    pendingCollection: Number(unpaid._sum.amount ?? 0),
    activeLockers,
    openManifests,
    receivedLast14Days: [...perDay.entries()].map(([day, paquetes]) => ({
      dia: dayLabel.format(new Date(`${day}T12:00:00`)),
      paquetes,
    })),
    recentPackages,
  };
}
