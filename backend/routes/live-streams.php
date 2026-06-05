<?php

switch ($method) {
    case 'GET':
        if (is_numeric($sub) && $subId === 'messages' && $subId2 === '') {
            handleGetMessages($pdo, $auth, (int) $sub);
        }

        if (is_numeric($sub) && $subId === 'replay' && $subId2 === '') {
            handleStreamReplay($pdo, $auth, (int) $sub);
        }

        if (is_numeric($sub) && $subId === '') {
            handleStreamDetail($pdo, $auth, (int) $sub);
        }

        if ($sub === '') {
            // Auto-end stale live streams (started but creator never joined)
            $pdo->exec(
                "UPDATE live_streams SET status = 'ended', viewer_count = 0 
                 WHERE status = 'live' 
                 AND scheduled_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE) 
                 AND stream_url IS NULL"
            );

            $stmt = $pdo->query(
                "SELECT l.*, u.name AS musician_name 
                 FROM live_streams l 
                 JOIN users u ON l.musician_id = u.id 
                 WHERE l.status IN ('live','ended')
                 ORDER BY CASE WHEN l.status = 'live' THEN 1 ELSE 2 END, l.created_at DESC"
            );
            api_response(['success' => true, 'streams' => $stmt->fetchAll()]);
        }

        api_error('Live stream route not found', 404);

    case 'POST':
        if (is_numeric($sub) && $subId === 'status' && $subId2 === '') {
            handleUpdateStreamStatus($pdo, $auth, (int) $sub);
        }

        if (is_numeric($sub) && $subId === 'messages' && $subId2 === '') {
            handlePostMessage($pdo, $auth, (int) $sub);
        }

        if (is_numeric($sub) && $subId === 'video-url' && $subId2 === '') {
            handleSetVideoUrl($pdo, $auth, (int) $sub);
        }

        if ($sub === '') {
            handleCreateStream($pdo, $auth);
        }

        api_error('Live stream route not found', 404);

    case 'DELETE':
        if (is_numeric($sub) && $subId === '') {
            $user = $auth->requireApprovedMusician();
            $streamId = (int) $sub;

            $stmt = $pdo->prepare("SELECT id FROM live_streams WHERE id = ? AND musician_id = ?");
            $stmt->execute([$streamId, $user['id']]);
            if (!$stmt->fetch()) {
                api_error('Stream not found or unauthorized', 404);
            }

            $pdo->prepare("DELETE FROM live_streams WHERE id = ?")->execute([$streamId]);
            api_response(['success' => true, 'message' => 'Stream deleted']);
        }
        api_error('Live stream route not found', 404);

    default:
        api_error('Method not allowed', 405);
}

function handleStreamDetail(PDO $pdo, AuthMiddleware $auth, int $streamId): void
{
    $uid = $_SESSION['user_id'] ?? 0;

    $stmt = $pdo->prepare(
        "SELECT l.*, u.name AS musician_name, u.platform_links
         FROM live_streams l 
         JOIN users u ON l.musician_id = u.id 
         WHERE l.id = ?"
    );
    $stmt->execute([$streamId]);
    $stream = $stmt->fetch();

    if (!$stream) {
        api_error('Live stream not found', 404);
    }

    $hasAccess = true;
    if ($stream['ticket_required'] && $stream['event_id']) {
        if ($uid <= 0) {
            $hasAccess = false;
        } elseif ((int) $stream['musician_id'] !== $uid) {
            $check = $pdo->prepare("SELECT id FROM tickets WHERE user_id = ? AND event_id = ?");
            $check->execute([$uid, (int) $stream['event_id']]);
            $hasAccess = $check->fetch() ? true : false;
        }
    }

    $stream['has_access'] = $hasAccess;
    if ($stream['platform_links']) {
        $decoded = json_decode($stream['platform_links'], true);
        $stream['platform_links'] = is_array($decoded) ? $decoded : [];
    } else {
        $stream['platform_links'] = [];
    }
    api_response(['success' => true, 'stream' => $stream]);
}

function handleCreateStream(PDO $pdo, AuthMiddleware $auth): void
{
    $user = $auth->requireApprovedMusician();
    $input = get_json_input();

    $title = trim($input['title'] ?? '');
    $description = trim($input['description'] ?? '');
    $ticketRequired = !empty($input['ticket_required']) ? 1 : 0;
    $ticketPrice = (float) ($input['ticket_price'] ?? 0);
    $eventId = !empty($input['event_id']) ? (int) $input['event_id'] : null;
    $coverImage = $input['cover_image'] ?? null;
    $streamUrl = $input['stream_url'] ?? null;

    if ($title === '') {
        api_error('Title is required');
    }

    $viewerCount = 0;
    $stmt = $pdo->prepare(
        "INSERT INTO live_streams (musician_id, event_id, title, description, cover_image, 
                                  scheduled_at, ticket_required, ticket_price, status, stream_url, viewer_count)
         VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, 'pending', ?, ?)"
    );
    $stmt->execute([$user['id'], $eventId, $title, $description, $coverImage,
                    $ticketRequired, $ticketPrice, $streamUrl, $viewerCount]);

    $streamId = (int) $pdo->lastInsertId();

    api_response([
        'success' => true,
        'message' => 'Live stream created',
        'stream_id' => $streamId,
        'status' => 'pending',
    ]);
}

function handleUpdateStreamStatus(PDO $pdo, AuthMiddleware $auth, int $streamId): void
{
    $input = get_json_input();
    $action = $input['action'] ?? $input['status'] ?? '';
    $validActions = ['live', 'start', 'ended', 'end', 'join', 'leave'];

    if (!in_array($action, $validActions, true)) {
        api_error('Invalid action. Must be: start, end, join, or leave');
    }

    // Map aliases
    $mode = match ($action) {
        'live', 'start' => 'start',
        'ended', 'end' => 'end',
        'join' => 'join',
        'leave' => 'leave',
    };

    // Get current stream info
    $stmt = $pdo->prepare("SELECT id, musician_id, status FROM live_streams WHERE id = ?");
    $stmt->execute([$streamId]);
    $stream = $stmt->fetch();

    if (!$stream) {
        api_error('Stream not found', 404);
    }

    // Owner-only actions (start/end)
    if (in_array($mode, ['start', 'end'], true)) {
        $user = $auth->requireApprovedMusician();
        if ((int) $stream['musician_id'] !== (int) $user['id']) {
            api_error('Only the stream owner can start or end the stream', 403);
        }

        if ($mode === 'start') {
            if ($stream['status'] === 'ended') {
                api_error('Cannot restart an ended stream');
            }
            $viewerCount = random_int(5, 20);
            $streamUrl = $input['stream_url'] ?? null;
            $pdo->prepare("UPDATE live_streams SET status = 'live', stream_url = ?, viewer_count = ?, scheduled_at = NOW() WHERE id = ?")
                ->execute([$streamUrl, $viewerCount, $streamId]);
            api_response(['success' => true, 'message' => 'Stream started', 'status' => 'live']);
        } else {
            $pdo->prepare("UPDATE live_streams SET status = 'ended', viewer_count = 0 WHERE id = ?")
                ->execute([$streamId]);
            api_response(['success' => true, 'message' => 'Stream ended', 'status' => 'ended']);
        }
        return;
    }

    // Viewer actions (join/leave)
    $user = $auth->authenticate();

    if ($mode === 'join') {
        $pdo->prepare("UPDATE live_streams SET viewer_count = viewer_count + 1 WHERE id = ?")
            ->execute([$streamId]);
        $stmt = $pdo->prepare("SELECT viewer_count FROM live_streams WHERE id = ?");
        $stmt->execute([$streamId]);
        $count = (int) $stmt->fetchColumn();
        api_response(['success' => true, 'message' => 'Joined stream', 'action' => 'join', 'viewer_count' => $count]);
    } else {
        $pdo->prepare("UPDATE live_streams SET viewer_count = GREATEST(0, viewer_count - 1) WHERE id = ?")
            ->execute([$streamId]);
        $stmt = $pdo->prepare("SELECT viewer_count FROM live_streams WHERE id = ?");
        $stmt->execute([$streamId]);
        $count = (int) $stmt->fetchColumn();
        api_response(['success' => true, 'message' => 'Left stream', 'action' => 'leave', 'viewer_count' => $count]);
    }
}

function handleGetMessages(PDO $pdo, AuthMiddleware $auth, int $streamId): void
{
    $uid = $_SESSION['user_id'] ?? 0;
    $limit = min(200, max(1, (int) ($_GET['limit'] ?? 100)));

    $stmt = $pdo->prepare("SELECT musician_id, ticket_required, event_id FROM live_streams WHERE id = ?");
    $stmt->execute([$streamId]);
    $stream = $stmt->fetch();

    if (!$stream) {
        api_error('Stream not found', 404);
    }

    if ($stream['ticket_required'] && $stream['event_id'] && (int) $stream['musician_id'] !== $uid) {
        $check = $pdo->prepare("SELECT id FROM tickets WHERE user_id = ? AND event_id = ?");
        $check->execute([$uid, (int) $stream['event_id']]);
        if (!$check->fetch()) {
            api_error('Ticket required to view messages', 403);
        }
    }

    $stmt = $pdo->prepare(
        "SELECT m.*, u.name AS user_name, u.role AS user_role, u.subscription AS user_subscription
         FROM stream_messages m
         JOIN users u ON m.user_id = u.id
         WHERE m.stream_id = ?
         ORDER BY m.created_at ASC
         LIMIT ?"
    );
    $stmt->execute([$streamId, $limit]);
    api_response(['success' => true, 'messages' => $stmt->fetchAll()]);
}

function handleStreamReplay(PDO $pdo, AuthMiddleware $auth, int $streamId): void
{
    $user = $auth->requireApprovedMusician();

    $stmt = $pdo->prepare(
        "SELECT l.*, u.name AS musician_name
         FROM live_streams l
         JOIN users u ON l.musician_id = u.id
         WHERE l.id = ?"
    );
    $stmt->execute([$streamId]);
    $stream = $stmt->fetch();

    if (!$stream) {
        api_error('Live stream not found', 404);
    }

    if ((int) $stream['musician_id'] !== (int) $user['id']) {
        api_error('Only the stream owner can view the replay', 403);
    }

    if ($stream['platform_links']) {
        $decoded = json_decode($stream['platform_links'], true);
        $stream['platform_links'] = is_array($decoded) ? $decoded : [];
    } else {
        $stream['platform_links'] = [];
    }

    api_response(['success' => true, 'stream' => $stream]);
}

function handleSetVideoUrl(PDO $pdo, AuthMiddleware $auth, int $streamId): void
{
    $user = $auth->requireApprovedMusician();
    $input = get_json_input();
    $videoUrl = $input['video_url'] ?? '';

    $stmt = $pdo->prepare("SELECT id FROM live_streams WHERE id = ? AND musician_id = ?");
    $stmt->execute([$streamId, $user['id']]);
    if (!$stmt->fetch()) {
        api_error('Stream not found or unauthorized', 404);
    }

    $pdo->prepare("UPDATE live_streams SET video_url = ? WHERE id = ?")
        ->execute([$videoUrl, $streamId]);

    api_response(['success' => true, 'message' => 'Video URL saved']);
}

function handlePostMessage(PDO $pdo, AuthMiddleware $auth, int $streamId): void
{
    $user = $auth->authenticate();
    $input = get_json_input();
    $message = trim($input['message'] ?? '');

    if ($message === '') {
        api_error('Message cannot be empty');
    }

    $stmt = $pdo->prepare("SELECT musician_id, ticket_required, event_id FROM live_streams WHERE id = ?");
    $stmt->execute([$streamId]);
    $stream = $stmt->fetch();

    if (!$stream) {
        api_error('Stream not found', 404);
    }

    if ($stream['ticket_required'] && $stream['event_id'] && (int) $stream['musician_id'] !== $user['id']) {
        $check = $pdo->prepare("SELECT id FROM tickets WHERE user_id = ? AND event_id = ?");
        $check->execute([$user['id'], (int) $stream['event_id']]);
        if (!$check->fetch()) {
            api_error('Ticket required to post messages', 403);
        }
    }

    $pdo->prepare("INSERT INTO stream_messages (stream_id, user_id, message) VALUES (?, ?, ?)")
        ->execute([$streamId, $user['id'], $message]);

    api_response(['success' => true, 'message' => 'Message sent']);
}
