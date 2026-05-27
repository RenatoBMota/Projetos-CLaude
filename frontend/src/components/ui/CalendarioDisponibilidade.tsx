'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { disponibilidadeService, DisponibilidadeResponse, SlotResponse } from '@/services/disponibilidade.service'

interface CalendarioDisponibilidadeProps {
  janelaId: string
  onSlotSelect: (data: string, slot: SlotResponse) => void
  selectedData?: string
  selectedHorario?: string
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return { firstDay, daysInMonth }
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function CalendarioDisponibilidade({
  janelaId, onSlotSelect, selectedData, selectedHorario,
}: CalendarioDisponibilidadeProps) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<string | null>(selectedData ?? null)
  const [disponibilidade, setDisponibilidade] = useState<DisponibilidadeResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const { firstDay, daysInMonth } = getMonthDays(viewYear, viewMonth)

  const loadDisponibilidade = useCallback(async (data: string) => {
    setLoading(true)
    try {
      const res = await disponibilidadeService.consultar(janelaId, data)
      setDisponibilidade(res.data.data)
    } catch {
      setDisponibilidade(null)
    } finally {
      setLoading(false)
    }
  }, [janelaId])

  useEffect(() => {
    if (selectedDay) loadDisponibilidade(selectedDay)
  }, [selectedDay, loadDisponibilidade])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                      'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  const dayNames = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

  const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate())

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Calendar */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h3 className="font-semibold text-gray-900">
            {monthNames[viewMonth]} {viewYear}
          </h3>
          <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dateStr = formatDate(viewYear, viewMonth, day)
            const isPast = dateStr < todayStr
            const isSelected = dateStr === selectedDay

            return (
              <button
                key={day}
                disabled={isPast}
                onClick={() => setSelectedDay(dateStr)}
                className={`aspect-square rounded-lg text-sm font-medium transition-colors
                  ${isPast ? 'text-gray-300 cursor-not-allowed'
                    : isSelected ? 'bg-blue-600 text-white'
                    : 'hover:bg-blue-50 text-gray-700'}`}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>

      {/* Slots */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {selectedDay ? `Horários — ${selectedDay.split('-').reverse().join('/')}` : 'Selecione uma data'}
        </h3>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        )}

        {!loading && disponibilidade && (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {disponibilidade.diaBloqueado && (
              <div className="text-center py-4 text-red-600 font-medium">
                Dia bloqueado para agendamentos
              </div>
            )}
            {!disponibilidade.diaBloqueado && disponibilidade.slots.map((slot, idx) => {
              const isSelected = slot.horarioInicio === selectedHorario && selectedDay === selectedDay
              const available = slot.disponivel > 0 && !slot.bloqueado

              return (
                <button
                  key={idx}
                  disabled={!available}
                  onClick={() => available && selectedDay && onSlotSelect(selectedDay, slot)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border text-sm transition-colors
                    ${!available ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                      : isSelected ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700'}`}
                >
                  <span className="font-medium">
                    {slot.horarioInicio} – {slot.horarioFim}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    slot.bloqueado ? 'bg-red-100 text-red-700'
                      : slot.disponivel === 0 ? 'bg-orange-100 text-orange-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {slot.bloqueado ? 'Bloqueado'
                      : slot.disponivel === 0 ? 'Lotado'
                      : `${slot.disponivel} vaga${slot.disponivel !== 1 ? 's' : ''}`}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {!loading && !disponibilidade && selectedDay && (
          <p className="text-center text-gray-500 py-8">Erro ao carregar disponibilidade</p>
        )}
        {!loading && !selectedDay && (
          <p className="text-center text-gray-400 py-8">Selecione uma data no calendário</p>
        )}
      </div>
    </div>
  )
}
