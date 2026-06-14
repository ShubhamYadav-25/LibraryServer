import pool from "../config/db.js"

export const testDBConnection = async () => {
  try {
    const [rows] = await pool.query("SELECT 1 AS ok");
    console.log("Database connected:", rows[0]);
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
};