import { NavLink } from 'react-router-dom'
import { Stethoscope, Building2, ClipboardList, UserRound, Leaf, CalendarClock } from 'lucide-react'

const navItems = [
  { to: '/pacientes', label: 'Pacientes', Icon: UserRound },
  { to: '/medicos', label: 'Médicos', Icon: Stethoscope },
  { to: '/estabelecimentos', label: 'Estabelecimentos', Icon: Building2 },
  { to: '/servicos', label: 'Serviços', Icon: ClipboardList },
  { to: '/agendamentos', label: 'Agendamentos', Icon: CalendarClock },
]

export function Sidebar() {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-[#E6E2DA] bg-[#F9F8F4] px-4 py-8">
      {/* logo */}
      <div className="mb-10 flex items-center gap-3 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2D3A31]">
          <Leaf size={16} strokeWidth={1.5} className="text-white" />
        </div>
        <div>
          <span className="font-serif text-lg font-semibold leading-none text-[#2D3A31]">
            SGSM
          </span>
          <p className="mt-0.5 text-[10px] uppercase tracking-widest text-[#8C9A84]">
            Gestão Médica
          </p>
        </div>
      </div>

      {/* nav */}
      <nav className="flex flex-col gap-1">
        <p className="mb-2 px-2 text-[10px] uppercase tracking-widest text-[#8C9A84]">
          Cadastros
        </p>
        {navItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-sans transition-all duration-300',
                isActive
                  ? 'bg-[#2D3A31] text-white'
                  : 'text-[#2D3A31] hover:bg-[#DCCFC2]/60',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={16}
                  strokeWidth={1.5}
                  className={isActive ? 'text-white' : 'text-[#8C9A84]'}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* footer */}
      <div className="mt-auto px-2">
        <div className="rounded-2xl border border-[#E6E2DA] bg-[#F2F0EB] p-3">
          <p className="text-[10px] uppercase tracking-widest text-[#8C9A84]">
            Backend
          </p>
          <p className="mt-0.5 text-xs text-[#2D3A31]">
            localhost:8080
          </p>
        </div>
      </div>
    </aside>
  )
}
