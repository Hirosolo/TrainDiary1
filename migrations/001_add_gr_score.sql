-- Add GR score columns to user_progress_summary
ALTER TABLE user_progress_summary
ADD COLUMN total_gr_score FLOAT DEFAULT 0,
ADD COLUMN avg_gr_score FLOAT DEFAULT 0;
