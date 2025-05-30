import React, { useEffect, useState } from 'react';
import Navbar from '../components/NavBar/NavBar';
import { useAuth } from '../context/AuthContext';
import * as api from '../api';

interface Session {
  session_id: number;
  scheduled_date: string;
  completed: boolean;
  notes: string;
}
interface SessionDetail {
  session_detail_id: number;
  exercise_id: number;
  planned_sets: number;
  planned_reps: number;
  name: string;
  category: string;
  description: string;
}
interface SessionLog {
  log_id: number;
  session_detail_id: number;
  actual_sets: number;
  actual_reps: number;
  weight_kg: number;
  duration_seconds: number;
  notes: string;
  exercise_id: number;
  name: string;
}
interface Exercise {
  exercise_id: number;
  name: string;
}

const Workouts: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [error, setError] = useState('');
  const [detailsModal, setDetailsModal] = useState<{ session: Session; open: boolean } | null>(null);
  const [sessionDetails, setSessionDetails] = useState<SessionDetail[]>([]);
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [addExerciseForm, setAddExerciseForm] = useState({ exercise_id: '', planned_sets: '', planned_reps: '' });
  const [addExerciseError, setAddExerciseError] = useState('');
  const [showLogForm, setShowLogForm] = useState<number | null>(null);
  const [logForm, setLogForm] = useState({ actual_sets: '', actual_reps: '', weight_kg: '', duration_seconds: '', notes: '' });
  const [logError, setLogError] = useState('');

  useEffect(() => {
    if (user) fetchSessions();
    // eslint-disable-next-line
  }, [user]);

  const fetchSessions = async () => {
    setLoading(true);
    const res = await fetch(`http://localhost:4000/api/workouts?user_id=${user?.user_id}`);
    const data = await res.json();
    setSessions(data);
    setLoading(false);
  };

  const openDetails = async (session: Session) => {
    setDetailsModal({ session, open: true });
    const [detailsRes, logsRes] = await Promise.all([
      fetch(`http://localhost:4000/api/workouts/${session.session_id}/details`),
      fetch(`http://localhost:4000/api/workouts/${session.session_id}/logs`)
    ]);
    setSessionDetails(await detailsRes.json());
    setSessionLogs(await logsRes.json());
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await api.createSession({ user_id: user?.user_id, scheduled_date: formDate, notes: formNotes });
    if (res.session_id) {
      setShowForm(false);
      setFormDate('');
      setFormNotes('');
      fetchSessions();
    } else {
      setError(res.message || 'Failed to schedule session');
    }
  };

  const fetchAllExercises = async () => {
    const res = await fetch('http://localhost:4000/api/exercises');
    setAllExercises(await res.json());
  };

  const handleAddExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddExerciseError('');
    if (!addExerciseForm.exercise_id || !addExerciseForm.planned_sets || !addExerciseForm.planned_reps) {
      setAddExerciseError('All fields required');
      return;
    }
    const res = await fetch(`http://localhost:4000/api/workouts/${detailsModal?.session.session_id}/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exercises: [{
        exercise_id: addExerciseForm.exercise_id,
        planned_sets: addExerciseForm.planned_sets,
        planned_reps: addExerciseForm.planned_reps
      }] })
    });
    const data = await res.json();
    if (data.message === 'Exercises added.') {
      setShowAddExercise(false);
      setAddExerciseForm({ exercise_id: '', planned_sets: '', planned_reps: '' });
      openDetails(detailsModal!.session);
    } else {
      setAddExerciseError(data.message || 'Failed to add exercise');
    }
  };

  const handleLog = async (e: React.FormEvent, session_detail_id: number) => {
    e.preventDefault();
    setLogError('');
    const res = await fetch('http://localhost:4000/api/workouts/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_detail_id,
        actual_sets: logForm.actual_sets,
        actual_reps: logForm.actual_reps,
        weight_kg: logForm.weight_kg,
        duration_seconds: logForm.duration_seconds,
        notes: logForm.notes
      })
    });
    const data = await res.json();
    if (data.message === 'Workout logged.') {
      setShowLogForm(null);
      setLogForm({ actual_sets: '', actual_reps: '', weight_kg: '', duration_seconds: '', notes: '' });
      openDetails(detailsModal!.session);
    } else {
      setLogError(data.message || 'Failed to log workout');
    }
  };

  return (
    <div className="dashboard-bg">
      <Navbar />
      <div className="dashboard-content">
        <h2 className="dashboard-title">Your Workout Sessions</h2>
        <div className="dashboard-cards">
          {loading ? <div>Loading...</div> : sessions.length === 0 ? <div>No sessions yet.</div> : sessions.map(session => (
            <div className="dashboard-card" key={session.session_id}>
              <h3>Session #{session.session_id}</h3>
              <div className="dashboard-value">Date: {session.scheduled_date}</div>
              <div className="dashboard-value">Notes: {session.notes || '-'}</div>
              <div className="dashboard-value">Completed: {session.completed ? 'Yes' : 'No'}</div>
              <button className="btn-primary" onClick={() => openDetails(session)}>View Details</button>
            </div>
          ))}
        </div>
        <div className="dashboard-cta">
          <button className="btn-primary" onClick={() => setShowForm(true)}>Schedule New Session</button>
        </div>
        {showForm && (
          <div className="modal-bg">
            <div className="auth-card">
              <h3>Schedule Workout Session</h3>
              <form onSubmit={handleSchedule}>
                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} required />
                <input type="text" value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Notes (optional)" />
                <button className="btn-primary" type="submit" disabled={!formDate}>Create</button>
                <button className="btn-outline" type="button" onClick={() => setShowForm(false)}>Cancel</button>
                {error && <div className="error">{error}</div>}
              </form>
            </div>
          </div>
        )}
        {detailsModal?.open && (
          <div className="modal-bg">
            <div className="auth-card" style={{ maxWidth: 700, textAlign: 'left' }}>
              <h3>Session Details</h3>
              <div><b>Date:</b> {detailsModal.session.scheduled_date}</div>
              <div><b>Notes:</b> {detailsModal.session.notes || '-'}</div>
              <div><b>Completed:</b> {detailsModal.session.completed ? 'Yes' : 'No'}</div>
              <div style={{ margin: '18px 0 8px 0', fontWeight: 600 }}>Exercises:</div>
              {sessionDetails.length === 0 ? <div>No exercises yet.</div> : (
                <table style={{ width: '100%', color: 'var(--text-color)', background: 'transparent', marginBottom: 12 }}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Sets</th>
                      <th>Reps</th>
                      <th>Description</th>
                      <th>Log</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionDetails.map(detail => (
                      <tr key={detail.session_detail_id}>
                        <td>{detail.name}</td>
                        <td>{detail.planned_sets}</td>
                        <td>{detail.planned_reps}</td>
                        <td>{detail.description}</td>
                        <td>
                          <button className="btn-outline" onClick={() => { setShowLogForm(detail.session_detail_id); setLogForm({ actual_sets: '', actual_reps: '', weight_kg: '', duration_seconds: '', notes: '' }); }}>Log</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <button className="btn-primary" style={{ marginBottom: 16 }} onClick={() => { setShowAddExercise(true); fetchAllExercises(); }}>Add Exercise</button>
              <div style={{ margin: '18px 0 8px 0', fontWeight: 600 }}>Logs:</div>
              {sessionLogs.length === 0 ? <div>No logs yet.</div> : (
                <table style={{ width: '100%', color: 'var(--text-color)', background: 'transparent' }}>
                  <thead>
                    <tr>
                      <th>Exercise</th>
                      <th>Sets</th>
                      <th>Reps</th>
                      <th>Weight (kg)</th>
                      <th>Duration (s)</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionLogs.map(log => (
                      <tr key={log.log_id}>
                        <td>{log.name}</td>
                        <td>{log.actual_sets}</td>
                        <td>{log.actual_reps}</td>
                        <td>{log.weight_kg}</td>
                        <td>{log.duration_seconds}</td>
                        <td>{log.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <button className="btn-outline" style={{ marginTop: 16 }} onClick={() => setDetailsModal(null)}>Close</button>
            </div>
            {showAddExercise && (
              <div className="modal-bg">
                <div className="auth-card" style={{ maxWidth: 400 }}>
                  <h3>Add Exercise</h3>
                  <form onSubmit={handleAddExercise}>
                    <select value={addExerciseForm.exercise_id} onChange={e => setAddExerciseForm(f => ({ ...f, exercise_id: e.target.value }))} required>
                      <option value="">Select Exercise</option>
                      {allExercises.map(ex => <option key={ex.exercise_id} value={ex.exercise_id}>{ex.name}</option>)}
                    </select>
                    <input type="number" placeholder="Planned Sets" value={addExerciseForm.planned_sets} onChange={e => setAddExerciseForm(f => ({ ...f, planned_sets: e.target.value }))} required />
                    <input type="number" placeholder="Planned Reps" value={addExerciseForm.planned_reps} onChange={e => setAddExerciseForm(f => ({ ...f, planned_reps: e.target.value }))} required />
                    <button className="btn-primary" type="submit">Add</button>
                    <button className="btn-outline" type="button" onClick={() => setShowAddExercise(false)}>Cancel</button>
                    {addExerciseError && <div className="error">{addExerciseError}</div>}
                  </form>
                </div>
              </div>
            )}
            {showLogForm && (
              <div className="modal-bg">
                <div className="auth-card" style={{ maxWidth: 400 }}>
                  <h3>Log Performance</h3>
                  <form onSubmit={e => handleLog(e, showLogForm)}>
                    <input type="number" placeholder="Actual Sets" value={logForm.actual_sets} onChange={e => setLogForm(f => ({ ...f, actual_sets: e.target.value }))} required />
                    <input type="number" placeholder="Actual Reps" value={logForm.actual_reps} onChange={e => setLogForm(f => ({ ...f, actual_reps: e.target.value }))} required />
                    <input type="number" placeholder="Weight (kg)" value={logForm.weight_kg} onChange={e => setLogForm(f => ({ ...f, weight_kg: e.target.value }))} required />
                    <input type="number" placeholder="Duration (seconds)" value={logForm.duration_seconds} onChange={e => setLogForm(f => ({ ...f, duration_seconds: e.target.value }))} required />
                    <input type="text" placeholder="Notes (optional)" value={logForm.notes} onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))} />
                    <button className="btn-primary" type="submit">Log</button>
                    <button className="btn-outline" type="button" onClick={() => setShowLogForm(null)}>Cancel</button>
                    {logError && <div className="error">{logError}</div>}
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Workouts; 