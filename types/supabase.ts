export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      micro_topics: {
        Row: {
          id: number
          topic_name: string
          subject: string | null
          target_exam: string
          topic: string | null
          weightage: number | null
          difficulty: number | null
        }
        Insert: {
          id?: number
          topic_name: string
          subject?: string | null
          target_exam: string
          topic?: string | null
          weightage?: number | null
          difficulty?: number | null
        }
        Update: Partial<Database["public"]["Tables"]["micro_topics"]["Insert"]>
        Relationships: []
      }
      topic_dependencies: {
        Row: {
          id: number
          topic_id: number
          prerequisite_topic_id: number
        }
        Insert: {
          id?: number
          topic_id: number
          prerequisite_topic_id: number
        }
        Update: Partial<Database["public"]["Tables"]["topic_dependencies"]["Insert"]>
        Relationships: []
      }
      topic_metadata: {
        Row: {
          id: number
          topic_id: number
          weightage: number | null
          difficulty: number | null
          importance_score: number | null
        }
        Insert: {
          id?: number
          topic_id: number
          weightage?: number | null
          difficulty?: number | null
          importance_score?: number | null
        }
        Update: Partial<Database["public"]["Tables"]["topic_metadata"]["Insert"]>
        Relationships: []
      }
      topic_graph_rank: {
        Row: {
          id: number
          topic_id: number
          graph_rank: number | null
        }
        Insert: {
          id?: number
          topic_id: number
          graph_rank?: number | null
        }
        Update: Partial<Database["public"]["Tables"]["topic_graph_rank"]["Insert"]>
        Relationships: []
      }
      student_topic_progress: {
        Row: {
          id: number
          user_id: string
          topic_id: number
          mastery_level: number | null
          accuracy: number | null
          attempts: number | null
        }
        Insert: {
          id?: number
          user_id: string
          topic_id: number
          mastery_level?: number | null
          accuracy?: number | null
          attempts?: number | null
        }
        Update: Partial<Database["public"]["Tables"]["student_topic_progress"]["Insert"]>
        Relationships: []
      }
      repair_paths: {
        Row: {
          id: number
          user_id: string | null
          topic_id: number | null
          weak_topic_id: number | null
          path: Json | null
        }
        Insert: {
          id?: number
          user_id?: string | null
          topic_id?: number | null
          weak_topic_id?: number | null
          path?: Json | null
        }
        Update: Partial<Database["public"]["Tables"]["repair_paths"]["Insert"]>
        Relationships: []
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}

