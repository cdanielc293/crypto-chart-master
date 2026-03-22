import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme, THEMES } from '@/context/ThemeContext';
import { useProfile, planLabels, planColors } from '@/hooks/useProfile';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import {
  Home, Palette, Settings, Users, LogOut, ChevronRight,
} from 'lucide-react';
import ReferFriendDialog from './ReferFriendDialog';

export default function UserProfileMenu() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const [referOpen, setReferOpen] = useState(false);

  if (!user) return null;

  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url;
  const name = profile?.full_name || user.user_metadata?.full_name || user.email || '';
  const plan = profile?.plan || 'core';
  const initials = name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      navigate('/', { replace: true });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center rounded-full hover:ring-2 hover:ring-primary/40 transition-all">
            <Avatar className="h-7 w-7">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                {initials || '?'}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 bg-popover border-border">
          {/* User info with plan */}
          <div className="px-3 py-2.5">
            <p className="text-sm font-medium text-foreground truncate">{name}</p>
            <p className={`text-xs font-semibold mt-0.5 ${
              plan === 'zenith' ? 'text-emerald-400' :
              plan === 'elite' ? 'text-amber-400' :
              plan === 'prime' ? 'text-cyan-400' : 'text-muted-foreground'
            }`}>
              {planLabels[plan] || plan}
            </p>
            {user.email && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
            )}
          </div>
          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => navigate('/')} className="gap-2 cursor-pointer">
            <Home size={15} /> Home
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => navigate('/settings')} className="gap-2 cursor-pointer">
            <Settings size={15} /> Settings
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => setReferOpen(true)} className="gap-2 cursor-pointer">
            <Users size={15} /> Refer a friend
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Theme submenu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2 cursor-pointer">
              <Palette size={15} /> Dark theme
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="bg-popover border-border">
                {THEMES.map((t) => (
                  <DropdownMenuItem
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`cursor-pointer ${theme === t.id ? 'text-primary font-semibold' : ''}`}
                  >
                    {t.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleSignOut} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
            <LogOut size={15} /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ReferFriendDialog open={referOpen} onClose={() => setReferOpen(false)} />
    </>
  );
}
