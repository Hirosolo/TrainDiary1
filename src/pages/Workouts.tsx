import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { DragDropContext, Draggable, DropResult, DroppableProvided, DraggableProvided, Droppable } from '@hello-pangea/dnd';
import { FaDumbbell, FaFire, FaClock, FaTrophy, FaTimes, FaGripVertical } from 'react-icons/fa';
import { HiPlusSm } from 'react-icons/hi';
import Navbar from '../components/NavBar/NavBar';
import { StrictModeDroppable } from '../components/StrictModeDroppable';
import { useAuth } from '../context/AuthContext';
import { useDashboardRefresh } from '../context/DashboardRefreshContext';
import {
  PageContainer,
  PageHeader,
  CardGrid,
  Card,
  ModalContent,
  GridForm,
  StatCard
} from '../components/shared/SharedComponents';
import styles from './Workouts.module.css';
import { addExercisesToSession } from '../api';

interface Session {
  session_id: number;
  scheduled_date: string;
  completed: boolean;
  notes: string;
  type?: string;
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
  default_sets?: number;
  default_reps?: number;
  description?: string;
}

const sessionTypes = [
  'Push',
  'Pull',
  'Legs',
  'Arms + Back',
  'Full Body',
  'Cardio',
  'Upper',
  'Lower',
  'Chest',
  'Back',
  'Shoulders',
  'Arms',
  'Core / Abs',
  'Push + Pull',
  'Chest + Triceps',
  'Back + Biceps',
  'Legs + Shoulders',
  'Functional Training',
  'Full Body + Cardio',
  'Custom',
];

interface DragSnapshot {
  isDragging: boolean;
}

const Workouts: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { triggerRefresh } = useDashboardRefresh();
  
  if (authLoading) return <div className="dashboard-container">Loading user...</div>;
  if (!user) return <Navigate to="/login" replace />;

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
  const [deleteSessionConfirm, setDeleteSessionConfirm] = useState<number | null>(null);
  const [deleteExerciseConfirm, setDeleteExerciseConfirm] = useState<number | null>(null);
  const [formType, setFormType] = useState(sessionTypes[0]);
  const [workoutStats, setWorkoutStats] = useState({
    totalWorkouts: 0,
    completedToday: false,
    weeklyStreak: 0,
    avgDuration: 0
  });
  const [addExerciseLoading, setAddExerciseLoading] = useState(false);
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm] = useState({ actual_sets: '', actual_reps: '', weight_kg: '', notes: '' });
  const [logExerciseId, setLogExerciseId] = useState<number | null>(null);
  const [completingSession, setCompletingSession] = useState(false);
  const [reorderExerciseId, setReorderExerciseId] = useState<number | null>(null);
  const [reorderLogId, setReorderLogId] = useState<number | null>(null);

  useEffect(() => {
    if (user && !authLoading) fetchSessions();
  }, [user, authLoading]);

  useEffect(() => {
    if (sessions.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      const stats = {
        totalWorkouts: sessions.filter(s => s.completed).length,
        completedToday: sessions.some(s => s.scheduled_date.slice(0, 10) === today && s.completed),
        weeklyStreak: calculateWeeklyStreak(sessions),
        avgDuration: calculateAverageDuration(sessions)
      };
      setWorkoutStats(stats);
    }
  }, [sessions]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:4000/api/workouts?user_id=${user?.user_id}`);
      const data = await res.json();
      setSessions(data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setError('Failed to load workouts');
    }
    setLoading(false);
  };

  const openDetails = async (session: Session) => {
    setDetailsModal({ session, open: true });
    try {
      const [detailsRes, logsRes] = await Promise.all([
        fetch(`http://localhost:4000/api/workouts/${session.session_id}/details`),
        fetch(`http://localhost:4000/api/workouts/${session.session_id}/logs`)
      ]);
      setSessionDetails(await detailsRes.json());
      setSessionLogs(await logsRes.json());
    } catch (error) {
      console.error('Error loading session details:', error);
      setError('Failed to load workout details');
    }
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch('http://localhost:4000/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: user?.user_id, 
          scheduled_date: formDate, 
          notes: formNotes, 
          type: formType 
        })
      });
      const data = await response.json();
      
      if (data.session_id) {
        setShowForm(false);
        setFormDate('');
        setFormNotes('');
        setFormType(sessionTypes[0]);
        fetchSessions();
        triggerRefresh();
      } else {
        setError(data.message || 'Failed to schedule session');
      }
    } catch (error) {
      console.error('Error scheduling session:', error);
      setError('Failed to schedule session. Please try again.');
    }
  };

  const handleSelectExercise = (exercise: Exercise) => {
    setAddExerciseForm({
      exercise_id: exercise.exercise_id.toString(),
      planned_sets: exercise.default_sets?.toString() || '',
      planned_reps: exercise.default_reps?.toString() || ''
    });
  };

  const handleDeleteExercise = async (detailId: number) => {
    try {
      await fetch(`http://localhost:4000/api/workouts/details/${detailId}`, { method: 'DELETE' });
      setDeleteExerciseConfirm(null);
      if (detailsModal?.session) {
        openDetails(detailsModal.session);
      }
    } catch (error) {
      console.error('Error deleting exercise:', error);
      setError('Failed to delete exercise. Please try again.');
    }
  };

  const handleDeleteSession = async (sessionId: number) => {
    try {
      await fetch(`http://localhost:4000/api/workouts/${sessionId}`, { method: 'DELETE' });
      setDeleteSessionConfirm(null);
      fetchSessions();
      triggerRefresh();
    } catch (error) {
      console.error('Error deleting session:', error);
      setError('Failed to delete session');
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;

    const reorderedSessions = Array.from(sessions);
    const [removed] = reorderedSessions.splice(sourceIndex, 1);
    reorderedSessions.splice(destIndex, 0, removed);

    setSessions(reorderedSessions);

    try {
      await fetch('http://localhost:4000/api/workouts/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: parseInt(result.draggableId),
          new_position: destIndex
        })
      });
    } catch (error) {
      console.error('Error reordering sessions:', error);
      fetchSessions();
    }
  };

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).replace(/\b0(\d)\b/g, '$1');
  };

  const calculateWeeklyStreak = (sessions: Session[]): number => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const completedThisWeek = sessions.filter(session => {
      const sessionDate = new Date(session.scheduled_date);
      return session.completed && sessionDate >= oneWeekAgo && sessionDate <= now;
    });

    return completedThisWeek.length;
  };

  const calculateAverageDuration = (sessions: Session[]): number => {
    const completedSessions = sessions.filter(s => s.completed);
    if (completedSessions.length === 0) return 0;

    const totalDuration = sessionLogs.reduce((total, log) => {
      return total + (log.duration_seconds || 0);
    }, 0);

    return Math.round(totalDuration / (60 * completedSessions.length));
  };

  const fetchAllExercises = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/exercises');
      setAllExercises(await res.json());
    } catch (error) {
      console.error('Error fetching exercises:', error);
      setError('Failed to load exercises');
    }
  };

  const openLogModal = (exerciseId: number) => {
    setLogExerciseId(exerciseId);
    setLogForm({ actual_sets: '', actual_reps: '', weight_kg: '', notes: '' });
    setShowLogModal(true);
  };

  const handleSubmitLog = async () => {
    if (!logExerciseId || !logForm.actual_sets || !logForm.actual_reps) return;
    try {
      const detail = sessionDetails.find(d => d.exercise_id === logExerciseId);
      if (!detail) return;
      const res = await fetch('http://localhost:4000/api/workouts/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_detail_id: detail.session_detail_id,
          actual_sets: parseInt(logForm.actual_sets),
          actual_reps: parseInt(logForm.actual_reps),
          weight_kg: parseFloat(logForm.weight_kg) || 0,
          duration_seconds: 0,
          notes: logForm.notes || ''
        })
      });
      setShowLogModal(false);
      setLogExerciseId(null);
      setLogForm({ actual_sets: '', actual_reps: '', weight_kg: '', notes: '' });
      if (detailsModal?.session) openDetails(detailsModal.session);
    } catch (e) {
      alert('Failed to log set');
    }
  };

  const handleCompleteSession = async () => {
    if (!detailsModal?.session) return;
    setCompletingSession(true);
    try {
      await fetch(`http://localhost:4000/api/workouts/${detailsModal.session.session_id}/complete`, { method: 'PATCH' });
      setDetailsModal(null);
      fetchSessions();
      triggerRefresh();
    } catch (e) {
      alert('Failed to complete session');
    }
    setCompletingSession(false);
  };

  const allExercisesLogged = sessionDetails.length > 0 && sessionDetails.every(detail => sessionLogs.some(log => log.session_detail_id === detail.session_detail_id));

  const getTodaysCompletedCount = () => {
    const today = new Date().toISOString().slice(0, 10);
    return sessions.filter(s => s.scheduled_date.slice(0, 10) === today && s.completed).length;
  };

  const handleAddExercise = async () => {
    if (!detailsModal || !detailsModal.session || !addExerciseForm.exercise_id || !addExerciseForm.planned_sets || !addExerciseForm.planned_reps) return;
    setAddExerciseLoading(true);
    try {
      await addExercisesToSession(detailsModal.session.session_id, {
        exercises: [{
          exercise_id: parseInt(addExerciseForm.exercise_id),
          planned_sets: parseInt(addExerciseForm.planned_sets),
          planned_reps: parseInt(addExerciseForm.planned_reps)
        }]
      });
      setShowAddExerciseModal(false);
      setAddExerciseForm({ exercise_id: '', planned_sets: '', planned_reps: '' });
      openDetails(detailsModal.session);
    } catch (e) {
      setError('Failed to add exercise.');
    }
    setAddExerciseLoading(false);
  };

  const handleDeleteLog = async (logId: number) => {
    try {
      await fetch(`http://localhost:4000/api/workouts/log/${logId}`, { method: 'DELETE' });
      if (detailsModal?.session) openDetails(detailsModal.session);
    } catch (e) {
      alert('Failed to delete log');
    }
  };

  return (
    <PageContainer>
      <Navbar />
      <div style={{ marginTop: '2.5rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 className={styles.dashboardTitle} style={{ textAlign: 'center' }}>Workout Tracking</h2>
        <button className={styles.scheduleBtn} style={{ alignSelf: 'center' }} onClick={() => setShowForm(true)}>
          <HiPlusSm /> Schedule Workout
        </button>
      </div>

      <CardGrid className={styles.statsGrid}>
        <StatCard 
          value={workoutStats.totalWorkouts}
          label="Total Workouts"
          icon={<FaDumbbell />}
          className={styles.statCard}
        />
        <StatCard 
          value={getTodaysCompletedCount()}
          label="Today's Workout"
          icon={<FaFire />}
          className={styles.statCard}
        />
        <StatCard 
          value={`${workoutStats.weeklyStreak} weeks`}
          label="Current Streak"
          icon={<FaTrophy />}
          className={styles.statCard}
        />
        <StatCard 
          value={`${workoutStats.avgDuration} min`}
          label="Avg. Duration"
          icon={<FaClock />}
          className={styles.statCard}
        />
      </CardGrid>

      <DragDropContext onDragEnd={onDragEnd}>
        <StrictModeDroppable droppableId="sessions">
          {(provided: DroppableProvided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={styles.cardGrid}
            >
              {loading ? (
                <Card className={styles.loadingCard}>
                  <div className={styles.loader}>Loading...</div>
                </Card>
              ) : sessions.length === 0 ? (
                <Card className={styles.emptyCard}>
                  <p>No workouts scheduled. Start by scheduling your first workout!</p>
                  <button className={styles.scheduleBtn} onClick={() => setShowForm(true)}>
                    <HiPlusSm /> Schedule First Workout
                  </button>
                </Card>
              ) : (
                [...sessions].sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()).map((session, index) => (
                  <Draggable 
                    key={session.session_id} 
                    draggableId={session.session_id.toString()} 
                    index={index}
                  >
                    {(dragProvided: DraggableProvided, snapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                      >
                        <Card className={`${styles.sessionCard} ${snapshot.isDragging ? styles.dragging : ''}`}>
                          <div className={styles.sessionHeader}>
                            <div>
                              <h3 className={`${styles.sessionDate} ${session.completed ? styles.completed : ''}`}>{formatDate(session.scheduled_date)}</h3>
                              <div className={styles.sessionStatus}>
                                Status: {session.completed ? <span style={{ color: '#4caf50' }}>Complete</span> : <span style={{ color: '#ff3e3e' }}>Incomplete</span>}
                              </div>
                              <p className={styles.sessionType}>{session.type}</p>
                              {session.notes && (
                                <p className={styles.sessionNotes}>{session.notes}</p>
                              )}
                            </div>
                            <div className={styles.sessionActions}>
                              <button 
                                className={styles.detailsBtn}
                                onClick={() => openDetails(session)}
                              >
                                Details
                              </button>
                              <button 
                                className={styles.deleteBtn}
                                onClick={() => setDeleteSessionConfirm(session.session_id)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </Card>
                      </div>
                    )}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </StrictModeDroppable>
      </DragDropContext>

      {showForm && (
        <ModalContent title="Schedule Workout" onClose={() => setShowForm(false)}>
          <GridForm onSubmit={handleSchedule}>
            <div className={styles.formGroup}>
              <label>Date</label>
              <input
                type="date"
                value={formDate}
                onChange={e => setFormDate(e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Type</label>
              <select
                value={formType}
                onChange={e => setFormType(e.target.value)}
                required
              >
                {sessionTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Notes</label>
              <textarea
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                rows={3}
              />
            </div>

            {error && <div className={styles.error}>{error}</div>}
            
            <div className={styles.modalActions}>
              <button type="submit" className={styles.scheduleBtn}>Schedule</button>
              <button type="button" className={styles.cancelBtn} onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </GridForm>
        </ModalContent>
      )}

      {detailsModal?.open && (
        <ModalContent 
          title={`Workout Details - ${formatDate(detailsModal.session.scheduled_date)}`}
          onClose={() => setDetailsModal(null)}
        >
          <div className={styles.exercisesList} style={{ maxWidth: '900px', margin: '0 auto' }}>
            {sessionDetails.map((detail) => (
              <div
                key={detail.session_detail_id}
                className={styles.exerciseItem}
                style={{ display: 'flex', flexDirection: 'row', gap: '2.5rem', alignItems: 'flex-start' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={styles.exerciseInfoRow}>
                    <span className={styles.draggableIcon}>
                      
                    </span>
                    <div className={styles.exerciseInfo}>
                      <div className={styles.exerciseName}>{detail.name}</div>
                      <div className={styles.exerciseStats}>
                        <span>{detail.planned_sets} sets</span>
                        <span>{detail.planned_reps} reps</span>
                      </div>
                      {detail.description && <div className={styles.exerciseDescription}>{detail.description}</div>}
                    </div>
                  </div>
                  <div className={styles.exerciseActions}>
                    {!detailsModal.session.completed && (
                      <>
                        <button className={styles.logSetBtn} onClick={() => openLogModal(detail.exercise_id)}>Log Set</button>
                        <button className={styles.removeBtn} onClick={() => setDeleteExerciseConfirm(detail.session_detail_id)}>Remove</button>
                      </>
                    )}
                  </div>
                </div>
                {sessionLogs.filter(log => log.session_detail_id === detail.session_detail_id).length > 0 && (
                  <div className={styles.realityPerformanceBlock} style={{ flex: 1, minWidth: 0, borderLeft: '1px solid rgba(255,255,255,0.10)', paddingLeft: '2rem' }}>
                    <div className={styles.realityPerformanceLabel}>Reality performance:</div>
                    {sessionLogs.filter(log => log.session_detail_id === detail.session_detail_id).map(log => (
                      <div key={log.log_id} className={styles.exerciseLogItem}>
                        <span className={styles.logLeft}><strong>{log.actual_sets} sets</strong> x <strong>{log.actual_reps} reps</strong></span>
                        <span className={styles.logRight}>
                          <span className={styles.logDraggableIcon}>
                            
                          </span>
                          <span><strong>{log.weight_kg}kg</strong></span>
                          {log.notes && <span className="logNotes">({log.notes})</span>}
                          <button className={styles.deleteLogBtn} onClick={() => handleDeleteLog(log.log_id)}><FaTimes /></button>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {!detailsModal.session.completed && allExercisesLogged && (
              <button
                className={styles.completeSessionBtn}
                style={{ marginTop: 24, width: '100%' }}
                onClick={handleCompleteSession}
                disabled={completingSession}
              >
                {completingSession ? 'Completing...' : 'Complete Session'}
              </button>
            )}
            {!detailsModal.session.completed && !allExercisesLogged && (
              <div style={{ color: '#aaa', marginTop: 16, fontSize: '0.98em' }}>
                Log at least one set for every exercise to complete this session.
              </div>
            )}
            {!detailsModal.session.completed && (
              <button className={styles.addExerciseBtn} style={{ marginTop: 16, width: '100%' }} onClick={() => { setShowAddExerciseModal(true); fetchAllExercises(); }}>
                Add Exercise
              </button>
            )}
          </div>
        </ModalContent>
      )}

      {showAddExerciseModal && (
        <ModalContent title="Add Exercise to Session" onClose={() => setShowAddExerciseModal(false)}>
          <div className={styles.exerciseGrid}>
            {allExercises.map(exercise => (
              <div 
                key={exercise.exercise_id} 
                className={`${styles.exerciseOption} ${addExerciseForm.exercise_id === exercise.exercise_id.toString() ? styles.selected : ''}`}
                onClick={() => setAddExerciseForm(f => ({
                  ...f,
                  exercise_id: exercise.exercise_id.toString(),
                  planned_sets: exercise.default_sets?.toString() || '',
                  planned_reps: exercise.default_reps?.toString() || ''
                }))}
              >
                <div className={styles.exerciseName}>{exercise.name}</div>
                {exercise.description && (
                  <div className={styles.exerciseDescription}>{exercise.description}</div>
                )}
                {addExerciseForm.exercise_id === exercise.exercise_id.toString() && (
                  <div style={{ color: '#aaa', fontSize: '0.95em', marginTop: 4 }}>
                    Default: {exercise.default_sets || '-'} sets, {exercise.default_reps || '-'} reps
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem' }}>
            <input
              type="number"
              min="1"
              placeholder="Sets"
              value={addExerciseForm.planned_sets}
              onChange={e => setAddExerciseForm(f => ({ ...f, planned_sets: e.target.value }))}
              style={{ width: 80, padding: 8, borderRadius: 6, border: '1px solid #444', background: '#222', color: '#fff' }}
            />
            <input
              type="number"
              min="1"
              placeholder="Reps"
              value={addExerciseForm.planned_reps}
              onChange={e => setAddExerciseForm(f => ({ ...f, planned_reps: e.target.value }))}
              style={{ width: 80, padding: 8, borderRadius: 6, border: '1px solid #444', background: '#222', color: '#fff' }}
            />
            <button
              className={styles.addExerciseBtn}
              onClick={handleAddExercise}
              disabled={addExerciseLoading || !addExerciseForm.exercise_id || !addExerciseForm.planned_sets || !addExerciseForm.planned_reps}
            >
              {addExerciseLoading ? 'Adding...' : 'Add'}
            </button>
            <button
              className={styles.cancelBtn}
              onClick={() => setShowAddExerciseModal(false)}
            >
              Cancel
            </button>
          </div>
        </ModalContent>
      )}

      {deleteSessionConfirm && (
        <ModalContent title="Delete Workout" onClose={() => setDeleteSessionConfirm(null)}>
          <div className={styles.deleteConfirm}>
            <p>Are you sure you want to delete this workout?</p>
            <div className={styles.modalActions}>
              <button 
                className={styles.deleteBtn}
                onClick={() => handleDeleteSession(deleteSessionConfirm)}
              >
                Delete
              </button>
              <button 
                className={styles.cancelBtn}
                onClick={() => setDeleteSessionConfirm(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </ModalContent>
      )}

      {deleteExerciseConfirm && (
        <ModalContent title="Delete Exercise" onClose={() => setDeleteExerciseConfirm(null)}>
          <div className={styles.deleteConfirm}>
            <p>Are you sure you want to remove this exercise?</p>
            <div className={styles.modalActions}>
              <button 
                className={styles.deleteBtn}
                onClick={() => handleDeleteExercise(deleteExerciseConfirm)}
              >
                Delete
              </button>
              <button 
                className={styles.cancelBtn}
                onClick={() => setDeleteExerciseConfirm(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </ModalContent>
      )}

      {showLogModal && (
        <ModalContent title="Log Set">
          <div className={styles.formGroup}>
            <label>Sets</label>
            <input
              type="number"
              min="1"
              value={logForm.actual_sets}
              onChange={e => setLogForm(f => ({ ...f, actual_sets: e.target.value }))}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Reps</label>
            <input
              type="number"
              min="1"
              value={logForm.actual_reps}
              onChange={e => setLogForm(f => ({ ...f, actual_reps: e.target.value }))}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Weight (kg)</label>
            <input
              type="number"
              min="0"
              value={logForm.weight_kg}
              onChange={e => setLogForm(f => ({ ...f, weight_kg: e.target.value }))}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Notes</label>
            <textarea
              value={logForm.notes}
              onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
            />
          </div>
          <div className={styles.modalActions}>
            <button className={styles.addExerciseBtn} onClick={handleSubmitLog} disabled={!logForm.actual_sets || !logForm.actual_reps}>
              Log
            </button>
            <button className={styles.cancelBtn} onClick={() => setShowLogModal(false)}>
              Cancel
            </button>
          </div>
        </ModalContent>
      )}
    </PageContainer>
  );
};

export default Workouts;