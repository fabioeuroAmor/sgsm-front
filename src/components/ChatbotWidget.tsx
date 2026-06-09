import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'
import { pacienteService } from '../services/pacienteService'
import { servicoMedicoService } from '../services/servicoMedicoService'
import { agendamentoService } from '../services/agendamentoService'
import type {
  PacienteResponse,
  ServicoMedicoResponse,
  EstabelecimentoResponse,
  SlotDisponivelResponse,
} from '../types'

type Step =
  | 'MENU'
  | 'CAD_NOME' | 'CAD_CPF' | 'CAD_DATA' | 'CAD_EMAIL' | 'CAD_TELEFONE' | 'CAD_CONFIRMAR'
  | 'AGE_CPF' | 'AGE_SERVICO' | 'AGE_ESTAB' | 'AGE_DATA' | 'AGE_SLOT' | 'AGE_OBS' | 'AGE_CONFIRMAR'

interface Message { from: 'bot' | 'user'; text: string }
interface Choice { label: string; value: string }

const MENU_CHOICES: Choice[] = [
  { label: 'Cadastrar-me como paciente', value: 'CADASTRO' },
  { label: 'Agendar uma consulta', value: 'AGENDAMENTO' },
]

const CHOICE_ONLY_STEPS: Step[] = [
  'MENU', 'AGE_SERVICO', 'AGE_ESTAB', 'AGE_SLOT', 'CAD_CONFIRMAR', 'AGE_CONFIRMAR',
]

// ─── pure helpers ─────────────────────────────────────────────────────────────

function maskCPF(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function maskDate(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function brDateToISO(date: string) {
  const [d, m, y] = date.split('/')
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function formatSlotLabel(slot: SlotDisponivelResponse) {
  return new Date(slot.dataHoraInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function parseDate(raw: string): string | null {
  const s = raw.trim()

  const m1 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (m1) return `${m1[1].padStart(2, '0')}/${m1[2].padStart(2, '0')}/${m1[3]}`

  const m2 = s.match(/^(\d{1,2})[\s.](\d{1,2})[\s.](\d{4})$/)
  if (m2) return `${m2[1].padStart(2, '0')}/${m2[2].padStart(2, '0')}/${m2[3]}`

  const MONTHS: Record<string, string> = {
    janeiro: '01', fevereiro: '02', março: '03', marco: '03',
    abril: '04', maio: '05', junho: '06', julho: '07',
    agosto: '08', setembro: '09', outubro: '10', novembro: '11', dezembro: '12',
  }
  const m3 = s.match(/(\d{1,2})\s+(?:de\s+)?([a-záéíóúâêîôûãõç]+)(?:\s+de)?\s+(\d{4})/i)
  if (m3) {
    const month = MONTHS[m3[2].toLowerCase()]
    if (month) return `${m3[1].padStart(2, '0')}/${month}/${m3[3]}`
  }

  const digits = s.replace(/\D/g, '')
  if (digits.length === 8) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`

  return null
}

// ─── component ────────────────────────────────────────────────────────────────

export function ChatbotWidget() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('MENU')
  const [messages, setMessages] = useState<Message[]>([
    { from: 'bot', text: 'Olá! Sou o assistente do SGSM. Como posso ajudar você hoje?' },
  ])
  const [choices, setChoices] = useState<Choice[]>(MENU_CHOICES)
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)

  // Cadastro
  const [cadNome, setCadNome] = useState('')
  const [cadCpf, setCadCpf] = useState('')
  const [cadDataNasc, setCadDataNasc] = useState('')
  const [cadEmail, setCadEmail] = useState('')
  const [cadTelefone, setCadTelefone] = useState('')

  // Agendamento
  const [paciente, setPaciente] = useState<PacienteResponse | null>(null)
  const [servicos, setServicos] = useState<ServicoMedicoResponse[]>([])
  const [servico, setServico] = useState<ServicoMedicoResponse | null>(null)
  const [estabelecimentos, setEstabelecimentos] = useState<EstabelecimentoResponse[]>([])
  const [estabelecimento, setEstabelecimento] = useState<EstabelecimentoResponse | null>(null)
  const [slots, setSlots] = useState<SlotDisponivelResponse[]>([])
  const [slot, setSlot] = useState<SlotDisponivelResponse | null>(null)
  const [ageObs, setAgeObs] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150)
  }, [open])

  // ─── helpers ─────────────────────────────────────────────────────────────

  function addBot(text: string) {
    setMessages(m => [...m, { from: 'bot', text }])
  }

  function addUser(text: string) {
    setMessages(m => [...m, { from: 'user', text }])
  }

  function goMenu() {
    setStep('MENU')
    setChoices(MENU_CHOICES)
  }

  function reset() {
    setStep('MENU')
    setMessages([{ from: 'bot', text: 'Olá! Como posso ajudar você hoje?' }])
    setChoices(MENU_CHOICES)
    setInputValue('')
    setLoading(false)
    setCadNome(''); setCadCpf(''); setCadDataNasc(''); setCadEmail(''); setCadTelefone('')
    setPaciente(null); setServicos([]); setServico(null)
    setEstabelecimentos([]); setEstabelecimento(null)
    setSlots([]); setSlot(null); setAgeObs('')
  }

  // ─── choice handler ───────────────────────────────────────────────────────

  async function handleChoice(choice: Choice) {
    addUser(choice.label)
    setChoices([])

    if (step === 'MENU') {
      if (choice.value === 'CADASTRO') {
        setStep('CAD_NOME')
        addBot('Vamos ao seu cadastro! Qual é o seu nome completo?')
      } else {
        setLoading(true)
        try {
          const list = await servicoMedicoService.listar({ ativo: true })
          if (list.length === 0) {
            addBot('Não há serviços disponíveis no momento. Tente novamente mais tarde.')
            goMenu()
          } else {
            setServicos(list)
            setStep('AGE_CPF')
            addBot('Para agendar, preciso identificar você. Informe o seu CPF:')
          }
        } catch {
          addBot('Erro ao buscar serviços. Tente novamente.')
          goMenu()
        } finally { setLoading(false) }
      }
      return
    }

    if (step === 'AGE_SERVICO') {
      const selected = servicos.find(s => s.id === choice.value)
      if (!selected) return
      setServico(selected)

      if (selected.domiciliar) {
        setEstabelecimento(null)
        setStep('AGE_DATA')
        addBot('Atendimento domiciliar 🏠 — irei até você!\nQual data você deseja agendar? (DD/MM/AAAA)')
        return
      }

      setLoading(true)
      try {
        const estabs = await agendamentoService.getEstabelecimentosByMedico(selected.medicoId)
        if (estabs.length === 0) {
          addBot('Não há estabelecimentos para este serviço. Escolha outro:')
          setStep('AGE_SERVICO')
          setChoices(servicos.map(s => ({ label: `${s.nome} — R$ ${s.preco.toFixed(2)}`, value: s.id })))
        } else {
          setEstabelecimentos(estabs)
          setStep('AGE_ESTAB')
          addBot('Em qual estabelecimento deseja ser atendido(a)?')
          setChoices(estabs.map(e => ({ label: e.nome, value: e.id })))
        }
      } catch {
        addBot('Erro ao buscar estabelecimentos. Tente novamente.')
        goMenu()
      } finally { setLoading(false) }
      return
    }

    if (step === 'AGE_ESTAB') {
      const selected = estabelecimentos.find(e => e.id === choice.value)
      if (!selected) return
      setEstabelecimento(selected)
      setStep('AGE_DATA')
      addBot('Qual data você deseja agendar? (DD/MM/AAAA)')
      return
    }

    if (step === 'AGE_SLOT') {
      const selected = slots.find(s => s.dataHoraInicio === choice.value)
      if (!selected) return
      setSlot(selected)
      setStep('AGE_OBS')
      addBot('Tem alguma observação para o médico? (Opcional — pressione Enter para pular)')
      return
    }

    if (step === 'CAD_CONFIRMAR') {
      if (choice.value === 'SIM') {
        setLoading(true)
        try {
          await pacienteService.cadastrar({
            nome: cadNome,
            cpf: cadCpf.replace(/\D/g, ''),
            dataNascimento: brDateToISO(cadDataNasc),
            email: cadEmail,
            telefone: cadTelefone || undefined,
          })
          addBot('Cadastro realizado com sucesso! Agora você pode agendar consultas. O que deseja fazer?')
          goMenu()
        } catch (err: unknown) {
          addBot(`Erro ao cadastrar: ${err instanceof Error ? err.message : 'Tente novamente.'}`)
          setChoices([{ label: 'Tentar novamente', value: 'SIM' }, { label: 'Cancelar', value: 'NAO' }])
        } finally { setLoading(false) }
      } else {
        addBot('Cadastro cancelado. O que deseja fazer?')
        goMenu()
      }
      return
    }

    if (step === 'AGE_CONFIRMAR') {
      if (choice.value === 'SIM') {
        setLoading(true)
        try {
          await agendamentoService.cadastrar({
            pacienteId: paciente!.id,
            servicoMedicoId: servico!.id,
            estabelecimentoId: servico!.domiciliar ? undefined : estabelecimento!.id,
            tipo: servico!.domiciliar ? 'DOMICILIAR' : 'PRESENCIAL',
            dataHoraInicio: slot!.dataHoraInicio,
            observacoes: ageObs || undefined,
          })
          addBot('Agendamento realizado com sucesso! Em breve você receberá a confirmação. O que deseja fazer?')
          goMenu()
        } catch (err: unknown) {
          addBot(`Erro ao agendar: ${err instanceof Error ? err.message : 'Tente novamente.'}`)
          setChoices([{ label: 'Tentar novamente', value: 'SIM' }, { label: 'Cancelar', value: 'NAO' }])
        } finally { setLoading(false) }
      } else {
        addBot('Agendamento cancelado. O que deseja fazer?')
        goMenu()
      }
    }
  }

  // ─── text input handler ───────────────────────────────────────────────────

  async function processInput(rawValue: string) {
    const value = rawValue.trim()

    if (step === 'CAD_NOME') {
      if (!value) { addBot('Por favor, informe o seu nome completo.'); return }
      addUser(value); setCadNome(value); setStep('CAD_CPF')
      addBot('Informe o seu CPF:'); return
    }

    if (step === 'CAD_CPF') {
      const digits = value.replace(/\D/g, '')
      if (digits.length !== 11) { addBot('CPF inválido. Informe os 11 dígitos.'); return }
      addUser(value); setCadCpf(digits); setStep('CAD_DATA')
      addBot('Informe sua data de nascimento (DD/MM/AAAA):'); return
    }

    if (step === 'CAD_DATA') {
      const parsed = parseDate(value)
      if (!parsed) { addBot('Data inválida. Use o formato DD/MM/AAAA.'); return }
      addUser(parsed); setCadDataNasc(parsed); setStep('CAD_EMAIL')
      addBot('Informe o seu e-mail:'); return
    }

    if (step === 'CAD_EMAIL') {
      if (!value.includes('@')) { addBot('E-mail inválido. Tente novamente.'); return }
      addUser(value); setCadEmail(value); setStep('CAD_TELEFONE')
      addBot('Informe o seu telefone (opcional — pressione Enter para pular):'); return
    }

    if (step === 'CAD_TELEFONE') {
      addUser(value || '(sem telefone)')
      setCadTelefone(value)
      const summary = [
        'Confirme seus dados:',
        `• Nome: ${cadNome}`,
        `• CPF: ${maskCPF(cadCpf)}`,
        `• Nascimento: ${cadDataNasc}`,
        `• E-mail: ${cadEmail}`,
        value ? `• Telefone: ${value}` : null,
        '', 'Está correto?',
      ].filter(Boolean).join('\n')
      setStep('CAD_CONFIRMAR'); addBot(summary)
      setChoices([{ label: 'Sim, confirmar', value: 'SIM' }, { label: 'Não, cancelar', value: 'NAO' }])
      return
    }

    if (step === 'AGE_CPF') {
      const digits = value.replace(/\D/g, '')
      if (digits.length !== 11) { addBot('CPF inválido. Informe os 11 dígitos.'); return }
      addUser(value); setLoading(true)
      try {
        const pacientes = await pacienteService.listar({ ativo: true })
        const found = pacientes.find(p => p.cpf.replace(/\D/g, '') === digits)
        if (!found) {
          addBot('Paciente não encontrado. Verifique o CPF ou realize o cadastro primeiro.')
          goMenu()
        } else {
          setPaciente(found); setStep('AGE_SERVICO')
          addBot(`Olá, ${found.nome.split(' ')[0]}! Qual serviço você deseja agendar?`)
          setChoices(servicos.map(s => ({ label: `${s.nome} — R$ ${s.preco.toFixed(2)}`, value: s.id })))
        }
      } catch {
        addBot('Erro ao buscar paciente. Tente novamente.')
        goMenu()
      } finally { setLoading(false) }
      return
    }

    if (step === 'AGE_DATA') {
      const parsed = parseDate(value)
      if (!parsed) { addBot('Data inválida. Use o formato DD/MM/AAAA.'); return }
      addUser(parsed); setLoading(true)
      try {
        const slotsResult = await agendamentoService.getSlots(
          servico!.medicoId,
          servico!.domiciliar ? undefined : estabelecimento!.id,
          brDateToISO(parsed)
        )
        setSlots(slotsResult)
        if (slotsResult.length === 0) {
          addBot('Sem horários disponíveis nesta data. Informe outra data:')
        } else {
          setStep('AGE_SLOT')
          addBot('Escolha o horário desejado:')
          setChoices(slotsResult.map(s => ({ label: formatSlotLabel(s), value: s.dataHoraInicio })))
        }
      } catch {
        addBot('Erro ao buscar horários. Tente novamente.')
      } finally { setLoading(false) }
      return
    }

    if (step === 'AGE_OBS') {
      addUser(value || '(sem observações)')
      setAgeObs(value)
      const localLabel = servico?.domiciliar
        ? `Domiciliar${paciente?.cidade ? ` — ${paciente.cidade}/${paciente.uf}` : ''}`
        : (estabelecimento?.nome ?? '—')
      const precoTotal = servico
        ? servico.preco + (servico.domiciliar ? (servico.taxaDeslocamento ?? 0) : 0)
        : 0
      const summary = [
        'Confirme o agendamento:',
        `• Paciente: ${paciente?.nome}`,
        `• Serviço: ${servico?.nome}`,
        `• Local: ${localLabel}`,
        `• Horário: ${slot ? formatDateTime(slot.dataHoraInicio) : ''}`,
        `• Valor: R$ ${precoTotal.toFixed(2)}`,
        value ? `• Obs: ${value}` : null,
        '', 'Confirmar?',
      ].filter(Boolean).join('\n')
      setStep('AGE_CONFIRMAR'); addBot(summary)
      setChoices([{ label: 'Sim, confirmar', value: 'SIM' }, { label: 'Não, cancelar', value: 'NAO' }])
    }
  }

  function handleSubmit() {
    const value = inputValue.trim()
    setInputValue('')
    processInput(value)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    let value = e.target.value
    if (step === 'CAD_CPF' || step === 'AGE_CPF') value = maskCPF(value)
    else if (step === 'CAD_DATA' || step === 'AGE_DATA') value = maskDate(value)
    else if (step === 'CAD_TELEFONE') value = maskPhone(value)
    setInputValue(value)
  }

  const isChoiceOnly = CHOICE_ONLY_STEPS.includes(step)

  const inputPlaceholder =
    step === 'CAD_NOME' ? 'Nome completo...' :
    step === 'CAD_CPF' || step === 'AGE_CPF' ? '000.000.000-00' :
    step === 'CAD_DATA' || step === 'AGE_DATA' ? 'DD/MM/AAAA' :
    step === 'CAD_EMAIL' ? 'email@exemplo.com' :
    '(opcional)'

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95"
        style={{ backgroundColor: '#2D3A31' }}
        aria-label="Assistente virtual"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-80 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          style={{ height: '500px', backgroundColor: '#F9F8F4', border: '1px solid #E6E2DA' }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center justify-between flex-shrink-0"
            style={{ backgroundColor: '#2D3A31' }}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 block" />
              <span
                className="text-white text-sm font-semibold tracking-wide"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Assistente SGSM
              </span>
            </div>
            <button
              onClick={reset}
              className="text-white/50 hover:text-white/90 text-xs transition-colors"
            >
              reiniciar
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-line"
                  style={
                    msg.from === 'bot'
                      ? { backgroundColor: '#E6E2DA', color: '#2D3A31' }
                      : { backgroundColor: '#8C9A84', color: 'white' }
                  }
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="px-4 py-2 rounded-2xl text-sm" style={{ backgroundColor: '#E6E2DA', color: '#8C9A84' }}>
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce" style={{ animationDelay: '0ms' }}>·</span>
                    <span className="animate-bounce" style={{ animationDelay: '150ms' }}>·</span>
                    <span className="animate-bounce" style={{ animationDelay: '300ms' }}>·</span>
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Choices */}
          {choices.length > 0 && (
            <div
              className="px-3 pt-2 pb-1 flex flex-col gap-1 flex-shrink-0 max-h-36 overflow-y-auto"
              style={{ borderTop: '1px solid #E6E2DA' }}
            >
              {choices.map((c, i) => (
                <button
                  key={c.value}
                  onClick={() => handleChoice(c)}
                  disabled={loading}
                  className="text-left w-full px-3 py-2 rounded-xl text-xs font-medium transition-colors disabled:opacity-40"
                  style={{ backgroundColor: '#DCCFC2', color: '#2D3A31', border: '1px solid #E6E2DA' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#C27B66'; e.currentTarget.style.color = 'white' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#DCCFC2'; e.currentTarget.style.color = '#2D3A31' }}
                >
                  <span className="opacity-40 mr-1.5">{i + 1}.</span>{c.label}
                </button>
              ))}
            </div>
          )}

          {/* Text input */}
          {!isChoiceOnly && (
            <div
              className="px-3 py-2 flex gap-2 items-center flex-shrink-0"
              style={{ borderTop: '1px solid #E6E2DA' }}
            >
              <input
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={loading}
                placeholder={inputPlaceholder}
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none disabled:opacity-50"
                style={{ backgroundColor: '#E6E2DA', color: '#2D3A31' }}
              />
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ backgroundColor: '#8C9A84' }}
              >
                <Send size={14} className="text-white" />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
