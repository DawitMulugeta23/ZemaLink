CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('audience', 'musician', 'admin') NOT NULL DEFAULT 'audience',
    is_approved TINYINT(1) NOT NULL DEFAULT 1,
    bio TEXT NULL,
    profile_image VARCHAR(500) NULL,
    genre VARCHAR(80) NULL,
    subscription ENUM('free', 'premium') DEFAULT 'free',
    subscription_expires DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);