import { loginUser, registerUser, 
    logoutUser, changePassword,
    tokenRefresh, loginWithGoogle,
    resendVerificationEmail,
    verifyEmailToken
} from "../services/authService.js";
import { generateCsrfToken } from "../utils/token.js";
import { catchAsync } from "../utils/errorHandler.js";



export const signup = catchAsync(async(req, res) =>{

    const { firstName, lastName, email, password, role } = req.body;
    const user_id = await registerUser({firstName,lastName, email, password, role});

    return res.status(201).json({
        message: 'Account created successfully',
        userId: user_id
    });
});


export const login = catchAsync(async(req, res) => {

    const { email, password } = req.body;
    
    const data = await loginUser({ email, password });
    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("refreshToken", data.refreshToken, {
        httpOnly: true,
        secure: isProduction, // HTTPS only in prod
        sameSite: isProduction ? "none" : "lax", // "none" required for cross-site cookies
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/"
    });
    res.cookie("accessToken", data.accessToken, {
      httpOnly: true,     // ✅ JS cannot access → protects from XSS
      secure: isProduction,       // ✅ only over HTTPS
      sameSite: isProduction ? "none" : "lax", // or "Lax" depending on frontend
      maxAge: 15 * 60 * 1000, // 15 min
      path: "/"
    });

    res.status(200).json({ message: 'Login successful', user: data.payload});
});


export const google_login = catchAsync(async (req, res) => {
  const { idToken, role } = req.body;

  const result = await loginWithGoogle({idToken, role});

  const isProduction = process.env.NODE_ENV === "production";

    res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: isProduction, // HTTPS only in prod
        sameSite: isProduction ? "none" : "lax", // "none" required for cross-site cookies
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/"
    });
    res.cookie("accessToken", result.accessToken, {
      httpOnly: true,     // ✅ JS cannot access → protects from XSS
      secure: isProduction,       // ✅ only over HTTPS
      sameSite: isProduction ? "none" : "lax", // or "Lax" depending on frontend
      maxAge: 15 * 60 * 1000, // 15 min
      path: "/"
    });

    res.status(200).json({ message: 'Login successful' , user: result.payload});
});


export const reset_password = catchAsync(async(req, res) =>{

    const {currentPassword, newPassword} = req.body;
    const user_id = req.user?.id || null;

    const result = await changePassword({user_id, currentPassword, newPassword});
    return res.status(200).json(result);
});


export const logout = catchAsync(async(req, res) =>{

    const refreshToken  = req.cookies.refreshToken;

    const result = await logoutUser({refreshToken});
    res.clearCookie('refreshToken');
    res.clearCookie('accessToken');
    res.status(200).json(result);
});


export const get_set_csrf_token = catchAsync(async(req, res) =>{

    const csrf_token = generateCsrfToken();
    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("XSRF-Token-Secure", csrf_token, {
    httpOnly: true,
    secure: isProduction, // MUST be true in production over HTTPS
    sameSite: "lax",})

    res.status(200).json({csrfToken: csrf_token});
});


export const refresh = catchAsync(async(req, res) => {

    const refreshToken = req.cookies.refreshToken;
    const {newAccessToken, newRefreshToken} = await tokenRefresh({refreshToken});

    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,     // ✅ JS cannot access → protects from XSS
      secure: isProduction,       // ✅ only over HTTPS
      sameSite: isProduction ? "none" : "lax", // or "Lax" depending on frontend
      maxAge: 15 * 60 * 1000, // 15 min
      path: "/"
    });
    res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: isProduction, // HTTPS only in prod
        sameSite: isProduction ? "none" : "lax", 
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/"
    });

    return res.status(200).json({message: "token rotated successfully"});
});


export const resend_verification = catchAsync(async (req, res) => {

    const { email } = req.body;

    await resendVerificationEmail({email});

    return res.status(200).json({
      success: true,
      message:
        "If the account exists, a verification email has been sent.",
    });
});


export const verify_email = catchAsync(async (req, res) => {

    const { token } = req.body;
    await verifyEmailToken(token);

    return res.status(200).json({
      success: true,
      message:
        "Email verified successfully",
    });
});