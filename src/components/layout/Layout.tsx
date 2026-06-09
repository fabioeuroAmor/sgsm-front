import { type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { GrainTexture } from '../ui/GrainTexture'
import { ChatbotWidget } from '../ChatbotWidget'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-full min-h-screen bg-[#F9F8F4]">
      <GrainTexture />
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      <ChatbotWidget />
    </div>
  )
}
