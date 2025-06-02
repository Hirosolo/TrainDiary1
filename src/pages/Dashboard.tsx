import React, { useEffect, useState, useCallback } from 'react';
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
import {
  FaDumbbell,
  FaFire,
  FaAppleAlt,
  FaTrophy,
  FaArrowUp,
  FaArrowDown
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useDashboardRefresh } from '../context/DashboardRefreshContext';
import { generateSummary, getSummary } from '../api';
import Navbar from '../components/NavBar/NavBar';
import {
  PageContainer,
  PageHeader,
  CardGrid,
  Card,
  StatCard
} from '../components/shared/SharedComponents';
import styles from './Dashboard.module.css';

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
  const [periodType, setPeriodType] = useState<string>(new Date().toISOString().slice(0, 7));
  const { subscribe } = useDashboardRefresh();

  if (authLoading) return <div className="dashboard-container">Loading user...</div>;
  if (!user) return <Navigate to="/login" replace />;

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
      labels: summary.dailyData.map(d => new Date(d.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })),
      datasets: [
        {
          label: 'Calories',
          data: summary.dailyData.map(d => d.calories),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          yAxisID: 'y',
          tension: 0.4
        },
        {
          label: 'Protein (g)',
          data: summary.dailyData.map(d => d.protein),
          borderColor: 'rgb(53, 162, 235)',
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
          yAxisID: 'y1',
          tension: 0.4
        }
      ]
    };
  }, [summary]);

  // Prepare workout graph data
  const workoutGraphData = React.useMemo(() => {
    if (!summary?.dailyData?.length) return null;

    return {
      labels: summary.dailyData.map(d => new Date(d.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })),
      datasets: [
        {
          label: 'GR Score',
          data: summary.dailyData.map(d => d.gr_score),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          tension: 0.4
        },
        {
          label: 'Workouts',
          data: summary.dailyData.map(d => d.workouts),
          borderColor: 'rgb(255, 159, 64)',
          backgroundColor: 'rgba(255, 159, 64, 0.5)',
          tension: 0.4
        }
      ]
    };
  }, [summary]);

  // Handle empty data cases
  useEffect(() => {
    if (!loading && summary?.dailyData?.length === 0) {
      console.log('No daily data found, but not triggering refresh to avoid loops');
    }
  }, [loading, summary]);

  const formatNumber = (num: number): string => {
    return num >= 1000 ? (num / 1000).toFixed(1) + 'k' : num.toString();
  };

  const calculateChange = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const formatChange = (change: number): string => {
    if (change > 0) return `+${change.toFixed(1)}%`;
    return change.toFixed(1) + '%';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <FaArrowUp />;
    return <FaArrowDown />;
  };

  return (
    <div className={styles['dashboard-bg']}>
      <Navbar />
      <PageContainer className={styles.dashboardContent}>
        <PageHeader title="Dashboard"></PageHeader>
        
        <div className={styles['period-selector']}>
          <input
            type="month"
            className={styles['period-select']}
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value)}
          />
        </div>

        {loading ? (
          <div className={styles['loading-spinner']}>Loading summary...</div>
        ) : summary ? (
          <>
            <div className={styles.summaryStats}>
              <StatCard
                label="Total Workouts"
                value={summary.total_workouts}
                icon={<FaDumbbell color="#e66" />}
              />
              <StatCard
                label="Total Calories Intake"
                value={formatNumber(summary.total_calories_intake)}
                icon={<FaFire color="#f08f30" />}
              />
              <StatCard
                label="Avg. Daily Protein"
                value={`${summary.avg_protein.toFixed(1)}g`}
                icon={<FaAppleAlt color="#90ee90" />}
              />
              <StatCard
                label="Avg. GR Score"
                value={summary.avg_gr_score.toFixed(1)}
                icon={<FaTrophy color="#ffd700" />}
              />
            </div>

            <div className={styles.graphContainer}>
              <div className={styles.graphSection}>
                <h3>Daily Nutrition & Protein</h3>
                {nutritionGraphData ? (
                  <Line data={nutritionGraphData} options={graphOptions} />
                ) : (
                  <div className={styles.emptyState}>No nutrition data available for this period.</div>
                )}
              </div>

              <div className={styles.graphSection}>
                <h3>Daily GR Score & Workouts</h3>
                {workoutGraphData ? (
                  <Line data={workoutGraphData} options={graphOptions} />
                ) : (
                  <div className={styles.emptyState}>No workout data available for this period.</div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>No summary data available for this period. Generate data by adding workouts and foods.</div>
        )}
      </PageContainer>
    </div>
  );
};

export default Dashboard;