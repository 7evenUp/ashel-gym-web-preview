import { useSyncExternalStore } from "react"

const subscribe = (listener: () => void) => {
  window.addEventListener("hashchange", listener)
  window.addEventListener("popstate", listener)
  return () => {
    window.removeEventListener("hashchange", listener)
    window.removeEventListener("popstate", listener)
  }
}
export const useRoute = () =>
  useSyncExternalStore(
    subscribe,
    () => window.location.hash.slice(1) || "/profile",
  )
export function navigate(route: string, replace = false) {
  if (window.location.hash === `#${route}`) return
  const depth =
    typeof window.history.state?.gymDepth === "number"
      ? window.history.state.gymDepth
      : 0
  window.history[replace ? "replaceState" : "pushState"](
    { gymDepth: replace ? depth : depth + 1 },
    "",
    `#${route}`,
  )
  window.dispatchEvent(new Event("hashchange"))
}
export function goBack(fallback: string) {
  if ((window.history.state?.gymDepth ?? 0) > 0) window.history.back()
  else navigate(fallback, true)
}
