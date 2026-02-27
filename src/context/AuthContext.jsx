import { createContext, useContext, useEffect, useState } from "react";
import { auth, googleProvider, setupRecaptcha } from "../firebase";
import { signInWithPopup, signOut, onAuthStateChanged, signInWithPhoneNumber } from "firebase/auth";
import { supabase } from "../supabase";

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Sync Firebase User with Supabase Database
    const syncUserToSupabase = async (firebaseUser) => {
        if (!firebaseUser) return;

        try {
            // Check if user already exists
            const { data: existingUser, error: fetchError } = await supabase
                .from('users')
                .select('*')
                .eq('firebase_uid', firebaseUser.uid)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
                console.error("Error fetching user from Supabase:", fetchError);
                return;
            }

            // If user doesn't exist, insert them
            if (!existingUser) {
                const { error: insertError } = await supabase
                    .from('users')
                    .insert([
                        {
                            firebase_uid: firebaseUser.uid,
                            name: firebaseUser.displayName || "Unknown User",
                            email: firebaseUser.email || null,
                            phone: firebaseUser.phoneNumber || null,
                            role: 'citizen'
                        }
                    ]);

                if (insertError) {
                    console.error("Error inserting user into Supabase:", insertError);
                } else {
                    console.log("User successfully synced to Supabase database.");
                }
            }
        } catch (err) {
            console.error("Failed to sync user to Supabase:", err);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            // If a user just logged in, sync their data to Supabase
            if (currentUser) {
                await syncUserToSupabase(currentUser);
            }

            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const loginWithGoogle = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Error logging in with Google:", error);
            throw error;
        }
    };

    const loginWithPhone = async (phoneNumber, appVerifier) => {
        try {
            const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
            return confirmationResult;
        } catch (error) {
            console.error("Error sending OTP:", error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error logging out", error);
        }
    };

    const value = {
        user,
        loginWithGoogle,
        loginWithPhone,
        setupRecaptcha,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
