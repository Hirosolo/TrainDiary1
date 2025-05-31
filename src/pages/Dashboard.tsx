import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMeals, getSessions, generateSummary, getSummary } from '../api';
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

interface DailyData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  workouts: number;
}

interface Summary {
  total_workouts: number;
  total_calories_intake: number;
  avg_protein: number;
  avg_carbs: number;
  avg_fat: number;
  total_duration_minutes: number;
  dailyData: DailyData[];
}

interface MealDetail {
  meal_id: number;
  food_id: number;
  amount_grams: number;
  calories_per_serving: number;
  protein_per_serving: number;
  carbs_per_serving: number;
  fat_per_serving: number;
}

interface SessionDetail {
  session_detail_id: number;
  exercise_id: number;
  name: string;
}

interface SessionLog {
  log_id: number;
  session_detail_id: number;
  actual_sets: number;
  actual_reps: number;
  weight_kg: number;
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
  }>;
}

const Dashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [allMeals, setAllMeals] = useState<any[]>([]);
  const [allMealDetails, setAllMealDetails] = useState<MealDetail[][]>([]);
  const [allSessionDetails, setAllSessionDetails] = useState<SessionDetail[][]>([]);
  const [allSessionLogs, setAllSessionLogs] = useState<SessionLog[][]>([]);
  const [exerciseOptions, setExerciseOptions] = useState<string[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [repGraphType, setRepGraphType] = useState<'reps'|'maxWeight'>('reps');
  const [error, setError] = useState<string | null>(null);
  const { subscribe } = useDashboardRefresh();

  // Function to fetch all required data
  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const today = new Date().toISOString().slice(0, 10);
      
      console.log('Dashboard: Starting data fetch for date:', today);

      // First generate a new summary to ensure data is fresh
      console.log('Dashboard: Generating new summary...');
      const generatedSummary = await generateSummary({
        user_id: user.user_id,
        period_type: 'weekly',
        period_start: today
      }).catch(error => {
        console.error('Failed to generate summary:', error);
        return null;
      });

      console.log('Dashboard: Generated summary result:', generatedSummary);

      // Short delay to ensure summary is generated
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log('Dashboard: Fetching all data...');
      // Fetch all data in parallel for better performance
      const [summaryData, meals, sessions] = await Promise.all([
        getSummary({
          user_id: user.user_id,
          period_type: 'weekly',
          period_start: today
        }).catch((err) => {
          console.error('Failed to fetch summary:', err);
          return null;
        }),
        getMeals(user.user_id).catch((err) => {
          console.error('Failed to fetch meals:', err);
          return [];
        }),
        getSessions(user.user_id).catch((err) => {
          console.error('Failed to fetch sessions:', err);
          return [];
        })
      ]);

      console.log('Dashboard: Received summary data:', summaryData);
      console.log('Dashboard: Received meals data:', meals);
      console.log('Dashboard: Received sessions data:', sessions);

      // Only update state if we have valid data
      if (summaryData) {
        console.log('Dashboard: Updating summary state with:', summaryData);
        setSummary(summaryData);
      }
      setAllMeals(meals);
      setAllSessions(sessions);

      // Fetch details for meals and sessions with error handling
      const detailsResults = await Promise.all([
        Promise.all(
          meals.map((meal: any) =>
            fetch(`http://localhost:4000/api/foods/meals/${meal.meal_id}`)
              .then(res => res.json())
              .catch((): MealDetail[] => [])
          )
        ),
        Promise.all(
          sessions.map((session: any) =>
            fetch(`http://localhost:4000/api/workouts/${session.session_id}/details`)
              .then(res => res.json())
              .catch((): SessionDetail[] => [])
          )
        ),
        Promise.all(
          sessions.map((session: any) =>
            fetch(`http://localhost:4000/api/workouts/${session.session_id}/logs`)
              .then(res => res.json())
              .catch((): SessionLog[] => [])
          )
        )
      ]);

      const [mealDetails, sessionDetails, sessionLogs] = detailsResults;

      // Filter out empty results and update state
      setAllMealDetails(mealDetails.filter(detail => Array.isArray(detail) && detail.length > 0));
      setAllSessionDetails(sessionDetails.filter(detail => Array.isArray(detail) && detail.length > 0));
      setAllSessionLogs(sessionLogs.filter(log => Array.isArray(log) && log.length > 0));

      // Build exercise options
      const exSet = new Set<string>();
      for (const details of sessionDetails) {
        for (const d of details) {
          if (d.name) {
            exSet.add(d.name);
          }
        }
      }
      const exercises = Array.from(exSet);
      setExerciseOptions(exercises);
      if (!selectedExercise && exercises.length > 0) {
        setSelectedExercise(exercises[0]);
      }

    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, selectedExercise]);

  // Subscribe to refresh events
  useEffect(() => {
    if (!user) return;
    
    fetchData();
    const unsubscribe = subscribe(fetchData);
    
    return () => {
      unsubscribe();
    };
  }, [user, subscribe, fetchData]);

  // Reset selected exercise when exercises change
  useEffect(() => {
    if (exerciseOptions.length > 0 && !selectedExercise) {
      setSelectedExercise(exerciseOptions[0]);
    }
  }, [exerciseOptions, selectedExercise]);

  // Prepare data for rep/weight graph
  const repGraphData = React.useMemo((): ChartData | null => {
    if (!allSessions.length || !allSessionDetails.length || !allSessionLogs.length || !selectedExercise) return null;

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
              for (const log of logs.filter(l => l.session_detail_id === d.session_detail_id)) {
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

  // Prepare data for nutrition graphs

  const nutritionGraphOptions = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    stacked: false,
    plugins: {
      title: {
        display: true,
        text: 'Daily Nutrition',
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Calories'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Grams'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  if (authLoading) return <div className="dashboard-container">Loading user...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (loading) return <div className="dashboard-container">Loading summary...</div>;
  if (error) return <div className="dashboard-container">{error}</div>;
  if (!summary) return <div className="dashboard-container">No summary data available. Please log a workout or meal.</div>;

  // Log summary data before rendering
  console.log('Dashboard rendering with summary:', {
    total_workouts: summary.total_workouts,
    total_calories_intake: summary.total_calories_intake,
    avg_protein: summary.avg_protein,
    avg_carbs: summary.avg_carbs,
    avg_fat: summary.avg_fat
  });

  return (
    <div className={styles['dashboard-bg']}>
      <Navbar />
      <div className={styles['dashboard-content']}>
        <h2 className={styles['dashboard-title']}>Your Weekly Progress</h2>        <div className={styles['dashboard-cards']}>
          <div className={styles['dashboard-card']}>
            <h3>Total Workouts</h3>
            <div className={styles['dashboard-value']}>
              {summary.total_workouts ?? 0}
            </div>
          </div>
          <div className={styles['dashboard-card']}>
            <h3>Total Calories Intake</h3>
            <div className={styles['dashboard-value']}>
              {(() => {
                console.log('Rendering total calories:', summary.total_calories_intake);
                return Math.round(summary.total_calories_intake ?? 0);
              })()}
            </div>
          </div>
          <div className={styles['dashboard-card']}>
            <h3>Avg Protein (g)</h3>
            <div className={styles['dashboard-value']}>
              {(() => {
                console.log('Rendering avg protein:', summary.avg_protein);
                return Math.round(summary.avg_protein ?? 0);
              })()}
            </div>
          </div>
          <div className={styles['dashboard-card']}>
            <h3>Avg Carbs (g)</h3>
            <div className={styles['dashboard-value']}>
              {(() => {
                console.log('Rendering avg carbs:', summary.avg_carbs);
                return Math.round(summary.avg_carbs ?? 0);
              })()}
            </div>
          </div>
          <div className={styles['dashboard-card']}>
            <h3>Avg Fat (g)</h3>
            <div className={styles['dashboard-value']}>              {(() => {
                console.log('Rendering avg fat:', summary.avg_fat);
                return Math.round(summary.avg_fat ?? 0);
              })()}
            </div>
          </div>
        </div>        
        {summary.dailyData && (
          <div style={{ margin: '32px 0', background: '#232326', borderRadius: 12, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <b>Nutrition Trends</b>
            </div>
            {loading ? (
              <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Loading nutrition data...
              </div>
            ) : summary.dailyData.length === 0 ? (
              <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                No nutrition data available. Start tracking your meals to see trends!
              </div>
            ) : (
              <div style={{ width: '100%', height: '400px' }}>
                <Line 
                  options={nutritionGraphOptions} 
                  data={{
                    labels: summary.dailyData.map(d => d.date),
                    datasets: [
                      {
                        label: 'Calories',
                        data: summary.dailyData.map(d => d.calories),
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                        yAxisID: 'y',
                      },
                      {
                        label: 'Protein (g)',
                        data: summary.dailyData.map(d => d.protein),
                        borderColor: 'rgb(53, 162, 235)',
                        backgroundColor: 'rgba(53, 162, 235, 0.5)',
                        yAxisID: 'y1',
                      },
                      {
                        label: 'Carbs (g)',
                        data: summary.dailyData.map(d => d.carbs),
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.5)',
                        yAxisID: 'y1',
                      },
                      {
                        label: 'Fat (g)',
                        data: summary.dailyData.map(d => d.fat),
                        borderColor: 'rgb(255, 159, 64)',
                        backgroundColor: 'rgba(255, 159, 64, 0.5)',
                        yAxisID: 'y1',
                      }
                    ]
                  }}
                />
              </div>
            )}
          </div>
        )}

        <div style={{ margin: '32px 0 0 0', background: '#232326', borderRadius: 12, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
            <b>Workout Progress:</b>
            <select value={repGraphType} onChange={e => setRepGraphType(e.target.value as 'reps' | 'maxWeight')}>
              <option value="reps">Total Reps</option>
              <option value="maxWeight">Max Weight</option>
            </select>
            <span style={{ marginLeft: 16 }}><b>Exercise:</b></span>
            <select value={selectedExercise} onChange={e => setSelectedExercise(e.target.value)}>
              {exerciseOptions.map(ex => <option key={ex} value={ex}>{ex}</option>)}
            </select>
          </div>
          {loading ? (
            <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Loading workout data...
            </div>
          ) : !repGraphData ? (
            <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              No workout data available. Complete some workouts to see your progress!
            </div>
          ) : (
            <Line data={repGraphData} options={{ responsive: true, plugins: { legend: { display: true } } }} />
          )}
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