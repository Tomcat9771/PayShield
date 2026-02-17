const jwt = require("jsonwebtoken");

function getAuthToken(req) {
  const h = req.headers.authorization;
  if (!h) return null;

  const parts = h.split(" ");
  if (parts.length !== 2) return null;

  return parts[1];
}

function requireAuth(req, res, next) {
  const token = getAuthToken(req);
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
}

module.exports = {
  getAuthToken,
  requireAuth,
  requireAdmin,
};
