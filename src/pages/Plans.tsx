import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { FaCalendarAlt, FaChartLine, FaDumbbell, FaUserFriends } from 'react-icons/fa';
import Navbar from '../components/NavBar/NavBar';
import { useAuth } from '../context/AuthContext';
import * as api from '../api';
import {
  PageContainer,
  PageHeader,
  CardGrid,
  Card,
  ModalContent,
  GridForm,
  StatCard
} from '../components/shared/SharedComponents';
import styles from './Plans.module.css';

interface Plan {
  plan_id: number;
  name: string;
  description: string;
  duration_days: number;
}

const Plans: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [startDate, setStartDate] = useState('');
  const [error, setError] = useState('');
  const [planStats, setPlanStats] = useState({
    totalPlans: 0,
    activePlans: 0,
    completedPlans: 0,
    avgCompletion: 0
  });
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailedPlan, setDetailedPlan] = useState<any>(null);

  if (authLoading) return <div className="dashboard-container">Loading user...</div>;
  if (!user) return <Navigate to="/login" replace />;

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    if (plans.length > 0) {
      // In a real app, we would fetch these stats from the backend
      setPlanStats({
        totalPlans: plans.length,
        activePlans: 2,
        completedPlans: 5,
        avgCompletion: 85
      });
    }
  }, [plans]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await api.listPlans();
      setPlans(res);
    } catch (error) {
      console.error('Error fetching plans:', error);
      setError('Failed to load plans');
    }
    setLoading(false);
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedPlan) return;
    
    try {
      const res = await api.applyPlan({ 
        user_id: user?.user_id, 
        plan_id: selectedPlan.plan_id, 
        start_date: startDate 
      });
      
      if (res.message === 'Plan applied and sessions created.') {
        setShowApply(false);
        setStartDate('');
        setSelectedPlan(null);
      } else {
        setError(res.message || 'Failed to apply plan');
      }
    } catch (error) {
      console.error('Error applying plan:', error);
      setError('Failed to apply plan. Please try again.');
    }
  };

  const handleViewDetails = async (plan: Plan) => {
    setDetailedPlan(null);
    setShowDetailsModal(true);
    try {
      const res = await api.getPlanDetails(plan.plan_id);
      setDetailedPlan(res);
    } catch (error) {
      console.error('Error fetching plan details:', error);
      setError('Failed to load plan details');
    }
  };

  return (
    <PageContainer>
      <Navbar />
      <div className={styles.plansContent}>
        <PageHeader title="Workout Plans">
          {/* Add a button here if needed */}
        </PageHeader>

        {/* Plan Stats */}
        <CardGrid className={styles.statsGrid}>
          <StatCard 
            value={planStats.totalPlans}
            label="Available Plans"
            icon={<FaDumbbell />}
          />

          {/* New Info Card */}
          <Card className={styles.infoCard}>
            <p>
              Our workout plan system lets you follow structured training programs designed for different goals, like building strength, gaining muscle, or improving overall fitness. Each plan is made up of multiple training days (e.g., Chest Day, Leg Day), and each day includes specific exercises with recommended sets and reps. You can browse available plans, choose one that fits your goals, and apply it to your schedule. Once applied, the plan is added to your workout calendar, where you can track your progress day by day.
            </p>
          </Card>
        </CardGrid>

        {/* Plans List */}
        <CardGrid className={styles.planCardGrid}>
          {loading ? (
            <Card className={styles.loadingCard}>
              <div className={styles.loader}>Loading...</div>
            </Card>
          ) : plans.length === 0 ? (
            <Card className={styles.emptyCard}>
              <p>No workout plans available at the moment.</p>
              <p>Please check back later for new plans!</p>
            </Card>
          ) : (
            plans.map(plan => (
              <Card key={plan.plan_id} className={styles.planCard}>
                <div className={styles.planHeader}>
                  <h3 className={styles.planName}>{plan.name}</h3>
                  <div className={styles.planDuration}>
                    <FaCalendarAlt />
                    {plan.duration_days} days
                  </div>
                </div>
                
                <div className={styles.planDescription}>
                  {plan.description}
                </div>

                <div className={styles.planActions}>
                  <button 
                    className={styles.planDetailsBtn}
                    onClick={() => handleViewDetails(plan)}
                  >
                    Details
                  </button>
                  <button 
                    className="btn-primary"
                    onClick={() => {
                      setSelectedPlan(plan);
                      setShowApply(true);
                    }}
                  >
                    Apply Plan
                  </button>
                </div>
              </Card>
            ))
          )}
        </CardGrid>

        {/* Apply Plan Modal */}
        {showApply && selectedPlan && (
          <ModalContent 
            title={`Apply Plan: ${selectedPlan.name}`}
            onClose={() => {
              setShowApply(false);
              setSelectedPlan(null);
              setStartDate('');
              setError('');
            }}
          >
            <GridForm onSubmit={handleApply}>
              <div className={styles.formGroup}>
                <label>Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              {error && <div className={styles.error}>{error}</div>}
              
              <div className={styles.modalActions}>
                <button type="submit" className="btn-primary" disabled={!startDate}>
                  Apply Plan
                </button>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => {
                    setShowApply(false);
                    setSelectedPlan(null);
                    setStartDate('');
                    setError('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </GridForm>
          </ModalContent>
        )}

        {/* View Details Modal */}
        {showDetailsModal && detailedPlan && (
          <ModalContent
            title={`Plan Details: ${detailedPlan.name}`}
            onClose={() => {
              setShowDetailsModal(false);
              setDetailedPlan(null);
            }}
          >
            {detailedPlan ? (
              <div>
                <h3>Description:</h3>
                <p>{detailedPlan.description}</p>
                <h3>Duration:</h3>
                <p>{detailedPlan.duration_days} days</p>

                <h4>Workout Days:</h4>
                {detailedPlan.days?.length > 0 ? (
                  detailedPlan.days.map((day: any) => (
                    <div key={day.plan_day_id || day.day_number}> 
                      <h5>Day {day.day_number}: {day.day_type && `(${day.day_type})`}</h5>
                      {day.exercises?.length > 0 ? (
                        <ul>
                          {day.exercises.map((exercise: any) => (
                            <li key={exercise.plan_day_exercise_id || exercise.exercise_id}>
                              {exercise.exercise_name} - Sets: {exercise.sets}, Reps: {exercise.reps}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>No exercises planned for this day.</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p>No workout days defined for this plan.</p>
                )}
              </div>
            ) : (
              <p>Loading plan details...</p>
            )}
          </ModalContent>
        )}
      </div>
    </PageContainer>
  );
};

export default Plans;