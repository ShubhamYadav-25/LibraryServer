import jwt from "jsonwebtoken";

export const optionalAuth = (req, res, next) => {
  const token = req.cookies?.accessToken;

  try {
    
    if (!token) {
      req.user = null; // ✅ guest user
      return next();
    }

    const payload = jwt.verify(token, process.env.JWT_AUTH_TOKEN);
    req.user = payload.user;


    next();
  } catch (err) {
    console.log("token error: ", error);
    return res.status(401).json({ message: "You are not authorized to access this resource" });
  }
};