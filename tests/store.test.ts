import { test } from "node:test"
import assert from "node:assert/strict"
import {
  createInitialData,
  dayKey,
  exercises,
  groups,
  isGymData,
  parseReps,
  parseWeight,
  summarize,
} from "../src/model.ts"
import {
  createGymStore,
  STORAGE_KEY,
  type StorageAdapter,
} from "../src/store.ts"

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}

test("catalog and fresh data cover all groups, recent months, and weight histories", () => {
  const now = new Date(2026, 9, 19, 12),
    data = createInitialData(now)
  assert.equal(exercises.length, 46)
  assert.deepEqual([...new Set(exercises.map((e) => e.group))], [...groups])
  assert.ok(isGymData(data))
  assert.ok(
    data.workouts.every(
      (w) => w.createdAt < +now && w.createdAt > +now - 60 * 86_400_000,
    ),
  )
  assert.ok(exercises.every((e) => data.stats[e.id].workHistory.length > 1))
})

test("workout with several exercises persists, resumes, and appears in day summary", () => {
  const storage = memoryStorage(),
    store = createGymStore(storage)
  store.getState().start()
  store.getState().chooseGroup("back")
  store.getState().chooseExercise(1)
  assert.ok(store.getState().addSet(1, "82,5", "12"))
  let restored = createGymStore(storage)
  assert.equal(restored.getState().data.draft?.exerciseId, 1)
  restored.getState().chooseExercise(2)
  restored.getState().addSet(2, "45", "10")
  const workoutId = restored.getState().data.draft!.workoutId
  assert.ok(restored.getState().finish())
  restored = createGymStore(storage)
  assert.equal(restored.getState().data.draft, null)
  const workout = restored
    .getState()
    .data.workouts.find((w) => w.id === workoutId)!
  assert.equal(workout.sets.length, 2)
  assert.equal(dayKey(workout.createdAt), dayKey(Date.now()))
  assert.deepEqual(summarize([workout]), {
    workouts: 1,
    sets: 2,
    volume: 1440,
    favorite: "back",
  })
})

test("editing and removing sets, empty workout rejection, and invalid inputs", () => {
  const store = createGymStore(memoryStorage())
  store.getState().start()
  assert.equal(store.getState().finish(), false)
  for (const [weight, reps] of [
    ["-2", "10"],
    ["Infinity", "1"],
    ["4", "0"],
    ["4", "1.5"],
    ["", "10"],
    ["10000", "10"],
  ])
    assert.equal(store.getState().addSet(1, weight, reps), false)
  store.getState().addSet(1, "0", "10")
  const workoutId = store.getState().data.draft!.workoutId
  const setId = store.getState().data.workouts.find((w) => w.id === workoutId)!
    .sets[0].id
  store.getState().updateSet(setId, "12.5", "8")
  assert.equal(
    store.getState().data.workouts.find((w) => w.id === workoutId)!.sets[0]
      .weight,
    12.5,
  )
  store.getState().removeSet(setId)
  assert.equal(store.getState().finish(), false)
  assert.equal(parseWeight("1,5"), 1.5)
  assert.equal(parseWeight("1.2.3"), null)
  assert.equal(parseReps("2e2"), null)
})

test("weight changes persist in history without duplicate unchanged values", () => {
  const storage = memoryStorage(),
    store = createGymStore(storage)
  const count = store.getState().data.stats[1].workHistory.length
  assert.ok(store.getState().saveStat(1, "work", "95,5"))
  assert.ok(store.getState().saveStat(1, "work", "95.5"))
  assert.equal(store.getState().saveStat(1, "max", "-1"), false)
  const restored = createGymStore(storage)
  assert.equal(restored.getState().data.stats[1].work, 95.5)
  assert.equal(restored.getState().data.stats[1].workHistory.length, count + 1)
})

test("unavailable, full, or corrupt storage keeps demo usable and warns", () => {
  const broken: StorageAdapter = {
    getItem: () => {
      throw new Error("blocked")
    },
    setItem: () => {
      throw new Error("quota")
    },
  }
  const store = createGymStore(broken)
  assert.ok(store.getState().warning)
  store.getState().start()
  assert.ok(store.getState().data.draft)
  assert.match(store.getState().warning!, /cannot be saved/)
  const storage = memoryStorage()
  storage.setItem(STORAGE_KEY, '{"version":1,"workouts":[],"stats":{}}')
  const recovered = createGymStore(storage)
  assert.ok(isGymData(recovered.getState().data))
  assert.ok(recovered.getState().warning)
  assert.ok(createGymStore().getState().warning)
})

test("reset removes active workout and custom values and persists fresh demo", () => {
  const storage = memoryStorage(),
    store = createGymStore(storage)
  store.getState().start()
  store.getState().saveStat(1, "max", "999")
  store.getState().reset()
  const restored = createGymStore(storage)
  assert.equal(restored.getState().data.draft, null)
  assert.notEqual(restored.getState().data.stats[1].max, 999)
  assert.deepEqual(summarize([]), {
    workouts: 0,
    sets: 0,
    volume: 0,
    favorite: null,
  })
})
