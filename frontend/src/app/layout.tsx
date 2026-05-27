import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RBM LOGISTICS – Agendamento Logístico',
  description: 'Módulo Corporativo de Agendamento Logístico',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
