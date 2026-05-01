<?php

function zemalink_table_exists(PDO $pdo, string $schema, string $table): bool {
    $stmt = $pdo->prepare(
        "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?"
    );
    $stmt->execute([$schema, $table]);
    return (int) $stmt->fetchColumn() > 0;
}

function zemalink_column_exists(PDO $pdo, string $schema, string $table, string $column): bool {
    $stmt = $pdo->prepare(
        "SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?"
    );
    $stmt->execute([$schema, $table, $column]);
    return (int) $stmt->fetchColumn() > 0;
}

function zemalink_index_exists(PDO $pdo, string $schema, string $table, string $indexName): bool {
    $stmt = $pdo->prepare(
        "SELECT COUNT(*) FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?"
    );
    $stmt->execute([$schema, $table, $indexName]);
    return (int) $stmt->fetchColumn() > 0;
}

function ensure_platform_schema(PDO $pdo): void {
    try {
        $dbRow = $pdo->query('SELECT DATABASE() AS db')->fetch();
        $schema = $dbRow['db'] ?? '';
        if ($schema === '') {
            return;
        }

        $col = function (string $t, string $c) use ($pdo, $schema): bool {
            return zemalink_column_exists($pdo, $schema, $t, $c);
        };

        if (!$col('songs', 'is_premium')) {
            $pdo->exec('ALTER TABLE songs ADD COLUMN is_premium TINYINT(1) NOT NULL DEFAULT 0');
        }
        if (!$col('songs', 'price')) {
            $pdo->exec('ALTER TABLE songs ADD COLUMN price DECIMAL(10,2) NOT NULL DEFAULT 0');
        }
        if (!$col('songs', 'is_approved')) {
            $pdo->exec('ALTER TABLE songs ADD COLUMN is_approved TINYINT(1) NOT NULL DEFAULT 0');
        }
        if (!$col('songs', 'featured')) {
            $pdo->exec('ALTER TABLE songs ADD COLUMN featured TINYINT(1) NOT NULL DEFAULT 0');
        }
        if (!$col('songs', 'genre')) {
            $pdo->exec("ALTER TABLE songs ADD COLUMN genre VARCHAR(60) NULL");
        }
        if (!$col('songs', 'media_type')) {
            $pdo->exec("ALTER TABLE songs ADD COLUMN media_type VARCHAR(20) DEFAULT 'audio'");
        }
        if (!$col('songs', 'rating')) {
            $pdo->exec("ALTER TABLE songs ADD COLUMN rating DECIMAL(3,1) DEFAULT 0");
        }
        
        // Compatibility: some DBs use uploaded_by, others use uploader_id.
        if (!$col('songs', 'uploader_id') && $col('songs', 'uploaded_by')) {
            $pdo->exec('ALTER TABLE songs ADD COLUMN uploader_id INT NULL');
            $pdo->exec('UPDATE songs SET uploader_id = uploaded_by WHERE uploader_id IS NULL');
        }
        if (!$col('songs', 'uploaded_by') && $col('songs', 'uploader_id')) {
            $pdo->exec('ALTER TABLE songs ADD COLUMN uploaded_by INT NULL');
            $pdo->exec('UPDATE songs SET uploaded_by = uploader_id WHERE uploaded_by IS NULL');
        }

        if (!zemalink_table_exists($pdo, $schema, 'payments')) {
            $pdo->exec("CREATE TABLE payments (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                song_id INT NULL,
                amount DECIMAL(10,2) NOT NULL DEFAULT 0,
                payment_type ENUM('song', 'subscription') NOT NULL DEFAULT 'song',
                status ENUM('completed', 'failed', 'pending') NOT NULL DEFAULT 'completed',
                payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        }

        if (!zemalink_table_exists($pdo, $schema, 'user_purchases')) {
            $pdo->exec("CREATE TABLE user_purchases (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                song_id INT NOT NULL,
                payment_id INT NULL,
                purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_user_song (user_id, song_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
                FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        }

        if (!zemalink_table_exists($pdo, $schema, 'reports')) {
            $pdo->exec("CREATE TABLE reports (
                id INT PRIMARY KEY AUTO_INCREMENT,
                reported_by INT NOT NULL,
                song_id INT NOT NULL,
                reason TEXT NOT NULL,
                status ENUM('open', 'reviewed', 'dismissed') NOT NULL DEFAULT 'open',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        }

        if (!zemalink_table_exists($pdo, $schema, 'listening_history')) {
            $pdo->exec("CREATE TABLE listening_history (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                song_id INT NOT NULL,
                played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        }

        if (!zemalink_table_exists($pdo, $schema, 'song_views')) {
            $pdo->exec("CREATE TABLE song_views (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                song_id INT NOT NULL,
                first_viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_song_views_user_song (user_id, song_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        }

        // Enforce one-like-per-user-per-song at DB level.
        if (zemalink_table_exists($pdo, $schema, 'likes')
            && !zemalink_index_exists($pdo, $schema, 'likes', 'uq_likes_user_song')) {
            $pdo->exec('DELETE l1 FROM likes l1 INNER JOIN likes l2
                        WHERE l1.id > l2.id AND l1.user_id = l2.user_id AND l1.song_id = l2.song_id');
            $pdo->exec('ALTER TABLE likes ADD UNIQUE KEY uq_likes_user_song (user_id, song_id)');
        }
    } catch (Throwable $e) {
        error_log('ensure_platform_schema: ' . $e->getMessage());
    }
}