interface BadgeProps {
  children: React.ReactNode
  variant?: 'active' | 'inactive' | 'default'
}

const variants = {
  active: 'bg-[#8C9A84]/15 text-[#2D3A31] border-[#8C9A84]/30',
  inactive: 'bg-[#DCCFC2]/40 text-[#2D3A31]/50 border-[#DCCFC2]',
  default: 'bg-[#F2F0EB] text-[#2D3A31] border-[#E6E2DA]',
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-0.5',
        'text-xs uppercase tracking-widest font-sans',
        variants[variant],
      ].join(' ')}
    >
      {children}
    </span>
  )
}
