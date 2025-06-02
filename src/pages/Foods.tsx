import React, { useEffect, useState } from 'react';
import Navbar from '../components/NavBar/NavBar';
import { useAuth } from '../context/AuthContext';
import { useDashboardRefresh } from '../context/DashboardRefreshContext';
import { FaUtensils, FaFire, FaDumbbell, FaLeaf } from 'react-icons/fa';
import { HiPlusSm } from 'react-icons/hi';
import {
  PageContainer,
  PageHeader,
  CardGrid,
  Card,
  ModalContent,
  GridForm,
  StatCard
} from '../components/shared/SharedComponents';
import styles from './Foods.module.css';

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
interface MealWithFoods extends Meal {
  foods: MealFood[];
}

const Foods: React.FC = () => {
  const { user } = useAuth();
  const { triggerRefresh } = useDashboardRefresh();
  const [meals, setMeals] = useState<MealWithFoods[]>([]);
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
  const [dailyTotals, setDailyTotals] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });

  useEffect(() => {
    if (user) fetchMeals();
    // eslint-disable-next-line
  }, [user]);

  useEffect(() => {
    if (meals.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      const todayMeals = meals.filter(m => m.log_date.slice(0, 10) === today);
      
      const totals = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      };

      todayMeals.forEach(meal => {
        totals.calories += calculateMealNutrition(meal.foods, 'calories');
        totals.protein += calculateMealNutrition(meal.foods, 'protein');
        totals.carbs += calculateMealNutrition(meal.foods, 'carbs');
        totals.fat += calculateMealNutrition(meal.foods, 'fat');
      });

      setDailyTotals(totals);
    }
  }, [meals]);

  const fetchMeals = async () => {
    setLoading(true);
    try {
      // Fetch basic meal data
      const mealsRes = await fetch(`http://localhost:4000/api/foods/meals?user_id=${user?.user_id}`);
      const mealsData = await mealsRes.json();
      
      // Fetch food details for each meal
      const mealsWithFoods = await Promise.all(
        mealsData.map(async (meal: Meal) => {
          const foodsRes = await fetch(`http://localhost:4000/api/foods/meals/${meal.meal_id}`);
          const foodsData = await foodsRes.json();
          return { ...meal, foods: foodsData };
        })
      );
      
      setMeals(mealsWithFoods);
    } catch (error) {
      console.error('Error fetching meals:', error);
    }
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

  const calculateMealNutrition = (meal: MealFood[], type: 'calories' | 'protein' | 'carbs' | 'fat'): number => {
    return meal.reduce((total, food) => {
      const servingMultiplier = food.amount_grams / 100;
      switch (type) {
        case 'calories':
          return total + (food.calories_per_serving * servingMultiplier);
        case 'protein':
          return total + (food.protein_per_serving * servingMultiplier);
        case 'carbs':
          return total + (food.carbs_per_serving * servingMultiplier);
        case 'fat':
          return total + (food.fat_per_serving * servingMultiplier);
      }
    }, 0);
  };

  return (
    <PageContainer>
      <Navbar />
      <div style={{ marginTop: '2.5rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 className={styles.dashboardTitle} style={{ textAlign: 'center' }}>Food Log</h2>
        <button className={styles.logMealBtn} style={{ alignSelf: 'center' }} onClick={() => setShowForm(true)}>
          <HiPlusSm /> Log New Meal
        </button>
      </div>

      <CardGrid className={styles.statsGrid}>
        <StatCard 
          value={dailyTotals.calories.toFixed(0)}
          label="Total Calories"
          icon={<FaFire />}
        />
        <StatCard 
          value={`${dailyTotals.protein.toFixed(1)}g`}
          label="Protein"
          icon={<FaDumbbell />}
        />
        <StatCard 
          value={`${dailyTotals.carbs.toFixed(1)}g`}
          label="Carbs"
          icon={<FaUtensils />}
        />
        <StatCard 
          value={`${dailyTotals.fat.toFixed(1)}g`}
          label="Fat"
          icon={<FaLeaf />}
        />
      </CardGrid>

      <CardGrid>
        {loading ? (
          <Card className={styles.loadingCard}>
            <div className={styles.loader}>Loading...</div>
          </Card>
        ) : meals.length === 0 ? (
          <Card className={styles.emptyCard}>
            <p>No meals logged yet. Start by adding your first meal!</p>
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              <HiPlusSm /> Log First Meal
            </button>
          </Card>
        ) : (
          meals.map(meal => (
            <Card key={meal.meal_id} className={styles.mealCard}>
              <div className={styles.mealHeader}>
                <div>
                  <h3 className={styles.mealType}>
                    {meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1)}
                  </h3>
                  <p className={styles.mealDate}>{formatDate(meal.log_date)}</p>
                </div>
                <div className={styles.mealActions}>
                  <button 
                    className={styles.detailsBtn}
                    onClick={() => handleExpandMeal(meal.meal_id)}
                  >
                    {expandedMeal === meal.meal_id ? 'Hide Details' : 'Show Details'}
                  </button>
                  <button 
                    className={styles.deleteBtn}
                    onClick={() => handleDeleteMeal(meal.meal_id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              {expandedMeal === meal.meal_id && (
                <div className={styles.mealDetails}>
                  {mealDetails.map((food, idx) => (
                    <div key={idx} className={styles.foodItem}>
                      <div className={styles.foodInfo}>
                        <span className={styles.foodName}>{food.name}</span>
                        <span className={styles.foodAmount}>{food.amount_grams}g</span>
                      </div>
                      <div className={styles.foodNutrition}>
                        <span>{(food.calories_per_serving * food.amount_grams / 100).toFixed(0)} cal</span>
                        <span>{(food.protein_per_serving * food.amount_grams / 100).toFixed(1)}g protein</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))
        )}
      </CardGrid>

      {showForm && (
        <ModalContent title="Log New Meal">
          <GridForm onSubmit={handleLogMeal}>
            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
              <label>Date</label>
              <input
                type="date"
                value={form.log_date}
                onChange={e => setForm({ ...form, log_date: e.target.value })}
                required
              />
            </div>
            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
              <label>Meal Type</label>
              <select
                value={form.meal_type}
                onChange={e => setForm({ ...form, meal_type: e.target.value })}
                required
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
            </div>

            <div className={styles.foodsList}>
              {mealFoods.map((mealFood, idx) => (
                <div key={idx} className={styles.foodItem}>
                  <span>{mealFood.food.name}</span>
                  <span>{mealFood.amount_grams}g</span>
                  <button
                    type="button"
                    className="btn-icon-danger"
                    onClick={() => setMealFoods(foods => foods.filter((_, i) => i !== idx))}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" className={styles.addFoodBtn} onClick={handleAddFood}>
                <HiPlusSm /> Add Food
              </button>
            </div>

            {error && <div className={styles.error}>{error}</div>}
            
            <div className={styles.modalActions}>
              <button type="submit" className="btn-primary">Save Meal</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </GridForm>
        </ModalContent>
      )}

      {showFoodModal && (
        <ModalContent title="Add Food to Meal">
          <div className={styles.foodSearchGrid}>
            <input
              type="text"
              placeholder="Search foods..."
              value={foodSearch}
              onChange={e => setFoodSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.foodsGrid}>
            {foods
              .filter(food => 
                food.name.toLowerCase().includes(foodSearch.toLowerCase())
              )
              .map(food => (
                <div 
                  key={food.food_id} 
                  className={`${styles.foodOption} ${selectedFood?.food_id === food.food_id ? styles.selected : ''}`}
                  onClick={() => handleSelectFood(food)}
                >
                  <div className={styles.foodOptionInfo}>
                    <span className={styles.foodName}>{food.name}</span>
                    <span className={styles.foodNutrition}>
                      {food.calories_per_serving} cal | {food.protein_per_serving}g protein
                    </span>
                  </div>
                </div>
              ))
            }
          </div>

          {selectedFood && (
            <div className={styles.formGroup} style={{ maxWidth: 'none', margin: '1rem 0' }}>
              <label>Amount ({selectedFood.serving_type})</label>
              <input
                type="number"
                value={amountGrams}
                onChange={e => setAmountGrams(e.target.value)}
                min="0"
                required
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem' }}>
            <button
              className={styles.addFoodToMealBtn}
              onClick={handleAddFoodToMeal}
              disabled={!selectedFood || !amountGrams}
              style={{ flexGrow: 1 }}
            >
              Add To Meal
            </button>
            <button
              className={styles.cancelBtn}
              onClick={() => setShowFoodModal(false)}
              style={{ flexGrow: 1 }}
            >
              Close
            </button>
          </div>
        </ModalContent>
      )}

      {deleteMealId && (
        <ModalContent title="Delete Meal" onClose={() => setDeleteMealId(null)}>
          <div className={styles.deleteConfirm}>
            <p>Are you sure you want to delete this meal?</p>
            <div className={styles.modalActions}>
              <button 
                className="btn-danger"
                onClick={confirmDeleteMeal}
              >
                Delete
              </button>
              <button 
                className="btn-secondary"
                onClick={() => setDeleteMealId(null)}
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

export default Foods;