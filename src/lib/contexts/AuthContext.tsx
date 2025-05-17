"use client";

import React, { createContext, useEffect, useState } from "react";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  getRedirectResult,
  signInWithRedirect, 
  onAuthStateChanged,
  User 
} from "firebase/auth";
import { auth } from "../firebase/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithGoogleRedirect: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  signInWithGoogle: async () => {},
  signInWithGoogleRedirect: async () => {},
  signOut: async () => {},
  clearError: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for redirect result on component mount
  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // This gives you a Google Access Token
          const credential = GoogleAuthProvider.credentialFromResult(result);
          // The signed-in user info
          setUser(result.user);
        }
      } catch (error: any) {
        setError(error.message || "Failed to complete Google sign-in redirect");
        console.error("Redirect sign-in error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkRedirectResult();
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    
    // Optional: Add scopes if needed
    // provider.addScope('https://www.googleapis.com/auth/contacts.readonly');
    
    // Optional: Set custom parameters
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    try {
      console.log("Attempting to sign in with Google...");
      const result = await signInWithPopup(auth, provider);
      console.log("Sign in successful");
      // This gives you a Google Access Token
      const credential = GoogleAuthProvider.credentialFromResult(result);
      // The signed-in user info
      setUser(result.user);
    } catch (error: any) {
      // More detailed error logging
      console.error("Error signing in with Google:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      if (error.customData) {
        console.error("Custom data:", error.customData);
      }
      if (error.email) {
        console.error("Email:", error.email);
      }
      
      // Handle Errors here
      let errorMessage = "Failed to sign in with Google";
      
      // More specific error messages based on common error codes
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = "Sign-in popup was closed before completing the sign-in.";
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = "The sign-in popup was blocked by your browser. Please allow popups for this website.";
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = "The sign-in was cancelled.";
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = "Network error. Please check your internet connection.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogleRedirect = async () => {
    setError(null);
    const provider = new GoogleAuthProvider();
    
    // Optional: Add scopes if needed
    // provider.addScope('https://www.googleapis.com/auth/contacts.readonly');
    
    // Optional: Set custom parameters
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    try {
      // Redirects to Google sign-in page
      await signInWithRedirect(auth, provider);
      // The result will be handled in the useEffect hook on page load
    } catch (error: any) {
      const errorMessage = error.message || "Failed to redirect to Google sign-in";
      setError(errorMessage);
      console.error("Error redirecting to Google sign-in", error);
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    setError(null);
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      const errorMessage = error.message || "Failed to sign out";
      setError(errorMessage);
      console.error("Error signing out", error);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        loading, 
        error,
        signInWithGoogle, 
        signInWithGoogleRedirect,
        signOut: signOutUser,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
