import { useEffect, useState } from 'react'
import { databaseSlug } from '../../data/threadSearch'
import { fetchOpenAlexPapers, type ApiThread } from '../../services/api'
import { listedPaperCount } from '../../services/paperCounts'

/**
 * Paper count of each thread card, by card id (the thread's slug): the number
 * of papers its Thread Details page lists. Both counts come with the thread
 * list (GET /api/threads), so every card shows its count straight away:
 * paperCount for papers in the database, else openAlexPaperCount, stored by
 * the server from the thread's OpenAlex search. Only a thread whose OpenAlex
 * count is not stored yet asks GET /api/threads/:id/openalex-papers. A count
 * that is unknown or zero is left out, so the card shows no count.
 */
export function usePaperCounts(threads: ApiThread[]): Map<string, number> {
  const [openAlexCounts, setOpenAlexCounts] = useState<Record<number, number>>({})
  const needed = threads
    .filter((thread) => !thread.paperCount && typeof thread.openAlexPaperCount !== 'number')
    .map((thread) => thread.id)
    .join(',')

  useEffect(() => {
    if (!needed) return
    const controller = new AbortController()
    for (const id of needed.split(',').map(Number)) {
      fetchOpenAlexPapers(id, controller.signal)
        .then((data) => setOpenAlexCounts((counts) => ({ ...counts, [id]: data.items.length })))
        .catch(() => {
          // Unknown count: the card shows none, as before.
        })
    }
    return () => controller.abort()
  }, [needed])

  const counts = new Map<string, number>()
  for (const thread of threads) {
    const openAlexCount =
      typeof thread.openAlexPaperCount === 'number' ? thread.openAlexPaperCount : (openAlexCounts[thread.id] ?? null)
    const count = listedPaperCount(thread.paperCount ?? 0, openAlexCount)
    if (count) counts.set(databaseSlug(thread), count)
  }
  return counts
}
