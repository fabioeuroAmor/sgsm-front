import api from './api'
import type {
  AgendamentoResponse,
  CadastrarAgendamentoRequest,
  CancelarAgendamentoRequest,
  EstabelecimentoResponse,
  FiltrosAgendamento,
  SlotDisponivelResponse,
  StatusAgendamento,
} from '../types'

export const agendamentoService = {
  getEstabelecimentosByMedico(medicoId: string): Promise<EstabelecimentoResponse[]> {
    return api
      .get<EstabelecimentoResponse[]>(`/agendamentos/medico/${medicoId}/estabelecimentos`)
      .then((r) => r.data)
  },

  getSlots(medicoId: string, estabelecimentoId: string | undefined, data: string): Promise<SlotDisponivelResponse[]> {
    return api
      .get<SlotDisponivelResponse[]>('/agendamentos/slots', {
        params: { medicoId, ...(estabelecimentoId ? { estabelecimentoId } : {}), data },
      })
      .then((r) => r.data)
  },

  cadastrar(request: CadastrarAgendamentoRequest): Promise<AgendamentoResponse> {
    return api.post<AgendamentoResponse>('/agendamentos', request).then((r) => r.data)
  },

  consultar(id: string): Promise<AgendamentoResponse> {
    return api.get<AgendamentoResponse>(`/agendamentos/${id}`).then((r) => r.data)
  },

  listar(filtros: FiltrosAgendamento = {}): Promise<AgendamentoResponse[]> {
    return api
      .get<AgendamentoResponse[]>('/agendamentos', { params: filtros })
      .then((r) => r.data)
  },

  atualizarStatus(id: string, status: StatusAgendamento, localizacaoMedico?: string): Promise<AgendamentoResponse> {
    return api.patch<AgendamentoResponse>(`/agendamentos/${id}/status`, { status, localizacaoMedico }).then((r) => r.data)
  },

  cancelar(id: string, request: CancelarAgendamentoRequest): Promise<void> {
    return api.patch(`/agendamentos/${id}/cancelar`, request).then(() => undefined)
  },
}
