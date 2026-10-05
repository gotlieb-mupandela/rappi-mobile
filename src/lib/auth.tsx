import type { Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { supabase } from '@/src/lib/supabase';
import { forgetPushRegistration, registerPushIfNeeded } from '@/src/lib/push';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  ready: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  ready: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const userId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        userId.current = data.session?.user.id ?? null;
        setSession(data.session ?? null);
      })
      .catch(() => {
        if (active) setSession(null);
      })
      .finally(() => {
        if (active) setReady(true);
      });

    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      const nextUserId = next?.user.id ?? null;
      if (userId.current !== nextUserId) {
        queryClient.removeQueries({ queryKey: ['orders'] });
        queryClient.removeQueries({ queryKey: ['order'] });
        queryClient.removeQueries({ queryKey: ['profile'] });
        userId.current = nextUserId;
      }
      setSession(next);
      setReady(true);
      if (next && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        // Supabase auth calls made synchronously inside this callback can deadlock.
        setTimeout(() => void registerPushIfNeeded(), 0);
      }
      if (event === 'SIGNED_OUT') {
        void forgetPushRegistration();
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [queryClient]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      ready,
    }),
    [ready, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
