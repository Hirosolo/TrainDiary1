import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { DragDropContext, Draggable, DropResult, DroppableProvided, DraggableProvided } from '@hello-pangea/dnd';
import { FaDumbbell, FaFire, FaClock, FaTrophy } from 'react-icons/fa';
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
      day: 'numeric' 
    });
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

  const handleStartLog = async (detailId: number) => {
    if (detailsModal?.session.completed) {
      return;
    }

    try {
      const res = await fetch('http://localhost:4000/api/workouts/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_detail_id: detailId,
          actual_sets: 1,
          actual_reps: 1,
          weight_kg: 0,
          notes: ''
        })
      });
      const data = await res.json();
      if (data.message === 'Workout logged.') {
        if (detailsModal?.session) {
          openDetails(detailsModal.session);
        }
      } else {
        setError(data.message || 'Failed to log workout');
      }
    } catch (error) {
      console.error('Error logging workout:', error);
      setError('Failed to log workout');
    }
  };

  return (
    <PageContainer>
      <Navbar />
      <PageHeader title="Workout Tracking">
        <button 
          className="btn-primary" 
          onClick={() => setShowForm(true)}
        >
          <HiPlusSm /> Schedule Workout
        </button>
      </PageHeader>

      {/* Workout Stats */}
      <CardGrid className={styles.statsGrid}>
        <StatCard 
          value={workoutStats.totalWorkouts}
          label="Total Workouts"
          icon={<FaDumbbell />}
        />
        <StatCard 
          value={workoutStats.completedToday ? "Yes" : "Not Yet"}
          label="Today's Workout"
          icon={<FaFire />}
        />
        <StatCard 
          value={`${workoutStats.weeklyStreak} weeks`}
          label="Current Streak"
          icon={<FaTrophy />}
        />
        <StatCard 
          value={`${workoutStats.avgDuration} min`}
          label="Avg. Duration"
          icon={<FaClock />}
        />
      </CardGrid>

      {/* Sessions List */}
      <DragDropContext onDragEnd={onDragEnd}>
        <StrictModeDroppable droppableId="sessions">
          {(provided: DroppableProvided) => (
            <CardGrid
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {loading ? (
                <Card className={styles.loadingCard}>
                  <div className={styles.loader}>Loading...</div>
                </Card>
              ) : sessions.length === 0 ? (
                <Card className={styles.emptyCard}>
                  <p>No workouts scheduled. Start by scheduling your first workout!</p>
                  <button className="btn-primary" onClick={() => setShowForm(true)}>
                    <HiPlusSm /> Schedule First Workout
                  </button>
                </Card>
              ) : (
                sessions.map((session, index) => (
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
                          {session.completed && (
                            <div className={styles.completedBadge}>
                              Completed
                            </div>
                          )}
                          <div className={styles.sessionHeader}>
                            <div>
                              <h3 className={styles.sessionDate}>{formatDate(session.scheduled_date)}</h3>
                              <p className={styles.sessionType}>{session.type}</p>
                              {session.notes && (
                                <p className={styles.sessionNotes}>{session.notes}</p>
                              )}
                            </div>
                            <div className={styles.sessionActions}>
                              <button 
                                className="btn-secondary"
                                onClick={() => openDetails(session)}
                              >
                                Details
                              </button>
                              <button 
                                className="btn-icon-danger"
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
            </CardGrid>
          )}
        </StrictModeDroppable>
      </DragDropContext>

      {/* Schedule Workout Modal */}
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
              <button type="submit" className="btn-primary">Schedule</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </GridForm>
        </ModalContent>
      )}

      {/* Session Details Modal */}
      {detailsModal?.open && (
        <ModalContent 
          title={`Workout Details - ${formatDate(detailsModal.session.scheduled_date)}`}
          onClose={() => setDetailsModal(null)}
        >
          <div className={styles.exercisesList}>
            {sessionDetails.map(detail => (
              <div key={detail.session_detail_id} className={styles.exerciseItem}>
                <div className={styles.exerciseInfo}>
                  <div className={styles.exerciseName}>{detail.name}</div>
                  <div className={styles.exerciseStats}>
                    <span>{detail.planned_sets} sets</span>
                    <span>{detail.planned_reps} reps</span>
                  </div>
                </div>
                <div className={styles.exerciseActions}>
                  {!detailsModal.session.completed && (
                    <>
                      <button
                        className="btn-secondary"
                        onClick={() => handleStartLog(detail.session_detail_id)}
                      >
                        Log Set
                      </button>
                      <button
                        className="btn-icon-danger"
                        onClick={() => setDeleteExerciseConfirm(detail.session_detail_id)}
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            
            {!detailsModal.session.completed && (
              <button 
                className="btn-secondary" 
                onClick={() => {
                  fetchAllExercises();
                  setShowAddExercise(true);
                }}
              >
                <HiPlusSm /> Add Exercise
              </button>
            )}
          </div>

          {showAddExercise && (
            <div className={styles.exerciseGrid}>
              {allExercises.map(exercise => (
                <div 
                  key={exercise.exercise_id} 
                  className={`${styles.exerciseOption} ${
                    addExerciseForm.exercise_id === exercise.exercise_id.toString() ? styles.selected : ''
                  }`}
                  onClick={() => handleSelectExercise(exercise)}
                >
                  <div className={styles.exerciseName}>{exercise.name}</div>
                  {exercise.description && (
                    <div className={styles.exerciseDescription}>{exercise.description}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Rest of the modals and forms remain mostly unchanged */}
          {/* ... */}
        </ModalContent>
      )}

      {/* Delete Confirmation Modals */}
      {deleteSessionConfirm && (
        <ModalContent title="Delete Workout" onClose={() => setDeleteSessionConfirm(null)}>
          <div className={styles.deleteConfirm}>
            <p>Are you sure you want to delete this workout?</p>
            <div className={styles.modalActions}>
              <button 
                className="btn-danger"
                onClick={() => handleDeleteSession(deleteSessionConfirm)}
              >
                Delete
              </button>
              <button 
                className="btn-secondary"
                onClick={() => setDeleteSessionConfirm(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </ModalContent>
      )}

      {/* Exercise Details Modal */}
      {deleteExerciseConfirm && (
        <ModalContent title="Delete Exercise" onClose={() => setDeleteExerciseConfirm(null)}>
          <div className={styles.deleteConfirm}>
            <p>Are you sure you want to remove this exercise?</p>
            <div className={styles.modalActions}>
              <button 
                className="btn-danger"
                onClick={() => handleDeleteExercise(deleteExerciseConfirm)}
              >
                Delete
              </button>
              <button 
                className="btn-secondary"
                onClick={() => setDeleteExerciseConfirm(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </ModalContent>
      )}
    </PageContainer>
  );
};

export default Workouts;