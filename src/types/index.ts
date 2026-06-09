// ─── Médico ───────────────────────────────────────────────────────────────────

export interface MedicoResponse {
  id: string
  nome: string
  crm: string
  crmUf: string
  especialidade: string
  email: string
  telefone?: string
  ativo: boolean
  criadoEm: string
  atualizadoEm: string
}

export interface CadastrarMedicoRequest {
  nome: string
  crm: string
  crmUf: string
  especialidade: string
  email: string
  telefone?: string
}

export interface AtualizarMedicoRequest {
  nome?: string
  especialidade?: string
  email?: string
  telefone?: string
}

// ─── Estabelecimento ──────────────────────────────────────────────────────────

export interface EstabelecimentoResponse {
  id: string
  nome: string
  cnpj: string
  telefone?: string
  email?: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  uf: string
  cep: string
  ativo: boolean
  criadoEm: string
  atualizadoEm: string
}

export interface CadastrarEstabelecimentoRequest {
  nome: string
  cnpj: string
  telefone?: string
  email?: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  uf: string
  cep: string
}

export interface AssociarMedicosRequest {
  medicoIds: string[]
}

export interface AtualizarEstabelecimentoRequest {
  nome?: string
  telefone?: string
  email?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  uf?: string
  cep?: string
}

// ─── Serviço Médico ───────────────────────────────────────────────────────────

export interface ServicoMedicoResponse {
  id: string
  medicoId: string
  nome: string
  descricao?: string
  preco: number
  duracaoMinutos?: number
  domiciliar: boolean
  taxaDeslocamento?: number
  ativo: boolean
  criadoEm: string
  atualizadoEm: string
}

export interface CadastrarServicoMedicoRequest {
  medicoId: string
  nome: string
  descricao?: string
  preco: number
  duracaoMinutos?: number
  domiciliar?: boolean
  taxaDeslocamento?: number
}

export interface AtualizarServicoMedicoRequest {
  nome?: string
  descricao?: string
  preco?: number
  duracaoMinutos?: number
  domiciliar?: boolean
  taxaDeslocamento?: number
}

// ─── Paciente ─────────────────────────────────────────────────────────────────

export interface PacienteResponse {
  id: string
  nome: string
  cpf: string
  dataNascimento: string
  email: string
  telefone?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  uf?: string
  cep?: string
  ativo: boolean
  criadoEm: string
  atualizadoEm: string
}

export interface CadastrarPacienteRequest {
  nome: string
  cpf: string
  dataNascimento: string
  email: string
  telefone?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  uf?: string
  cep?: string
}

export interface AtualizarPacienteRequest {
  nome?: string
  dataNascimento?: string
  email?: string
  telefone?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  uf?: string
  cep?: string
}

export type FiltrosPaciente = {
  ativo?: boolean
}

// ─── Agenda Médico ───────────────────────────────────────────────────────────

export type DiaSemana =
  | 'SEGUNDA'
  | 'TERCA'
  | 'QUARTA'
  | 'QUINTA'
  | 'SEXTA'
  | 'SABADO'
  | 'DOMINGO'

export interface AgendaMedicoResponse {
  id: string
  medicoId: string
  estabelecimentoId?: string
  estabelecimentoNome?: string
  diaSemana: DiaSemana
  horaInicio: string
  horaFim: string
  duracaoSlotMinutos: number
  dataVigenciaInicio: string
  dataVigenciaFim?: string
  domiciliar: boolean
  intervaloDeslocamentoMinutos?: number
  raioKm?: number
  cidadeAtendimento?: string
  ufAtendimento?: string
  ativo: boolean
  criadoEm: string
}

export interface CadastrarAgendaMedicoRequest {
  medicoId: string
  estabelecimentoId?: string
  diaSemana: DiaSemana
  horaInicio: string
  horaFim: string
  duracaoSlotMinutos: number
  dataVigenciaInicio: string
  dataVigenciaFim?: string
  domiciliar?: boolean
  intervaloDeslocamentoMinutos?: number
  raioKm?: number
  cidadeAtendimento?: string
  ufAtendimento?: string
}

// ─── Agendamento ─────────────────────────────────────────────────────────────

export type TipoAgendamento = 'PRESENCIAL' | 'DOMICILIAR' | 'TELEMEDICINA'

export type StatusAgendamento =
  | 'PENDENTE'
  | 'AGUARDANDO_PAGAMENTO'
  | 'CONFIRMADO'
  | 'EM_ANDAMENTO'
  | 'A_CAMINHO'
  | 'CHEGOU'
  | 'CONCLUIDO'
  | 'CANCELADO'
  | 'NO_SHOW'

export type OrigemCancelamento = 'PACIENTE' | 'MEDICO' | 'ESTABELECIMENTO' | 'SISTEMA'

export interface AgendamentoResponse {
  id: string
  pacienteId: string
  pacienteNome?: string
  pacienteEndereco?: string
  servicoMedicoId: string
  servicoMedicoNome?: string
  medicoId: string
  medicoNome?: string
  estabelecimentoId?: string
  estabelecimentoNome?: string
  estabelecimentoEndereco?: string
  tipo: TipoAgendamento
  pagamentoId?: string
  dataHoraInicio: string
  dataHoraFim: string
  status: StatusAgendamento
  observacoes?: string
  origemCancelamento?: OrigemCancelamento
  motivoCancelamento?: string
  localizacaoMedico?: string
  criadoEm: string
  atualizadoEm: string
}

export interface CadastrarAgendamentoRequest {
  pacienteId: string
  servicoMedicoId: string
  estabelecimentoId?: string
  tipo?: TipoAgendamento
  dataHoraInicio: string
  observacoes?: string
}

export interface CancelarAgendamentoRequest {
  origemCancelamento: OrigemCancelamento
  motivoCancelamento: string
}

export interface SlotDisponivelResponse {
  dataHoraInicio: string
  dataHoraFim: string
  duracaoMinutos: number
}

export type FiltrosAgendamento = {
  pacienteId?: string
  status?: StatusAgendamento
  medicoId?: string
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

export interface ApiError {
  timestamp: string
  status: number
  erro: string
}

export type FiltrosMedico = {
  ativo?: boolean
  especialidade?: string
}

export type FiltrosEstabelecimento = {
  ativo?: boolean
  uf?: string
  cidade?: string
}

export type FiltrosServico = {
  ativo?: boolean
  medicoId?: string
}
