import React from 'react';
import { Line } from 'react-chartjs-2';

interface DailyData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  workouts: number;
}

interface Props {
  data: DailyData[];
}

const NutritionTrends: React.FC<Props> = ({ data }) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#fff',
          padding: 20
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false
      }
    },
    scales: {
      x: {
        grid: {
          color: '#444'
        },
        ticks: {
          color: '#fff'
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Calories',
          color: '#fff'
        },
        grid: {
          color: '#444'
        },
        ticks: {
          color: '#fff'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Grams',
          color: '#fff'
        },
        grid: {
          drawOnChartArea: false,
          color: '#444'
        },
        ticks: {
          color: '#fff'
        }
      },
    },
  };

  const chartData = {
    labels: data.map(d => d.date),
    datasets: [
      {
        label: 'Calories',
        data: data.map(d => d.calories),
        borderColor: '#ff6384',
        backgroundColor: '#ff638480',
        yAxisID: 'y',
        tension: 0.4
      },
      {
        label: 'Protein (g)',
        data: data.map(d => d.protein),
        borderColor: '#36a2eb',
        backgroundColor: '#36a2eb80',
        yAxisID: 'y1',
        tension: 0.4
      },
      {
        label: 'Carbs (g)',
        data: data.map(d => d.carbs),
        borderColor: '#4bc0c0',
        backgroundColor: '#4bc0c080',
        yAxisID: 'y1',
        tension: 0.4
      },
      {
        label: 'Fat (g)',
        data: data.map(d => d.fat),
        borderColor: '#ffcd56',
        backgroundColor: '#ffcd5680',
        yAxisID: 'y1',
        tension: 0.4
      }
    ]
  };

  return (
    <div style={{ width: '100%', height: '400px', position: 'relative' }}>
      <Line options={options} data={chartData} />
    </div>
  );
};

export default NutritionTrends;
