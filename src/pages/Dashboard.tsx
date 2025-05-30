import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSummary } from '../api';
import Navbar from '../components/NavBar/NavBar';
import styles from './Dashboard.module.css';
import { useSummaryStore } from '../context/SummaryStore';
import { Navigate } from 'react-router-dom';

let externalRefresh: (() => void) | null = null;

const Dashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const summary = useSummaryStore((s: any) => s.summary);
  const loading = useSummaryStore((s: any) => s.loading);
  const refreshSummary = useSummaryStore((s: any) => s.refreshSummary);

  console.log('Dashboard state:', { user, authLoading, summary, loading });

  React.useEffect(() => {
    if (user && !authLoading) refreshSummary(user.user_id);
  }, [user, authLoading, refreshSummary]);

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
        <div className={styles['dashboard-cta']}>
          <button className="btn-primary" onClick={() => window.location.href='/workouts'}>Log Workout</button>
          <button className="btn-outline" onClick={() => window.location.href='/foods'}>Log Meal</button>
        </div>
      </div>
    </div>
  );
};

export { externalRefresh };
export default Dashboard; 