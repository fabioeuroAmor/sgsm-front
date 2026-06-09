import { useState, useCallback } from 'react'
import { agendamentoService } from '../services/agendamentoService'
import type {
  AgendamentoResponse,
  CadastrarAgendamentoRequest,
  CancelarAgendamentoRequest,
  FiltrosAgendamento,
  StatusAgendamento,
} from '../types'

export function useAgendamentos() {
  const [agendamentos, setAgendamentos] = useState<AgendamentoResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const listar = useCallback(async (filtros?: FiltrosAgendamento) => {
    setLoading(true)
    setError(null)
    try {
      const data = await agendamentoService.listar(filtros)
      setAgendamentos(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const cadastrar = useCallback(async (body: CadastrarAgendamentoRequest) => {
    const novo = await agendamentoService.cadastrar(body)
    setAgendamentos((prev) => [novo, ...prev])
    return novo
  }, [])

  const cancelar = useCallback(async (id: string, body: CancelarAgendamentoRequest) => {
    await agendamentoService.cancelar(id, body)
    setAgendamentos((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'CANCELADO' as const } : a)),
    )
  }, [])

  const atualizarStatus = useCallback(async (id: string, status: StatusAgendamento, localizacaoMedico?: string) => {
    const atualizado = await agendamentoService.atualizarStatus(id, status, localizacaoMedico)
    setAgendamentos((prev) => prev.map((a) => (a.id === id ? atualizado : a)))
  }, [])

  return { agendamentos, loading, error, listar, cadastrar, cancelar, atualizarStatus }
}
