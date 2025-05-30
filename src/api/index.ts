const API_URL = 'http://localhost:4000/api';

let token: string | null = null;

export const setToken = (newToken: string) => {
  token = newToken;
};

const getHeaders = (isJson = true) => ({
  ...(isJson ? { 'Content-Type': 'application/json' } : {}),
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
export const generateSummary = (data: any) =>
  fetch(`${API_URL}/summary/generate`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(res => res.json());

export const getSummary = (params: any) => {
  const query = new URLSearchParams(params).toString();
  return fetch(`${API_URL}/summary?${query}`, {
    headers: getHeaders(),
  }).then(res => res.json());
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