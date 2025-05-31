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
  gr_score: number;
}

interface Summary {
  total_workouts: number;
  total_calories_intake: number;
  avg_protein: number;
  avg_carbs: number;
  avg_fat: number;
  total_duration_minutes: number;
  total_gr_score: number;
  avg_gr_score: number;
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
  // Initialize with current month in YYYY-MM format
  const [periodType, setPeriodType] = useState<string>(new Date().toISOString().slice(0, 7));
  const { subscribe } = useDashboardRefresh();

  // Function to fetch all required data
  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const periodStart = `${periodType}-01`; // First day of selected month
      
      console.log('Dashboard: Starting data fetch for month:', periodType);

      // First generate a new summary to ensure data is fresh
      console.log('Dashboard: Generating new summary...');
      const generatedSummary = await generateSummary({
        user_id: user.user_id,
        period_type: 'monthly',
        period_start: periodStart
      }).catch(error => {
        console.error('Failed to generate summary:', error);
        return null;
      });

      console.log('Dashboard: Generated summary result:', generatedSummary);

      // Short delay to ensure summary is generated
      await new Promise(resolve => setTimeout(resolve, 100));

      // Fetch summary data
      const summaryData = await getSummary({
        user_id: user.user_id,
        period_type: 'monthly',
        period_start: periodStart
      }).catch((err) => {
        console.error('Failed to fetch summary:', err);
        return null;
      });

      // Only update state if we have valid data
      if (summaryData) {
        console.log('Dashboard: Updating summary state with:', summaryData);
        setSummary(summaryData);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, periodType]);

  // Unified effect for data fetching and refresh subscription
  useEffect(() => {
    if (!user) return;
    console.log('Dashboard: Setting up data fetching and refresh subscription');
    
    // Initial data fetch
    fetchData();
    
    // Subscribe to refresh events
    const unsubscribe = subscribe(fetchData);
    
    return () => {
      console.log('Dashboard: Cleaning up refresh subscription');
      unsubscribe();
    };
  }, [user, subscribe, fetchData]);

  // Common graph options
  const graphOptions = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255,255,255,0.1)'
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
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#fff',
          font: { size: 12 }
        }
      }
    }
  };

  // Prepare nutrition graph data
  const nutritionGraphData = React.useMemo(() => {
    if (!summary?.dailyData?.length) return null;

    return {
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
  }, [summary]);

  // Nutrition graph specific options
  const nutritionGraphOptions = {
    ...graphOptions,
    scales: {
      ...graphOptions.scales,
      y: {
        ...graphOptions.scales.y,
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
          drawOnChartArea: false
        }
      }
    }
  };

  // GR Score graph data
  const grScoreGraphData = React.useMemo(() => {
    if (!summary?.dailyData?.length) return null;

    return {
      labels: summary.dailyData.map(d => d.date),
      datasets: [{
        label: 'GR Score',
        data: summary.dailyData.map(d => d.gr_score),
        borderColor: '#36c',
        backgroundColor: 'rgba(54,99,255,0.2)',
        borderWidth: 2,
        pointRadius: 4,
        tension: 0.1
      }]
    };
  }, [summary]);

  // Handle empty data cases
  useEffect(() => {
    if (!loading && summary?.dailyData?.length === 0) {
      console.log('No daily data found, but not triggering refresh to avoid loops');
    }
  }, [loading, summary]);

  if (authLoading || loading) {
    return (
      <div className={styles.dashboard}>
        <Navbar />
        <div className={styles['dashboard-content']}>
          <div className={styles['loading-spinner']}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className={styles.dashboard}>
      <Navbar />
      <div className={styles['dashboard-content']}>
        {/* Dashboard Header */}
        <div className={styles['dashboard-header']}>
          <h2 className={styles['dashboard-title']}>
            Monthly Progress - {new Date(periodType).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div className={styles['period-selector']}>
            <span>Select Month:</span>
            <input
              type="month"
              value={periodType}
              onChange={e => setPeriodType(e.target.value)}
              className={styles['period-select']}
            />
          </div>
        </div>

        {/* Summary Stats */}
        <div className={styles['summary-stats']}>
          <div className={styles['stat-card']}>
            <h3>Total Workouts</h3>
            <p>{summary?.total_workouts || 0}</p>
          </div>
          <div className={styles['stat-card']}>
            <h3>Avg. GR Score</h3>
            <p>{summary?.avg_gr_score?.toFixed(1) || 0}</p>
          </div>
          <div className={styles['stat-card']}>
            <h3>Total Duration</h3>
            <p>{Math.round((summary?.total_duration_minutes || 0) / 60)} hrs</p>
          </div>
          <div className={styles['stat-card']}>
            <h3>Avg. Calories</h3>
            <p>{Math.round(summary?.total_calories_intake || 0)}</p>
          </div>
          <div className={styles['stat-card']}>
            <h3>Avg. Protein</h3>
            <p>{Math.round(summary?.avg_protein || 0)}g</p>
          </div>
          <div className={styles['stat-card']}>
            <h3>Avg. Carbs</h3>
            <p>{Math.round(summary?.avg_carbs || 0)}g</p>
          </div>
          <div className={styles['stat-card']}>
            <h3>Avg. Fat</h3>
            <p>{Math.round(summary?.avg_fat || 0)}g</p>
          </div>
        </div>

        {/* Nutrition Graph */}
        <div className={styles['graph-section']}>
          <h3>Nutrition Overview</h3>
          {nutritionGraphData ? (
            <Line options={nutritionGraphOptions} data={nutritionGraphData} />
          ) : (
            <p>No nutrition data available</p>
          )}
        </div>

        {/* GR Score Graph */}
        <div className={styles['graph-section']}>
          <div className={styles['graph-header']}>
            <h3>GR Score Progress</h3>
          </div>
          {grScoreGraphData ? (
            <Line 
              options={{
                ...graphOptions,
                plugins: {
                  ...graphOptions.plugins,
                  title: {
                    display: false
                  }
                }
              }} 
              data={grScoreGraphData} 
            />
          ) : (
            <p>No GR Score data available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;