CREATE INDEX idx_user_games_user_last_played ON user_games (user_id, last_played);
CREATE INDEX idx_user_achievements_user_earned ON user_achievements (user_id, date_earned);
CREATE INDEX idx_achievements_game ON achievements (game_id);
CREATE INDEX idx_games_account_platform ON games (account_platform);
CREATE INDEX idx_linked_accounts_user ON linked_accounts (user_id);
