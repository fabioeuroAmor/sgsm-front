import { useEffect, useState } from 'react'
import { Plus, Search, Pencil, Trash2, UserRound, CalendarDays, Mail, Phone, MapPin } from 'lucide-react'
import { usePacientes } from '../hooks/usePacientes'
import type {
  PacienteResponse,
  CadastrarPacienteRequest,
  AtualizarPacienteRequest,
} from '../types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatCpf(cpf: string) {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11) return cpf
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function formatDate(iso: string) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function calcIdade(iso: string) {
  if (!iso) return null
  const hoje = new Date()
  const nasc = new Date(iso)
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const passou =
    hoje.getMonth() > nasc.getMonth() ||
    (hoje.getMonth() === nasc.getMonth() && hoje.getDate() >= nasc.getDate())
  if (!passou) idade--
  return idade
}

function stripCpf(cpf: string) {
  return cpf.replace(/\D/g, '')
}

// ─── form vazio ───────────────────────────────────────────────────────────────

const emptyForm: CadastrarPacienteRequest = {
  nome: '',
  cpf: '',
  dataNascimento: '',
  email: '',
  telefone: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  cep: '',
}

// ─── componente ───────────────────────────────────────────────────────────────

export function PacientesPage() {
  const { pacientes, loading, error, listar, cadastrar, atualizar, remover } =
    usePacientes()

  const [busca, setBusca] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState<boolean | undefined>(undefined)

  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<PacienteResponse | null>(null)
  const [form, setForm] = useState<CadastrarPacienteRequest>(emptyForm)
  const [cpfDisplay, setCpfDisplay] = useState('')
  const [cepBuscando, setCepBuscando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)

  // ─── detalhe ────────────────────────────────────────────────────────────────
  const [detalhe, setDetalhe] = useState<PacienteResponse | null>(null)

  useEffect(() => {
    listar({ ativo: filtroAtivo })
  }, [filtroAtivo, listar])

  const filtrados = pacientes.filter((p) => {
    const termo = busca.toLowerCase()
    return (
      p.nome.toLowerCase().includes(termo) ||
      p.cpf.replace(/\D/g, '').includes(busca.replace(/\D/g, '')) ||
      p.email.toLowerCase().includes(termo)
    )
  })

  // ─── modal cadastro / edição ─────────────────────────────────────────────────

  function abrirCadastro() {
    setEditando(null)
    setForm(emptyForm)
    setCpfDisplay('')
    setFormError(null)
    setModalAberto(true)
  }

  function abrirEdicao(p: PacienteResponse) {
    setEditando(p)
    setForm({
      nome: p.nome,
      cpf: p.cpf,
      dataNascimento: p.dataNascimento,
      email: p.email,
      telefone: p.telefone ?? '',
      logradouro: p.logradouro ?? '',
      numero: p.numero ?? '',
      complemento: p.complemento ?? '',
      bairro: p.bairro ?? '',
      cidade: p.cidade ?? '',
      uf: p.uf ?? '',
      cep: p.cep ?? '',
    })
    setCpfDisplay(formatCpf(p.cpf))
    setFormError(null)
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setEditando(null)
  }

  function handleCpfChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 11)
    let mask = digits
    if (digits.length > 9) mask = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
    else if (digits.length > 6) mask = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
    else if (digits.length > 3) mask = `${digits.slice(0, 3)}.${digits.slice(3)}`
    setCpfDisplay(mask)
    setForm((f) => ({ ...f, cpf: digits }))
  }

  async function buscarCep(cep: string) {
    const digits = cep.replace(/\D/g, '')
    if (digits.length !== 8) return
    setCepBuscando(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm((f) => ({
          ...f,
          logradouro: data.logradouro ?? f.logradouro,
          bairro: data.bairro ?? f.bairro,
          cidade: data.localidade ?? f.cidade,
          uf: data.uf ?? f.uf,
          cep: digits,
        }))
      }
    } catch {
      // ViaCEP offline — keep existing values
    } finally {
      setCepBuscando(false)
    }
  }

  async function salvar() {
    setSalvando(true)
    setFormError(null)
    try {
      if (editando) {
        const body: AtualizarPacienteRequest = {
          nome: form.nome || undefined,
          dataNascimento: form.dataNascimento || undefined,
          email: form.email || undefined,
          telefone: form.telefone || undefined,
          logradouro: form.logradouro || undefined,
          numero: form.numero || undefined,
          complemento: form.complemento || undefined,
          bairro: form.bairro || undefined,
          cidade: form.cidade || undefined,
          uf: form.uf || undefined,
          cep: form.cep || undefined,
        }
        await atualizar(editando.id, body)
      } else {
        await cadastrar({ ...form, cpf: stripCpf(form.cpf) })
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

  // ─── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="px-8 py-10">

      {/* cabeçalho */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8C9A84]">Cadastros</p>
          <h1 className="mt-1 font-serif text-4xl font-semibold text-[#2D3A31]">
            <em>Pacientes</em>
          </h1>
        </div>
        <Button onClick={abrirCadastro}>
          <Plus size={14} strokeWidth={1.5} />
          Novo Paciente
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
              placeholder="Buscar por nome, CPF ou e-mail…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-2xl bg-[#F2F0EB] py-2.5 pl-9 pr-4 text-sm font-sans text-[#2D3A31] border border-[#E6E2DA] outline-none transition-all duration-300 placeholder:text-[#8C9A84]/60 focus:border-[#8C9A84] focus:bg-white"
            />
          </div>

          <select
            value={filtroAtivo === undefined ? '' : String(filtroAtivo)}
            onChange={(e) =>
              setFiltroAtivo(
                e.target.value === '' ? undefined : e.target.value === 'true',
              )
            }
            className="rounded-2xl bg-[#F2F0EB] px-4 py-2.5 text-sm font-sans text-[#2D3A31] border border-[#E6E2DA] outline-none focus:border-[#8C9A84]"
          >
            <option value="">Todos os status</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
        </div>
      </Card>

      {/* erro de listagem */}
      {error && (
        <div className="mb-4 rounded-2xl border border-[#C27B66]/30 bg-[#C27B66]/10 px-4 py-3 text-sm text-[#C27B66]">
          {error}
        </div>
      )}

      {/* contador */}
      {!loading && filtrados.length > 0 && (
        <p className="mb-4 text-xs text-[#8C9A84]">
          {filtrados.length} paciente{filtrados.length !== 1 ? 's' : ''} encontrado{filtrados.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8C9A84] border-t-transparent" />
        </div>
      ) : filtrados.length === 0 ? (
        <EmptyState
          title="Nenhum paciente encontrado"
          description="Tente ajustar os filtros ou cadastre um novo paciente."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((p, i) => {
            const idade = calcIdade(p.dataNascimento)
            return (
              <Card
                key={p.id}
                hover
                className={i % 2 === 1 ? 'md:translate-y-3' : ''}
              >
                {/* topo do card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DCCFC2]/40">
                    <UserRound size={18} strokeWidth={1.5} className="text-[#8C9A84]" />
                  </div>
                  <Badge variant={p.ativo ? 'active' : 'inactive'}>
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>

                {/* nome */}
                <div className="mt-4">
                  <h3
                    className="cursor-pointer font-serif text-lg font-semibold text-[#2D3A31] hover:text-[#C27B66] transition-colors duration-300"
                    onClick={() => setDetalhe(p)}
                    title="Ver detalhes"
                  >
                    {p.nome}
                  </h3>
                  <p className="mt-0.5 text-xs font-mono tracking-wide text-[#8C9A84]">
                    {formatCpf(p.cpf)}
                  </p>
                </div>

                {/* dados */}
                <div className="mt-4 space-y-2 border-t border-[#E6E2DA] pt-4">
                  <div className="flex items-center gap-2 text-xs text-[#2D3A31]/70">
                    <CalendarDays size={12} strokeWidth={1.5} className="shrink-0 text-[#8C9A84]" />
                    <span>
                      {formatDate(p.dataNascimento)}
                      {idade !== null && (
                        <span className="ml-1 text-[#8C9A84]">({idade} anos)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#2D3A31]/70">
                    <Mail size={12} strokeWidth={1.5} className="shrink-0 text-[#8C9A84]" />
                    <span className="truncate">{p.email}</span>
                  </div>
                  {p.telefone && (
                    <div className="flex items-center gap-2 text-xs text-[#2D3A31]/70">
                      <Phone size={12} strokeWidth={1.5} className="shrink-0 text-[#8C9A84]" />
                      <span>{p.telefone}</span>
                    </div>
                  )}
                  {p.cidade && (
                    <div className="flex items-center gap-2 text-xs text-[#2D3A31]/70">
                      <MapPin size={12} strokeWidth={1.5} className="shrink-0 text-[#8C9A84]" />
                      <span>{p.cidade}{p.uf ? ` — ${p.uf}` : ''}</span>
                    </div>
                  )}
                </div>

                {/* ações */}
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => abrirEdicao(p)}
                    className="flex-1"
                  >
                    <Pencil size={12} strokeWidth={1.5} />
                    Editar
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setConfirmandoId(p.id)}
                    disabled={!p.ativo}
                    title={p.ativo ? 'Inativar paciente' : 'Paciente já inativo'}
                  >
                    <Trash2 size={12} strokeWidth={1.5} />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── modal cadastro / edição ─────────────────────────────────────────── */}
      <Modal
        open={modalAberto}
        onClose={fecharModal}
        title={editando ? 'Editar Paciente' : 'Novo Paciente'}
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
            placeholder="Maria da Silva"
          />

          <Input
            label="CPF"
            value={cpfDisplay}
            onChange={(e) => handleCpfChange(e.target.value)}
            placeholder="000.000.000-00"
            disabled={!!editando}
          />

          <Input
            label="Data de nascimento"
            type="date"
            value={form.dataNascimento}
            onChange={(e) =>
              setForm((f) => ({ ...f, dataNascimento: e.target.value }))
            }
          />

          <Input
            label="E-mail"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="maria@email.com"
          />

          <Input
            label="Telefone (opcional)"
            value={form.telefone ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
            placeholder="(11) 99999-0000"
          />

          <div className="border-t border-[#E6E2DA] pt-2">
            <p className="mb-3 text-xs uppercase tracking-widest text-[#8C9A84]">Endereço (opcional)</p>

            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  label="CEP"
                  value={form.cep ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, cep: e.target.value.replace(/\D/g, '').slice(0, 8) }))}
                  onBlur={(e) => buscarCep(e.target.value)}
                  placeholder="00000000"
                  maxLength={8}
                />
              </div>
              {cepBuscando && (
                <div className="mb-1 h-5 w-5 animate-spin rounded-full border-2 border-[#8C9A84] border-t-transparent" />
              )}
            </div>

            <Input
              label="Logradouro"
              value={form.logradouro ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, logradouro: e.target.value }))}
              placeholder="Rua das Flores"
            />

            <div className="flex gap-2 mt-4">
              <div className="w-24">
                <Input
                  label="Número"
                  value={form.numero ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
                  placeholder="123"
                />
              </div>
              <div className="flex-1">
                <Input
                  label="Complemento"
                  value={form.complemento ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, complemento: e.target.value }))}
                  placeholder="Apto 42"
                />
              </div>
            </div>

            <Input
              label="Bairro"
              value={form.bairro ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))}
              placeholder="Centro"
            />

            <div className="flex gap-2 mt-4">
              <div className="flex-1">
                <Input
                  label="Cidade"
                  value={form.cidade ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
                  placeholder="São Paulo"
                />
              </div>
              <div className="w-20">
                <Input
                  label="UF"
                  value={form.uf ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value.toUpperCase().slice(0, 2) }))}
                  placeholder="SP"
                  maxLength={2}
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── modal confirmação de inativação ────────────────────────────────── */}
      <Modal
        open={!!confirmandoId}
        onClose={() => setConfirmandoId(null)}
        title="Inativar Paciente"
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
          O paciente será <strong>inativado</strong> e não aparecerá nas listagens
          padrão. O histórico de atendimentos é preservado.
        </p>
      </Modal>

      {/* ── modal detalhe ───────────────────────────────────────────────────── */}
      <Modal
        open={!!detalhe}
        onClose={() => setDetalhe(null)}
        title="Detalhes do Paciente"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDetalhe(null)}>
              Fechar
            </Button>
            {detalhe && (
              <Button
                size="sm"
                onClick={() => {
                  setDetalhe(null)
                  abrirEdicao(detalhe)
                }}
              >
                <Pencil size={12} strokeWidth={1.5} />
                Editar
              </Button>
            )}
          </>
        }
      >
        {detalhe && (
          <div className="space-y-3">
            <Row label="Nome" value={detalhe.nome} />
            <Row label="CPF" value={formatCpf(detalhe.cpf)} mono />
            <Row
              label="Nascimento"
              value={`${formatDate(detalhe.dataNascimento)} — ${calcIdade(detalhe.dataNascimento)} anos`}
            />
            <Row label="E-mail" value={detalhe.email} />
            {detalhe.telefone && <Row label="Telefone" value={detalhe.telefone} />}
            <Row label="Status" value={detalhe.ativo ? 'Ativo' : 'Inativo'} />
            {(detalhe.logradouro || detalhe.cidade) && (
              <div className="border-t border-[#E6E2DA] pt-3 space-y-2">
                <p className="text-xs uppercase tracking-widest text-[#8C9A84]">Endereço</p>
                {detalhe.logradouro && (
                  <Row
                    label="Logradouro"
                    value={[detalhe.logradouro, detalhe.numero, detalhe.complemento].filter(Boolean).join(', ')}
                  />
                )}
                {detalhe.bairro && <Row label="Bairro" value={detalhe.bairro} />}
                {detalhe.cidade && (
                  <Row label="Cidade / UF" value={[detalhe.cidade, detalhe.uf].filter(Boolean).join(' — ')} />
                )}
                {detalhe.cep && <Row label="CEP" value={detalhe.cep} mono />}
              </div>
            )}
            <div className="border-t border-[#E6E2DA] pt-3 space-y-3">
              <Row
                label="Cadastrado em"
                value={new Date(detalhe.criadoEm).toLocaleString('pt-BR')}
              />
              <Row
                label="Atualizado em"
                value={new Date(detalhe.atualizadoEm).toLocaleString('pt-BR')}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ─── subcomponente de linha de detalhe ────────────────────────────────────────

function Row({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="shrink-0 text-xs uppercase tracking-widest text-[#8C9A84]">
        {label}
      </span>
      <span
        className={[
          'text-right text-sm text-[#2D3A31]',
          mono ? 'font-mono tracking-wide' : '',
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  )
}
