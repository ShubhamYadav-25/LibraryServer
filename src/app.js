import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import { globalErrorHandler } from "./controllers/errorController.js";

// Routes
import authRouter from "./routes/auth.routes.js";
import bookRouter from "./routes/book.routes.js";
import userRouter from "./routes/user.routes.js";
import adminRouter from "./routes/admin.routes.js";

const app = express();


app.set("trust proxy", 1);


app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}


const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 100,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

// Strict limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many authentication attempts. Try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: "10kb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "10kb",
  })
);

app.use(cookieParser());


const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow mobile apps, Postman, server-to-server requests
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


app.use(
  "/bookimages",
  express.static(path.join(__dirname, "bookimages"), {
    maxAge: "1d",
    setHeaders: (res) => {
      res.setHeader(
        "Cross-Origin-Resource-Policy",
        "cross-origin"
      );
    },
  })
);

app.get("/", (req, res) => {
  res.status(200).send("Library Management Backend Running ✅");
});

app.use("/v1/auth", authLimiter, authRouter);
app.use("/v1/books", bookRouter);
app.use("/v1/users", userRouter);
app.use("/v1/admin", adminRouter);

app.use((req, res) => {
  res.status(404).json({
    status: "fail",
    message: `Can't find ${req.originalUrl} on this server`,
  });
});

app.use(globalErrorHandler);

export default app;