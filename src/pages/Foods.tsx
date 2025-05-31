import React, { useEffect, useState } from 'react';
import Navbar from '../components/NavBar/NavBar';
import { useAuth } from '../context/AuthContext';
import { useDashboardRefresh } from '../context/DashboardRefreshContext';
interface Meal {
  meal_id: number;
  log_date: string;
  meal_type: string;
}
interface MealFood {
  food_id: number;
  name: string;
  amount_grams: number;
  calories_per_serving: number;
  protein_per_serving: number;
  carbs_per_serving: number;
  fat_per_serving: number;
  serving_type: string;
  image?: string;
}
interface Food {
  food_id: number;
  name: string;
  calories_per_serving: number;
  protein_per_serving: number;
  carbs_per_serving: number;
  fat_per_serving: number;
  serving_type: string;
  image?: string;
}

const Foods: React.FC = () => {  const { user } = useAuth();
  const { triggerRefresh } = useDashboardRefresh();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ log_date: '', meal_type: 'breakfast' });
  const [mealFoods, setMealFoods] = useState<{ food: Food; amount_grams: string }[]>([]);
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [foods, setFoods] = useState<Food[]>([]);
  const [foodSearch, setFoodSearch] = useState('');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [amountGrams, setAmountGrams] = useState('');
  const [error, setError] = useState('');
  const [expandedMeal, setExpandedMeal] = useState<number | null>(null);
  const [mealDetails, setMealDetails] = useState<MealFood[]>([]);
  const [deleteMealId, setDeleteMealId] = useState<number | null>(null);

  useEffect(() => {
    if (user) fetchMeals();
    // eslint-disable-next-line
  }, [user]);

  const fetchMeals = async () => {
    setLoading(true);
    const res = await fetch(`http://localhost:4000/api/foods/meals?user_id=${user?.user_id}`);
    const data = await res.json();
    setMeals(data);
    setLoading(false);
  };

  const fetchFoods = async () => {
    const res = await fetch('http://localhost:4000/api/foods');
    const data = await res.json();
    setFoods(data);
  };

  const handleAddFood = () => {
    setFoodSearch('');
    setSelectedFood(null);
    setAmountGrams('');
    fetchFoods();
    setShowFoodModal(true);
  };

  const handleSelectFood = (food: Food) => {
    setSelectedFood(food);
    setAmountGrams('');
  };

  const handleAddFoodToMeal = () => {
    if (selectedFood && amountGrams) {
      setMealFoods([...mealFoods, { food: selectedFood, amount_grams: amountGrams }]);
      setShowFoodModal(false);
      setSelectedFood(null);
      setAmountGrams('');
    }
  };

  const handleLogMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (mealFoods.length === 0) {
      setError('Add at least one food.');
      return;
    }
    const foodsPayload = mealFoods.map(f => ({ food_id: f.food.food_id, amount_grams: f.amount_grams }));    try {
      setError('');
      
      // Step 1: Log the meal
      const res = await fetch('http://localhost:4000/api/foods/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.user_id, meal_type: form.meal_type, log_date: form.log_date, foods: foodsPayload })
      });
      const data = await res.json();
      
      if (data.meal_id) {        // Step 2: Generate new summaries (both daily and weekly)
        const generateSummaries = async () => {
          // Generate daily summary
          const dailySummaryRes = await fetch('http://localhost:4000/api/summary/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: user?.user_id,
              period_type: 'daily',
              period_start: new Date().toISOString().slice(0, 10)
            })
          });

          if (!dailySummaryRes.ok) {
            console.error('Failed to generate daily summary:', await dailySummaryRes.text());
          }

          // Generate weekly summary
          const weeklySummaryRes = await fetch('http://localhost:4000/api/summary/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: user?.user_id,
              period_type: 'weekly',
              period_start: new Date().toISOString().slice(0, 10)
            })
          });

          if (!weeklySummaryRes.ok) {
            console.error('Failed to generate weekly summary:', await weeklySummaryRes.text());
          }
        };

        await generateSummaries();
        // Step 3: Clean up UI state
        setShowForm(false);
        setForm({ log_date: '', meal_type: 'breakfast' });
        setMealFoods([]);
        
        // Step 4: Refresh data
        await fetchMeals();
        triggerRefresh();
      } else {
        setError(data.message || 'Failed to log meal');
      }
    } catch (err) {
      console.error('Error logging meal:', err);
      setError('Failed to log meal. Please try again.');
    }
  };

  const handleExpandMeal = async (meal_id: number) => {
    if (expandedMeal === meal_id) {
      setExpandedMeal(null);
      setMealDetails([]);
      return;
    }
    setExpandedMeal(meal_id);
    const res = await fetch(`http://localhost:4000/api/foods/meals/${meal_id}`);
    const data = await res.json();
    setMealDetails(data);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleDeleteMeal = (meal_id: number) => {
    setDeleteMealId(meal_id);
  };

  const confirmDeleteMeal = async () => {
    if (deleteMealId) {
      await fetch(`http://localhost:4000/api/foods/meals/${deleteMealId}`, { method: 'DELETE' });
      setDeleteMealId(null);
      fetchMeals();
      triggerRefresh();
    }
  };

  return (
    <div className="dashboard-bg">
      <Navbar />
      <div className="dashboard-content">
        <h2 className="dashboard-title">Your Meals</h2>
        <div className="dashboard-cards">
          {loading ? <div>Loading...</div> : meals.length === 0 ? <div>No meals yet.</div> : meals.map(meal => (
            <div className="dashboard-card" key={meal.meal_id}>
              <h3>{meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1)} - {formatDate(meal.log_date)}</h3>
              <button className="btn-outline" onClick={() => handleExpandMeal(meal.meal_id)}>
                {expandedMeal === meal.meal_id ? 'Hide Details' : 'View Details'}
              </button>
              <button className="btn-outline" style={{ marginLeft: 8, borderColor: '#e44', color: '#e44' }} onClick={() => handleDeleteMeal(meal.meal_id)}>Delete</button>
              {expandedMeal === meal.meal_id && (
                <div style={{ marginTop: 16 }}>
                  {mealDetails.length === 0 ? <div>No foods in this meal.</div> : (
                    <table style={{ width: '100%', color: 'var(--text-color)', background: 'transparent' }}>
                      <thead>
                        <tr>
                          <th>Food</th>
                          <th>Amount (servings)</th>
                          <th>Serving Type</th>
                          <th>Calories</th>
                          <th>Protein</th>
                          <th>Carbs</th>
                          <th>Fat</th>
                          <th>Image</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mealDetails.map(f => (
                          <tr key={f.food_id}>
                            <td>{f.name}</td>
                            <td>{f.amount_grams}</td>
                            <td>{f.serving_type}</td>
                            <td>{((f.calories_per_serving * f.amount_grams)).toFixed(1)}</td>
                            <td>{((f.protein_per_serving * f.amount_grams)).toFixed(1)}</td>
                            <td>{((f.carbs_per_serving * f.amount_grams)).toFixed(1)}</td>
                            <td>{((f.fat_per_serving * f.amount_grams)).toFixed(1)}</td>
                            <td>{f.image ? <img src={`/Assest/${f.image}`} alt={f.name} style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} /> : null}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="dashboard-cta">
          <button className="btn-primary" onClick={() => setShowForm(true)}>Log New Meal</button>
        </div>
        {showForm && (
          <div className="modal-bg">
            <div className="auth-card">
              <h3>Log Meal</h3>
              <form onSubmit={handleLogMeal}>
                <input type="date" value={form.log_date} onChange={e => setForm(f => ({ ...f, log_date: e.target.value }))} required />
                <select value={form.meal_type} onChange={e => setForm(f => ({ ...f, meal_type: e.target.value }))}>
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
                <div style={{ margin: '16px 0' }}>
                  <button type="button" className="btn-outline" onClick={handleAddFood}>Add Food</button>
                </div>
                {mealFoods.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <table style={{ width: '100%', color: 'var(--text-color)', background: 'transparent' }}>
                      <thead>
                        <tr>
                          <th>Food</th>
                          <th>Amount (g)</th>
                          <th>Calories</th>
                          <th>Protein</th>
                          <th>Carbs</th>
                          <th>Fat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mealFoods.map((f, i) => (
                          <tr key={i}>
                            <td>{f.food.name}</td>
                            <td>{f.amount_grams}</td>
                            <td>{((f.food.calories_per_serving * Number(f.amount_grams)) / 100).toFixed(1)}</td>
                            <td>{((f.food.protein_per_serving * Number(f.amount_grams)) / 100).toFixed(1)}</td>
                            <td>{((f.food.carbs_per_serving * Number(f.amount_grams)) / 100).toFixed(1)}</td>
                            <td>{((f.food.fat_per_serving * Number(f.amount_grams)) / 100).toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <button className="btn-primary" type="submit" disabled={!form.log_date || mealFoods.length === 0}>Log Meal</button>
                <button className="btn-outline" type="button" onClick={() => { setShowForm(false); setMealFoods([]); }}>Cancel</button>
                {error && <div className="error">{error}</div>}
              </form>
            </div>
          </div>
        )}
        {showFoodModal && (
          <div className="modal-bg">
            <div className="auth-card" style={{ maxWidth: 600 }}>
              <h3>Choose Food</h3>
              <input
                type="text"
                placeholder="Search food..."
                value={foodSearch}
                onChange={e => setFoodSearch(e.target.value)}
                style={{ marginBottom: 12 }}
              />
              <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 12 }}>
                {foods.filter(f => f.name.toLowerCase().includes(foodSearch.toLowerCase())).map(f => (
                  <div
                    key={f.food_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 8,
                      cursor: 'pointer',
                      background: selectedFood?.food_id === f.food_id ? 'var(--primary-color)' : 'transparent',
                      borderRadius: 6
                    }}
                    onClick={() => handleSelectFood(f)}
                  >
                    {f.image && (
                      <img
                        src={`/Assest/${f.image}`}
                        alt={f.name}
                        style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, background: '#222' }}
                      />
                    )}
                    <div>
                      <b>{f.name}</b>
                      <span style={{ color: '#aaa', fontSize: 13, marginLeft: 8 }}>({f.calories_per_serving} kcal/serving)</span>
                    </div>
                  </div>
                ))}
              </div>
              {selectedFood && (
                <div style={{ marginBottom: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 12 }}>
                  <div><b>{selectedFood.name}</b></div>
                  {selectedFood.image && (
                    <img
                      src={`/Assest/${selectedFood.image}`}
                      alt={selectedFood.name}
                      style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, margin: '8px 0' }}
                    />
                  )}
                  <div><b>Serving:</b> {selectedFood.serving_type}</div>
                  <div>Per Serving: {selectedFood.calories_per_serving} kcal | {selectedFood.protein_per_serving}g protein | {selectedFood.carbs_per_serving}g carbs | {selectedFood.fat_per_serving}g fat</div>
                  <input
                    type="number"
                    placeholder="Amount (servings)"
                    value={amountGrams}
                    onChange={e => setAmountGrams(e.target.value)}
                    min={1}
                    style={{ marginTop: 8 }}
                  />
                  <button className="btn-primary" type="button" style={{ marginTop: 8 }} disabled={!amountGrams} onClick={handleAddFoodToMeal}>Add to Meal</button>
                </div>
              )}
              <button className="btn-outline" type="button" onClick={() => setShowFoodModal(false)}>Cancel</button>
            </div>
          </div>
        )}
        {deleteMealId && (
          <div className="modal-bg">
            <div className="auth-card" style={{ maxWidth: 340, textAlign: 'center' }}>
              <h3>Delete Meal?</h3>
              <p style={{ margin: '16px 0', color: '#e44' }}>Are you sure you want to delete this meal and all its data? This cannot be undone.</p>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 16 }}>
                <button className="btn-outline" style={{ borderColor: '#e44', color: '#e44', minWidth: 80 }} onClick={confirmDeleteMeal}>Delete</button>
                <button className="btn-outline" style={{ minWidth: 80 }} onClick={() => setDeleteMealId(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Foods;