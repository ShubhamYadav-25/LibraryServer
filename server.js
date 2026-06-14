// server.js

import dotenv from "dotenv";
import app from "./src/app.js";
import pool from "./src/config/db.js";

dotenv.config();

const PORT = process.env.PORT;

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running `);
});


