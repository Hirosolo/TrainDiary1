// GR (Grind Rating) Calculator
// GR = RepsScore × SetsScore × log₂(Weight + 1) × ExerciseMultiplier

type ExerciseCategory = 'Shoulders' | 'Legs' | 'Back' | 'Chest' | 'Arms' | 'Core';

const exerciseMultipliers: Record<ExerciseCategory, number> = {
    Shoulders: 1.3,
    Legs: 1.25,
    Back: 1.2,
    Chest: 1.15,
    Arms: 1.1,
    Core: 1.0
};

export function calculateGR(reps: number, sets: number, weightKg: number, category: string): number {
    // Calculate RepsScore
    let repsScore = 0.5;
    if (reps >= 8 && reps <= 12) {
        repsScore = 1.0;
    } else if ((reps >= 6 && reps <= 7) || (reps >= 13 && reps <= 14)) {
        repsScore = 0.75;
    }

    // Calculate SetsScore
    let setsScore = 0.5;
    if (sets >= 3 && sets <= 4) {
        setsScore = 1.0;
    } else if (sets === 2 || sets === 5) {
        setsScore = 0.75;
    }

    // Calculate weight component using log base 2
    const weightScore = Math.log2(weightKg + 1);

    // Get category multiplier
    const multiplier = exerciseMultipliers[category as ExerciseCategory] || 1.0;

    // Calculate final GR score
    const gr = repsScore * setsScore * weightScore * multiplier;

    return Math.round(gr * 100) / 100; // Round to 2 decimal places
}

// Calculate GR for a workout session
export function calculateSessionGR(logs: Array<{
    actual_sets: number;
    actual_reps: number;
    weight_kg: number;
    exercise_category: string;
}>): number {
    if (logs.length === 0) return 0;

    const totalGR = logs.reduce((sum, log) => {
        return sum + calculateGR(
            log.actual_reps,
            log.actual_sets,
            log.weight_kg || 0,
            log.exercise_category
        );
    }, 0);

    return totalGR;
}
