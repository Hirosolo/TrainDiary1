import React, { useEffect, useState } from 'react';
import Navbar from '../components/NavBar/NavBar';
import { useAuth } from '../context/AuthContext';
import * as api from '../api';

interface Plan {
  plan_id: number;
  name: string;
  description: string;
  duration_days: number;
}

const Plans: React.FC = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [startDate, setStartDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    const res = await api.listPlans();
    setPlans(res);
    setLoading(false);
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedPlan) return;
    const res = await api.applyPlan({ user_id: user?.user_id, plan_id: selectedPlan.plan_id, start_date: startDate });
    if (res.message === 'Plan applied and sessions created.') {
      setShowApply(false);
      setStartDate('');
      setSelectedPlan(null);
    } else {
      setError(res.message || 'Failed to apply plan');
    }
  };

  return (
    <div className="dashboard-bg">
      <Navbar />
      <div className="dashboard-content">
        <h2 className="dashboard-title">Available Workout Plans</h2>
        <div className="dashboard-cards">
          {loading ? <div>Loading...</div> : plans.length === 0 ? <div>No plans available.</div> : plans.map(plan => (
            <div className="dashboard-card" key={plan.plan_id}>
              <h3>{plan.name}</h3>
              <div className="dashboard-value">Duration: {plan.duration_days} days</div>
              <div className="dashboard-value">{plan.description}</div>
              <button className="btn-outline" onClick={() => alert('View details coming soon!')}>View Details</button>
              <button className="btn-primary" onClick={() => { setSelectedPlan(plan); setShowApply(true); }}>Apply Plan</button>
            </div>
          ))}
        </div>
        {showApply && selectedPlan && (
          <div className="modal-bg">
            <div className="auth-card">
              <h3>Apply Plan: {selectedPlan.name}</h3>
              <form onSubmit={handleApply}>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                <button className="btn-primary" type="submit" disabled={!startDate}>Apply</button>
                <button className="btn-outline" type="button" onClick={() => setShowApply(false)}>Cancel</button>
                {error && <div className="error">{error}</div>}
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Plans; 