import { useState, useCallback } from 'react'
import { servicoMedicoService } from '../services/servicoMedicoService'
import type {
  ServicoMedicoResponse,
  CadastrarServicoMedicoRequest,
  AtualizarServicoMedicoRequest,
  FiltrosServico,
} from '../types'

export function useServicos() {
  const [servicos, setServicos] = useState<ServicoMedicoResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const listar = useCallback(async (filtros?: FiltrosServico) => {
    setLoading(true)
    setError(null)
    try {
      const data = await servicoMedicoService.listar(filtros)
      setServicos(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const cadastrar = useCallback(async (body: CadastrarServicoMedicoRequest) => {
    const novo = await servicoMedicoService.cadastrar(body)
    setServicos((prev) => [novo, ...prev])
    return novo
  }, [])

  const atualizar = useCallback(async (id: string, body: AtualizarServicoMedicoRequest) => {
    const atualizado = await servicoMedicoService.atualizar(id, body)
    setServicos((prev) => prev.map((s) => (s.id === id ? atualizado : s)))
    return atualizado
  }, [])

  const remover = useCallback(async (id: string) => {
    await servicoMedicoService.remover(id)
    setServicos((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ativo: false } : s)),
    )
  }, [])

  return { servicos, loading, error, listar, cadastrar, atualizar, remover }
}
