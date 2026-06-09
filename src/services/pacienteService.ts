import api from './api'
import type {
  PacienteResponse,
  CadastrarPacienteRequest,
  AtualizarPacienteRequest,
  FiltrosPaciente,
} from '../types'

const BASE = '/pacientes'

export const pacienteService = {
  listar: (filtros?: FiltrosPaciente) =>
    api.get<PacienteResponse[]>(BASE, { params: filtros }).then((r) => r.data),

  consultar: (id: string) =>
    api.get<PacienteResponse>(`${BASE}/${id}`).then((r) => r.data),

  cadastrar: (body: CadastrarPacienteRequest) =>
    api.post<PacienteResponse>(BASE, body).then((r) => r.data),

  atualizar: (id: string, body: AtualizarPacienteRequest) =>
    api.put<PacienteResponse>(`${BASE}/${id}`, body).then((r) => r.data),

  remover: (id: string) => api.delete(`${BASE}/${id}`),
}
