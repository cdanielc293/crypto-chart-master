import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';

const HEARTBEAT_INTERVAL = 15_000; // 15 seconds
const BC_CHANNEL = 'vizionx-session';

function generateTabId() {
  return `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function parseUserAgent(ua: string): { device: string; browser: string } {
  let device = 'Unknown';
  let browser = 'Unknown';

  if (/mobile|android|iphone|ipad/i.test(ua)) device = 'Mobile';
  else if (/tablet/i.test(ua)) device = 'Tablet';
  else device = 'PC';

  if (/chrome/i.test(ua) && !/edg/i.test(ua)) browser = 'Chrome';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/edg/i.test(ua)) browser = 'Edge';
  else if (/opera|opr/i.test(ua)) browser = 'Opera';

  return { device, browser };
}

export interface SessionDisconnectInfo {
  device: string;
  browser: string;
}

export interface IpAlertInfo {
  previousIp: string;
  currentIp: string;
}

export function useSessionEnforcement() {
  const { user, isGuest } = useAuth();
  const tabIdRef = useRef(generateTabId());
  const intervalRef = useRef<number | null>(null);
  const [disconnected, setDisconnected] = useState(false);
  const [disconnectInfo, setDisconnectInfo] = useState<SessionDisconnectInfo | null>(null);
  const [ipAlert, setIpAlert] = useState<IpAlertInfo | null>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);

  const claim = useCallback(async () => {
    if (!user || isGuest) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await supabase.functions.invoke('chart-heartbeat', {
        body: { tab_id: tabIdRef.current, action: 'claim' },
      });

      if (res.data?.ip_alert) {
        setIpAlert({
          previousIp: res.data.previous_ip,
          currentIp: res.data.current_ip,
        });
      }

      // Notify other tabs in same browser
      bcRef.current?.postMessage({
        type: 'session-claimed',
        tabId: tabIdRef.current,
        userAgent: navigator.userAgent,
      });
    } catch (err) {
      console.error('Session claim error:', err);
    }
  }, [user, isGuest]);

  const check = useCallback(async () => {
    if (!user || isGuest) return;

    try {
      const res = await supabase.functions.invoke('chart-heartbeat', {
        body: { tab_id: tabIdRef.current, action: 'check' },
      });

      if (res.data && !res.data.active) {
        const info = res.data.disconnected_by;
        const parsed = parseUserAgent(info?.user_agent || '');
        setDisconnected(true);
        setDisconnectInfo(parsed);
      }

      if (res.data?.ip_alert && !disconnected) {
        setIpAlert({
          previousIp: res.data.previous_ip,
          currentIp: res.data.current_ip,
        });
      }
    } catch (err) {
      console.error('Session check error:', err);
    }
  }, [user, isGuest, disconnected]);

  const reconnect = useCallback(async () => {
    setDisconnected(false);
    setDisconnectInfo(null);
    tabIdRef.current = generateTabId();
    await claim();
  }, [claim]);

  const dismissIpAlert = useCallback((wasMe: boolean) => {
    if (!wasMe && user) {
      // User says it wasn't them - redirect to password change
      setIpAlert(null);
      // The dialog will handle the redirect
    } else {
      setIpAlert(null);
    }
  }, [user]);

  // BroadcastChannel for same-browser instant detection
  useEffect(() => {
    if (!user || isGuest) return;

    const bc = new BroadcastChannel(BC_CHANNEL);
    bcRef.current = bc;

    bc.onmessage = (event) => {
      if (event.data?.type === 'session-claimed' && event.data.tabId !== tabIdRef.current) {
        const parsed = parseUserAgent(event.data.userAgent || navigator.userAgent);
        setDisconnected(true);
        setDisconnectInfo(parsed);

        // Stop heartbeat
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    return () => {
      bc.close();
      bcRef.current = null;
    };
  }, [user, isGuest]);

  // Initial claim + periodic check
  useEffect(() => {
    if (!user || isGuest) return;

    // Claim on mount
    claim();

    // Periodic check
    intervalRef.current = window.setInterval(() => {
      if (!disconnected) {
        check();
      }
    }, HEARTBEAT_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user, isGuest, claim, check, disconnected]);

  return {
    disconnected,
    disconnectInfo,
    ipAlert,
    reconnect,
    dismissIpAlert,
  };
}
