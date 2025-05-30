import React, { useEffect, useState } from 'react';
import Navbar from '../components/NavBar/NavBar';
import { useAuth } from '../context/AuthContext';
import * as api from '../api';
import { DragDropContext, Draggable, DropResult, DroppableProvided, DraggableProvided } from '@hello-pangea/dnd';
import { StrictModeDroppable } from '../components/StrictModeDroppable';
import FlipMove from 'react-flip-move';

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
  const [selectedForMove, setSelectedForMove] = useState<number | null>(null);
  const [deleteLogConfirm, setDeleteLogConfirm] = useState<number | null>(null);
  const [deleteExerciseConfirm, setDeleteExerciseConfirm] = useState<number | null>(null);
  const [deleteSessionConfirm, setDeleteSessionConfirm] = useState<number | null>(null);
  const [formType, setFormType] = useState(sessionTypes[0]);
  const [completeError, setCompleteError] = useState('');

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
    const res = await api.createSession({ user_id: user?.user_id, scheduled_date: formDate, notes: formNotes, type: formType });
    if (res.session_id) {
      setShowForm(false);
      setFormDate('');
      setFormNotes('');
      setFormType(sessionTypes[0]);
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

  const handleReorderClick = (idx: number) => {
    if (selectedForMove === null) {
      setSelectedForMove(idx);
    } else if (selectedForMove !== idx) {
      // Move the selected exercise to the new position
      const reordered = Array.from(sessionDetails);
      const [removed] = reordered.splice(selectedForMove, 1);
      reordered.splice(idx, 0, removed);
      setSessionDetails(reordered);
      setSelectedForMove(null);
      // TODO: Optionally persist new order to backend
    } else {
      setSelectedForMove(null);
    }
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

  const handleDeleteSession = (session_id: number) => {
    setDeleteSessionConfirm(session_id);
  };

  const confirmDeleteSession = async () => {
    if (deleteSessionConfirm) {
      await fetch(`http://localhost:4000/api/workouts/${deleteSessionConfirm}`, { method: 'DELETE' });
      fetchSessions();
      setDetailsModal(null);
      setDeleteSessionConfirm(null);
    }
  };

  const handleDeleteExercise = (session_detail_id: number) => {
    setDeleteExerciseConfirm(session_detail_id);
  };

  const confirmDeleteExercise = async () => {
    if (deleteExerciseConfirm) {
      await fetch(`http://localhost:4000/api/workouts/details/${deleteExerciseConfirm}`, { method: 'DELETE' });
      if (detailsModal) openDetails(detailsModal.session);
      setDeleteExerciseConfirm(null);
    }
  };

  const handleDeleteLog = async (log_id: number) => {
    setDeleteLogConfirm(log_id);
  };

  const confirmDeleteLog = async () => {
    if (deleteLogConfirm) {
      await fetch(`http://localhost:4000/api/workouts/logs/${deleteLogConfirm}`, { method: 'DELETE' });
      if (detailsModal) openDetails(detailsModal.session);
      setDeleteLogConfirm(null);
    }
  };

  const canMarkCompleted =
    detailsModal?.session &&
    !detailsModal.session.completed &&
    sessionDetails.length > 0 &&
    sessionDetails.every(detail => sessionLogs.some(log => log.session_detail_id === detail.session_detail_id));

  const handleMarkCompleted = async () => {
    if (!detailsModal) return;
    setCompleteError('');
    const res = await api.markSessionCompleted(detailsModal.session.session_id);
    if (res.message === 'Session marked as completed.') {
      // Refresh session list and details
      fetchSessions();
      openDetails({ ...detailsModal.session, completed: true });
    } else {
      setCompleteError(res.message || 'Failed to mark as completed');
    }
  };

  // Add a grid style for columns
  const exerciseGrid = {
    display: 'grid',
    gridTemplateColumns: '32px 56px 180px 80px 80px 120px 1fr 320px',
    alignItems: 'center',
    gap: '0 24px',
    minHeight: 36,
    width: '100%',
    maxWidth: 1400,
    margin: '0 auto',
  };
  const cellStyle = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    padding: '0 2px',
    fontSize: 15,
  };
  const actionCol = {
    display: 'flex',
    flexDirection: 'row' as 'row',
    gap: 18,
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 240,
  };
  const btnBase = {
    width: 80,
    height: 36,
    fontSize: 15,
    borderRadius: 6,
    border: '2px solid',
    background: 'transparent',
    transition: 'background 0.2s, color 0.2s',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  const btnEdit = {
    ...btnBase,
    borderColor: '#36c',
    color: '#36c',
  };
  const btnDelete = {
    ...btnBase,
    borderColor: '#e44',
    color: '#e44',
  };
  const btnLog = {
    ...btnBase,
    borderColor: '#aaa',
    color: '#aaa',
  };
  const dragHandleStyle = {
    cursor: 'grab',
    fontSize: 20,
    color: '#888',
    padding: '0 4px',
    userSelect: 'none' as 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    width: 32,
  };
  const exerciseBlockStyle = {
    boxShadow: '0 2px 8px 0 #0002',
    borderRadius: 8,
    marginBottom: 12,
    background: '#232326',
    overflow: 'hidden',
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
              <div className="dashboard-value">Type: {session.type || '-'}</div>
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
                <select value={formType} onChange={e => setFormType(e.target.value)} required>
                  {sessionTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
                <input type="text" value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Notes (optional)" />
                <button className="btn-primary" type="submit" disabled={!formDate}>Create</button>
                <button className="btn-outline" type="button" onClick={() => setShowForm(false)}>Cancel</button>
                {error && <div className="error">{error}</div>}
              </form>
            </div>
          </div>
        )}
        {/* Delete session modal at root */}
        {deleteSessionConfirm && (
          <div className="modal-bg">
            <div className="auth-card" style={{ maxWidth: 340, textAlign: 'center' }}>
              <h3>Delete Session?</h3>
              <p style={{ margin: '16px 0', color: '#e44' }}>Are you sure you want to delete this session and all its data? This cannot be undone.</p>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 16 }}>
                <button className="btn-outline" style={{ borderColor: '#e44', color: '#e44', minWidth: 80 }} onClick={confirmDeleteSession}>Delete</button>
                <button className="btn-outline" style={{ minWidth: 80 }} onClick={() => setDeleteSessionConfirm(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        {/* Delete exercise modal at root */}
        {deleteExerciseConfirm && (
          <div className="modal-bg">
            <div className="auth-card" style={{ maxWidth: 340, textAlign: 'center' }}>
              <h3>Delete Exercise?</h3>
              <p style={{ margin: '16px 0', color: '#e44' }}>Are you sure you want to delete this exercise and all its logs? This cannot be undone.</p>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 16 }}>
                <button className="btn-outline" style={{ borderColor: '#e44', color: '#e44', minWidth: 80 }} onClick={confirmDeleteExercise}>Delete</button>
                <button className="btn-outline" style={{ minWidth: 80 }} onClick={() => setDeleteExerciseConfirm(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        {/* Delete log modal at root */}
        {deleteLogConfirm && (
          <div className="modal-bg">
            <div className="auth-card" style={{ maxWidth: 340, textAlign: 'center' }}>
              <h3>Delete Log Entry?</h3>
              <p style={{ margin: '16px 0', color: '#e44' }}>Are you sure you want to delete this log entry? This cannot be undone.</p>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 16 }}>
                <button className="btn-outline" style={{ borderColor: '#e44', color: '#e44', minWidth: 80 }} onClick={confirmDeleteLog}>Delete</button>
                <button className="btn-outline" style={{ minWidth: 80 }} onClick={() => setDeleteLogConfirm(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        {detailsModal?.open && (
          <div className="modal-bg">
            <div className="auth-card" style={{ maxWidth: '1400px', minWidth: 700, textAlign: 'left' }}>
              <h3>Session Details</h3>
              <div><b>Date:</b> {formatDate(detailsModal.session.scheduled_date)}</div>
              <div><b>Type:</b> {detailsModal.session.type || '-'}</div>
              <div><b>Notes:</b> {detailsModal.session.notes || '-'}</div>
              <div><b>Completed:</b> {detailsModal.session.completed ? 'Yes' : 'No'}</div>
              {canMarkCompleted && (
                <button className="btn-primary" style={{ margin: '16px 0 0 0' }} onClick={handleMarkCompleted}>Mark as Completed</button>
              )}
              {completeError && <div className="error" style={{ marginTop: 8 }}>{completeError}</div>}
              <div style={{ margin: '18px 0 8px 0', fontWeight: 600 }}>
                Exercises:
              </div>
              <div style={{ ...exerciseGrid, fontWeight: 700, color: '#aaa', background: 'none', border: 'none', marginBottom: 4, maxWidth: 1400, width: '100%' }}>
                <div style={cellStyle}></div> {/* Reorder icon col */}
                <div style={cellStyle}>Type</div>
                <div style={cellStyle}>Name</div>
                <div style={cellStyle}>Sets</div>
                <div style={cellStyle}>Reps</div>
                <div style={cellStyle}>Weight</div>
                <div style={cellStyle}>Note</div>
                <div style={{ ...cellStyle, textAlign: 'center' }}>Actions</div>
              </div>
              <div style={{ width: '100%', maxWidth: 1400, margin: '0 auto' }}>
                <FlipMove duration={350} easing="ease-in-out">
                  {sessionDetails.map((detail, idx) => {
                    const logs = sessionLogs.filter(l => l.session_detail_id === detail.session_detail_id);
                    const isSelected = selectedForMove === idx;
                    return (
                      <div
                        key={detail.session_detail_id}
                        style={{
                          ...exerciseBlockStyle,
                          width: '100%',
                          boxSizing: 'border-box',
                          border: isSelected ? '2px solid #e66' : 'none',
                          background: isSelected ? '#29292c' : exerciseBlockStyle.background,
                          marginBottom: 18,
                          boxShadow: '0 2px 8px 0 #0002',
                        }}
                      >
                        {/* Plan row */}
                        <div style={{ ...exerciseGrid, background: 'transparent', borderRadius: '8px 8px 0 0', borderBottom: '1px solid #29292c' }}>
                          <div style={dragHandleStyle}>
                            <button
                              style={{
                                background: isSelected ? '#e66' : 'transparent',
                                color: isSelected ? '#fff' : '#888',
                                border: 'none',
                                fontSize: 18,
                                cursor: 'pointer',
                                width: 28,
                                height: 28,
                                borderRadius: 4,
                              }}
                              title={selectedForMove === null ? 'Select to move' : isSelected ? 'Cancel move' : 'Move here'}
                              onClick={() => handleReorderClick(idx)}
                            >↕</button>
                          </div>
                          <div style={{ ...cellStyle, fontWeight: 600, color: '#e66' }}>Plan</div>
                          <div style={{ ...cellStyle, fontWeight: 700 }}>{detail.name}</div>
                          <div style={cellStyle}>{detail.planned_sets}</div>
                          <div style={cellStyle}>{detail.planned_reps}</div>
                          <div style={cellStyle}></div>
                          <div style={cellStyle}>{detail.description}</div>
                          <div style={actionCol}>
                            <button style={btnEdit} className="btn-outline" onMouseOver={e => e.currentTarget.style.background = '#36c1'} onMouseOut={e => e.currentTarget.style.background = 'transparent'} onClick={() => handleEditClick(detail)}>Edit</button>
                            <button style={btnDelete} className="btn-outline" onMouseOver={e => e.currentTarget.style.background = '#e441'} onMouseOut={e => e.currentTarget.style.background = 'transparent'} onClick={() => handleDeleteExercise(detail.session_detail_id)}>Delete</button>
                            <button style={btnLog} className="btn-outline" onMouseOver={e => e.currentTarget.style.background = '#aaa2'} onMouseOut={e => e.currentTarget.style.background = 'transparent'} onClick={() => { setShowLogForm(detail.session_detail_id); setLogForm({ actual_sets: '', actual_reps: '', weight_kg: '', notes: '' }); }}>Log</button>
                          </div>
                        </div>
                        {/* Actual rows: one for each log */}
                        {logs.map((log, logIdx) => (
                          <div key={log.log_id} style={{ ...exerciseGrid, background: 'transparent', borderRadius: logIdx === logs.length - 1 ? '0 0 8px 8px' : 0, marginTop: 6 }}>
                            <div style={dragHandleStyle}></div>
                            <div style={{ ...cellStyle, fontWeight: 600, color: '#6e6' }}>Actual</div>
                            <div style={{ ...cellStyle, fontWeight: 700 }}>{detail.name}</div>
                            <div style={cellStyle}>{log.actual_sets}</div>
                            <div style={cellStyle}>{log.actual_reps}</div>
                            <div style={cellStyle}>{log.weight_kg} kg</div>
                            <div style={cellStyle}>{log.notes}</div>
                            <div style={actionCol}>
                              <button style={btnEdit} className="btn-outline" onMouseOver={e => e.currentTarget.style.background = '#36c1'} onMouseOut={e => e.currentTarget.style.background = 'transparent'} onClick={() => {/* TODO: handle edit log */}}>Edit</button>
                              <button style={btnDelete} className="btn-outline" onMouseOver={e => e.currentTarget.style.background = '#e441'} onMouseOut={e => e.currentTarget.style.background = 'transparent'} onClick={() => handleDeleteLog(log.log_id)}>Delete</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </FlipMove>
              </div>
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