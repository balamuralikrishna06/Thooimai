import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
    const { user, loginWithGoogle, loginWithPhone, setupRecaptcha } = useAuth();
    const navigate = useNavigate();

    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [showOtp, setShowOtp] = useState(false);
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Redirect to Dashboard if already logged in
    useEffect(() => {
        if (user) {
            navigate("/dashboard");
        }
    }, [user, navigate]);

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            setError("");
            await loginWithGoogle();
            navigate("/dashboard");
        } catch (err) {
            setError("Failed to log in with Google.");
        } finally {
            setLoading(false);
        }
    };

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const appVerifier = setupRecaptcha("recaptcha-container");

            // Ensure phone number has international format (e.g., +91 for India)
            let formattedPhone = phone;
            if (!formattedPhone.startsWith("+")) {
                formattedPhone = `+91${phone}`; // Defaulting to India for this example app
            }

            const result = await loginWithPhone(formattedPhone, appVerifier);
            setConfirmationResult(result);
            setShowOtp(true);
        } catch (err) {
            console.error(err);
            setError("Failed to send OTP. Ensure the number is correct and try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (!confirmationResult) return;

        setError("");
        setLoading(true);

        try {
            await confirmationResult.confirm(otp);
            navigate("/dashboard");
        } catch (err) {
            setError("Invalid OTP code.");
        } finally {
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
                    <p className="text-slate-500 text-sm mt-1">Authenticate to report waste</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 mb-6 text-center font-medium">
                        {error}
                    </div>
                )}

                {/* Google Login */}
                <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 h-12 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="size-5" />
                    Continue with Google
                </button>

                <div className="relative flex items-center py-6">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase tracking-wider">Or</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                </div>

                {/* Phone OTP Login Flow */}
                {!showOtp ? (
                    <form onSubmit={handleSendOtp} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Phone Number</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="e.g. 9876543210"
                                className="w-full h-12 border-2 border-slate-200 rounded-xl px-4 focus:ring-2 focus:ring-[#13ecc8] focus:border-[#13ecc8] outline-none transition-all"
                                required
                            />
                        </div>

                        {/* Invisible Recaptcha Container */}
                        <div id="recaptcha-container"></div>

                        <button
                            type="submit"
                            disabled={loading || phone.length < 10}
                            className="w-full h-12 bg-[#13ecc8] text-[#0d1b19] font-extrabold rounded-xl shadow-md hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center"
                        >
                            {loading ? "Sending..." : "Send OTP"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Enter OTP</label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="6-digit code"
                                className="w-full h-12 border-2 border-slate-200 rounded-xl px-4 text-center text-lg tracking-widest font-mono focus:ring-2 focus:ring-[#13ecc8] focus:border-[#13ecc8] outline-none transition-all"
                                maxLength={6}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || otp.length < 6}
                            className="w-full h-12 bg-[#13ecc8] text-[#0d1b19] font-extrabold rounded-xl shadow-md hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center"
                        >
                            {loading ? "Verifying..." : "Verify & Login"}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowOtp(false)}
                            className="w-full text-slate-500 text-sm font-semibold hover:text-[#0d1b19] mt-2"
                        >
                            Back to Phone Number
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
