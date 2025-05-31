const API_URL = 'http://localhost:4000/api';

let token: string | null = localStorage.getItem('token');

export const setToken = (newToken: string) => {
  token = newToken;
};

const getHeaders = (isJson = true) => ({
  ...(isJson ? { 'Content-Type': 'application/json' } : {}),
  ...((token || localStorage.getItem('token')) ? { Authorization: `Bearer ${token || localStorage.getItem('token')}` } : {}),
});

// Auth
export const register = (data: any) =>
  fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(res => res.json());

export const login = (data: any) =>
  fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(res => res.json());

// Workouts
export const createSession = (data: any) =>
  fetch(`${API_URL}/workouts`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(res => res.json());

export const addExercisesToSession = (sessionId: number, data: any) =>
  fetch(`${API_URL}/workouts/${sessionId}/exercises`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(res => res.json());

export const logWorkout = (data: any) =>
  fetch(`${API_URL}/workouts/log`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(res => res.json());

export const markSessionCompleted = (sessionId: number) =>
  fetch(`${API_URL}/workouts/${sessionId}/complete`, {
    method: 'PATCH',
    headers: getHeaders(),
  }).then(res => res.json());

// Foods
export const addFood = (data: any) =>
  fetch(`${API_URL}/foods`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(res => res.json());

export const addFoodLog = (data: any) =>
  fetch(`${API_URL}/foods/logs`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(res => res.json());

export const editFoodLog = (logId: number, data: any) =>
  fetch(`${API_URL}/foods/logs/${logId}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(res => res.json());

export const deleteFoodLog = (logId: number) =>
  fetch(`${API_URL}/foods/logs/${logId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  }).then(res => res.json());

// Summary
export const generateSummary = async (data: any) => {
  console.log('API: Generating summary with data:', data);
  const res = await fetch(`${API_URL}/summary/generate`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  const result = await res.json();
  console.log('API: Summary generation result:', result);
  return result;
};

export const getSummary = async (data: any) => {
  console.log('API: Fetching summary with params:', data);
  const params = new URLSearchParams({
    user_id: data.user_id,
    period_type: data.period_type,
    period_start: data.period_start,
  });
  const res = await fetch(`${API_URL}/summary?${params}`, {
    headers: getHeaders(),
  });
  const result = await res.json();
  console.log('API: Summary fetch result:', result);
  return result;
};

// Plans
export const listPlans = () =>
  fetch(`${API_URL}/plans`, { headers: getHeaders() }).then(res => res.json());

export const getPlanDetails = (planId: number) =>
  fetch(`${API_URL}/plans/${planId}`, { headers: getHeaders() }).then(res => res.json());

export const applyPlan = (data: any) =>
  fetch(`${API_URL}/plans/apply`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(res => res.json());

export const getMeals = (user_id: number) =>
  fetch(`${API_URL}/foods/meals?user_id=${user_id}`, {
    headers: getHeaders(),
  }).then(res => res.json());

export const getSessions = (user_id: number) =>
  fetch(`${API_URL}/workouts?user_id=${user_id}`, {
    headers: getHeaders(),
  }).then(res => res.json());