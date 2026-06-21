import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface CreditShopProps {
  userId: number;
  onPurchase: () => void;
}

const PACKAGES = [
  {
    amount: 20,
    label: '20 Credits',
    tier: 'Starter',
    desc: 'Perfect for trying out CDR analysis',
    color: '#8b5cf6',
    glow: 'rgba(139,92,246,0.35)',
    bg: 'rgba(139,92,246,0.06)',
    border: 'rgba(139,92,246,0.2)',
    borderHover: 'rgba(139,92,246,0.5)',
    gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
  },
  {
    amount: 100,
    label: '100 Credits',
    tier: 'Popular',
    desc: 'Best value for regular analysts',
    color: '#06b6d4',
    glow: 'rgba(6,182,212,0.35)',
    bg: 'rgba(6,182,212,0.06)',
    border: 'rgba(6,182,212,0.2)',
    borderHover: 'rgba(6,182,212,0.5)',
    gradient: 'linear-gradient(135deg, #06b6d4, #a78bfa)',
    featured: true,
  },
  {
    amount: 500,
    label: '500 Credits',
    tier: 'Pro',
    desc: 'Unlimited power for heavy analysts',
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.35)',
    bg: 'rgba(245,158,11,0.06)',
    border: 'rgba(245,158,11,0.2)',
    borderHover: 'rgba(245,158,11,0.5)',
    gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
  },
];

export default function CreditShop({ userId, onPurchase }: CreditShopProps) {
  const [loading, setLoading] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [hovered, setHovered] = useState<number | null>(null);

  const handleBuy = async (amount: number) => {
    setLoading(amount);
    setMessage('');
    try {
      const newBalance = await invoke<number>('buy_credits', { userId, amount });
      setMessage(`✅ ${amount} credits added! New balance: ${newBalance} credits.`);
      onPurchase();
    } catch (err: any) {
      setMessage(`⚠️ ${err}`);
    } finally {
      setLoading(null);
    }
  };

  const isSuccess = message.startsWith('✅');

  return (
    <div>
      {/* Message banner */}
      {message && (
        <div style={{
          padding: '14px 18px',
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 24,
          background: isSuccess ? 'rgba(16,185,129,0.08)' : 'rgba(248,113,113,0.08)',
          border: `1px solid ${isSuccess ? 'rgba(16,185,129,0.3)' : 'rgba(248,113,113,0.3)'}`,
          color: isSuccess ? '#10b981' : '#f87171',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          {message}
        </div>
      )}

      {/* Intro */}
      <div style={s.intro}>
        <div style={s.introIcon}>💎</div>
        <div>
          <div style={s.introTitle}>Credit Packages</div>
          <div style={s.introSub}>Each CDR file analysis costs 1 credit. Viewing saved analyses is always free.</div>
        </div>
      </div>

      {/* Packages grid */}
      <div style={s.grid}>
        {PACKAGES.map(pkg => (
          <div
            key={pkg.amount}
            style={{
              ...s.card,
              background: hovered === pkg.amount
                ? `linear-gradient(135deg, ${pkg.bg}, rgba(255,255,255,0.02))`
                : pkg.bg,
              border: `1px solid ${hovered === pkg.amount ? pkg.borderHover : pkg.border}`,
              boxShadow: hovered === pkg.amount
                ? `0 20px 60px ${pkg.glow}, 0 0 0 1px ${pkg.border}`
                : `0 4px 20px rgba(0,0,0,0.3)`,
              transform: hovered === pkg.amount ? 'translateY(-6px) scale(1.01)' : 'translateY(0)',
              ...(pkg.featured ? s.cardFeatured : {}),
            }}
            onMouseEnter={() => setHovered(pkg.amount)}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Tier badge */}
            <div style={{ ...s.tierBadge, color: pkg.color, background: `${pkg.bg}`, border: `1px solid ${pkg.border}` }}>
              {pkg.featured && <span style={s.starIcon}>★ </span>}
              {pkg.tier}
            </div>

            {/* Credit amount */}
            <div style={{ ...s.amount, color: pkg.color }}>
              {pkg.amount}
            </div>
            <div style={s.amountLabel}>Credits</div>

            {/* Divider */}
            <div style={{ ...s.divider, background: pkg.border }} />

            <div style={s.desc}>{pkg.desc}</div>
            <div style={s.perAnalysis}>1 credit = 1 CDR analysis</div>

            {/* Buy button */}
            <button
              onClick={() => handleBuy(pkg.amount)}
              disabled={loading === pkg.amount}
              style={{
                ...s.buyBtn,
                background: loading === pkg.amount ? 'rgba(255,255,255,0.1)' : pkg.gradient,
                boxShadow: loading === pkg.amount ? 'none' : `0 4px 20px ${pkg.glow}`,
              }}
            >
              {loading === pkg.amount ? '⏳ Adding...' : `Get ${pkg.amount} Credits`}
            </button>
          </div>
        ))}
      </div>

      {/* Info note */}
      <div style={s.note}>
        <span style={s.noteIcon}>💡</span>
        <span>Credits are added instantly to your account. Previously analyzed files can always be re-opened for free in the <strong>Analyzed Files</strong> tab.</span>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  intro: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '20px 24px',
    background: 'rgba(139,92,246,0.05)',
    border: '1px solid rgba(139,92,246,0.15)',
    borderRadius: 14,
    marginBottom: 28,
  },
  introIcon: { fontSize: 36 },
  introTitle: {
    fontFamily: 'Space Grotesk, sans-serif',
    fontSize: 17,
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: 4,
  },
  introSub: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 20,
    marginBottom: 24,
  },
  card: {
    borderRadius: 18,
    padding: '32px 26px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center' as const,
    transition: 'all 0.25s ease',
    cursor: 'default',
    position: 'relative',
  },
  cardFeatured: {
    borderWidth: '1.5px',
  },

  tierBadge: {
    fontSize: 11,
    fontWeight: 800,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    padding: '4px 12px',
    borderRadius: 100,
    marginBottom: 20,
  },
  starIcon: {
    marginRight: 2,
  },
  amount: {
    fontFamily: 'Space Grotesk, sans-serif',
    fontSize: 64,
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: '-0.03em',
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginTop: 6,
    marginBottom: 20,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
  },
  divider: {
    width: '100%',
    height: 1,
    marginBottom: 16,
    opacity: 0.5,
  },
  desc: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    marginBottom: 6,
  },
  perAnalysis: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginBottom: 24,
  },
  buyBtn: {
    width: '100%',
    padding: '12px',
    border: 'none',
    borderRadius: 10,
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Space Grotesk, sans-serif',
    transition: 'all 0.2s ease',
    letterSpacing: '0.01em',
  },

  note: {
    padding: '16px 20px',
    background: 'rgba(139,92,246,0.05)',
    border: '1px solid rgba(139,92,246,0.12)',
    borderRadius: 12,
    fontSize: 13,
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  },
  noteIcon: {
    fontSize: 18,
    flexShrink: 0,
    marginTop: 1,
  },
};
