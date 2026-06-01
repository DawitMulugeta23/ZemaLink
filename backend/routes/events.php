<?php

switch ($method) {
    case 'GET':
        if (is_numeric($sub) && $subId === '') {
            $eventId = (int) $sub;

            $stmt = $pdo->prepare(
                "SELECT e.*, u.name AS musician_name 
                 FROM events e 
                 JOIN users u ON e.musician_id = u.id 
                 WHERE e.id = ?"
            );
            $stmt->execute([$eventId]);
            $event = $stmt->fetch();

            if (!$event) {
                api_error('Event not found', 404);
            }

            $ticketsAvailable = (int) $event['total_tickets'] - (int) $event['tickets_sold'];
            $event['tickets_available'] = max(0, $ticketsAvailable);

            $userId = $_SESSION['user_id'] ?? 0;
            if ($userId > 0) {
                $check = $pdo->prepare("SELECT id FROM tickets WHERE user_id = ? AND event_id = ?");
                $check->execute([$userId, $eventId]);
                $event['has_ticket'] = $check->fetch() ? true : false;
            } else {
                $event['has_ticket'] = false;
            }

            api_response(['success' => true, 'event' => $event]);
        }

        if ($sub === '') {
            $page = max(1, (int) ($_GET['page'] ?? 1));
            $limit = min(50, max(1, (int) ($_GET['limit'] ?? ITEMS_PER_PAGE)));
            $offset = ($page - 1) * $limit;
            $upcomingOnly = !isset($_GET['all']) || $_GET['all'] !== 'true';

            $conditions = [];
            $params = [];

            if ($upcomingOnly) {
                $conditions[] = 'e.event_date >= NOW()';
            }

            $where = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';

            $countStmt = $pdo->query("SELECT COUNT(*) FROM events e {$where}");
            $total = (int) ($upcomingOnly ? $countStmt->fetchColumn()
                : $pdo->query("SELECT COUNT(*) FROM events")->fetchColumn());

            if ($upcomingOnly) {
                $countStmt = $pdo->prepare("SELECT COUNT(*) FROM events e WHERE e.event_date >= NOW()");
                $countStmt->execute();
                $total = (int) $countStmt->fetchColumn();
            } else {
                $total = (int) $pdo->query("SELECT COUNT(*) FROM events")->fetchColumn();
            }

            $stmt = $pdo->prepare(
                "SELECT e.*, u.name AS musician_name,
                        (e.total_tickets - e.tickets_sold) as tickets_available
                 FROM events e 
                 JOIN users u ON e.musician_id = u.id 
                 {$where}
                 ORDER BY e.event_date ASC 
                 LIMIT ? OFFSET ?"
            );

            if ($upcomingOnly) {
                $stmt = $pdo->prepare(
                    "SELECT e.*, u.name AS musician_name,
                            (e.total_tickets - e.tickets_sold) as tickets_available
                     FROM events e 
                     JOIN users u ON e.musician_id = u.id 
                     WHERE e.event_date >= NOW()
                     ORDER BY e.event_date ASC 
                     LIMIT ? OFFSET ?"
                );
                $stmt->execute([$limit, $offset]);
            } else {
                $stmt = $pdo->prepare(
                    "SELECT e.*, u.name AS musician_name,
                            (e.total_tickets - e.tickets_sold) as tickets_available
                     FROM events e 
                     JOIN users u ON e.musician_id = u.id 
                     ORDER BY e.event_date ASC 
                     LIMIT ? OFFSET ?"
                );
                $stmt->execute([$limit, $offset]);
            }

            $events = $stmt->fetchAll();

            api_response([
                'success' => true,
                'events' => $events,
                'pagination' => paginate($page, $limit, $total),
            ]);
        }

        api_error('Events route not found', 404);

    case 'POST':
        if ($sub !== '') {
            api_error('Events route not found', 404);
        }
        $user = $auth->requireApprovedMusician();
        $input = get_json_input();

        $title = trim($input['title'] ?? '');
        $description = trim($input['description'] ?? '');
        $eventDate = trim($input['event_date'] ?? '');
        $location = trim($input['location'] ?? 'Virtual (Live Stream)');
        $ticketPrice = (float) ($input['ticket_price'] ?? 0);
        $totalTickets = (int) ($input['total_tickets'] ?? 100);
        $isLiveStream = !empty($input['is_live_stream']) ? 1 : 0;
        $coverImage = $input['cover_image'] ?? null;

        if ($title === '' || $eventDate === '') {
            api_error('Title and event date are required');
        }

        $stmt = $pdo->prepare(
            "INSERT INTO events (musician_id, title, description, event_date, location, 
                                cover_image, ticket_price, total_tickets, is_live_stream)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([$user['id'], $title, $description, $eventDate, $location,
                        $coverImage, $ticketPrice, $totalTickets, $isLiveStream]);

        api_response([
            'success' => true,
            'message' => 'Event created successfully',
            'event_id' => (int) $pdo->lastInsertId(),
        ]);

    case 'DELETE':
        $user = $auth->requireApprovedMusician();
        $eventId = is_numeric($sub) ? (int) $sub : 0;

        if ($eventId <= 0) {
            api_error('Event ID is required');
        }

        $stmt = $pdo->prepare("SELECT id FROM events WHERE id = ? AND musician_id = ?");
        $stmt->execute([$eventId, $user['id']]);
        if (!$stmt->fetch()) {
            api_error('Event not found or unauthorized', 404);
        }

        $pdo->prepare("DELETE FROM events WHERE id = ?")->execute([$eventId]);
        api_response(['success' => true, 'message' => 'Event deleted']);

    default:
        api_error('Method not allowed', 405);
}
