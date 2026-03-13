import { normalizeTopicId } from "./topic-id"

export type MicroTopic = {
    id: string
    subject: string
    chapter: string
    topic: string
    weightage: number
    difficulty: number
  }
  
  export type UserProgress = {
    topic_id: string
    is_mastered: boolean
    confidence?: number
  }
  
  export type PriorityTopic = MicroTopic & {
    priority: number
  }
  
  export function calculateTopicPriority(
    topics: MicroTopic[],
    progress: UserProgress[],
    daysLeft: number
  ): PriorityTopic[] {
  
    const progressMap = new Map(progress.map(p => [normalizeTopicId(p.topic_id), p]))
  
    return topics.map(topic => {
      const user = progressMap.get(normalizeTopicId(topic.id))
  
      const masteryFactor = user?.is_mastered ? 0 : 5
  
      const confidence = user?.confidence ?? 0.3
      const weaknessFactor = 1 - confidence
  
      const urgencyFactor = Math.min(30 / Math.max(daysLeft, 1), 3)
  
      const priority =
        topic.weightage * 2 +
        masteryFactor +
        weaknessFactor * 5 +
        urgencyFactor
  
      return {
        ...topic,
        priority
      }
    })
    .sort((a,b) => b.priority - a.priority)
  }