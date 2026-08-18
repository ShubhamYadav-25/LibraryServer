import http from "node:http";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import pool from "../src/config/db.js";
import USER_ROLES from "../src/constants/userRoles.js";
import PERMISSIONS from "../src/constants/permissions.js";
import {
  getRoleId,
  getAllRolePermissions,
  getRolePermissions,
  getUserPermissions,
} from "../src/repositories/authRepository.js";
import {
  authorizeRoles,
  checkPermission,
  loadRolePermissionsCache,
  clearPermissionCache,
} from "../src/middlewares/rbac.middleware.js";

// ANSI color helpers
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

const logPass = (title) => {
  totalTests++;
  passedTests++;
  console.log(`  ${colors.green}✔ PASS:${colors.reset} ${title}`);
};

const logFail = (title, reason) => {
  totalTests++;
  failedTests++;
  console.log(`  ${colors.red}✖ FAIL:${colors.reset} ${title}`);
  if (reason) console.log(`    ${colors.yellow}Reason: ${reason}${colors.reset}`);
};

const makeToken = (userObj) => {
  const secret = process.env.JWT_AUTH_TOKEN || "supersecret";
  return jwt.sign({ user: userObj }, secret, { expiresIn: "1h" });
};

async function runTestSuite() {
  console.log(`\n${colors.bold}${colors.cyan}====================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}   LibraryMS RBAC Integration & Security Test Suite   ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}\n`);

  const startTime = Date.now();

  // Test Users
  const adminUser = { id: 1, role: USER_ROLES.ADMIN, name: "Admin Test" };
  const librarianUser = { id: 2, role: USER_ROLES.LIBRARIAN, name: "Librarian Test" };
  const studentUser = { id: 3, role: USER_ROLES.STUDENT, student_id: "STU2025001", name: "Student Test" };

  const adminToken = makeToken(adminUser);
  const librarianToken = makeToken(librarianUser);
  const studentToken = makeToken(studentUser);

  // ----------------------------------------------------
  // SUITE 1: Database & Repository Permission Queries
  // ----------------------------------------------------
  console.log(`${colors.bold}Suite 1: Database & Repository Permissions${colors.reset}`);

  try {
    const adminRoleId = await getRoleId(USER_ROLES.ADMIN);
    if (adminRoleId === 1) {
      logPass("authRepository.getRoleId('Admin') resolved correctly (id: 1)");
    } else {
      logFail("authRepository.getRoleId('Admin')", `Expected 1, got ${adminRoleId}`);
    }

    const allRolePerms = await getAllRolePermissions();
    if (Array.isArray(allRolePerms) && allRolePerms.length > 0) {
      logPass(`authRepository.getAllRolePermissions() loaded ${allRolePerms.length} mappings`);
    } else {
      logFail("authRepository.getAllRolePermissions() returned empty list");
    }

    const librarianPerms = await getRolePermissions(USER_ROLES.LIBRARIAN);
    if (librarianPerms.includes(PERMISSIONS.ISSUE_BOOK) && !librarianPerms.includes(PERMISSIONS.MANAGE_USERS)) {
      logPass("authRepository.getRolePermissions('Librarian') has issue_book but not manage_users");
    } else {
      logFail("authRepository.getRolePermissions('Librarian')", `Permissions: ${JSON.stringify(librarianPerms)}`);
    }

    const studentPerms = await getRolePermissions(USER_ROLES.STUDENT);
    if (studentPerms.includes(PERMISSIONS.RESERVE_BOOK) && !studentPerms.includes(PERMISSIONS.ADD_BOOK)) {
      logPass("authRepository.getRolePermissions('Student') has reserve_book but not add_book");
    } else {
      logFail("authRepository.getRolePermissions('Student')", `Permissions: ${JSON.stringify(studentPerms)}`);
    }

    const userPerms = await getUserPermissions(3);
    if (Array.isArray(userPerms)) {
      logPass("authRepository.getUserPermissions(userId) executed correctly with user_roles join");
    } else {
      logFail("authRepository.getUserPermissions(userId) query failed");
    }
  } catch (err) {
    logFail("Suite 1 encountered an unhandled exception", err.message);
  }

  // ----------------------------------------------------
  // SUITE 2: RBAC Middleware Unit Checks & In-Memory Cache
  // ----------------------------------------------------
  console.log(`\n${colors.bold}Suite 2: RBAC Middleware Unit Logic & In-Memory Cache${colors.reset}`);

  try {
    clearPermissionCache();
    const cache = await loadRolePermissionsCache();
    if (cache.has("admin") && cache.has("librarian") && cache.has("student")) {
      logPass("RBAC in-memory cache initialized all database roles correctly");
    } else {
      logFail("RBAC cache loading", `Keys: ${Array.from(cache.keys()).join(", ")}`);
    }

    // Role check middleware tests
    let unauthRoleStatus = null;
    const mockRes1 = {
      status: (code) => ({
        json: (data) => { unauthRoleStatus = code; },
      }),
    };
    authorizeRoles(USER_ROLES.ADMIN)({}, mockRes1, () => {});
    if (unauthRoleStatus === 401) {
      logPass("authorizeRoles blocks unauthenticated requests with 401 Unauthorized");
    } else {
      logFail("authorizeRoles unauthenticated check", `Expected 401, got ${unauthRoleStatus}`);
    }

    let studentAdminRoleStatus = null;
    const mockRes2 = {
      status: (code) => ({
        json: (data) => { studentAdminRoleStatus = code; },
      }),
    };
    authorizeRoles(USER_ROLES.ADMIN)({ user: studentUser }, mockRes2, () => {});
    if (studentAdminRoleStatus === 403) {
      logPass("authorizeRoles('Admin') blocks Student with 403 Forbidden");
    } else {
      logFail("authorizeRoles student check", `Expected 403, got ${studentAdminRoleStatus}`);
    }

    let adminPass = false;
    authorizeRoles(USER_ROLES.ADMIN)({ user: adminUser }, {}, () => { adminPass = true; });
    if (adminPass) {
      logPass("authorizeRoles('Admin') grants access to Admin user");
    } else {
      logFail("authorizeRoles admin grant check");
    }

    // Permission check middleware tests
    let adminBypass = false;
    await checkPermission(PERMISSIONS.DELETE_BOOK)({ user: adminUser }, {}, () => { adminBypass = true; });
    if (adminBypass) {
      logPass("checkPermission grants Admin automatic bypass on all permissions");
    } else {
      logFail("checkPermission Admin bypass");
    }

    let studentDeniedAddBook = null;
    const mockRes3 = {
      status: (code) => ({
        json: (data) => { studentDeniedAddBook = code; },
      }),
    };
    await checkPermission(PERMISSIONS.ADD_BOOK)({ user: studentUser }, mockRes3, () => {});
    if (studentDeniedAddBook === 403) {
      logPass("checkPermission('add_book') blocks Student with 403 Forbidden");
    } else {
      logFail("checkPermission('add_book') Student denial", `Expected 403, got ${studentDeniedAddBook}`);
    }

    let librarianAllowedAddBook = false;
    await checkPermission(PERMISSIONS.ADD_BOOK)({ user: librarianUser }, {}, () => { librarianAllowedAddBook = true; });
    if (librarianAllowedAddBook) {
      logPass("checkPermission('add_book') grants Librarian access");
    } else {
      logFail("checkPermission('add_book') Librarian grant");
    }
  } catch (err) {
    logFail("Suite 2 encountered an unhandled exception", err.message);
  }

  // ----------------------------------------------------
  // SUITE 3: End-to-End Live Route Authorization Testing
  // ----------------------------------------------------
  console.log(`\n${colors.bold}Suite 3: Live End-to-End Route Protection${colors.reset}`);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const requestRoute = async (endpoint, options = {}, token = null) => {
    const headers = { ...options.headers };
    if (token) {
      headers.Cookie = `accessToken=${token}`;
    }
    const res = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
    });
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { status: res.status, body };
  };

  try {
    // 3.1 Unauthenticated requests to protected routes
    const unauthAdmin = await requestRoute("/v1/admin/config");
    if (unauthAdmin.status === 401) {
      logPass("Unauthenticated request to /v1/admin/config returns 401");
    } else {
      logFail("Unauthenticated /v1/admin/config", `Expected 401, got ${unauthAdmin.status}`);
    }

    const unauthUsers = await requestRoute("/v1/users/me");
    if (unauthUsers.status === 401) {
      logPass("Unauthenticated request to /v1/users/me returns 401");
    } else {
      logFail("Unauthenticated /v1/users/me", `Expected 401, got ${unauthUsers.status}`);
    }

    const unauthHealth = await requestRoute("/v1/recommendations/health");
    if (unauthHealth.status === 401) {
      logPass("Unauthenticated request to /v1/recommendations/health returns 401");
    } else {
      logFail("Unauthenticated /v1/recommendations/health", `Expected 401, got ${unauthHealth.status}`);
    }

    // 3.2 Student Role Boundaries
    const studentAdminConfig = await requestRoute("/v1/admin/config", {}, studentToken);
    if (studentAdminConfig.status === 403) {
      logPass("Student accessing /v1/admin/config is blocked with 403 Forbidden");
    } else {
      logFail("Student /v1/admin/config", `Expected 403, got ${studentAdminConfig.status}`);
    }

    const studentAdminUsers = await requestRoute("/v1/admin/users", {}, studentToken);
    if (studentAdminUsers.status === 403) {
      logPass("Student accessing /v1/admin/users is blocked with 403 Forbidden");
    } else {
      logFail("Student /v1/admin/users", `Expected 403, got ${studentAdminUsers.status}`);
    }

    const studentAdminReports = await requestRoute("/v1/admin/reports/circulation/table", {}, studentToken);
    if (studentAdminReports.status === 403) {
      logPass("Student accessing /v1/admin/reports is blocked with 403 Forbidden");
    } else {
      logFail("Student /v1/admin/reports", `Expected 403, got ${studentAdminReports.status}`);
    }

    const studentOverdue = await requestRoute("/v1/books/overdue", {}, studentToken);
    if (studentOverdue.status === 403) {
      logPass("Student accessing /v1/books/overdue is blocked with 403 Forbidden");
    } else {
      logFail("Student /v1/books/overdue", `Expected 403, got ${studentOverdue.status}`);
    }

    const studentAddBook = await requestRoute("/v1/books", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }, studentToken);
    if (studentAddBook.status === 403) {
      logPass("Student attempting POST /v1/books (add_book) is blocked with 403 Forbidden");
    } else {
      logFail("Student POST /v1/books", `Expected 403, got ${studentAddBook.status}`);
    }

    const studentIssueBook = await requestRoute("/v1/books/1/issues", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }, studentToken);
    if (studentIssueBook.status === 403) {
      logPass("Student attempting POST /v1/books/1/issues (issue_book) is blocked with 403 Forbidden");
    } else {
      logFail("Student POST /v1/books/1/issues", `Expected 403, got ${studentIssueBook.status}`);
    }

    const studentManagedUser = await requestRoute("/v1/users/999", {}, studentToken);
    if (studentManagedUser.status === 403) {
      logPass("Student accessing administrative /v1/users/:userId is blocked with 403 Forbidden");
    } else {
      logFail("Student /v1/users/:userId", `Expected 403, got ${studentManagedUser.status}`);
    }

    const studentRecHealth = await requestRoute("/v1/recommendations/health", {}, studentToken);
    if (studentRecHealth.status === 403) {
      logPass("Student accessing /v1/recommendations/health is blocked with 403 Forbidden");
    } else {
      logFail("Student /v1/recommendations/health", `Expected 403, got ${studentRecHealth.status}`);
    }

    // 3.3 Librarian Role & Permissions
    const librarianAdminConfig = await requestRoute("/v1/admin/config", {}, librarianToken);
    if (librarianAdminConfig.status === 403) {
      logPass("Librarian accessing Admin-only /v1/admin/config is blocked with 403 Forbidden");
    } else {
      logFail("Librarian /v1/admin/config", `Expected 403, got ${librarianAdminConfig.status}`);
    }

    const librarianAdminUsers = await requestRoute("/v1/admin/users", {}, librarianToken);
    if (librarianAdminUsers.status === 403) {
      logPass("Librarian accessing /v1/admin/users is blocked with 403 (requires manage_users)");
    } else {
      logFail("Librarian /v1/admin/users", `Expected 403, got ${librarianAdminUsers.status}`);
    }

    const librarianStats = await requestRoute("/v1/admin/stats", {}, librarianToken);
    if (librarianStats.status === 200) {
      logPass("Librarian accessing /v1/admin/stats (view_reports) succeeds with 200 OK");
    } else {
      logFail("Librarian /v1/admin/stats", `Expected 200, got ${librarianStats.status}`);
    }

    const librarianHealth = await requestRoute("/v1/recommendations/health", {}, librarianToken);
    if (librarianHealth.status === 200) {
      logPass("Librarian accessing /v1/recommendations/health succeeds with 200 OK");
    } else {
      logFail("Librarian /v1/recommendations/health", `Expected 200, got ${librarianHealth.status}`);
    }

    const librarianOverdue = await requestRoute("/v1/books/overdue", {}, librarianToken);
    if (librarianOverdue.status === 200) {
      logPass("Librarian accessing /v1/books/overdue (view_reports) succeeds with 200 OK");
    } else {
      logFail("Librarian /v1/books/overdue", `Expected 200, got ${librarianOverdue.status}`);
    }

    // 3.4 Admin Role Full System Access
    const [cfgRows] = await pool.query("SELECT config_key FROM SYSTEM_CONFIG LIMIT 1");
    const sampleConfigKey = cfgRows.length > 0 ? cfgRows[0].config_key : "library_name";

    const adminConfig = await requestRoute(`/v1/admin/config?key=${sampleConfigKey}`, {}, adminToken);
    if (adminConfig.status === 200) {
      logPass("Admin accessing /v1/admin/config succeeds with 200 OK");
    } else {
      logFail("Admin /v1/admin/config", `Expected 200, got ${adminConfig.status}`);
    }

    const adminStats = await requestRoute("/v1/admin/stats", {}, adminToken);
    if (adminStats.status === 200) {
      logPass("Admin accessing /v1/admin/stats succeeds with 200 OK");
    } else {
      logFail("Admin /v1/admin/stats", `Expected 200, got ${adminStats.status}`);
    }

    const adminUsers = await requestRoute("/v1/admin/users", {}, adminToken);
    if (adminUsers.status === 200) {
      logPass("Admin accessing /v1/admin/users (manage_users) succeeds with 200 OK");
    } else {
      logFail("Admin /v1/admin/users", `Expected 200, got ${adminUsers.status}`);
    }

    const adminHealth = await requestRoute("/v1/recommendations/health", {}, adminToken);
    if (adminHealth.status === 200) {
      logPass("Admin accessing /v1/recommendations/health succeeds with 200 OK");
    } else {
      logFail("Admin /v1/recommendations/health", `Expected 200, got ${adminHealth.status}`);
    }

    // 3.5 Public Routes
    const publicBooks = await requestRoute("/v1/books");
    if (publicBooks.status === 200) {
      logPass("Public catalog GET /v1/books is accessible without authentication (200 OK)");
    } else {
      logFail("Public /v1/books", `Expected 200, got ${publicBooks.status}`);
    }

    const publicRecs = await requestRoute("/v1/recommendations");
    if (publicRecs.status === 200) {
      logPass("Public recommendations GET /v1/recommendations is accessible (200 OK)");
    } else {
      logFail("Public /v1/recommendations", `Expected 200, got ${publicRecs.status}`);
    }
  } catch (err) {
    logFail("Suite 3 encountered an unhandled exception", err.message);
  } finally {
    server.close();
  }

  // Summary Report
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n${colors.bold}${colors.cyan}====================================================${colors.reset}`);
  console.log(`${colors.bold}Test Summary:${colors.reset}`);
  console.log(`  Total Assertions: ${totalTests}`);
  console.log(`  Passed:           ${colors.green}${colors.bold}${passedTests}${colors.reset}`);
  console.log(`  Failed:           ${failedTests > 0 ? `${colors.red}${colors.bold}${failedTests}` : "0"}${colors.reset}`);
  console.log(`  Duration:         ${duration}s`);
  console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}\n`);

  if (failedTests === 0) {
    console.log(`${colors.green}${colors.bold}🎉 All RBAC integration & security tests PASSED flawlessly!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.red}${colors.bold}⚠️ Some RBAC tests failed. Please review the report above.${colors.reset}\n`);
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
