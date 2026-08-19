# 📚 LibraryMS Server (Backend API)

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-v5.1-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![Database](https://img.shields.io/badge/Database-MySQL%20%2F%20TiDB-00758F?style=flat&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Authentication](https://img.shields.io/badge/Auth-JWT%20%2B%20Google%20OAuth-F4B400?style=flat&logo=google&logoColor=white)](https://jwt.io/)
[![Email](https://img.shields.io/badge/Email-Brevo%20API-0B99FF?style=flat&logo=sendinblue&logoColor=white)](https://www.brevo.com/)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

High-performance, secure, and modular RESTful API engine powering the **Library Management System (LibraryMS)**. Built with modern ES Modules on **Express 5** and **MySQL / TiDB**, featuring enterprise-grade authentication, fine-grained Role-Based Access Control (RBAC), an AI/vector-based semantic recommendation system, fine calculation & payment reconciliation, automated scheduled maintenance, and real-time administrative analytics.

---

## 📑 Table of Contents

- [Core Features](#-core-features)
- [Architecture & Design](#-architecture--design)
- [Project Directory Structure](#-project-directory-structure)
- [Technology Stack](#-technology-stack)
- [Database Configuration](#-database-configuration)
- [AI Recommendation Engine](#-ai-recommendation-engine)
- [Environment Variables](#-environment-variables)
- [Getting Started & Installation](#-getting-started--installation)
- [Available Scripts](#-available-scripts)
- [REST API Documentation](#-rest-api-documentation)
- [Authentication & Security Flow](#-authentication--security-flow)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Background Jobs & Automation](#-background-jobs--automation)

---

## ✨ Core Features

### 🔐 Enterprise Authentication & Security
- **Dual Authentication Modes**: Native Email/Password registration + login, and one-tap **Google OAuth 2.0** verification (`google-auth-library`).
- **Token Rotation & Session Management**: Short-lived JWT Access Tokens (20 minutes) paired with cryptographically secure, rotating Refresh Tokens (`UUIDv4` + 32-byte crypto hex secret) stored in `HttpOnly`, `SameSite` cookies.
- **CSRF Defense**: Cryptographic Anti-CSRF token verification on sensitive mutation endpoints (`/v1/auth/csrf-token`).
- **Layered Security**: Integrated **Helmet** with Cross-Origin Resource Policy (`cross-origin`), CORS allowlist configuration, request payload limiting (`10kb`), and rate limiting (global 100 req/15min, plus dedicated throttles for login, signup, and verification).
- **Email Verification**: Transactional email verification powered by the **Brevo (Sendinblue) API** with secure token validation and resend cooldowns.

### 👥 Role-Based Access Control (RBAC) & Granular Permissions
- 4 distinct hierarchical user roles: `Admin`, `Librarian`, `Staff`, `Student`.
- Granular permission policies (`PERMISSIONS`):
  - `view_books`, `add_book`, `edit_book`, `delete_book`
  - `issue_book`, `return_book`, `reserve_book`
  - `manage_users`, `view_reports`, `view_profile`

### 🧠 Semantic AI Recommendation Engine
- Embedded vector search engine powered by precomputed **384-dimensional float32 vector embeddings** (`books_embeddings.bin`).
- Fast in-memory cosine similarity and dot product scoring.
- Personalized student profile generator based on dynamic multi-signal interaction weights (likes, issues, reservations, reviews).
- Hybrid fallback to popularity ranking for cold-start users.
- Real-time similar books discovery (`/v1/recommendations/books/:bookId/similar`).
- Admin CLI and API endpoint to hot-sync catalog embeddings with database state.

### 📚 Comprehensive Book & Catalog Management
- Paginated catalog browsing, full-text search, and multi-genre filtering.
- Trending, popular, and new arrival feeds.
- Multi-copy inventory management (tracking individual copy statuses: available, issued, lost, maintenance).
- Static image serving for book cover art with caching headers (`/bookimages`).
- 5-star rating system with aggregated review averages and threaded user comments.

### 🔄 Circulation Desk & Reservation Workflow
- Single-action Book Issue with student quota validation and automatic due date assignment.
- Book Return with automated fine calculation based on overdue days and configurable daily penalty rates.
- One-click Book Renewal with configurable maximum renewal constraints.
- Reserve / Request queue for unavailable or out-of-stock titles.

### 💳 Fine Management & Payment Reconciliation
- Automatic calculation of late return fees based on system configuration.
- Flexible payment reconciliation supporting cash and digital transaction identifiers (`UPI`/`Card`).
- Fine transaction history and student ledger tracking.

### 📊 Administrative Intelligence & Reports
- Real-time dashboard KPI summaries (total books, active issues, overdue count, active students, revenue).
- Dynamic report generators with aggregated chart metrics and tabular views:
  - Circulation trends, Overdue analysis, Inventory valuation, Popular books, User activity, Fine collections.
- Dynamic system settings editor (fine rates, issue durations, max books per student, max renewals).

---

## 🏛 Architecture & Design

The server adopts a clean **Controller-Service-Repository** layered architecture ensuring separation of concerns, testability, and maintainability:

```mermaid
flowchart TD
    Client([React Frontend / Postman / Mobile]) -->|HTTP Requests| App[Express App src/app.js]
    
    subgraph MiddlewareLayer [Security & Middleware Pipeline]
        App --> Helmet[Helmet CORP]
        Helmet --> RateLimiter[Rate Limiters]
        RateLimiter --> CORS[CORS Filter]
        CORS --> Cookie[Cookie & Body Parsers]
        Cookie --> AuthMW[JWT & CSRF & RBAC Middlewares]
    end
    
    subgraph RoutingLayer [Route Dispatcher]
        AuthMW --> AuthR[/v1/auth]
        AuthMW --> BookR[/v1/books]
        AuthMW --> UserR[/v1/users]
        AuthMW --> AdminR[/v1/admin]
        AuthMW --> RecR[/v1/recommendations]
    end
    
    subgraph ServiceLayer [Business Logic Services]
        AuthR --> AuthService[authService.js]
        BookR --> BookService[bookService.js & bookIssueService.js]
        UserR --> UserService[userService.js]
        AdminR --> AdminService[adminService.js]
        RecR --> RecService[recommendationService.js]
        
        RecService --> RecModel[AI Recommendation Model]
        AuthService --> EmailUtil[Brevo Email Dispatcher]
    end
    
    subgraph DataLayer [Repository & Database Layer]
        AuthService --> AuthRepo[(authRepository.js)]
        BookService --> BookRepo[(bookRepository.js)]
        BookService --> IssueRepo[(bookIssueRepository.js)]
        UserService --> AdminRepo[(adminRepository.js)]
        RecService --> RecRepo[(recommendationRepository.js)]
        
        AuthRepo --> DB[(MySQL / TiDB Cloud Pool)]
        BookRepo --> DB
        IssueRepo --> DB
        AdminRepo --> DB
        RecRepo --> DB
    end
```

---

## 📂 Project Directory Structure

```plaintext
LibraryServer/
├── postman/                               # Comprehensive API testing assets
│   ├── LibraryMS_API_Collection.postman_collection.json
│   ├── LibraryMS_Environment.postman_environment.json
│   └── POSTMAN_TESTING_GUIDE.md           # 600+ line API test guide
├── scripts/                               # Maintenance & testing scripts
│   ├── syncRecommendationEmbeddings.js    # Catalog vector embedding synchronizer
│   └── testRbacIntegration.js             # RBAC integration test runner
├── src/
│   ├── app.js                             # Express application configuration & middlewares
│   ├── config/
│   │   ├── db.js                          # MySQL2 / TiDB connection pool configuration
│   │   └── multer.js                      # Multer file upload configuration
│   ├── constants/
│   │   ├── mailTemplate.js                # HTML email templates
│   │   ├── permissions.js                 # Granular RBAC permission keys
│   │   ├── reportTypes.js                 # Admin report type definitions
│   │   └── userRoles.js                   # User role constants (Admin, Librarian, Staff, Student)
│   ├── controllers/
│   │   ├── Admin.controller.js            # Admin analytics, config & reports
│   │   ├── auth.controller.js             # Authentication, Google login, email verification
│   │   ├── books.controller.js            # Books CRUD, circulation, ratings, comments
│   │   ├── errorController.js             # Global centralized error handler
│   │   ├── recommendation.controller.js   # Personalized & similar recommendations
│   │   └── users.controller.js            # Student profile, activities, fines, requests
│   ├── jobs/
│   │   ├── cleanupTokens.job.js           # Midnight cron job to prune expired refresh tokens
│   │   └── recommendationModelHealth.job.js # Startup AI recommendation model health checks
│   ├── middlewares/
│   │   ├── optionalAuth.middleware.js     # Non-blocking auth middleware for public endpoints
│   │   ├── permission.middleware.js       # Granular permission verification
│   │   ├── ratelimit.middleware.js        # Dedicated rate limiters (login, signup, verification)
│   │   ├── rbac.middleware.js             # Role-based route authorization
│   │   ├── validateCsrf.middleware.js     # CSRF validation middleware
│   │   ├── validateJwt.middleware.js      # JWT authentication middleware
│   │   └── validationMiddleware.js        # Express-validator input validator wrapper
│   ├── recommendation/                    # Vector recommendation engine logic
│   │   ├── EmbeddingGenerator.js          # Vector generation helpers
│   │   ├── EmbeddingLoader.js             # Binary vector embedding loader
│   │   ├── ProfileBuilder.js              # Multi-signal user preference vector compiler
│   │   ├── RecommendationFormatter.js     # Response payload hydrator & formatter
│   │   ├── RecommendationModel.js         # Core in-memory vector indexing & scoring
│   │   ├── RecommendationRanker.js        # Ranking & fallback algorithms
│   │   ├── Similarity.js                  # Cosine similarity and dot product math
│   │   └── SyncRecommendationModel.js     # Catalog sync & binary builder
│   ├── recommendation_model/              # Vector model binary assets & metadata
│   │   ├── book_id_to_index.json
│   │   ├── books_embeddings.bin           # Raw binary float32 embeddings
│   │   ├── books_metadata.json
│   │   ├── embeddings_info.json
│   │   ├── isbn_to_index.json
│   │   ├── model_info.json
│   │   └── training_config.json
│   ├── repositories/                      # SQL Query execution layer
│   │   ├── adminRepository.js
│   │   ├── authRepository.js
│   │   ├── bookIssueRepository.js
│   │   ├── bookRepository.js
│   │   ├── bookRequestRepository.js
│   │   ├── recommendationRepository.js
│   │   └── userRepository.js
│   ├── routes/                            # Express router definitions
│   │   ├── admin.routes.js
│   │   ├── auth.routes.js
│   │   ├── book.routes.js
│   │   ├── recommendation.routes.js
│   │   └── user.routes.js
│   ├── services/                          # Business logic & orchestration
│   │   ├── adminService.js
│   │   ├── authService.js
│   │   ├── bookIssueService.js
│   │   ├── bookRequestService.js
│   │   ├── bookReviewService.js
│   │   ├── bookService.js
│   │   ├── otherService.js
│   │   ├── recommendationService.js
│   │   ├── token.service.js
│   │   └── userService.js
│   ├── tests/                             # Unit & integration tests
│   │   ├── TiDBconn.js
│   │   ├── integration/
│   │   └── unit/
│   ├── utils/
│   │   ├── attachLikedFlag.js
│   │   ├── calculateFine.js
│   │   ├── email.js                       # Brevo HTTP client & email sender
│   │   ├── errorHandler.js                # Custom ApiError class
│   │   ├── generateBookCopies.js
│   │   ├── getRangeDate.js
│   │   ├── googleAuth.js                  # Google OAuth token validator
│   │   └── token.js                       # JWT, refresh token & CSRF generator
│   └── validators/
│       └── authValidator.js               # express-validator schemas for authentication
├── package.json
├── package-lock.json
└── server.js                              # Application entry point
```

---

## 🛠 Technology Stack

| Domain | Technology | Version | Purpose |
|---|---|---|---|
| **Runtime** | Node.js | v18.0+ | JavaScript server runtime with native ES Modules (`"type": "module"`) |
| **Framework** | Express.js | ^5.1.0 | Fast, flexible web framework with modern async routing |
| **Database** | MySQL / TiDB | ^3.14.3 | Distributed relational database via `mysql2/promise` with SSL/TLS 1.2 |
| **Security** | Helmet | ^8.1.0 | Sets critical HTTP security headers & Cross-Origin policies |
| **Auth & Crypto** | JSONWebToken, BcryptJS, UUID | ^9.0.2 / ^3.0.2 / ^11.1.0 | Token generation, password hashing, and token identifier generation |
| **OAuth** | Google Auth Library | ^10.6.2 | Google ID token verification and profile extraction |
| **Rate Limiting** | Express Rate Limit | ^8.3.1 | IP-based request throttling against DDoS and brute-force |
| **Email Service** | Brevo (Sendinblue) API | v3 REST | Transactional email delivery for account verifications & notifications |
| **Scheduled Tasks** | Node-Cron | ^4.2.1 | Automated background cron jobs for token pruning |
| **AI / Embeddings** | Float32 Vector Math | Custom | In-memory binary vector space indexing & cosine similarity calculations |
| **Logging** | Morgan | ^1.10.1 | HTTP request logging for development environments |

---

## 🗄 Database Configuration

The application utilizes `mysql2/promise` with connection pooling and explicit TLS encryption for cloud databases (such as TiDB Serverless or AWS RDS MySQL).

### Connection Parameters
```javascript
// src/config/db.js
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT, // e.g. 4000 for TiDB, 3306 for standard MySQL
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 20000,
  ssl: {
    minVersion: "TLSv1.2",
    rejectUnauthorized: true,
  },
});
```

---

## 🤖 AI Recommendation Engine

The server includes a built-in semantic vector recommendation engine:

1. **Vector Storage**: Compact binary Float32Array (`books_embeddings.bin`) storing 384-dimensional embeddings alongside metadata indexes (`book_id_to_index.json`, `isbn_to_index.json`).
2. **User Signal Synthesis**: Profiles are compiled from user interaction signals:
   - Book Likes (+1.0 weight)
   - Borrowed Books (+1.5 weight)
   - Book Requests (+1.2 weight)
   - Positive Book Ratings (+0.5 to +2.0 weight)
3. **Similarity Search**: Calculates dot product / cosine similarity across all candidate vectors in microsecond latencies.
4. **Catalog Synchronization**: When new books are added or updated in the catalog, running `npm run sync:recommendations` or invoking `POST /v1/admin/recommendations/sync` updates the binary model without requiring server restarts.

---

## ⚙️ Environment Variables

Create a `.env` file in the root of `LibraryServer/` with the following variables:

```env
# ----------------------------------------
# Server Configuration
# ----------------------------------------
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# ----------------------------------------
# MySQL / TiDB Database Connection
# ----------------------------------------
DB_HOST=gateway01.ap-southeast-1.prod.aws.tidbcloud.com
DB_PORT=4000
DB_USERNAME=your_db_username
DB_PASSWORD=your_db_password
DB_DATABASE=libraryms

# ----------------------------------------
# Authentication Secrets
# ----------------------------------------
JWT_AUTH_TOKEN=your_super_secret_jwt_access_token_key_here
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com

# ----------------------------------------
# Brevo (Sendinblue) Transactional Email
# ----------------------------------------
BREVO_API_KEY=xkeysib-your-brevo-api-key-here
EMAIL_FROM_ADDRESS=no-reply@yourlibraryms.com
EMAIL_FROM_NAME="Library Management System"
```

---

## 🚀 Getting Started & Installation

### Prerequisites
- **Node.js** v18.0.0 or higher
- **npm** v9.0.0 or higher
- Running instance of **MySQL 8.0+** or **TiDB Cloud**

### 1. Clone & Navigate
```bash
git clone https://github.com/your-org/LibraryMS.git
cd LibraryMS/LibraryServer
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your database credentials and API keys
```

### 4. Initialize Recommendation Model
```bash
npm run sync:recommendations
```

### 5. Start Development Server
```bash
npm run dev
```
The server will boot on `http://localhost:5000` with Morgan request logging and health checks active.

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Runs the server in development mode with **Nodemon** auto-reloading |
| `npm start` | Runs the production server using native Node.js (`node server.js`) |
| `npm run sync:recommendations` | Executes `scripts/syncRecommendationEmbeddings.js` to sync catalog embeddings |
| `npm test` | Runs the internal Node.js test suite across `src/tests/**/*.test.js` |
| `npm run test:rbac` | Executes the RBAC role authorization integration test suite |

---

## 📡 REST API Documentation

### 1. Authentication (`/v1/auth`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/v1/auth/csrf-token` | Public | Generate and set anti-CSRF token cookie |
| `POST` | `/v1/auth/register` | Public (Rate Limited) | Register a new student user |
| `POST` | `/v1/auth/login` | Public (Rate Limited) | Authenticate user, receive JWT & refresh cookie |
| `POST` | `/v1/auth/google` | Public | Sign in or sign up using Google ID token |
| `POST` | `/v1/auth/verify-email` | Public | Verify user email address with verification token |
| `POST` | `/v1/auth/resend-verification`| Public | Resend email verification link |
| `POST` | `/v1/auth/refresh` | Public (Cookie) | Rotate refresh token and issue new access token |
| `POST` | `/v1/auth/logout` | Authenticated | Revoke refresh token and clear cookies |
| `PUT` | `/v1/auth/password` | Authenticated | Change user account password |

---

### 2. Books & Catalog (`/v1/books`)

| Method | Endpoint | Access / Permission | Description |
|---|---|---|---|
| `GET` | `/v1/books` | Public / Optional Auth | Paginated book catalog with search, filters & `is_liked` flag |
| `GET` | `/v1/books/new-arrivals` | Public | Get newly added book catalog |
| `GET` | `/v1/books/trending` | Public | Get trending books based on activity |
| `GET` | `/v1/books/popular` | Public | Get most borrowed and highly rated books |
| `GET` | `/v1/books/genre` | Public | Get list of available genres with book counts |
| `GET` | `/v1/books/overdue` | `view_reports` | Get all currently overdue book issues across the system |
| `GET` | `/v1/books/:bookId` | Public | Get comprehensive details for a specific book |
| `GET` | `/v1/books/:bookId/comments` | Public | Get user comments and reviews for a book |
| `GET` | `/v1/books/:bookId/rating` | Public | Get book rating statistics and current user rating |
| `POST` | `/v1/books` | `add_book` | Add a new book to the library catalog |
| `POST` | `/v1/books/:bookId/copy` | `add_book` | Add inventory copies for a book |
| `POST` | `/v1/books/:bookId/issues` | `issue_book` | Issue a book copy to a student |
| `PATCH` | `/v1/books/:bookId/returns` | `return_book` | Process book return & calculate late fine |
| `PUT` | `/v1/books/:bookId/copy/:copyId` | `issue_book` | Renew an issued book copy |
| `POST` | `/v1/books/:bookId/requests` | `reserve_book` | Submit a request/reservation for a book |
| `POST` | `/v1/books/:bookId/like` | Authenticated | Toggle like/dislike status on a book |
| `POST` | `/v1/books/:bookId/rating` | Authenticated | Submit or update 1-5 star rating |
| `DELETE`| `/v1/books/:bookId/rating` | Authenticated | Remove user's rating |
| `POST` | `/v1/books/:bookId/comments`| Authenticated | Post a review comment on a book |
| `PUT` | `/v1/books/:bookId/comments/:commentId` | Authenticated | Edit existing review comment |
| `DELETE`| `/v1/books/:bookId/comments/:commentId` | Authenticated | Delete existing review comment |
| `POST` | `/v1/books/:bookId/comments/:commentId/like` | Authenticated | Like/unlike a comment |

---

### 3. User Self-Service & Profile (`/v1/users`)

| Method | Endpoint | Access / Permission | Description |
|---|---|---|---|
| `GET` | `/v1/users/me` | Authenticated | Retrieve current user profile |
| `PUT` | `/v1/users/me` | Authenticated | Update current user profile details |
| `GET` | `/v1/users/me/activities` | Authenticated | Get user's activity log and history |
| `GET` | `/v1/users/me/stats` | Authenticated | Get user statistics (issued books, fines, requests) |
| `GET` | `/v1/users/me/books` | Authenticated | Get all books currently issued to the user |
| `GET` | `/v1/users/me/requests` | Authenticated | Get all pending and past book requests |
| `GET` | `/v1/users/me/fines` | Authenticated | Get outstanding and historical fines |
| `PUT` | `/v1/users/me/fines` | Authenticated | Pay all outstanding fines |
| `PUT` | `/v1/users/me/fines/:fineId` | Authenticated | Pay a specific outstanding fine |
| `GET` | `/v1/users/:userId` | `manage_users` | Admin view of another user's profile |
| `PUT` | `/v1/users/:userId` | `manage_users` | Admin update of another user's account |

---

### 4. Admin Management & Reports (`/v1/admin`)

| Method | Endpoint | Access / Role | Description |
|---|---|---|---|
| `GET` | `/v1/admin/stats` | `Admin`, `Librarian`, `Staff` (`view_reports`) | Key dashboard metrics & KPI cards |
| `GET` | `/v1/admin/config` | `Admin` | Get current library system settings |
| `PUT` | `/v1/admin/config` | `Admin` | Update system settings (fines, loan periods, limits) |
| `GET` | `/v1/admin/users` | `manage_users` | List and filter all registered students |
| `GET` | `/v1/admin/requests` | `manage_users` | View all pending and fulfilled book requests |
| `PUT` | `/v1/admin/requests/:requestId` | `manage_users` | Cancel or approve a book request |
| `GET` | `/v1/admin/transactions`| `Admin`, `Librarian`, `Staff` | Audit log of all fine and circulation transactions |
| `GET` | `/v1/admin/activities` | `Admin`, `Librarian`, `Staff` | System-wide activity audit trail |
| `POST` | `/v1/admin/recommendations/sync` | `Admin` | Rebuild & sync AI recommendation vector model |
| `GET` | `/v1/admin/reports/:reportType/chart` | `view_reports` | Aggregated visual report series (circulation, overdue, etc.) |
| `GET` | `/v1/admin/reports/:reportType/table` | `view_reports` | Tabular report export data |

---

### 5. Recommendations (`/v1/recommendations`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/v1/recommendations` | Optional Auth | Get personalized recommendations tailored to student signals |
| `GET` | `/v1/recommendations/books/:bookId/similar` | Public | Get content-based similar books for a given book |
| `GET` | `/v1/recommendations/health` | `Admin`, `Librarian` | Vector model diagnostic stats (dimension, book count, status) |

---

## 🔒 Authentication & Security Flow

```plaintext
1. User Login (POST /v1/auth/login)
   ├── Validates credentials via Bcrypt
   ├── Creates 20-minute JWT Access Token -> Returned in JSON response body
   ├── Generates Rotating Refresh Token (UUIDv4 + Crypto Secret) -> Stored in HttpOnly Cookie
   └── Generates CSRF Token -> Set in cookie and response

2. Authenticated API Requests
   ├── Headers: Authorization: Bearer <access_token>
   ├── Cookie: refreshToken=<token> (automatic)
   └── Validated via validateJwt.middleware.js

3. Token Expiration & Refresh Flow (POST /v1/auth/refresh)
   ├── Client detects 401 Unauthorized
   ├── Sends refresh request with HttpOnly cookie
   ├── Server validates refresh token against DB
   ├── Rotates refresh token in DB & resets cookie
   └── Returns fresh 20-minute Access Token
```

---

## 🧪 Testing & Quality Assurance

### Postman Testing Suite
A comprehensive Postman test collection with **80+ test cases** is located in `postman/`:
- `LibraryMS_API_Collection.postman_collection.json`
- `LibraryMS_Environment.postman_environment.json`
- Detailed instructions in [POSTMAN_TESTING_GUIDE.md](postman/POSTMAN_TESTING_GUIDE.md).

### Running Unit & RBAC Tests
```bash
# Run unit tests across all services and vector math modules
npm test

# Run Role-Based Access Control integration verification
npm run test:rbac
```

---

## ⏰ Background Jobs & Automation

- **Token Cleanup Job** (`src/jobs/cleanupTokens.job.js`):
  Scheduled via `node-cron` to execute daily at midnight (`0 0 * * *`), automatically purging expired refresh tokens from the database.
- **Model Health Job** (`src/jobs/recommendationModelHealth.job.js`):
  Runs during application initialization to verify embedding binary integrity and index dimensions.

---

## 📄 License

This project is licensed under the **ISC License**.
