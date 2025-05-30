-- Seed data for foods
INSERT INTO foods (name, calories_per_serving, protein_per_serving, carbs_per_serving, fat_per_serving, serving_type, image) VALUES
('Egg', 70, 6, 1, 5, '1 egg', 'egg.png'),
('Chicken Breast', 120, 22, 0, 2, '100g', 'chicken_breast.png'),
('Brown Rice', 215, 5, 45, 2, '1 cup cooked', 'brown_rice.png'),
('Broccoli', 30, 2.5, 6, 0.3, '1 cup chopped', 'broccoli.png'),
('Banana', 105, 1.3, 27, 0.3, '1 medium', 'banana.png'),
('Whey Protein', 120, 24, 3, 1.5, '1 scoop', 'whey_protein.png'),
('Olive Oil', 119, 0, 0, 14, '1 tbsp', 'olive_oil.png'),
('Almonds', 160, 6, 6, 14, '28g (about 23)', 'almonds.png'),
('Greek Yogurt', 100, 17, 6, 0, '170g (6oz)', 'greek_yogurt.png'),
('Oats', 150, 5, 27, 3, '1/2 cup dry', 'oats.png');

-- Seed data for exercises
INSERT INTO exercises (name, category, default_sets, default_reps, description) VALUES
('Bench Press', 'Chest', 4, 8, 'Barbell bench press for chest strength.'),
('Squat', 'Legs', 4, 10, 'Barbell back squat for legs and glutes.'),
('Deadlift', 'Back', 3, 6, 'Barbell deadlift for posterior chain.'),
('Pull Up', 'Back', 3, 8, 'Bodyweight pull ups for back and biceps.'),
('Push Up', 'Chest', 3, 15, 'Bodyweight push ups for chest and triceps.'),
('Shoulder Press', 'Shoulders', 3, 10, 'Dumbbell or barbell shoulder press.'),
('Bicep Curl', 'Arms', 3, 12, 'Dumbbell bicep curls.'),
('Tricep Extension', 'Arms', 3, 12, 'Dumbbell or cable tricep extensions.'),
('Plank', 'Core', 3, 60, 'Hold plank position for time (seconds).'),
('Lunge', 'Legs', 3, 12, 'Dumbbell or bodyweight lunges.'); 