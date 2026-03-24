import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useIsAdmin() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['is-admin', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
    enabled: !!user,
  });
}

export interface AdminStats {
  total_users: number;
  plan_counts: Record<string, number>;
  blocked_users: number;
  open_tickets: number;
  open_support: number;
}

export interface ActivityStats {
  online_now: number;
  today_logins: number;
  week_logins: number;
  month_logins: number;
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_stats');
      if (error) throw error;
      return data as AdminStats;
    },
  });
}

export function useAdminActivityStats() {
  return useQuery({
    queryKey: ['admin-activity-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_activity_stats');
      if (error) throw error;
      return data as ActivityStats;
    },
    refetchInterval: 30000, // refresh every 30s
  });
}

export function useAdminProfiles() {
  return useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_all_profiles');
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useAdminTickets() {
  return useQuery({
    queryKey: ['admin-tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback_tickets')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAdminSupport() {
  return useQuery({
    queryKey: ['admin-support'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useToggleBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, blocked }: { userId: string; blocked: boolean }) => {
      const { error } = await supabase.rpc('admin_toggle_block', {
        p_user_id: userId,
        p_blocked: blocked,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-profiles'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}

export function useUpdateUserPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, plan }: { userId: string; plan: string }) => {
      const { error } = await supabase.rpc('admin_update_plan', {
        p_user_id: userId,
        p_plan: plan,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-profiles'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}

export function useUpdateTicketStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, admin_notes }: { id: string; status: string; admin_notes?: string }) => {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (admin_notes !== undefined) updates.admin_notes = admin_notes;
      const { error } = await supabase
        .from('feedback_tickets')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tickets'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}

export function useUpdateSupportStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, admin_reply }: { id: string; status: string; admin_reply?: string }) => {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (admin_reply !== undefined) updates.admin_reply = admin_reply;
      const { error } = await supabase
        .from('support_messages')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-support'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}
