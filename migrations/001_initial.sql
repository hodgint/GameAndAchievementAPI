-- Game and Achievement API — initial schema

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(128) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
);

CREATE TABLE IF NOT EXISTS platforms (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  name VARCHAR(128) NOT NULL,
  description TEXT,
  UNIQUE KEY uq_platforms_name (name)
);

CREATE TABLE IF NOT EXISTS games (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(512) NOT NULL,
  platform_id BIGINT UNSIGNED NULL,
  account_platform ENUM('xbox', 'steam', 'retro', 'psn') NOT NULL,
  external_id VARCHAR(128) NOT NULL,
  description TEXT,
  publisher VARCHAR(255),
  developer VARCHAR(255),
  release_date DATE NULL,
  image_url VARCHAR(1024),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_games_account_ext (account_platform, external_id),
  FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS achievements (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  game_id BIGINT UNSIGNED NOT NULL,
  platform ENUM('xbox', 'steam', 'retro', 'psn') NOT NULL,
  external_id VARCHAR(128) NOT NULL,
  name VARCHAR(512) NOT NULL,
  description TEXT,
  image_url VARCHAR(1024),
  achievement_type VARCHAR(32),
  points INT NOT NULL DEFAULT 0,
  sort_order INT NULL,
  metadata JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_achievements_platform_game_ext (platform, game_id, external_id),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS linked_accounts (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  platform ENUM('xbox', 'steam', 'retro', 'psn') NOT NULL,
  external_user_id VARCHAR(255) NOT NULL,
  external_username VARCHAR(255),
  credentials_encrypted TEXT NOT NULL,
  linked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_linked_accounts_user_platform (user_id, platform),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_games (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  game_id BIGINT UNSIGNED NOT NULL,
  date_owned DATE NULL,
  playtime INT UNSIGNED NOT NULL DEFAULT 0,
  last_played TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_games_user_game (user_id, game_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  achievement_id BIGINT UNSIGNED NOT NULL,
  date_earned TIMESTAMP NOT NULL,
  progress INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_achievements_user_achievement (user_id, achievement_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sync_state (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  platform ENUM('xbox', 'steam', 'retro', 'psn') NOT NULL,
  last_sync_at TIMESTAMP NULL,
  cursor_data VARCHAR(512) NULL,
  status ENUM('idle', 'running', 'success', 'error') NOT NULL DEFAULT 'idle',
  error_message TEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sync_state_user_platform (user_id, platform),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT IGNORE INTO platforms (name, description) VALUES
  ('RetroAchievements', 'RetroAchievements.org console titles'),
  ('Steam', 'Steam PC titles'),
  ('Xbox', 'Xbox titles'),
  ('PlayStation', 'PlayStation titles');
