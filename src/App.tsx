import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  Dumbbell,
  Flag,
  History,
  LayoutGrid,
  Pencil,
  Plus,
  RotateCcw,
  Signal,
  Trash2,
  UserRound,
  Wifi,
  X,
  BatteryFull,
} from "lucide-react"
import {
  asset,
  capitalize,
  dateLabel,
  dayKey,
  exerciseById,
  exercises,
  groupImage,
  groups,
  monthLabel,
  summarize,
  type Exercise,
  type ExerciseSet,
  type Group,
  type HistoryEntry,
  type StatKind,
  type Workout,
} from "./model"
import { useGym } from "./store"
import { goBack, navigate, useRoute } from "./navigation"

function IconButton({
  label,
  onClick,
  children,
  className = "",
}: {
  label: string
  onClick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      className={`icon-button ${className}`}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function ExerciseGrid({
  group,
  onSelect,
  completed = [],
}: {
  group: Group
  onSelect: (exercise: Exercise) => void
  completed?: number[]
}) {
  return (
    <div className="exercise-grid">
      {exercises
        .filter((e) => e.group === group)
        .map((exercise) => (
          <button
            className={`exercise-card ${completed.includes(exercise.id) ? "completed" : ""}`}
            key={exercise.id}
            onClick={() => onSelect(exercise)}
          >
            <div className="exercise-image">
              <img src={asset(exercise.image)} alt="" loading="lazy" />
              {completed.includes(exercise.id) && (
                <span className="done">
                  <Check size={14} />
                </span>
              )}
            </div>
            <span>{exercise.name}</span>
          </button>
        ))}
    </div>
  )
}

function Profile({ base }: { base: string }) {
  const [group, setGroup] = useState<Group>("back")
  return (
    <section className="profile page" aria-label="Exercise profile">
      <div className="muscle-strip" aria-label="Muscle groups">
        {groups.map((g) => (
          <button
            key={g}
            className={`muscle-thumb ${g === group ? "selected" : ""}`}
            aria-label={capitalize(g)}
            aria-pressed={g === group}
            onClick={() => setGroup(g)}
          >
            <img src={groupImage(g)} alt="" />
          </button>
        ))}
      </div>
      <div className="scroll-area profile-content">
        <div className="section-heading">
          <h1>{capitalize(group)}</h1>
          <span>
            {exercises.filter((e) => e.group === group).length} exercises
          </span>
        </div>
        <ExerciseGrid
          group={group}
          onSelect={(e) => navigate(`${base}/exercise/${e.id}`)}
        />
        <p className="quiet-note">
          Choose an exercise to explore your progress
        </p>
      </div>
    </section>
  )
}

function SetRow({
  set,
  index,
  onRemove,
}: {
  set: ExerciseSet
  index: number
  onRemove: () => void
}) {
  const { updateSet } = useGym()
  const [weight, setWeight] = useState(String(set.weight))
  const [reps, setReps] = useState(String(set.reps))
  return (
    <div className="set-row">
      <span className="set-number">{String(index + 1).padStart(2, "0")}</span>
      <label>
        <span>Weight · kg</span>
        <input
          aria-label={`Set ${index + 1} weight`}
          required
          inputMode="decimal"
          pattern="[0-9]+([.,][0-9]+)?"
          value={weight}
          onChange={(e) => {
            e.target.setCustomValidity(
              Number(e.target.value.replace(",", ".")) > 9999
                ? "Maximum weight is 9999 kg."
                : "",
            )
            setWeight(e.target.value)
            updateSet(set.id, e.target.value, reps)
          }}
        />
      </label>
      <span className="multiply">×</span>
      <label>
        <span>Reps</span>
        <input
          aria-label={`Set ${index + 1} reps`}
          required
          type="number"
          min="1"
          max="999"
          step="1"
          inputMode="numeric"
          value={reps}
          onChange={(e) => {
            setReps(e.target.value)
            updateSet(set.id, weight, e.target.value)
          }}
        />
      </label>
      <IconButton label={`Remove set ${index + 1}`} onClick={onRemove}>
        <Trash2 size={17} />
      </IconButton>
    </div>
  )
}

function Training() {
  const {
    data,
    start,
    chooseGroup,
    chooseExercise,
    addSet,
    removeSet,
    finish,
  } = useGym()
  const [error, setError] = useState("")
  const formRef = useRef<HTMLFormElement>(null)
  const draft = data.draft
  const workout = data.workouts.find((w) => w.id === draft?.workoutId)
  const exercise = draft?.exerciseId ? exerciseById(draft.exerciseId) : null
  const complete = () => {
    if (formRef.current && !formRef.current.reportValidity()) return
    if (!finish()) {
      setError("Add at least one set before finishing your workout.")
      return
    }
    setError("")
    navigate("/calendar")
    navigate(`/calendar/day/${dayKey(Date.now())}`)
  }
  if (!draft)
    return (
      <section className="page training-idle" aria-label="Start training">
        <div className="idle-caption">
          <span className="eyebrow">YOUR NEXT CHAPTER</span>
          <h1>Stronger, every day.</h1>
          <p>One workout at a time.</p>
        </div>
        <button
          className="go-button"
          onClick={() => {
            setError("")
            start()
          }}
          aria-label="Start workout"
        >
          GO
          <ArrowRight size={30} />
        </button>
        <img
          className="mascot"
          src={asset("images/mascots/mascot_start_workout.png")}
          alt="Ashel Gym mascot ready to train"
        />
      </section>
    )
  const validateThen = (action: () => void) => {
    if (!formRef.current || formRef.current.reportValidity()) {
      setError("")
      action()
    }
  }
  return (
    <section className="page training-active" aria-label="Active workout">
      <div className="workout-progress">
        <span className="live-dot" /> WORKOUT IN PROGRESS{" "}
        <span>{workout?.sets.length ?? 0} sets</span>
      </div>
      <div className="stepper">
        <span className="active">
          01 <small>Muscle group</small>
        </span>
        <span className={draft.group ? "active" : ""}>
          02 <small>Exercise</small>
        </span>
        <span className={exercise ? "active" : ""}>
          03 <small>Sets</small>
        </span>
      </div>
      <div
        className="scroll-area training-content"
        key={exercise?.id ?? draft.group ?? "groups"}
      >
        {!draft.group ? (
          <>
            <div className="section-heading">
              <h1>Choose a muscle group</h1>
            </div>
            <div className="group-grid">
              {groups.map((g) => (
                <button key={g} onClick={() => chooseGroup(g)}>
                  <img src={groupImage(g)} alt="" />
                  <span>{capitalize(g)}</span>
                  {workout?.sets.some(
                    (s) => exerciseById(s.exerciseId)?.group === g,
                  ) && (
                    <span className="done">
                      <Check size={14} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        ) : !exercise ? (
          <>
            <div className="section-heading">
              <h1>{capitalize(draft.group)}</h1>
              <button className="text-button" onClick={() => chooseGroup(null)}>
                <ArrowLeft size={14} /> Groups
              </button>
            </div>
            <ExerciseGrid
              group={draft.group}
              onSelect={(e) => {
                chooseExercise(e.id)
                if (!workout?.sets.some((s) => s.exerciseId === e.id))
                  addSet(e.id, String(data.stats[e.id].work), "10")
              }}
              completed={workout?.sets.map((s) => s.exerciseId)}
            />
          </>
        ) : (
          <>
            <h1 className="exercise-title">{exercise.name}</h1>
            <div className="training-hero">
              <img src={asset(exercise.image)} alt={exercise.name} />
              <IconButton
                label="Exercise statistics"
                onClick={() =>
                  validateThen(() =>
                    navigate(`/training/exercise/${exercise.id}`),
                  )
                }
              >
                <ChartNoAxesColumnIncreasing size={20} />
              </IconButton>
            </div>
            <form
              ref={formRef}
              onSubmit={(e) => {
                e.preventDefault()
              }}
            >
              <div className="sets-list">
                {workout?.sets
                  .filter((s) => s.exerciseId === exercise.id)
                  .map((set, index) => (
                    <SetRow
                      key={set.id}
                      set={set}
                      index={index}
                      onRemove={() => removeSet(set.id)}
                    />
                  ))}
              </div>
            </form>
            <button
              className="add-set"
              onClick={() =>
                validateThen(() => {
                  const last = workout?.sets
                    .filter((s) => s.exerciseId === exercise.id)
                    .at(-1)
                  addSet(
                    exercise.id,
                    String(last?.weight ?? data.stats[exercise.id].work),
                    String(last?.reps ?? 10),
                  )
                })
              }
            >
              <Plus size={18} /> Add set
            </button>
            <p className="quiet-note">Your sets are saved as you type.</p>
          </>
        )}
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <div className="workout-actions">
        {draft.group && (
          <button
            className="secondary-button"
            onClick={() =>
              validateThen(() =>
                exercise ? chooseExercise(null) : chooseGroup(null),
              )
            }
          >
            {exercise ? <Dumbbell size={19} /> : <LayoutGrid size={19} />}
            {exercise ? "New exercise" : "New muscle group"}
          </button>
        )}
        <button className="primary-button" onClick={complete}>
          <Flag size={18} />
          {draft.group ? "Finish" : "Finish workout"}
        </button>
      </div>
    </section>
  )
}

function Calendar({ base }: { base: string }) {
  const { data } = useGym()
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  )
  const today = dayKey(Date.now())
  const completed = data.workouts.filter(
    (w) => w.finishedAt !== null && w.sets.length > 0,
  )
  const selectedMonth = completed.filter(
    (w) =>
      new Date(w.createdAt).getFullYear() === month.getFullYear() &&
      new Date(w.createdAt).getMonth() === month.getMonth(),
  )
  const summary = summarize(selectedMonth)
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const offset = (month.getDay() + 6) % 7
  const move = (amount: number) =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + amount, 1))
  return (
    <section
      className="page scroll-area calendar-page"
      aria-label="Workout calendar"
    >
      <div className="calendar-header">
        <div>
          <span className="eyebrow">YOUR CONSISTENCY</span>
          <h1>{monthLabel(month)}</h1>
        </div>
        <div className="month-actions">
          <IconButton label="Previous month" onClick={() => move(-1)}>
            <ChevronLeft size={21} />
          </IconButton>
          <IconButton label="Next month" onClick={() => move(1)}>
            <ChevronRight size={21} />
          </IconButton>
        </div>
      </div>
      <div className="calendar-grid">
        {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
          <span className="weekday" key={index}>
            {day}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`empty-${i}`} />
        ))}
        {Array.from({ length: days }, (_, index) => {
          const date = new Date(
              month.getFullYear(),
              month.getMonth(),
              index + 1,
            ),
            key = dayKey(date)
          const workouts = completed.filter((w) => dayKey(w.createdAt) === key)
          return (
            <button
              key={key}
              className={`calendar-day ${today === key ? "today" : ""} ${workouts.length ? "has-workout" : ""}`}
              aria-current={today === key ? "date" : undefined}
              aria-label={`${dateLabel(+date)}, ${workouts.length} workouts`}
              onClick={() => navigate(`${base}/day/${key}`)}
            >
              <span>{index + 1}</span>
              <i />
            </button>
          )
        })}
      </div>
      <div className="calendar-legend">
        <span>
          <i /> Workout day
        </span>
        <button
          className="text-button"
          onClick={() =>
            setMonth(
              new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            )
          }
        >
          Today
        </button>
      </div>
      <div className="month-summary">
        <div className="section-heading">
          <h2>Month in motion</h2>
          <span>{month.toLocaleDateString("en-US", { month: "short" })}</span>
        </div>
        <div className="summary-grid">
          <SummaryCard
            icon={<Dumbbell />}
            value={summary.workouts}
            label="Workouts"
          />
          <SummaryCard
            icon={<ChartNoAxesColumnIncreasing />}
            value={summary.sets}
            label="Total sets"
          />
          <SummaryCard
            icon={<Crown />}
            value={summary.volume.toLocaleString("en-US")}
            label="Volume · kg"
          />
          <SummaryCard
            icon={<LayoutGrid />}
            value={summary.favorite ? capitalize(summary.favorite) : "—"}
            label="Most trained"
          />
        </div>
        {summary.favorite && (
          <div className="favorite-card">
            <img src={groupImage(summary.favorite)} alt="" />
            <div>
              <span className="eyebrow">THIS MONTH’S FOCUS</span>
              <h3>{capitalize(summary.favorite)}</h3>
              <p>Keep showing up. It adds up.</p>
            </div>
          </div>
        )}
        {!summary.workouts && (
          <p className="empty-state">
            A fresh page. Your completed workouts will appear here.
          </p>
        )}
      </div>
    </section>
  )
}

function SummaryCard({
  icon,
  value,
  label,
}: {
  icon: ReactNode
  value: number | string
  label: string
}) {
  return (
    <div className="summary-card">
      {icon}
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function Sheet({
  title,
  onClose,
  children,
  tall = false,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  tall?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const sheet = ref.current!
    const closeButton = sheet.querySelector<HTMLElement>("button")
    closeButton?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== "Tab") return
      const focusable = [
        ...sheet.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), [tabindex="0"]',
        ),
      ].filter((element) => element.getClientRects().length)
      const first = focusable[0],
        last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener("keydown", keydown)
    return () => {
      document.removeEventListener("keydown", keydown)
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return (
    <div className="modal-layer">
      <div className="modal-backdrop" onClick={onClose} />
      <div
        ref={ref}
        className={`sheet ${tall ? "sheet-tall" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
      >
        <div className="sheet-handle" />
        <header className="sheet-header">
          <h2 id="sheet-title">{title}</h2>
          <IconButton label="Close dialog" onClick={onClose}>
            <X size={21} />
          </IconButton>
        </header>
        <div className="sheet-content">{children}</div>
      </div>
    </div>
  )
}

function StatEditor({
  exercise,
  kind,
  onClose,
}: {
  exercise: Exercise
  kind: StatKind
  onClose: () => void
}) {
  const { data, saveStat } = useGym()
  const [value, setValue] = useState(String(data.stats[exercise.id][kind]))
  const [error, setError] = useState("")
  const save = (event: FormEvent) => {
    event.preventDefault()
    if (!saveStat(exercise.id, kind, value)) {
      setError(
        "Enter a weight from 0 to 9999 kg. Use a dot or comma for decimals.",
      )
      return
    }
    onClose()
  }
  return (
    <form className="stat-editor" onSubmit={save}>
      <p className="muted">{exercise.name}</p>
      <label className="weight-label">
        {kind === "work" ? "Work weight" : "Max weight"}
        <div className="weight-input">
          <input
            aria-label="Weight in kg"
            autoFocus
            inputMode="decimal"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <span>kg</span>
        </div>
      </label>
      {error && (
        <p role="alert" className="inline-error">
          {error}
        </p>
      )}
      <button className="primary-button wide" type="submit">
        <Check size={18} /> Save weight
      </button>
    </form>
  )
}

function Stats({ exercise, base }: { exercise: Exercise; base: string }) {
  const { data } = useGym()
  const stats = data.stats[exercise.id]
  return (
    <div className="stats-view">
      {(["work", "max"] as const).map((kind) => (
        <div className="stat-block" key={kind}>
          <div className="stat-line">
            <div className="stat-symbol">
              {kind === "work" ? (
                <ChartNoAxesColumnIncreasing size={31} />
              ) : (
                <Crown size={31} />
              )}
            </div>
            <div>
              <strong>
                {stats[kind]} <small>kg</small>
              </strong>
              <p>{kind === "work" ? "Work weight" : "Max weight"}</p>
            </div>
          </div>
          <div className="split-buttons">
            <button onClick={() => navigate(`${base}/edit/${kind}`)}>
              <Pencil size={16} /> Edit
            </button>
            <button
              onClick={() => navigate(`${base}/history/${kind}`)}
              aria-label={`Open ${kind} weight history`}
            >
              <History size={18} /> History
            </button>
          </div>
        </div>
      ))}
      <p className="quiet-note">Small steps. Measurable progress.</p>
    </div>
  )
}

function ProgressChart({ history }: { history: HistoryEntry[] }) {
  if (!history.length)
    return (
      <p className="empty-state">
        No weight changes yet. Update your weight to start tracking progress.
      </p>
    )
  const values = history.map((h) => h.value),
    min = Math.max(0, Math.min(...values) - 5),
    max = Math.max(...values) + 5
  const point = (h: HistoryEntry, index: number) => [
    48 + (index / Math.max(1, history.length - 1)) * 270,
    174 - ((h.value - min) / (max - min)) * 146,
  ]
  const points = history.map(point),
    polyline = points.map((p) => p.join(",")).join(" ")
  return (
    <svg
      className="progress-chart"
      viewBox="0 0 340 220"
      role="img"
      aria-label={`Weight progress from ${values[0]} to ${values.at(-1)} kilograms`}
    >
      <defs>
        <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#d0bcff" stopOpacity=".25" />
          <stop offset="100%" stopColor="#d0bcff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <line
            x1="44"
            x2="320"
            y1={28 + i * 49}
            y2={28 + i * 49}
            stroke="#49454f"
            strokeDasharray="3 5"
          />
          <text x="36" y={32 + i * 49} textAnchor="end">
            {(max - ((max - min) * i) / 3).toFixed(0)}
          </text>
        </g>
      ))}
      <polygon
        points={`48,178 ${polyline} ${points.at(-1)![0]},178`}
        fill="url(#chart-fill)"
      />
      <polyline
        points={polyline}
        fill="none"
        stroke="#d0bcff"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {points.map(([x, y], i) => (
        <circle key={history[i].id} cx={x} cy={y} r="4" fill="#d0bcff">
          <title>
            {dateLabel(history[i].date)}: {history[i].value} kg
          </title>
        </circle>
      ))}
      <text x="48" y="205">
        {new Date(history[0].date).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        })}
      </text>
      <text x="318" y="205" textAnchor="end">
        {new Date(history.at(-1)!.date).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        })}
      </text>
    </svg>
  )
}

function WeightHistory({
  exercise,
  kind,
}: {
  exercise: Exercise
  kind: StatKind
}) {
  const { data } = useGym(),
    stats = data.stats[exercise.id],
    history = kind === "work" ? stats.workHistory : stats.maxHistory
  return (
    <>
      <div className="history-heading">
        <span className="eyebrow">{exercise.name}</span>
        <h3>
          {stats[kind]} <small>kg</small>
        </h3>
        <p>{kind === "work" ? "Work weight" : "Max weight"} progress</p>
      </div>
      <ProgressChart history={history} />
      <div className="history-list">
        {[...history].reverse().map((entry, index) => (
          <div key={entry.id}>
            <span>
              {dateLabel(entry.date)}
              {index === 0 && <small>Latest</small>}
            </span>
            <strong>
              {entry.value} <small>kg</small>
            </strong>
          </div>
        ))}
      </div>
    </>
  )
}

function WorkoutDetails({ workouts }: { workouts: Workout[] }) {
  if (!workouts.length)
    return (
      <div className="empty-state">
        <CalendarDays size={38} />
        <h3>A little room to grow.</h3>
        <p>No completed workouts on this day.</p>
        <button
          className="primary-button"
          onClick={() => navigate("/training")}
        >
          Start a workout <ArrowRight size={17} />
        </button>
      </div>
    )
  return (
    <>
      {workouts.map((workout, index) => (
        <article className="workout-detail" key={workout.id}>
          <div className="section-heading">
            <h3>Workout {index + 1}</h3>
            <span>
              {new Date(workout.createdAt).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              · {workout.sets.length} sets
            </span>
          </div>
          {[...new Set(workout.sets.map((s) => s.exerciseId))].map(
            (exerciseId) => {
              const exercise = exerciseById(exerciseId)!
              return (
                <div className="detail-exercise" key={exerciseId}>
                  <img src={asset(exercise.image)} alt="" />
                  <div>
                    <h4>{exercise.name}</h4>
                    <p>
                      {workout.sets
                        .filter((s) => s.exerciseId === exerciseId)
                        .map((s) => `${s.weight} kg × ${s.reps}`)
                        .join("  ·  ")}
                    </p>
                  </div>
                </div>
              )
            },
          )}
        </article>
      ))}
    </>
  )
}

export default function App() {
  const route = useRoute(),
    { data, warning, reset } = useGym()
  const parts = route.split("/").filter(Boolean)
  const tab = ["profile", "training", "calendar"].includes(parts[0])
    ? parts[0]
    : "profile"
  const base = `/${tab}`,
    exercise =
      parts[1] === "exercise" ? exerciseById(Number(parts[2])) : undefined
  const kind: StatKind | undefined =
    parts[4] === "work" || parts[4] === "max" ? parts[4] : undefined
  const exerciseBase = `${base}/exercise/${exercise?.id}`
  const selectedDay =
    parts[1] === "day" && /^\d{4}-\d{2}-\d{2}$/.test(parts[2] ?? "")
      ? parts[2]
      : null
  const isReset = parts[1] === "reset"
  const modalOpen = !!exercise || !!selectedDay || isReset
  const closeModal = () => goBack(exercise && kind ? exerciseBase : base)
  useEffect(() => {
    if (!window.location.hash) navigate("/profile", true)
  }, [])
  return (
    <div className="portfolio-stage">
      <aside className="portfolio-note" lang="ru" aria-label="О превью приложения">
        <span className="portfolio-mark">
          <Dumbbell size={19} /> ASHEL GYM
        </span>
        <h2>Создано для телефона</h2>
        <p>
          Для комфортного просмотра рекомендуем уменьшить масштаб браузера:
        </p>
        <ul className="zoom-shortcuts">
          <li><kbd>Ctrl</kbd> + колёсико мыши вниз</li>
          <li>или <kbd>Ctrl</kbd> + <kbd>−</kbd></li>
        </ul>
        <p>
          Это интерактивное превью — лишь приближённый вид реального приложения.
          Некоторые функции упрощены, а данные демонстрационные.
        </p>
        <a
          className="project-link"
          href="https://github.com/7evenUp/ashel-gym"
          target="_blank"
          rel="noopener noreferrer"
        >
          Реальный проект на GitHub <ArrowRight size={15} />
        </a>
        <div className="demo-badge">
          <span /> Интерактивное демо
        </div>
        <p className="local-note">Изменения сохраняются в вашем браузере</p>
      </aside>
      <main className="phone" aria-label="Ashel Gym app preview">
        <div className="phone-speaker" aria-hidden="true" />
        <div className="phone-screen">
          <div className="app-background" inert={modalOpen}>
            <div className="status-bar" aria-hidden="true">
              <span>9:41</span>
              <div>
                <Signal size={14} />
                <Wifi size={14} />
                <BatteryFull size={19} />
              </div>
            </div>
            <header className="app-header">
              <span className="wordmark">
                ashel<span>gym</span>
                <i />
              </span>
              <button
                className="demo-control"
                onClick={() => navigate(`${base}/reset`)}
              >
                <RotateCcw size={12} /> Demo
              </button>
            </header>
            {warning && (
              <p className="storage-warning" role="status">
                {warning}
              </p>
            )}
            <div className="page-host">
              {tab === "profile" ? (
                <Profile base={base} />
              ) : tab === "calendar" ? (
                <Calendar base={base} />
              ) : (
                <Training />
              )}
            </div>
            <nav className="tab-bar" aria-label="Main navigation">
              {[
                { key: "calendar", label: "Calendar", icon: CalendarDays },
                { key: "training", label: "Training", icon: Dumbbell },
                { key: "profile", label: "Profile", icon: UserRound },
              ].map(({ key, label, icon: Icon }) => (
                <a
                  key={key}
                  href={`#/${key}`}
                  className={tab === key ? "active" : ""}
                  aria-current={tab === key ? "page" : undefined}
                  onClick={(e) => {
                    e.preventDefault()
                    navigate(`/${key}`)
                  }}
                >
                  <span>
                    <Icon size={23} />
                  </span>
                  {label}
                  {key === "training" && data.draft && (
                    <i className="tab-dot" />
                  )}
                </a>
              ))}
            </nav>
          </div>
          {exercise && (
            <Sheet
              key={`${exercise.id}-${parts[3] ?? "stats"}-${kind ?? ""}`}
              title={
                kind
                  ? `${parts[3] === "edit" ? "Edit" : "History ·"} ${kind === "work" ? "work weight" : "max weight"}`
                  : exercise.name
              }
              onClose={closeModal}
              tall={parts[3] === "history"}
            >
              {kind && parts[3] === "edit" ? (
                <StatEditor
                  exercise={exercise}
                  kind={kind}
                  onClose={closeModal}
                />
              ) : kind && parts[3] === "history" ? (
                <WeightHistory exercise={exercise} kind={kind} />
              ) : (
                <Stats exercise={exercise} base={exerciseBase} />
              )}
            </Sheet>
          )}
          {selectedDay && (
            <Sheet
              key={selectedDay}
              title={dateLabel(new Date(`${selectedDay}T12:00:00`).getTime())}
              onClose={closeModal}
              tall
            >
              <WorkoutDetails
                workouts={data.workouts.filter(
                  (w) =>
                    w.finishedAt !== null &&
                    w.sets.length > 0 &&
                    dayKey(w.createdAt) === selectedDay,
                )}
              />
            </Sheet>
          )}
          {isReset && (
            <Sheet title="Your demo, your playground." onClose={closeModal}>
              <div className="reset-content">
                <div className="reset-icon">
                  <RotateCcw size={30} />
                </div>
                <p>
                  Explore freely. All workouts and weights are sample data
                  stored only in this browser.
                </p>
                <p className="muted">
                  Resetting restores the sample history and removes your
                  changes, including any active workout.
                </p>
                <button
                  className="primary-button wide"
                  onClick={() => {
                    reset()
                    navigate(base, true)
                  }}
                >
                  <RotateCcw size={17} /> Reset demo data
                </button>
              </div>
            </Sheet>
          )}
        </div>
        <div className="phone-home-indicator" aria-hidden="true" />
      </main>
      <footer className="portfolio-footer">
        ASHEL GYM <span>—</span> MOBILE APP PREVIEW
      </footer>
    </div>
  )
}
