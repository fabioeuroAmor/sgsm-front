import { type ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const variants = {
  primary:
    'bg-[#2D3A31] text-white hover:bg-[#C27B66] border-transparent',
  secondary:
    'bg-transparent border-[#8C9A84] text-[#8C9A84] hover:bg-[#8C9A84] hover:text-white',
  ghost:
    'bg-transparent border-transparent text-[#2D3A31] hover:bg-[#DCCFC2]',
  danger:
    'bg-transparent border-[#C27B66] text-[#C27B66] hover:bg-[#C27B66] hover:text-white',
}

const sizes = {
  sm: 'px-4 py-1.5 text-xs tracking-widest',
  md: 'px-6 py-2.5 text-sm tracking-widest',
  lg: 'px-8 py-3.5 text-sm tracking-widest',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-full border',
        'font-sans uppercase transition-all duration-300 cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C9A84] focus-visible:ring-offset-2',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      ].join(' ')}
    >
      {children}
    </button>
  )
}
