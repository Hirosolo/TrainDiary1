import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMeals, getSessions } from '../api';
import Navbar from '../components/NavBar/NavBar';
import styles from './Dashboard.module.css';
import { Navigate } from 'react-router-dom';

let externalRefresh: (() => void) | null = null;

const Dashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      const [meals, sessions] = await Promise.all([
        getMeals(user.user_id),
        getSessions(user.user_id)
      ]);
      // Only count completed sessions
      const completedSessions = sessions.filter((s: any) => s.completed);
      // Calculate total workouts
      const total_workouts = completedSessions.length;
      // Calculate food summary
      let total_calories_intake = 0, total_protein = 0, total_carbs = 0, total_fat = 0, mealCount = 0;
      // Fetch all meal details in parallel
      const mealDetailsArr = await Promise.all(meals.map((meal: any) =>
        fetch(`http://localhost:4000/api/foods/meals/${meal.meal_id}`).then(res => res.json())
      ));
      for (const mealDetails of mealDetailsArr) {
        if (mealDetails.length > 0) mealCount++;
        for (const food of mealDetails) {
          total_calories_intake += (food.calories_per_serving * food.amount_grams);
          total_protein += (food.protein_per_serving * food.amount_grams);
          total_carbs += (food.carbs_per_serving * food.amount_grams);
          total_fat += (food.fat_per_serving * food.amount_grams);
        }
      }
      setSummary({
        total_workouts,
        total_calories_intake: total_calories_intake.toFixed(1),
        avg_protein: mealCount ? (total_protein / mealCount).toFixed(1) : 0,
        avg_carbs: mealCount ? (total_carbs / mealCount).toFixed(1) : 0,
        avg_fat: mealCount ? (total_fat / mealCount).toFixed(1) : 0,
      });
      setLoading(false);
    };
    if (user && !authLoading) fetchData();
  }, [user, authLoading]);

  if (authLoading) return <div className="dashboard-container">Loading user...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (loading) return <div className="dashboard-container">Loading summary...</div>;
  if (!summary) return <div className="dashboard-container">No summary data available. Please log a workout or meal.</div>;

  return (
    <div className={styles['dashboard-bg']}>
      <Navbar />
      <div className={styles['dashboard-content']}>
        <h2 className={styles['dashboard-title']}>Your Weekly Progress</h2>
        <div className={styles['dashboard-cards']}>
          <div className={styles['dashboard-card']}>
            <h3>Total Workouts</h3>
            <div className={styles['dashboard-value']}>{summary?.total_workouts ?? 0}</div>
          </div>
          <div className={styles['dashboard-card']}>
            <h3>Total Calories Intake</h3>
            <div className={styles['dashboard-value']}>{summary?.total_calories_intake ?? 0}</div>
          </div>
          <div className={styles['dashboard-card']}>
            <h3>Avg Protein</h3>
            <div className={styles['dashboard-value']}>{summary?.avg_protein ?? 0}</div>
          </div>
          <div className={styles['dashboard-card']}>
            <h3>Avg Carbs</h3>
            <div className={styles['dashboard-value']}>{summary?.avg_carbs ?? 0}</div>
          </div>
          <div className={styles['dashboard-card']}>
            <h3>Avg Fat</h3>
            <div className={styles['dashboard-value']}>{summary?.avg_fat ?? 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { externalRefresh };
export default Dashboard; 