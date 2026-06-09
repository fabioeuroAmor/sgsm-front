import { useState, useCallback } from 'react'
import { medicoService } from '../services/medicoService'
import type {
  MedicoResponse,
  CadastrarMedicoRequest,
  AtualizarMedicoRequest,
  FiltrosMedico,
} from '../types'

export function useMedicos() {
  const [medicos, setMedicos] = useState<MedicoResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const listar = useCallback(async (filtros?: FiltrosMedico) => {
    setLoading(true)
    setError(null)
    try {
      const data = await medicoService.listar(filtros)
      setMedicos(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const cadastrar = useCallback(async (body: CadastrarMedicoRequest) => {
    const novo = await medicoService.cadastrar(body)
    setMedicos((prev) => [novo, ...prev])
    return novo
  }, [])

  const atualizar = useCallback(async (id: string, body: AtualizarMedicoRequest) => {
    const atualizado = await medicoService.atualizar(id, body)
    setMedicos((prev) => prev.map((m) => (m.id === id ? atualizado : m)))
    return atualizado
  }, [])

  const remover = useCallback(async (id: string) => {
    await medicoService.remover(id)
    setMedicos((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ativo: false } : m)),
    )
  }, [])

  return { medicos, loading, error, listar, cadastrar, atualizar, remover }
}
