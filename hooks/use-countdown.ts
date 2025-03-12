import React from 'react'

interface TimerRef {
  started?: number | null
  lastInterval?: number | null
  timeLeft?: number | null
  timeToCount?: number
  requestId?: number
}

const useCountDown = (
  timeToCount: number = 60 * 1000,
  interval: number = 1000
): [number, TimerActions] => {
  const [timeLeft, setTimeLeft] = React.useState<number>(0)
  const timer = React.useRef<TimerRef>({})

  const run = (ts: number) => {
    if (!timer.current.started) {
      timer.current.started = ts
      timer.current.lastInterval = ts
    }

    const localInterval = Math.min(interval, timer.current.timeLeft || Infinity)
    if (
      timer.current.lastInterval !== null &&
      timer.current.lastInterval !== undefined &&
      ts - timer.current.lastInterval >= localInterval
    ) {
      timer.current.lastInterval += localInterval
      setTimeLeft((prevTimeLeft) => {
        const newTimeLeft = prevTimeLeft - localInterval
        timer.current.timeLeft = newTimeLeft
        return newTimeLeft
      })
    }

    if (
      timer.current.started &&
      ts - timer.current.started < (timer.current.timeToCount || Infinity)
    ) {
      timer.current.requestId = window.requestAnimationFrame(run)
    } else {
      timer.current = {}
      setTimeLeft(0)
    }
  }

  const start = React.useCallback(
    (ttc?: number) => {
      if (timer.current.requestId) {
        window.cancelAnimationFrame(timer.current.requestId)
      }

      const newTimeToCount = ttc !== undefined ? ttc : timeToCount
      timer.current.started = null
      timer.current.lastInterval = null
      timer.current.timeToCount = newTimeToCount
      timer.current.timeLeft = newTimeToCount // Initialize timeLeft
      timer.current.requestId = window.requestAnimationFrame(run)

      setTimeLeft(newTimeToCount) // Set initial timeLeft
    },
    [timeToCount, run]
  )

  const pause = React.useCallback(() => {
    if (timer.current.requestId !== undefined) {
      window.cancelAnimationFrame(timer.current.requestId)
    }

    timer.current.started = null
    timer.current.lastInterval = null
    if (timer.current.timeLeft !== null) {
      timer.current.timeToCount = timer.current.timeLeft
    }
  }, [])

  const resume = React.useCallback(() => {
    if (
      !timer.current.started &&
      timer.current.timeLeft !== undefined &&
      timer.current.timeLeft !== null &&
      timer.current.timeLeft > 0
    ) {
      if (timer.current.requestId !== undefined) {
        window.cancelAnimationFrame(timer.current.requestId)
      }
      timer.current.requestId = window.requestAnimationFrame(run)
    }
  }, [run])

  const reset = React.useCallback(() => {
    if (timer.current.requestId !== undefined) {
      window.cancelAnimationFrame(timer.current.requestId)
    }

    timer.current = {}
    setTimeLeft(0)
  }, [])

  const actions = React.useMemo(
    () => ({ start, pause, resume, reset }),
    [start, pause, resume, reset]
  )

  React.useEffect(() => {
    return () => {
      if (timer.current.requestId !== undefined) {
        window.cancelAnimationFrame(timer.current.requestId)
      }
    }
  }, [])

  return [timeLeft, actions]
}

interface TimerActions {
  start: (ttc?: number) => void
  pause: () => void
  resume: () => void
  reset: () => void
}

export default useCountDown
