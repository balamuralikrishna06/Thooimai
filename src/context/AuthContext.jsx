import { createContext, useContext, useEffect, useState } from "react";
import { auth, googleProvider } from "../firebase";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "firebase/auth";
import { supabase } from "../lib/supabase";

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch the user's role from the public.users table in Supabase
    const fetchUserRole = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('role')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error("Error fetching user role:", error);
                return null;
            }
            return data ? data.role : 'citizen'; // Default to citizen if not found
        } catch (err) {
            console.error("Failed to fetch role:", err);
            return null;
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userRole = await fetchUserRole(currentUser.uid);
                setRole(userRole);
            } else {
                setUser(null);
                setRole(null);
            }
            setLoading(false);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const loginWithEmail = async (email, password) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return userCredential.user;
        } catch (error) {
            throw error;
        }
    };

    const signUpWithEmail = async (email, password, name) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Ensure user row exists in Supabase
            if (user) {
                const { error: insertError } = await supabase.from('users').upsert({
                    id: user.uid,
                    name: name,
                    email: email,
                    role: 'citizen'
                });
                if (insertError) console.error("Error inserting user:", insertError);
            }

            return user;
        } catch (error) {
            throw error;
        }
    };

    const loginWithGoogle = async () => {
        try {
            const userCredential = await signInWithPopup(auth, googleProvider);
            const user = userCredential.user;

            // Check if user exists in Supabase, if not insert default role
            if (user) {
                const { data, error } = await supabase.from('users').select('id').eq('id', user.uid).single();
                if (!data) {
                    const { error: insertError } = await supabase.from('users').upsert({
                        id: user.uid,
                        name: user.displayName || "Google User",
                        email: user.email,
                        role: 'citizen'
                    });
                    if (insertError) console.error("Error inserting user:", insertError);
                }
            }

            return user;
        } catch (error) {
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
        role,
        loginWithEmail,
        signUpWithEmail,
        loginWithGoogle,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
