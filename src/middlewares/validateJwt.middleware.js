import jwt from "jsonwebtoken";

export const validateJwtToken = (req, res, next) => {
  // 🔑 Get token from HttpOnly cookie instead of headers
  const token = req.cookies?.accessToken;
  // console.log(token);
  try {

    if (!token) throw new Error("access token missing");

    const jwtSecret = process.env.JWT_AUTH_TOKEN ;
    const payload = jwt.verify(token, jwtSecret);
    req.user = payload.user;
    
    // console.log(req.user);
    next();
  } catch (error) {
    console.log("token error: ", error);
    return res.status(401).json({ message: "You are not authorized to access this resource" });
  }
};
