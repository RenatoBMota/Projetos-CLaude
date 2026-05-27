export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-700 to-brand-900">
      <div className="text-center text-white">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-2xl mb-4">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-2">RBM LOGISTICS</h1>
          <p className="text-brand-200 text-lg">Módulo de Agendamento Logístico</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-md mx-auto">
          <p className="text-white/80 mb-6 text-sm">
            Fase 0 concluída. O scaffold está funcionando.<br />
            A tela de login será implementada na Fase 1.
          </p>
          <div className="flex flex-col gap-2 text-left text-sm">
            {[
              { label: 'API Backend', url: 'http://localhost:8080/swagger-ui.html' },
              { label: 'RabbitMQ Management', url: 'http://localhost:15672' },
              { label: 'MinIO Console', url: 'http://localhost:9001' },
              { label: 'pgAdmin', url: 'http://localhost:5050' },
            ].map(({ label, url }) => (
              <div key={label} className="flex justify-between items-center bg-white/5 rounded-lg px-4 py-2">
                <span className="text-white/70">{label}</span>
                <span className="text-brand-200 font-mono text-xs">{url}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-8 text-white/40 text-xs">v0.1.0 – Fase 0: Fundação</p>
      </div>
    </div>
  )
}
