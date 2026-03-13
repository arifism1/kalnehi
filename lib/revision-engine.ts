export function scheduleRevision(topicId: number, userId: string) {

    const today = new Date()
  
    const intervals = [3, 7, 14, 30]
  
    return intervals.map(days => {
  
      const revisionDate = new Date(today)
      revisionDate.setDate(today.getDate() + days)
  
      return {
        user_id: userId,
        topic_id: topicId,
        next_revision: revisionDate.toISOString().split("T")[0],
        interval_days: days
      }
  
    })
  
  }