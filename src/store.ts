import { createStore } from "zustand/vanilla"
import { useStore } from "zustand"
import {
  createInitialData,
  exerciseById,
  id,
  isGymData,
  parseReps,
  parseWeight,
  type Draft,
  type GymData,
  type Group,
  type StatKind,
} from "./model"

export const STORAGE_KEY = "ashel-gym-demo-v1"
export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}
interface GymStore {
  data: GymData
  warning: string | null
  start: () => void
  chooseGroup: (group: Group | null) => void
  chooseExercise: (exerciseId: number | null) => void
  addSet: (exerciseId: number, weight: string, reps: string) => boolean
  updateSet: (setId: string, weight: string, reps: string) => boolean
  removeSet: (setId: string) => void
  finish: () => boolean
  saveStat: (exerciseId: number, kind: StatKind, value: string) => boolean
  reset: () => void
}

export function createGymStore(
  storage?: StorageAdapter,
  initialData?: GymData,
) {
  let data = initialData ?? createInitialData()
  let warning: string | null = null
  if (!storage)
    warning =
      "Storage is unavailable. Changes will last until this page is closed."
  if (storage) {
    try {
      const saved = storage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed: unknown = JSON.parse(saved)
        if (isGymData(parsed)) data = parsed
        else
          warning =
            "Saved demo data could not be read. A fresh demo has been loaded."
      }
    } catch {
      warning =
        "Saved data is unavailable. The demo is running with fresh data."
    }
  }
  const store = createStore<GymStore>((set, get) => {
    const changeDraft = (patch: Partial<Draft>) => {
      const current = get().data
      if (current.draft)
        set({ data: { ...current, draft: { ...current.draft, ...patch } } })
    }
    return {
      data,
      warning,
      start: () => {
        const current = get().data
        if (current.draft) return
        const workoutId = id()
        set({
          data: {
            ...current,
            workouts: [
              ...current.workouts,
              {
                id: workoutId,
                createdAt: Date.now(),
                finishedAt: null,
                sets: [],
              },
            ],
            draft: { workoutId, group: null, exerciseId: null },
          },
        })
      },
      chooseGroup: (group) => changeDraft({ group, exerciseId: null }),
      chooseExercise: (exerciseId) => {
        if (
          exerciseId !== null &&
          exerciseById(exerciseId)?.group !== get().data.draft?.group
        )
          return
        changeDraft({ exerciseId })
      },
      addSet: (exerciseId, weight, reps) => {
        const current = get().data,
          w = parseWeight(weight),
          r = parseReps(reps)
        if (
          !current.draft ||
          !exerciseById(exerciseId) ||
          w === null ||
          r === null
        )
          return false
        set({
          data: {
            ...current,
            workouts: current.workouts.map((workout) =>
              workout.id === current.draft!.workoutId
                ? {
                    ...workout,
                    sets: [
                      ...workout.sets,
                      { id: id(), exerciseId, weight: w, reps: r },
                    ],
                  }
                : workout,
            ),
          },
        })
        return true
      },
      updateSet: (setId, weight, reps) => {
        const current = get().data,
          w = parseWeight(weight),
          r = parseReps(reps)
        if (!current.draft || w === null || r === null) return false
        set({
          data: {
            ...current,
            workouts: current.workouts.map((workout) =>
              workout.id === current.draft!.workoutId
                ? {
                    ...workout,
                    sets: workout.sets.map((s) =>
                      s.id === setId ? { ...s, weight: w, reps: r } : s,
                    ),
                  }
                : workout,
            ),
          },
        })
        return true
      },
      removeSet: (setId) => {
        const current = get().data
        set({
          data: {
            ...current,
            workouts: current.workouts.map((workout) =>
              workout.id === current.draft?.workoutId
                ? {
                    ...workout,
                    sets: workout.sets.filter((s) => s.id !== setId),
                  }
                : workout,
            ),
          },
        })
      },
      finish: () => {
        const current = get().data
        if (!current.draft) return false
        const workout = current.workouts.find(
          (w) => w.id === current.draft!.workoutId,
        )
        if (!workout?.sets.length) return false
        set({
          data: {
            ...current,
            draft: null,
            workouts: current.workouts.map((w) =>
              w.id === workout.id ? { ...w, finishedAt: Date.now() } : w,
            ),
          },
        })
        return true
      },
      saveStat: (exerciseId, kind, value) => {
        const current = get().data,
          weight = parseWeight(value),
          stats = current.stats[exerciseId]
        if (!stats || weight === null) return false
        if (stats[kind] === weight) return true
        const historyKey = kind === "work" ? "workHistory" : "maxHistory"
        set({
          data: {
            ...current,
            stats: {
              ...current.stats,
              [exerciseId]: {
                ...stats,
                [kind]: weight,
                [historyKey]: [
                  ...stats[historyKey],
                  { id: id(), value: weight, date: Date.now() },
                ],
              },
            },
          },
        })
        return true
      },
      reset: () => set({ data: createInitialData() }),
    }
  })
  store.subscribe((state, previous) => {
    if (state.data === previous.data || !storage) return
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state.data))
    } catch {
      if (
        state.warning !==
        "Changes cannot be saved. The demo will keep working until you reload."
      )
        store.setState({
          warning:
            "Changes cannot be saved. The demo will keep working until you reload.",
        })
    }
  })
  if (storage) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(store.getState().data))
    } catch {
      store.setState({
        warning:
          "Changes cannot be saved. The demo will keep working until you reload.",
      })
    }
  }
  return store
}

function browserStorage() {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}
export const gymStore = createGymStore(browserStorage())
export const useGym = () => useStore(gymStore)
