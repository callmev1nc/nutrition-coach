'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Moon, ChevronDown, ChevronUp, Clock, Sparkles, Shield, Brain, Zap, Target, Star } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type CravingType = 'sweet' | 'salty' | 'both' | 'emotional'

interface FormData {
  dinnerTime: string
  bedtime: string
  cravingType: CravingType | ''
  triggerFoods: string
  hungerAnswers: number[] // 1-5 per question, 1=physical, 5=emotional
}

interface DayProtocol {
  day: number
  week: number
  difficulty: 'easy' | 'moderate' | 'hard' | 'intense'
  layer1: string
  layer2: string
  layer3: string
  questions: string[]
}

// ---------------------------------------------------------------------------
// Hunger assessment questions
// ---------------------------------------------------------------------------
const hungerQuestions = [
  'When you feel hungry at night, is it usually after a stressful event?',
  'Do you crave specific foods (like chocolate or chips) rather than just feeling a general emptiness?',
  'If you eat the craved food, do you still feel satisfied or do you want more?',
  'Does the hunger come on suddenly rather than building gradually?',
  'When distracted by an engaging activity, do you forget about the hunger?',
]

const hungerLabels = [
  'Definitely physical',
  'Mostly physical',
  'Mixed',
  'Mostly emotional',
  'Definitely emotional',
]

// ---------------------------------------------------------------------------
// 14-day protocol -- static data
// ---------------------------------------------------------------------------
const protocolData: DayProtocol[] = [
  // ---- Week 1: Foundation (easier) ----
  {
    day: 1, week: 1, difficulty: 'easy',
    layer1: 'Drink a full glass of water, then wait 5 minutes before deciding to eat',
    layer2: 'Peppermint tea (0 cal) — peppermint naturally suppresses appetite',
    layer3: '5 almonds (35 cal)',
    questions: [
      'Am I physically hungry or just craving a sensation?',
      'What emotion am I feeling right now?',
      'Will eating right now help me reach my goal?',
    ],
  },
  {
    day: 2, week: 1, difficulty: 'easy',
    layer1: 'Brush your teeth immediately — mint flavor signals "eating is done" to your brain',
    layer2: 'Hot lemon water (0 cal) — warm liquid fills the stomach and lemon cuts sweet cravings',
    layer3: '1 celery stick (6 cal)',
    questions: [
      'When was the last time I ate a proper meal?',
      'Could I actually be thirsty instead of hungry?',
      'What can I do instead of eating right now?',
    ],
  },
  {
    day: 3, week: 1, difficulty: 'easy',
    layer1: 'Call or message a friend for a 5-minute chat to redirect your focus',
    layer2: 'Chamomile tea (0 cal) — calming herb that reduces stress-driven eating urges',
    layer3: '1 baby carrot (4 cal)',
    questions: [
      'Is something in my environment triggering this craving?',
      'How will I feel in 10 minutes if I eat vs. if I don\'t?',
      'What does my body actually need right now?',
    ],
  },
  {
    day: 4, week: 1, difficulty: 'easy',
    layer1: 'Take 10 deep belly breaths (4 seconds in, 7 hold, 8 out) to calm the craving response',
    layer2: 'Decaf green tea (0 cal) — contains L-theanine which reduces stress-driven hunger',
    layer3: '1 cup cucumber slices (16 cal)',
    questions: [
      'Is this a habit or true physical hunger?',
      'What would I tell a friend who felt this way?',
      'How can I comfort myself without food?',
    ],
  },
  {
    day: 5, week: 1, difficulty: 'moderate',
    layer1: 'Journal for 5 minutes — write down what you feel, what you want to eat, and why',
    layer2: 'Cinnamon warm water (0 cal) — cinnamon helps stabilize blood sugar and reduce sweet cravings',
    layer3: '1 cherry tomato (3 cal)',
    questions: [
      'What triggered this specific craving tonight?',
      'Did I eat enough protein at dinner?',
      'What healthy habit can replace this urge?',
    ],
  },
  {
    day: 6, week: 1, difficulty: 'moderate',
    layer1: 'Take a warm shower — the temperature change resets your nervous system',
    layer2: 'Ginger tea (0 cal) — ginger improves digestion and reduces false hunger signals',
    layer3: 'Half a pickle spear (5 cal)',
    questions: [
      'Is boredom driving this craving?',
      'Will tomorrow-me be grateful I resisted?',
      'What is one small win I can have right now?',
    ],
  },
  {
    day: 7, week: 1, difficulty: 'moderate',
    layer1: 'Do a 5-minute light stretch routine to release tension and shift focus',
    layer2: 'Sparkling water with lime (0 cal) — carbonation creates a feeling of fullness',
    layer3: '1 radish slice (1 cal)',
    questions: [
      'Am I restricting too much during the day?',
      'Is there something specific stressing me out?',
      'What would feel better than food right now?',
    ],
  },
  // ---- Week 2: Challenge (harder) ----
  {
    day: 8, week: 2, difficulty: 'hard',
    layer1: 'Wait 10 full minutes (not 5) — use a timer. Practice sitting with the discomfort',
    layer2: 'Peppermint tea + 10 deep breaths — combine two suppression methods for stronger effect',
    layer3: '3 almonds (21 cal)',
    questions: [
      'Rate my hunger 1-10. Is it truly above a 7?',
      'What time did I eat dinner? Is there a real caloric gap?',
      'Can I wait just 10 more minutes?',
    ],
  },
  {
    day: 9, week: 2, difficulty: 'hard',
    layer1: 'Read 5 pages of a physical book — engage your mind in a different narrative',
    layer2: 'Ice cucumber water (0 cal) — ice cold water with cucumber slices, sip slowly',
    layer3: '1 cup lettuce leaves (5 cal)',
    questions: [
      'Am I craving a specific nutrient or just sensation?',
      'Did I eat enough total calories today?',
      'What act of self-care can I do right now?',
    ],
  },
  {
    day: 10, week: 2, difficulty: 'hard',
    layer1: 'Body scan meditation (5 min) — check each body part for real vs. perceived hunger',
    layer2: 'Lemon-ginger warm water (0 cal) — double-action appetite suppressant blend',
    layer3: 'Half a celery stalk (3 cal)',
    questions: [
      'Is this craving connected to a specific feeling or event?',
      'What would my future-self want me to do?',
      'How can I channel this energy elsewhere?',
    ],
  },
  {
    day: 11, week: 2, difficulty: 'intense',
    layer1: 'Walk around your entire house for 5 minutes — physical movement breaks the craving loop',
    layer2: 'Chamomile tea + magnesium supplement — the combo promotes deep relaxation and reduces cortisol',
    layer3: '1 small pickle (5 cal)',
    questions: [
      'Am I actually hungry or just tired?',
      'Have I drunk enough water today?',
      'Is there a boundary I need to set with myself?',
    ],
  },
  {
    day: 12, week: 2, difficulty: 'intense',
    layer1: 'Organize one area of your home for 5 minutes — productivity replaces the eating ritual',
    layer2: 'Apple cider vinegar in warm water (0 cal) — ACV stabilizes blood sugar spikes that trigger cravings',
    layer3: '2 almonds (14 cal)',
    questions: [
      'Do I see a pattern in my cravings this week?',
      'Am I rewarding myself with food instead of acknowledging effort?',
      'What non-food reward would feel genuinely good?',
    ],
  },
  {
    day: 13, week: 2, difficulty: 'intense',
    layer1: 'Listen to calming music for 5 minutes with eyes closed — sensory substitution technique',
    layer2: 'Decaf black coffee (0 cal) — bitter flavor resets palate and suppresses appetite hormones',
    layer3: '1 cucumber slice (2 cal)',
    questions: [
      'Was my dinner satisfying enough nutritionally?',
      'What would happen if I just went to sleep instead?',
      'How strong is this craving on a 1-10 scale?',
    ],
  },
  {
    day: 14, week: 2, difficulty: 'intense',
    layer1: 'Write 3 things you are grateful for, then reflect on your 14-day journey and progress',
    layer2: 'Warm vegetable broth (0 cal) — savory, satisfying, signals the body that eating is complete',
    layer3: 'Ice chip — let it melt slowly (0 cal)',
    questions: [
      'What did I learn about my hunger patterns these 14 days?',
      'Which strategy worked best for me?',
      'What is my personal plan for tomorrow night and beyond?',
    ],
  },
]

// ---------------------------------------------------------------------------
// Difficulty badge config
// ---------------------------------------------------------------------------
const difficultyConfig = {
  easy:     { label: 'Easy',       bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-400' },
  moderate: { label: 'Moderate',   bg: 'bg-amber-500/15 text-amber-400 border-amber-500/20',     dot: 'bg-amber-400' },
  hard:     { label: 'Hard',       bg: 'bg-orange-500/15 text-orange-400 border-orange-500/20',   dot: 'bg-orange-400' },
  intense:  { label: 'Intense',    bg: 'bg-red-500/15 text-red-400 border-red-500/20',            dot: 'bg-red-400' },
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TimePicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-foreground text-sm">{label}</Label>
      <div className="relative">
        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none" />
        <input
          type="time"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full h-9 rounded-lg border border bg-background pl-9 pr-3 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none transition-colors"
        />
      </div>
    </div>
  )
}

function HungerAssessment({ answers, setAnswers }: { answers: number[]; setAnswers: (a: number[]) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Brain className="w-4 h-4 text-primary" />
        <p className="text-sm text-foreground font-medium">Hunger Type Assessment</p>
      </div>
      {hungerQuestions.map((q, qi) => (
        <div key={qi} className="space-y-2">
          <p className="text-sm text-muted-foreground">{qi + 1}. {q}</p>
          <div className="flex gap-1">
            {hungerLabels.map((label, li) => (
              <button
                key={li}
                type="button"
                onClick={() => {
                  const next = [...answers]
                  next[qi] = li + 1
                  setAnswers(next)
                }}
                className={`flex-1 py-1.5 px-1 rounded-md text-[10px] leading-tight font-medium transition-all border ${
                  answers[qi] === li + 1
                    ? 'bg-purple-500/20 text-primary border-primary/40'
                    : 'bg-background text-muted-foreground border hover:border-primary/20 hover:text-muted-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function DayCard({ p, isOpen, onToggle }: { p: DayProtocol; isOpen: boolean; onToggle: () => void }) {
  const diff = difficultyConfig[p.difficulty]
  return (
    <Card className="bg-card border overflow-hidden transition-colors hover:border-primary/20">
      {/* Header row — always visible */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-6 py-4 flex items-center justify-between gap-3 cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-foreground font-semibold text-sm shrink-0">Day {p.day}</span>
          <Badge className={`${diff.bg} border text-[10px]`}>{diff.label}</Badge>
          {p.week === 1 ? (
            <Badge className="bg-primary/15 text-primary border-primary/20 border text-[10px]">Week 1 &middot; Foundation</Badge>
          ) : (
            <Badge className="bg-primary/15 text-primary border-primary/20 border text-[10px]">Week 2 &middot; Challenge</Badge>
          )}
          <span className="text-xs text-muted-foreground truncate hidden sm:inline">
            {p.layer1.slice(0, 50)}...
          </span>
        </div>
        <div className="shrink-0 text-muted-foreground">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expandable body */}
      {isOpen && (
        <CardContent className="px-6 pb-5 pt-0 space-y-4">
          {/* Three defense layers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-background border border-primary/10">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Shield className="w-3.5 h-3.5 text-primary" />
                <p className="text-[11px] font-semibold text-primary uppercase tracking-wide">Layer 1: 5-Min Delay</p>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{p.layer1}</p>
            </div>
            <div className="p-3 rounded-lg bg-background border border-blue-500/10">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <p className="text-[11px] font-semibold text-blue-400 uppercase tracking-wide">Layer 2: Zero-Cal Suppress</p>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{p.layer2}</p>
            </div>
            <div className="p-3 rounded-lg bg-background border border-amber-500/10">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Target className="w-3.5 h-3.5 text-amber-400" />
                <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wide">Layer 3: Emergency (&lt;50 cal)</p>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{p.layer3}</p>
            </div>
          </div>

          {/* Reflection questions */}
          <div className="p-3 rounded-lg bg-background border border-primary/10">
            <div className="flex items-center gap-1.5 mb-2">
              <Brain className="w-3.5 h-3.5 text-primary" />
              <p className="text-[11px] font-semibold text-primary uppercase tracking-wide">Self-Reflection Questions</p>
            </div>
            <ol className="space-y-1">
              {p.questions.map((q, i) => (
                <li key={i} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-primary/70 font-medium shrink-0">{i + 1}.</span>
                  <span>{q}</span>
                </li>
              ))}
            </ol>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function NightHungerPage() {
  const [form, setForm] = useState<FormData>({
    dinnerTime: '',
    bedtime: '',
    cravingType: '',
    triggerFoods: '',
    hungerAnswers: [0, 0, 0, 0, 0],
  })
  const [started, setStarted] = useState(false)
  const [openDays, setOpenDays] = useState<Set<number>>(new Set())
  const [weekFilter, setWeekFilter] = useState<1 | 2 | 'all'>('all')

  const toggleDay = (day: number) => {
    setOpenDays(prev => {
      const next = new Set(prev)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  }

  const expandAll = (days: number[]) => setOpenDays(new Set(days))
  const collapseAll = () => setOpenDays(new Set())

  const formValid = form.dinnerTime && form.bedtime && form.cravingType && form.hungerAnswers.every(a => a > 0)

  const avgHunger = form.hungerAnswers.every(a => a > 0)
    ? form.hungerAnswers.reduce((s, a) => s + a, 0) / form.hungerAnswers.length
    : 0
  const hungerVerdict =
    avgHunger >= 3.5 ? 'Emotional hunger dominant' :
    avgHunger >= 2.5 ? 'Mixed hunger pattern' :
    'Physical hunger dominant'

  const filteredProtocol = protocolData.filter(p =>
    weekFilter === 'all' ? true : p.week === weekFilter
  )

  // ---- Form phase ----
  if (!started) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Moon className="w-7 h-7 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-primary">
            Night Hunger Protocol
          </h1>
          <p className="text-muted-foreground text-sm">Module 3 &middot; 14-Day Craving Elimination Program</p>
        </div>

        {/* Form card */}
        <Card className="bg-card border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Star className="w-4 h-4 text-primary" />
              Personalize Your Protocol
            </CardTitle>
            <p className="text-muted-foreground text-xs mt-1">
              Answer a few questions so we can tailor your 14-night plan.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Time pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TimePicker
                label="Usual Dinner Time"
                value={form.dinnerTime}
                onChange={v => setForm(f => ({ ...f, dinnerTime: v }))}
              />
              <TimePicker
                label="Usual Bedtime"
                value={form.bedtime}
                onChange={v => setForm(f => ({ ...f, bedtime: v }))}
              />
            </div>

            {/* Craving type */}
            <div className="space-y-1.5">
              <Label className="text-foreground text-sm">Craving Type</Label>
              <Select
                value={form.cravingType}
                onValueChange={(v) => { if (v) setForm(f => ({ ...f, cravingType: v as CravingType })) }}
              >
                <SelectTrigger className="w-full bg-background border text-foreground">
                  <SelectValue placeholder="Select your craving type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sweet">Sweet (chocolate, ice cream, candy)</SelectItem>
                  <SelectItem value="salty">Salty (chips, pretzels, cheese)</SelectItem>
                  <SelectItem value="both">Both sweet and salty</SelectItem>
                  <SelectItem value="emotional">Emotional (stress, boredom, comfort)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Trigger foods */}
            <div className="space-y-1.5">
              <Label className="text-foreground text-sm">Trigger Foods</Label>
              <Input
                value={form.triggerFoods}
                onChange={e => setForm(f => ({ ...f, triggerFoods: e.target.value }))}
                className="bg-background border text-foreground"
                placeholder="e.g. chocolate, chips, ice cream, cookies"
              />
            </div>

            {/* Hunger type assessment */}
            <HungerAssessment
              answers={form.hungerAnswers}
              setAnswers={a => setForm(f => ({ ...f, hungerAnswers: a }))}
            />

            {/* Assessment result preview */}
            {form.hungerAnswers.every(a => a > 0) && (
              <div className="p-3 rounded-lg bg-purple-500/5 border border-primary/15">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide">Assessment Result</p>
                </div>
                <p className="text-sm text-foreground">
                  {hungerVerdict}
                  {avgHunger >= 3.5 && (
                    <span className="text-primary/70"> — your protocol will emphasize emotional regulation techniques.</span>
                  )}
                  {avgHunger < 2.5 && (
                    <span className="text-primary/70"> — your protocol will emphasize satiety strategies and meal timing.</span>
                  )}
                  {avgHunger >= 2.5 && avgHunger < 3.5 && (
                    <span className="text-primary/70"> — your protocol balances both physical and emotional strategies.</span>
                  )}
                </p>
              </div>
            )}

            {/* Start button */}
            <Button
              onClick={() => setStarted(true)}
              disabled={!formValid}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed h-11 text-sm font-semibold"
            >
              <Moon className="w-4 h-4 mr-2" />
              Start 14-Day Protocol
            </Button>
            {!formValid && (
              <p className="text-xs text-muted-foreground text-center">Complete all fields to unlock your personalized protocol.</p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ---- Protocol phase ----
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-3">
          <Moon className="w-7 h-7 text-primary" />
          Night Hunger Protocol
        </h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setStarted(false); setOpenDays(new Set()) }}
          className="border text-muted-foreground hover:text-foreground hover:border-primary/30 text-xs"
        >
          Edit Profile
        </Button>
      </div>

      {/* Summary strip */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/10 border-primary/15">
        <CardContent className="py-3 px-5 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
          <span className="text-muted-foreground">Dinner: <span className="text-primary font-medium">{form.dinnerTime}</span></span>
          <span className="text-muted-foreground">Bed: <span className="text-primary font-medium">{form.bedtime}</span></span>
          <span className="text-muted-foreground">Craving: <span className="text-primary font-medium capitalize">{form.cravingType}</span></span>
          <span className="text-muted-foreground">Type: <span className="text-primary font-medium">{hungerVerdict}</span></span>
          {form.triggerFoods && (
            <span className="text-muted-foreground">Triggers: <span className="text-primary font-medium">{form.triggerFoods}</span></span>
          )}
        </CardContent>
      </Card>

      {/* Week filter + expand controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg overflow-hidden border border">
          {(['all', 1, 2] as const).map(w => (
            <button
              key={w}
              type="button"
              onClick={() => setWeekFilter(w)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                weekFilter === w
                  ? 'bg-purple-500/20 text-primary'
                  : 'bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              {w === 'all' ? 'All 14 Days' : `Week ${w}`}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => expandAll(filteredProtocol.map(p => p.day))}
            className="text-muted-foreground hover:text-primary text-xs h-7 px-2"
          >
            Expand All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={collapseAll}
            className="text-muted-foreground hover:text-primary text-xs h-7 px-2"
          >
            Collapse All
          </Button>
        </div>
      </div>

      {/* Week 1 summary card */}
      {(weekFilter === 'all' || weekFilter === 1) && (
        <Card className="bg-card border-primary/15">
          <CardHeader className="py-3 px-5">
            <CardTitle className="text-sm text-primary flex items-center gap-2">
              <Moon className="w-4 h-4" /> Week 1 &middot; Foundation Phase
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-3">
            <p className="text-xs text-muted-foreground">
              Build your defense system. Each night introduces a new delay technique, zero-calorie suppressant, and a micro-snack under 50 calories. Difficulty: Easy to Moderate.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Protocol days */}
      <div className="space-y-2">
        {filteredProtocol.map(p => (
          <DayCard
            key={p.day}
            p={p}
            isOpen={openDays.has(p.day)}
            onToggle={() => toggleDay(p.day)}
          />
        ))}
      </div>

      {/* Week 2 summary card (appears after days when showing all) */}
      {(weekFilter === 'all' || weekFilter === 2) && (
        <Card className="bg-card border-primary/15">
          <CardHeader className="py-3 px-5">
            <CardTitle className="text-sm text-primary flex items-center gap-2">
              <Zap className="w-4 h-4" /> Week 2 &middot; Challenge Phase
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-3">
            <p className="text-xs text-muted-foreground">
              Double down. Longer delays, combined suppression methods, and smaller emergency snacks. Difficulty: Hard to Intense. You are reprogramming your nighttime habits.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Completion card */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="py-6 text-center space-y-2">
          <Moon className="w-8 h-8 text-primary mx-auto" />
          <p className="text-foreground font-semibold">14 Nights to Freedom</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Each night you resist builds neural pathways that make the next night easier. By Day 14, your nighttime eating habit will be fundamentally rewired.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
