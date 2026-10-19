import catalog from "./catalog.json"

export const groups = [
  "back",
  "chest",
  "biceps",
  "triceps",
  "legs",
  "shoulders",
] as const
export type Group = (typeof groups)[number]
export interface Exercise {
  id: number
  group: Group
  name: string
  image: string
}
export const exercises: Exercise[] = catalog.map((e) => ({
  ...e,
  group: e.group as Group,
}))
export const exerciseById = (id: number) => exercises.find((e) => e.id === id)
export const asset = (path: string) =>
  `${import.meta.env.BASE_URL}assets/${path}`
export const groupImage = (group: Group) =>
  asset(`images/muscleGroups/${group}_gradient.png`)
export const capitalize = (text: string) =>
  text[0].toUpperCase() + text.slice(1)
export type StatKind = "work" | "max"
export interface HistoryEntry {
  id: string
  value: number
  date: number
}
export interface ExerciseStats {
  work: number
  max: number
  workHistory: HistoryEntry[]
  maxHistory: HistoryEntry[]
}
export interface ExerciseSet {
  id: string
  exerciseId: number
  weight: number
  reps: number
}
export interface Workout {
  id: string
  createdAt: number
  finishedAt: number | null
  sets: ExerciseSet[]
}
export interface Draft {
  workoutId: string
  group: Group | null
  exerciseId: number | null
}
export interface GymData {
  version: 1
  workouts: Workout[]
  stats: Record<number, ExerciseStats>
  draft: Draft | null
}
export const id = () => crypto.randomUUID()
export const dayKey = (date: Date | number) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
export const monthLabel = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
export const dateLabel = (date: number) =>
  new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })

export function parseWeight(value: string): number | null {
  if (!/^\d+(?:[.,]\d+)?$/.test(value.trim())) return null
  const number = Number(value.trim().replace(",", "."))
  return Number.isFinite(number) && number >= 0 && number <= 9999
    ? number
    : null
}
export function parseReps(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null
  const number = Number(value)
  return Number.isSafeInteger(number) && number > 0 && number <= 999
    ? number
    : null
}

export function createInitialData(now = new Date()): GymData {
  const stats: GymData["stats"] = {}
  for (const exercise of exercises) {
    const base =
      exercise.group === "legs" || exercise.id === 1
        ? 70
        : exercise.group === "biceps" || exercise.group === "triceps"
          ? 15
          : 35
    const history = (kind: StatKind): HistoryEntry[] =>
      Array.from({ length: 6 }, (_, index) => {
        const date = new Date(now)
        date.setDate(date.getDate() - (5 - index) * 9 - 2)
        date.setHours(18, 30, 0, 0)
        return {
          id: id(),
          value: base + index * 2.5 + (kind === "max" ? 15 : 0),
          date: date.getTime(),
        }
      })
    const workHistory = history("work"),
      maxHistory = history("max")
    stats[exercise.id] = {
      work: workHistory.at(-1)!.value,
      max: maxHistory.at(-1)!.value,
      workHistory,
      maxHistory,
    }
  }
  const workouts: Workout[] = []
  for (let offset = 2; offset < 59; offset += 3) {
    const date = new Date(now)
    date.setDate(date.getDate() - offset)
    date.setHours(18, 0, 0, 0)
    const group = groups[Math.floor(offset / 3) % groups.length]
    const selected = exercises.filter((e) => e.group === group).slice(0, 3)
    workouts.push({
      id: id(),
      createdAt: +date,
      finishedAt: +date + 48 * 60_000,
      sets: selected.flatMap((exercise) =>
        Array.from({ length: 3 }, () => ({
          id: id(),
          exerciseId: exercise.id,
          weight: stats[exercise.id].work - Math.floor(offset / 12) * 2.5,
          reps: 10,
        })),
      ),
    })
  }
  return { version: 1, workouts, stats, draft: null }
}

export function summarize(workouts: Workout[]) {
  const completed = workouts.filter(
    (w) => w.finishedAt !== null && w.sets.length > 0,
  )
  const sets = completed.flatMap((w) => w.sets)
  const counts = new Map<Group, number>()
  for (const set of sets) {
    const group = exerciseById(set.exerciseId)!.group
    counts.set(group, (counts.get(group) ?? 0) + 1)
  }
  return {
    workouts: completed.length,
    sets: sets.length,
    volume: sets.reduce((sum, set) => sum + set.weight * set.reps, 0),
    favorite: [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
  }
}

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value)
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
const validWeight = (value: unknown): value is number =>
  finite(value) && value <= 9999
const validExercise = (value: unknown) =>
  typeof value === "number" && !!exerciseById(value)
const validHistory = (value: unknown) =>
  Array.isArray(value) &&
  value.every(
    (h) =>
      record(h) &&
      typeof h.id === "string" &&
      validWeight(h.value) &&
      finite(h.date),
  )

export function isGymData(value: unknown): value is GymData {
  if (
    !record(value) ||
    value.version !== 1 ||
    !Array.isArray(value.workouts) ||
    !record(value.stats)
  )
    return false
  if (
    !value.workouts.every(
      (w) =>
        record(w) &&
        typeof w.id === "string" &&
        finite(w.createdAt) &&
        (w.finishedAt === null || finite(w.finishedAt)) &&
        Array.isArray(w.sets) &&
        w.sets.every(
          (s) =>
            record(s) &&
            typeof s.id === "string" &&
            validExercise(s.exerciseId) &&
            validWeight(s.weight) &&
            finite(s.reps) &&
            Number.isInteger(s.reps) &&
            s.reps > 0 &&
            s.reps <= 999,
        ),
    )
  )
    return false
  const stats = value.stats
  if (
    !exercises.every((e) => {
      const s = stats[e.id]
      return (
        record(s) &&
        validWeight(s.work) &&
        validWeight(s.max) &&
        validHistory(s.workHistory) &&
        validHistory(s.maxHistory)
      )
    })
  )
    return false
  const draft = value.draft
  if (draft === null) return value.workouts.every((w) => w.finishedAt !== null)
  if (
    !record(draft) ||
    typeof draft.workoutId !== "string" ||
    !(draft.group === null || groups.includes(draft.group as Group)) ||
    !(draft.exerciseId === null || validExercise(draft.exerciseId))
  )
    return false
  if (
    draft.exerciseId !== null &&
    exerciseById(draft.exerciseId as number)?.group !== draft.group
  )
    return false
  return (
    value.workouts.filter((w) => w.finishedAt === null).length === 1 &&
    value.workouts.some(
      (w) => w.id === draft.workoutId && w.finishedAt === null,
    )
  )
}
