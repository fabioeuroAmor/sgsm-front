import { useState, useCallback } from 'react'
import { pacienteService } from '../services/pacienteService'
import type {
  PacienteResponse,
  CadastrarPacienteRequest,
  AtualizarPacienteRequest,
  FiltrosPaciente,
} from '../types'

export function usePacientes() {
  const [pacientes, setPacientes] = useState<PacienteResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const listar = useCallback(async (filtros?: FiltrosPaciente) => {
    setLoading(true)
    setError(null)
    try {
      const data = await pacienteService.listar(filtros)
      setPacientes(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const cadastrar = useCallback(async (body: CadastrarPacienteRequest) => {
    const novo = await pacienteService.cadastrar(body)
    setPacientes((prev) => [novo, ...prev])
    return novo
  }, [])

  const atualizar = useCallback(async (id: string, body: AtualizarPacienteRequest) => {
    const atualizado = await pacienteService.atualizar(id, body)
    setPacientes((prev) => prev.map((p) => (p.id === id ? atualizado : p)))
    return atualizado
  }, [])

  const remover = useCallback(async (id: string) => {
    await pacienteService.remover(id)
    setPacientes((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ativo: false } : p)),
    )
  }, [])

  return { pacientes, loading, error, listar, cadastrar, atualizar, remover }
}
