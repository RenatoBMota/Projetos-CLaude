'use client'

import { Check } from 'lucide-react'

interface Step {
  label: string
  description?: string
}

interface StepperProps {
  steps: Step[]
  currentStep: number
}

export function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep
          const isLast = index === steps.length - 1

          return (
            <li key={index} className={`flex items-center ${!isLast ? 'flex-1' : ''}`}>
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${
                    isCompleted
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : isCurrent
                      ? 'border-blue-600 bg-white text-blue-600'
                      : 'border-gray-300 bg-white text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p className={`text-xs font-medium ${isCurrent ? 'text-blue-600' : isCompleted ? 'text-gray-700' : 'text-gray-400'}`}>
                    {step.label}
                  </p>
                  {step.description && (
                    <p className="text-xs text-gray-400 hidden sm:block">{step.description}</p>
                  )}
                </div>
              </div>
              {!isLast && (
                <div className={`flex-1 h-0.5 mx-3 mb-6 ${isCompleted ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
