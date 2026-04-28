export type ExploreContentType = "article" | "video" | "audio";
export type ExploreCategory = "fuel" | "train" | "restore" | "general";
export type ChallengeType = "fasting" | "sleep" | "movement" | "journal" | "nutrition";
export type ChallengeBadgeColor = "green" | "purple" | "pink" | "red";
export type ChallengeDifficulty = "beginner" | "intermediate" | "advanced";

export interface ExploreContent {
  id: string;
  title: string;
  subtitle: string | null;
  type: ExploreContentType;
  category: ExploreCategory;
  image_url: string | null;
  author: string | null;
  body: string | null;
  cta_label: string | null;
  is_premium: boolean;
  is_published: boolean;
  featured_rank: number | null;
  popular_rank: number | null;
  created_at: string;
  updated_at: string;
}

export interface Challenge {
  id: string;
  title: string;
  subtitle: string | null;
  type: ChallengeType;
  duration_days: number;
  target_value: number | null;
  target_unit: string | null;
  fast_minimum_hours: number | null;
  description: string | null;
  tips: string[] | null;
  badge_label: string | null;
  badge_color: ChallengeBadgeColor;
  difficulty: ChallengeDifficulty;
  participants: number;
  featured_rank: number | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserChallenge {
  id: string;
  user_id: string;
  challenge_id: string;
  status: "active" | "completed" | "abandoned";
  progress_value: number;
  joined_at: string;
  completed_at: string | null;
  abandoned_at: string | null;
}
