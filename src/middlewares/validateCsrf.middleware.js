export const validateCsrfToken = (req, res, next) => {
    // Headers are always lowercase in Node.js
    const csrfToken = req.headers['x-csrf-token'] || null;

    // Match exact cookie name
    const csrfTokenFromCookie = req.cookies['XSRF-Token-Secure'] || null;

    // console.log("Header Token:", csrfToken);
    // console.log("Cookie Token:", csrfTokenFromCookie);

    if (!csrfToken || csrfToken !== csrfTokenFromCookie) {
        return res.status(403).json({ message: 'Forbidden: Invalid CSRF token' });
    }

    next();
};