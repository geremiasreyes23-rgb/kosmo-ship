import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, statusToBadgeVariant } from "@/components/ui/Badge";
import { SimpleBarChart } from "@/components/charts/SimpleBarChart";
import { requireUser, hasPermission } from "@/lib/auth";
import { canViewFinance } from "@/lib/finance/access";
import { DashboardViewSwitch } from "@/components/finance/DashboardViewSwitch";
import { FinanceDashboard } from "@/components/finance/FinanceDashboard";
import { getFinancePageData } from "./finance-data";
import { getUpcomingTasksForDashboard, getUpcomingAppointmentsForDashboard } from "./data";
import { getShipDashboard } from "@/lib/ship/data";
import { PACKAGE_STATUSES, formatAmount, packageStatusBadge, packageStatusLabel } from "@/lib/ship/format";
import { formatDate, formatTime } from "@/lib/utils";
import Link from "next/link";
import {
  PackageCheck,
  PackageSearch,
  Warehouse,
  Truck,
  CircleDollarSign,
  AlertTriangle,
  Inbox,
  KeyRound,
  ListTodo,
  CalendarClock,
} from "lucide-react";

export const dynamic = "force-dynamic";

// Kosmo Ship — dashboard general de la operación de paquetería. Reemplaza
// las métricas de seguros heredadas de Kosmo CRM (leads, pólizas,
// comisiones, Turning 65). Se conservan tareas, citas y la segunda vista de
// Control Financiero, que son genéricas.
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; periodo?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  // Segunda vista: Control Financiero (solo con permiso finance:view).
  const financeAllowed = await canViewFinance(user);
  if (financeAllowed && params.vista === "finanzas") {
    const financeData = await getFinancePageData(user, params.periodo);
    return (
      <div>
        <DashboardViewSwitch active="finance" />
        <FinanceDashboard data={financeData} />
      </div>
    );
  }

  const canSeePackages = hasPermission(user, "packages", "view");
  const [ship, upcomingTasks, upcomingAppointments] = await Promise.all([
    canSeePackages ? getShipDashboard() : Promise.resolve(null),
    getUpcomingTasksForDashboard(user),
    getUpcomingAppointmentsForDashboard(user),
  ]);

  const inWarehouse = ship ? ship.byStatus.RECEIVED + ship.byStatus.CONSOLIDATED : 0;
  const onTheWay = ship ? ship.byStatus.DISPATCHED + ship.byStatus.IN_TRANSIT + ship.byStatus.IN_CUSTOMS : 0;
  const statusChart = ship
    ? PACKAGE_STATUSES.map((st) => ({ estado: st.label, paquetes: ship.byStatus[st.key] }))
    : [];

  return (
    <div>
      {financeAllowed && <DashboardViewSwitch active="general" />}
      <PageHeader title="Dashboard" description="Resumen general de la operación" />

      {ship && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            <StatCard label="Recibidos hoy" value={ship.receivedToday} icon={Inbox} />
            <StatCard label="Prealertados" value={ship.byStatus.PREALERTED} icon={PackageSearch} />
            <StatCard label="En almacén" value={inWarehouse} icon={Warehouse} />
            <StatCard label="En camino" value={onTheWay} icon={Truck} />
            <StatCard label="Listos para entrega" value={ship.byStatus.READY} icon={PackageCheck} tone="good" />
            <StatCard label="Retenidos" value={ship.byStatus.ON_HOLD} icon={AlertTriangle} tone="critical" />
            <StatCard label="Entregados" value={ship.byStatus.DELIVERED} icon={PackageCheck} tone="good" />
            <StatCard
              label="Por cobrar"
              value={formatAmount(ship.pendingCollection)}
              icon={CircleDollarSign}
              tone="warning"
            />
            <StatCard label="Casilleros" value={ship.activeLockers} icon={KeyRound} />
            <StatCard label="Manifiestos abiertos" value={ship.openManifests} icon={Truck} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Paquetes recibidos (últimos 14 días)</CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleBarChart data={ship.receivedLast14Days} xKey="dia" yKey="paquetes" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Paquetes por estado</CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleBarChart data={statusChart} xKey="estado" yKey="paquetes" color="#eb6834" />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {ship && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span>Últimos movimientos</span>
                <Link href="/packages" className="text-xs font-medium text-[var(--brand-600)] hover:underline">
                  Ver todos
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {ship.recentPackages.map((p) => (
                <Link
                  key={p.id}
                  href={`/packages?q=${encodeURIComponent(p.code)}`}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-[var(--surface-hover)]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium tabular-nums">{p.code}</p>
                    <p className="truncate text-xs text-[var(--ink-muted)]">
                      {p.clientName} · {p.lockerCode}
                    </p>
                  </div>
                  <Badge status={packageStatusBadge(p.status)}>{packageStatusLabel(p.status)}</Badge>
                </Link>
              ))}
              {ship.recentPackages.length === 0 && <Empty text="Todavía no hay paquetes." />}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="h-4 w-4" /> Tareas pendientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {upcomingTasks.map((t) => (
              <Link
                key={t.id}
                href="/tasks"
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-[var(--surface-hover)]"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.title}</p>
                  <p className="truncate text-xs text-[var(--ink-muted)]">{t.relatedTo}</p>
                </div>
                <Badge status={statusToBadgeVariant(t.priority)}>{t.dueDate ? formatDate(t.dueDate) : "Sin fecha"}</Badge>
              </Link>
            ))}
            {upcomingTasks.length === 0 && <Empty text="No tienes tareas pendientes." />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> Próximas citas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {upcomingAppointments.map((a) => (
              <Link
                key={a.id}
                href="/calendar"
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-[var(--surface-hover)]"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{a.title}</p>
                  <p className="truncate text-xs text-[var(--ink-muted)]">{a.relatedTo}</p>
                </div>
                <Badge status="info">
                  {formatDate(a.startsAt)} · {formatTime(a.startsAt)}
                </Badge>
              </Link>
            ))}
            {upcomingAppointments.length === 0 && <Empty text="No tienes citas próximas." />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-[var(--ink-muted)]">{text}</p>;
}
