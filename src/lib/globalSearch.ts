"use server";

import { prisma } from "@/lib/db";
import { requireUser, hasPermission } from "@/lib/auth";
import { formatPackageCode, packageStatusLabel } from "@/lib/ship/format";

export interface GlobalSearchHit {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
}

export interface GlobalSearchResult {
  packages: GlobalSearchHit[];
  lockers: GlobalSearchHit[];
}

const EMPTY_RESULT: GlobalSearchResult = { packages: [], lockers: [] };

const RESULTS_PER_GROUP = 5;

/** Buscador global del header de Kosmo Ship ("Buscar paquete, tracking,
 * casillero o cliente..."). Reemplaza al buscador de leads/pólizas/carriers
 * del CRM de seguros. Exige "packages:view", igual que el módulo Paquetes.
 * Cada resultado abre el módulo Paquetes ya filtrado. */
export async function globalSearchAction(rawQuery: string): Promise<GlobalSearchResult> {
  const user = await requireUser();
  const query = rawQuery.trim();
  if (query.length < 2 || !hasPermission(user, "packages", "view")) return EMPTY_RESULT;

  // "PKG-000123", "000123" o "123" también encuentran el paquete por número.
  const digits = query.replace(/^pkg-?/i, "");
  const asNumber = /^\d+$/.test(digits) && Number(digits) <= 2147483647 ? Number(digits) : null;

  const [packageRows, lockerRows] = await Promise.all([
    prisma.package.findMany({
      where: {
        OR: [
          { originTracking: { contains: query, mode: "insensitive" } },
          { shippingProfile: { lockerCode: { contains: query, mode: "insensitive" } } },
          ...(asNumber != null ? [{ packageNumber: asNumber }] : []),
        ],
      },
      select: {
        id: true,
        packageNumber: true,
        originTracking: true,
        status: true,
        shippingProfile: { select: { lockerCode: true } },
      },
      take: RESULTS_PER_GROUP,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.shippingProfile.findMany({
      where: {
        OR: [
          { lockerCode: { contains: query, mode: "insensitive" } },
          { client: { firstName: { contains: query, mode: "insensitive" } } },
          { client: { lastName: { contains: query, mode: "insensitive" } } },
          { client: { phone: { contains: query, mode: "insensitive" } } },
          { client: { email: { contains: query, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        lockerCode: true,
        client: { select: { firstName: true, lastName: true, phone: true } },
        _count: { select: { packages: true } },
      },
      take: RESULTS_PER_GROUP,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    packages: packageRows.map((p) => {
      const code = formatPackageCode(p.packageNumber);
      return {
        id: p.id,
        label: code,
        sublabel: `${p.shippingProfile.lockerCode} · ${packageStatusLabel(p.status)}${
          p.originTracking ? ` · ${p.originTracking}` : ""
        }`,
        href: `/packages?q=${encodeURIComponent(code)}`,
      };
    }),
    lockers: lockerRows.map((l) => ({
      id: l.id,
      label: `${l.client.firstName} ${l.client.lastName}`,
      sublabel: `${l.lockerCode} · ${l._count.packages} paquete${l._count.packages === 1 ? "" : "s"}${
        l.client.phone ? ` · ${l.client.phone}` : ""
      }`,
      href: `/packages?q=${encodeURIComponent(l.lockerCode)}`,
    })),
  };
}
