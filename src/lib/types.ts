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

export interface Quest {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  difficulty: "easy" | "medium" | "hard" | "epic";
  xp_reward: number;
  status: "active" | "completed";
  created_at: string;
  completed_at: string | null;
  epic_id: string | null;
}

export interface Epic {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: "active" | "completed";
  created_at: string;
}
