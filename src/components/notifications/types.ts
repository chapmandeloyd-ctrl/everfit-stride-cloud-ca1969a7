export interface EmailBlock {
  id: string;
  type: "heading" | "text" | "button" | "image" | "divider" | "spacer";
  content: string;
  url?: string;
  alt?: string;
  alignment?: "left" | "center" | "right";
  level?: 1 | 2 | 3;
  height?: number;
}

export interface NotificationTemplate {
  id: string;
  trainer_id: string;
  name: string;
  subject: string | null;
  body_html: string | null;
  body_json: EmailBlock[];
  category: string;
  channel: "email" | "in_app" | "both";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationSend {
  id: string;
  trainer_id: string;
  template_id: string | null;
  subject: string;
  body_html: string | null;
  channel: "email" | "in_app" | "both";
  recipient_type: "individual" | "all" | "group";
  recipient_filter: Record<string, any> | null;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export type RecipientMode = "individual" | "all" | "group";

export interface RecipientFilter {
  engine_mode?: string;
  subscription_tier?: string;
  is_active?: boolean;
}
