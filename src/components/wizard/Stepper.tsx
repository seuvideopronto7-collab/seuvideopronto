import { Check, Lock } from "lucide-react";

const STEPS = [
  { num: 1, label: "Entrada" },
  { num: 2, label: "Conteúdo" },
  { num: 3, label: "Análise" },
  { num: 4, label: "Modo" },
  { num: 5, label: "Roteiro" },
  { num: 6, label: "SEO" },
  { num: 7, label: "Variações" },
  { num: 8, label: "Montagem" },
  { num: 9, label: "Final" },
  { num: 10, label: "Publicação" },
];

interface StepperProps {
  currentStep: number;
  onStepClick: (step: number) => void;
}

const Stepper = ({ currentStep, onStepClick }: StepperProps) => {
  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex items-center gap-1 min-w-max px-1">
        {STEPS.map((step, i) => {
          const isCompleted = step.num < currentStep;
          const isCurrent = step.num === currentStep;
          const isLocked = step.num > currentStep;

          return (
            <div key={step.num} className="flex items-center">
              <button
                onClick={() => isCompleted && onStepClick(step.num)}
                disabled={isLocked}
                className={`
                  flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300
                  ${isCompleted
                    ? "bg-accent/15 text-accent cursor-pointer hover:bg-accent/25"
                    : isCurrent
                      ? "bg-primary/15 text-primary ring-1 ring-primary/40 shadow-[0_0_12px_-3px_hsl(var(--primary)/0.4)]"
                      : "bg-muted/30 text-muted-foreground/40 cursor-not-allowed"
                  }
                `}
              >
                <span className={`
                  w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0
                  ${isCompleted
                    ? "bg-accent text-accent-foreground"
                    : isCurrent
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground/50"
                  }
                `}>
                  {isCompleted ? <Check className="w-3 h-3" /> : isLocked ? <Lock className="w-2.5 h-2.5" /> : step.num}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`w-3 h-px mx-0.5 ${isCompleted ? "bg-accent/40" : "bg-border/30"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Stepper;
