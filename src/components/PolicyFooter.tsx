import { useNavigate } from 'react-router-dom';
import vizionLogo from '@/assets/vizionx-logo.png';

const footerLinks = [
  { label: 'Terms', path: '/terms' },
  { label: 'Privacy', path: '/privacy' },
  { label: 'Cookies', path: '/cookies' },
  { label: 'Disclaimer', path: '/disclaimer' },
  { label: 'Acceptable Use', path: '/acceptable-use' },
  { label: 'DMCA', path: '/dmca' },
  { label: 'Refund Policy', path: '/refund-policy' },
  { label: 'Accessibility', path: '/accessibility' },
  { label: 'Security', path: '/security' },
  { label: 'Bug Bounty', path: '/bug-bounty' },
  { label: 'Status', path: '/status' },
];

export default function PolicyFooter() {
  const navigate = useNavigate();

  return (
    <footer className="border-t border-white/5 py-10 px-6 bg-[#050508]">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src={vizionLogo} alt="" className="h-5 w-5 opacity-50" />
            <span className="text-sm text-white/25">© {new Date().getFullYear()} VizionX. All rights reserved.</span>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {footerLinks.map((link) => (
              <span
                key={link.path}
                onClick={() => navigate(link.path)}
                className="text-xs text-white/30 hover:text-white/60 transition-colors cursor-pointer"
              >
                {link.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
