import api from './api'
import type { AgendaMedicoResponse, CadastrarAgendaMedicoRequest } from '../types'

const BASE = '/agenda-medico'

export const agendaMedicoService = {
  listar: (medicoId: string): Promise<AgendaMedicoResponse[]> =>
    api.get<AgendaMedicoResponse[]>(BASE, { params: { medicoId } }).then((r) => r.data),

  cadastrar: (body: CadastrarAgendaMedicoRequest): Promise<AgendaMedicoResponse> =>
    api.post<AgendaMedicoResponse>(BASE, body).then((r) => r.data),

  remover: (id: string): Promise<void> =>
    api.delete(`${BASE}/${id}`).then(() => undefined),
}
