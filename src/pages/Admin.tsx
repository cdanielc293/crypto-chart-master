import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useAdminStats, useAdminProfiles, useAdminTickets, useAdminSupport,
  useToggleBlock, useUpdateTicketStatus, useUpdateSupportStatus,
} from '@/hooks/useAdmin';
import { planLabels } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import vizionLogo from '@/assets/vizion-logo.png';
import {
  ArrowLeft, Users, Bug, Lightbulb, MessageSquare, BarChart3, Shield,
  Ban, CheckCircle, Clock, Loader2, ChevronDown,
} from 'lucide-react';

const tabs = [
  { id: 'overview', label: 'סקירה', icon: BarChart3 },
  { id: 'users', label: 'משתמשים', icon: Users },
  { id: 'tickets', label: 'דיווחים ובקשות', icon: Bug },
  { id: 'support', label: 'תמיכה', icon: MessageSquare },
];

const statusColors: Record<string, string> = {
  open: 'bg-yellow-500/20 text-yellow-400',
  in_progress: 'bg-blue-500/20 text-blue-400',
  resolved: 'bg-green-500/20 text-green-400',
  closed: 'bg-white/10 text-white/40',
  replied: 'bg-cyan-500/20 text-cyan-400',
};

const statusLabels: Record<string, string> = {
  open: 'פתוח',
  in_progress: 'בטיפול',
  resolved: 'טופל',
  closed: 'סגור',
  replied: 'נענה',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function Admin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: profiles, isLoading: profilesLoading } = useAdminProfiles();
  const { data: tickets, isLoading: ticketsLoading } = useAdminTickets();
  const { data: support, isLoading: supportLoading } = useAdminSupport();
  const toggleBlock = useToggleBlock();
  const updateTicket = useUpdateTicketStatus();
  const updateSupport = useUpdateSupportStatus();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const handleBlock = async (userId: string, current: boolean) => {
    try {
      await toggleBlock.mutateAsync({ userId, blocked: !current });
      toast.success(!current ? 'המשתמש נחסם' : 'החסימה הוסרה');
    } catch { toast.error('שגיאה'); }
  };

  const handleTicketStatus = async (id: string, status: string) => {
    try {
      await updateTicket.mutateAsync({ id, status });
      toast.success('סטטוס עודכן');
    } catch { toast.error('שגיאה'); }
  };

  const handleSupportReply = async (id: string) => {
    if (!replyText.trim()) return;
    try {
      await updateSupport.mutateAsync({ id, status: 'replied', admin_reply: replyText });
      toast.success('תשובה נשלחה');
      setReplyingTo(null);
      setReplyText('');
    } catch { toast.error('שגיאה'); }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white" dir="rtl">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
        <button onClick={() => navigate('/chart')} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
          <ArrowLeft size={18} className="text-white/60" />
        </button>
        <div className="flex items-center gap-2">
          <img src={vizionLogo} alt="Vizion" className="h-6 w-6" />
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
            Admin Panel
          </span>
        </div>
        <Shield size={16} className="text-cyan-400 mr-1" />
      </div>

      <div className="flex max-w-7xl mx-auto">
        {/* Sidebar */}
        <nav className="w-48 shrink-0 py-8 pr-4 pl-2 border-l border-white/5 min-h-[calc(100vh-57px)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all mb-1 ${
                activeTab === tab.id
                  ? 'bg-cyan-400/10 text-cyan-400 font-medium'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <main className="flex-1 py-8 px-8">
          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">סקירה כללית</h2>
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-cyan-400 mx-auto" />
              ) : stats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="משתמשים רשומים" value={stats.total_users} icon={Users} />
                  <StatCard label="חסומים" value={stats.blocked_users} icon={Ban} color="text-rose-400" />
                  <StatCard label="דיווחים פתוחים" value={stats.open_tickets} icon={Bug} color="text-yellow-400" />
                  <StatCard label="תמיכה פתוחה" value={stats.open_support} icon={MessageSquare} color="text-violet-400" />
                  {stats.plan_counts && Object.entries(stats.plan_counts).map(([plan, count]) => (
                    <StatCard key={plan} label={planLabels[plan] || plan} value={count as number} icon={BarChart3}
                      color={plan === 'zenith' ? 'text-emerald-400' : plan === 'elite' ? 'text-amber-400' : plan === 'prime' ? 'text-cyan-400' : 'text-slate-400'} />
                  ))}
                </div>
              ) : (
                <p className="text-white/30 text-sm">אין נתונים</p>
              )}
            </div>
          )}

          {/* Users */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">משתמשים ({profiles?.length || 0})</h2>
              {profilesLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-cyan-400 mx-auto" />
              ) : (
                <div className="rounded-xl border border-white/5 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-white/[0.02] text-white/40 text-xs">
                        <th className="px-4 py-3 text-right">שם</th>
                        <th className="px-4 py-3 text-right">username</th>
                        <th className="px-4 py-3 text-right">תוכנית</th>
                        <th className="px-4 py-3 text-right">הצטרף</th>
                        <th className="px-4 py-3 text-right">סטטוס</th>
                        <th className="px-4 py-3 text-right">פעולות</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profiles?.map((p: any) => (
                        <tr key={p.id} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3 text-white/80">{p.full_name || '—'}</td>
                          <td className="px-4 py-3 text-white/50">{p.username || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold ${
                              p.plan === 'zenith' ? 'text-emerald-400' : p.plan === 'elite' ? 'text-amber-400' : p.plan === 'prime' ? 'text-cyan-400' : 'text-slate-400'
                            }`}>
                              {planLabels[p.plan] || p.plan}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white/40 text-xs">{formatDate(p.created_at)}</td>
                          <td className="px-4 py-3">
                            {p.is_blocked ? (
                              <span className="text-xs bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full">חסום</span>
                            ) : (
                              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">פעיל</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleBlock(p.id, p.is_blocked)}
                              disabled={toggleBlock.isPending}
                              className="border-white/10 text-xs h-7"
                            >
                              {p.is_blocked ? 'בטל חסימה' : 'חסום'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tickets */}
          {activeTab === 'tickets' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">דיווחים ובקשות ({tickets?.length || 0})</h2>
              {ticketsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-cyan-400 mx-auto" />
              ) : (
                <div className="space-y-3">
                  {tickets?.map((t: any) => (
                    <div key={t.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {t.type === 'bug' ? <Bug size={14} className="text-rose-400" /> : <Lightbulb size={14} className="text-violet-400" />}
                            <span className="text-xs font-semibold text-white/60">{t.type === 'bug' ? 'באג' : 'פיצ׳ר'}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColors[t.status]}`}>
                              {statusLabels[t.status]}
                            </span>
                            <span className="text-[10px] text-white/30">{formatDate(t.created_at)}</span>
                          </div>
                          <p className="text-sm text-white/80 whitespace-pre-wrap">{t.message}</p>
                          {t.user_email && <p className="text-xs text-white/30 mt-1">מאת: {t.user_email}</p>}
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          {['open', 'in_progress', 'resolved', 'closed'].map((s) => (
                            <button
                              key={s}
                              onClick={() => handleTicketStatus(t.id, s)}
                              className={`text-[10px] px-2 py-1 rounded-lg transition-colors ${
                                t.status === s ? statusColors[s] : 'text-white/20 hover:text-white/50 hover:bg-white/5'
                              }`}
                            >
                              {statusLabels[s]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!tickets || tickets.length === 0) && (
                    <div className="text-center py-12 text-white/30 text-sm">אין דיווחים</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Support */}
          {activeTab === 'support' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">הודעות תמיכה ({support?.length || 0})</h2>
              {supportLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-cyan-400 mx-auto" />
              ) : (
                <div className="space-y-3">
                  {support?.map((s: any) => (
                    <div key={s.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-white/90">{s.subject}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColors[s.status]}`}>
                              {statusLabels[s.status]}
                            </span>
                          </div>
                          <p className="text-sm text-white/70 whitespace-pre-wrap mb-1">{s.message}</p>
                          {s.user_email && <p className="text-xs text-white/30">מאת: {s.user_email}</p>}
                          <p className="text-[10px] text-white/20 mt-1">{formatDate(s.created_at)}</p>
                          {s.admin_reply && (
                            <div className="mt-3 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                              <p className="text-xs text-cyan-400 font-semibold mb-1">תשובת אדמין:</p>
                              <p className="text-sm text-white/70">{s.admin_reply}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setReplyingTo(replyingTo === s.id ? null : s.id); setReplyText(s.admin_reply || ''); }}
                            className="border-white/10 text-xs h-7"
                          >
                            {replyingTo === s.id ? 'ביטול' : 'השב'}
                          </Button>
                          {s.status !== 'closed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateSupport.mutateAsync({ id: s.id, status: 'closed' }).then(() => toast.success('נסגר'))}
                              className="border-white/10 text-xs h-7"
                            >
                              סגור
                            </Button>
                          )}
                        </div>
                      </div>
                      {replyingTo === s.id && (
                        <div className="mt-3 flex gap-2">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="כתוב תשובה..."
                            className="flex-1 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white/80 placeholder:text-white/20 resize-none focus:outline-none focus:ring-1 focus:ring-cyan-400/30"
                            rows={2}
                            dir="rtl"
                          />
                          <Button
                            onClick={() => handleSupportReply(s.id)}
                            disabled={updateSupport.isPending}
                            className="bg-cyan-500 hover:bg-cyan-600 text-white self-end"
                            size="sm"
                          >
                            שלח
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {(!support || support.length === 0) && (
                    <div className="text-center py-12 text-white/30 text-sm">אין הודעות תמיכה</div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color = 'text-cyan-400' }: { label: string; value: number; icon: any; color?: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={color} />
        <span className="text-xs text-white/40">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
