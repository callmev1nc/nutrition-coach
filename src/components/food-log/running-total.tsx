interface RunningTotalProps {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g?: number
  label?: string
  compact?: boolean
}

export function RunningTotal({
  calories,
  protein_g,
  carbs_g,
  fat_g,
  fiber_g,
  label = 'Total',
  compact,
}: RunningTotalProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{Math.round(calories)} kcal</span>
        <span>P {Math.round(protein_g)}g</span>
        <span>C {Math.round(carbs_g)}g</span>
        <span>F {Math.round(fat_g)}g</span>
        {fiber_g != null && <span>Fib {Math.round(fiber_g)}g</span>}
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
      <div className="flex items-baseline gap-4">
        <div className="text-lg font-bold tabular-nums">{Math.round(calories)}</div>
        <span className="text-xs text-muted-foreground">kcal</span>
        <div className="ml-auto flex gap-3 text-xs tabular-nums text-muted-foreground">
          <span className="text-protein">P {Math.round(protein_g)}g</span>
          <span className="text-carbs">C {Math.round(carbs_g)}g</span>
          <span className="text-fat">F {Math.round(fat_g)}g</span>
          {fiber_g != null && <span>Fib {Math.round(fiber_g)}g</span>}
        </div>
      </div>
    </div>
  )
}
