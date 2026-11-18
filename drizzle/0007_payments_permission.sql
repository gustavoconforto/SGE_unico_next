-- Payments split from finance: groups that held finance.view / finance.edit keep the same access to payments
INSERT INTO "access_group_permissions" ("group_id", "codename")
SELECT "group_id", 'payments.' || split_part("codename", '.', 2) FROM "access_group_permissions"
WHERE "codename" IN ('finance.view', 'finance.edit')
ON CONFLICT ("group_id", "codename") DO NOTHING;
