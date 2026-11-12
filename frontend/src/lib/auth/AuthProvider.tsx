import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { apiFetch, setUnauthorizedHandler } from '../api/client';
import { supabase } from '../supabase/client';

type AuthStatus =
  | 'loading'
  | 'needs-config'
  | 'unauthenticated'
  | 'verifying'
  | 'authenticated'
  | 'error';

type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
};

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  message: string | null;
  messageType: 'error' | 'success' | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (fullName: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>(supabase ? 'loading' : 'needs-config');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'error' | 'success' | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const verificationRef = useRef<{ token: string; promise: Promise<boolean> } | null>(null);

  const verifySession = useCallback((nextSession: Session): Promise<boolean> => {
    const token = nextSession.access_token;
    if (verificationRef.current?.token === token) {
      return verificationRef.current.promise;
    }

    setStatus('verifying');
    setMessage(null);
    setMessageType(null);

    const promise = (async () => {
      try {
        const response = await apiFetch<{ user: AuthUser }>('/auth/me');
        if (verificationRef.current?.token !== token) {
          return false;
        }
        const fullName = nextSession.user.user_metadata?.full_name;
        setUser({
          ...response.user,
          name: typeof fullName === 'string' && fullName.trim() ? fullName.trim() : null,
        });
        setStatus('authenticated');
        return true;
      } catch (error) {
        if (verificationRef.current?.token !== token) {
          return false;
        }
        if (error instanceof Error && 'status' in error && error.status === 401) {
          verificationRef.current = null;
          sessionRef.current = null;
          setSession(null);
          setUser(null);
          setStatus('unauthenticated');
          setMessage('Your session is no longer authorized. Please sign in again.');
          setMessageType('error');
          queryClient.clear();
          void supabase?.auth.signOut();
          return false;
        }

        verificationRef.current = null;
        sessionRef.current = nextSession;
        setSession(nextSession);
        setUser(null);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Unable to verify your session.');
        setMessageType('error');
        return false;
      }
    })();
    verificationRef.current = { token, promise };
    return promise;
  }, [queryClient]);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      return;
    }

    let active = true;
    setUnauthorizedHandler((requestToken) => {
      if (active && requestToken && sessionRef.current?.access_token === requestToken) {
        queryClient.clear();
        setUser(null);
        setStatus('unauthenticated');
        setMessage('Your session is no longer authorized. Please sign in again.');
        setMessageType('error');
        verificationRef.current = null;
        void client.auth.signOut();
      }
    });

    const { data: authListener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) {
        return;
      }

      sessionRef.current = nextSession;
      setSession(nextSession);
      if (nextSession) {
        queueMicrotask(() => {
          if (active) {
            void verifySession(nextSession);
          }
        });
      } else {
        verificationRef.current = null;
        queryClient.clear();
        setUser(null);
        setStatus('unauthenticated');
      }
    });

    void client.auth.getSession()
      .then(({ data, error }) => {
        if (!active) {
          return;
        }
        if (error) {
          setStatus('error');
          setMessage(error.message);
          setMessageType('error');
          return;
        }
        setSession(data.session);
        sessionRef.current = data.session;
        if (data.session) {
          void verifySession(data.session);
        } else {
          verificationRef.current = null;
          queryClient.clear();
          setStatus('unauthenticated');
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setStatus('error');
          setMessage(error instanceof Error ? error.message : 'Unable to restore your Supabase session.');
          setMessageType('error');
        }
      });

    return () => {
      active = false;
      setUnauthorizedHandler(null);
      authListener.subscription.unsubscribe();
    };
  }, [queryClient, verifySession]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase authentication is not configured.');
    }

    setMessage(null);
    setMessageType(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }

    setSession(data.session);
    sessionRef.current = data.session;
    if (!(await verifySession(data.session))) {
      throw new Error('The backend could not verify your session. Check the API connection and try again.');
    }
  }, [verifySession]);

  const signUp = useCallback(async (fullName: string, email: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase authentication is not configured.');
    }

    setMessage(null);
    setMessageType(null);
    const safeFullName = fullName
      .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 100);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: safeFullName },
      },
    });
    if (error) {
      throw error;
    }

    if (!data.session) {
      setSession(null);
      sessionRef.current = null;
      verificationRef.current = null;
      queryClient.clear();
      setUser(null);
      setStatus('unauthenticated');
      throw new Error('Supabase did not return an authenticated session. Disable Confirm Email in the Supabase Auth settings, then try again.');
    }

    setSession(data.session);
    sessionRef.current = data.session;
    if (!(await verifySession(data.session))) {
      throw new Error('Your account was created, but the backend could not verify the session. Check the API connection and try signing in again.');
    }
  }, [queryClient, verifySession]);

  const signOut = useCallback(async () => {
    if (!supabase) {
      return;
    }

    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      throw error;
    }

    setSession(null);
    sessionRef.current = null;
    verificationRef.current = null;
    queryClient.clear();
    setUser(null);
    setMessage('You have been signed out.');
    setMessageType('success');
    setStatus('unauthenticated');
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    user,
    message,
    messageType,
    signIn,
    signUp,
    signOut,
  }), [status, user, message, messageType, signIn, signUp, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return context;
}
