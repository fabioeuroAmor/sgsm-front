import { Leaf } from 'lucide-react'

interface EmptyStateProps {
  title?: string
  description?: string
}

export function EmptyState({
  title = 'Nenhum registro encontrado',
  description = 'Tente ajustar os filtros ou cadastre um novo item.',
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#DCCFC2]/40">
        <Leaf size={24} strokeWidth={1.5} className="text-[#8C9A84]" />
      </div>
      <div>
        <p className="font-serif text-lg font-semibold text-[#2D3A31]">{title}</p>
        <p className="mt-1 text-sm text-[#8C9A84]">{description}</p>
      </div>
    </div>
  )
}
