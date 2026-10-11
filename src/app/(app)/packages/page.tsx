import Link from "next/link";
import { Search, PackageOpen } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Field";
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/Table";
import { requireUser, hasPermission } from "@/lib/auth";
import { listPackages, countPackagesByStatus } from "@/lib/ship/data";
import {
  PACKAGE_STATUSES,
  formatAmount,
  isPackageStatus,
  packageStatusBadge,
  packageStatusLabel,
} from "@/lib/ship/format";
import { cn, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Kosmo Ship — módulo Paquetes: lista de todos los paquetes de la empresa,
// filtrable por estado (pestañas) y por texto (código PKG, tracking de
// origen, casillero o nombre del cliente). La recepción en almacén y el
// detalle de cada paquete se agregan encima de esta pantalla.
export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "packages", "view")) {
    return (
      <div>
        <PageHeader title="Paquetes" />
        <Card className="p-6 text-sm text-[var(--ink-secondary)]">No tienes permiso para ver los paquetes.</Card>
      </div>
    );
  }

  const params = await searchParams;
  const status = isPackageStatus(params.estado) ? params.estado : undefined;
  const query = params.q?.trim() ?? "";

  const [packages, counts] = await Promise.all([
    listPackages({ status, query }),
    countPackagesByStatus(),
  ]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const hrefFor = (estado?: string) => {
    const sp = new URLSearchParams();
    if (estado) sp.set("estado", estado);
    if (query) sp.set("q", query);
    const qs = sp.toString();
    return qs ? `/packages?${qs}` : "/packages";
  };

  return (
    <div>
      <PageHeader
        title="Paquetes"
        description="Todos los paquetes recibidos y por recibir, de prealerta a entrega"
      />

      <form action="/packages" method="get" className="mb-4 flex flex-wrap items-center gap-2">
        {status && <input type="hidden" name="estado" value={status} />}
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" />
          <Input
            name="q"
            defaultValue={query}
            placeholder="Buscar por PKG, tracking, casillero o cliente"
            className="pl-9"
          />
        </div>
      </form>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <StatusTab href={hrefFor()} active={!status} label="Todos" count={total} />
        {PACKAGE_STATUSES.map((s) => (
          <StatusTab
            key={s.key}
            href={hrefFor(s.key)}
            active={status === s.key}
            label={s.label}
            count={counts[s.key]}
          />
        ))}
      </div>

      <Card>
        {packages.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <PackageOpen className="h-8 w-8 text-[var(--ink-muted)]" />
            <p className="text-sm font-medium text-[var(--ink-primary)]">
              {total === 0 ? "Todavía no hay paquetes" : "Ningún paquete coincide con el filtro"}
            </p>
            <p className="max-w-sm text-sm text-[var(--ink-secondary)]">
              {total === 0
                ? "Aquí aparecerán los paquetes en cuanto el almacén los reciba o un cliente registre una prealerta."
                : "Prueba con otro estado o con otro texto de búsqueda."}
            </p>
          </div>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Paquete</Th>
                <Th>Cliente</Th>
                <Th>Tracking de origen</Th>
                <Th className="text-right">Peso</Th>
                <Th className="text-right">Monto</Th>
                <Th>Estado</Th>
                <Th>Actualizado</Th>
              </tr>
            </THead>
            <TBody>
              {packages.map((p) => (
                <Tr key={p.id}>
                  <Td>
                    <p className="font-medium tabular-nums">{p.code}</p>
                    {p.description && (
                      <p className="max-w-[16rem] truncate text-xs text-[var(--ink-muted)]">{p.description}</p>
                    )}
                  </Td>
                  <Td>
                    <p>{p.clientName}</p>
                    <p className="text-xs tabular-nums text-[var(--ink-muted)]">{p.lockerCode}</p>
                  </Td>
                  <Td>
                    <p className="tabular-nums">{p.originTracking ?? "—"}</p>
                    {p.originCarrier && <p className="text-xs text-[var(--ink-muted)]">{p.originCarrier}</p>}
                  </Td>
                  <Td className="text-right tabular-nums">{p.weightLb == null ? "—" : `${p.weightLb} lb`}</Td>
                  <Td className="text-right tabular-nums">
                    {formatAmount(p.amount)}
                    {p.amount != null && (
                      <p className={cn("text-xs", p.isPaid ? "text-[var(--status-good)]" : "text-[var(--ink-muted)]")}>
                        {p.isPaid ? "Pagado" : "Por cobrar"}
                      </p>
                    )}
                  </Td>
                  <Td>
                    <Badge status={packageStatusBadge(p.status)}>{packageStatusLabel(p.status)}</Badge>
                  </Td>
                  <Td className="whitespace-nowrap text-[var(--ink-secondary)]">{formatDate(p.updatedAt)}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function StatusTab({ href, active, label, count }: { href: string; active: boolean; label: string; count: number }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-[var(--brand-500)] bg-[var(--brand-50)] text-[var(--brand-700)]"
          : "border-[var(--border-hairline)] text-[var(--ink-secondary)] hover:bg-[var(--surface-hover)]"
      )}
    >
      {label}
      <span className="tabular-nums opacity-70">{count}</span>
    </Link>
  );
}
