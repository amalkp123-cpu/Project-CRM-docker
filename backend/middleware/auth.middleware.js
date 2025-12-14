// middleware/auth.js
const jwt = require("jsonwebtoken");

function missingSecretError() {
  console.error("JWT secret missing. Set process.env.JWT_SECRET");
}

function parseAuthHeader(authHeader) {
  if (!authHeader) return null;
  const parts = String(authHeader).trim().split(/\s+/);
  if (parts.length !== 2) return null;
  const scheme = parts[0].toLowerCase();
  const token = parts[1];
  if (scheme !== "bearer") return null;
  return token;
}

function sendJsonError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

function verifyTokenSync(token) {
  if (!process.env.JWT_SECRET) {
    missingSecretError();
    throw new Error("jwt_secret_missing");
  }
  return jwt.verify(token, process.env.JWT_SECRET);
}

// middleware: attach req.user or fail
function authenticateToken(req, res, next) {
  const token = parseAuthHeader(req.headers["authorization"]);
  if (!token)
    return sendJsonError(res, 401, "token_required", "Access token required");

  try {
    const token = parseAuthHeader(req.headers["authorization"]);

    const decoded = verifyTokenSync(token);
    // minimal user shape
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
    };
    return next();
  } catch (err) {
    console.warn("Token verify failed:", err.message || err);
    return sendJsonError(res, 401, "invalid_token", "Invalid or expired token");
  }
}

// role guard factory: requireRole("admin"), requireRole("editor")
function requireRole(role) {
  return (req, res, next) => {
    // ensure token middleware run first; if not, run it now
    if (!req.user) {
      const token = parseAuthHeader(req.headers["authorization"]);
      if (!token)
        return sendJsonError(
          res,
          401,
          "token_required",
          "Access token required"
        );
      try {
        const decoded = verifyTokenSync(token);
        req.user = {
          id: decoded.id,
          username: decoded.username,
          role: decoded.role,
        };
      } catch (err) {
        return sendJsonError(
          res,
          401,
          "invalid_token",
          "Invalid or expired token"
        );
      }
    }

    if (!req.user || !req.user.role) {
      return sendJsonError(res, 403, "forbidden", "Insufficient privileges");
    }

    // allow either string or array for role param
    if (Array.isArray(role)) {
      if (!role.includes(req.user.role))
        return sendJsonError(res, 403, "forbidden", "Insufficient privileges");
    } else if (req.user.role !== role) {
      return sendJsonError(res, 403, "forbidden", "Insufficient privileges");
    }

    next();
  };
}

module.exports = { authenticateToken, requireRole };
