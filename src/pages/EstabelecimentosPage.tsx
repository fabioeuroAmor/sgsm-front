import { useEffect, useState } from 'react'
import { Plus, Search, Pencil, Trash2, Building2, MapPin, Stethoscope } from 'lucide-react'
import { useEstabelecimentos } from '../hooks/useEstabelecimentos'
import { medicoService } from '../services/medicoService'
import { estabelecimentoService } from '../services/estabelecimentoService'
import type {
  EstabelecimentoResponse,
  CadastrarEstabelecimentoRequest,
  AtualizarEstabelecimentoRequest,
  MedicoResponse,
} from '../types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'

function buildMapsUrl(est: EstabelecimentoResponse): string {
  const partes = [
    est.logradouro,
    est.numero,
    est.complemento,
    est.bairro,
    est.cidade,
    est.uf,
    est.cep,
    'Brasil',
  ].filter(Boolean)
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(partes.join(', '))}`
}

const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA',
  'MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN',
  'RO','RR','RS','SC','SE','SP','TO',
]

const emptyForm: CadastrarEstabelecimentoRequest = {
  nome: '', cnpj: '', telefone: '', email: '',
  logradouro: '', numero: '', complemento: '',
  bairro: '', cidade: '', uf: 'SP', cep: '',
}

export function EstabelecimentosPage() {
  const { estabelecimentos, loading, error, listar, cadastrar, atualizar, remover } =
    useEstabelecimentos()

  const [busca, setBusca] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState<boolean | undefined>(undefined)
  const [filtroUf, setFiltroUf] = useState('')
  const [filtroCidade, setFiltroCidade] = useState('')

  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<EstabelecimentoResponse | null>(null)
  const [form, setForm] = useState<CadastrarEstabelecimentoRequest>(emptyForm)
  const [salvando, setSalvando] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)

  // ─── modal de médicos ──────────────────────────────────────────────────────
  const [modalMedicosEstab, setModalMedicosEstab] = useState<EstabelecimentoResponse | null>(null)
  const [todosMedicos, setTodosMedicos] = useState<MedicoResponse[]>([])
  const [medicosVinculados, setMedicosVinculados] = useState<Set<string>>(new Set())
  const [loadingMedicos, setLoadingMedicos] = useState(false)
  const [salvandoMedicos, setSalvandoMedicos] = useState(false)
  const [erroMedicos, setErroMedicos] = useState<string | null>(null)

  useEffect(() => {
    listar({
      ativo: filtroAtivo,
      uf: filtroUf || undefined,
      cidade: filtroCidade || undefined,
    })
  }, [filtroAtivo, filtroUf, filtroCidade, listar])

  const filtrados = estabelecimentos.filter((e) =>
    e.nome.toLowerCase().includes(busca.toLowerCase()) ||
    e.cnpj.includes(busca) ||
    e.cidade.toLowerCase().includes(busca.toLowerCase()),
  )

  function abrirCadastro() {
    setEditando(null)
    setForm(emptyForm)
    setFormError(null)
    setModalAberto(true)
  }

  function abrirEdicao(est: EstabelecimentoResponse) {
    setEditando(est)
    setForm({
      nome: est.nome, cnpj: est.cnpj,
      telefone: est.telefone ?? '', email: est.email ?? '',
      logradouro: est.logradouro, numero: est.numero,
      complemento: est.complemento ?? '', bairro: est.bairro,
      cidade: est.cidade, uf: est.uf, cep: est.cep,
    })
    setFormError(null)
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setEditando(null)
  }

  function set<K extends keyof CadastrarEstabelecimentoRequest>(
    key: K, value: CadastrarEstabelecimentoRequest[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function salvar() {
    setSalvando(true)
    setFormError(null)
    try {
      if (editando) {
        const body: AtualizarEstabelecimentoRequest = {
          nome: form.nome || undefined,
          telefone: form.telefone || undefined,
          email: form.email || undefined,
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

  async function abrirModalMedicos(est: EstabelecimentoResponse) {
    setModalMedicosEstab(est)
    setErroMedicos(null)
    setLoadingMedicos(true)
    try {
      const [todos, vinculados] = await Promise.all([
        medicoService.listar({ ativo: true }),
        estabelecimentoService.listarMedicos(est.id),
      ])
      setTodosMedicos(todos)
      setMedicosVinculados(new Set(vinculados.map((m) => m.id)))
    } catch (err) {
      setErroMedicos((err as Error).message)
    } finally {
      setLoadingMedicos(false)
    }
  }

  function toggleMedico(id: string) {
    setMedicosVinculados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function salvarMedicos() {
    if (!modalMedicosEstab) return
    setSalvandoMedicos(true)
    setErroMedicos(null)
    try {
      await estabelecimentoService.associarMedicos(modalMedicosEstab.id, {
        medicoIds: Array.from(medicosVinculados),
      })
      setModalMedicosEstab(null)
    } catch (err) {
      setErroMedicos((err as Error).message)
    } finally {
      setSalvandoMedicos(false)
    }
  }

  return (
    <div className="px-8 py-10">
      {/* header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8C9A84]">Cadastros</p>
          <h1 className="mt-1 font-serif text-4xl font-semibold text-[#2D3A31]">
            <em>Estabelecimentos</em>
          </h1>
        </div>
        <Button onClick={abrirCadastro}>
          <Plus size={14} strokeWidth={1.5} />
          Novo Estabelecimento
        </Button>
      </div>

      {/* filtros */}
      <Card className="mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-48">
            <Search size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C9A84]" />
            <input
              type="text"
              placeholder="Buscar por nome, CNPJ ou cidade…"
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
            value={filtroUf}
            onChange={(e) => setFiltroUf(e.target.value)}
            className="rounded-2xl bg-[#F2F0EB] px-4 py-2.5 text-sm font-sans text-[#2D3A31] border border-[#E6E2DA] outline-none focus:border-[#8C9A84]"
          >
            <option value="">Todos os estados</option>
            {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>

          <input
            type="text"
            placeholder="Filtrar por cidade…"
            value={filtroCidade}
            onChange={(e) => setFiltroCidade(e.target.value)}
            className="rounded-2xl bg-[#F2F0EB] px-4 py-2.5 text-sm font-sans text-[#2D3A31] border border-[#E6E2DA] outline-none focus:border-[#8C9A84] placeholder:text-[#8C9A84]/60"
          />
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
          {filtrados.map((est, i) => (
            <Card key={est.id} hover className={i % 2 === 1 ? 'md:translate-y-3' : ''}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DCCFC2]/40">
                  <Building2 size={18} strokeWidth={1.5} className="text-[#8C9A84]" />
                </div>
                <Badge variant={est.ativo ? 'active' : 'inactive'}>
                  {est.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>

              <div className="mt-4">
                <h3 className="font-serif text-lg font-semibold text-[#2D3A31]">{est.nome}</h3>
                <p className="mt-0.5 text-xs uppercase tracking-widest text-[#8C9A84]">
                  {est.cidade} — {est.uf}
                </p>
              </div>

              <div className="mt-4 space-y-1.5 border-t border-[#E6E2DA] pt-4">
                <p className="text-xs text-[#2D3A31]/70">
                  <span className="font-medium">CNPJ:</span> {est.cnpj}
                </p>
                <a
                  href={buildMapsUrl(est)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Ver no Google Maps"
                  className="group flex items-start gap-1.5 text-xs text-[#2D3A31]/70 transition-colors duration-300 hover:text-[#C27B66]"
                >
                  <MapPin
                    size={12}
                    strokeWidth={1.5}
                    className="mt-px shrink-0 text-[#8C9A84] transition-colors duration-300 group-hover:text-[#C27B66]"
                  />
                  <span>
                    {est.logradouro}, {est.numero}
                    {est.complemento ? ` — ${est.complemento}` : ''}, {est.bairro}
                    <span className="ml-1 font-mono tracking-wide text-[#8C9A84] group-hover:text-[#C27B66]">
                      {est.cep}
                    </span>
                  </span>
                </a>
                {est.telefone && (
                  <p className="text-xs text-[#2D3A31]/70">
                    <span className="font-medium">Tel:</span> {est.telefone}
                  </p>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => abrirEdicao(est)} className="flex-1">
                  <Pencil size={12} strokeWidth={1.5} /> Editar
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => abrirModalMedicos(est)}
                  title="Gerenciar médicos"
                >
                  <Stethoscope size={12} strokeWidth={1.5} />
                </Button>
                <a
                  href={buildMapsUrl(est)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir no Google Maps"
                  className="inline-flex items-center justify-center rounded-full border border-[#8C9A84] px-3 py-1.5 text-[#8C9A84] transition-all duration-300 hover:bg-[#8C9A84] hover:text-white"
                >
                  <MapPin size={12} strokeWidth={1.5} />
                </a>
                <Button variant="danger" size="sm" onClick={() => setConfirmandoId(est.id)} disabled={!est.ativo}>
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
        title={editando ? 'Editar Estabelecimento' : 'Novo Estabelecimento'}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={fecharModal}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando} size="sm">
              {salvando ? 'Salvando…' : 'Salvar'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
          {formError && (
            <div className="rounded-xl border border-[#C27B66]/30 bg-[#C27B66]/10 px-3 py-2 text-xs text-[#C27B66]">
              {formError}
            </div>
          )}

          <Input label="Nome" value={form.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Clínica São Lucas" />

          <Input
            label="CNPJ"
            value={form.cnpj}
            onChange={(e) => set('cnpj', e.target.value)}
            placeholder="00.000.000/0001-00"
            disabled={!!editando}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Telefone" value={form.telefone ?? ''} onChange={(e) => set('telefone', e.target.value)} placeholder="(11) 3333-0000" />
            <Input label="E-mail" type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} placeholder="contato@clinica.com" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input label="Logradouro" value={form.logradouro} onChange={(e) => set('logradouro', e.target.value)} placeholder="Rua das Flores" />
            </div>
            <Input label="Número" value={form.numero} onChange={(e) => set('numero', e.target.value)} placeholder="123" />
          </div>

          <Input label="Complemento" value={form.complemento ?? ''} onChange={(e) => set('complemento', e.target.value)} placeholder="Sala 42" />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Bairro" value={form.bairro} onChange={(e) => set('bairro', e.target.value)} placeholder="Jardins" />
            <Input label="CEP" value={form.cep} onChange={(e) => set('cep', e.target.value)} placeholder="01310-100" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input label="Cidade" value={form.cidade} onChange={(e) => set('cidade', e.target.value)} placeholder="São Paulo" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-widest text-[#8C9A84] font-sans">UF</label>
              <select
                value={form.uf}
                onChange={(e) => set('uf', e.target.value)}
                className="w-full rounded-2xl bg-[#F2F0EB] px-4 py-3 text-sm font-sans text-[#2D3A31] border border-[#E6E2DA] outline-none focus:border-[#8C9A84]"
              >
                {UFS.map((uf) => <option key={uf}>{uf}</option>)}
              </select>
            </div>
          </div>
        </div>
      </Modal>

      {/* modal de médicos */}
      <Modal
        open={modalMedicosEstab !== null}
        onClose={() => setModalMedicosEstab(null)}
        title={`Médicos — ${modalMedicosEstab?.nome ?? ''}`}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setModalMedicosEstab(null)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={salvarMedicos} disabled={salvandoMedicos}>
              {salvandoMedicos ? 'Salvando…' : 'Salvar'}
            </Button>
          </>
        }
      >
        {erroMedicos && (
          <div className="mb-3 rounded-xl border border-[#C27B66]/30 bg-[#C27B66]/10 px-3 py-2 text-xs text-[#C27B66]">
            {erroMedicos}
          </div>
        )}
        {loadingMedicos ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#8C9A84] border-t-transparent" />
          </div>
        ) : todosMedicos.length === 0 ? (
          <p className="py-6 text-center font-sans text-sm text-[#8C9A84]">
            Nenhum médico ativo cadastrado.
          </p>
        ) : (
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {todosMedicos.map((m) => {
              const checked = medicosVinculados.has(m.id)
              return (
                <label
                  key={m.id}
                  className={[
                    'flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-200',
                    checked
                      ? 'border-[#8C9A84] bg-[#8C9A84]/10'
                      : 'border-[#E6E2DA] bg-[#F2F0EB] hover:border-[#8C9A84]/50 hover:bg-white',
                  ].join(' ')}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMedico(m.id)}
                    className="h-4 w-4 accent-[#8C9A84]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-sans text-sm font-medium text-[#2D3A31] truncate">
                      {m.nome}
                    </p>
                    <p className="font-sans text-xs text-[#8C9A84]">
                      {m.especialidade} · CRM {m.crm}/{m.crmUf}
                    </p>
                  </div>
                </label>
              )
            })}
          </div>
        )}
      </Modal>

      {/* confirmação */}
      <Modal
        open={!!confirmandoId}
        onClose={() => setConfirmandoId(null)}
        title="Inativar Estabelecimento"
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
          O estabelecimento será <strong>inativado</strong> e não aparecerá nas listagens padrão.
        </p>
      </Modal>
    </div>
  )
}
