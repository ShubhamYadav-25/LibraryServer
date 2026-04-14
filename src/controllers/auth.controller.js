import { loginUser, registerUser, 
    logoutUser, changePassword,
    tokenRefresh,
} from "../services/authService.js";
import { generateCsrfToken } from "../utils/token.js";



export const signup = async (req, res) =>{
    try {
        const { firstName, lastName, email, password, role } = req.body;

        const user_id = await registerUser({firstName,lastName, email, password, role});

        return res.status(201).json({
            message: 'Account created successfully',
            userId: user_id
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: 'Error',
            message: 'Internal Server Error'
        });
    }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) throw new Error("Provide both fields");

        const data = await loginUser({ email, password });

        const isProduction = process.env.NODE_ENV === "production";

        res.cookie("refreshToken", data.refreshToken, {
            httpOnly: true,
            secure: isProduction, // HTTPS only in prod
            sameSite: isProduction ? "none" : "lax", 
            // "none" required for cross-site cookies
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

        res.status(200).json({ message: 'Login successful' });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: 'Error',
            message: 'Internal Server Error'
        });
    }
};

export const reset_password = async (req, res) =>{
    try {
        const {oldPassword, newPassword} = req.body;
        const user_id = req.user?.id || null;
        console.log(req.user)

        const result = await changePassword({user_id, oldPassword, newPassword});

        return res.status(200).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: 'Error',
            message: 'Internal Server Error'
        });
    }
}

export const logout = async (req, res) =>{
    try {

        const refreshToken  = req.cookies.refreshToken;
        if (!refreshToken) {
            return res.status(400).json({ message: "Refresh token missing" });
        }

        const result = await logoutUser({refreshToken});
        res.clearCookie('refreshToken');
        res.clearCookie('accessToken');

        res.status(200).json(result);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: 'Error',
            message: 'Internal Server Error'
        });
    }
}

export const get_set_csrf_token = async(req, res) =>{
    try {

        const csrf_token = generateCsrfToken();

        const isProduction = process.env.NODE_ENV === "production";

        res.cookie("XSRF-Token-Secure", csrf_token, {
        httpOnly: true,
        secure: isProduction, // MUST be true in production over HTTPS
        sameSite: "lax",})

        res.status(200).json({csrfToken: csrf_token});
    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: 'Error',
            message: 'Internal Server Error'
        });
    }
}

export const refresh = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ message: "No refresh token" });
        }

        const {newAccessToken, newRefreshToken} = await tokenRefresh(refreshToken);

        if(!newAccessToken || !newRefreshToken){
            return res.status(401).json({ message: "Invalid refresh token" });
        }
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

    } catch (error) {
        console.log(error)
        return res.status(403).json({ message: "Server Side error"});
    }
};