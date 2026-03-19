export interface Profile {
  id: string;
  username: string;
  xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
  created_at: string;
}

export interface Epic {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  plan_summary: string | null;
  status: "active" | "completed";
  created_at: string;
}

export interface Quest {
  id: string;
  user_id: string;
  epic_id: string | null;
  name: string;
  description: string | null;
  plan_summary: string | null;
  status: "active" | "completed";
  position: number;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  quest_id: string | null;
  title: string;
  description: string | null;
  difficulty: "easy" | "medium" | "hard" | "epic";
  xp_reward: number;
  status: "active" | "completed";
  notes: string | null;
  position: number;
  created_at: string;
  completed_at: string | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  suggestedResponses?: string[];
}

export interface ChatResponse {
  message: string;
  suggestedResponses: string[];
  readyToGenerate: boolean;
}

export interface GeneratedTask {
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard" | "epic";
}

export interface GeneratedQuest {
  name: string;
  description: string;
  plan_summary?: string;
  tasks: GeneratedTask[];
}

export interface GeneratedEpic {
  name: string;
  description: string;
  plan_summary?: string;
  quests: GeneratedQuest[];
}
