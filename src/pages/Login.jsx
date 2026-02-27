import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Toast } from "../components/ui/Toast";

export default function Login() {
    const { user, role, loginWithEmail, signUpWithEmail, loginWithGoogle } = useAuth();
    const navigate = useNavigate();

    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [toast, setToast] = useState(null);

    // Redirect to Role-Based Dashboard if already logged in
    useEffect(() => {
        if (user && role) {
            if (role === 'admin') navigate("/admin-dashboard");
            else if (role === 'worker') navigate("/worker-dashboard");
            else navigate("/citizen-dashboard");
        }
    }, [user, role, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            if (isLogin) {
                await loginWithEmail(email, password);
            } else {
                await signUpWithEmail(email, password, name);
                setToast({ message: "Account created! You are now logged in.", type: "success" });
            }
            // The useEffect above will handle the redirect once the user & role state updates.
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to authenticate. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError("");
        setLoading(true);
        try {
            await loginWithGoogle();
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to authenticate with Google.");
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-[#f6f8f8] font-[Public_Sans,sans-serif] items-center justify-center p-6">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8">

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center size-12 bg-[#13ecc8]/20 text-[#13ecc8] rounded-xl mb-4">
                        <span className="material-symbols-outlined text-3xl">location_city</span>
                    </div>
                    <h1 className="text-2xl font-bold text-[#0d1b19] tracking-tight">Thooimai AI</h1>
                    <p className="text-slate-500 text-sm mt-1">{isLogin ? "Sign in to your account" : "Create a new account"}</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 mb-6 text-center font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Full Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. John Doe"
                                className="w-full h-12 border-2 border-slate-200 rounded-xl px-4 focus:ring-2 focus:ring-[#13ecc8] focus:border-[#13ecc8] outline-none transition-all"
                                required={!isLogin}
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="e.g. citizen@madurai.com"
                            className="w-full h-12 border-2 border-slate-200 rounded-xl px-4 focus:ring-2 focus:ring-[#13ecc8] focus:border-[#13ecc8] outline-none transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full h-12 border-2 border-slate-200 rounded-xl px-4 focus:ring-2 focus:ring-[#13ecc8] focus:border-[#13ecc8] outline-none transition-all"
                            required
                            minLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !email || !password}
                        className="w-full h-12 bg-[#13ecc8] text-[#0d1b19] font-extrabold rounded-xl shadow-md hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center mt-6"
                    >
                        {loading ? (
                            <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                        ) : isLogin ? (
                            "Sign In"
                        ) : (
                            "Create Account"
                        )}
                    </button>
                </form>

                <div className="mt-6 flex items-center justify-center space-x-2">
                    <div className="h-px bg-slate-200 w-full" />
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-widest">or</span>
                    <div className="h-px bg-slate-200 w-full" />
                </div>

                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full h-12 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-60 flex items-center justify-center mt-6 gap-3"
                >
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google lg" className="w-[18px] h-[18px]" />
                    Continue with Google
                </button>

                <div className="mt-6 text-center">
                    <button
                        type="button"
                        onClick={() => { setIsLogin(!isLogin); setError(""); }}
                        className="text-slate-500 text-sm font-semibold hover:text-[#13ecc8] transition-colors"
                    >
                        {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                    </button>
                </div>

            </div>

            {toast && (
                <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
            )}
        </div>
    );
}
