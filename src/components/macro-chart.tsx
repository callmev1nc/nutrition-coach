'use client'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

interface ChartData {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

export function MacroChart({ data }: { data: ChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '13px' }} />
        <Bar dataKey="protein" name="Protein" fill="#EC4899" radius={[4, 4, 0, 0]} />
        <Bar dataKey="carbs" name="Carbs" fill="#3B82F6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="fat" name="Fat" fill="#FBBF24" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
