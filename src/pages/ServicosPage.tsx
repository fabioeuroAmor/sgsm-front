import { useEffect, useState } from 'react'
import { Plus, Search, Pencil, Trash2, ClipboardList } from 'lucide-react'
import { useServicos } from '../hooks/useServicos'
import { medicoService } from '../services/medicoService'
import type {
  ServicoMedicoResponse,
  MedicoResponse,
  CadastrarServicoMedicoRequest,
  AtualizarServicoMedicoRequest,
} from '../types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'

const emptyForm: CadastrarServicoMedicoRequest = {
  medicoId: '', nome: '', descricao: '', preco: 0, duracaoMinutos: undefined,
  domiciliar: false, taxaDeslocamento: undefined,
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export function ServicosPage() {
  const { servicos, loading, error, listar, cadastrar, atualizar, remover } = useServicos()
  const [medicos, setMedicos] = useState<MedicoResponse[]>([])

  const [busca, setBusca] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState<boolean | undefined>(undefined)
  const [filtroMedicoId, setFiltroMedicoId] = useState('')

  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<ServicoMedicoResponse | null>(null)
  const [form, setForm] = useState<CadastrarServicoMedicoRequest>(emptyForm)
  const [salvando, setSalvando] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)

  useEffect(() => {
    medicoService.listar({ ativo: true }).then(setMedicos).catch(() => {})
  }, [])

  useEffect(() => {
    listar({
      ativo: filtroAtivo,
      medicoId: filtroMedicoId || undefined,
    })
  }, [filtroAtivo, filtroMedicoId, listar])

  const filtrados = servicos.filter((s) =>
    s.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (s.descricao ?? '').toLowerCase().includes(busca.toLowerCase()),
  )

  function nomeMedico(id: string) {
    return medicos.find((m) => m.id === id)?.nome ?? id.slice(0, 8) + '…'
  }

  function abrirCadastro() {
    setEditando(null)
    setForm(emptyForm)
    setFormError(null)
    setModalAberto(true)
  }

  function abrirEdicao(s: ServicoMedicoResponse) {
    setEditando(s)
    setForm({
      medicoId: s.medicoId,
      nome: s.nome,
      descricao: s.descricao ?? '',
      preco: s.preco,
      duracaoMinutos: s.duracaoMinutos,
      domiciliar: s.domiciliar ?? false,
      taxaDeslocamento: s.taxaDeslocamento,
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
        const body: AtualizarServicoMedicoRequest = {
          nome: form.nome || undefined,
          descricao: form.descricao || undefined,
          preco: form.preco || undefined,
          duracaoMinutos: form.duracaoMinutos || undefined,
          domiciliar: form.domiciliar,
          taxaDeslocamento: form.taxaDeslocamento || undefined,
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

  return (
    <div className="px-8 py-10">
      {/* header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8C9A84]">Cadastros</p>
          <h1 className="mt-1 font-serif text-4xl font-semibold text-[#2D3A31]">
            <em>Serviços Médicos</em>
          </h1>
        </div>
        <Button onClick={abrirCadastro}>
          <Plus size={14} strokeWidth={1.5} />
          Novo Serviço
        </Button>
      </div>

      {/* filtros */}
      <Card className="mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-48">
            <Search size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C9A84]" />
            <input
              type="text"
              placeholder="Buscar por nome ou descrição…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-2xl bg-[#F2F0EB] py-2.5 pl-9 pr-4 text-sm font-sans text-[#2D3A31] border border-[#E6E2DA] outline-none transition-all duration-300 placeholder:text-[#8C9A84]/60 focus:border-[#8C9A84] focus:bg-white"
            />
          </div>

          <select
            value={filtroAtivo === undefined ? '' : String(filtroAtivo)}
            onChange={(e) => setFiltroAtivo(e.target.value === '' ? undefined : e.target.value === 'true')}
            className="rounded-2xl bg-[#F2F0EB] px-4 py-2.5 text-sm font-sans text-[#2D3A31] border border-[#E6E2DA] outline-none focus:border-[#8C9A84]"
          >
            <option value="">Todos os status</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>

          <select
            value={filtroMedicoId}
            onChange={(e) => setFiltroMedicoId(e.target.value)}
            className="rounded-2xl bg-[#F2F0EB] px-4 py-2.5 text-sm font-sans text-[#2D3A31] border border-[#E6E2DA] outline-none focus:border-[#8C9A84]"
          >
            <option value="">Todos os médicos</option>
            {medicos.map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
        </div>
      </Card>

      {error && (
        <div className="mb-4 rounded-2xl border border-[#C27B66]/30 bg-[#C27B66]/10 px-4 py-3 text-sm text-[#C27B66]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8C9A84] border-t-transparent" />
        </div>
      ) : filtrados.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((s, i) => (
            <Card key={s.id} hover className={i % 2 === 1 ? 'md:translate-y-3' : ''}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DCCFC2]/40">
                  <ClipboardList size={18} strokeWidth={1.5} className="text-[#8C9A84]" />
                </div>
                <Badge variant={s.ativo ? 'active' : 'inactive'}>
                  {s.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>

              <div className="mt-4">
                <h3 className="font-serif text-lg font-semibold text-[#2D3A31]">{s.nome}</h3>
                <p className="mt-0.5 text-xs uppercase tracking-widest text-[#8C9A84]">
                  {nomeMedico(s.medicoId)}
                </p>
              </div>

              {s.descricao && (
                <p className="mt-2 text-xs text-[#2D3A31]/60 line-clamp-2">{s.descricao}</p>
              )}

              <div className="mt-4 space-y-1.5 border-t border-[#E6E2DA] pt-4">
                <p className="text-sm font-medium text-[#2D3A31]">
                  {formatCurrency(s.preco)}
                </p>
                {s.duracaoMinutos && (
                  <p className="text-xs text-[#2D3A31]/70">
                    <span className="font-medium">Duração:</span> {s.duracaoMinutos} min
                  </p>
                )}
                {s.domiciliar && (
                  <p className="text-xs text-[#8C9A84]">
                    Domiciliar
                    {s.taxaDeslocamento != null && (
                      <span className="ml-1 text-[#2D3A31]/60">
                        + {formatCurrency(s.taxaDeslocamento)} deslocamento
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => abrirEdicao(s)} className="flex-1">
                  <Pencil size={12} strokeWidth={1.5} /> Editar
                </Button>
                <Button variant="danger" size="sm" onClick={() => setConfirmandoId(s.id)} disabled={!s.ativo}>
                  <Trash2 size={12} strokeWidth={1.5} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* modal */}
      <Modal
        open={modalAberto}
        onClose={fecharModal}
        title={editando ? 'Editar Serviço' : 'Novo Serviço Médico'}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={fecharModal}>Cancelar</Button>
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

          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-widest text-[#8C9A84] font-sans">
              Médico
            </label>
            <select
              value={form.medicoId}
              onChange={(e) => setForm((f) => ({ ...f, medicoId: e.target.value }))}
              disabled={!!editando}
              className="w-full rounded-2xl bg-[#F2F0EB] px-4 py-3 text-sm font-sans text-[#2D3A31] border border-[#E6E2DA] outline-none focus:border-[#8C9A84] disabled:opacity-40"
            >
              <option value="">Selecione o médico…</option>
              {medicos.map((m) => (
                <option key={m.id} value={m.id}>{m.nome} — {m.especialidade}</option>
              ))}
            </select>
          </div>

          <Input
            label="Nome do Serviço"
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            placeholder="Consulta de Rotina"
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-widest text-[#8C9A84] font-sans">
              Descrição (opcional)
            </label>
            <textarea
              value={form.descricao ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              placeholder="Descreva brevemente o serviço…"
              rows={3}
              className="w-full rounded-2xl bg-[#F2F0EB] px-4 py-3 text-sm font-sans text-[#2D3A31] border border-[#E6E2DA] outline-none resize-none transition-all duration-300 placeholder:text-[#8C9A84]/60 focus:border-[#8C9A84] focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Preço (R$)"
              type="number"
              min={0}
              step={0.01}
              value={form.preco}
              onChange={(e) => setForm((f) => ({ ...f, preco: Number(e.target.value) }))}
              placeholder="150.00"
            />
            <Input
              label="Duração (min)"
              type="number"
              min={0}
              value={form.duracaoMinutos ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  duracaoMinutos: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              placeholder="30"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setForm((f) => ({ ...f, domiciliar: !f.domiciliar }))}
              className={[
                'relative h-6 w-11 rounded-full transition-colors duration-300',
                form.domiciliar ? 'bg-[#8C9A84]' : 'bg-[#E6E2DA]',
              ].join(' ')}
            >
              <span
                className={[
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300',
                  form.domiciliar ? 'translate-x-5' : 'translate-x-0.5',
                ].join(' ')}
              />
            </div>
            <span className="text-sm text-[#2D3A31]">Atendimento domiciliar</span>
          </label>

          {form.domiciliar && (
            <Input
              label="Taxa de deslocamento (R$)"
              type="number"
              min={0}
              step={0.01}
              value={form.taxaDeslocamento ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  taxaDeslocamento: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              placeholder="50.00"
            />
          )}
        </div>
      </Modal>

      {/* confirmação */}
      <Modal
        open={!!confirmandoId}
        onClose={() => setConfirmandoId(null)}
        title="Inativar Serviço"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmandoId(null)}>Cancelar</Button>
            <Button variant="danger" size="sm" onClick={() => confirmandoId && confirmarRemover(confirmandoId)}>
              Inativar
            </Button>
          </>
        }
      >
        <p className="text-sm text-[#2D3A31]/70">
          O serviço será <strong>inativado</strong> e não aparecerá nas listagens padrão.
        </p>
      </Modal>
    </div>
  )
}
