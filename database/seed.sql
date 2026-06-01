-- ZemaLink Sample Data
USE zemalink;

-- Insert admin user (password: Admin@123)
INSERT INTO users (name, email, password, role, is_approved, email_verified, subscription) VALUES
('Admin User', 'admin@zemalink.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 1, 1, 'premium'),
('John Doe', 'john@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'audience', 1, 1, 'free'),
('Jane Smith', 'jane@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'musician', 1, 1, 'free'),
('Bob Johnson', 'bob@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'musician', 1, 1, 'free'),
('Alice Williams', 'alice@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'audience', 1, 1, 'free');

-- Insert sample songs
INSERT INTO songs (title, artist, album, genre, description, file_path, cover_image, duration, media_type, is_premium, price, is_approved, featured, plays, rating, uploader_id, uploaded_by) VALUES
('Sunrise Melody', 'Jane Smith', 'Morning Vibes', 'pop', 'A cheerful pop track to start your day', '/uploads/audio/sunrise.mp3', 'https://res.cloudinary.com/demo/image/upload/v1/covers/sunrise', 234.5, 'audio', 0, 0, 1, 1, 1500, 4.5, 3, 'Jane Smith'),
('Electric Dreams', 'Bob Johnson', 'Neon Nights', 'electronic', 'An electronic journey through synth waves', '/uploads/audio/electric.mp3', 'https://res.cloudinary.com/demo/image/upload/v1/covers/electric', 312.0, 'audio', 0, 0, 1, 1, 2300, 4.8, 4, 'Bob Johnson'),
('Acoustic Heart', 'Jane Smith', 'Unplugged', 'acoustic', 'Stripped down acoustic guitar ballad', '/uploads/audio/acoustic.mp3', 'https://res.cloudinary.com/demo/image/upload/v1/covers/acoustic', 267.8, 'audio', 0, 0, 1, 0, 890, 4.2, 3, 'Jane Smith'),
('Midnight Jazz', 'Jane Smith', 'Late Night Sessions', 'jazz', 'Smooth jazz for late night relaxation', '/uploads/audio/jazz.mp3', 'https://res.cloudinary.com/demo/image/upload/v1/covers/jazz', 345.2, 'audio', 1, 5.99, 1, 0, 670, 4.6, 3, 'Jane Smith'),
('Rock Anthem', 'Bob Johnson', 'Volume One', 'rock', 'High-energy rock anthem with heavy guitars', '/uploads/audio/rock.mp3', 'https://res.cloudinary.com/demo/image/upload/v1/covers/rock', 289.1, 'audio', 0, 0, 1, 1, 3100, 4.9, 4, 'Bob Johnson'),
('Chill Beats', 'DJ Flow', 'Lo-Fi Study', 'lofi', 'Relaxing lo-fi beats for studying', '/uploads/audio/chill.mp3', 'https://res.cloudinary.com/demo/image/upload/v1/covers/chill', 198.0, 'audio', 0, 0, 1, 0, 4200, 4.7, 4, 'DJ Flow'),
('Ethiopian Sky', 'Jane Smith', 'Heritage', 'world', 'Traditional Ethiopian melodies with modern production', '/uploads/audio/ethiopian.mp3', 'https://res.cloudinary.com/demo/image/upload/v1/covers/ethiopian', 312.5, 'audio', 1, 3.99, 1, 1, 1200, 4.8, 3, 'Jane Smith'),
('Summer Vibes', 'Beach Collective', 'Sunshine EP', 'reggae', 'Tropical reggae beats for summer days', '/uploads/audio/summer.mp3', 'https://res.cloudinary.com/demo/image/upload/v1/covers/summer', 256.3, 'audio', 0, 0, 1, 0, 980, 4.3, 4, 'DJ Flow'),
('Classical Dreams', 'Orchestra Elite', 'Symphony No.1', 'classical', 'A beautiful classical symphony piece', '/uploads/audio/classical.mp3', 'https://res.cloudinary.com/demo/image/upload/v1/covers/classical', 456.0, 'audio', 1, 7.99, 1, 0, 540, 4.5, 3, 'Jane Smith'),
('Hip Hop Flow', 'MC Rhythm', 'Street Poetry', 'hip-hop', 'Lyrical hip hop with conscious bars', '/uploads/audio/hiphop.mp3', 'https://res.cloudinary.com/demo/image/upload/v1/covers/hiphop', 223.4, 'audio', 0, 0, 1, 1, 2700, 4.6, 4, 'Bob Johnson');

-- Insert sample likes
INSERT INTO likes (user_id, song_id) VALUES
(2, 1), (2, 2), (2, 5), (2, 10),
(5, 1), (5, 3), (5, 6), (5, 8);

-- Insert sample playlists
INSERT INTO playlists (name, user_id, is_public) VALUES
('Favorites', 2, 0),
('Workout Mix', 2, 1),
('Chill Evening', 5, 1),
('Road Trip', 5, 0);

-- Insert playlist songs
INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES
(1, 1, 0), (1, 2, 1), (1, 5, 2),
(2, 5, 0), (2, 10, 1),
(3, 6, 0), (3, 3, 1),
(4, 1, 0), (4, 8, 1), (4, 6, 2);

-- Insert sample listening history
INSERT INTO listening_history (user_id, song_id, played_at) VALUES
(2, 1, NOW() - INTERVAL 1 HOUR),
(2, 2, NOW() - INTERVAL 2 HOUR),
(2, 5, NOW() - INTERVAL 3 HOUR),
(5, 1, NOW() - INTERVAL 1 DAY),
(5, 6, NOW() - INTERVAL 2 DAY);

-- Insert sample events
INSERT INTO events (musician_id, title, description, event_date, location, ticket_price, total_tickets, tickets_sold) VALUES
(3, 'Jane Smith Live at Jazz Club', 'An intimate evening of acoustic and jazz performances', '2026-07-15 20:00:00', 'Jazz Club, Addis Ababa', 25.00, 100, 0),
(4, 'Rock Night with Bob Johnson', 'High energy rock concert featuring new tracks', '2026-08-01 21:00:00', 'Millennium Hall, Addis Ababa', 35.00, 500, 0),
(3, 'Heritage Music Festival', 'Celebrating Ethiopian music and culture', '2026-09-10 18:00:00', 'Sheraton Hotel, Addis Ababa', 50.00, 200, 0);

-- Insert sample live streams
INSERT INTO live_streams (musician_id, title, description, scheduled_at, status, viewer_count, ticket_required) VALUES
(3, 'Acoustic Friday Night', 'Unplugged acoustic session with special guests', '2026-06-20 19:00:00', 'scheduled', 0, 0),
(4, 'Studio Session Preview', 'Behind the scenes of our new album recording', '2026-06-25 15:00:00', 'scheduled', 0, 0),
(3, 'Premium Live Concert', 'Exclusive premium content live stream', '2026-07-01 20:00:00', 'scheduled', 0, 1);
