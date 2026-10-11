import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { requireUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UsersPanel } from "@/components/settings/UsersPanel";
import { MailSettingsPanel } from "@/components/settings/MailSettingsPanel";
import { getMailAdminOverview } from "./mail-settings-actions";
import { getAuditLogEntries } from "./audit-data";
import { AuditLogPanel } from "@/components/settings/AuditLogPanel";
import { RolePermissionsPanel } from "@/components/settings/RolePermissionsPanel";
import { UserVisibilityPanel } from "@/components/settings/UserVisibilityPanel";
import { NotificationSettingsPanel, type NotificationSettingRow } from "@/components/settings/NotificationSettingsPanel";
import { NOTIFICATION_SETTINGS } from "@/lib/notificationSettings";

export const dynamic = "force-dynamic";

// Kosmo Ship — Configuración sin las pestañas del CRM de seguros (pipelines,
// líneas de negocio, tabla de comisiones, campos personalizados de leads,
// carriers y orígenes de leads). Los catálogos de envíos (destinos y
// tarifas) se agregan aquí como pestañas propias.
// Notificaciones automáticas que solo tienen sentido para seguros: se
// ocultan del panel (sin clientes con pólizas no se disparan).
const INSURANCE_ONLY_NOTIFICATIONS = ["turning_65", "chargeback", "documentation_pending"];

const ROLE_DESCRIPTIONS: Record<string, string> = {
  "Super Admin": "Acceso total al sistema, incluida la gestión de usuarios y roles",
  Admin: "Administración de la plataforma: usuarios, configuración, todos los módulos",
  Manager: "Visualización y administración de su equipo",
  Agent: "Operación diaria: paquetes, tareas y comunicación",
  Viewer: "Solo lectura",
};

export default async function SettingsPage() {
  const currentUser = await requireUser();
  const isManager = currentUser.roleName === "Super Admin" || currentUser.roleName === "Admin";
  const canManageMail = hasPermission(currentUser, "mail", "admin");
  const canViewAudit = hasPermission(currentUser, "audit", "view");

  const [
    dbRoles,
    dbUsers,
    mailAdminOverview,
    auditEntries,
    dbPermissions,
    dbRolePermissions,
    dbModuleVisibility,
    dbNotificationSettings,
    dbVisibilityOverrides,
  ] = await Promise.all([
      prisma.role.findMany({ orderBy: { createdAt: "asc" } }),
      isManager
        ? prisma.user.findMany({
            include: { role: true },
            orderBy: [{ status: "asc" }, { firstName: "asc" }],
          })
        : Promise.resolve([]),
      canManageMail ? getMailAdminOverview() : Promise.resolve(null),
      canViewAudit ? getAuditLogEntries() : Promise.resolve([]),
      // Roles y permisos / Visibilidad de módulos — solo se traen si el
      // usuario puede editarlos (isManager), igual que dbUsers arriba, para
      // no armar la matriz completa de permisos en el servidor para
      // cuentas que de todas formas no van a poder tocarla.
      isManager ? prisma.permission.findMany({ orderBy: [{ resource: "asc" }, { action: "asc" }] }) : Promise.resolve([]),
      isManager ? prisma.rolePermission.findMany({ select: { roleId: true, permissionId: true } }) : Promise.resolve([]),
      isManager ? prisma.roleModuleVisibility.findMany({ where: { visible: true }, select: { roleId: true, moduleKey: true } }) : Promise.resolve([]),
      prisma.notificationSetting.findMany(),
      isManager ? prisma.userVisibilityOverride.findMany() : Promise.resolve([]),
    ]);

  const roleOptions = dbRoles.map((r) => ({ id: r.id, name: r.name }));
  const userRows = dbUsers.map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    status: u.status,
    roleId: u.roleId,
    roleName: u.role.name,
    supervisorId: u.supervisorId ?? "",
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
  }));

  const permissionRows = dbPermissions.map((p) => ({ id: p.id, resource: p.resource, action: p.action }));
  const roleGrants: Record<string, string[]> = {};
  for (const rp of dbRolePermissions) {
    (roleGrants[rp.roleId] ??= []).push(rp.permissionId);
  }
  const roleModuleVisibilityMap: Record<string, string[]> = {};
  for (const mv of dbModuleVisibility) {
    (roleModuleVisibilityMap[mv.roleId] ??= []).push(mv.moduleKey);
  }
  const roleRows = dbRoles.map((r) => ({ id: r.id, name: r.name, isSystem: r.isSystem, description: r.description }));


  const notificationSettingValues: Record<string, NotificationSettingRow> = {};
  for (const row of dbNotificationSettings) {
    notificationSettingValues[row.type] = { type: row.type, enabled: row.enabled, thresholdValue: row.thresholdValue };
  }

  return (
    <div>
      <PageHeader title="Configuración" />
      <Card>
        <CardContent className="pt-5">
          <Tabs
            tabs={[
              {
                id: "roles",
                label: "Roles y permisos",
                content: isManager ? (
                  <RolePermissionsPanel
                    roles={roleRows}
                    permissions={permissionRows}
                    grants={roleGrants}
                    moduleVisibility={roleModuleVisibilityMap}
                    currentRoleName={currentUser.roleName}
                  />
                ) : (
                  <div className="space-y-2">
                    {dbRoles.map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-lg border border-[var(--border-hairline)] px-3 py-2.5 text-sm">
                        <div>
                          <p className="font-medium">{r.name}</p>
                          <p className="text-xs text-[var(--ink-muted)]">
                            {r.description ?? ROLE_DESCRIPTIONS[r.name] ?? "—"}
                          </p>
                        </div>
                        <Badge status="neutral">{r.isSystem ? "Rol base" : "Personalizado"}</Badge>
                      </div>
                    ))}
                    <p className="pt-1 text-xs text-[var(--ink-muted)]">
                      Solo Admin y Super Admin pueden editar permisos y visibilidad de módulos.
                    </p>
                  </div>
                ),
              },
              ...(canManageMail && mailAdminOverview
                ? [
                    {
                      id: "internal_mail",
                      label: "Correo interno",
                      content: (
                        <MailSettingsPanel
                          overview={mailAdminOverview}
                          userOptions={dbUsers.map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}` }))}
                        />
                      ),
                    },
                  ]
                : []),
              {
                id: "users",
                label: "Usuarios",
                content: isManager ? (
                  <UsersPanel initialUsers={userRows} roles={roleOptions} currentUserId={currentUser.id} />
                ) : (
                  <p className="text-sm text-[var(--ink-muted)]">
                    No tienes permiso para gestionar usuarios. Solo Admin y Super Admin pueden hacerlo.
                  </p>
                ),
              },
              ...(isManager
                ? [
                    {
                      id: "user-visibility",
                      label: "Visibilidad por usuario",
                      content: (
                        <UserVisibilityPanel
                          users={dbUsers
                            .filter((u) => u.status === "ACTIVE")
                            .map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}`, roleId: u.roleId, roleName: u.role.name }))}
                          roleModuleVisibility={roleModuleVisibilityMap}
                          overrides={(dbVisibilityOverrides as { userId: string; key: string; visible: boolean }[]).reduce<Record<string, Record<string, boolean>>>((acc, o) => {
                            (acc[o.userId] ??= {})[o.key] = o.visible;
                            return acc;
                          }, {})}
                          currentRoleName={currentUser.roleName}
                        />
                      ),
                    },
                  ]
                : []),
              {
                id: "notifications",
                label: "Notificaciones",
                content: (
                  <NotificationSettingsPanel
                    defs={NOTIFICATION_SETTINGS.filter((d) => !INSURANCE_ONLY_NOTIFICATIONS.includes(d.type))}
                    initialValues={notificationSettingValues}
                    canManage={isManager}
                  />
                ),
              },
              ...(canViewAudit
                ? [
                    {
                      id: "audit",
                      label: "Auditoría",
                      content: <AuditLogPanel entries={auditEntries} />,
                    },
                  ]
                : []),
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
