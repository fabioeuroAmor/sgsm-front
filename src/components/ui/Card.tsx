interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export function Card({ children, className = '', hover = false }: CardProps) {
  return (
    <div
      className={[
        'rounded-3xl border border-[#E6E2DA] bg-white p-6',
        'shadow-[0_4px_6px_-1px_rgba(45,58,49,0.05)]',
        hover
          ? 'transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_-10px_rgba(45,58,49,0.1)]'
          : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}
