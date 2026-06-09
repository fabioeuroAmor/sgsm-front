import { useEffect, useState, useMemo } from 'react'
import {
  CalendarClock,
  Plus,
  ChevronRight,
  ChevronLeft,
  XCircle,
  Clock,
  User,
  MapPin,
  Stethoscope,
  Building2,
  CalendarDays,
  CheckCircle2,
  Home,
  Truck,
  Play,
  BadgeCheck,
  CreditCard,
  Search,
} from 'lucide-react'
import { useAgendamentos } from '../hooks/useAgendamentos'
import { pacienteService } from '../services/pacienteService'
import { servicoMedicoService } from '../services/servicoMedicoService'
import { medicoService } from '../services/medicoService'
import { agendamentoService } from '../services/agendamentoService'
import type {
  AgendamentoResponse,
  CancelarAgendamentoRequest,
  EstabelecimentoResponse,
  MedicoResponse,
  OrigemCancelamento,
  PacienteResponse,
  ServicoMedicoResponse,
  SlotDisponivelResponse,
  StatusAgendamento,
  TipoAgendamento,
} from '../types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'

// ─── helpers ──────────────────────────────────────────────────────────────────

function maskCPF(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function formatDateTime(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateInput(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

const STATUS_LABEL: Record<StatusAgendamento, string> = {
  PENDENTE: 'Pendente',
  AGUARDANDO_PAGAMENTO: 'Aguard. Pagamento',
  CONFIRMADO: 'Confirmado',
  EM_ANDAMENTO: 'Em Andamento',
  A_CAMINHO: 'A Caminho',
  CHEGOU: 'Chegou',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
  NO_SHOW: 'Não Compareceu',
}

const TIPO_LABEL: Record<TipoAgendamento, string> = {
  PRESENCIAL: 'Presencial',
  DOMICILIAR: 'Domiciliar',
  TELEMEDICINA: 'Telemedicina',
}

function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function proximoStatus(a: AgendamentoResponse): StatusAgendamento | null {
  if (a.status === 'PENDENTE' || a.status === 'AGUARDANDO_PAGAMENTO') return 'CONFIRMADO'
  if (a.status === 'CONFIRMADO') return a.tipo === 'DOMICILIAR' ? 'A_CAMINHO' : 'EM_ANDAMENTO'
  if (a.status === 'A_CAMINHO') return 'CHEGOU'
  if (a.status === 'CHEGOU') return 'EM_ANDAMENTO'
  if (a.status === 'EM_ANDAMENTO') return 'CONCLUIDO'
  return null
}

const PROXIMO_LABEL: Partial<Record<StatusAgendamento, string>> = {
  CONFIRMADO: 'Confirmar',
  A_CAMINHO: 'A Caminho',
  EM_ANDAMENTO: 'Iniciar Atendimento',
  CHEGOU: 'Chegou',
  CONCLUIDO: 'Concluir',
}

const PROXIMO_ICON: Partial<Record<StatusAgendamento, JSX.Element>> = {
  CONFIRMADO: <BadgeCheck size={13} strokeWidth={1.5} />,
  A_CAMINHO: <Truck size={13} strokeWidth={1.5} />,
  EM_ANDAMENTO: <Play size={13} strokeWidth={1.5} />,
  CHEGOU: <MapPin size={13} strokeWidth={1.5} />,
  CONCLUIDO: <CheckCircle2 size={13} strokeWidth={1.5} />,
}

function statusVariant(s: StatusAgendamento): 'active' | 'inactive' | 'default' {
  if (s === 'CONFIRMADO' || s === 'CONCLUIDO' || s === 'EM_ANDAMENTO' || s === 'A_CAMINHO' || s === 'CHEGOU') return 'active'
  if (s === 'CANCELADO' || s === 'NO_SHOW') return 'inactive'
  return 'default'
}

function stripMask(v: string) {
  return v.replace(/\D/g, '')
}

const WIZARD_TITLES = [
  'Passo 1 / 5 — Paciente',
  'Passo 2 / 5 — Serviço Médico',
  'Passo 3 / 5 — Tipo e Local',
  'Passo 4 / 5 — Data e Horário',
  'Passo 5 / 5 — Confirmação',
]

// ─── seleção com hover ────────────────────────────────────────────────────────

function SelectRow({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full text-left rounded-2xl border px-4 py-3 transition-all duration-200 font-sans text-sm',
        selected
          ? 'border-[#8C9A84] bg-[#8C9A84]/10 text-[#2D3A31]'
          : 'border-[#E6E2DA] bg-[#F2F0EB] hover:border-[#8C9A84]/50 hover:bg-white text-[#2D3A31]',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

// ─── componente principal ─────────────────────────────────────────────────────

export function AgendamentosPage() {
  const { agendamentos, loading, error, listar, cadastrar, cancelar, atualizarStatus } = useAgendamentos()
  const [atualizandoId, setAtualizandoId] = useState<string | null>(null)
  const [filtroStatus, setFiltroStatus] = useState<StatusAgendamento | ''>('')
  const [buscaMedico, setBuscaMedico] = useState('')
  const [medicoSelecionado, setMedicoSelecionado] = useState<MedicoResponse | null>(null)
  const [todosMedicos, setTodosMedicos] = useState<MedicoResponse[]>([])
  const [buscaPacienteStr, setBuscaPacienteStr] = useState('')
  const [pacienteSelecionado, setPacienteSelecionado] = useState<PacienteResponse | null>(null)
  const [todosPacientes, setTodosPacientes] = useState<PacienteResponse[]>([])

  // ─── wizard state ──────────────────────────────────────────────────────────
  const [wizardAberto, setWizardAberto] = useState(false)
  const [passo, setPasso] = useState(1)
  const [wizardError, setWizardError] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  // passo 1: paciente
  const [todosOsPacientes, setTodosOsPacientes] = useState<PacienteResponse[]>([])
  const [buscaPaciente, setBuscaPaciente] = useState('')
  const [selectedPaciente, setSelectedPaciente] = useState<PacienteResponse | null>(null)

  // passo 2: serviço + médico
  const [todosOsServicos, setTodosOsServicos] = useState<ServicoMedicoResponse[]>([])
  const [medicosMap, setMedicosMap] = useState<Record<string, MedicoResponse>>({})
  const [buscaServico, setBuscaServico] = useState('')
  const [selectedServico, setSelectedServico] = useState<ServicoMedicoResponse | null>(null)

  // passo 3: tipo + estabelecimento
  const [selectedTipo, setSelectedTipo] = useState<TipoAgendamento>('PRESENCIAL')
  const [estabelecimentos, setEstabelecimentos] = useState<EstabelecimentoResponse[]>([])
  const [loadingEstabelecimentos, setLoadingEstabelecimentos] = useState(false)
  const [selectedEstabelecimento, setSelectedEstabelecimento] = useState<EstabelecimentoResponse | null>(null)

  // passo 4: data + slot
  const [dataSelecionada, setDataSelecionada] = useState('')
  const [slots, setSlots] = useState<SlotDisponivelResponse[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<SlotDisponivelResponse | null>(null)

  // passo 5: observações
  const [observacoes, setObservacoes] = useState('')

  // ─── a caminho modal ───────────────────────────────────────────────────────
  const [aCaminhoItem, setACaminhoItem] = useState<AgendamentoResponse | null>(null)
  const [linkLocalizacao, setLinkLocalizacao] = useState('')
  const [salvandoACaminho, setSalvandoACaminho] = useState(false)

  // ─── cancelar modal ────────────────────────────────────────────────────────
  const [cancelandoItem, setCancelandoItem] = useState<AgendamentoResponse | null>(null)
  const [origemCancelamento, setOrigemCancelamento] = useState<OrigemCancelamento>('PACIENTE')
  const [motivoCancelamento, setMotivoCancelamento] = useState('')
  const [cancelando, setCancelando] = useState(false)

  // ─── efeitos ──────────────────────────────────────────────────────────────

  const sugestoes = useMemo(() => {
    if (medicoSelecionado || !buscaMedico.trim()) return []
    const q = buscaMedico.trim().toLowerCase()
    const crmQ = q.replace(/\D/g, '')
    return todosMedicos.filter(m => {
      if (crmQ.length >= 2 && m.crm.replace(/\D/g, '').startsWith(crmQ)) return true
      return m.nome.toLowerCase().includes(q)
    }).slice(0, 6)
  }, [buscaMedico, medicoSelecionado, todosMedicos])

  const buscaAtiva = buscaMedico.trim().length > 0
  const semResultado = buscaAtiva && !medicoSelecionado && sugestoes.length === 0

  function selecionarMedico(m: MedicoResponse) {
    setMedicoSelecionado(m)
    setBuscaMedico(m.nome)
  }

  function limparBuscaMedico() {
    setMedicoSelecionado(null)
    setBuscaMedico('')
  }

  const sugestoesPaciente = useMemo(() => {
    if (pacienteSelecionado || !buscaPacienteStr.trim()) return []
    const q = buscaPacienteStr.trim().toLowerCase()
    const cpfQ = q.replace(/\D/g, '')
    return todosPacientes.filter(p => {
      if (cpfQ.length >= 3 && p.cpf.replace(/\D/g, '').startsWith(cpfQ)) return true
      return p.nome.toLowerCase().includes(q)
    }).slice(0, 6)
  }, [buscaPacienteStr, pacienteSelecionado, todosPacientes])

  const buscaPacienteAtiva = buscaPacienteStr.trim().length > 0
  const semResultadoPaciente = buscaPacienteAtiva && !pacienteSelecionado && sugestoesPaciente.length === 0

  function selecionarPaciente(p: PacienteResponse) {
    setPacienteSelecionado(p)
    setBuscaPacienteStr(p.nome)
  }

  function limparBuscaPaciente() {
    setPacienteSelecionado(null)
    setBuscaPacienteStr('')
  }

  useEffect(() => {
    medicoService.listar({ ativo: true }).then(setTodosMedicos).catch(() => {})
    pacienteService.listar({ ativo: true }).then(setTodosPacientes).catch(() => {})
  }, [])

  useEffect(() => {
    listar({
      ...(filtroStatus ? { status: filtroStatus } : {}),
      ...(medicoSelecionado ? { medicoId: medicoSelecionado.id } : {}),
      ...(pacienteSelecionado ? { pacienteId: pacienteSelecionado.id } : {}),
    })
  }, [filtroStatus, medicoSelecionado, pacienteSelecionado, listar])

  // carrega pacientes ativos quando wizard abre
  useEffect(() => {
    if (!wizardAberto) return
    pacienteService.listar({ ativo: true }).then(setTodosOsPacientes).catch(() => {})
  }, [wizardAberto])

  // carrega serviços e médicos ao entrar no passo 2
  useEffect(() => {
    if (passo !== 2) return
    Promise.all([
      servicoMedicoService.listar({ ativo: true }),
      medicoService.listar({ ativo: true }),
    ])
      .then(([servicos, medicos]) => {
        setTodosOsServicos(servicos)
        const map: Record<string, MedicoResponse> = {}
        medicos.forEach((m) => { map[m.id] = m })
        setMedicosMap(map)
      })
      .catch(() => {})
  }, [passo])

  // carrega estabelecimentos ao entrar no passo 3 (só para não-domiciliar)
  useEffect(() => {
    if (passo !== 3 || !selectedServico || selectedTipo === 'DOMICILIAR') return
    setLoadingEstabelecimentos(true)
    setEstabelecimentos([])
    setWizardError(null)
    agendamentoService
      .getEstabelecimentosByMedico(selectedServico.medicoId)
      .then((data) => {
        setEstabelecimentos(data)
        if (data.length === 0) {
          setWizardError('Nenhum estabelecimento encontrado para este médico.')
        }
      })
      .catch((err: Error) => setWizardError(err.message))
      .finally(() => setLoadingEstabelecimentos(false))
  }, [passo, selectedServico, selectedTipo])

  // carrega slots quando data muda no passo 4
  useEffect(() => {
    if (passo !== 4 || !selectedServico || !dataSelecionada) return
    if (selectedTipo !== 'DOMICILIAR' && !selectedEstabelecimento) return
    setLoadingSlots(true)
    setSelectedSlot(null)
    agendamentoService
      .getSlots(
        selectedServico.medicoId,
        selectedTipo === 'DOMICILIAR' ? undefined : selectedEstabelecimento!.id,
        dataSelecionada,
      )
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false))
  }, [passo, dataSelecionada, selectedServico, selectedEstabelecimento, selectedTipo])

  // ─── wizard helpers ────────────────────────────────────────────────────────

  function resetWizard() {
    setPasso(1)
    setBuscaPaciente('')
    setSelectedPaciente(null)
    setBuscaServico('')
    setSelectedServico(null)
    setSelectedTipo('PRESENCIAL')
    setEstabelecimentos([])
    setSelectedEstabelecimento(null)
    setDataSelecionada('')
    setSlots([])
    setSelectedSlot(null)
    setObservacoes('')
    setWizardError(null)
  }

  function abrirWizard() {
    resetWizard()
    setWizardAberto(true)
  }

  function fecharWizard() {
    setWizardAberto(false)
    resetWizard()
  }

  function podeAvancar() {
    if (passo === 1) return selectedPaciente !== null
    if (passo === 2) return selectedServico !== null
    if (passo === 3) return selectedTipo === 'DOMICILIAR' || selectedEstabelecimento !== null
    if (passo === 4) return selectedSlot !== null
    return true
  }

  function avancar() {
    if (!podeAvancar()) return
    setWizardError(null)
    setPasso((p) => p + 1)
  }

  function voltar() {
    setWizardError(null)
    setPasso((p) => p - 1)
  }

  async function confirmar() {
    if (!selectedPaciente || !selectedServico || !selectedSlot) return
    if (selectedTipo !== 'DOMICILIAR' && !selectedEstabelecimento) return
    setSalvando(true)
    setWizardError(null)
    try {
      await cadastrar({
        pacienteId: selectedPaciente.id,
        servicoMedicoId: selectedServico.id,
        estabelecimentoId: selectedTipo === 'DOMICILIAR' ? undefined : selectedEstabelecimento!.id,
        tipo: selectedTipo,
        dataHoraInicio: selectedSlot.dataHoraInicio,
        observacoes: observacoes || undefined,
      })
      fecharWizard()
      listar(filtroStatus ? { status: filtroStatus } : {})
    } catch (err) {
      setWizardError((err as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  // ─── cancelar helpers ──────────────────────────────────────────────────────

  async function confirmarCancelamento() {
    if (!cancelandoItem || !motivoCancelamento.trim()) return
    setCancelando(true)
    try {
      await cancelar(cancelandoItem.id, {
        origemCancelamento,
        motivoCancelamento,
      })
      setCancelandoItem(null)
      setMotivoCancelamento('')
    } catch (err) {
      // silently - the list will still reflect the update
    } finally {
      setCancelando(false)
    }
  }

  // ─── filtros de lista ──────────────────────────────────────────────────────

  const pacientesFiltrados = todosOsPacientes.filter((p) => {
    const q = buscaPaciente.toLowerCase()
    return (
      p.nome.toLowerCase().includes(q) ||
      p.cpf.includes(q) ||
      stripMask(p.cpf).includes(stripMask(q))
    )
  })

  const servicosFiltrados = todosOsServicos.filter((s) => {
    const q = buscaServico.toLowerCase()
    const medico = medicosMap[s.medicoId]
    return (
      s.nome.toLowerCase().includes(q) ||
      (medico && medico.nome.toLowerCase().includes(q))
    )
  })

  // ─── render ────────────────────────────────────────────────────────────────

  const podeCancel = (a: AgendamentoResponse) =>
    a.status !== 'CANCELADO' && a.status !== 'CONCLUIDO' && a.status !== 'NO_SHOW'

  return (
    <div className="space-y-8">
      {/* cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[#2D3A31]">Agendamentos</h1>
          <p className="mt-1 font-sans text-sm text-[#8C9A84]">
            Gerencie consultas e procedimentos
          </p>
        </div>
        <Button variant="primary" onClick={abrirWizard}>
          <Plus size={16} strokeWidth={1.5} />
          Novo Agendamento
        </Button>
      </div>

      {/* pesquisa + filtros */}
      <div className="space-y-3">
        {/* busca por CRM ou nome */}
        <div className="flex flex-wrap items-start gap-3">
          <div className="relative w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C9A84]" />
            <input
              type="text"
              value={buscaMedico}
              onChange={(e) => {
                setBuscaMedico(e.target.value)
                if (medicoSelecionado) setMedicoSelecionado(null)
              }}
              placeholder="CRM ou nome do médico…"
              disabled={buscaPacienteAtiva || !!pacienteSelecionado}
              className={[
                'w-full rounded-2xl border pl-9 pr-4 py-2 font-sans text-sm outline-none transition-all duration-200 placeholder:text-[#8C9A84]/60',
                buscaPacienteAtiva || pacienteSelecionado
                  ? 'cursor-not-allowed border-[#E6E2DA] bg-[#E6E2DA]/60 text-[#8C9A84]'
                  : medicoSelecionado
                    ? 'border-[#8C9A84] bg-[#8C9A84]/10 text-[#2D3A31] focus:bg-white'
                    : 'border-[#E6E2DA] bg-[#F2F0EB] text-[#2D3A31] focus:border-[#8C9A84] focus:bg-white',
              ].join(' ')}
            />
            {/* sugestões */}
            {sugestoes.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-2xl border border-[#E6E2DA] bg-white shadow-lg">
                {sugestoes.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => selecionarMedico(m)}
                    className="flex w-full items-start gap-2 px-4 py-2.5 text-left transition-colors hover:bg-[#F2F0EB]"
                  >
                    <div className="min-w-0">
                      <p className="font-sans text-sm font-medium text-[#2D3A31] truncate">{m.nome}</p>
                      <p className="font-sans text-xs text-[#8C9A84]">CRM {m.crm}/{m.crmUf} · {m.especialidade}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* feedback */}
          {medicoSelecionado && (
            <div className="flex items-center gap-2 rounded-2xl border border-[#8C9A84]/40 bg-[#8C9A84]/10 px-3 py-2">
              <span className="font-sans text-sm text-[#2D3A31]">
                Dr(a). {medicoSelecionado.nome} — CRM {medicoSelecionado.crm}/{medicoSelecionado.crmUf}
              </span>
              <button onClick={limparBuscaMedico} className="text-[#8C9A84] hover:text-[#C27B66] transition-colors">
                <XCircle size={14} strokeWidth={1.5} />
              </button>
            </div>
          )}
          {semResultado && (
            <span className="font-sans text-sm text-[#C27B66] self-center">Nenhum médico encontrado</span>
          )}
        </div>

        {/* busca por CPF ou nome do paciente */}
        <div className="flex flex-wrap items-start gap-3">
          <div className="relative w-72">
            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C9A84]" />
            <input
              type="text"
              value={buscaPacienteStr}
              onChange={(e) => {
                setBuscaPacienteStr(e.target.value)
                if (pacienteSelecionado) setPacienteSelecionado(null)
              }}
              placeholder="CPF ou nome do paciente…"
              disabled={buscaAtiva || !!medicoSelecionado}
              className={[
                'w-full rounded-2xl border pl-9 pr-4 py-2 font-sans text-sm outline-none transition-all duration-200 placeholder:text-[#8C9A84]/60',
                buscaAtiva || medicoSelecionado
                  ? 'cursor-not-allowed border-[#E6E2DA] bg-[#E6E2DA]/60 text-[#8C9A84]'
                  : pacienteSelecionado
                    ? 'border-[#8C9A84] bg-[#8C9A84]/10 text-[#2D3A31] focus:bg-white'
                    : 'border-[#E6E2DA] bg-[#F2F0EB] text-[#2D3A31] focus:border-[#8C9A84] focus:bg-white',
              ].join(' ')}
            />
            {sugestoesPaciente.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-2xl border border-[#E6E2DA] bg-white shadow-lg">
                {sugestoesPaciente.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selecionarPaciente(p)}
                    className="flex w-full items-start gap-2 px-4 py-2.5 text-left transition-colors hover:bg-[#F2F0EB]"
                  >
                    <div className="min-w-0">
                      <p className="font-sans text-sm font-medium text-[#2D3A31] truncate">{p.nome}</p>
                      <p className="font-sans text-xs text-[#8C9A84]">CPF {maskCPF(p.cpf)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {pacienteSelecionado && (
            <div className="flex items-center gap-2 rounded-2xl border border-[#8C9A84]/40 bg-[#8C9A84]/10 px-3 py-2">
              <span className="font-sans text-sm text-[#2D3A31]">
                {pacienteSelecionado.nome} — CPF {maskCPF(pacienteSelecionado.cpf)}
              </span>
              <button onClick={limparBuscaPaciente} className="text-[#8C9A84] hover:text-[#C27B66] transition-colors">
                <XCircle size={14} strokeWidth={1.5} />
              </button>
            </div>
          )}
          {semResultadoPaciente && (
            <span className="font-sans text-sm text-[#C27B66] self-center">Nenhum paciente encontrado</span>
          )}
        </div>

        {/* filtro de status */}
        <div className="flex flex-wrap gap-2">
          {(['', 'PENDENTE', 'CONFIRMADO', 'CONCLUIDO', 'CANCELADO'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFiltroStatus(s as StatusAgendamento | '')}
              className={[
                'rounded-full border px-4 py-1.5 text-xs uppercase tracking-widest font-sans transition-all duration-200',
                filtroStatus === s
                  ? 'bg-[#2D3A31] text-white border-[#2D3A31]'
                  : 'border-[#E6E2DA] text-[#8C9A84] hover:border-[#8C9A84]',
              ].join(' ')}
            >
              {s ? STATUS_LABEL[s as StatusAgendamento] : 'Todos'}
            </button>
          ))}
        </div>
      </div>

      {/* erros */}
      {error && (
        <div className="rounded-2xl border border-[#C27B66]/30 bg-[#C27B66]/10 px-4 py-3 font-sans text-sm text-[#C27B66]">
          {error}
        </div>
      )}

      {/* lista */}
      {loading ? (
        <div className="flex h-48 items-center justify-center font-sans text-sm text-[#8C9A84]">
          Carregando…
        </div>
      ) : agendamentos.length === 0 ? (
        <EmptyState
          icon={<CalendarClock size={40} strokeWidth={1} />}
          title="Nenhum agendamento encontrado"
          description="Crie um novo agendamento clicando no botão acima."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agendamentos.map((a, i) => (
            <Card
              key={a.id}
              hover
              className={i % 2 === 1 ? 'md:translate-y-3' : ''}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-serif text-base font-semibold text-[#2D3A31] truncate">
                    <span className="font-sans text-xs font-normal text-[#8C9A84] uppercase tracking-widest mr-1">Paciente:</span>
                    {a.pacienteNome ?? '—'}
                  </p>
                  <p className="font-sans text-xs text-[#8C9A84] truncate">
                    <span className="uppercase tracking-widest mr-1">Serviço:</span>
                    {a.servicoMedicoNome ?? '—'}
                  </p>
                </div>
                <Badge variant={statusVariant(a.status)}>
                  {STATUS_LABEL[a.status]}
                </Badge>
              </div>

              <div className="mt-4 space-y-1.5 font-sans text-sm text-[#2D3A31]/70">
                <div className="flex items-center gap-2">
                  <Stethoscope size={14} strokeWidth={1.5} className="text-[#8C9A84]" />
                  <span className="truncate">{a.medicoNome ?? '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {a.tipo === 'DOMICILIAR' ? (
                    <Home size={14} strokeWidth={1.5} className="text-[#8C9A84]" />
                  ) : (
                    <MapPin size={14} strokeWidth={1.5} className="text-[#8C9A84]" />
                  )}
                  {a.tipo === 'DOMICILIAR' ? (
                    a.pacienteEndereco ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.pacienteEndereco)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate transition-colors duration-200 hover:text-[#C27B66] hover:underline"
                        title="Abrir endereço do paciente no Google Maps"
                      >
                        Domiciliar — {a.pacienteEndereco}
                      </a>
                    ) : (
                      <span className="truncate text-[#8C9A84] italic">Domiciliar</span>
                    )
                  ) : a.estabelecimentoEndereco ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.estabelecimentoEndereco)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate transition-colors duration-200 hover:text-[#C27B66] hover:underline"
                      title="Ver no Google Maps"
                    >
                      {a.estabelecimentoNome ?? '—'}
                    </a>
                  ) : (
                    <span className="truncate">{a.estabelecimentoNome ?? '—'}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays size={14} strokeWidth={1.5} className="text-[#8C9A84]" />
                  <span>{formatDateTime(a.dataHoraInicio)}</span>
                </div>
                {a.localizacaoMedico && (
                  <div className="flex items-center gap-2">
                    <Truck size={14} strokeWidth={1.5} className="text-[#8C9A84]" />
                    <a
                      href={a.localizacaoMedico}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-xs font-medium transition-colors duration-200 text-[#8C9A84] hover:text-[#C27B66] hover:underline"
                      title="Ver localização do médico em tempo real"
                    >
                      Acompanhar localização do médico
                    </a>
                  </div>
                )}
              </div>

              {(podeCancel(a) || proximoStatus(a) !== null) && (
                <div className="mt-4 flex items-center justify-between gap-2">
                  {podeCancel(a) ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCancelandoItem(a)
                        setOrigemCancelamento('PACIENTE')
                        setMotivoCancelamento('')
                      }}
                    >
                      <XCircle size={14} strokeWidth={1.5} />
                      Cancelar
                    </Button>
                  ) : <span />}
                  {proximoStatus(a) !== null && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={atualizandoId === a.id}
                      onClick={async () => {
                        const next = proximoStatus(a)
                        if (!next) return
                        if (next === 'A_CAMINHO') {
                          setACaminhoItem(a)
                          setLinkLocalizacao('')
                          return
                        }
                        setAtualizandoId(a.id)
                        try { await atualizarStatus(a.id, next) }
                        finally { setAtualizandoId(null) }
                      }}
                    >
                      {PROXIMO_ICON[proximoStatus(a)!]}
                      {atualizandoId === a.id ? '…' : PROXIMO_LABEL[proximoStatus(a)!]}
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ─── wizard modal ─────────────────────────────────────────────────── */}
      <Modal
        open={wizardAberto}
        onClose={fecharWizard}
        title={WIZARD_TITLES[passo - 1]}
        footer={
          <>
            {passo > 1 && (
              <Button variant="secondary" onClick={voltar} disabled={salvando}>
                <ChevronLeft size={15} strokeWidth={1.5} />
                Anterior
              </Button>
            )}
            {passo < 5 ? (
              <Button variant="primary" onClick={avancar} disabled={!podeAvancar()}>
                Próximo
                <ChevronRight size={15} strokeWidth={1.5} />
              </Button>
            ) : (
              <Button variant="primary" onClick={confirmar} disabled={salvando}>
                {salvando ? 'Salvando…' : (
                  <>
                    <CheckCircle2 size={15} strokeWidth={1.5} />
                    Confirmar
                  </>
                )}
              </Button>
            )}
          </>
        }
      >
        {wizardError && (
          <div className="mb-4 rounded-2xl border border-[#C27B66]/30 bg-[#C27B66]/10 px-4 py-3 font-sans text-sm text-[#C27B66]">
            {wizardError}
          </div>
        )}

        {/* passo 1: paciente */}
        {passo === 1 && (
          <div className="space-y-3">
            <Input
              placeholder="Buscar por nome ou CPF…"
              value={buscaPaciente}
              onChange={(e) => setBuscaPaciente(e.target.value)}
            />
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {pacientesFiltrados.length === 0 ? (
                <p className="py-6 text-center font-sans text-sm text-[#8C9A84]">
                  Nenhum paciente encontrado
                </p>
              ) : (
                pacientesFiltrados.map((p) => (
                  <SelectRow
                    key={p.id}
                    selected={selectedPaciente?.id === p.id}
                    onClick={() => setSelectedPaciente(p)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{p.nome}</span>
                      <span className="text-[#8C9A84]">{p.cpf}</span>
                    </div>
                  </SelectRow>
                ))
              )}
            </div>
          </div>
        )}

        {/* passo 2: serviço médico */}
        {passo === 2 && (
          <div className="space-y-3">
            <Input
              placeholder="Buscar por serviço ou médico…"
              value={buscaServico}
              onChange={(e) => setBuscaServico(e.target.value)}
            />
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {servicosFiltrados.length === 0 ? (
                <p className="py-6 text-center font-sans text-sm text-[#8C9A84]">
                  Nenhum serviço encontrado
                </p>
              ) : (
                servicosFiltrados.map((s) => {
                  const medico = medicosMap[s.medicoId]
                  return (
                    <SelectRow
                      key={s.id}
                      selected={selectedServico?.id === s.id}
                      onClick={() => setSelectedServico(s)}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{s.nome}</span>
                          <span className="text-[#8C9A84]">
                            R$ {Number(s.preco).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-3 text-xs text-[#8C9A84]">
                          {medico && <span>{medico.nome}</span>}
                          {s.duracaoMinutos && <span>{s.duracaoMinutos} min</span>}
                        </div>
                      </div>
                    </SelectRow>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* passo 3: tipo + estabelecimento */}
        {passo === 3 && (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-[#8C9A84] font-sans">
                Tipo de atendimento
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(['PRESENCIAL', 'DOMICILIAR', 'TELEMEDICINA'] as TipoAgendamento[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setSelectedTipo(t)
                      setSelectedEstabelecimento(null)
                    }}
                    className={[
                      'rounded-2xl border px-3 py-2.5 text-xs font-sans font-medium transition-all duration-200',
                      selectedTipo === t
                        ? 'border-[#8C9A84] bg-[#8C9A84]/10 text-[#2D3A31]'
                        : 'border-[#E6E2DA] bg-[#F2F0EB] hover:border-[#8C9A84]/50 hover:bg-white text-[#2D3A31]',
                    ].join(' ')}
                  >
                    {TIPO_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>

            {selectedTipo === 'DOMICILIAR' ? (
              <div className="rounded-2xl border border-[#E6E2DA] bg-[#F2F0EB] p-4 space-y-1">
                <p className="text-xs uppercase tracking-widest text-[#8C9A84] font-sans mb-2">
                  Endereço do paciente
                </p>
                {selectedPaciente?.logradouro ? (
                  <p className="font-sans text-sm text-[#2D3A31]">
                    {[
                      selectedPaciente.logradouro,
                      selectedPaciente.numero,
                      selectedPaciente.complemento,
                      selectedPaciente.bairro,
                      selectedPaciente.cidade && selectedPaciente.uf
                        ? `${selectedPaciente.cidade}/${selectedPaciente.uf}`
                        : selectedPaciente.cidade ?? selectedPaciente.uf,
                    ].filter(Boolean).join(', ')}
                  </p>
                ) : (
                  <p className="font-sans text-sm text-[#8C9A84] italic">
                    Endereço não cadastrado para este paciente. Confirme o endereço antes do atendimento.
                  </p>
                )}
              </div>
            ) : (
              <div>
                <p className="mb-2 text-xs uppercase tracking-widest text-[#8C9A84] font-sans">
                  Estabelecimento
                </p>
                {loadingEstabelecimentos ? (
                  <p className="py-4 text-center font-sans text-sm text-[#8C9A84]">Carregando…</p>
                ) : estabelecimentos.length === 0 ? (
                  <p className="py-4 text-center font-sans text-sm text-[#8C9A84]">
                    Nenhum estabelecimento encontrado para este médico
                  </p>
                ) : (
                  <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                    {estabelecimentos.map((e) => (
                      <SelectRow
                        key={e.id}
                        selected={selectedEstabelecimento?.id === e.id}
                        onClick={() => setSelectedEstabelecimento(e)}
                      >
                        <div>
                          <p className="font-medium">{e.nome}</p>
                          <p className="mt-0.5 text-xs text-[#8C9A84]">
                            {e.logradouro}, {e.numero} — {e.cidade}/{e.uf}
                          </p>
                        </div>
                      </SelectRow>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* passo 4: data e horário */}
        {passo === 4 && (
          <div className="space-y-4">
            <Input
              label="Data da consulta"
              type="date"
              value={dataSelecionada}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDataSelecionada(e.target.value)}
            />
            {dataSelecionada && (
              <div>
                <p className="mb-2 text-xs uppercase tracking-widest text-[#8C9A84] font-sans">
                  Horários disponíveis
                </p>
                {loadingSlots ? (
                  <p className="py-4 text-center font-sans text-sm text-[#8C9A84]">
                    Carregando horários…
                  </p>
                ) : slots.length === 0 ? (
                  <p className="py-4 text-center font-sans text-sm text-[#8C9A84]">
                    Sem horários disponíveis nesta data
                  </p>
                ) : (
                  <div className="grid max-h-52 grid-cols-3 gap-2 overflow-y-auto pr-1">
                    {slots.map((slot) => (
                      <button
                        key={slot.dataHoraInicio}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={[
                          'rounded-2xl border px-3 py-2 text-sm font-sans transition-all duration-200 flex items-center justify-center gap-1',
                          selectedSlot?.dataHoraInicio === slot.dataHoraInicio
                            ? 'border-[#8C9A84] bg-[#8C9A84]/10 text-[#2D3A31] font-medium'
                            : 'border-[#E6E2DA] bg-[#F2F0EB] hover:border-[#8C9A84]/50 hover:bg-white text-[#2D3A31]',
                        ].join(' ')}
                      >
                        <Clock size={12} strokeWidth={1.5} className="text-[#8C9A84]" />
                        {formatDateInput(slot.dataHoraInicio)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* passo 5: confirmação */}
        {passo === 5 && selectedPaciente && selectedServico && selectedSlot && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#E6E2DA] bg-[#F2F0EB] p-4 space-y-3">
              <Row icon={<User size={14} strokeWidth={1.5} />} label="Paciente">
                {selectedPaciente.nome}
              </Row>
              <Row icon={<Stethoscope size={14} strokeWidth={1.5} />} label="Serviço">
                {selectedServico.nome}
                {medicosMap[selectedServico.medicoId] && (
                  <span className="ml-2 text-[#8C9A84]">
                    • {medicosMap[selectedServico.medicoId].nome}
                  </span>
                )}
              </Row>
              <Row icon={selectedTipo === 'DOMICILIAR' ? <Home size={14} strokeWidth={1.5} /> : <Building2 size={14} strokeWidth={1.5} />} label="Tipo / Local">
                {selectedTipo === 'DOMICILIAR'
                  ? `Domiciliar — ${selectedPaciente.cidade ?? 'endereço do paciente'}`
                  : selectedEstabelecimento?.nome ?? '—'
                }
              </Row>
              <Row icon={<CalendarDays size={14} strokeWidth={1.5} />} label="Data e hora">
                {formatDateTime(selectedSlot.dataHoraInicio)} — {formatDateInput(selectedSlot.dataHoraFim)}
              </Row>
              <Row icon={<Clock size={14} strokeWidth={1.5} />} label="Duração">
                {selectedSlot.duracaoMinutos} minutos
              </Row>
              <Row icon={<CreditCard size={14} strokeWidth={1.5} />} label="Valor total">
                {(() => {
                  const base = selectedServico.preco ?? 0
                  const taxa = selectedTipo === 'DOMICILIAR' ? (selectedServico.taxaDeslocamento ?? 0) : 0
                  return taxa > 0
                    ? `${formatBRL(base + taxa)} (serviço ${formatBRL(base)} + deslocamento ${formatBRL(taxa)})`
                    : formatBRL(base)
                })()}
              </Row>
            </div>
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8C9A84] font-sans">
                Observações (opcional)
              </label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-[#E6E2DA] bg-[#F2F0EB] px-4 py-3 text-sm font-sans text-[#2D3A31] outline-none transition-all duration-300 placeholder:text-[#8C9A84]/60 focus:border-[#8C9A84] focus:bg-white resize-none"
                placeholder="Informações adicionais para o médico…"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ─── modal a caminho ─────────────────────────────────────────────── */}
      <Modal
        open={aCaminhoItem !== null}
        onClose={() => setACaminhoItem(null)}
        title="Compartilhar Localização"
        footer={
          <>
            <Button variant="secondary" onClick={() => setACaminhoItem(null)} disabled={salvandoACaminho}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              disabled={salvandoACaminho || !linkLocalizacao.trim()}
              onClick={async () => {
                if (!aCaminhoItem) return
                setSalvandoACaminho(true)
                try {
                  await atualizarStatus(aCaminhoItem.id, 'A_CAMINHO', linkLocalizacao.trim())
                  setACaminhoItem(null)
                } catch (err) {
                  alert((err as Error).message)
                } finally {
                  setSalvandoACaminho(false)
                }
              }}
            >
              <Truck size={14} strokeWidth={1.5} />
              {salvandoACaminho ? 'Confirmando…' : 'Confirmar partida'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-[#E6E2DA] bg-[#F2F0EB] p-4 space-y-3">
            {[
              { n: 1, text: 'Abra o Google Maps no seu celular' },
              { n: 2, text: 'Toque no seu foto de perfil → "Compartilhar localização em tempo real"' },
              { n: 3, text: 'Defina a duração desejada (ex: 2 horas)' },
              { n: 4, text: 'Toque em "Copiar link" e cole abaixo' },
            ].map(({ n, text }) => (
              <div key={n} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#8C9A84]/20 font-sans text-xs font-semibold text-[#8C9A84]">
                  {n}
                </span>
                <span className="font-sans text-sm text-[#2D3A31]/80 pt-0.5">{text}</span>
              </div>
            ))}
          </div>
          <a
            href="https://maps.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#8C9A84] bg-[#8C9A84]/10 px-4 py-3 font-sans text-sm font-medium text-[#2D3A31] transition-all duration-200 hover:bg-[#8C9A84]/20"
          >
            <MapPin size={15} strokeWidth={1.5} />
            Abrir Google Maps
          </a>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8C9A84] font-sans">
              Link de localização em tempo real
            </label>
            <input
              type="url"
              value={linkLocalizacao}
              onChange={(e) => setLinkLocalizacao(e.target.value)}
              placeholder="https://maps.app.goo.gl/..."
              className="w-full rounded-2xl border border-[#E6E2DA] bg-[#F2F0EB] px-4 py-3 text-sm font-sans text-[#2D3A31] outline-none transition-all duration-300 placeholder:text-[#8C9A84]/60 focus:border-[#8C9A84] focus:bg-white"
            />
          </div>
        </div>
      </Modal>

      {/* ─── modal cancelar ───────────────────────────────────────────────── */}
      <Modal
        open={cancelandoItem !== null}
        onClose={() => setCancelandoItem(null)}
        title="Cancelar Agendamento"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelandoItem(null)} disabled={cancelando}>
              Voltar
            </Button>
            <Button
              variant="danger"
              onClick={confirmarCancelamento}
              disabled={cancelando || !motivoCancelamento.trim()}
            >
              {cancelando ? 'Cancelando…' : 'Confirmar Cancelamento'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8C9A84] font-sans">
              Origem
            </label>
            <select
              value={origemCancelamento}
              onChange={(e) => setOrigemCancelamento(e.target.value as OrigemCancelamento)}
              className="w-full rounded-2xl border border-[#E6E2DA] bg-[#F2F0EB] px-4 py-3 text-sm font-sans text-[#2D3A31] outline-none focus:border-[#8C9A84] focus:bg-white"
            >
              <option value="PACIENTE">Paciente</option>
              <option value="MEDICO">Médico</option>
              <option value="ESTABELECIMENTO">Estabelecimento</option>
              <option value="SISTEMA">Sistema</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8C9A84] font-sans">
              Motivo
            </label>
            <textarea
              value={motivoCancelamento}
              onChange={(e) => setMotivoCancelamento(e.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-[#E6E2DA] bg-[#F2F0EB] px-4 py-3 text-sm font-sans text-[#2D3A31] outline-none transition-all duration-300 placeholder:text-[#8C9A84]/60 focus:border-[#8C9A84] focus:bg-white resize-none"
              placeholder="Informe o motivo do cancelamento…"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── row de sumário ───────────────────────────────────────────────────────────

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-[#8C9A84]">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-widest text-[#8C9A84] font-sans">{label}</p>
        <p className="mt-0.5 font-sans text-sm text-[#2D3A31]">{children}</p>
      </div>
    </div>
  )
}
