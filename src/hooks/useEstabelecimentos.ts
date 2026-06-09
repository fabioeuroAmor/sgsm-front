import { useState, useCallback } from 'react'
import { estabelecimentoService } from '../services/estabelecimentoService'
import type {
  EstabelecimentoResponse,
  CadastrarEstabelecimentoRequest,
  AtualizarEstabelecimentoRequest,
  FiltrosEstabelecimento,
} from '../types'

export function useEstabelecimentos() {
  const [estabelecimentos, setEstabelecimentos] = useState<EstabelecimentoResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const listar = useCallback(async (filtros?: FiltrosEstabelecimento) => {
    setLoading(true)
    setError(null)
    try {
      const data = await estabelecimentoService.listar(filtros)
      setEstabelecimentos(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const cadastrar = useCallback(async (body: CadastrarEstabelecimentoRequest) => {
    const novo = await estabelecimentoService.cadastrar(body)
    setEstabelecimentos((prev) => [novo, ...prev])
    return novo
  }, [])

  const atualizar = useCallback(async (id: string, body: AtualizarEstabelecimentoRequest) => {
    const atualizado = await estabelecimentoService.atualizar(id, body)
    setEstabelecimentos((prev) => prev.map((e) => (e.id === id ? atualizado : e)))
    return atualizado
  }, [])

  const remover = useCallback(async (id: string) => {
    await estabelecimentoService.remover(id)
    setEstabelecimentos((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ativo: false } : e)),
    )
  }, [])

  return { estabelecimentos, loading, error, listar, cadastrar, atualizar, remover }
}
