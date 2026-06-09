import { useEffect, useState } from 'react'
import { Plus, Search, Pencil, Trash2, Stethoscope, CalendarDays, X } from 'lucide-react'
import { useMedicos } from '../hooks/useMedicos'
import { agendaMedicoService } from '../services/agendaMedicoService'
import { agendamentoService } from '../services/agendamentoService'
import type {
  AgendaMedicoResponse,
  CadastrarAgendaMedicoRequest,
  DiaSemana,
  EstabelecimentoResponse,
  MedicoResponse,
  CadastrarMedicoRequest,
  AtualizarMedicoRequest,
} from '../types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'

const DIAS: { value: DiaSemana; label: string }[] = [
  { value: 'SEGUNDA', label: 'Segunda-feira' },
  { value: 'TERCA',   label: 'Terça-feira' },
  { value: 'QUARTA',  label: 'Quarta-feira' },
  { value: 'QUINTA',  label: 'Quinta-feira' },
  { value: 'SEXTA',   label: 'Sexta-feira' },
  { value: 'SABADO',  label: 'Sábado' },
  { value: 'DOMINGO', label: 'Domingo' },
]

const DURACOES = [15, 20, 30, 45, 60]

const emptyAgendaForm: Omit<CadastrarAgendaMedicoRequest, 'medicoId'> = {
  estabelecimentoId: '',
  diaSemana: 'SEGUNDA',
  horaInicio: '08:00',
  horaFim: '18:00',
  duracaoSlotMinutos: 30,
  dataVigenciaInicio: new Date().toISOString().slice(0, 10),
  dataVigenciaFim: undefined,
  domiciliar: false,
  intervaloDeslocamentoMinutos: undefined,
  raioKm: undefined,
  cidadeAtendimento: '',
  ufAtendimento: '',
}

const ESPECIALIDADES = [
  'Cardiologia', 'Dermatologia', 'Endocrinologia', 'Ginecologia',
  'Neurologia', 'Oftalmologia', 'Ortopedia', 'Pediatria',
  'Psiquiatria', 'Urologia',
]

const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA',
  'MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN',
  'RO','RR','RS','SC','SE','SP','TO',
]

const emptyForm: CadastrarMedicoRequest = {
  nome: '', crm: '', crmUf: 'SP', especialidade: '', email: '', telefone: '',
}

export function MedicosPage() {
  const { medicos, loading, error, listar, cadastrar, atualizar, remover } = useMedicos()

  const [busca, setBusca] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState<boolean | undefined>(undefined)
  const [filtroEsp, setFiltroEsp] = useState('')

  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<MedicoResponse | null>(null)
  const [form, setForm] = useState<CadastrarMedicoRequest>(emptyForm)
  const [salvando, setSalvando] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)

  // ─── modal agenda ──────────────────────────────────────────────────────────
  const [agendaMedico, setAgendaMedico] = useState<MedicoResponse | null>(null)
  const [agendas, setAgendas] = useState<AgendaMedicoResponse[]>([])
  const [estabsDoMedico, setEstabsDoMedico] = useState<EstabelecimentoResponse[]>([])
  const [loadingAgenda, setLoadingAgenda] = useState(false)
  const [agendaForm, setAgendaForm] = useState(emptyAgendaForm)
  const [salvandoAgenda, setSalvandoAgenda] = useState(false)
  const [erroAgenda, setErroAgenda] = useState<string | null>(null)
  const [mostrarFormAgenda, setMostrarFormAgenda] = useState(false)

  useEffect(() => {
    listar({
      ativo: filtroAtivo,
      especialidade: filtroEsp || undefined,
    })
  }, [filtroAtivo, filtroEsp, listar])

  const medicosFiltrados = medicos.filter((m) =>
    m.nome.toLowerCase().includes(busca.toLowerCase()) ||
    m.crm.toLowerCase().includes(busca.toLowerCase()) ||
    m.email.toLowerCase().includes(busca.toLowerCase()),
  )

  function abrirCadastro() {
    setEditando(null)
    setForm(emptyForm)
    setFormError(null)
    setModalAberto(true)
  }

  function abrirEdicao(m: MedicoResponse) {
    setEditando(m)
    setForm({
      nome: m.nome, crm: m.crm, crmUf: m.crmUf,
      especialidade: m.especialidade, email: m.email, telefone: m.telefone ?? '',
    })
    setFormError(null)
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setEditando(null)
  }

  async function salvar() {
    setSalvando(true)
    setFormError(null)
    try {
      if (editando) {
        const body: AtualizarMedicoRequest = {
          nome: form.nome || undefined,
          especialidade: form.especialidade || undefined,
          email: form.email || undefined,
          telefone: form.telefone || undefined,
        }
        await atualizar(editando.id, body)
      } else {
        await cadastrar(form)
      }
      fecharModal()
    } catch (err) {
      setFormError((err as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  async function confirmarRemover(id: string) {
    try {
      await remover(id)
    } finally {
      setConfirmandoId(null)
    }
  }

  async function abrirAgenda(m: MedicoResponse) {
    setAgendaMedico(m)
    setMostrarFormAgenda(false)
    setErroAgenda(null)
    setLoadingAgenda(true)
    try {
      const [lista, estabs] = await Promise.all([
        agendaMedicoService.listar(m.id),
        agendamentoService.getEstabelecimentosByMedico(m.id),
      ])
      setAgendas(lista)
      setEstabsDoMedico(estabs)
      setAgendaForm({
        ...emptyAgendaForm,
        estabelecimentoId: estabs[0]?.id ?? '',
      })
    } catch (err) {
      setErroAgenda((err as Error).message)
    } finally {
      setLoadingAgenda(false)
    }
  }

  async function salvarAgenda() {
    if (!agendaMedico) return
    setSalvandoAgenda(true)
    setErroAgenda(null)
    try {
      const payload: CadastrarAgendaMedicoRequest = {
        ...agendaForm,
        medicoId: agendaMedico.id,
        estabelecimentoId: agendaForm.domiciliar ? undefined : (agendaForm.estabelecimentoId || undefined),
        dataVigenciaFim: agendaForm.dataVigenciaFim || undefined,
        intervaloDeslocamentoMinutos: agendaForm.intervaloDeslocamentoMinutos || undefined,
        raioKm: agendaForm.raioKm || undefined,
        cidadeAtendimento: agendaForm.cidadeAtendimento || undefined,
        ufAtendimento: agendaForm.ufAtendimento || undefined,
      }
      const nova = await agendaMedicoService.cadastrar(payload)
      setAgendas((prev) => [...prev, nova])
      setMostrarFormAgenda(false)
      setAgendaForm({ ...emptyAgendaForm, estabelecimentoId: estabsDoMedico[0]?.id ?? '' })
    } catch (err) {
      setErroAgenda((err as Error).message)
    } finally {
      setSalvandoAgenda(false)
    }
  }

  async function removerAgenda(id: string) {
    try {
      await agendaMedicoService.remover(id)
      setAgendas((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      setErroAgenda((err as Error).message)
    }
  }

  return (
    <div className="px-8 py-10">
      {/* header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8C9A84]">
            Cadastros
          </p>
          <h1 className="mt-1 font-serif text-4xl font-semibold text-[#2D3A31]">
            <em>Médicos</em>
          </h1>
        </div>
        <Button onClick={abrirCadastro}>
          <Plus size={14} strokeWidth={1.5} />
          Novo Médico
        </Button>
      </div>

      {/* filtros */}
      <Card className="mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-48">
            <Search
              size={14}
              strokeWidth={1.5}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C9A84]"
            />
            <input
              type="text"
              placeholder="Buscar por nome, CRM ou e-mail…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-2xl bg-[#F2F0EB] py-2.5 pl-9 pr-4 text-sm font-sans text-[#2D3A31] border border-[#E6E2DA] outline-none transition-all duration-300 placeholder:text-[#8C9A84]/60 focus:border-[#8C9A84] focus:bg-white"
            />
          </div>

          <select
            value={filtroAtivo === undefined ? '' : String(filtroAtivo)}
            onChange={(e) =>
              setFiltroAtivo(e.target.value === '' ? undefined : e.target.value === 'true')
            }
            className="rounded-2xl bg-[#F2F0EB] px-4 py-2.5 text-sm font-sans text-[#2D3A31] border border-[#E6E2DA] outline-none focus:border-[#8C9A84]"
          >
            <option value="">Todos os status</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>

          <select
            value={filtroEsp}
            onChange={(e) => setFiltroEsp(e.target.value)}
            className="rounded-2xl bg-[#F2F0EB] px-4 py-2.5 text-sm font-sans text-[#2D3A31] border border-[#E6E2DA] outline-none focus:border-[#8C9A84]"
          >
            <option value="">Todas as especialidades</option>
            {ESPECIALIDADES.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* erro de listagem */}
      {error && (
        <div className="mb-4 rounded-2xl border border-[#C27B66]/30 bg-[#C27B66]/10 px-4 py-3 text-sm text-[#C27B66]">
          {error}
        </div>
      )}

      {/* lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8C9A84] border-t-transparent" />
        </div>
      ) : medicosFiltrados.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {medicosFiltrados.map((m, i) => (
            <Card
              key={m.id}
              hover
              className={i % 2 === 1 ? 'md:translate-y-3' : ''}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DCCFC2]/40">
                  <Stethoscope size={18} strokeWidth={1.5} className="text-[#8C9A84]" />
                </div>
                <Badge variant={m.ativo ? 'active' : 'inactive'}>
                  {m.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>

              <div className="mt-4">
                <h3 className="font-serif text-lg font-semibold text-[#2D3A31]">
                  {m.nome}
                </h3>
                <p className="mt-0.5 text-xs uppercase tracking-widest text-[#8C9A84]">
                  {m.especialidade}
                </p>
              </div>

              <div className="mt-4 space-y-1.5 border-t border-[#E6E2DA] pt-4">
                <p className="text-xs text-[#2D3A31]/70">
                  <span className="font-medium">CRM:</span> {m.crm}/{m.crmUf}
                </p>
                <p className="text-xs text-[#2D3A31]/70 truncate">
                  <span className="font-medium">E-mail:</span> {m.email}
                </p>
                {m.telefone && (
                  <p className="text-xs text-[#2D3A31]/70">
                    <span className="font-medium">Tel:</span> {m.telefone}
                  </p>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => abrirEdicao(m)}
                  className="flex-1"
                >
                  <Pencil size={12} strokeWidth={1.5} />
                  Editar
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => abrirAgenda(m)}
                  title="Gerenciar agenda de horários"
                >
                  <CalendarDays size={12} strokeWidth={1.5} />
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setConfirmandoId(m.id)}
                  disabled={!m.ativo}
                >
                  <Trash2 size={12} strokeWidth={1.5} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* modal cadastro/edição */}
      <Modal
        open={modalAberto}
        onClose={fecharModal}
        title={editando ? 'Editar Médico' : 'Novo Médico'}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={fecharModal}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando} size="sm">
              {salvando ? 'Salvando…' : 'Salvar'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {formError && (
            <div className="rounded-xl border border-[#C27B66]/30 bg-[#C27B66]/10 px-3 py-2 text-xs text-[#C27B66]">
              {formError}
            </div>
          )}

          <Input
            label="Nome completo"
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            placeholder="Dr. João Silva"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="CRM"
              value={form.crm}
              onChange={(e) => setForm((f) => ({ ...f, crm: e.target.value }))}
              placeholder="123456"
              disabled={!!editando}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-widest text-[#8C9A84] font-sans">
                UF do CRM
              </label>
              <select
                value={form.crmUf}
                onChange={(e) => setForm((f) => ({ ...f, crmUf: e.target.value }))}
                disabled={!!editando}
                className="w-full rounded-2xl bg-[#F2F0EB] px-4 py-3 text-sm font-sans text-[#2D3A31] border border-[#E6E2DA] outline-none focus:border-[#8C9A84] disabled:opacity-40"
              >
                {UFS.map((uf) => <option key={uf}>{uf}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-widest text-[#8C9A84] font-sans">
              Especialidade
            </label>
            <select
              value={form.especialidade}
              onChange={(e) => setForm((f) => ({ ...f, especialidade: e.target.value }))}
              className="w-full rounded-2xl bg-[#F2F0EB] px-4 py-3 text-sm font-sans text-[#2D3A31] border border-[#E6E2DA] outline-none focus:border-[#8C9A84]"
            >
              <option value="">Selecione…</option>
              {ESPECIALIDADES.map((e) => <option key={e}>{e}</option>)}
            </select>
          </div>

          <Input
            label="E-mail"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="joao@clinica.com"
          />

          <Input
            label="Telefone (opcional)"
            value={form.telefone ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
            placeholder="(11) 99999-0000"
          />
        </div>
      </Modal>

      {/* modal agenda */}
      <Modal
        open={agendaMedico !== null}
        onClose={() => setAgendaMedico(null)}
        title={`Agenda — ${agendaMedico?.nome ?? ''}`}
        footer={
          mostrarFormAgenda ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => { setMostrarFormAgenda(false); setErroAgenda(null) }}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={salvarAgenda}
                disabled={salvandoAgenda || (!agendaForm.domiciliar && !agendaForm.estabelecimentoId)}
              >
                {salvandoAgenda ? 'Salvando…' : 'Salvar Horário'}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => { setMostrarFormAgenda(true); setErroAgenda(null) }}>
              <Plus size={13} strokeWidth={1.5} />
              Adicionar Horário
            </Button>
          )
        }
      >
        {erroAgenda && (
          <div className="mb-3 rounded-xl border border-[#C27B66]/30 bg-[#C27B66]/10 px-3 py-2 text-xs text-[#C27B66]">
            {erroAgenda}
          </div>
        )}

        {loadingAgenda ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#8C9A84] border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* lista de agendas */}
            {agendas.length === 0 && !mostrarFormAgenda ? (
              <p className="py-4 text-center font-sans text-sm text-[#8C9A84]">
                Nenhum horário cadastrado. Clique em "Adicionar Horário".
              </p>
            ) : (
              <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                {agendas.map((a) => (
                  <div
                    key={a.id}
                    className={[
                      'flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 font-sans text-sm',
                      a.ativo ? 'border-[#E6E2DA] bg-[#F2F0EB]' : 'border-[#E6E2DA] bg-[#F2F0EB] opacity-50',
                    ].join(' ')}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[#2D3A31] truncate">
                        {DIAS.find((d) => d.value === a.diaSemana)?.label}
                        {' · '}
                        {a.horaInicio}–{a.horaFim}
                        {' · '}
                        {a.duracaoSlotMinutos} min
                      </p>
                      <p className="text-xs text-[#8C9A84] truncate">
                        {a.domiciliar
                          ? `Domiciliar${a.cidadeAtendimento ? ` · ${a.cidadeAtendimento}${a.ufAtendimento ? `/${a.ufAtendimento}` : ''}` : ''}${a.raioKm ? ` · raio ${a.raioKm} km` : ''}`
                          : (a.estabelecimentoNome ?? a.estabelecimentoId ?? '—')
                        }
                        {' · desde '}
                        {a.dataVigenciaInicio}
                        {a.dataVigenciaFim ? ` até ${a.dataVigenciaFim}` : ''}
                      </p>
                    </div>
                    {a.ativo && (
                      <button
                        onClick={() => removerAgenda(a.id)}
                        className="shrink-0 text-[#8C9A84] transition-colors hover:text-[#C27B66]"
                        title="Inativar"
                      >
                        <X size={14} strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* formulário de novo horário */}
            {mostrarFormAgenda && (
              <div className="space-y-3 border-t border-[#E6E2DA] pt-4">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div
                    onClick={() => setAgendaForm((f) => ({ ...f, domiciliar: !f.domiciliar }))}
                    className={[
                      'relative h-6 w-11 rounded-full transition-colors duration-300',
                      agendaForm.domiciliar ? 'bg-[#8C9A84]' : 'bg-[#E6E2DA]',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300',
                        agendaForm.domiciliar ? 'translate-x-5' : 'translate-x-0.5',
                      ].join(' ')}
                    />
                  </div>
                  <span className="text-sm text-[#2D3A31]">Atendimento domiciliar</span>
                </label>

                {agendaForm.domiciliar ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Cidade de atendimento"
                        value={agendaForm.cidadeAtendimento ?? ''}
                        onChange={(e) => setAgendaForm((f) => ({ ...f, cidadeAtendimento: e.target.value }))}
                        placeholder="São Paulo"
                      />
                      <Input
                        label="UF"
                        value={agendaForm.ufAtendimento ?? ''}
                        onChange={(e) => setAgendaForm((f) => ({ ...f, ufAtendimento: e.target.value.toUpperCase().slice(0, 2) }))}
                        placeholder="SP"
                        maxLength={2}
                      />
                    </div>
                    <Input
                      label="Raio de atendimento (km)"
                      type="number"
                      min={0}
                      step={0.5}
                      value={agendaForm.raioKm ?? ''}
                      onChange={(e) => setAgendaForm((f) => ({ ...f, raioKm: e.target.value ? Number(e.target.value) : undefined }))}
                      placeholder="20"
                    />
                    <Input
                      label="Intervalo entre atendimentos (min)"
                      type="number"
                      min={0}
                      value={agendaForm.intervaloDeslocamentoMinutos ?? ''}
                      onChange={(e) => setAgendaForm((f) => ({ ...f, intervaloDeslocamentoMinutos: e.target.value ? Number(e.target.value) : undefined }))}
                      placeholder="30"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs uppercase tracking-widest text-[#8C9A84] font-sans">Estabelecimento</label>
                    <select
                      value={agendaForm.estabelecimentoId}
                      onChange={(e) => setAgendaForm((f) => ({ ...f, estabelecimentoId: e.target.value }))}
                      className="w-full rounded-2xl border border-[#E6E2DA] bg-[#F2F0EB] px-4 py-3 text-sm font-sans text-[#2D3A31] outline-none focus:border-[#8C9A84]"
                    >
                      <option value="">Selecione…</option>
                      {estabsDoMedico.map((e) => (
                        <option key={e.id} value={e.id}>{e.nome}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs uppercase tracking-widest text-[#8C9A84] font-sans">Dia da semana</label>
                    <select
                      value={agendaForm.diaSemana}
                      onChange={(e) => setAgendaForm((f) => ({ ...f, diaSemana: e.target.value as DiaSemana }))}
                      className="w-full rounded-2xl border border-[#E6E2DA] bg-[#F2F0EB] px-4 py-3 text-sm font-sans text-[#2D3A31] outline-none focus:border-[#8C9A84]"
                    >
                      {DIAS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs uppercase tracking-widest text-[#8C9A84] font-sans">Duração do slot</label>
                    <select
                      value={agendaForm.duracaoSlotMinutos}
                      onChange={(e) => setAgendaForm((f) => ({ ...f, duracaoSlotMinutos: Number(e.target.value) }))}
                      className="w-full rounded-2xl border border-[#E6E2DA] bg-[#F2F0EB] px-4 py-3 text-sm font-sans text-[#2D3A31] outline-none focus:border-[#8C9A84]"
                    >
                      {DURACOES.map((d) => <option key={d} value={d}>{d} min</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Hora início"
                    type="time"
                    value={agendaForm.horaInicio}
                    onChange={(e) => setAgendaForm((f) => ({ ...f, horaInicio: e.target.value }))}
                  />
                  <Input
                    label="Hora fim"
                    type="time"
                    value={agendaForm.horaFim}
                    onChange={(e) => setAgendaForm((f) => ({ ...f, horaFim: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Vigência início"
                    type="date"
                    value={agendaForm.dataVigenciaInicio}
                    onChange={(e) => setAgendaForm((f) => ({ ...f, dataVigenciaInicio: e.target.value }))}
                  />
                  <Input
                    label="Vigência fim (opcional)"
                    type="date"
                    value={agendaForm.dataVigenciaFim ?? ''}
                    onChange={(e) => setAgendaForm((f) => ({ ...f, dataVigenciaFim: e.target.value || undefined }))}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* modal confirmação de remoção */}
      <Modal
        open={!!confirmandoId}
        onClose={() => setConfirmandoId(null)}
        title="Inativar Médico"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmandoId(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => confirmandoId && confirmarRemover(confirmandoId)}
            >
              Inativar
            </Button>
          </>
        }
      >
        <p className="text-sm text-[#2D3A31]/70">
          O médico será <strong>inativado</strong> e não aparecerá nas listagens
          padrão. Esta ação pode ser revertida por um administrador.
        </p>
      </Modal>
    </div>
  )
}
