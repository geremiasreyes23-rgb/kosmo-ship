/**
 * Kosmo Ship — formatos y etiquetas compartidos de la vertical de
 * paquetería. Mismo criterio que formatClientCode (src/lib/utils.ts): los
 * IDs visibles salen de un autoincremental de Postgres y se muestran con 6
 * dígitos y prefijo, nunca se capturan a mano.
 */
import type { BadgeStatus } from "@/components/ui/Badge";

export type PackageStatusKey =
  | "PREALERTED"
  | "RECEIVED"
  | "ON_HOLD"
  | "CONSOLIDATED"
  | "DISPATCHED"
  | "IN_TRANSIT"
  | "IN_CUSTOMS"
  | "READY"
  | "DELIVERED";

/** "PKG-000123" */
export function formatPackageCode(packageNumber: number): string {
  return `PKG-${String(packageNumber).padStart(6, "0")}`;
}

/** "MAN-000045" */
export function formatManifestCode(manifestNumber: number): string {
  return `MAN-${String(manifestNumber).padStart(6, "0")}`;
}

/** Orden del flujo (ON_HOLD es un desvío, va después de RECEIVED). */
export const PACKAGE_STATUSES: { key: PackageStatusKey; label: string; badge: BadgeStatus }[] = [
  { key: "PREALERTED", label: "Prealertado", badge: "neutral" },
  { key: "RECEIVED", label: "Recibido", badge: "info" },
  { key: "ON_HOLD", label: "Retenido", badge: "critical" },
  { key: "CONSOLIDATED", label: "Consolidado", badge: "info" },
  { key: "DISPATCHED", label: "Despachado", badge: "info" },
  { key: "IN_TRANSIT", label: "En tránsito", badge: "warning" },
  { key: "IN_CUSTOMS", label: "En aduana", badge: "warning" },
  { key: "READY", label: "Listo para entrega", badge: "good" },
  { key: "DELIVERED", label: "Entregado", badge: "good" },
];

const STATUS_BY_KEY = Object.fromEntries(PACKAGE_STATUSES.map((s) => [s.key, s]));

export function packageStatusLabel(status: string): string {
  return STATUS_BY_KEY[status]?.label ?? status;
}

export function packageStatusBadge(status: string): BadgeStatus {
  return STATUS_BY_KEY[status]?.badge ?? "neutral";
}

export function isPackageStatus(value: string | undefined): value is PackageStatusKey {
  return !!value && value in STATUS_BY_KEY;
}

/** Monto en USD con centavos (el cobro por libra los necesita). */
export function formatAmount(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}
