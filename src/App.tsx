import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { PacientesPage } from './pages/PacientesPage'
import { MedicosPage } from './pages/MedicosPage'
import { EstabelecimentosPage } from './pages/EstabelecimentosPage'
import { ServicosPage } from './pages/ServicosPage'
import { AgendamentosPage } from './pages/AgendamentosPage'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/pacientes" replace />} />
          <Route path="/pacientes" element={<PacientesPage />} />
          <Route path="/medicos" element={<MedicosPage />} />
          <Route path="/estabelecimentos" element={<EstabelecimentosPage />} />
          <Route path="/servicos" element={<ServicosPage />} />
          <Route path="/agendamentos" element={<AgendamentosPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
