import api from './api'
import type {
  MedicoResponse,
  CadastrarMedicoRequest,
  AtualizarMedicoRequest,
  FiltrosMedico,
} from '../types'

const BASE = '/medicos'

export const medicoService = {
  listar: (filtros?: FiltrosMedico) =>
    api.get<MedicoResponse[]>(BASE, { params: filtros }).then((r) => r.data),

  consultar: (id: string) =>
    api.get<MedicoResponse>(`${BASE}/${id}`).then((r) => r.data),

  cadastrar: (body: CadastrarMedicoRequest) =>
    api.post<MedicoResponse>(BASE, body).then((r) => r.data),

  atualizar: (id: string, body: AtualizarMedicoRequest) =>
    api.put<MedicoResponse>(`${BASE}/${id}`, body).then((r) => r.data),

  remover: (id: string) => api.delete(`${BASE}/${id}`),
}
