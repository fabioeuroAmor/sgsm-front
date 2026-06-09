import api from './api'
import type {
  AssociarMedicosRequest,
  EstabelecimentoResponse,
  CadastrarEstabelecimentoRequest,
  AtualizarEstabelecimentoRequest,
  FiltrosEstabelecimento,
  MedicoResponse,
} from '../types'

const BASE = '/estabelecimentos'

export const estabelecimentoService = {
  listar: (filtros?: FiltrosEstabelecimento) =>
    api.get<EstabelecimentoResponse[]>(BASE, { params: filtros }).then((r) => r.data),

  consultar: (id: string) =>
    api.get<EstabelecimentoResponse>(`${BASE}/${id}`).then((r) => r.data),

  cadastrar: (body: CadastrarEstabelecimentoRequest) =>
    api.post<EstabelecimentoResponse>(BASE, body).then((r) => r.data),

  atualizar: (id: string, body: AtualizarEstabelecimentoRequest) =>
    api.put<EstabelecimentoResponse>(`${BASE}/${id}`, body).then((r) => r.data),

  remover: (id: string) => api.delete(`${BASE}/${id}`),

  listarMedicos: (id: string): Promise<MedicoResponse[]> =>
    api.get<MedicoResponse[]>(`${BASE}/${id}/medicos`).then((r) => r.data),

  associarMedicos: (id: string, body: AssociarMedicosRequest): Promise<void> =>
    api.put(`${BASE}/${id}/medicos`, body).then(() => undefined),
}
