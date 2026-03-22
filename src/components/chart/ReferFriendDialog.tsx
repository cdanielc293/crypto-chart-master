import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useProfile, planLabels } from '@/hooks/useProfile';
import { Copy, Mail, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import DraggableDialog from './DraggableDialog';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ReferFriendDialog({ open, onClose }: Props) {
  const { data: profile } = useProfile();
  const [tab, setTab] = useState('refer');

  const referralLink = profile?.referral_code
    ? `${window.location.origin}/pricing?ref=${profile.referral_code}`
    : '';

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Link copied to clipboard!');
  };

  const shareVia = (method: 'email' | 'facebook' | 'x') => {
    const text = 'Check out Vizion — the ultimate charting platform!';
    const urls: Record<string, string> = {
      email: `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(referralLink)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
      x: `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralLink)}`,
    };
    window.open(urls[method], '_blank');
  };

  return (
    <DraggableDialog
      id="refer-friend"
      open={open}
      onClose={onClose}
      title="Refer a Friend"
      className="w-[480px] max-w-[90vw]"
    >
        {/* Balance header */}
        <div className="px-8 pt-8 pb-4">
          <p className="text-4xl font-extrabold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
            ${profile?.referral_balance?.toFixed(2) || '0.00'}
          </p>
          <p className="text-xs text-white/40 mt-1 tracking-wide uppercase">Your Balance</p>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="px-8 pb-8">
          <TabsList className="bg-white/5 border border-white/10 w-full">
            <TabsTrigger value="refer" className="flex-1 data-[state=active]:bg-cyan-400/10 data-[state=active]:text-cyan-400">
              Refer a friend
            </TabsTrigger>
            <TabsTrigger value="redeem" className="flex-1 data-[state=active]:bg-cyan-400/10 data-[state=active]:text-cyan-400">
              Redeem
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex-1 data-[state=active]:bg-cyan-400/10 data-[state=active]:text-cyan-400">
              Stats & history
            </TabsTrigger>
          </TabsList>

          <TabsContent value="refer" className="mt-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-2">Get $15 for every friend you refer</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                You and your friend each receive $15 towards the purchase of any subscription.
                Complete details in{' '}
                <span className="text-cyan-400 cursor-pointer hover:underline">Terms and Conditions</span>.
              </p>
            </div>

            <div>
              <p className="text-xs text-white/40 mb-2">Share the link</p>
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5">
                <input
                  readOnly
                  value={referralLink}
                  className="bg-transparent text-sm text-white/70 outline-none flex-1 font-mono"
                />
                <button onClick={copyLink} className="p-1.5 rounded hover:bg-white/10 transition-colors">
                  <Copy size={14} className="text-white/50" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                onClick={() => shareVia('email')}
                className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
              >
                <Mail size={15} /> Email
              </Button>
              <Button
                variant="outline"
                onClick={() => shareVia('facebook')}
                className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
              >
                <Share2 size={15} /> Facebook
              </Button>
              <Button
                variant="outline"
                onClick={() => shareVia('x')}
                className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
              >
                <X size={15} /> X
              </Button>
            </div>

            {/* Stats card */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
                    ${profile?.referral_balance?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mt-1">Earned</p>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center justify-end gap-3 text-xs">
                    <span className="text-white/40">Signed up for free accounts</span>
                    <span className="font-bold text-white/80">{profile?.referrals_free || 0}</span>
                  </div>
                  <div className="flex items-center justify-end gap-3 text-xs">
                    <span className="text-white/40">Upgraded to paid plans</span>
                    <span className="font-bold text-white/80">{profile?.referrals_paid || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-white/30 leading-relaxed">
              Got an engaged following? Our{' '}
              <span className="text-cyan-400 cursor-pointer hover:underline">affiliate program</span>{' '}
              pays you cash for each new referral that you make.
            </p>
          </TabsContent>

          <TabsContent value="redeem" className="mt-6">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center">
              <p className="text-white/30 text-sm">No rewards to redeem yet. Share your link to get started!</p>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="mt-6">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center">
              <p className="text-white/30 text-sm">No referral history yet.</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
