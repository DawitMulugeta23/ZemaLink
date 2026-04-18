USE zema_music;

-- Insert sample songs
INSERT INTO songs (title, artist, album, duration, cover_image, plays, created_at) VALUES
('Blinding Lights', 'The Weeknd', 'After Hours', 200, 'https://picsum.photos/id/100/300/300', 1500, NOW()),
('Levitating', 'Dua Lipa', 'Future Nostalgia', 203, 'https://picsum.photos/id/101/300/300', 1200, NOW()),
('Stay', 'The Kid LAROI', 'F*ck Love', 189, 'https://picsum.photos/id/102/300/300', 980, NOW()),
('Save Your Tears', 'The Weeknd', 'After Hours', 215, 'https://picsum.photos/id/103/300/300', 850, NOW()),
('Good 4 U', 'Olivia Rodrigo', 'Sour', 178, 'https://picsum.photos/id/104/300/300', 720, NOW()),
('Peaches', 'Justin Bieber', 'Justice', 198, 'https://picsum.photos/id/105/300/300', 690, NOW()),
('Kiss Me More', 'Doja Cat', 'Planet Her', 208, 'https://picsum.photos/id/106/300/300', 540, NOW()),
('Montero', 'Lil Nas X', 'Montero', 197, 'https://picsum.photos/id/107/300/300', 480, NOW()),
('Bad Habits', 'Ed Sheeran', '=', 191, 'https://picsum.photos/id/108/300/300', 430, NOW()),
('Heat Waves', 'Glass Animals', 'Dreamland', 238, 'https://picsum.photos/id/109/300/300', 390, NOW());

-- Verify songs were added
SELECT COUNT(*) as total_songs FROM songs;