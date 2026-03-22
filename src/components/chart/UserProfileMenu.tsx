import { useAuth } from '@/context/AuthContext';
import { useTheme, THEMES } from '@/context/ThemeContext';
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
  Home, HelpCircle, Bell, Palette, PenTool, Globe, Keyboard, Monitor, LogOut,
} from 'lucide-react';

export default function UserProfileMenu() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  if (!user) return null;

  const avatarUrl = user.user_metadata?.avatar_url;
  const name = user.user_metadata?.full_name || user.email || '';
  const initials = name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
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
      <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
        {/* User info */}
        <div className="px-3 py-2.5">
          <p className="text-sm font-medium text-foreground truncate">{name}</p>
          {user.email && (
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          )}
        </div>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => navigate('/')} className="gap-2 cursor-pointer">
          <Home size={15} /> Home
        </DropdownMenuItem>

        <DropdownMenuItem className="gap-2 cursor-pointer">
          <HelpCircle size={15} /> Help Center
        </DropdownMenuItem>

        <DropdownMenuItem className="gap-2 cursor-pointer">
          <Bell size={15} /> What's new
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

        <DropdownMenuItem className="gap-2 cursor-pointer">
          <PenTool size={15} /> Drawings panel
        </DropdownMenuItem>

        <DropdownMenuItem className="gap-2 cursor-pointer">
          <Globe size={15} /> Language
        </DropdownMenuItem>

        <DropdownMenuItem className="gap-2 cursor-pointer">
          <Keyboard size={15} /> Keyboard shortcuts
        </DropdownMenuItem>

        <DropdownMenuItem className="gap-2 cursor-pointer">
          <Monitor size={15} /> Get desktop app
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleSignOut} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
          <LogOut size={15} /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
