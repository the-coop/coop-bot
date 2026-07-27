-- Coopdle (collaborative Wordle) tables, MySQL 8.
--
-- Run against the bot database before deploying the minigame, and fold into
-- coop-shared/db/schema.sql when that repo is next updated. Charset/collation
-- must match `users`, every player column is a foreign key onto its discord_id.
--
--   yarn db < db/coopdle.sql
--
-- Lifecycle: a board lives in coopdle_games with its guesses in coopdle_guesses.
-- When the board finishes, the guesses are deleted (they are working state, not
-- history) and what remains is the finished game row plus the per-player running
-- totals in coopdle_stats.

SET NAMES utf8mb4;

-- One shared board. Status is PLAYING while the community is guessing, then
-- WON (someone got the word), LOST (guesses ran out) or EXPIRED (nobody finished
-- it in time). Total solved = COUNT(*) WHERE status = 'WON'.
CREATE TABLE IF NOT EXISTS `coopdle_games` (
  `id`           INT NOT NULL AUTO_INCREMENT,
  `message_link` VARCHAR(512),
  `answer`       CHAR(5) NOT NULL,
  `max_guesses`  INT NOT NULL DEFAULT 8,
  `status`       VARCHAR(16) NOT NULL DEFAULT 'PLAYING',
  `solver_id`    VARCHAR(255),
  `guesses_used` INT NOT NULL DEFAULT 0,
  `players_num`  INT NOT NULL DEFAULT 0,
  `started_at`   BIGINT,
  `ended_at`     BIGINT,
  PRIMARY KEY (`id`),
  UNIQUE KEY `coopdle_games_message_link_key` (`message_link`),
  KEY `coopdle_games_status` (`status`),
  KEY `coopdle_games_solver_id` (`solver_id`),
  CONSTRAINT `coopdle_games_solver_fk` FOREIGN KEY (`solver_id`) REFERENCES `users` (`discord_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The guesses on the current board, oldest first. `score` is one character per
-- tile (C correct, P present, A absent) and `revealed` counts how many facts the
-- guess added to what the board already knew - zero means it told the community
-- nothing new. Rows are deleted once the game ends.
CREATE TABLE IF NOT EXISTS `coopdle_guesses` (
  `id`         INT NOT NULL AUTO_INCREMENT,
  `game_id`    INT NOT NULL,
  `guess_no`   INT NOT NULL,
  `player_id`  VARCHAR(255),
  `username`   VARCHAR(255),
  `word`       CHAR(5) NOT NULL,
  `score`      CHAR(5) NOT NULL,
  `revealed`   INT NOT NULL DEFAULT 0,
  `guessed_at` BIGINT,
  PRIMARY KEY (`id`),
  UNIQUE KEY `coopdle_guesses_turn_key` (`game_id`, `guess_no`),
  KEY `coopdle_guesses_player_id` (`player_id`),
  CONSTRAINT `coopdle_guesses_game_fk` FOREIGN KEY (`game_id`) REFERENCES `coopdle_games` (`id`) ON DELETE CASCADE,
  CONSTRAINT `coopdle_guesses_player_fk` FOREIGN KEY (`player_id`) REFERENCES `users` (`discord_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Running totals per player, the part that outlives the boards.
--   guesses         every valid guess they have played
--   correct_guesses guesses that revealed something new for the community
--   solves          boards they personally landed the answer on
--   games/wins/     boards they contributed at least one guess to, and how
--   losses          those boards ended
--   best_solve      fewest guesses used on a board they solved
CREATE TABLE IF NOT EXISTS `coopdle_stats` (
  `id`              INT NOT NULL AUTO_INCREMENT,
  `player_id`       VARCHAR(255) NOT NULL,
  `username`        VARCHAR(255),
  `guesses`         INT NOT NULL DEFAULT 0,
  `correct_guesses` INT NOT NULL DEFAULT 0,
  `solves`          INT NOT NULL DEFAULT 0,
  `games`           INT NOT NULL DEFAULT 0,
  `wins`            INT NOT NULL DEFAULT 0,
  `losses`          INT NOT NULL DEFAULT 0,
  `best_solve`      INT,
  `last_played`     BIGINT,
  PRIMARY KEY (`id`),
  UNIQUE KEY `coopdle_stats_player_id_key` (`player_id`),
  KEY `coopdle_stats_solves` (`solves`),
  CONSTRAINT `coopdle_stats_player_fk` FOREIGN KEY (`player_id`) REFERENCES `users` (`discord_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
