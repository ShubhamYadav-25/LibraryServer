// server.js

import dotenv from "dotenv";
import app from "./src/app.js";
import pool from "./src/config/db.js";

dotenv.config();

const PORT = process.env.PORT;

// DB Test Route (keep here OR move to app.js if preferred)
app.get("/db-test", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT NOW() as currentTime");
    res.json({ success: true, serverTime: rows[0].currentTime });
  } catch (error) {
    console.error("DB Connection Error:", error);
    res.status(500).json({
      success: false,
      error: "Database connection failed",
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running `);
});


