import { useState } from "react";
import { Check } from "lucide-react";

interface InfoStepperProps {
  currentStep: number;
  onStepClick: (step: number) => void;
}

const steps = [
  { label: "Ideia", icon: "💡" },
  { label: "Estrutura", icon: "🧠" },
  { label: "Conteúdo", icon: "📚" },
  { label: "Vídeos", icon: "🎬" },
  { label: "VSL", icon: "🎯" },
  { label: "Kit Vendas", icon: "🎨" },
  { label: "Entrega", icon: "🚀" },
];

const InfoStepper = ({ currentStep, onStepClick }: InfoStepperProps) => {
  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex items-center justify-between min-w-[600px] px-2">
        {steps.map((s, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;
          const isLocked = stepNum > currentStep;

          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => !isLocked && onStepClick(stepNum)}
                disabled={isLocked}
                className={`flex flex-col items-center gap-1 transition-all duration-300 ${
                  isLocked ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold transition-all duration-300 ${
                    isCompleted
                      ? "bg-accent text-accent-foreground"
                      : isActive
                      ? "bg-primary text-primary-foreground neon-glow scale-110"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : s.icon}
                </div>
                <span
                  className={`text-[10px] font-medium tracking-wide ${
                    isActive ? "text-primary" : isCompleted ? "text-accent" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
              </button>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 rounded-full transition-all ${
                    stepNum < currentStep ? "bg-accent" : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InfoStepper;
