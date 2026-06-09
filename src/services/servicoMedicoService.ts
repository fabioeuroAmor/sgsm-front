import api from './api'
import type {
  ServicoMedicoResponse,
  CadastrarServicoMedicoRequest,
  AtualizarServicoMedicoRequest,
  FiltrosServico,
} from '../types'

const BASE = '/servicos-medicos'

export const servicoMedicoService = {
  listar: (filtros?: FiltrosServico) =>
    api.get<ServicoMedicoResponse[]>(BASE, { params: filtros }).then((r) => r.data),

  consultar: (id: string) =>
    api.get<ServicoMedicoResponse>(`${BASE}/${id}`).then((r) => r.data),

  cadastrar: (body: CadastrarServicoMedicoRequest) =>
    api.post<ServicoMedicoResponse>(BASE, body).then((r) => r.data),

  atualizar: (id: string, body: AtualizarServicoMedicoRequest) =>
    api.put<ServicoMedicoResponse>(`${BASE}/${id}`, body).then((r) => r.data),

  remover: (id: string) => api.delete(`${BASE}/${id}`),
}
