'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, X, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from './Button'
import { Select } from './Select'
import { TIPOS_DOCUMENTO } from '@/services/documento.service'

interface DocumentoUploadProps {
  agendamentoId: string
  onUpload: (arquivo: File, tipo: string) => Promise<void>
  onClose?: () => void
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentoUpload({ agendamentoId, onUpload, onClose }: DocumentoUploadProps) {
  const [tipo, setTipo] = useState('NFE')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    setArquivo(f)
    setErro(null)
    setSucesso(false)
    // Auto-detect tipo by filename
    const nome = f.name.toUpperCase()
    if (nome.includes('NFE') || nome.includes('NF-E')) setTipo('NFE')
    else if (nome.includes('CTE') || nome.includes('CT-E')) setTipo('CTE')
    else if (nome.includes('MDFE') || nome.includes('MDF-E')) setTipo('MDFE')
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [])

  const handleSubmit = async () => {
    if (!arquivo) return
    setUploading(true)
    setErro(null)
    try {
      await onUpload(arquivo, tipo)
      setSucesso(true)
      setArquivo(null)
      setTimeout(() => setSucesso(false), 3000)
    } catch (err: any) {
      setErro(err?.response?.data?.error?.message ?? 'Falha no upload')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Select
        label="Tipo de Documento"
        value={tipo}
        onValueChange={v => setTipo(v)}
        options={TIPOS_DOCUMENTO}
      />

      {/* Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
          ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}
      >
        <input ref={inputRef} type="file" className="hidden"
          accept=".xml,.pdf,.jpg,.jpeg,.png"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
        <p className="text-sm font-medium text-gray-600">
          {arquivo ? arquivo.name : 'Arraste o arquivo ou clique para selecionar'}
        </p>
        <p className="text-xs text-gray-400 mt-1">XML, PDF, JPG, PNG — máx 50 MB</p>
      </div>

      {/* Selected file info */}
      {arquivo && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-800 truncate">{arquivo.name}</p>
            <p className="text-xs text-blue-500">{formatBytes(arquivo.size)}</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); setArquivo(null) }} className="text-blue-400 hover:text-blue-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {sucesso && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle className="h-4 w-4" /> Upload realizado com sucesso
        </div>
      )}

      {erro && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4" /> {erro}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        {onClose && <Button variant="secondary" onClick={onClose}>Cancelar</Button>}
        <Button onClick={handleSubmit} loading={uploading} disabled={!arquivo}>
          <Upload className="h-4 w-4 mr-2" /> Enviar Documento
        </Button>
      </div>
    </div>
  )
}
