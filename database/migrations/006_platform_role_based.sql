-- Role-based platform: songs approval, premium, purchases, payments, reports, history
-- Run after existing migrations; safe to re-run only if your tool supports IF NOT EXISTS.

ALTER TABLE songs
    ADD COLUMN IF NOT EXISTS is_premium TINYINT(1) NOT NULL DEFAULT 0;
-- MySQL < 8.0.12 has no IF NOT EXISTS on ADD COLUMN — use ensure_platform_schema in PHP instead.

-- Manual alternative (run once; ignore duplicate column errors):
-- ALTER TABLE songs ADD COLUMN is_premium TINYINT(1) NOT NULL DEFAULT 0;
-- ALTER TABLE songs ADD COLUMN price DECIMAL(10,2) NOT NULL DEFAULT 0;
-- ALTER TABLE songs ADD COLUMN is_approved TINYINT(1) NOT NULL DEFAULT 1;
-- ALTER TABLE songs ADD COLUMN featured TINYINT(1) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    song_id INT NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_type ENUM('song', 'subscription') NOT NULL DEFAULT 'song',
    status ENUM('completed', 'failed', 'pending') NOT NULL DEFAULT 'completed',
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS user_purchases (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    song_id INT NOT NULL,
    payment_id INT NULL,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_song (user_id, song_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    reported_by INT NOT NULL,
    song_id INT NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('open', 'reviewed', 'dismissed') NOT NULL DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS listening_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    song_id INT NOT NULL,
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
);
