import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  plan: string;
  referral_code: string | null;
  referral_balance: number;
  referrals_free: number;
  referrals_paid: number;
  bio: string | null;
  website: string | null;
  x_profile: string | null;
  youtube_channel: string | null;
  facebook_profile: string | null;
  instagram_profile: string | null;
  signature: string | null;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user,
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select()
        .single();
      if (error) throw error;
      return data as Profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });
}

export const planLabels: Record<string, string> = {
  core: 'Vizion Core',
  prime: 'Vizion Prime',
  elite: 'Vizion Elite',
  zenith: 'Vizion Zenith',
};

export const planColors: Record<string, string> = {
  core: 'text-slate-400',
  prime: 'text-cyan-400',
  elite: 'text-amber-400',
  zenith: 'text-emerald-400',
};
