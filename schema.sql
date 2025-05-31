-- TrainDiary Database Schema
CREATE DATABASE IF NOT EXISTS TrainDiary;
-- Users
CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Foods
CREATE TABLE foods (
  food_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  calories_per_serving FLOAT NOT NULL,
  protein_per_serving FLOAT NOT NULL,
  carbs_per_serving FLOAT NOT NULL,
  fat_per_serving FLOAT NOT NULL,
  serving_type VARCHAR(64) NOT NULL, -- e.g. "1 egg", "1 scoop", "1 slice"
  image VARCHAR(255) -- filename of image in /public/Assest
);

-- Exercises
CREATE TABLE exercises (
  exercise_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(64),
  default_sets INT,
  default_reps INT,
  description TEXT
);

-- User Meals (meal log)
CREATE TABLE user_meals (
  meal_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  meal_type VARCHAR(32) NOT NULL, -- breakfast, lunch, dinner, snack
  log_date DATE NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- User Meal Details (foods in a meal)
CREATE TABLE user_meal_details (
  meal_detail_id INT AUTO_INCREMENT PRIMARY KEY,
  meal_id INT NOT NULL,
  food_id INT NOT NULL,
  amount_grams FLOAT NOT NULL, -- actually amount_servings, but keep name for compatibility
  FOREIGN KEY (meal_id) REFERENCES user_meals(meal_id) ON DELETE CASCADE,
  FOREIGN KEY (food_id) REFERENCES foods(food_id)
);

-- Workout Sessions
CREATE TABLE workout_sessions (
  session_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  scheduled_date DATE NOT NULL,
  type VARCHAR(64), -- e.g. Push, Pull, Legs
  notes TEXT,
  completed BOOLEAN DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Session Details (exercises in a session)
CREATE TABLE session_details (
  session_detail_id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  exercise_id INT NOT NULL,
  planned_sets INT,
  planned_reps INT,
  FOREIGN KEY (session_id) REFERENCES workout_sessions(session_id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(exercise_id)
);

-- Exercise Logs (actual performance)
CREATE TABLE exercise_logs (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  session_detail_id INT NOT NULL,
  actual_sets INT NOT NULL,
  actual_reps INT NOT NULL,
  weight_kg FLOAT,
  duration_seconds INT,
  notes TEXT,
  FOREIGN KEY (session_detail_id) REFERENCES session_details(session_detail_id) ON DELETE CASCADE
);

-- Planned split
CREATE TABLE workout_plans (
  plan_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT
);

-- Planned day
CREATE TABLE plan_days (
  plan_day_id INT AUTO_INCREMENT PRIMARY KEY,
  plan_id INT NOT NULL,
  day_number INT NOT NULL, -- 1 for Day 1, 2 for Day 2, etc.
  day_type VARCHAR(64), -- e.g., Push, Pull, Legs
  FOREIGN KEY (plan_id) REFERENCES workout_plans(plan_id) ON DELETE CASCADE
);

-- Planned exercises
CREATE TABLE plan_day_exercises (
  plan_day_exercise_id INT AUTO_INCREMENT PRIMARY KEY,
  plan_day_id INT NOT NULL,
  exercise_id INT NOT NULL,
  sets INT,
  reps INT,
  FOREIGN KEY (plan_day_id) REFERENCES plan_days(plan_day_id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(exercise_id)
);

-- User Progress Summary (weekly/monthly)
CREATE TABLE user_progress_summary (
  summary_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  period_type ENUM('weekly','monthly') NOT NULL,
  period_start DATE NOT NULL,
  total_workouts INT DEFAULT 0,
  total_calories_burned FLOAT DEFAULT 0,
  avg_duration_minutes FLOAT DEFAULT 0,
  total_calories_intake FLOAT DEFAULT 0,
  avg_protein FLOAT DEFAULT 0,
  avg_carbs FLOAT DEFAULT 0,
  avg_fat FLOAT DEFAULT 0,
  UNIQUE KEY (user_id, period_type, period_start),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
); 