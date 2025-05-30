import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMeals, getSessions } from '../api';
import Navbar from '../components/NavBar/NavBar';
import styles from './Dashboard.module.css';
import { Navigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useDashboardRefresh } from '../context/DashboardRefreshContext';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const Dashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [weekOptions, setWeekOptions] = useState<{start: Date, end: Date}[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number>(0);
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [allMeals, setAllMeals] = useState<any[]>([]);
  const [allMealDetails, setAllMealDetails] = useState<any[][]>([]);
  const [allSessionDetails, setAllSessionDetails] = useState<any[][]>([]);
  const [allSessionLogs, setAllSessionLogs] = useState<any[][]>([]);
  const [exerciseOptions, setExerciseOptions] = useState<string[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [repGraphType, setRepGraphType] = useState<'reps'|'maxWeight'>('reps');
  const { subscribe } = useDashboardRefresh();

  const fetchData = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [meals, sessions] = await Promise.all([
      getMeals(user.user_id),
      getSessions(user.user_id)
    ]);
    setAllMeals(meals);
    setAllSessions(sessions);
    // Fetch all meal details in parallel
    const mealDetailsArr = await Promise.all(meals.map((meal: any) =>
      fetch(`http://localhost:4000/api/foods/meals/${meal.meal_id}`).then(res => res.json())
    ));
    setAllMealDetails(mealDetailsArr);
    // Fetch all session details and logs in parallel
    const sessionDetailsArr = await Promise.all(sessions.map((session: any) =>
      fetch(`http://localhost:4000/api/workouts/${session.session_id}/details`).then(res => res.json())
    ));
    setAllSessionDetails(sessionDetailsArr);
    const sessionLogsArr = await Promise.all(sessions.map((session: any) =>
      fetch(`http://localhost:4000/api/workouts/${session.session_id}/logs`).then(res => res.json())
    ));
    setAllSessionLogs(sessionLogsArr);
    // Build week options (last 20 days, grouped by week)
    const today = new Date();
    const days: Date[] = [];
    for (let i = 0; i < 20; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(d);
    }
    days.reverse();
    // Group by week (Monday-Sunday)
    const weeks: {start: Date, end: Date}[] = [];
    let i = 0;
    while (i < days.length) {
      const start = new Date(days[i]);
      const end = new Date(start);
      end.setDate(start.getDate() + 6 - start.getDay()); // End of week (Sunday)
      weeks.push({ start, end });
      i += 7;
    }
    setWeekOptions(weeks);
    setSelectedWeek(weeks.length - 1);
    setLoading(false);
  }, [user]);

  React.useEffect(() => {
    if (user && !authLoading) fetchData();
    const unsubscribe = subscribe(fetchData);
    return () => { unsubscribe(); };
  }, [user, authLoading, fetchData, subscribe]);

  // Calculate summary for selected week
  useEffect(() => {
    if (!allMeals.length || !allSessions.length || !weekOptions.length) return;
    const week = weekOptions[selectedWeek];
    const weekStart = week.start;
    const weekEnd = week.end;
    // Filter sessions and meals in week
    const weekSessions = allSessions.filter((s: any) => {
      const d = new Date(s.scheduled_date);
      return d >= weekStart && d <= weekEnd && s.completed;
    });
    const weekMeals = allMeals.filter((m: any) => {
      const d = new Date(m.log_date);
      return d >= weekStart && d <= weekEnd;
    });
    // Calculate food summary
    let total_calories_intake = 0, total_protein = 0, total_carbs = 0, total_fat = 0, mealCount = 0;
    for (let i = 0; i < allMeals.length; i++) {
      const m = allMeals[i];
      const d = new Date(m.log_date);
      if (d >= weekStart && d <= weekEnd) {
        const mealDetails = allMealDetails[i];
        if (mealDetails.length > 0) mealCount++;
        for (const food of mealDetails) {
          total_calories_intake += (food.calories_per_serving * food.amount_grams);
          total_protein += (food.protein_per_serving * food.amount_grams);
          total_carbs += (food.carbs_per_serving * food.amount_grams);
          total_fat += (food.fat_per_serving * food.amount_grams);
        }
      }
    }
    setSummary({
      total_workouts: weekSessions.length,
      total_calories_intake: total_calories_intake.toFixed(1),
      avg_protein: mealCount ? (total_protein / mealCount).toFixed(1) : 0,
      avg_carbs: mealCount ? (total_carbs / mealCount).toFixed(1) : 0,
      avg_fat: mealCount ? (total_fat / mealCount).toFixed(1) : 0,
      weekStart,
      weekEnd
    });
    // Build exercise options
    const exSet = new Set<string>();
    for (const details of allSessionDetails) {
      for (const d of details) exSet.add(d.name);
    }
    setExerciseOptions(Array.from(exSet));
    if (!selectedExercise && exSet.size > 0) setSelectedExercise(Array.from(exSet)[0]);
  }, [allMeals, allSessions, allMealDetails, allSessionDetails, weekOptions, selectedWeek]);

  // Prepare data for reps/max weight graph
  const repGraphData = React.useMemo(() => {
    if (!allSessions.length || !allSessionDetails.length || !allSessionLogs.length || !selectedExercise) return null;
    // Last 20 days
    const today = new Date();
    const days: string[] = [];
    for (let i = 19; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const repsPerDay: number[] = [];
    const maxWeightPerDay: number[] = [];
    for (const day of days) {
      let reps = 0;
      let maxWeight = 0;
      for (let i = 0; i < allSessions.length; i++) {
        const s = allSessions[i];
        if (s.scheduled_date === day && s.completed) {
          const details = allSessionDetails[i];
          const logs = allSessionLogs[i];
          for (const d of details) {
            if (d.name === selectedExercise) {
              for (const log of logs.filter((l: any) => l.session_detail_id === d.session_detail_id)) {
                reps += log.actual_sets * log.actual_reps;
                if (log.weight_kg > maxWeight) maxWeight = log.weight_kg;
              }
            }
          }
        }
      }
      repsPerDay.push(reps);
      maxWeightPerDay.push(maxWeight);
    }
    return {
      labels: days,
      datasets: [
        repGraphType === 'reps' ? {
          label: 'Total Reps',
          data: repsPerDay,
          borderColor: '#36c',
          backgroundColor: 'rgba(54,99,255,0.2)',
        } : {
          label: 'Max Weight (kg)',
          data: maxWeightPerDay,
          borderColor: '#e44',
          backgroundColor: 'rgba(228,68,68,0.2)',
        }
      ]
    };
  }, [allSessions, allSessionDetails, allSessionLogs, selectedExercise, repGraphType]);

  // Prepare data for nutrition graph
  const nutritionGraphData = React.useMemo(() => {
    if (!allMeals.length || !allMealDetails.length) return null;
    const today = new Date();
    const days: string[] = [];
    for (let i = 19; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const protein: number[] = [], carbs: number[] = [], fat: number[] = [], calories: number[] = [];
    for (const day of days) {
      let p = 0, c = 0, f = 0, cal = 0;
      for (let i = 0; i < allMeals.length; i++) {
        const m = allMeals[i];
        if (m.log_date === day) {
          const mealDetails = allMealDetails[i];
          for (const food of mealDetails) {
            cal += (food.calories_per_serving * food.amount_grams);
            p += (food.protein_per_serving * food.amount_grams);
            c += (food.carbs_per_serving * food.amount_grams);
            f += (food.fat_per_serving * food.amount_grams);
          }
        }
      }
      protein.push(p);
      carbs.push(c);
      fat.push(f);
      calories.push(cal);
    }
    return {
      labels: days,
      datasets: [
        {
          label: 'Protein (g)',
          data: protein,
          borderColor: '#36c',
          backgroundColor: 'rgba(54,99,255,0.1)',
        },
        {
          label: 'Carbs (g)',
          data: carbs,
          borderColor: '#e4c441',
          backgroundColor: 'rgba(228,196,65,0.1)',
        },
        {
          label: 'Fat (g)',
          data: fat,
          borderColor: '#e44',
          backgroundColor: 'rgba(228,68,68,0.1)',
        },
        {
          label: 'Calories',
          data: calories,
          borderColor: '#6e6',
          backgroundColor: 'rgba(102,238,102,0.1)',
        },
      ]
    };
  }, [allMeals, allMealDetails]);

  if (authLoading) return <div className="dashboard-container">Loading user...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (loading) return <div className="dashboard-container">Loading summary...</div>;
  if (!summary) return <div className="dashboard-container">No summary data available. Please log a workout or meal.</div>;

  return (
    <div className={styles['dashboard-bg']}>
      <Navbar />
      <div className={styles['dashboard-content']}>
        <h2 className={styles['dashboard-title']}>Your Weekly Progress</h2>
        <div style={{ marginBottom: 16 }}>
          <b>Week:</b> {summary.weekStart.toLocaleDateString()} - {summary.weekEnd.toLocaleDateString()}
          <select style={{ marginLeft: 16 }} value={selectedWeek} onChange={e => setSelectedWeek(Number(e.target.value))}>
            {weekOptions.map((w, i) => (
              <option key={i} value={i}>{w.start.toLocaleDateString()} - {w.end.toLocaleDateString()}</option>
            ))}
          </select>
        </div>
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
        <div style={{ margin: '32px 0 0 0', background: '#232326', borderRadius: 12, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
            <b>Workout Graph:</b>
            <select value={repGraphType} onChange={e => setRepGraphType(e.target.value as any)}>
              <option value="reps">Total Reps</option>
              <option value="maxWeight">Max Weight</option>
            </select>
            <span style={{ marginLeft: 16 }}><b>Exercise:</b></span>
            <select value={selectedExercise} onChange={e => setSelectedExercise(e.target.value)}>
              {exerciseOptions.map(ex => <option key={ex} value={ex}>{ex}</option>)}
            </select>
          </div>
          {repGraphData && <Line data={repGraphData} options={{ responsive: true, plugins: { legend: { display: true } } }} />}
        </div>
        <div style={{ margin: '32px 0 0 0', background: '#232326', borderRadius: 12, padding: 24 }}>
          <div style={{ marginBottom: 8 }}><b>Nutrition Graph (last 20 days):</b></div>
          {nutritionGraphData && <Line data={nutritionGraphData} options={{ responsive: true, plugins: { legend: { display: true } } }} />}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 