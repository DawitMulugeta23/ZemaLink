<?php

switch ($method) {
    case 'GET':
        if (is_numeric($sub) && $subId === 'messages' && $subId2 === '') {
            handleGetMessages($pdo, $auth, (int) $sub);
        }

        if (is_numeric($sub) && $subId === '') {
            handleStreamDetail($pdo, $auth, (int) $sub);
        }

        if ($sub === '') {
            $stmt = $pdo->query(
                "SELECT l.*, u.name AS musician_name 
                 FROM live_streams l 
                 JOIN users u ON l.musician_id = u.id 
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

    $viewerCount = random_int(10, 100);
    $stmt = $pdo->prepare(
        "INSERT INTO live_streams (musician_id, event_id, title, description, cover_image, 
                                  scheduled_at, ticket_required, ticket_price, status, stream_url, viewer_count)
         VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, 'live', ?, ?)"
    );
    $stmt->execute([$user['id'], $eventId, $title, $description, $coverImage,
                    $ticketRequired, $ticketPrice, $streamUrl, $viewerCount]);

    $streamId = (int) $pdo->lastInsertId();

    api_response([
        'success' => true,
        'message' => 'Live stream started',
        'stream_id' => $streamId,
        'status' => 'live',
    ]);
}

function handleUpdateStreamStatus(PDO $pdo, AuthMiddleware $auth, int $streamId): void
{
    $user = $auth->requireApprovedMusician();
    $input = get_json_input();
    $status = $input['status'] ?? 'ended';

    if (!in_array($status, ['live', 'ended'], true)) {
        api_error('Invalid status. Must be: live or ended');
    }

    $stmt = $pdo->prepare("SELECT id FROM live_streams WHERE id = ? AND musician_id = ?");
    $stmt->execute([$streamId, $user['id']]);
    if (!$stmt->fetch()) {
        api_error('Stream not found or unauthorized', 404);
    }

    if ($status === 'live') {
        $viewerCount = random_int(10, 100);
        $streamUrl = $input['stream_url'] ?? null;
        $pdo->prepare("UPDATE live_streams SET status = 'live', stream_url = ?, viewer_count = ? WHERE id = ?")
            ->execute([$streamUrl, $viewerCount, $streamId]);
    } else {
        $pdo->prepare("UPDATE live_streams SET status = 'ended', viewer_count = 0 WHERE id = ?")
            ->execute([$streamId]);
    }

    api_response(['success' => true, 'message' => $status === 'live' ? 'Stream started' : 'Stream ended', 'status' => $status]);
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
        "SELECT m.*, u.name AS user_name, u.role AS user_role
         FROM stream_messages m
         JOIN users u ON m.user_id = u.id
         WHERE m.stream_id = ?
         ORDER BY m.created_at ASC
         LIMIT ?"
    );
    $stmt->execute([$streamId, $limit]);
    api_response(['success' => true, 'messages' => $stmt->fetchAll()]);
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
