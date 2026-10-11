-- Kosmo Ship — módulo "Paquetes" en el menú lateral.
-- Las bases nuevas lo reciben del seed (NAV_MODULE_KEYS); esto lo agrega,
-- visible, para los roles que ya existen. Super Admin no depende de esta
-- tabla (ve todos los módulos).
INSERT INTO "RoleModuleVisibility" ("roleId", "moduleKey", "visible")
SELECT r."id", '/packages', true FROM "Role" r
ON CONFLICT ("roleId", "moduleKey") DO NOTHING;
