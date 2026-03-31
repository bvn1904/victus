import * as SQLite from 'expo-sqlite';

// Opens (or creates) the local database file synchronously
const db = SQLite.openDatabaseSync('victus.db');

export const initDB = () => {
  try {
    db.execSync(`
      PRAGMA journal_mode = WAL;
      
      -- Meals Table
      CREATE TABLE IF NOT EXISTS meals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        calories INTEGER NOT NULL,
        protein INTEGER NOT NULL,
        carbs INTEGER NOT NULL,
        fats INTEGER NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL
      );

      -- Habits Table (Stores items like 'Creatine')
      CREATE TABLE IF NOT EXISTS habits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_DATE
      );

      -- Habit Logs Table (Stores which habit was checked off on which date)
      CREATE TABLE IF NOT EXISTS habit_logs (
        habit_id INTEGER,
        date TEXT,
        PRIMARY KEY (habit_id, date)
      );
    `);
    console.log("Database initialized successfully with Premium features.");
  } catch (error) {
    console.error("Database initialization failed:", error);
  }
};

// -----------------------------------------
// MEAL FUNCTIONS
// -----------------------------------------

export const addMealToDB = (name, calories, protein, carbs, fats, date, time) => {
  try {
    const statement = db.prepareSync('INSERT INTO meals (name, calories, protein, carbs, fats, date, time) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const result = statement.executeSync([name, calories, protein, carbs, fats, date, time]);
    return result.lastInsertRowId;
  } catch (error) {
    console.error("Error adding meal:", error);
    return null;
  }
};

export const updateMealInDB = (id, name, calories, protein, carbs, fats) => {
  try {
    const statement = db.prepareSync('UPDATE meals SET name = ?, calories = ?, protein = ?, carbs = ?, fats = ? WHERE id = ?');
    statement.executeSync([name, calories, protein, carbs, fats, id]);
  } catch (error) {
    console.error("Error updating meal:", error);
  }
};

export const getMealsByDate = (date) => {
  try {
    return db.getAllSync('SELECT * FROM meals WHERE date = ?', [date]);
  } catch (error) {
    console.error("Error fetching meals:", error);
    return [];
  }
};

export const deleteMealFromDB = (id) => {
  try {
    db.prepareSync('DELETE FROM meals WHERE id = ?').executeSync([id]);
  } catch (error) {
    console.error("Error deleting meal:", error);
  }
};

export const getTopMeals = (limit = 3) => {
  try {
    return db.getAllSync(`
      SELECT name, calories, protein, carbs, fats, COUNT(*) as frequency 
      FROM meals 
      GROUP BY name 
      ORDER BY frequency DESC 
      LIMIT ?
    `, [limit]);
  } catch (error) {
    console.error("Error fetching top meals:", error);
    return [];
  }
};

// -----------------------------------------
// HABIT (DAILY CHECKBOX) FUNCTIONS
// -----------------------------------------

export const addHabit = (name) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    db.prepareSync('INSERT INTO habits (name, created_at) VALUES (?, ?)').executeSync([name, today]);
  } catch (error) {
    console.error("Error adding habit:", error);
  }
};

export const updateHabit = (id, name) => {
  try {
    db.prepareSync('UPDATE habits SET name = ? WHERE id = ?').executeSync([name, id]);
  } catch (error) {
    console.error("Error updating habit:", error);
  }
};

export const getHabits = (date) => {
  try {
    // Return habits created on or before the given date
    if (date) {
        return db.getAllSync('SELECT * FROM habits WHERE created_at <= ?', [date]);
    }
    return db.getAllSync('SELECT * FROM habits');
  } catch (error) {
    console.error("Error fetching habits:", error);
    return [];
  }
};

export const deleteHabit = (id) => {
  try {
    db.prepareSync('DELETE FROM habits WHERE id = ?').executeSync([id]);
    db.prepareSync('DELETE FROM habit_logs WHERE habit_id = ?').executeSync([id]); // Clean up history
  } catch (error) {
    console.error("Error deleting habit:", error);
  }
};

export const toggleHabit = (habit_id, date, isCompleted) => {
  try {
    if (isCompleted) {
      db.prepareSync('INSERT OR IGNORE INTO habit_logs (habit_id, date) VALUES (?, ?)').executeSync([habit_id, date]);
    } else {
      db.prepareSync('DELETE FROM habit_logs WHERE habit_id = ? AND date = ?').executeSync([habit_id, date]);
    }
  } catch (error) {
    console.error("Error toggling habit:", error);
  }
};

export const getCompletedHabitsByDate = (date) => {
  try {
    const result = db.getAllSync('SELECT habit_id FROM habit_logs WHERE date = ?', [date]);
    return result.map(row => row.habit_id);
  } catch (error) {
    console.error("Error fetching completed habits:", error);
    return [];
  }
};

// -----------------------------------------
// EXPORT FUNCTIONS (PHASE 7)
// -----------------------------------------

export const exportAllData = () => {
  try {
    const meals = db.getAllSync('SELECT * FROM meals');
    const habits = db.getAllSync('SELECT * FROM habits');
    const habitLogs = db.getAllSync('SELECT * FROM habit_logs');
    
    return {
      exportDate: new Date().toISOString(),
      meals,
      habits,
      habitLogs
    };
  } catch (error) {
    console.error("Error exporting data:", error);
    return null;
  }
};
