import React, { useEffect, useState } from 'react';
import Navbar from '../components/NavBar/NavBar';
import { useAuth } from '../context/AuthContext';
import * as api from '../api';
import { DragDropContext, Draggable, DropResult, DroppableProvided, DraggableProvided } from '@hello-pangea/dnd';
import { StrictModeDroppable } from '../components/StrictModeDroppable';

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
  default_sets?: number;
  default_reps?: number;
  description?: string;
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
  const [logForm, setLogForm] = useState({ actual_sets: '', actual_reps: '', weight_kg: '', notes: '' });
  const [logError, setLogError] = useState('');
  const [editExerciseDetail, setEditExerciseDetail] = useState<SessionDetail | null>(null);
  const [editForm, setEditForm] = useState({ planned_sets: '', planned_reps: '', notes: '' });

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
        notes: logForm.notes
      })
    });
    const data = await res.json();
    if (data.message === 'Workout logged.') {
      setShowLogForm(null);
      setLogForm({ actual_sets: '', actual_reps: '', weight_kg: '', notes: '' });
      openDetails(detailsModal!.session);
    } else {
      setLogError(data.message || 'Failed to log workout');
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const moveExercise = (idx: number, direction: number) => {
    // TODO: Implement reordering logic and persist to backend
    // For now, just a stub
  };

  const editExercise = (detail: SessionDetail) => {
    // TODO: Implement edit modal logic
    // For now, just a stub
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(sessionDetails);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    setSessionDetails(reordered);
    // TODO: Optionally persist new order to backend
  };

  const handleEditSave = () => {
    // TODO: Persist edit to backend
    if (editExerciseDetail) {
      setSessionDetails(details => details.map(d => d.session_detail_id === editExerciseDetail.session_detail_id ? {
        ...d,
        planned_sets: Number(editForm.planned_sets),
        planned_reps: Number(editForm.planned_reps),
        description: editForm.notes
      } : d));
      setEditExerciseDetail(null);
    }
  };

  const handleEditClick = (detail: SessionDetail) => {
    setEditExerciseDetail(detail);
    setEditForm({
      planned_sets: detail.planned_sets.toString(),
      planned_reps: detail.planned_reps.toString(),
      notes: detail.description || ''
    });
  };

  const handleDeleteSession = async (session_id: number) => {
    if (!window.confirm('Delete this session and all its data?')) return;
    await fetch(`http://localhost:4000/api/workouts/${session_id}`, { method: 'DELETE' });
    fetchSessions();
    setDetailsModal(null);
  };

  const handleDeleteExercise = async (session_detail_id: number) => {
    if (!window.confirm('Delete this exercise and its logs?')) return;
    await fetch(`http://localhost:4000/api/workouts/details/${session_detail_id}`, { method: 'DELETE' });
    if (detailsModal) openDetails(detailsModal.session);
  };

  // Add a grid style for columns
  const exerciseGrid = {
    display: 'grid',
    gridTemplateColumns: '60px 120px 60px 60px 80px 1fr 100px',
    alignItems: 'center',
    gap: '0 8px',
    minHeight: 40,
  };
  const cellStyle = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    padding: '0 4px',
  };
  const actionCol = {
    display: 'flex',
    flexDirection: 'column' as 'column',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
  };
  const btnOutline = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 32,
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
              <div className="dashboard-value">Date: {formatDate(session.scheduled_date)}</div>
              <div className="dashboard-value">Notes: {session.notes || '-'}</div>
              <div className="dashboard-value">Completed: {session.completed ? 'Yes' : 'No'}</div>
              <button className="btn-primary" onClick={() => openDetails(session)}>View Details</button>
              <button className="btn-outline" style={{ marginLeft: 8 }} onClick={() => handleDeleteSession(session.session_id)}>Delete</button>
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
            <div className="auth-card" style={{ maxWidth: '80vw', minWidth: 700, textAlign: 'left' }}>
              <h3>Session Details</h3>
              <div><b>Date:</b> {formatDate(detailsModal.session.scheduled_date)}</div>
              <div><b>Notes:</b> {detailsModal.session.notes || '-'}</div>
              <div><b>Completed:</b> {detailsModal.session.completed ? 'Yes' : 'No'}</div>
              <div style={{ margin: '18px 0 8px 0', fontWeight: 600 }}>
                Exercises:
              </div>
              <div style={{ ...exerciseGrid, fontWeight: 700, color: '#aaa', background: 'none', border: 'none', marginBottom: 4 }}>
                <div style={cellStyle}>Type</div>
                <div style={cellStyle}>Name</div>
                <div style={cellStyle}>Sets</div>
                <div style={cellStyle}>Reps</div>
                <div style={cellStyle}>Weight</div>
                <div style={cellStyle}>Note</div>
                <div style={{ ...cellStyle, textAlign: 'center' }}>Actions</div>
              </div>
              <DragDropContext onDragEnd={onDragEnd}>
                <StrictModeDroppable droppableId="exercises">
                  {(provided: DroppableProvided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}>
                      {sessionDetails.map((detail, idx) => {
                        const log = sessionLogs.find(l => l.session_detail_id === detail.session_detail_id);
                        return (
                          <Draggable key={detail.session_detail_id} draggableId={detail.session_detail_id.toString()} index={idx}>
                            {(providedDraggable: DraggableProvided) => (
                              <div ref={providedDraggable.innerRef} {...providedDraggable.draggableProps} {...providedDraggable.dragHandleProps}>
                                {/* Plan row */}
                                <div style={{ ...exerciseGrid, background: '#232326', borderRadius: 6, marginBottom: 2 }}>
                                  <div style={{ ...cellStyle, fontWeight: 600, color: '#e66' }}>Plan</div>
                                  <div style={{ ...cellStyle, fontWeight: 700 }}>{detail.name}</div>
                                  <div style={cellStyle}>{detail.planned_sets}</div>
                                  <div style={cellStyle}>{detail.planned_reps}</div>
                                  <div style={cellStyle}></div>
                                  <div style={cellStyle}>{detail.description}</div>
                                  <div style={actionCol}>
                                    <button className="btn-outline" style={btnOutline} onClick={() => handleEditClick(detail)}>Edit</button>
                                  </div>
                                </div>
                                {/* Actual row */}
                                {log && (
                                  <div style={{ ...exerciseGrid, background: '#18181a', borderRadius: 6, marginBottom: 8 }}>
                                    <div style={{ ...cellStyle, fontWeight: 600, color: '#6e6' }}>Actual</div>
                                    <div style={{ ...cellStyle, fontWeight: 700 }}>{detail.name}</div>
                                    <div style={cellStyle}>{log.actual_sets}</div>
                                    <div style={cellStyle}>{log.actual_reps}</div>
                                    <div style={cellStyle}>{log.weight_kg} kg</div>
                                    <div style={cellStyle}>{log.notes}</div>
                                    <div style={actionCol}>
                                      <button className="btn-outline" style={btnOutline} onClick={() => handleDeleteExercise(detail.session_detail_id)}>Delete</button>
                                      <button className="btn-outline" style={btnOutline} onClick={() => { setShowLogForm(detail.session_detail_id); setLogForm({ actual_sets: '', actual_reps: '', weight_kg: '', notes: '' }); }}>Log</button>
                                    </div>
                                  </div>
                                )}
                                {!log && (
                                  <div style={{ ...exerciseGrid, background: '#18181a', borderRadius: 6, marginBottom: 8 }}>
                                    <div style={{ ...cellStyle, fontWeight: 600, color: '#6e6' }}>Actual</div>
                                    <div style={{ ...cellStyle, fontWeight: 700 }}>{detail.name}</div>
                                    <div style={cellStyle}></div>
                                    <div style={cellStyle}></div>
                                    <div style={cellStyle}></div>
                                    <div style={cellStyle}></div>
                                    <div style={actionCol}>
                                      <button className="btn-outline" style={btnOutline} onClick={() => handleDeleteExercise(detail.session_detail_id)}>Delete</button>
                                      <button className="btn-outline" style={btnOutline} onClick={() => { setShowLogForm(detail.session_detail_id); setLogForm({ actual_sets: '', actual_reps: '', weight_kg: '', notes: '' }); }}>Log</button>
                                    </div>
                                  </div>
                                )}
                                <hr style={{ border: '0', borderTop: '1px solid #333', margin: '0 0 10px 0' }} />
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </StrictModeDroppable>
              </DragDropContext>
              <button className="btn-primary" style={{ marginBottom: 16 }} onClick={() => { setShowAddExercise(true); fetchAllExercises(); }}>Add Exercise</button>
              <button className="btn-outline" style={{ marginTop: 16 }} onClick={() => setDetailsModal(null)}>Close</button>
            </div>
            {editExerciseDetail && (
              <div className="modal-bg">
                <div className="auth-card" style={{ maxWidth: 400 }}>
                  <h3>Edit Exercise</h3>
                  <input type="number" placeholder="Planned Sets" value={editForm.planned_sets} onChange={e => setEditForm(f => ({ ...f, planned_sets: e.target.value }))} required />
                  <input type="number" placeholder="Planned Reps" value={editForm.planned_reps} onChange={e => setEditForm(f => ({ ...f, planned_reps: e.target.value }))} required />
                  <input type="text" placeholder="Notes (optional)" value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
                  <button className="btn-primary" onClick={handleEditSave}>Save</button>
                  <button className="btn-outline" onClick={() => setEditExerciseDetail(null)}>Cancel</button>
                </div>
              </div>
            )}
            {showAddExercise && (
              <div className="modal-bg">
                <div className="auth-card" style={{ maxWidth: 400 }}>
                  <h3>Add Exercise</h3>
                  <form onSubmit={handleAddExercise}>
                    <select value={addExerciseForm.exercise_id} onChange={e => {
                      const ex = allExercises.find(x => x.exercise_id === Number(e.target.value));
                      setAddExerciseForm(f => ({
                        ...f,
                        exercise_id: e.target.value,
                        planned_sets: ex?.default_sets?.toString() || '',
                        planned_reps: ex?.default_reps?.toString() || ''
                      }));
                    }} required>
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