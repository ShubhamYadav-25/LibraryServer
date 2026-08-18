import { getAllRolePermissions } from "../repositories/authRepository.js";
import USER_ROLES from "../constants/userRoles.js";

// In-memory cache for role permissions: Map<roleNameLower, Set<permissionCode>>
let rolePermissionsCache = new Map();
let cacheLastLoaded = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Loads and caches role permissions from database.
 */
export const loadRolePermissionsCache = async (forceRefresh = false) => {
  const now = Date.now();
  if (!forceRefresh && rolePermissionsCache.size > 0 && now - cacheLastLoaded < CACHE_TTL_MS) {
    return rolePermissionsCache;
  }

  try {
    const rows = await getAllRolePermissions();
    const newCache = new Map();

    for (const row of rows) {
      const roleKey = String(row.role_name || "").trim().toLowerCase();
      const permCode = String(row.permission_code || "").trim();

      if (!newCache.has(roleKey)) {
        newCache.set(roleKey, new Set());
      }
      newCache.get(roleKey).add(permCode);
    }

    rolePermissionsCache = newCache;
    cacheLastLoaded = now;
    return rolePermissionsCache;
  } catch (error) {
    console.error("Failed to load role permissions cache:", error);
    return rolePermissionsCache;
  }
};

/**
 * Clears the role-permission in-memory cache.
 */
export const clearPermissionCache = () => {
  rolePermissionsCache.clear();
  cacheLastLoaded = 0;
};

/**
 * Middleware to authorize users by specific roles.
 * @param  {...string} allowedRoles Allowed role names (e.g. 'Admin', 'Librarian', 'Staff', 'Student')
 */
export const authorizeRoles = (...allowedRoles) => {
  const normalizedAllowed = allowedRoles.map((r) => String(r || "").trim().toLowerCase());

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: "fail",
        message: "Unauthorized: Authentication required",
      });
    }

    const userRole = String(req.user.role || "").trim().toLowerCase();

    if (!userRole || !normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        status: "fail",
        message: "Access forbidden: Insufficient role privileges",
      });
    }

    next();
  };
};

/**
 * Middleware to authorize users by specific permission codes.
 * Uses high-speed in-memory cache with automatic lazy loading.
 * @param  {...string} requiredPermissions One or more permission codes required to access the endpoint
 */
export const checkPermission = (...requiredPermissions) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: "fail",
        message: "Unauthorized: Authentication required",
      });
    }

    const userRole = String(req.user.role || "").trim().toLowerCase();

    // Admin has full bypass access
    if (userRole === USER_ROLES.ADMIN.toLowerCase()) {
      return next();
    }

    // Ensure cache is loaded
    const cache = await loadRolePermissionsCache();
    const rolePerms = cache.get(userRole);

    if (!rolePerms) {
      return res.status(403).json({
        status: "fail",
        message: "Access forbidden: No permissions assigned to role",
      });
    }

    // Check if user's role has all required permissions
    const hasAll = requiredPermissions.every((perm) => rolePerms.has(perm));

    if (!hasAll) {
      return res.status(403).json({
        status: "fail",
        message: `Access forbidden: Missing required permission(s): ${requiredPermissions.join(", ")}`,
      });
    }

    next();
  };
};

export default {
  authorizeRoles,
  checkPermission,
  loadRolePermissionsCache,
  clearPermissionCache,
};
