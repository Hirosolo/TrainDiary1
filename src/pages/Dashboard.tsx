import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSummary } from '../api';
import Navbar from '../components/NavBar/NavBar';
import styles from './Dashboard.module.css';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      getSummary({ user_id: user.user_id, period_type: 'weekly', period_start: new Date().toISOString().slice(0, 10) })
        .then(setSummary)
        .finally(() => setLoading(false));
    }
  }, [user]);

  if (loading) return <div className="dashboard-container">Loading summary...</div>;

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
        <div className={styles['dashboard-cta']}>
          <button className="btn-primary" onClick={() => window.location.href='/workouts'}>Log Workout</button>
          <button className="btn-outline" onClick={() => window.location.href='/foods'}>Log Meal</button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 