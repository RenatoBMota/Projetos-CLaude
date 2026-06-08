import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Store, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Spinner } from '@/components/ui/Spinner'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'Mínimo 6 caracteres'),
})

type FormData = z.infer<typeof schema>

export function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const onSubmit = async (data: FormData) => {
    try {
      setError('')
      await login(data.email, data.senha)
    } catch {
      setError('E-mail ou senha incorretos')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/20">
            <Store size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Fiado Fácil</h1>
          <p className="text-primary-200 mt-1">Controle de Crediário</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Entrar na conta</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">E-mail</label>
              <input
                {...register('email')}
                type="email"
                className="input"
                placeholder="seu@email.com"
                autoFocus
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <input
                  {...register('senha')}
                  type={showPass ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.senha && <p className="text-red-500 text-xs mt-1">{errors.senha.message}</p>}
            </div>

            <button type="submit" className="btn-primary w-full mt-2" disabled={isSubmitting}>
              {isSubmitting ? <Spinner size="sm" /> : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-primary-200 text-sm mt-6">
          Fiado Fácil © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
