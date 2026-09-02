/* eslint-disable react-hooks/set-state-in-effect -- availability fetch intentionally syncs fetched slots into state */
import { useEffect, useState } from 'react'

export function useAvailability(date: string) {
  const [slots, setSlots] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!date) {
      setSlots([])
      return
    }
    setLoading(true)
    fetch(`/api/availability?date=${encodeURIComponent(date)}`)
      .then(async (r) => {
        const j = await r.json()
        if (r.ok) setSlots(j.slots ?? [])
        else setSlots([])
      })
      .catch(() => setSlots([]))
      .finally(() => setLoading(false))
  }, [date])
  return { slots, loading }
}
