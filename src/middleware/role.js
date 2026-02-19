// src/middleware/role.js
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
//   After auth.js confirms WHO the user is, role.js checks WHAT they can do.
//   This is called "Authorization" (vs "Authentication" which is auth.js).
//
//   We use a "higher-order function" pattern here:
//   authorize('admin', 'manager') returns a middleware function.
//   This lets us pass different allowed roles per route.
// ─────────────────────────────────────────────────────────────────────────────

// authorize() takes any number of allowed roles as arguments
// Example: authorize('admin') or authorize('admin', 'manager')
const authorize = (...roles) => {
  // Returns the actual middleware function
  return (req, res, next) => {
    // req.user was set by the protect middleware (auth.js)
    // roles.includes(req.user.role) checks if user's role is in the allowed list
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        // 403 Forbidden = user is authenticated but not allowed to do this
        message: `Role '${req.user.role}' is not authorized to access this route`,
      });
    }
    next();
  };
};

module.exports = { authorize };
