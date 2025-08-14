import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUser(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await fetchUser(session.user.id);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUser = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUser(data);
    } catch (error) {
      console.error('Error fetching user:', error);
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    // First check if user exists and is verified
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError) {
      throw new Error('Invalid email or password');
    }

    if (!userData.is_verified) {
      throw new Error('Please verify your email before logging in');
    }

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.user) {
      await fetchUser(data.user.id);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.user) {
      // Generate verification token
      const verificationToken = crypto.randomUUID();

      // Create user record in our users table
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          name,
          email,
          password: 'managed_by_supabase_auth', // Placeholder since Supabase handles auth
          verification_token: verificationToken,
          is_verified: false,
        });

      if (insertError) {
        throw new Error('Failed to create user profile');
      }

      // Send verification email (you'll need to implement this)
      await sendVerificationEmail(email, name, verificationToken);
    }
  };

  const verifyEmail = async (token: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('verification_token', token)
      .single();

    if (error || !data) {
      throw new Error('Invalid verification token');
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_verified: true,
        verification_token: null,
      })
      .eq('id', data.id);

    if (updateError) {
      throw new Error('Email verification failed');
    }
  };

  const forgotPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  const resetPassword = async (token: string, password: string) => {
    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  const logout = () => {
    supabase.auth.signOut();
    setUser(null);
  };

  // Helper function to send verification email
  const sendVerificationEmail = async (email: string, name: string, token: string) => {
    // You can implement this using a service like Resend, SendGrid, or Supabase Edge Functions
    console.log('Verification email would be sent to:', email, 'with token:', token);
    // For now, we'll just log it. In production, you'd send an actual email.
  };

  const value = {
    user,
    login,
    register,
    verifyEmail,
    forgotPassword,
    resetPassword,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};