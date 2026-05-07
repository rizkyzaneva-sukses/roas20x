-- Pre-migration: convert STAFF role to USER before enum alteration
UPDATE users SET role = 'USER' WHERE role = 'STAFF';
