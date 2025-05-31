import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSessions, generateSummary, getSummary } from '../api';
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
    borderWidth?: number;
    pointRadius?: number;
    tension?: number;
    yAxisID?: string;
  }>;
}

const Dashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [allSessions, setAllSessions] = useState<any[]>([]);
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

      // Fetch summary and sessions data
      const [summaryData, sessions] = await Promise.all([
        getSummary({
          user_id: user.user_id,
          period_type: 'weekly',
          period_start: today
        }).catch((err) => {
          console.error('Failed to fetch summary:', err);
          return null;
        }),
        getSessions(user.user_id).catch((err) => {
          console.error('Failed to fetch sessions:', err);
          return [];
        })
      ]);

      console.log('Dashboard: Received summary data:', summaryData);
      console.log('Dashboard: Received sessions data:', sessions);

      // Only update state if we have valid data
      if (summaryData) {
        console.log('Dashboard: Updating summary state with:', summaryData);
        setSummary(summaryData);
      }
      setAllSessions(sessions);

      // Fetch session details and logs in parallel
      console.log('Dashboard: Fetching session details and logs...');
      const [details, logs] = await Promise.all([
        Promise.all(
          sessions.map((session: any) =>
            fetch(`http://localhost:4000/api/workouts/${session.session_id}/details`)
              .then(res => res.json())
              .catch(() => [] as SessionDetail[])
          )
        ),
        Promise.all(
          sessions.map((session: any) =>
            fetch(`http://localhost:4000/api/workouts/${session.session_id}/logs`)
              .then(res => res.json())
              .catch(() => [] as SessionLog[])
          )
        )
      ]);

      // Filter out empty results and update state
      setAllSessionDetails(details.filter(detail => Array.isArray(detail) && detail.length > 0));
      setAllSessionLogs(logs.filter(log => Array.isArray(log) && log.length > 0));

      // Build exercise options
      const exSet = new Set<string>();
      for (const sessionDetails of details) {
        for (const d of sessionDetails) {
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

  // Ensure we re-fetch data when summary changes
  useEffect(() => {
    if (summary) {
      console.log('Summary data updated:', {
        hasData: !!summary.dailyData,
        length: summary.dailyData?.length ?? 0,
        sample: summary.dailyData?.[0]
      });
    }
  }, [summary]);

  // Reset selected exercise when exercises change
  useEffect(() => {
    if (exerciseOptions.length > 0 && !selectedExercise) {
      setSelectedExercise(exerciseOptions[0]);
    }
  }, [exerciseOptions, selectedExercise]);  // Prepare data for workout progress graph
  const repGraphData = React.useMemo((): ChartData | null => {
    console.log('Preparing workout progress data:', {
      sessionsCount: allSessions.length,
      detailsCount: allSessionDetails.length,
      logsCount: allSessionLogs.length,
      selectedExercise
    });

    if (!allSessions.length || !allSessionDetails.length || !allSessionLogs.length || !selectedExercise) return null;

    const today = new Date();
    const days: string[] = [];
    const dayData: Record<string, { reps: number; sets: number; maxWeight: number }> = {};

    // Get the last 20 days
    for (let i = 19; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      days.push(dateStr);
      dayData[dateStr] = { reps: 0, sets: 0, maxWeight: 0 };
    }    // Process each session
    for (let i = 0; i < allSessions.length; i++) {
      const session = allSessions[i];
      const sessionDate = session.scheduled_date;
      
      console.log('Processing session:', {
        sessionId: session.session_id,
        date: sessionDate,
        completed: session.completed,
        hasData: Boolean(dayData[sessionDate]),
        detailsCount: allSessionDetails[i]?.length ?? 0,
        logsCount: allSessionLogs[i]?.length ?? 0
      });
      
      // Only process if it's in our date range and completed
      if (dayData[sessionDate] && session.completed) {
        const details = allSessionDetails[i];
        const logs = allSessionLogs[i];
        
        // Find exercises matching selected type
        for (const detail of details) {
          if (detail.name === selectedExercise) {
            const exerciseLogs = logs.filter(l => l.session_detail_id === detail.session_detail_id);
            
            // Calculate totals for this exercise on this day
            for (const log of exerciseLogs) {
              dayData[sessionDate].sets += log.actual_sets;
              dayData[sessionDate].reps += log.actual_sets * log.actual_reps;
              dayData[sessionDate].maxWeight = Math.max(dayData[sessionDate].maxWeight, log.weight_kg);
            }
          }
        }
      }
    }

    // Prepare graph data based on the type
    const data = days.map(day => {
      if (repGraphType === 'reps') {
        return dayData[day].reps;
      } else {
        return dayData[day].maxWeight;
      }
    });

    // Return chart configuration
    return {
      labels: days,
      datasets: [{
        label: repGraphType === 'reps' ? 'Total Reps' : 'Max Weight (kg)',
        data: data,
        borderColor: repGraphType === 'reps' ? '#36c' : '#e44',
        backgroundColor: repGraphType === 'reps' ? 'rgba(54,99,255,0.2)' : 'rgba(228,68,68,0.2)',
        borderWidth: 2,
        pointRadius: 4,
        tension: 0.1
      }]
    };
  }, [allSessions, allSessionDetails, allSessionLogs, selectedExercise, repGraphType]);
  // Configure nutrition graph options
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
      legend: {
        position: 'top' as const,
        labels: {
          color: '#fff',
          font: { size: 12 }
        }
      }
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Calories'
        },
        grid: {
          color: 'rgba(255,255,255,0.1)'
        },
        ticks: {
          color: '#999'
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
          drawOnChartArea: false
        },
        ticks: {
          color: '#999'
        }
      },
      x: {
        grid: {
          color: 'rgba(255,255,255,0.1)'
        },
        ticks: {
          color: '#999'
        }
      }
    }
  };

  // Prepare nutrition graph data with error handling and logging
  const nutritionGraphData = React.useMemo(() => {
    console.log('Preparing nutrition graph data:', {
      hasSummary: !!summary,
      dailyDataLength: summary?.dailyData?.length ?? 0,
      sampleDay: summary?.dailyData?.[0]
    });

    if (!summary?.dailyData?.length) {
      console.log('No nutrition data available');
      return null;
    }

    const data = {
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
    };

    // Log the data for debugging
    console.log('Generated nutrition data:', {
      labels: data.labels,
      datasets: data.datasets.map(d => ({
        label: d.label,
        dataPoints: d.data
      }))
    });

    return data;  }, [summary]);

  // Ensure data is refreshed when needed
  React.useEffect(() => {
    if (!loading && summary?.dailyData?.length === 0) {
      console.log('No daily data found, triggering refresh...');
      fetchData();
    }
  }, [loading, summary, fetchData]);

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
              <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ marginBottom: 8, fontSize: '1.1em' }}>Loading nutrition data...</div>
                  <div style={{ color: '#666' }}>Please wait while we fetch your data</div>
                </div>
              </div>
            ) : !nutritionGraphData ? (
              <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ marginBottom: 8, fontSize: '1.1em' }}>No nutrition data available</div>
                  <div style={{ color: '#666' }}>Start tracking your meals to see trends!</div>
                </div>
              </div>
            ) : (
              <div style={{ width: '100%', height: 400 }}>
                <Line options={nutritionGraphOptions} data={nutritionGraphData} />
              </div>
            )}
          </div>
        )}        <div style={{ margin: '32px 0 0 0', background: '#232326', borderRadius: 12, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Workout Progress</h3>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginLeft: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>View:</span>
                <select 
                  value={repGraphType} 
                  onChange={e => setRepGraphType(e.target.value as 'reps' | 'maxWeight')}
                  style={{ padding: '4px 8px', borderRadius: 4, background: '#2a2a2e', color: '#fff', border: '1px solid #3a3a3e' }}
                >
                  <option value="reps">Total Reps</option>
                  <option value="maxWeight">Max Weight</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Exercise:</span>
                <select 
                  value={selectedExercise} 
                  onChange={e => setSelectedExercise(e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: 4, background: '#2a2a2e', color: '#fff', border: '1px solid #3a3a3e' }}
                >
                  {exerciseOptions.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div style={{ height: 400, position: 'relative' }}>
            {loading ? (
              <div style={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(35,35,38,0.8)',
                borderRadius: 8
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ marginBottom: 8, fontSize: '1.1em' }}>Loading workout data...</div>
                  <div style={{ color: '#666' }}>Please wait while we fetch your progress</div>
                </div>
              </div>
            ) : !exerciseOptions.length ? (
              <div style={{ 
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
              }}>
                <div>
                  <div style={{ marginBottom: 8, fontSize: '1.1em' }}>No exercises found</div>
                  <div style={{ color: '#666' }}>Start logging workouts to track your progress!</div>
                </div>
              </div>
            ) : !repGraphData ? (
              <div style={{ 
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
              }}>
                <div>
                  <div style={{ marginBottom: 8, fontSize: '1.1em' }}>No data available for {selectedExercise}</div>
                  <div style={{ color: '#666' }}>Complete some workouts to see your progress!</div>
                </div>
              </div>
            ) : (
              <Line 
                data={repGraphData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: true,
                      position: 'top' as const,
                      labels: {
                        color: '#fff',
                        font: {
                          size: 12
                        }
                      }
                    },
                    tooltip: {
                      mode: 'index',
                      intersect: false,
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      titleFont: {
                        size: 14
                      },
                      bodyFont: {
                        size: 13
                      }
                    }
                  },
                  scales: {
                    x: {
                      grid: {
                        color: 'rgba(255,255,255,0.1)'
                      },
                      ticks: {
                        color: '#999'
                      }
                    },
                    y: {
                      grid: {
                        color: 'rgba(255,255,255,0.1)'
                      },
                      ticks: {
                        color: '#999'
                      }
                    }
                  }
                }} 
              />
            )}
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