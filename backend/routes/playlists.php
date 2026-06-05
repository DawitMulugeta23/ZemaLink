<?php

switch ($method) {
    case 'GET':
        // GET /api/playlists/{id}/songs
        if (is_numeric($sub) && $subId === 'songs') {
            $playlistId = (int) $sub;

            $stmt = $pdo->prepare("SELECT * FROM playlists WHERE id = ?");
            $stmt->execute([$playlistId]);
            $playlist = $stmt->fetch();

            if (!$playlist) {
                api_error('Playlist not found', 404);
            }

            $userId = $_SESSION['user_id'] ?? 0;
            if ((int) $playlist['user_id'] !== $userId && !$playlist['is_public']) {
                api_error('Access denied', 403);
            }

    $stmt = $pdo->prepare(
        "SELECT s.*, 
                (SELECT COUNT(*) FROM likes WHERE song_id = s.id) as likes_count,
                ps.created_at as added_at,
                u.name as uploader_name
         FROM playlist_songs ps
         JOIN songs s ON ps.song_id = s.id
         LEFT JOIN users u ON s.uploader_id = u.id
         WHERE ps.playlist_id = ? AND s.is_approved = 1
         ORDER BY ps.position ASC, ps.created_at ASC"
    );
            $stmt->execute([$playlistId]);
            $songs = $stmt->fetchAll();

            api_response(['success' => true, 'playlist' => $playlist, 'songs' => $songs]);
        }

        // GET /api/playlists/{id}
        if (is_numeric($sub) && $subId === '') {
            $playlistId = (int) $sub;
            $stmt = $pdo->prepare("SELECT * FROM playlists WHERE id = ?");
            $stmt->execute([$playlistId]);
            $playlist = $stmt->fetch();

            if (!$playlist) {
                api_error('Playlist not found', 404);
            }

            $currentUserId = $_SESSION['user_id'] ?? 0;
            if ((int) $playlist['user_id'] !== $currentUserId && !$playlist['is_public']) {
                api_error('Access denied', 403);
            }

            $stmt = $pdo->prepare("SELECT COUNT(*) FROM playlist_songs WHERE playlist_id = ?");
            $stmt->execute([$playlistId]);
            $playlist['song_count'] = (int) $stmt->fetchColumn();

            api_response(['success' => true, 'playlist' => $playlist]);
        }

        // GET /api/playlists
        if ($sub === '') {
            $currentUserId = $_SESSION['user_id'] ?? 0;
            if ($currentUserId === 0) {
                api_response(['success' => true, 'playlists' => []]);
            }

            $stmt = $pdo->prepare(
                "SELECT p.*, 
                        (SELECT COUNT(*) FROM playlist_songs WHERE playlist_id = p.id) as song_count
                 FROM playlists p 
                 WHERE p.user_id = ?
                 ORDER BY p.created_at DESC"
            );
            $stmt->execute([$currentUserId]);
            api_response(['success' => true, 'playlists' => $stmt->fetchAll()]);
        }

        api_error('Playlist route not found', 404);

    case 'POST':
        $user = $auth->authenticate();

        // POST /api/playlists (create) — also accept /api/playlists/create
        if ($sub === '' || $sub === 'create') {
            $input = get_json_input();
            $name = trim($input['name'] ?? '');
            $isPublic = !empty($input['is_public']) ? 1 : 0;

            if ($name === '') {
                api_error('Playlist name is required');
            }

            $pdo->prepare("INSERT INTO playlists (name, user_id, is_public) VALUES (?, ?, ?)")
                ->execute([$name, $user['id'], $isPublic]);

            api_response(['success' => true, 'id' => $pdo->lastInsertId()]);
        }

        if ($sub === 'add-song') {
            $input = get_json_input();
            $playlistId = (int) ($input['playlist_id'] ?? 0);
            $songId = (int) ($input['song_id'] ?? 0);

            if ($playlistId <= 0 || $songId <= 0) {
                api_error('Playlist ID and Song ID are required');
            }

            $stmt = $pdo->prepare("SELECT id FROM playlists WHERE id = ? AND user_id = ?");
            $stmt->execute([$playlistId, $user['id']]);
            if (!$stmt->fetch()) {
                api_error('Playlist not found', 404);
            }

            $maxPos = $pdo->prepare("SELECT COALESCE(MAX(position), 0) + 1 FROM playlist_songs WHERE playlist_id = ?");
            $maxPos->execute([$playlistId]);
            $nextPos = (int) $maxPos->fetchColumn();

            $check = $pdo->prepare("SELECT id FROM playlist_songs WHERE playlist_id = ? AND song_id = ?");
            $check->execute([$playlistId, $songId]);
            if ($check->fetch()) {
                api_error('Song is already in this playlist');
            }

            $pdo->prepare("INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)")
                ->execute([$playlistId, $songId, $nextPos]);

            api_response(['success' => true, 'message' => 'Song added to playlist']);
        }

        if ($sub === 'remove-song') {
            $input = get_json_input();
            $playlistId = (int) ($input['playlist_id'] ?? 0);
            $songId = (int) ($input['song_id'] ?? 0);

            if ($playlistId <= 0 || $songId <= 0) {
                api_error('Playlist ID and Song ID are required');
            }

            $stmt = $pdo->prepare("SELECT id FROM playlists WHERE id = ? AND user_id = ?");
            $stmt->execute([$playlistId, $user['id']]);
            if (!$stmt->fetch()) {
                api_error('Playlist not found', 404);
            }

            $pdo->prepare("DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?")
                ->execute([$playlistId, $songId]);

            api_response(['success' => true, 'message' => 'Song removed from playlist']);
        }

        api_error('Playlist route not found', 404);

    case 'DELETE':
    case 'PUT':
        $user = $auth->authenticate();

        // DELETE /api/playlists/{id}
        if ($method === 'DELETE' && is_numeric($sub)) {
            $playlistId = (int) $sub;

            $stmt = $pdo->prepare("SELECT id FROM playlists WHERE id = ? AND user_id = ?");
            $stmt->execute([$playlistId, $user['id']]);
            if (!$stmt->fetch()) {
                api_error('Playlist not found', 404);
            }

            $pdo->prepare("DELETE FROM playlist_songs WHERE playlist_id = ?")->execute([$playlistId]);
            $pdo->prepare("DELETE FROM playlists WHERE id = ?")->execute([$playlistId]);

            api_response(['success' => true, 'message' => 'Playlist deleted']);
        }

        // PUT /api/playlists/{id}
        if ($method === 'PUT' && is_numeric($sub)) {
            $playlistId = (int) $sub;
            $input = get_json_input();

            $stmt = $pdo->prepare("SELECT id FROM playlists WHERE id = ? AND user_id = ?");
            $stmt->execute([$playlistId, $user['id']]);
            if (!$stmt->fetch()) {
                api_error('Playlist not found', 404);
            }

            $updates = [];
            $params = [];

            if (isset($input['name'])) {
                $updates[] = 'name = ?';
                $params[] = trim($input['name']);
            }
            if (isset($input['is_public'])) {
                $updates[] = 'is_public = ?';
                $params[] = $input['is_public'] ? 1 : 0;
            }

            if (empty($updates)) {
                api_error('Nothing to update');
            }

            $params[] = $playlistId;
            $pdo->prepare("UPDATE playlists SET " . implode(', ', $updates) . " WHERE id = ?")
                ->execute($params);

            api_response(['success' => true, 'message' => 'Playlist updated']);
        }

        api_error('Playlist route not found', 404);

    default:
        api_error('Method not allowed', 405);
}
