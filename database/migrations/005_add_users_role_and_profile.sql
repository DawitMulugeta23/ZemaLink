-- ZemaLink: add columns expected by backend/index.php and models/User.php.
-- Run this once in phpMyAdmin or: mysql -u root zema_music < 005_add_users_role_and_profile.sql
-- If a line errors with "Duplicate column", skip that line (already applied).

ALTER TABLE users
    ADD COLUMN role ENUM('audience', 'musician', 'admin') NOT NULL DEFAULT 'audience' AFTER password;

ALTER TABLE users
    ADD COLUMN is_approved TINYINT(1) NOT NULL DEFAULT 1 AFTER role;

ALTER TABLE users
    ADD COLUMN bio TEXT NULL AFTER is_approved;

ALTER TABLE users
    ADD COLUMN profile_image VARCHAR(500) NULL AFTER bio;

ALTER TABLE users
    ADD COLUMN genre VARCHAR(80) NULL AFTER profile_image;
