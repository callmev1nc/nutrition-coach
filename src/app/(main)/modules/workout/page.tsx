'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import {
  Dumbbell,
  Check,
  Flame,
  Clock,
  Heart,
  Zap,
  Timer,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Target,
  TrendingUp,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  15 Base Exercises — const array per spec                           */
/* ------------------------------------------------------------------ */
const EXERCISES = [
  { id: 'seated-marches', name: 'Seated Marches', area: 'Lower Body', type: 'warmup', joint: 'easy' },
  { id: 'chair-squats', name: 'Chair Squats', area: 'Lower Body', type: 'compound', joint: 'easy' },
  { id: 'wall-pushups', name: 'Wall Push-ups', area: 'Upper Body', type: 'compound', joint: 'easy' },
  { id: 'calf-raises', name: 'Standing Calf Raises', area: 'Lower Body', type: 'isolation', joint: 'easy' },
  { id: 'leg-extensions', name: 'Seated Leg Extensions', area: 'Lower Body', type: 'isolation', joint: 'easy' },
  { id: 'glute-bridges', name: 'Glute Bridges', area: 'Lower Body', type: 'compound', joint: 'easy' },
  { id: 'bird-dogs', name: 'Bird Dogs', area: 'Core', type: 'stability', joint: 'easy' },
  { id: 'dead-bugs', name: 'Dead Bugs', area: 'Core', type: 'stability', joint: 'easy' },
  { id: 'torso-twists', name: 'Seated Torso Twists', area: 'Core', type: 'mobility', joint: 'easy' },
  { id: 'side-bends', name: 'Standing Side Bends', area: 'Core', type: 'isolation', joint: 'easy' },
  { id: 'arm-circles', name: 'Arm Circles', area: 'Upper Body', type: 'mobility', joint: 'easy' },
  { id: 'knee-tucks', name: 'Seated Knee Tucks', area: 'Core', type: 'isolation', joint: 'easy' },
  { id: 'wall-sit', name: 'Wall Sit', area: 'Lower Body', type: 'isometric', joint: 'moderate' },
  { id: 'step-ups', name: 'Step-ups (low)', area: 'Lower Body', type: 'compound', joint: 'moderate' },
  { id: 'modified-plank', name: 'Plank (modified)', area: 'Core', type: 'isometric', joint: 'easy' },
] as const

/* ------------------------------------------------------------------ */
/*  Week Config — progression per spec                                 */
/* ------------------------------------------------------------------ */
const WEEK_CONFIG = [
  { label: 'Week 1', sets: 3, pace: 'Slow', restSec: 60, intensity: 'Foundation', color: 'from-green-500 to-emerald-500', textColor: 'text-green-400', bgColor: 'bg-green-500/10' },
  { label: 'Week 2', sets: 4, pace: 'Medium', restSec: 45, intensity: 'Build', color: 'from-amber-500 to-orange-500', textColor: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  { label: 'Week 3', sets: 4, pace: 'Mixed', restSec: 30, intensity: 'Peak', color: 'from-red-500 to-rose-500', textColor: 'text-red-400', bgColor: 'bg-red-500/10' },
] as const

/* ------------------------------------------------------------------ */
/*  Day focus areas                                                    */
/* ------------------------------------------------------------------ */
const DAY_FOCUS = [
  { label: 'Full Body', icon: Target },
  { label: 'Lower Body', icon: Dumbbell },
  { label: 'Upper Body', icon: Zap },
  { label: 'Core & Balance', icon: Heart },
  { label: 'Full Body', icon: Target },
  { label: 'Active Recovery', icon: Timer },
  { label: 'Rest & Stretch', icon: Clock },
] as const

/* ------------------------------------------------------------------ */
/*  Exercise selector per day — curated groupings                      */
/* ------------------------------------------------------------------ */
const DAY_EXERCISE_MAP: number[][] = [
  // Day 1 — Full Body
  [0, 1, 2, 5, 7, 10],
  // Day 2 — Lower Body
  [0, 1, 3, 4, 5, 12],
  // Day 3 — Upper Body
  [2, 10, 8, 6, 9, 11],
  // Day 4 — Core & Balance
  [6, 7, 8, 9, 11, 14],
  // Day 5 — Full Body
  [1, 2, 5, 14, 4, 3],
  // Day 6 — Active Recovery (gentle)
  [0, 10, 8, 9],
  // Day 7 — Rest
  [],
]

interface ExerciseEntry {
  name: string
  sets: number
  reps: string
  rest: string
  pace: string
}

interface DayPlan {
  sections: {
    label: string
    exercises: ExerciseEntry[]
  }[]
  duration: number
  totalExercises: number
}

function getDayPlan(weekIdx: number, dayIdx: number): DayPlan {
  const cfg = WEEK_CONFIG[weekIdx]
  const isRest = dayIdx === 6
  const isRecovery = dayIdx === 5

  if (isRest) {
    return {
      sections: [
        {
          label: 'Gentle Stretch',
          exercises: [
            { name: 'Neck rolls', sets: 1, reps: '60s each direction', rest: '—', pace: 'Slow' },
            { name: 'Seated forward fold', sets: 1, reps: '60s hold', rest: '—', pace: 'Slow' },
            { name: 'Cat-cow stretch', sets: 1, reps: '60s', rest: '—', pace: 'Slow' },
          ],
        },
      ],
      duration: 8,
      totalExercises: 3,
    }
  }

  const indices = DAY_EXERCISE_MAP[dayIdx]
  const mainExercises: ExerciseEntry[] = indices.map((idx) => {
    const ex = EXERCISES[idx]
    if (isRecovery) {
      return { name: ex.name, sets: 2, reps: '30s hold', rest: `${cfg.restSec}s`, pace: 'Slow' }
    }
    return {
      name: ex.name,
      sets: cfg.sets,
      reps: ex.type === 'isometric' || ex.type === 'stability' ? '20-30s hold' : '10-12 reps',
      rest: `${cfg.restSec}s`,
      pace: cfg.pace === 'Mixed' ? (ex.type === 'compound' ? 'Fast' : 'Slow') : cfg.pace,
    }
  })

  const warmup: ExerciseEntry[] = [
    { name: 'Arm Circles', sets: 1, reps: '30s forward + back', rest: '—', pace: 'Slow' },
    { name: 'Seated Marches', sets: 1, reps: '60s', rest: '—', pace: 'Slow' },
    { name: 'Torso twists', sets: 1, reps: '30s', rest: '—', pace: 'Slow' },
  ]

  const cooldown: ExerciseEntry[] = [
    { name: 'Deep breathing', sets: 1, reps: '30s', rest: '—', pace: 'Slow' },
    { name: 'Standing stretch', sets: 1, reps: '30s each side', rest: '—', pace: 'Slow' },
    { name: 'Forward fold', sets: 1, reps: '30s hold', rest: '—', pace: 'Slow' },
  ]

  const baseDuration = isRecovery ? 14 : 20 + weekIdx * 2
  const clampedDuration = Math.min(baseDuration, 25)

  return {
    sections: [
      { label: 'Warm-Up', exercises: warmup },
      { label: isRecovery ? 'Low Pace Block' : 'Low Pace Block', exercises: mainExercises.slice(0, Math.ceil(mainExercises.length / 2)) },
      ...(isRecovery
        ? []
        : [{ label: 'Medium Pace Block', exercises: mainExercises.slice(Math.ceil(mainExercises.length / 2)) }]),
      ...(isRecovery
        ? [{ label: 'Active Recovery', exercises: cooldown }]
        : [{ label: 'Cool Down', exercises: cooldown }]),
    ],
    duration: clampedDuration,
    totalExercises: mainExercises.length + warmup.length + cooldown.length,
  }
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function WorkoutPage() {
  const [activeWeek, setActiveWeek] = useState(0)
  const [completedDays, setCompletedDays] = useState<Set<string>>(new Set())
  const [scrollDay, setScrollDay] = useState(0)
  const [loading, setLoading] = useState(true)

  const totalCompleted = completedDays.size
  const progressPct = Math.round((totalCompleted / 21) * 100)

  useEffect(() => {
    loadCompleted()
  }, [])

  const loadCompleted = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/workout')
      const json = await res.json()
      if (json.completed) {
        setCompletedDays(new Set(json.completed))
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleComplete = useCallback(async (weekIdx: number, dayIdx: number) => {
    const key = `${weekIdx}-${dayIdx}`
    const isCurrentlyDone = completedDays.has(key)
    const newDone = !isCurrentlyDone

    setCompletedDays((prev) => {
      const next = new Set(prev)
      if (newDone) {
        next.add(key)
      } else {
        next.delete(key)
      }
      return next
    })

    await fetch('/api/workout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week: weekIdx, day: dayIdx, completed: newDone }),
    })
  }, [completedDays])

  const weekCompleted = (weekIdx: number) => {
    let count = 0
    for (let d = 0; d < 7; d++) {
      if (completedDays.has(`${weekIdx}-${d}`)) count++
    }
    return count
  }

  const scrollDays = (direction: 'left' | 'right') => {
    setScrollDay((prev) => {
      if (direction === 'left') return Math.max(0, prev - 1)
      return Math.min(6, prev + 1)
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="animate-pulse h-12 w-12 rounded-xl bg-muted" />
          <div className="space-y-2">
            <div className="animate-pulse h-6 w-64 rounded-lg bg-muted" />
            <div className="animate-pulse h-4 w-96 rounded-lg bg-muted" />
          </div>
        </div>
        <div className="animate-pulse h-20 w-full rounded-lg bg-muted" />
        <div className="animate-pulse h-12 w-full rounded-lg bg-muted" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="animate-pulse h-40 rounded-lg bg-muted" />
          <div className="animate-pulse h-40 rounded-lg bg-muted" />
          <div className="animate-pulse h-40 rounded-lg bg-muted" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-sm shrink-0">
          <Dumbbell className="h-6 w-6 text-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-primary">
            21-Day Low Impact Program
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            No jumping &bull; Silent workouts &bull; Chair + Mat only &bull; Max 25 min &bull; Joint friendly
          </p>
        </div>
      </div>

      {/* ---- Overall Progress Bar ---- */}
      <Card className="bg-card border">
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground font-medium">Progress</span>
            </div>
            <div className="flex-1">
              <div className="h-3 rounded-full bg-background overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-bold text-primary">{totalCompleted}</span>
              <span className="text-sm text-muted-foreground">/21 days</span>
              <Badge className="bg-emerald-500/15 text-primary border-primary/20 text-[10px] px-1.5">
                {progressPct}%
              </Badge>
            </div>
          </div>
          {totalCompleted === 21 && (
            <div className="mt-3 rounded-lg bg-primary/10 border border-primary/20 p-3 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <p className="text-sm text-primary font-medium">
                Congratulations! You completed the entire 21-Day program!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---- Week Selector Tabs ---- */}
      <Tabs
        value={String(activeWeek)}
        onValueChange={(v: string) => {
          setActiveWeek(Number(v))
          setScrollDay(0)
        }}
      >
        <TabsList className="bg-card border border">
          {WEEK_CONFIG.map((w, i) => {
            const wc = weekCompleted(i)
            return (
              <TabsTrigger
                key={i}
                value={String(i)}
                className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
              >
                <span>{w.label}</span>
                <Badge
                  className={`ml-1.5 text-[9px] px-1 py-0 ${
                    wc === 7
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-border text-muted-foreground'
                  }`}
                >
                  {wc}/7
                </Badge>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {WEEK_CONFIG.map((weekCfg, weekIdx) => (
          <TabsContent key={weekIdx} value={String(weekIdx)} className="mt-4">
            {/* ---- Week Summary ---- */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 ${weekCfg.bgColor}`}>
                <Flame className={`h-3.5 w-3.5 ${weekCfg.textColor}`} />
                <span className={`text-xs font-medium ${weekCfg.textColor}`}>
                  {weekCfg.intensity}
                </span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-card border border px-3 py-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {weekCfg.sets} sets &bull; {weekCfg.pace} pace &bull; {weekCfg.restSec}s rest
                </span>
              </div>
            </div>

            {/* ---- Horizontal Day Scroll ---- */}
            <div className="relative">
              {/* Scroll navigation arrows */}
              <button
                onClick={() => scrollDays('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-card border border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-gray-500 transition-colors -ml-4 shadow-lg"
                style={{ display: scrollDay > 0 ? 'flex' : 'none' }}
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => scrollDays('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-card border border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-gray-500 transition-colors -mr-4 shadow-lg"
                style={{ display: scrollDay < 6 ? 'flex' : 'none' }}
                aria-label="Scroll right"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <div className="overflow-x-auto pb-2 scrollbar-thin">
                <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
                  {DAY_FOCUS.map((day, dayIdx) => {
                    const plan = getDayPlan(weekIdx, dayIdx)
                    const done = completedDays.has(`${weekIdx}-${dayIdx}`)
                    const isRest = dayIdx === 6
                    const isRecovery = dayIdx === 5
                    const DayIcon = day.icon

                    return (
                      <div
                        key={dayIdx}
                        className="w-[300px] shrink-0"
                      >
                        <Card
                          className={`bg-card border h-full flex flex-col transition-all duration-200 ${
                            done
                              ? 'ring-1 ring-green-500/40 bg-green-500/[0.03]'
                              : ''
                          } ${isRest ? 'opacity-70' : ''}`}
                        >
                          {/* Day Header */}
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                                    done
                                      ? 'bg-green-500/20'
                                      : isRest
                                        ? 'bg-gray-500/10'
                                        : 'bg-background'
                                  }`}
                                >
                                  {done ? (
                                    <Check className="h-4 w-4 text-green-400" />
                                  ) : (
                                    <DayIcon className={`h-4 w-4 ${isRest ? 'text-gray-600' : 'text-muted-foreground'}`} />
                                  )}
                                </div>
                                <div>
                                  <CardTitle className="text-sm text-foreground">
                                    Day {dayIdx + 1}
                                  </CardTitle>
                                  <p className={`text-[11px] ${done ? 'text-green-400/70' : 'text-muted-foreground'}`}>
                                    {day.label}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {done && (
                                  <Badge className="bg-green-500/20 text-green-400 text-[10px] border-green-500/20">
                                    Done
                                  </Badge>
                                )}
                                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {plan.duration}m
                                </div>
                              </div>
                            </div>
                          </CardHeader>

                          {/* Exercise List */}
                          <CardContent className="flex-1 flex flex-col gap-3">
                            {isRest ? (
                              <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
                                <Clock className="h-8 w-8 text-gray-600 mb-2" />
                                <p className="text-sm text-muted-foreground">Rest day</p>
                                <p className="text-xs text-gray-600 mt-1">
                                  Stretch, walk, hydrate, recover
                                </p>
                              </div>
                            ) : (
                              <div className="flex-1 space-y-3">
                                {plan.sections.map((section, si) => (
                                  <div key={si}>
                                    <p className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold mb-1.5">
                                      {section.label}
                                    </p>
                                    <div className="space-y-1">
                                      {section.exercises.map((ex, ei) => (
                                        <div
                                          key={ei}
                                          className="flex items-start gap-2 rounded-md bg-background/50 px-2 py-1.5"
                                        >
                                          <div className="mt-1 h-1.5 w-1.5 rounded-full bg-gray-600 shrink-0" />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs text-foreground truncate">
                                              {ex.name}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                              <span className="text-[10px] text-muted-foreground">
                                                {ex.sets}x {ex.reps}
                                              </span>
                                              {ex.rest !== '—' && (
                                                <span className="text-[10px] text-gray-600">
                                                  {ex.rest} rest
                                                </span>
                                              )}
                                              {isRecovery && (
                                                <span className="text-[10px] text-blue-400/60">
                                                  gentle
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Duration Badge */}
                            {!isRest && (
                              <div className="flex items-center justify-between pt-2 border-t border/50">
                                <div className="flex items-center gap-1.5">
                                  <Flame className="h-3 w-3 text-orange-400" />
                                  <span className="text-[11px] text-muted-foreground">
                                    {plan.totalExercises} exercises
                                  </span>
                                </div>
                                <Badge className={`text-[10px] ${weekCfg.bgColor} ${weekCfg.textColor} border-0`}>
                                  {weekCfg.sets} sets
                                </Badge>
                              </div>
                            )}

                            {/* Mark Complete Button */}
                            <Button
                              onClick={() => toggleComplete(weekIdx, dayIdx)}
                              size="sm"
                              className={`w-full mt-1 transition-all duration-200 ${
                                done
                                  ? 'bg-transparent border border-green-500/30 text-green-400 hover:bg-green-500/10'
                                  : isRest
                                    ? 'bg-gray-700 hover:bg-gray-600 text-foreground'
                                    : 'bg-primary text-primary-foreground'
                              }`}
                            >
                              {done ? (
                                <>
                                  <Check className="h-3.5 w-3.5 mr-1" />
                                  Completed
                                </>
                              ) : (
                                'Mark Complete'
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* ---- Day dot indicators ---- */}
            <div className="flex items-center justify-center gap-2 mt-4">
              {DAY_FOCUS.map((_, dayIdx) => {
                const done = completedDays.has(`${weekIdx}-${dayIdx}`)
                const isCurrent = dayIdx === scrollDay
                return (
                  <button
                    key={dayIdx}
                    onClick={() => setScrollDay(dayIdx)}
                    className={`h-2 rounded-full transition-all duration-200 ${
                      done
                        ? 'bg-green-500 w-4'
                        : isCurrent
                          ? 'bg-gray-400 w-4'
                          : 'bg-gray-700 w-2 hover:bg-gray-600'
                    }`}
                    aria-label={`Go to day ${dayIdx + 1}`}
                  />
                )
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* ---- Program Info Cards ---- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border">
          <CardHeader>
            <CardTitle className="text-sm text-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-green-400" />
              Program Structure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Each session follows: <span className="text-green-400">Warm-Up</span> &rarr;{' '}
              <span className="text-amber-400">Low Pace Block</span> &rarr;{' '}
              <span className="text-orange-400">Medium Pace Block</span> &rarr;{' '}
              <span className="text-blue-400">Active Recovery</span> &rarr;{' '}
              <span className="text-purple-400">Cool Down</span>.
              Rest days on Day 7 each week.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border">
          <CardHeader>
            <CardTitle className="text-sm text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-400" />
              Weekly Progression
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500/15 text-green-400 border-0 text-[10px]">W1</Badge>
                <span className="text-xs text-muted-foreground">3 sets, slow pace, 60s rest</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-500/15 text-amber-400 border-0 text-[10px]">W2</Badge>
                <span className="text-xs text-muted-foreground">4 sets, medium pace, 45s rest</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-red-500/15 text-red-400 border-0 text-[10px]">W3</Badge>
                <span className="text-xs text-muted-foreground">4 sets, mixed pace, 30s rest</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border">
          <CardHeader>
            <CardTitle className="text-sm text-foreground flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-purple-400" />
              15 Safe Movements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {EXERCISES.map((e) => e.name).join(', ')}
            </p>
            <p className="text-[10px] text-gray-600 mt-2">
              All movements are joint-friendly and require only a chair and mat.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
