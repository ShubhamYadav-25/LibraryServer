import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// Routes
import authRouter from "./routes/auth.routes.js";
import bookRouter from "./routes/book.routes.js";
import userRouter from "./routes/user.routes.js";
import adminRouter from "./routes/admin.routes.js";

const app = express();


// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // optional
app.use(cookieParser());

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// __dirname setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Static files
app.use(
  "/bookimages",
  express.static(path.join(__dirname, "bookimages"), {
    maxAge: "1d",
    setHeaders: (res) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);

// API Versioning
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/books", bookRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/admin", adminRouter);

// Health check
app.get("/", (req, res) => {
  res.send("Library Management Backend Running ✅");
});

export default app;