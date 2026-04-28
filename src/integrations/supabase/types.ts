export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_events: {
        Row: {
          actor_id: string | null
          category: string
          client_id: string
          created_at: string
          edited: boolean
          edited_at: string | null
          edited_by: string | null
          event_type: string
          icon: string | null
          id: string
          metadata: Json
          occurred_at: string
          source: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          actor_id?: string | null
          category?: string
          client_id: string
          created_at?: string
          edited?: boolean
          edited_at?: string | null
          edited_by?: string | null
          event_type: string
          icon?: string | null
          id?: string
          metadata?: Json
          occurred_at?: string
          source?: string
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          actor_id?: string | null
          category?: string
          client_id?: string
          created_at?: string
          edited?: boolean
          edited_at?: string | null
          edited_by?: string | null
          event_type?: string
          icon?: string | null
          id?: string
          metadata?: Json
          occurred_at?: string
          source?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      adaptive_macro_adjustments: {
        Row: {
          adjusted_calories: number
          adjusted_carbs: number
          adjusted_fat: number
          adjusted_protein: number
          adjustment_reason: string
          applied_at: string
          base_calories: number
          base_carbs: number
          base_fat: number
          base_protein: number
          client_id: string
          created_at: string
          daily_score_avg: number | null
          expires_at: string | null
          fasting_adherence_pct: number | null
          id: string
          is_active: boolean
          macro_adherence_pct: number | null
          rule_triggered: string
          updated_at: string
        }
        Insert: {
          adjusted_calories: number
          adjusted_carbs: number
          adjusted_fat: number
          adjusted_protein: number
          adjustment_reason: string
          applied_at?: string
          base_calories: number
          base_carbs: number
          base_fat: number
          base_protein: number
          client_id: string
          created_at?: string
          daily_score_avg?: number | null
          expires_at?: string | null
          fasting_adherence_pct?: number | null
          id?: string
          is_active?: boolean
          macro_adherence_pct?: number | null
          rule_triggered: string
          updated_at?: string
        }
        Update: {
          adjusted_calories?: number
          adjusted_carbs?: number
          adjusted_fat?: number
          adjusted_protein?: number
          adjustment_reason?: string
          applied_at?: string
          base_calories?: number
          base_carbs?: number
          base_fat?: number
          base_protein?: number
          client_id?: string
          created_at?: string
          daily_score_avg?: number | null
          expires_at?: string | null
          fasting_adherence_pct?: number | null
          id?: string
          is_active?: boolean
          macro_adherence_pct?: number | null
          rule_triggered?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "adaptive_macro_adjustments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_types: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          location_type: string
          name: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          location_type?: string
          name: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          location_type?: string
          name?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_types_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_type_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_id: string
          created_at: string
          end_time: string
          google_event_id: string | null
          id: string
          location: string | null
          notes: string | null
          start_time: string
          status: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          appointment_type_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_id: string
          created_at?: string
          end_time: string
          google_event_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          start_time: string
          status?: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          appointment_type_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_id?: string
          created_at?: string
          end_time?: string
          google_event_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          start_time?: string
          status?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_appointment_type_id_fkey"
            columns: ["appointment_type_id"]
            isOneToOne: false
            referencedRelation: "appointment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_performance_tiers: {
        Row: {
          client_id: string
          consecutive_down_days: number
          consecutive_up_days: number
          created_at: string
          current_tier: string
          id: string
          last_calculated_at: string | null
          tier_changed_at: string | null
          tier_score: number
          updated_at: string
        }
        Insert: {
          client_id: string
          consecutive_down_days?: number
          consecutive_up_days?: number
          created_at?: string
          current_tier?: string
          id?: string
          last_calculated_at?: string | null
          tier_changed_at?: string | null
          tier_score?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          consecutive_down_days?: number
          consecutive_up_days?: number
          created_at?: string
          current_tier?: string
          id?: string
          last_calculated_at?: string | null
          tier_changed_at?: string | null
          tier_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_performance_tiers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_definitions: {
        Row: {
          badge_type: string
          created_at: string | null
          description: string | null
          icon: string
          id: string
          name: string
          requirement_value: number
        }
        Insert: {
          badge_type: string
          created_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          name: string
          requirement_value: number
        }
        Update: {
          badge_type?: string
          created_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          name?: string
          requirement_value?: number
        }
        Relationships: []
      }
      batting_sessions: {
        Row: {
          client_id: string
          completed_at: string | null
          confidence_after: number | null
          confidence_before: number | null
          contact_quality: number | null
          created_at: string
          duration_seconds: number | null
          fatigue: number | null
          fly_balls: number
          focus_area: string | null
          ground_balls: number
          id: string
          line_drives: number
          misses: number
          session_type: string
          solid_contacts: number
          started_at: string | null
          status: string
          target_swings: number | null
          total_swings: number
          weak_contacts: number
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          confidence_after?: number | null
          confidence_before?: number | null
          contact_quality?: number | null
          created_at?: string
          duration_seconds?: number | null
          fatigue?: number | null
          fly_balls?: number
          focus_area?: string | null
          ground_balls?: number
          id?: string
          line_drives?: number
          misses?: number
          session_type?: string
          solid_contacts?: number
          started_at?: string | null
          status?: string
          target_swings?: number | null
          total_swings?: number
          weak_contacts?: number
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          confidence_after?: number | null
          confidence_before?: number | null
          contact_quality?: number | null
          created_at?: string
          duration_seconds?: number | null
          fatigue?: number | null
          fly_balls?: number
          focus_area?: string | null
          ground_balls?: number
          id?: string
          line_drives?: number
          misses?: number
          session_type?: string
          solid_contacts?: number
          started_at?: string | null
          status?: string
          target_swings?: number | null
          total_swings?: number
          weak_contacts?: number
        }
        Relationships: []
      }
      billing_events: {
        Row: {
          amount: number | null
          client_id: string
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          stripe_event_id: string | null
          tier: string | null
        }
        Insert: {
          amount?: number | null
          client_id: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          stripe_event_id?: string | null
          tier?: string | null
        }
        Update: {
          amount?: number | null
          client_id?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          stripe_event_id?: string | null
          tier?: string | null
        }
        Relationships: []
      }
      booking_settings: {
        Row: {
          allow_self_booking: boolean
          booking_window_days: number
          buffer_minutes: number
          cancellation_notice_hours: number
          created_at: string
          id: string
          max_daily_appointments: number | null
          min_notice_hours: number
          trainer_id: string
          updated_at: string
        }
        Insert: {
          allow_self_booking?: boolean
          booking_window_days?: number
          buffer_minutes?: number
          cancellation_notice_hours?: number
          created_at?: string
          id?: string
          max_daily_appointments?: number | null
          min_notice_hours?: number
          trainer_id: string
          updated_at?: string
        }
        Update: {
          allow_self_booking?: boolean
          booking_window_days?: number
          buffer_minutes?: number
          cancellation_notice_hours?: number
          created_at?: string
          id?: string
          max_daily_appointments?: number | null
          min_notice_hours?: number
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_settings_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      breathing_exercise_music: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          track_id: string
          trainer_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          track_id: string
          trainer_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          track_id?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "breathing_exercise_music_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "breathing_music_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breathing_exercise_music_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      breathing_exercise_videos: {
        Row: {
          cloudflare_video_id: string | null
          created_at: string
          exercise_id: string
          id: string
          trainer_id: string
          updated_at: string
          video_url: string
        }
        Insert: {
          cloudflare_video_id?: string | null
          created_at?: string
          exercise_id: string
          id?: string
          trainer_id: string
          updated_at?: string
          video_url: string
        }
        Update: {
          cloudflare_video_id?: string | null
          created_at?: string
          exercise_id?: string
          id?: string
          trainer_id?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: []
      }
      breathing_exercises: {
        Row: {
          animation: string
          created_at: string
          default_track_id: string | null
          description: string
          hero_image_url: string | null
          icon: string
          id: string
          is_active: boolean
          motion: Json
          music_prompt: string
          name: string
          order_index: number
          phases: Json
          slug: string
          tone: Json
          trainer_id: string
          updated_at: string
        }
        Insert: {
          animation?: string
          created_at?: string
          default_track_id?: string | null
          description?: string
          hero_image_url?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          motion?: Json
          music_prompt?: string
          name: string
          order_index?: number
          phases?: Json
          slug: string
          tone?: Json
          trainer_id: string
          updated_at?: string
        }
        Update: {
          animation?: string
          created_at?: string
          default_track_id?: string | null
          description?: string
          hero_image_url?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          motion?: Json
          music_prompt?: string
          name?: string
          order_index?: number
          phases?: Json
          slug?: string
          tone?: Json
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "breathing_exercises_default_track_id_fkey"
            columns: ["default_track_id"]
            isOneToOne: false
            referencedRelation: "breathing_music_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breathing_exercises_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      breathing_music_tracks: {
        Row: {
          created_at: string
          duration_seconds: number | null
          file_url: string
          id: string
          is_active: boolean
          name: string
          order_index: number
          tags: string[] | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          file_url: string
          id?: string
          is_active?: boolean
          name: string
          order_index?: number
          tags?: string[] | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          file_url?: string
          id?: string
          is_active?: boolean
          name?: string
          order_index?: number
          tags?: string[] | null
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "breathing_music_tracks_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cardio_activity_types: {
        Row: {
          created_at: string
          icon_name: string
          icon_url: string | null
          id: string
          is_default: boolean
          name: string
          order_index: number
          trainer_id: string
        }
        Insert: {
          created_at?: string
          icon_name?: string
          icon_url?: string | null
          id?: string
          is_default?: boolean
          name: string
          order_index?: number
          trainer_id: string
        }
        Update: {
          created_at?: string
          icon_name?: string
          icon_url?: string | null
          id?: string
          is_default?: boolean
          name?: string
          order_index?: number
          trainer_id?: string
        }
        Relationships: []
      }
      cardio_session_segments: {
        Row: {
          activity_type: string
          actual_seconds: number | null
          calories: number | null
          completed_at: string | null
          created_at: string
          distance_miles: number | null
          id: string
          order_index: number
          session_id: string
          started_at: string | null
          status: string
          target_seconds: number | null
        }
        Insert: {
          activity_type: string
          actual_seconds?: number | null
          calories?: number | null
          completed_at?: string | null
          created_at?: string
          distance_miles?: number | null
          id?: string
          order_index?: number
          session_id: string
          started_at?: string | null
          status?: string
          target_seconds?: number | null
        }
        Update: {
          activity_type?: string
          actual_seconds?: number | null
          calories?: number | null
          completed_at?: string | null
          created_at?: string
          distance_miles?: number | null
          id?: string
          order_index?: number
          session_id?: string
          started_at?: string | null
          status?: string
          target_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cardio_session_segments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cardio_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cardio_sessions: {
        Row: {
          activity_type: string
          calories: number | null
          client_id: string
          completed_at: string | null
          created_at: string
          distance_miles: number | null
          duration_seconds: number | null
          heart_rate_avg: number | null
          id: string
          scheduled_date: string | null
          started_at: string | null
          status: string
          target_type: string
          target_value: number | null
          updated_at: string
        }
        Insert: {
          activity_type: string
          calories?: number | null
          client_id: string
          completed_at?: string | null
          created_at?: string
          distance_miles?: number | null
          duration_seconds?: number | null
          heart_rate_avg?: number | null
          id?: string
          scheduled_date?: string | null
          started_at?: string | null
          status?: string
          target_type?: string
          target_value?: number | null
          updated_at?: string
        }
        Update: {
          activity_type?: string
          calories?: number | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          distance_miles?: number | null
          duration_seconds?: number | null
          heart_rate_avg?: number | null
          id?: string
          scheduled_date?: string | null
          started_at?: string | null
          status?: string
          target_type?: string
          target_value?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      category_workouts: {
        Row: {
          category_id: string
          id: string
          order_index: number
          workout_id: string
        }
        Insert: {
          category_id: string
          id?: string
          order_index: number
          workout_id: string
        }
        Update: {
          category_id?: string
          id?: string
          order_index?: number
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_workouts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "workout_collection_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_workouts_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "ondemand_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          badge_color: string
          badge_label: string | null
          created_at: string
          description: string | null
          difficulty: string
          duration_days: number
          fast_minimum_hours: number | null
          featured_rank: number | null
          id: string
          is_published: boolean
          participants: number
          subtitle: string | null
          target_unit: string | null
          target_value: number | null
          tips: string[] | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          badge_color?: string
          badge_label?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string
          duration_days: number
          fast_minimum_hours?: number | null
          featured_rank?: number | null
          id?: string
          is_published?: boolean
          participants?: number
          subtitle?: string | null
          target_unit?: string | null
          target_value?: number | null
          tips?: string[] | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          badge_color?: string
          badge_label?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string
          duration_days?: number
          fast_minimum_hours?: number | null
          featured_rank?: number | null
          id?: string
          is_published?: boolean
          participants?: number
          subtitle?: string | null
          target_unit?: string | null
          target_value?: number | null
          tips?: string[] | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      checkin_auto_drafts: {
        Row: {
          client_id: string
          created_at: string
          draft_text: string
          id: string
          schedule_id: string
          sent_at: string | null
          status: string
          task_id: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          draft_text: string
          id?: string
          schedule_id: string
          sent_at?: string | null
          status?: string
          task_id: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          draft_text?: string
          id?: string
          schedule_id?: string
          sent_at?: string | null
          status?: string
          task_id?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkin_auto_drafts_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "recurring_checkin_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_auto_drafts_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "client_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      client_adaptive_profile: {
        Row: {
          avg_hunger_break_fast: number | null
          avg_hunger_last_meal: number | null
          avg_hunger_mid_window: number | null
          carb_compliance_rate: number | null
          client_id: string
          consistency_score: number | null
          created_at: string
          fasting_adherence_rate: number | null
          id: string
          preferred_meal_pattern: string | null
          profile_type: string
          protein_compliance_rate: number | null
          scoring_precision: string
          updated_at: string
          week_start: string
        }
        Insert: {
          avg_hunger_break_fast?: number | null
          avg_hunger_last_meal?: number | null
          avg_hunger_mid_window?: number | null
          carb_compliance_rate?: number | null
          client_id: string
          consistency_score?: number | null
          created_at?: string
          fasting_adherence_rate?: number | null
          id?: string
          preferred_meal_pattern?: string | null
          profile_type?: string
          protein_compliance_rate?: number | null
          scoring_precision?: string
          updated_at?: string
          week_start: string
        }
        Update: {
          avg_hunger_break_fast?: number | null
          avg_hunger_last_meal?: number | null
          avg_hunger_mid_window?: number | null
          carb_compliance_rate?: number | null
          client_id?: string
          consistency_score?: number | null
          created_at?: string
          fasting_adherence_rate?: number | null
          id?: string
          preferred_meal_pattern?: string | null
          profile_type?: string
          protein_compliance_rate?: number | null
          scoring_precision?: string
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_adaptive_profile_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_badges: {
        Row: {
          badge_id: string
          client_id: string
          earned_at: string | null
          id: string
          session_id: string | null
        }
        Insert: {
          badge_id: string
          client_id: string
          earned_at?: string | null
          id?: string
          session_id?: string | null
        }
        Update: {
          badge_id?: string
          client_id?: string
          earned_at?: string | null
          id?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_badges_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      client_collection_access: {
        Row: {
          client_id: string
          collection_id: string
          granted_at: string
          id: string
        }
        Insert: {
          client_id: string
          collection_id: string
          granted_at?: string
          id?: string
        }
        Update: {
          client_id?: string
          collection_id?: string
          granted_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_collection_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_collection_access_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "resource_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      client_consistency_streaks: {
        Row: {
          client_id: string
          created_at: string
          current_streak: number
          current_tier: string
          fasting_completed_today: boolean
          id: string
          last_score_label: string | null
          last_scored_date: string | null
          longest_streak: number
          milestone_14: boolean
          milestone_3: boolean
          milestone_30: boolean
          milestone_7: boolean
          perfect_days_count: number
          updated_at: string
          weekly_completion: number
        }
        Insert: {
          client_id: string
          created_at?: string
          current_streak?: number
          current_tier?: string
          fasting_completed_today?: boolean
          id?: string
          last_score_label?: string | null
          last_scored_date?: string | null
          longest_streak?: number
          milestone_14?: boolean
          milestone_3?: boolean
          milestone_30?: boolean
          milestone_7?: boolean
          perfect_days_count?: number
          updated_at?: string
          weekly_completion?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          current_streak?: number
          current_tier?: string
          fasting_completed_today?: boolean
          id?: string
          last_score_label?: string | null
          last_scored_date?: string | null
          longest_streak?: number
          milestone_14?: boolean
          milestone_3?: boolean
          milestone_30?: boolean
          milestone_7?: boolean
          perfect_days_count?: number
          updated_at?: string
          weekly_completion?: number
        }
        Relationships: []
      }
      client_feature_settings: {
        Row: {
          active_fast_start_at: string | null
          active_fast_target_hours: number | null
          activity_logging_enabled: boolean
          ai_suggestions_enabled: boolean
          allow_custom_goal_text: boolean
          allow_level_auto_advance: boolean
          allow_plan_suggestions: boolean
          athletic_safety_lock: boolean
          auto_advance_levels: boolean
          auto_level_advance_enabled: boolean
          auto_nudge_optimization_enabled: boolean
          auto_plan_adjust_enabled: boolean
          back_on_pace_enabled: boolean
          body_metrics_enabled: boolean
          calendar_days_ahead: number
          client_can_edit_goal: boolean
          client_id: string
          client_wod_builder_enabled: boolean
          created_at: string
          current_level: number
          daily_checkin_enabled: boolean
          dashboard_hero_image_url: string | null
          dashboard_hero_message: string | null
          dashboard_hero_text_color: string | null
          dashboard_hero_title: string | null
          eating_window_card_image_url: string | null
          eating_window_card_message: string | null
          eating_window_card_text_color: string | null
          eating_window_card_title: string | null
          eating_window_ends_at: string | null
          eating_window_hours: number
          engine_mode: Database["public"]["Enums"]["engine_mode"]
          fast_lock_pin: string | null
          fasting_card_image_url: string | null
          fasting_card_subtitle: string
          fasting_card_text_color: string | null
          fasting_card_title: string | null
          fasting_enabled: boolean
          fasting_strict_mode: boolean
          food_journal_enabled: boolean
          goals_enabled: boolean
          greeting_emoji: string
          greeting_subtitle: string
          greeting_title: string | null
          homework_enabled: boolean
          id: string
          insights_enabled: boolean
          is_minor: boolean
          is_premium: boolean
          last_engine_switch_at: string | null
          last_fast_completed_at: string | null
          last_fast_ended_at: string | null
          level_blocked_reason: string | null
          level_completion_pct: number
          level_start_date: string
          level_status: string
          lock_advanced_plans: boolean
          lock_client_plan_choice: boolean
          lock_start_weight_after_set: boolean
          macros_enabled: boolean
          maintenance_mode: boolean
          maintenance_schedule_type: string | null
          meal_plan_add_recipe_books: boolean
          meal_plan_allow_recipe_replacement: boolean
          meal_plan_header_label: string
          meal_plan_type: string
          messages_enabled: boolean
          nudge_checkin: boolean
          nudge_enabled: boolean
          nudge_fasting: boolean
          nudge_frequency: string
          nudge_recovery: boolean
          nudge_sleep: boolean
          nudge_workout: boolean
          on_demand_enabled: boolean
          pace_enabled: boolean
          parent_link_enabled: boolean
          pinned_insight_text: string | null
          pinned_insight_until: string | null
          progress_photos_enabled: boolean
          protocol_assigned_by: string | null
          protocol_completed: boolean
          protocol_start_date: string | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          require_coach_approval_plans: boolean
          restore_enabled: boolean
          restore_profile_type: string
          selected_protocol_id: string | null
          selected_quick_plan_id: string | null
          smart_pace_enabled: boolean
          sport_schedule_enabled: boolean
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          tasks_enabled: boolean
          trainer_id: string
          training_enabled: boolean
          updated_at: string
          workout_comments_enabled: boolean
        }
        Insert: {
          active_fast_start_at?: string | null
          active_fast_target_hours?: number | null
          activity_logging_enabled?: boolean
          ai_suggestions_enabled?: boolean
          allow_custom_goal_text?: boolean
          allow_level_auto_advance?: boolean
          allow_plan_suggestions?: boolean
          athletic_safety_lock?: boolean
          auto_advance_levels?: boolean
          auto_level_advance_enabled?: boolean
          auto_nudge_optimization_enabled?: boolean
          auto_plan_adjust_enabled?: boolean
          back_on_pace_enabled?: boolean
          body_metrics_enabled?: boolean
          calendar_days_ahead?: number
          client_can_edit_goal?: boolean
          client_id: string
          client_wod_builder_enabled?: boolean
          created_at?: string
          current_level?: number
          daily_checkin_enabled?: boolean
          dashboard_hero_image_url?: string | null
          dashboard_hero_message?: string | null
          dashboard_hero_text_color?: string | null
          dashboard_hero_title?: string | null
          eating_window_card_image_url?: string | null
          eating_window_card_message?: string | null
          eating_window_card_text_color?: string | null
          eating_window_card_title?: string | null
          eating_window_ends_at?: string | null
          eating_window_hours?: number
          engine_mode?: Database["public"]["Enums"]["engine_mode"]
          fast_lock_pin?: string | null
          fasting_card_image_url?: string | null
          fasting_card_subtitle?: string
          fasting_card_text_color?: string | null
          fasting_card_title?: string | null
          fasting_enabled?: boolean
          fasting_strict_mode?: boolean
          food_journal_enabled?: boolean
          goals_enabled?: boolean
          greeting_emoji?: string
          greeting_subtitle?: string
          greeting_title?: string | null
          homework_enabled?: boolean
          id?: string
          insights_enabled?: boolean
          is_minor?: boolean
          is_premium?: boolean
          last_engine_switch_at?: string | null
          last_fast_completed_at?: string | null
          last_fast_ended_at?: string | null
          level_blocked_reason?: string | null
          level_completion_pct?: number
          level_start_date?: string
          level_status?: string
          lock_advanced_plans?: boolean
          lock_client_plan_choice?: boolean
          lock_start_weight_after_set?: boolean
          macros_enabled?: boolean
          maintenance_mode?: boolean
          maintenance_schedule_type?: string | null
          meal_plan_add_recipe_books?: boolean
          meal_plan_allow_recipe_replacement?: boolean
          meal_plan_header_label?: string
          meal_plan_type?: string
          messages_enabled?: boolean
          nudge_checkin?: boolean
          nudge_enabled?: boolean
          nudge_fasting?: boolean
          nudge_frequency?: string
          nudge_recovery?: boolean
          nudge_sleep?: boolean
          nudge_workout?: boolean
          on_demand_enabled?: boolean
          pace_enabled?: boolean
          parent_link_enabled?: boolean
          pinned_insight_text?: string | null
          pinned_insight_until?: string | null
          progress_photos_enabled?: boolean
          protocol_assigned_by?: string | null
          protocol_completed?: boolean
          protocol_start_date?: string | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          require_coach_approval_plans?: boolean
          restore_enabled?: boolean
          restore_profile_type?: string
          selected_protocol_id?: string | null
          selected_quick_plan_id?: string | null
          smart_pace_enabled?: boolean
          sport_schedule_enabled?: boolean
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          tasks_enabled?: boolean
          trainer_id: string
          training_enabled?: boolean
          updated_at?: string
          workout_comments_enabled?: boolean
        }
        Update: {
          active_fast_start_at?: string | null
          active_fast_target_hours?: number | null
          activity_logging_enabled?: boolean
          ai_suggestions_enabled?: boolean
          allow_custom_goal_text?: boolean
          allow_level_auto_advance?: boolean
          allow_plan_suggestions?: boolean
          athletic_safety_lock?: boolean
          auto_advance_levels?: boolean
          auto_level_advance_enabled?: boolean
          auto_nudge_optimization_enabled?: boolean
          auto_plan_adjust_enabled?: boolean
          back_on_pace_enabled?: boolean
          body_metrics_enabled?: boolean
          calendar_days_ahead?: number
          client_can_edit_goal?: boolean
          client_id?: string
          client_wod_builder_enabled?: boolean
          created_at?: string
          current_level?: number
          daily_checkin_enabled?: boolean
          dashboard_hero_image_url?: string | null
          dashboard_hero_message?: string | null
          dashboard_hero_text_color?: string | null
          dashboard_hero_title?: string | null
          eating_window_card_image_url?: string | null
          eating_window_card_message?: string | null
          eating_window_card_text_color?: string | null
          eating_window_card_title?: string | null
          eating_window_ends_at?: string | null
          eating_window_hours?: number
          engine_mode?: Database["public"]["Enums"]["engine_mode"]
          fast_lock_pin?: string | null
          fasting_card_image_url?: string | null
          fasting_card_subtitle?: string
          fasting_card_text_color?: string | null
          fasting_card_title?: string | null
          fasting_enabled?: boolean
          fasting_strict_mode?: boolean
          food_journal_enabled?: boolean
          goals_enabled?: boolean
          greeting_emoji?: string
          greeting_subtitle?: string
          greeting_title?: string | null
          homework_enabled?: boolean
          id?: string
          insights_enabled?: boolean
          is_minor?: boolean
          is_premium?: boolean
          last_engine_switch_at?: string | null
          last_fast_completed_at?: string | null
          last_fast_ended_at?: string | null
          level_blocked_reason?: string | null
          level_completion_pct?: number
          level_start_date?: string
          level_status?: string
          lock_advanced_plans?: boolean
          lock_client_plan_choice?: boolean
          lock_start_weight_after_set?: boolean
          macros_enabled?: boolean
          maintenance_mode?: boolean
          maintenance_schedule_type?: string | null
          meal_plan_add_recipe_books?: boolean
          meal_plan_allow_recipe_replacement?: boolean
          meal_plan_header_label?: string
          meal_plan_type?: string
          messages_enabled?: boolean
          nudge_checkin?: boolean
          nudge_enabled?: boolean
          nudge_fasting?: boolean
          nudge_frequency?: string
          nudge_recovery?: boolean
          nudge_sleep?: boolean
          nudge_workout?: boolean
          on_demand_enabled?: boolean
          pace_enabled?: boolean
          parent_link_enabled?: boolean
          pinned_insight_text?: string | null
          pinned_insight_until?: string | null
          progress_photos_enabled?: boolean
          protocol_assigned_by?: string | null
          protocol_completed?: boolean
          protocol_start_date?: string | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          require_coach_approval_plans?: boolean
          restore_enabled?: boolean
          restore_profile_type?: string
          selected_protocol_id?: string | null
          selected_quick_plan_id?: string | null
          smart_pace_enabled?: boolean
          sport_schedule_enabled?: boolean
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          tasks_enabled?: boolean
          trainer_id?: string
          training_enabled?: boolean
          updated_at?: string
          workout_comments_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "client_feature_settings_selected_protocol_id_fkey"
            columns: ["selected_protocol_id"]
            isOneToOne: false
            referencedRelation: "fasting_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_feature_settings_selected_quick_plan_id_fkey"
            columns: ["selected_quick_plan_id"]
            isOneToOne: false
            referencedRelation: "quick_fasting_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      client_goal_countdowns: {
        Row: {
          background_color: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          end_date: string | null
          icon: string | null
          id: string
          is_completed: boolean | null
          notify_day_before: boolean | null
          notify_on_end: boolean | null
          notify_week_before: boolean | null
          title: string
          trainer_id: string
          type: string
          updated_at: string
        }
        Insert: {
          background_color?: string | null
          client_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          icon?: string | null
          id?: string
          is_completed?: boolean | null
          notify_day_before?: boolean | null
          notify_on_end?: boolean | null
          notify_week_before?: boolean | null
          title: string
          trainer_id: string
          type: string
          updated_at?: string
        }
        Update: {
          background_color?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          icon?: string | null
          id?: string
          is_completed?: boolean | null
          notify_day_before?: boolean | null
          notify_on_end?: boolean | null
          notify_week_before?: boolean | null
          title?: string
          trainer_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_habits: {
        Row: {
          client_id: string
          comments_enabled: boolean | null
          created_at: string
          description: string | null
          end_date: string | null
          frequency: string
          goal_unit: string
          goal_value: number
          icon_url: string | null
          id: string
          is_active: boolean | null
          name: string
          reminder_enabled: boolean | null
          reminder_time: string | null
          start_date: string
          template_id: string | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          comments_enabled?: boolean | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          frequency?: string
          goal_unit?: string
          goal_value?: number
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          reminder_enabled?: boolean | null
          reminder_time?: string | null
          start_date?: string
          template_id?: string | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          comments_enabled?: boolean | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          frequency?: string
          goal_unit?: string
          goal_value?: number
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          reminder_enabled?: boolean | null
          reminder_time?: string | null
          start_date?: string
          template_id?: string | null
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_habits_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      client_health_reminders: {
        Row: {
          client_id: string
          created_at: string
          enabled: boolean
          id: string
          times: string[]
          timezone: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          enabled?: boolean
          id?: string
          times?: string[]
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          times?: string[]
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_health_reminders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_ical_feeds: {
        Row: {
          client_id: string
          created_at: string
          feed_name: string
          feed_url: string
          id: string
          is_active: boolean
          last_synced_at: string | null
          sync_error: string | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          feed_name?: string
          feed_url: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          sync_error?: string | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          feed_name?: string
          feed_url?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          sync_error?: string | null
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_insight_history: {
        Row: {
          client_id: string
          created_at: string
          engine_mode: string
          factor_tag: string | null
          id: string
          insight_id: string
          shown_date: string
          status_tag: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          engine_mode: string
          factor_tag?: string | null
          id?: string
          insight_id: string
          shown_date?: string
          status_tag?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          engine_mode?: string
          factor_tag?: string | null
          id?: string
          insight_id?: string
          shown_date?: string
          status_tag?: string | null
        }
        Relationships: []
      }
      client_keto_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          client_id: string
          id: string
          is_active: boolean
          keto_type_id: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          client_id: string
          id?: string
          is_active?: boolean
          keto_type_id: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          client_id?: string
          id?: string
          is_active?: boolean
          keto_type_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_keto_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_keto_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_keto_assignments_keto_type_id_fkey"
            columns: ["keto_type_id"]
            isOneToOne: false
            referencedRelation: "keto_types"
            referencedColumns: ["id"]
          },
        ]
      }
      client_macro_targets: {
        Row: {
          client_id: string
          created_at: string
          deficit_pct: number | null
          diet_style: string | null
          id: string
          is_active: boolean | null
          rest_day_calories: number | null
          rest_day_carbs: number | null
          rest_day_fats: number | null
          rest_day_protein: number | null
          target_calories: number | null
          target_carbs: number | null
          target_fats: number | null
          target_protein: number | null
          tdee: number | null
          tracking_option: string
          trainer_id: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          deficit_pct?: number | null
          diet_style?: string | null
          id?: string
          is_active?: boolean | null
          rest_day_calories?: number | null
          rest_day_carbs?: number | null
          rest_day_fats?: number | null
          rest_day_protein?: number | null
          target_calories?: number | null
          target_carbs?: number | null
          target_fats?: number | null
          target_protein?: number | null
          tdee?: number | null
          tracking_option?: string
          trainer_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          deficit_pct?: number | null
          diet_style?: string | null
          id?: string
          is_active?: boolean | null
          rest_day_calories?: number | null
          rest_day_carbs?: number | null
          rest_day_fats?: number | null
          rest_day_protein?: number | null
          target_calories?: number | null
          target_carbs?: number | null
          target_fats?: number | null
          target_protein?: number | null
          tdee?: number | null
          tracking_option?: string
          trainer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      client_meal_adaptive_scores: {
        Row: {
          adjustment_reason: string | null
          client_id: string
          created_at: string
          id: string
          last_selected_at: string | null
          last_shown_at: string | null
          recipe_id: string
          score_adjustment: number
          times_ignored: number
          times_selected: number
          times_shown: number
          updated_at: string
        }
        Insert: {
          adjustment_reason?: string | null
          client_id: string
          created_at?: string
          id?: string
          last_selected_at?: string | null
          last_shown_at?: string | null
          recipe_id: string
          score_adjustment?: number
          times_ignored?: number
          times_selected?: number
          times_shown?: number
          updated_at?: string
        }
        Update: {
          adjustment_reason?: string | null
          client_id?: string
          created_at?: string
          id?: string
          last_selected_at?: string | null
          last_shown_at?: string | null
          recipe_id?: string
          score_adjustment?: number
          times_ignored?: number
          times_selected?: number
          times_shown?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_meal_adaptive_scores_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_meal_adaptive_scores_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      client_meal_behavior: {
        Row: {
          ai_photo_logs: number
          barcode_scans: number
          carbs_exceeded: boolean | null
          client_id: string
          coach_picks_used: number
          created_at: string
          fast_broken_early: boolean | null
          fast_completed: boolean | null
          fasting_window_adherence: number | null
          fat_deviation: number | null
          hunger_break_fast: number | null
          hunger_last_meal: number | null
          hunger_mid_window: number | null
          id: string
          manual_meal_entries: number
          meals_completed: number
          meals_selected: number
          meals_shown: number
          protein_target_hit: boolean | null
          tracked_date: string
          updated_at: string
        }
        Insert: {
          ai_photo_logs?: number
          barcode_scans?: number
          carbs_exceeded?: boolean | null
          client_id: string
          coach_picks_used?: number
          created_at?: string
          fast_broken_early?: boolean | null
          fast_completed?: boolean | null
          fasting_window_adherence?: number | null
          fat_deviation?: number | null
          hunger_break_fast?: number | null
          hunger_last_meal?: number | null
          hunger_mid_window?: number | null
          id?: string
          manual_meal_entries?: number
          meals_completed?: number
          meals_selected?: number
          meals_shown?: number
          protein_target_hit?: boolean | null
          tracked_date?: string
          updated_at?: string
        }
        Update: {
          ai_photo_logs?: number
          barcode_scans?: number
          carbs_exceeded?: boolean | null
          client_id?: string
          coach_picks_used?: number
          created_at?: string
          fast_broken_early?: boolean | null
          fast_completed?: boolean | null
          fasting_window_adherence?: number | null
          fat_deviation?: number | null
          hunger_break_fast?: number | null
          hunger_last_meal?: number | null
          hunger_mid_window?: number | null
          id?: string
          manual_meal_entries?: number
          meals_completed?: number
          meals_selected?: number
          meals_shown?: number
          protein_target_hit?: boolean | null
          tracked_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_meal_behavior_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_meal_plan_assignments: {
        Row: {
          assigned_at: string
          client_id: string
          end_date: string | null
          id: string
          meal_plan_id: string | null
          notes: string | null
          plan_type: Database["public"]["Enums"]["meal_plan_type"]
          start_date: string
          trainer_id: string
        }
        Insert: {
          assigned_at?: string
          client_id: string
          end_date?: string | null
          id?: string
          meal_plan_id?: string | null
          notes?: string | null
          plan_type: Database["public"]["Enums"]["meal_plan_type"]
          start_date: string
          trainer_id: string
        }
        Update: {
          assigned_at?: string
          client_id?: string
          end_date?: string | null
          id?: string
          meal_plan_id?: string | null
          notes?: string | null
          plan_type?: Database["public"]["Enums"]["meal_plan_type"]
          start_date?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_meal_plan_assignments_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      client_meal_selections: {
        Row: {
          assignment_id: string | null
          client_id: string
          created_at: string
          id: string
          meal_date: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          recipe_id: string
          serving_multiplier: number
          servings: number | null
        }
        Insert: {
          assignment_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          meal_date: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          recipe_id: string
          serving_multiplier?: number
          servings?: number | null
        }
        Update: {
          assignment_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          meal_date?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          recipe_id?: string
          serving_multiplier?: number
          servings?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_meal_selections_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "client_meal_plan_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_meal_selections_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      client_metrics: {
        Row: {
          client_id: string
          created_at: string
          goal_value: number | null
          id: string
          is_pinned: boolean
          metric_definition_id: string
          order_index: number
          starting_value: number | null
          trainer_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          goal_value?: number | null
          id?: string
          is_pinned?: boolean
          metric_definition_id: string
          order_index?: number
          starting_value?: number | null
          trainer_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          goal_value?: number | null
          id?: string
          is_pinned?: boolean
          metric_definition_id?: string
          order_index?: number
          starting_value?: number | null
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_metrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_metrics_metric_definition_id_fkey"
            columns: ["metric_definition_id"]
            isOneToOne: false
            referencedRelation: "metric_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_metrics_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          client_id: string
          content: string
          created_at: string
          id: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          content: string
          created_at?: string
          id?: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          id?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_progress_tiles: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_visible: boolean
          label: string
          metric_definition_id: string | null
          order_index: number
          tile_key: string
          unit: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_visible?: boolean
          label: string
          metric_definition_id?: string | null
          order_index?: number
          tile_key: string
          unit?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_visible?: boolean
          label?: string
          metric_definition_id?: string | null
          order_index?: number
          tile_key?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_progress_tiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_progress_tiles_metric_definition_id_fkey"
            columns: ["metric_definition_id"]
            isOneToOne: false
            referencedRelation: "metric_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      client_recipe_book_assignments: {
        Row: {
          assigned_at: string
          client_id: string
          id: string
          recipe_book_id: string
          trainer_id: string
        }
        Insert: {
          assigned_at?: string
          client_id: string
          id?: string
          recipe_book_id: string
          trainer_id: string
        }
        Update: {
          assigned_at?: string
          client_id?: string
          id?: string
          recipe_book_id?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_recipe_book_assignments_recipe_book_id_fkey"
            columns: ["recipe_book_id"]
            isOneToOne: false
            referencedRelation: "recipe_books"
            referencedColumns: ["id"]
          },
        ]
      }
      client_recipe_collections: {
        Row: {
          client_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          name?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      client_reminders: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          id: string
          is_dismissed: boolean
          reference_id: string | null
          remind_at: string
          reminder_type: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_dismissed?: boolean
          reference_id?: string | null
          remind_at: string
          reminder_type: string
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_dismissed?: boolean
          reference_id?: string | null
          remind_at?: string
          reminder_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_rest_day_cards: {
        Row: {
          client_id: string
          created_at: string
          id: string
          image_url: string | null
          message: string | null
          overlay_opacity: number
          text_color: string | null
          title: string | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          message?: string | null
          overlay_opacity?: number
          text_color?: string | null
          title?: string | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          message?: string | null
          overlay_opacity?: number
          text_color?: string | null
          title?: string | null
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_saved_recipes: {
        Row: {
          client_id: string
          collection_id: string | null
          id: string
          recipe_id: string
          saved_at: string
        }
        Insert: {
          client_id: string
          collection_id?: string | null
          id?: string
          recipe_id: string
          saved_at?: string
        }
        Update: {
          client_id?: string
          collection_id?: string | null
          id?: string
          recipe_id?: string
          saved_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_saved_recipes_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "client_recipe_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_saved_recipes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      client_sport_day_cards: {
        Row: {
          card_type: string
          client_id: string
          created_at: string
          id: string
          image_url: string | null
          message: string | null
          overlay_opacity: number
          text_color: string | null
          title: string | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          card_type: string
          client_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          message?: string | null
          overlay_opacity?: number
          text_color?: string | null
          title?: string | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          card_type?: string
          client_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          message?: string | null
          overlay_opacity?: number
          text_color?: string | null
          title?: string | null
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_sport_profiles: {
        Row: {
          bats: string | null
          client_id: string
          created_at: string
          id: string
          jersey_number: string | null
          photo_url: string | null
          position: string | null
          season_end_date: string | null
          season_override: string | null
          season_start_date: string | null
          season_status: string
          sport: string
          team_name: string | null
          throws: string | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          bats?: string | null
          client_id: string
          created_at?: string
          id?: string
          jersey_number?: string | null
          photo_url?: string | null
          position?: string | null
          season_end_date?: string | null
          season_override?: string | null
          season_start_date?: string | null
          season_status?: string
          sport?: string
          team_name?: string | null
          throws?: string | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          bats?: string | null
          client_id?: string
          created_at?: string
          id?: string
          jersey_number?: string | null
          photo_url?: string | null
          position?: string | null
          season_end_date?: string | null
          season_override?: string | null
          season_start_date?: string | null
          season_status?: string
          sport?: string
          team_name?: string | null
          throws?: string | null
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_studio_program_access: {
        Row: {
          client_id: string
          current_week: number | null
          granted_at: string
          id: string
          program_id: string
          started_at: string | null
        }
        Insert: {
          client_id: string
          current_week?: number | null
          granted_at?: string
          id?: string
          program_id: string
          started_at?: string | null
        }
        Update: {
          client_id?: string
          current_week?: number | null
          granted_at?: string
          id?: string
          program_id?: string
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_studio_program_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_studio_program_access_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "studio_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      client_tasks: {
        Row: {
          assigned_at: string
          attachments: Json | null
          client_id: string
          completed_at: string | null
          description: string | null
          due_date: string | null
          form_responses: Json | null
          id: string
          name: string
          notes: string | null
          reminder_enabled: boolean | null
          reminder_hours_before: number | null
          task_type: Database["public"]["Enums"]["task_type"]
          template_id: string | null
          trainer_id: string
        }
        Insert: {
          assigned_at?: string
          attachments?: Json | null
          client_id: string
          completed_at?: string | null
          description?: string | null
          due_date?: string | null
          form_responses?: Json | null
          id?: string
          name: string
          notes?: string | null
          reminder_enabled?: boolean | null
          reminder_hours_before?: number | null
          task_type?: Database["public"]["Enums"]["task_type"]
          template_id?: string | null
          trainer_id: string
        }
        Update: {
          assigned_at?: string
          attachments?: Json | null
          client_id?: string
          completed_at?: string | null
          description?: string | null
          due_date?: string | null
          form_responses?: Json | null
          id?: string
          name?: string
          notes?: string | null
          reminder_enabled?: boolean | null
          reminder_hours_before?: number | null
          task_type?: Database["public"]["Enums"]["task_type"]
          template_id?: string | null
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      client_weekly_summaries: {
        Row: {
          adherence_score: number | null
          avg_score_7d: number | null
          bodyweight_delta: number | null
          client_id: string
          completion_7d: number | null
          current_level: number
          engine_mode: string
          has_pending_suggestion: boolean
          id: string
          injury_flag: boolean | null
          level_up_eligible: boolean
          lowest_factor_mode: string | null
          needs_support_days_14d: number
          pending_suggestion_type: string | null
          performance_delta: number | null
          recovery_delta: number | null
          score_status: string
          trainer_id: string
          trend_direction: string
          updated_at: string
        }
        Insert: {
          adherence_score?: number | null
          avg_score_7d?: number | null
          bodyweight_delta?: number | null
          client_id: string
          completion_7d?: number | null
          current_level?: number
          engine_mode?: string
          has_pending_suggestion?: boolean
          id?: string
          injury_flag?: boolean | null
          level_up_eligible?: boolean
          lowest_factor_mode?: string | null
          needs_support_days_14d?: number
          pending_suggestion_type?: string | null
          performance_delta?: number | null
          recovery_delta?: number | null
          score_status?: string
          trainer_id: string
          trend_direction?: string
          updated_at?: string
        }
        Update: {
          adherence_score?: number | null
          avg_score_7d?: number | null
          bodyweight_delta?: number | null
          client_id?: string
          completion_7d?: number | null
          current_level?: number
          engine_mode?: string
          has_pending_suggestion?: boolean
          id?: string
          injury_flag?: boolean | null
          level_up_eligible?: boolean
          lowest_factor_mode?: string | null
          needs_support_days_14d?: number
          pending_suggestion_type?: string | null
          performance_delta?: number | null
          recovery_delta?: number | null
          score_status?: string
          trainer_id?: string
          trend_direction?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_weekly_summaries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_weekly_summaries_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_workout_collection_access: {
        Row: {
          client_id: string
          collection_id: string
          granted_at: string
          id: string
        }
        Insert: {
          client_id: string
          collection_id: string
          granted_at?: string
          id?: string
        }
        Update: {
          client_id?: string
          collection_id?: string
          granted_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_workout_collection_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_workout_collection_access_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "workout_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      client_workouts: {
        Row: {
          assigned_at: string
          assigned_by: string
          client_id: string
          completed_at: string | null
          id: string
          notes: string | null
          scheduled_date: string | null
          workout_plan_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          client_id: string
          completed_at?: string | null
          id?: string
          notes?: string | null
          scheduled_date?: string | null
          workout_plan_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          client_id?: string
          completed_at?: string | null
          id?: string
          notes?: string | null
          scheduled_date?: string | null
          workout_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_workouts_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_workouts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_workouts_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_custom_insights: {
        Row: {
          action_text: string | null
          client_id: string
          created_at: string
          engine_mode: string | null
          id: string
          is_active: boolean
          message: string
          trainer_id: string
        }
        Insert: {
          action_text?: string | null
          client_id: string
          created_at?: string
          engine_mode?: string | null
          id?: string
          is_active?: boolean
          message: string
          trainer_id: string
        }
        Update: {
          action_text?: string | null
          client_id?: string
          created_at?: string
          engine_mode?: string | null
          id?: string
          is_active?: boolean
          message?: string
          trainer_id?: string
        }
        Relationships: []
      }
      coach_override_log: {
        Row: {
          client_id: string
          coach_id: string
          created_at: string
          id: string
          new_value: string | null
          old_value: string | null
          override_type: string
          reason: string | null
        }
        Insert: {
          client_id: string
          coach_id: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          override_type: string
          reason?: string | null
        }
        Update: {
          client_id?: string
          coach_id?: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          override_type?: string
          reason?: string | null
        }
        Relationships: []
      }
      coach_plan_overrides: {
        Row: {
          client_id: string
          coach_id: string
          created_at: string
          id: string
          plan_id: string
          plan_source: string
          reason: string | null
        }
        Insert: {
          client_id: string
          coach_id: string
          created_at?: string
          id?: string
          plan_id: string
          plan_source?: string
          reason?: string | null
        }
        Update: {
          client_id?: string
          coach_id?: string
          created_at?: string
          id?: string
          plan_id?: string
          plan_source?: string
          reason?: string | null
        }
        Relationships: []
      }
      coaching_messages: {
        Row: {
          action_text: string | null
          client_id: string
          coach_type: string
          created_at: string
          daily_score: number | null
          delivery_slot: string
          fasting_adherence: number | null
          id: string
          is_read: boolean
          macro_adherence: number | null
          message: string
          message_date: string
          priority: number
          streak: number | null
          updated_at: string
        }
        Insert: {
          action_text?: string | null
          client_id: string
          coach_type: string
          created_at?: string
          daily_score?: number | null
          delivery_slot?: string
          fasting_adherence?: number | null
          id?: string
          is_read?: boolean
          macro_adherence?: number | null
          message: string
          message_date?: string
          priority?: number
          streak?: number | null
          updated_at?: string
        }
        Update: {
          action_text?: string | null
          client_id?: string
          coach_type?: string
          created_at?: string
          daily_score?: number | null
          delivery_slot?: string
          fasting_adherence?: number | null
          id?: string
          is_read?: boolean
          macro_adherence?: number | null
          message?: string
          message_date?: string
          priority?: number
          streak?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_sections: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          layout_type: Database["public"]["Enums"]["layout_type"] | null
          name: string
          order_index: number
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          layout_type?: Database["public"]["Enums"]["layout_type"] | null
          name: string
          order_index: number
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          layout_type?: Database["public"]["Enums"]["layout_type"] | null
          name?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "collection_sections_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "resource_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          file_name: string | null
          file_url: string | null
          id: string
          image_url: string | null
          is_pinned: boolean
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          reply_to_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "conversation_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_read_receipts: {
        Row: {
          conversation_id: string
          id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_read_receipts_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string | null
          type: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      copilot_events: {
        Row: {
          approved: boolean | null
          client_id: string
          coach_id: string
          created_at: string
          engine_mode: string
          event_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          approved?: boolean | null
          client_id: string
          coach_id: string
          created_at?: string
          engine_mode: string
          event_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          approved?: boolean | null
          client_id?: string
          coach_id?: string
          created_at?: string
          engine_mode?: string
          event_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      copilot_messages: {
        Row: {
          approved: boolean | null
          client_id: string
          coach_id: string
          created_at: string
          engine_mode: string
          id: string
          prompt_context: Json | null
          response_text: string
          use_case: string
        }
        Insert: {
          approved?: boolean | null
          client_id: string
          coach_id: string
          created_at?: string
          engine_mode: string
          id?: string
          prompt_context?: Json | null
          response_text: string
          use_case: string
        }
        Update: {
          approved?: boolean | null
          client_id?: string
          coach_id?: string
          created_at?: string
          engine_mode?: string
          id?: string
          prompt_context?: Json | null
          response_text?: string
          use_case?: string
        }
        Relationships: []
      }
      custom_equipment: {
        Row: {
          created_at: string
          icon_url: string | null
          id: string
          label: string
          trainer_id: string
        }
        Insert: {
          created_at?: string
          icon_url?: string | null
          id?: string
          label: string
          trainer_id: string
        }
        Update: {
          created_at?: string
          icon_url?: string | null
          id?: string
          label?: string
          trainer_id?: string
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          checkin_date: string
          client_id: string
          created_at: string
          id: string
          nutrition_on_track: boolean | null
          recovery_completed: boolean | null
          sleep_hours: number | null
          sleep_quality: number | null
          updated_at: string
        }
        Insert: {
          checkin_date?: string
          client_id: string
          created_at?: string
          id?: string
          nutrition_on_track?: boolean | null
          recovery_completed?: boolean | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          updated_at?: string
        }
        Update: {
          checkin_date?: string
          client_id?: string
          created_at?: string
          id?: string
          nutrition_on_track?: boolean | null
          recovery_completed?: boolean | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      dashboard_card_layouts: {
        Row: {
          cards: Json
          client_id: string | null
          created_at: string
          id: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          cards?: Json
          client_id?: string | null
          created_at?: string
          id?: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          cards?: Json
          client_id?: string | null
          created_at?: string
          id?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_card_layouts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_card_layouts_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drill_assignments: {
        Row: {
          assigned_at: string
          client_id: string
          drill_id: string
          id: string
          scheduled_date: string | null
          trainer_id: string
        }
        Insert: {
          assigned_at?: string
          client_id: string
          drill_id: string
          id?: string
          scheduled_date?: string | null
          trainer_id: string
        }
        Update: {
          assigned_at?: string
          client_id?: string
          drill_id?: string
          id?: string
          scheduled_date?: string | null
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drill_assignments_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drill_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      drill_session_results: {
        Row: {
          client_id: string
          completed_at: string
          created_at: string
          drill_id: string
          duration_seconds: number | null
          id: string
          step_results: Json | null
          total_possible: number | null
          total_score: number | null
        }
        Insert: {
          client_id: string
          completed_at?: string
          created_at?: string
          drill_id: string
          duration_seconds?: number | null
          id?: string
          step_results?: Json | null
          total_possible?: number | null
          total_score?: number | null
        }
        Update: {
          client_id?: string
          completed_at?: string
          created_at?: string
          drill_id?: string
          duration_seconds?: number | null
          id?: string
          step_results?: Json | null
          total_possible?: number | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "drill_session_results_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drill_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      drill_steps: {
        Row: {
          created_at: string
          drill_id: string
          drill_type: string | null
          duration_seconds: number | null
          id: string
          name: string
          notes: string | null
          order_index: number
          step_type: string
          target_reps: number | null
        }
        Insert: {
          created_at?: string
          drill_id: string
          drill_type?: string | null
          duration_seconds?: number | null
          id?: string
          name: string
          notes?: string | null
          order_index?: number
          step_type: string
          target_reps?: number | null
        }
        Update: {
          created_at?: string
          drill_id?: string
          drill_type?: string | null
          duration_seconds?: number | null
          id?: string
          name?: string
          notes?: string | null
          order_index?: number
          step_type?: string
          target_reps?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "drill_steps_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drill_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      drill_templates: {
        Row: {
          created_at: string
          description: string | null
          difficulty: string | null
          estimated_duration_seconds: number | null
          id: string
          is_active: boolean | null
          name: string
          sport: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          difficulty?: string | null
          estimated_duration_seconds?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          sport: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          difficulty?: string | null
          estimated_duration_seconds?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          sport?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drill_templates_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      early_session_ends: {
        Row: {
          action_attempted: string | null
          ai_suggestion_shown: boolean
          ai_suggestion_text: string | null
          client_id: string
          created_at: string
          elapsed_hours: number
          id: string
          note: string | null
          percent_complete: number
          reason: string | null
          session_type: string
          target_hours: number
        }
        Insert: {
          action_attempted?: string | null
          ai_suggestion_shown?: boolean
          ai_suggestion_text?: string | null
          client_id: string
          created_at?: string
          elapsed_hours: number
          id?: string
          note?: string | null
          percent_complete: number
          reason?: string | null
          session_type: string
          target_hours: number
        }
        Update: {
          action_attempted?: string | null
          ai_suggestion_shown?: boolean
          ai_suggestion_text?: string | null
          client_id?: string
          created_at?: string
          elapsed_hours?: number
          id?: string
          note?: string | null
          percent_complete?: number
          reason?: string | null
          session_type?: string
          target_hours?: number
        }
        Relationships: []
      }
      eating_window_meal_photos: {
        Row: {
          client_id: string
          created_at: string
          id: string
          image_url: string
          order_index: number
          trainer_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          image_url: string
          order_index?: number
          trainer_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          image_url?: string
          order_index?: number
          trainer_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      engine_score_history: {
        Row: {
          bounce_back_applied: boolean | null
          bounce_back_points: number | null
          capped_score: number
          client_id: string
          created_at: string
          delta: number | null
          engine_mode: string
          id: string
          lowest_factor: string | null
          performance_lock_active: boolean | null
          previous_score: number | null
          raw_score: number
          score_date: string
        }
        Insert: {
          bounce_back_applied?: boolean | null
          bounce_back_points?: number | null
          capped_score?: number
          client_id: string
          created_at?: string
          delta?: number | null
          engine_mode?: string
          id?: string
          lowest_factor?: string | null
          performance_lock_active?: boolean | null
          previous_score?: number | null
          raw_score?: number
          score_date: string
        }
        Update: {
          bounce_back_applied?: boolean | null
          bounce_back_points?: number | null
          capped_score?: number
          client_id?: string
          created_at?: string
          delta?: number | null
          engine_mode?: string
          id?: string
          lowest_factor?: string | null
          performance_lock_active?: boolean | null
          previous_score?: number | null
          raw_score?: number
          score_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "engine_score_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      engine_scores: {
        Row: {
          client_id: string
          computed_at: string
          engine_type: string
          id: string
          recommendation: string | null
          score: number
          status: string
          streak_days: number
          weekly_completion_pct: number
        }
        Insert: {
          client_id: string
          computed_at?: string
          engine_type: string
          id?: string
          recommendation?: string | null
          score?: number
          status: string
          streak_days?: number
          weekly_completion_pct?: number
        }
        Update: {
          client_id?: string
          computed_at?: string
          engine_type?: string
          id?: string
          recommendation?: string | null
          score?: number
          status?: string
          streak_days?: number
          weekly_completion_pct?: number
        }
        Relationships: []
      }
      exercise_alternatives: {
        Row: {
          alternative_exercise_id: string
          created_at: string | null
          exercise_id: string
          id: string
          reason: string | null
          trainer_id: string
        }
        Insert: {
          alternative_exercise_id: string
          created_at?: string | null
          exercise_id: string
          id?: string
          reason?: string | null
          trainer_id: string
        }
        Update: {
          alternative_exercise_id?: string
          created_at?: string | null
          exercise_id?: string
          id?: string
          reason?: string | null
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_alternatives_alternative_exercise_id_fkey"
            columns: ["alternative_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_alternatives_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_custom_options: {
        Row: {
          created_at: string
          id: string
          name: string
          option_type: string
          trainer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          option_type: string
          trainer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          option_type?: string
          trainer_id?: string
        }
        Relationships: []
      }
      exercise_exercise_tags: {
        Row: {
          exercise_id: string
          tag_id: string
        }
        Insert: {
          exercise_id: string
          tag_id: string
        }
        Update: {
          exercise_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_exercise_tags_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_exercise_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "exercise_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_tags: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          trainer_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          trainer_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          trainer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_tags_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          category: string | null
          cloudflare_migrated_at: string | null
          cloudflare_migration_error: string | null
          cloudflare_migration_status: string
          cloudflare_video_id: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          equipment: string | null
          exercise_type: string
          id: string
          image_url: string | null
          is_unilateral: boolean
          muscle_group: string | null
          name: string
          trainer_id: string
          video_url: string | null
        }
        Insert: {
          category?: string | null
          cloudflare_migrated_at?: string | null
          cloudflare_migration_error?: string | null
          cloudflare_migration_status?: string
          cloudflare_video_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          equipment?: string | null
          exercise_type?: string
          id?: string
          image_url?: string | null
          is_unilateral?: boolean
          muscle_group?: string | null
          name: string
          trainer_id: string
          video_url?: string | null
        }
        Update: {
          category?: string | null
          cloudflare_migrated_at?: string | null
          cloudflare_migration_error?: string | null
          cloudflare_migration_status?: string
          cloudflare_video_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          equipment?: string | null
          exercise_type?: string
          id?: string
          image_url?: string | null
          is_unilateral?: boolean
          muscle_group?: string | null
          name?: string
          trainer_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      explore_content: {
        Row: {
          author: string | null
          body: string | null
          category: string
          created_at: string
          cta_label: string | null
          featured_rank: number | null
          id: string
          image_url: string | null
          is_premium: boolean
          is_published: boolean
          popular_rank: number | null
          subtitle: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          body?: string | null
          category: string
          created_at?: string
          cta_label?: string | null
          featured_rank?: number | null
          id?: string
          image_url?: string | null
          is_premium?: boolean
          is_published?: boolean
          popular_rank?: number | null
          subtitle?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          body?: string | null
          category?: string
          created_at?: string
          cta_label?: string | null
          featured_rank?: number | null
          id?: string
          image_url?: string | null
          is_premium?: boolean
          is_published?: boolean
          popular_rank?: number | null
          subtitle?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      factor_impact_history: {
        Row: {
          avg_score: number
          created_at: string
          engine_mode: string
          factor_name: string
          id: string
          outcome_correlation: number | null
          sample_size: number | null
          trainer_id: string
          trend_direction: string | null
          week_number: number
        }
        Insert: {
          avg_score?: number
          created_at?: string
          engine_mode: string
          factor_name: string
          id?: string
          outcome_correlation?: number | null
          sample_size?: number | null
          trainer_id: string
          trend_direction?: string | null
          week_number: number
        }
        Update: {
          avg_score?: number
          created_at?: string
          engine_mode?: string
          factor_name?: string
          id?: string
          outcome_correlation?: number | null
          sample_size?: number | null
          trainer_id?: string
          trend_direction?: string | null
          week_number?: number
        }
        Relationships: []
      }
      fasting_log: {
        Row: {
          actual_hours: number
          client_id: string
          completion_pct: number
          created_at: string
          ended_at: string
          ended_early: boolean
          id: string
          started_at: string
          status: string
          target_hours: number
          trainer_id: string
        }
        Insert: {
          actual_hours: number
          client_id: string
          completion_pct?: number
          created_at?: string
          ended_at?: string
          ended_early?: boolean
          id?: string
          started_at: string
          status?: string
          target_hours: number
          trainer_id: string
        }
        Update: {
          actual_hours?: number
          client_id?: string
          completion_pct?: number
          created_at?: string
          ended_at?: string
          ended_early?: boolean
          id?: string
          started_at?: string
          status?: string
          target_hours?: number
          trainer_id?: string
        }
        Relationships: []
      }
      fasting_protocols: {
        Row: {
          category: string
          created_at: string
          description: string | null
          difficulty_level: string | null
          duration_days: number
          engine_allowed: string[]
          fast_target_hours: number
          id: string
          intensity_tier: string
          is_extended_fast: boolean
          is_youth_safe: boolean
          max_level_allowed: number | null
          min_level_required: number
          name: string
          plan_type: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          duration_days: number
          engine_allowed?: string[]
          fast_target_hours: number
          id?: string
          intensity_tier?: string
          is_extended_fast?: boolean
          is_youth_safe?: boolean
          max_level_allowed?: number | null
          min_level_required?: number
          name: string
          plan_type?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          duration_days?: number
          engine_allowed?: string[]
          fast_target_hours?: number
          id?: string
          intensity_tier?: string
          is_extended_fast?: boolean
          is_youth_safe?: boolean
          max_level_allowed?: number | null
          min_level_required?: number
          name?: string
          plan_type?: string
        }
        Relationships: []
      }
      fasting_webhook_log: {
        Row: {
          client_id: string
          error: string | null
          event_type: string
          fired_at: string
          id: string
          reference_id: string
          response_status: number | null
          status: string
          trainer_id: string
          webhook_url: string | null
        }
        Insert: {
          client_id: string
          error?: string | null
          event_type: string
          fired_at?: string
          id?: string
          reference_id: string
          response_status?: number | null
          status?: string
          trainer_id: string
          webhook_url?: string | null
        }
        Update: {
          client_id?: string
          error?: string | null
          event_type?: string
          fired_at?: string
          id?: string
          reference_id?: string
          response_status?: number | null
          status?: string
          trainer_id?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      fitness_goals: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string | null
          current_value: number | null
          description: string | null
          ended_at: string | null
          ended_reason: string | null
          goal_type: string
          id: string
          start_date: string
          status: string
          target_date: string
          target_value: number | null
          title: string
          trainer_id: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          ended_at?: string | null
          ended_reason?: string | null
          goal_type: string
          id?: string
          start_date?: string
          status?: string
          target_date: string
          target_value?: number | null
          title: string
          trainer_id: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          ended_at?: string | null
          ended_reason?: string | null
          goal_type?: string
          id?: string
          start_date?: string
          status?: string
          target_date?: string
          target_value?: number | null
          title?: string
          trainer_id?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      game_stat_entries: {
        Row: {
          assists: number | null
          at_bats: number | null
          batting_avg: number | null
          blocks: number | null
          client_id: string
          created_at: string
          doubles: number | null
          earned_runs: number | null
          errors: number | null
          fg_attempted: number | null
          fg_made: number | null
          fielders_choice: number | null
          fouls: number | null
          ft_attempted: number | null
          ft_made: number | null
          game_date: string
          game_score: string | null
          hit_by_pitch: number | null
          hits: number | null
          home_runs: number | null
          id: string
          innings_pitched: number | null
          left_on_base: number | null
          minutes_played: number | null
          notes: string | null
          on_base_pct: number | null
          opponent: string | null
          pitch_strikeouts: number | null
          plate_appearances: number | null
          points: number | null
          rbis: number | null
          reached_on_error: number | null
          rebounds: number | null
          result: string | null
          runs: number | null
          sacrifice_bunts: number | null
          sacrifice_flies: number | null
          singles: number | null
          sport: string
          sport_event_id: string | null
          steals: number | null
          stolen_bases: number | null
          strikeouts: number | null
          three_pt_attempted: number | null
          three_pt_made: number | null
          triples: number | null
          turnovers: number | null
          updated_at: string
          walks: number | null
        }
        Insert: {
          assists?: number | null
          at_bats?: number | null
          batting_avg?: number | null
          blocks?: number | null
          client_id: string
          created_at?: string
          doubles?: number | null
          earned_runs?: number | null
          errors?: number | null
          fg_attempted?: number | null
          fg_made?: number | null
          fielders_choice?: number | null
          fouls?: number | null
          ft_attempted?: number | null
          ft_made?: number | null
          game_date?: string
          game_score?: string | null
          hit_by_pitch?: number | null
          hits?: number | null
          home_runs?: number | null
          id?: string
          innings_pitched?: number | null
          left_on_base?: number | null
          minutes_played?: number | null
          notes?: string | null
          on_base_pct?: number | null
          opponent?: string | null
          pitch_strikeouts?: number | null
          plate_appearances?: number | null
          points?: number | null
          rbis?: number | null
          reached_on_error?: number | null
          rebounds?: number | null
          result?: string | null
          runs?: number | null
          sacrifice_bunts?: number | null
          sacrifice_flies?: number | null
          singles?: number | null
          sport?: string
          sport_event_id?: string | null
          steals?: number | null
          stolen_bases?: number | null
          strikeouts?: number | null
          three_pt_attempted?: number | null
          three_pt_made?: number | null
          triples?: number | null
          turnovers?: number | null
          updated_at?: string
          walks?: number | null
        }
        Update: {
          assists?: number | null
          at_bats?: number | null
          batting_avg?: number | null
          blocks?: number | null
          client_id?: string
          created_at?: string
          doubles?: number | null
          earned_runs?: number | null
          errors?: number | null
          fg_attempted?: number | null
          fg_made?: number | null
          fielders_choice?: number | null
          fouls?: number | null
          ft_attempted?: number | null
          ft_made?: number | null
          game_date?: string
          game_score?: string | null
          hit_by_pitch?: number | null
          hits?: number | null
          home_runs?: number | null
          id?: string
          innings_pitched?: number | null
          left_on_base?: number | null
          minutes_played?: number | null
          notes?: string | null
          on_base_pct?: number | null
          opponent?: string | null
          pitch_strikeouts?: number | null
          plate_appearances?: number | null
          points?: number | null
          rbis?: number | null
          reached_on_error?: number | null
          rebounds?: number | null
          result?: string | null
          runs?: number | null
          sacrifice_bunts?: number | null
          sacrifice_flies?: number | null
          singles?: number | null
          sport?: string
          sport_event_id?: string | null
          steals?: number | null
          stolen_bases?: number | null
          strikeouts?: number | null
          three_pt_attempted?: number | null
          three_pt_made?: number | null
          triples?: number | null
          turnovers?: number | null
          updated_at?: string
          walks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "game_stat_entries_sport_event_id_fkey"
            columns: ["sport_event_id"]
            isOneToOne: false
            referencedRelation: "sport_schedule_events"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_journal_entries: {
        Row: {
          client_id: string
          created_at: string
          entry_date: string
          goal_id: string | null
          id: string
          long_note: string | null
          mood_emoji: string | null
          motivation_level: number | null
          quick_note: string | null
          share_with_coach: boolean
          trainer_id: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          entry_date?: string
          goal_id?: string | null
          id?: string
          long_note?: string | null
          mood_emoji?: string | null
          motivation_level?: number | null
          quick_note?: string | null
          share_with_coach?: boolean
          trainer_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          entry_date?: string
          goal_id?: string | null
          id?: string
          long_note?: string | null
          mood_emoji?: string | null
          motivation_level?: number | null
          quick_note?: string | null
          share_with_coach?: boolean
          trainer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      goal_milestones: {
        Row: {
          achieved_at: string | null
          created_at: string | null
          goal_id: string
          id: string
          target_value: number
          title: string
        }
        Insert: {
          achieved_at?: string | null
          created_at?: string | null
          goal_id: string
          id?: string
          target_value: number
          title: string
        }
        Update: {
          achieved_at?: string | null
          created_at?: string | null
          goal_id?: string
          id?: string
          target_value?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "fitness_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_motivations: {
        Row: {
          client_id: string
          created_at: string
          goal_id: string | null
          id: string
          trainer_id: string | null
          updated_at: string
          why_audio_url: string | null
          why_image_url: string | null
          why_text: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          goal_id?: string | null
          id?: string
          trainer_id?: string | null
          updated_at?: string
          why_audio_url?: string | null
          why_image_url?: string | null
          why_text?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          goal_id?: string | null
          id?: string
          trainer_id?: string | null
          updated_at?: string
          why_audio_url?: string | null
          why_image_url?: string | null
          why_text?: string | null
        }
        Relationships: []
      }
      google_calendar_connections: {
        Row: {
          access_token: string | null
          calendar_id: string | null
          connected_at: string
          id: string
          refresh_token: string | null
          sync_from_google: boolean
          sync_to_google: boolean
          token_expires_at: string | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          calendar_id?: string | null
          connected_at?: string
          id?: string
          refresh_token?: string | null
          sync_from_google?: boolean
          sync_to_google?: boolean
          token_expires_at?: string | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          calendar_id?: string | null
          connected_at?: string
          id?: string
          refresh_token?: string | null
          sync_from_google?: boolean
          sync_to_google?: boolean
          token_expires_at?: string | null
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_connections_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_list_items: {
        Row: {
          amount: string | null
          category: string
          created_at: string
          id: string
          ingredient_name: string
          is_low_stock: boolean
          is_manual: boolean
          is_purchased: boolean
          list_id: string
          meal_sources: string[] | null
          original_amount: string | null
          unit: string | null
          used_amount: string | null
        }
        Insert: {
          amount?: string | null
          category?: string
          created_at?: string
          id?: string
          ingredient_name: string
          is_low_stock?: boolean
          is_manual?: boolean
          is_purchased?: boolean
          list_id: string
          meal_sources?: string[] | null
          original_amount?: string | null
          unit?: string | null
          used_amount?: string | null
        }
        Update: {
          amount?: string | null
          category?: string
          created_at?: string
          id?: string
          ingredient_name?: string
          is_low_stock?: boolean
          is_manual?: boolean
          is_purchased?: boolean
          list_id?: string
          meal_sources?: string[] | null
          original_amount?: string | null
          unit?: string | null
          used_amount?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grocery_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "grocery_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_lists: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_active: boolean
          list_date: string
          name: string
          updated_at: string
          week_start: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          list_date?: string
          name?: string
          updated_at?: string
          week_start?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          list_date?: string
          name?: string
          updated_at?: string
          week_start?: string | null
        }
        Relationships: []
      }
      group_class_bookings: {
        Row: {
          booked_at: string
          cancelled_at: string | null
          client_id: string
          id: string
          session_id: string
          status: string
        }
        Insert: {
          booked_at?: string
          cancelled_at?: string | null
          client_id: string
          id?: string
          session_id: string
          status?: string
        }
        Update: {
          booked_at?: string
          cancelled_at?: string | null
          client_id?: string
          id?: string
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_class_bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_class_bookings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "group_class_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      group_class_sessions: {
        Row: {
          class_id: string
          created_at: string
          end_time: string
          id: string
          is_cancelled: boolean
          max_capacity: number
          notes: string | null
          start_time: string
          trainer_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          end_time: string
          id?: string
          is_cancelled?: boolean
          max_capacity?: number
          notes?: string | null
          start_time: string
          trainer_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          end_time?: string
          id?: string
          is_cancelled?: boolean
          max_capacity?: number
          notes?: string | null
          start_time?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_class_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "group_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_class_sessions_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_classes: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          is_recurring: boolean
          location: string | null
          location_type: string
          max_capacity: number
          name: string
          recurrence_day: number | null
          recurrence_time: string | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          location?: string | null
          location_type?: string
          max_capacity?: number
          name: string
          recurrence_day?: number | null
          recurrence_time?: string | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          location?: string | null
          location_type?: string
          max_capacity?: number
          name?: string
          recurrence_day?: number | null
          recurrence_time?: string | null
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_classes_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_links: {
        Row: {
          athlete_user_id: string
          coach_note: string | null
          created_at: string
          expires_at: string
          guardian_email: string
          id: string
          linked_at: string | null
          revoked_at: string | null
          status: string
          token: string
          trainer_id: string
          weekly_summary_enabled: boolean
        }
        Insert: {
          athlete_user_id: string
          coach_note?: string | null
          created_at?: string
          expires_at?: string
          guardian_email: string
          id?: string
          linked_at?: string | null
          revoked_at?: string | null
          status?: string
          token?: string
          trainer_id: string
          weekly_summary_enabled?: boolean
        }
        Update: {
          athlete_user_id?: string
          coach_note?: string | null
          created_at?: string
          expires_at?: string
          guardian_email?: string
          id?: string
          linked_at?: string | null
          revoked_at?: string | null
          status?: string
          token?: string
          trainer_id?: string
          weekly_summary_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "guardian_links_athlete_user_id_fkey"
            columns: ["athlete_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_links_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_comments: {
        Row: {
          content: string | null
          created_at: string
          habit_id: string
          id: string
          image_url: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          habit_id: string
          id?: string
          image_url?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          habit_id?: string
          id?: string
          image_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_comments_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "client_habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_completions: {
        Row: {
          client_id: string
          completed_at: string
          completion_date: string
          habit_id: string
          id: string
          notes: string | null
          value: number
        }
        Insert: {
          client_id: string
          completed_at?: string
          completion_date: string
          habit_id: string
          id?: string
          notes?: string | null
          value?: number
        }
        Update: {
          client_id?: string
          completed_at?: string
          completion_date?: string
          habit_id?: string
          id?: string
          notes?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "habit_completions_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "client_habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_loop_notifications: {
        Row: {
          client_id: string
          created_at: string
          engaged: boolean | null
          id: string
          message: string
          notification_type: string
          scheduled_for: string
          sent_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          engaged?: boolean | null
          id?: string
          message: string
          notification_type: string
          scheduled_for: string
          sent_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          engaged?: boolean | null
          id?: string
          message?: string
          notification_type?: string
          scheduled_for?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "habit_loop_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_loop_preferences: {
        Row: {
          break_fast_enabled: boolean
          client_id: string
          created_at: string
          daily_score_enabled: boolean
          hydration_enabled: boolean
          id: string
          last_meal_enabled: boolean
          max_daily_notifications: number
          mid_window_enabled: boolean
          pre_window_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          reduce_if_ignored: boolean
          streak_protection_enabled: boolean
          updated_at: string
        }
        Insert: {
          break_fast_enabled?: boolean
          client_id: string
          created_at?: string
          daily_score_enabled?: boolean
          hydration_enabled?: boolean
          id?: string
          last_meal_enabled?: boolean
          max_daily_notifications?: number
          mid_window_enabled?: boolean
          pre_window_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          reduce_if_ignored?: boolean
          streak_protection_enabled?: boolean
          updated_at?: string
        }
        Update: {
          break_fast_enabled?: boolean
          client_id?: string
          created_at?: string
          daily_score_enabled?: boolean
          hydration_enabled?: boolean
          id?: string
          last_meal_enabled?: boolean
          max_daily_notifications?: number
          mid_window_enabled?: boolean
          pre_window_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          reduce_if_ignored?: boolean
          streak_protection_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_loop_preferences_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      handle_sessions: {
        Row: {
          client_id: string
          completed_at: string | null
          confidence_after: number | null
          confidence_before: number | null
          created_at: string
          drill_type: string
          duration_seconds: number | null
          fatigue: number | null
          hand: string
          id: string
          intensity: number | null
          mistakes: number
          reps: number
          started_at: string | null
          status: string
          target_duration_seconds: number | null
          target_reps: number | null
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          confidence_after?: number | null
          confidence_before?: number | null
          created_at?: string
          drill_type?: string
          duration_seconds?: number | null
          fatigue?: number | null
          hand?: string
          id?: string
          intensity?: number | null
          mistakes?: number
          reps?: number
          started_at?: string | null
          status?: string
          target_duration_seconds?: number | null
          target_reps?: number | null
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          confidence_after?: number | null
          confidence_before?: number | null
          created_at?: string
          drill_type?: string
          duration_seconds?: number | null
          fatigue?: number | null
          hand?: string
          id?: string
          intensity?: number | null
          mistakes?: number
          reps?: number
          started_at?: string | null
          status?: string
          target_duration_seconds?: number | null
          target_reps?: number | null
        }
        Relationships: []
      }
      health_connections: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          is_connected: boolean | null
          last_sync_at: string | null
          permissions: Json | null
          provider: string
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          is_connected?: boolean | null
          last_sync_at?: string | null
          permissions?: Json | null
          provider: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          is_connected?: boolean | null
          last_sync_at?: string | null
          permissions?: Json | null
          provider?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      health_data: {
        Row: {
          client_id: string
          created_at: string | null
          data_type: string
          id: string
          metadata: Json | null
          recorded_at: string
          source: string
          synced_at: string | null
          unit: string | null
          value: number
        }
        Insert: {
          client_id: string
          created_at?: string | null
          data_type: string
          id?: string
          metadata?: Json | null
          recorded_at: string
          source: string
          synced_at?: string | null
          unit?: string | null
          value: number
        }
        Update: {
          client_id?: string
          created_at?: string | null
          data_type?: string
          id?: string
          metadata?: Json | null
          recorded_at?: string
          source?: string
          synced_at?: string | null
          unit?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "health_data_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      health_notifications: {
        Row: {
          client_id: string
          created_at: string
          id: string
          message: string
          notification_type: string
          read_at: string | null
          sent_at: string
          trainer_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          message: string
          notification_type: string
          read_at?: string | null
          sent_at?: string
          trainer_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          message?: string
          notification_type?: string
          read_at?: string | null
          sent_at?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_notifications_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_checkins: {
        Row: {
          assigned: boolean
          checkin_date: string
          client_id: string
          completed: boolean
          created_at: string
          description: string | null
          id: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned?: boolean
          checkin_date?: string
          client_id: string
          completed?: boolean
          created_at?: string
          description?: string | null
          id?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assigned?: boolean
          checkin_date?: string
          client_id?: string
          completed?: boolean
          created_at?: string
          description?: string | null
          id?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      in_app_notifications: {
        Row: {
          action_url: string | null
          body: string | null
          created_at: string
          id: string
          read_at: string | null
          reference_id: string | null
          send_id: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          reference_id?: string | null
          send_id?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          reference_id?: string | null
          send_id?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "in_app_notifications_send_id_fkey"
            columns: ["send_id"]
            isOneToOne: false
            referencedRelation: "notification_sends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "in_app_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      keto_categories: {
        Row: {
          color: string
          created_at: string
          icon_name: string
          id: string
          name: string
          order_index: number
          trainer_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon_name?: string
          id?: string
          name: string
          order_index?: number
          trainer_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          icon_name?: string
          id?: string
          name?: string
          order_index?: number
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "keto_categories_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      keto_types: {
        Row: {
          abbreviation: string
          built_for: string[] | null
          carb_grams: number | null
          carb_limit_grams: number | null
          carbs_pct: number
          category_id: string
          coach_notes: string[] | null
          color: string
          created_at: string
          description: string | null
          difficulty: string
          engine_compatibility: string
          fat_grams: number | null
          fat_pct: number
          how_it_works: string | null
          id: string
          is_active: boolean
          macro_mode: string
          name: string
          order_index: number
          protein_grams: number | null
          protein_pct: number
          subtitle: string | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          abbreviation: string
          built_for?: string[] | null
          carb_grams?: number | null
          carb_limit_grams?: number | null
          carbs_pct?: number
          category_id: string
          coach_notes?: string[] | null
          color?: string
          created_at?: string
          description?: string | null
          difficulty?: string
          engine_compatibility?: string
          fat_grams?: number | null
          fat_pct?: number
          how_it_works?: string | null
          id?: string
          is_active?: boolean
          macro_mode?: string
          name: string
          order_index?: number
          protein_grams?: number | null
          protein_pct?: number
          subtitle?: string | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          abbreviation?: string
          built_for?: string[] | null
          carb_grams?: number | null
          carb_limit_grams?: number | null
          carbs_pct?: number
          category_id?: string
          coach_notes?: string[] | null
          color?: string
          created_at?: string
          description?: string | null
          difficulty?: string
          engine_compatibility?: string
          fat_grams?: number | null
          fat_pct?: number
          how_it_works?: string | null
          id?: string
          is_active?: boolean
          macro_mode?: string
          name?: string
          order_index?: number
          protein_grams?: number | null
          protein_pct?: number
          subtitle?: string | null
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "keto_types_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "keto_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keto_types_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_card_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          lab_key: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          lab_key: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          lab_key?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_card_images_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_workout_assignments: {
        Row: {
          assigned_at: string
          client_id: string
          id: string
          is_on_demand: boolean
          lab_workout_id: string
          scheduled_date: string | null
          trainer_id: string
        }
        Insert: {
          assigned_at?: string
          client_id: string
          id?: string
          is_on_demand?: boolean
          lab_workout_id: string
          scheduled_date?: string | null
          trainer_id: string
        }
        Update: {
          assigned_at?: string
          client_id?: string
          id?: string
          is_on_demand?: boolean
          lab_workout_id?: string
          scheduled_date?: string | null
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_workout_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_workout_assignments_lab_workout_id_fkey"
            columns: ["lab_workout_id"]
            isOneToOne: false
            referencedRelation: "lab_workouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_workout_assignments_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_workout_exercises: {
        Row: {
          created_at: string
          duration_seconds: number | null
          exercise_id: string | null
          id: string
          lab_workout_id: string
          name: string
          notes: string | null
          order_index: number
          reps: number | null
          rest_seconds: number | null
          sets: number | null
          tracking_config: Json | null
          tracking_method: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          exercise_id?: string | null
          id?: string
          lab_workout_id: string
          name: string
          notes?: string | null
          order_index?: number
          reps?: number | null
          rest_seconds?: number | null
          sets?: number | null
          tracking_config?: Json | null
          tracking_method?: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          exercise_id?: string | null
          id?: string
          lab_workout_id?: string
          name?: string
          notes?: string | null
          order_index?: number
          reps?: number | null
          rest_seconds?: number | null
          sets?: number | null
          tracking_config?: Json | null
          tracking_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_workout_exercises_lab_workout_id_fkey"
            columns: ["lab_workout_id"]
            isOneToOne: false
            referencedRelation: "lab_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_workout_sessions: {
        Row: {
          assignment_id: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          duration_seconds: number | null
          exercise_results: Json | null
          id: string
          lab_workout_id: string
          started_at: string
          status: string
        }
        Insert: {
          assignment_id?: string | null
          client_id: string
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          exercise_results?: Json | null
          id?: string
          lab_workout_id: string
          started_at?: string
          status?: string
        }
        Update: {
          assignment_id?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          exercise_results?: Json | null
          id?: string
          lab_workout_id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_workout_sessions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "lab_workout_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_workout_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_workout_sessions_lab_workout_id_fkey"
            columns: ["lab_workout_id"]
            isOneToOne: false
            referencedRelation: "lab_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_workouts: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          difficulty: string | null
          estimated_duration_minutes: number | null
          id: string
          is_active: boolean
          is_template: boolean
          name: string
          sport: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_active?: boolean
          is_template?: boolean
          name: string
          sport?: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_active?: boolean
          is_template?: boolean
          name?: string
          sport?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_workouts_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_opt_ins: {
        Row: {
          client_id: string
          created_at: string
          display_name: string | null
          id: string
          opted_in: boolean
          sport: string
        }
        Insert: {
          client_id: string
          created_at?: string
          display_name?: string | null
          id?: string
          opted_in?: boolean
          sport?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          display_name?: string | null
          id?: string
          opted_in?: boolean
          sport?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_opt_ins_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_settings: {
        Row: {
          anonymize_names: boolean
          created_at: string
          id: string
          is_enabled: boolean
          metric_type: string
          show_top_n: number
          sport: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          anonymize_names?: boolean
          created_at?: string
          id?: string
          is_enabled?: boolean
          metric_type?: string
          show_top_n?: number
          sport?: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          anonymize_names?: boolean
          created_at?: string
          id?: string
          is_enabled?: boolean
          metric_type?: string
          show_top_n?: number
          sport?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_settings_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      macro_corrections: {
        Row: {
          client_id: string
          corrected_calories: number | null
          corrected_carbs: number | null
          corrected_fats: number | null
          corrected_protein: number | null
          correction_flags: string[]
          created_at: string
          final_calories: number | null
          final_carbs: number | null
          final_fats: number | null
          final_protein: number | null
          id: string
          meal_name: string
          original_calories: number | null
          original_carbs: number | null
          original_fats: number | null
          original_protein: number | null
          source: string
          suggestion_text: string | null
          user_action: string
        }
        Insert: {
          client_id: string
          corrected_calories?: number | null
          corrected_carbs?: number | null
          corrected_fats?: number | null
          corrected_protein?: number | null
          correction_flags?: string[]
          created_at?: string
          final_calories?: number | null
          final_carbs?: number | null
          final_fats?: number | null
          final_protein?: number | null
          id?: string
          meal_name: string
          original_calories?: number | null
          original_carbs?: number | null
          original_fats?: number | null
          original_protein?: number | null
          source?: string
          suggestion_text?: string | null
          user_action?: string
        }
        Update: {
          client_id?: string
          corrected_calories?: number | null
          corrected_carbs?: number | null
          corrected_fats?: number | null
          corrected_protein?: number | null
          correction_flags?: string[]
          created_at?: string
          final_calories?: number | null
          final_carbs?: number | null
          final_fats?: number | null
          final_protein?: number | null
          id?: string
          meal_name?: string
          original_calories?: number | null
          original_carbs?: number | null
          original_fats?: number | null
          original_protein?: number | null
          source?: string
          suggestion_text?: string | null
          user_action?: string
        }
        Relationships: []
      }
      meal_plan_categories: {
        Row: {
          id: string
          meal_plan_id: string
          name: string
          order_index: number
        }
        Insert: {
          id?: string
          meal_plan_id: string
          name: string
          order_index?: number
        }
        Update: {
          id?: string
          meal_plan_id?: string
          name?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_categories_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_days: {
        Row: {
          day_of_week: number
          id: string
          meal_plan_id: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          notes: string | null
          order_index: number | null
          plan_date: string
          recipe_id: string
          servings: number | null
          week_number: number
        }
        Insert: {
          day_of_week?: number
          id?: string
          meal_plan_id: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          notes?: string | null
          order_index?: number | null
          plan_date: string
          recipe_id: string
          servings?: number | null
          week_number?: number
        }
        Update: {
          day_of_week?: number
          id?: string
          meal_plan_id?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          notes?: string | null
          order_index?: number | null
          plan_date?: string
          recipe_id?: string
          servings?: number | null
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_days_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_days_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_flexible_options: {
        Row: {
          id: string
          meal_plan_id: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          order_index: number | null
          recipe_id: string
          week_number: number
        }
        Insert: {
          id?: string
          meal_plan_id: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          order_index?: number | null
          recipe_id: string
          week_number?: number
        }
        Update: {
          id?: string
          meal_plan_id?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          order_index?: number | null
          recipe_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_flexible_options_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_flexible_options_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_notes: {
        Row: {
          content: string
          created_at: string
          day_of_week: number | null
          id: string
          meal_plan_id: string
          note_type: string
          updated_at: string
          week_number: number
        }
        Insert: {
          content?: string
          created_at?: string
          day_of_week?: number | null
          id?: string
          meal_plan_id: string
          note_type: string
          updated_at?: string
          week_number?: number
        }
        Update: {
          content?: string
          created_at?: string
          day_of_week?: number | null
          id?: string
          meal_plan_id?: string
          note_type?: string
          updated_at?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_notes_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          num_weeks: number
          plan_type: Database["public"]["Enums"]["meal_plan_type"]
          status: string
          target_calories: number | null
          target_carbs: number | null
          target_fats: number | null
          target_protein: number | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          num_weeks?: number
          plan_type: Database["public"]["Enums"]["meal_plan_type"]
          status?: string
          target_calories?: number | null
          target_carbs?: number | null
          target_fats?: number | null
          target_protein?: number | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          num_weeks?: number
          plan_type?: Database["public"]["Enums"]["meal_plan_type"]
          status?: string
          target_calories?: number | null
          target_carbs?: number | null
          target_fats?: number | null
          target_protein?: number | null
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "conversation_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_definitions: {
        Row: {
          category: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          trainer_id: string | null
          unit: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          trainer_id?: string | null
          unit?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          trainer_id?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "metric_definitions_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_entries: {
        Row: {
          client_id: string
          client_metric_id: string
          created_at: string
          id: string
          notes: string | null
          recorded_at: string
          value: number
        }
        Insert: {
          client_id: string
          client_metric_id: string
          created_at?: string
          id?: string
          notes?: string | null
          recorded_at?: string
          value: number
        }
        Update: {
          client_id?: string
          client_metric_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          recorded_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "metric_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metric_entries_client_metric_id_fkey"
            columns: ["client_metric_id"]
            isOneToOne: false
            referencedRelation: "client_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_events: {
        Row: {
          body: string | null
          dismissed_at: string | null
          engine_mode: string
          id: string
          opened_at: string | null
          sent_at: string
          suppression_reason: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          dismissed_at?: string | null
          engine_mode: string
          id?: string
          opened_at?: string | null
          sent_at?: string
          suppression_reason?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          dismissed_at?: string | null
          engine_mode?: string
          id?: string
          opened_at?: string | null
          sent_at?: string
          suppression_reason?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          body: string | null
          created_at: string
          delivered_count: number | null
          error: string | null
          id: string
          kind: string
          reference_id: string | null
          status: string
          subscription_count: number | null
          title: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          delivered_count?: number | null
          error?: string | null
          id?: string
          kind: string
          reference_id?: string | null
          status?: string
          subscription_count?: number | null
          title?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          delivered_count?: number | null
          error?: string | null
          id?: string
          kind?: string
          reference_id?: string | null
          status?: string
          subscription_count?: number | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          activity_threshold_calories: number | null
          activity_threshold_steps: number | null
          created_at: string | null
          email_enabled: boolean | null
          health_sync_alerts: boolean | null
          id: string
          low_activity_alerts: boolean | null
          push_enabled: boolean | null
          push_subscription: Json | null
          reminder_hours_before: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activity_threshold_calories?: number | null
          activity_threshold_steps?: number | null
          created_at?: string | null
          email_enabled?: boolean | null
          health_sync_alerts?: boolean | null
          id?: string
          low_activity_alerts?: boolean | null
          push_enabled?: boolean | null
          push_subscription?: Json | null
          reminder_hours_before?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activity_threshold_calories?: number | null
          activity_threshold_steps?: number | null
          created_at?: string | null
          email_enabled?: boolean | null
          health_sync_alerts?: boolean | null
          id?: string
          low_activity_alerts?: boolean | null
          push_enabled?: boolean | null
          push_subscription?: Json | null
          reminder_hours_before?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_send_recipients: {
        Row: {
          channel: string
          client_id: string
          created_at: string
          error_message: string | null
          id: string
          send_id: string
          sent_at: string | null
          status: string
        }
        Insert: {
          channel?: string
          client_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          send_id: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          channel?: string
          client_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          send_id?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_send_recipients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_send_recipients_send_id_fkey"
            columns: ["send_id"]
            isOneToOne: false
            referencedRelation: "notification_sends"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_sends: {
        Row: {
          body_html: string | null
          channel: string
          created_at: string
          failed_count: number
          id: string
          recipient_filter: Json | null
          recipient_type: string
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number
          status: string
          subject: string
          template_id: string | null
          total_recipients: number
          trainer_id: string
          updated_at: string
        }
        Insert: {
          body_html?: string | null
          channel?: string
          created_at?: string
          failed_count?: number
          id?: string
          recipient_filter?: Json | null
          recipient_type?: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject: string
          template_id?: string | null
          total_recipients?: number
          trainer_id: string
          updated_at?: string
        }
        Update: {
          body_html?: string | null
          channel?: string
          created_at?: string
          failed_count?: number
          id?: string
          recipient_filter?: Json | null
          recipient_type?: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject?: string
          template_id?: string | null
          total_recipients?: number
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_sends_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_sends_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body_html: string | null
          body_json: Json | null
          category: string
          channel: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          subject: string | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          body_html?: string | null
          body_json?: Json | null
          category?: string
          channel?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          subject?: string | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          body_html?: string | null
          body_json?: Json | null
          category?: string
          channel?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          subject?: string | null
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_logs: {
        Row: {
          calories: number | null
          carbs: number | null
          client_id: string
          created_at: string
          fats: number | null
          id: string
          image_url: string | null
          log_date: string
          meal_name: string
          notes: string | null
          protein: number | null
        }
        Insert: {
          calories?: number | null
          carbs?: number | null
          client_id: string
          created_at?: string
          fats?: number | null
          id?: string
          image_url?: string | null
          log_date?: string
          meal_name: string
          notes?: string | null
          protein?: number | null
        }
        Update: {
          calories?: number | null
          carbs?: number | null
          client_id?: string
          created_at?: string
          fats?: number | null
          id?: string
          image_url?: string | null
          log_date?: string
          meal_name?: string
          notes?: string | null
          protein?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ondemand_workouts: {
        Row: {
          cloudflare_video_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          thumbnail_url: string | null
          trainer_id: string
          type: Database["public"]["Enums"]["ondemand_workout_type"]
          updated_at: string
          video_url: string | null
          workout_plan_id: string | null
        }
        Insert: {
          cloudflare_video_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          thumbnail_url?: string | null
          trainer_id: string
          type: Database["public"]["Enums"]["ondemand_workout_type"]
          updated_at?: string
          video_url?: string | null
          workout_plan_id?: string | null
        }
        Update: {
          cloudflare_video_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          thumbnail_url?: string | null
          trainer_id?: string
          type?: Database["public"]["Enums"]["ondemand_workout_type"]
          updated_at?: string
          video_url?: string | null
          workout_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ondemand_workouts_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ondemand_workouts_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_synergy_content: {
        Row: {
          created_at: string
          id: string
          keto_type_id: string
          keto_type_name: string
          protocol_id: string
          protocol_name: string
          protocol_type: string
          synergy_text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          keto_type_id: string
          keto_type_name: string
          protocol_id: string
          protocol_name: string
          protocol_type?: string
          synergy_text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          keto_type_id?: string
          keto_type_name?: string
          protocol_id?: string
          protocol_name?: string
          protocol_type?: string
          synergy_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_synergy_content_keto_type_id_fkey"
            columns: ["keto_type_id"]
            isOneToOne: false
            referencedRelation: "keto_types"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_backgrounds: {
        Row: {
          category: string | null
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          layer: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          layer: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          layer?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      portal_category_backgrounds: {
        Row: {
          category: string
          horizon_id: string | null
          nebula_id: string | null
          show_horizon: boolean
          updated_at: string
        }
        Insert: {
          category: string
          horizon_id?: string | null
          nebula_id?: string | null
          show_horizon?: boolean
          updated_at?: string
        }
        Update: {
          category?: string
          horizon_id?: string | null
          nebula_id?: string | null
          show_horizon?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_category_backgrounds_horizon_id_fkey"
            columns: ["horizon_id"]
            isOneToOne: false
            referencedRelation: "portal_backgrounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_category_backgrounds_nebula_id_fkey"
            columns: ["nebula_id"]
            isOneToOne: false
            referencedRelation: "portal_backgrounds"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_scenes: {
        Row: {
          audio_url: string | null
          audio_volume: number
          category: string
          cloudflare_video_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_premium: boolean
          loop_video: boolean
          name: string
          override_horizon_id: string | null
          override_nebula_id: string | null
          override_show_horizon: boolean | null
          sort_order: number
          thumbnail_url: string | null
          trainer_id: string
          updated_at: string
          video_url: string
        }
        Insert: {
          audio_url?: string | null
          audio_volume?: number
          category?: string
          cloudflare_video_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_premium?: boolean
          loop_video?: boolean
          name: string
          override_horizon_id?: string | null
          override_nebula_id?: string | null
          override_show_horizon?: boolean | null
          sort_order?: number
          thumbnail_url?: string | null
          trainer_id: string
          updated_at?: string
          video_url: string
        }
        Update: {
          audio_url?: string | null
          audio_volume?: number
          category?: string
          cloudflare_video_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_premium?: boolean
          loop_video?: boolean
          name?: string
          override_horizon_id?: string | null
          override_nebula_id?: string | null
          override_show_horizon?: boolean | null
          sort_order?: number
          thumbnail_url?: string | null
          trainer_id?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_scenes_override_horizon_id_fkey"
            columns: ["override_horizon_id"]
            isOneToOne: false
            referencedRelation: "portal_backgrounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_scenes_override_nebula_id_fkey"
            columns: ["override_nebula_id"]
            isOneToOne: false
            referencedRelation: "portal_backgrounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_scenes_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          engine_mode: Database["public"]["Enums"]["engine_mode"]
          full_name: string | null
          grace_period_ends_at: string | null
          id: string
          onboarding_answers: Json | null
          onboarding_completed: boolean
          role: Database["public"]["Enums"]["user_role"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_canceled_at: string | null
          subscription_renews_at: string | null
          subscription_status: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          zapier_webhook_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          engine_mode?: Database["public"]["Enums"]["engine_mode"]
          full_name?: string | null
          grace_period_ends_at?: string | null
          id: string
          onboarding_answers?: Json | null
          onboarding_completed?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_canceled_at?: string | null
          subscription_renews_at?: string | null
          subscription_status?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          zapier_webhook_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          engine_mode?: Database["public"]["Enums"]["engine_mode"]
          full_name?: string | null
          grace_period_ends_at?: string | null
          id?: string
          onboarding_answers?: Json | null
          onboarding_completed?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_canceled_at?: string | null
          subscription_renews_at?: string | null
          subscription_status?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          zapier_webhook_url?: string | null
        }
        Relationships: []
      }
      program_templates: {
        Row: {
          category: string
          cover_image_url: string | null
          created_at: string
          days_per_week: number
          description: string | null
          difficulty: string
          duration_weeks: number
          equipment: string[] | null
          id: string
          is_active: boolean
          name: string
          tags: string[] | null
        }
        Insert: {
          category?: string
          cover_image_url?: string | null
          created_at?: string
          days_per_week?: number
          description?: string | null
          difficulty?: string
          duration_weeks?: number
          equipment?: string[] | null
          id?: string
          is_active?: boolean
          name: string
          tags?: string[] | null
        }
        Update: {
          category?: string
          cover_image_url?: string | null
          created_at?: string
          days_per_week?: number
          description?: string | null
          difficulty?: string
          duration_weeks?: number
          equipment?: string[] | null
          id?: string
          is_active?: boolean
          name?: string
          tags?: string[] | null
        }
        Relationships: []
      }
      program_workouts: {
        Row: {
          created_at: string
          day_of_week: number
          id: string
          notes: string | null
          order_index: number
          program_id: string
          week_number: number
          workout_id: string
        }
        Insert: {
          created_at?: string
          day_of_week?: number
          id?: string
          notes?: string | null
          order_index?: number
          program_id: string
          week_number?: number
          workout_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          notes?: string | null
          order_index?: number
          program_id?: string
          week_number?: number
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_workouts_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_workouts_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          cover_image_url: string | null
          created_at: string
          days_per_week: number
          description: string | null
          duration_weeks: number
          experience_level: string | null
          id: string
          modality: string | null
          name: string
          status: string
          tags: string[] | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          days_per_week?: number
          description?: string | null
          duration_weeks?: number
          experience_level?: string | null
          id?: string
          modality?: string | null
          name: string
          status?: string
          tags?: string[] | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          days_per_week?: number
          description?: string | null
          duration_weeks?: number
          experience_level?: string | null
          id?: string
          modality?: string | null
          name?: string
          status?: string
          tags?: string[] | null
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      progress_entries: {
        Row: {
          body_fat_percentage: number | null
          client_id: string
          created_at: string
          entry_date: string
          id: string
          measurements: Json | null
          notes: string | null
          photos: Json | null
          weight: number | null
        }
        Insert: {
          body_fat_percentage?: number | null
          client_id: string
          created_at?: string
          entry_date?: string
          id?: string
          measurements?: Json | null
          notes?: string | null
          photos?: Json | null
          weight?: number | null
        }
        Update: {
          body_fat_percentage?: number | null
          client_id?: string
          created_at?: string
          entry_date?: string
          id?: string
          measurements?: Json | null
          notes?: string | null
          photos?: Json | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "progress_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscription_removals: {
        Row: {
          created_at: string
          endpoint_host: string | null
          id: string
          reason: string
          removed_at: string
          removed_by: string
          resolved_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint_host?: string | null
          id?: string
          reason: string
          removed_at?: string
          removed_by: string
          resolved_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint_host?: string | null
          id?: string
          reason?: string
          removed_at?: string
          removed_by?: string
          resolved_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_label: string | null
          endpoint: string
          id: string
          last_seen_at: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_label?: string | null
          endpoint: string
          id?: string
          last_seen_at?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_label?: string | null
          endpoint?: string
          id?: string
          last_seen_at?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quick_fasting_plans: {
        Row: {
          created_at: string
          description: Json | null
          difficulty_group: string
          eat_hours: number
          engine_allowed: string[]
          fast_hours: number
          id: string
          intensity_tier: string
          is_extended_fast: boolean
          is_youth_safe: boolean
          max_level_allowed: number | null
          min_level_required: number
          name: string
          order_index: number
          plan_type: string
        }
        Insert: {
          created_at?: string
          description?: Json | null
          difficulty_group?: string
          eat_hours: number
          engine_allowed?: string[]
          fast_hours: number
          id?: string
          intensity_tier?: string
          is_extended_fast?: boolean
          is_youth_safe?: boolean
          max_level_allowed?: number | null
          min_level_required?: number
          name: string
          order_index?: number
          plan_type?: string
        }
        Update: {
          created_at?: string
          description?: Json | null
          difficulty_group?: string
          eat_hours?: number
          engine_allowed?: string[]
          fast_hours?: number
          id?: string
          intensity_tier?: string
          is_extended_fast?: boolean
          is_youth_safe?: boolean
          max_level_allowed?: number | null
          min_level_required?: number
          name?: string
          order_index?: number
          plan_type?: string
        }
        Relationships: []
      }
      recipe_book_recipes: {
        Row: {
          id: string
          order_index: number
          recipe_book_id: string
          recipe_id: string
        }
        Insert: {
          id?: string
          order_index?: number
          recipe_book_id: string
          recipe_id: string
        }
        Update: {
          id?: string
          order_index?: number
          recipe_book_id?: string
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_book_recipes_recipe_book_id_fkey"
            columns: ["recipe_book_id"]
            isOneToOne: false
            referencedRelation: "recipe_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_book_recipes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_books: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_featured: boolean | null
          name: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean | null
          name: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean | null
          name?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          amount: string | null
          id: string
          name: string
          notes: string | null
          order_index: number
          recipe_id: string
          unit: string | null
        }
        Insert: {
          amount?: string | null
          id?: string
          name: string
          notes?: string | null
          order_index?: number
          recipe_id: string
          unit?: string | null
        }
        Update: {
          amount?: string | null
          id?: string
          name?: string
          notes?: string | null
          order_index?: number
          recipe_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          avoid_if: string[] | null
          best_for: string[] | null
          calories: number | null
          carb_limit_note: string | null
          carbs: number | null
          cook_time_minutes: number | null
          craving_replacement: string | null
          created_at: string
          description: string | null
          digestion_load: string | null
          fats: number | null
          id: string
          if_roles: string[] | null
          image_url: string | null
          ingredients_list: string | null
          instructions: string | null
          is_valid: boolean
          keto_types: string[] | null
          macro_profile: string
          meal_intensity: string | null
          meal_role: string | null
          meal_timing: string | null
          name: string
          prep_time_minutes: number | null
          protein: number | null
          protein_target_note: string | null
          satiety_score: number | null
          servings: number | null
          subtype: string | null
          tags: string[] | null
          trainer_id: string
          trigger_conditions: string[] | null
          updated_at: string
          validation_flags: string[]
          why_it_works: string | null
        }
        Insert: {
          avoid_if?: string[] | null
          best_for?: string[] | null
          calories?: number | null
          carb_limit_note?: string | null
          carbs?: number | null
          cook_time_minutes?: number | null
          craving_replacement?: string | null
          created_at?: string
          description?: string | null
          digestion_load?: string | null
          fats?: number | null
          id?: string
          if_roles?: string[] | null
          image_url?: string | null
          ingredients_list?: string | null
          instructions?: string | null
          is_valid?: boolean
          keto_types?: string[] | null
          macro_profile?: string
          meal_intensity?: string | null
          meal_role?: string | null
          meal_timing?: string | null
          name: string
          prep_time_minutes?: number | null
          protein?: number | null
          protein_target_note?: string | null
          satiety_score?: number | null
          servings?: number | null
          subtype?: string | null
          tags?: string[] | null
          trainer_id: string
          trigger_conditions?: string[] | null
          updated_at?: string
          validation_flags?: string[]
          why_it_works?: string | null
        }
        Update: {
          avoid_if?: string[] | null
          best_for?: string[] | null
          calories?: number | null
          carb_limit_note?: string | null
          carbs?: number | null
          cook_time_minutes?: number | null
          craving_replacement?: string | null
          created_at?: string
          description?: string | null
          digestion_load?: string | null
          fats?: number | null
          id?: string
          if_roles?: string[] | null
          image_url?: string | null
          ingredients_list?: string | null
          instructions?: string | null
          is_valid?: boolean
          keto_types?: string[] | null
          macro_profile?: string
          meal_intensity?: string | null
          meal_role?: string | null
          meal_timing?: string | null
          name?: string
          prep_time_minutes?: number | null
          protein?: number | null
          protein_target_note?: string | null
          satiety_score?: number | null
          servings?: number | null
          subtype?: string | null
          tags?: string[] | null
          trainer_id?: string
          trigger_conditions?: string[] | null
          updated_at?: string
          validation_flags?: string[]
          why_it_works?: string | null
        }
        Relationships: []
      }
      recommendation_events: {
        Row: {
          client_id: string
          coach_approved: boolean
          coach_approved_at: string | null
          coach_id: string | null
          coach_override_required: boolean
          created_at: string
          date: string
          dismissal_note: string | null
          dismissal_reason: string | null
          dismissed: boolean
          dismissed_at: string | null
          engine_mode: string
          id: string
          lowest_factor: string | null
          plan_suggestion_text: string | null
          plan_suggestion_type: string | null
          score_total: number
          status: string
          today_recommendation_text: string
          week_recommendation_text: string
        }
        Insert: {
          client_id: string
          coach_approved?: boolean
          coach_approved_at?: string | null
          coach_id?: string | null
          coach_override_required?: boolean
          created_at?: string
          date?: string
          dismissal_note?: string | null
          dismissal_reason?: string | null
          dismissed?: boolean
          dismissed_at?: string | null
          engine_mode: string
          id?: string
          lowest_factor?: string | null
          plan_suggestion_text?: string | null
          plan_suggestion_type?: string | null
          score_total?: number
          status?: string
          today_recommendation_text: string
          week_recommendation_text: string
        }
        Update: {
          client_id?: string
          coach_approved?: boolean
          coach_approved_at?: string | null
          coach_id?: string | null
          coach_override_required?: boolean
          created_at?: string
          date?: string
          dismissal_note?: string | null
          dismissal_reason?: string | null
          dismissed?: boolean
          dismissed_at?: string | null
          engine_mode?: string
          id?: string
          lowest_factor?: string | null
          plan_suggestion_text?: string | null
          plan_suggestion_type?: string | null
          score_total?: number
          status?: string
          today_recommendation_text?: string
          week_recommendation_text?: string
        }
        Relationships: []
      }
      recurring_checkin_schedules: {
        Row: {
          ai_auto_draft: boolean
          ai_auto_send: boolean
          client_id: string
          created_at: string
          day_of_month: number | null
          day_of_week: number | null
          frequency: string
          id: string
          is_active: boolean
          last_triggered_at: string | null
          next_trigger_at: string | null
          schedule_name: string
          schedule_type: string
          template_id: string | null
          time_of_day: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          ai_auto_draft?: boolean
          ai_auto_send?: boolean
          client_id: string
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          next_trigger_at?: string | null
          schedule_name: string
          schedule_type?: string
          template_id?: string | null
          time_of_day?: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          ai_auto_draft?: boolean
          ai_auto_send?: boolean
          client_id?: string
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          next_trigger_at?: string | null
          schedule_name?: string
          schedule_type?: string
          template_id?: string | null
          time_of_day?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_checkin_schedules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_checkin_schedules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_checkin_schedules_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_collections: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_published: boolean | null
          name: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean | null
          name: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean | null
          name?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_collections_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          cover_image_url: string | null
          created_at: string
          file_path: string | null
          id: string
          name: string
          trainer_id: string
          type: Database["public"]["Enums"]["resource_type"]
          updated_at: string
          url: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          file_path?: string | null
          id?: string
          name: string
          trainer_id: string
          type: Database["public"]["Enums"]["resource_type"]
          updated_at?: string
          url?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          file_path?: string | null
          id?: string
          name?: string
          trainer_id?: string
          type?: Database["public"]["Enums"]["resource_type"]
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      restore_guided_sessions: {
        Row: {
          ambient_sound_id: string | null
          breathing_pattern: Json | null
          category: string
          created_at: string
          description: string | null
          duration_seconds: number
          icon_name: string | null
          id: string
          is_premium: boolean
          is_published: boolean
          name: string
          sort_order: number
          subtitle: string | null
          thumbnail_url: string | null
          time_of_day_priority: string[] | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          ambient_sound_id?: string | null
          breathing_pattern?: Json | null
          category?: string
          created_at?: string
          description?: string | null
          duration_seconds?: number
          icon_name?: string | null
          id?: string
          is_premium?: boolean
          is_published?: boolean
          name: string
          sort_order?: number
          subtitle?: string | null
          thumbnail_url?: string | null
          time_of_day_priority?: string[] | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          ambient_sound_id?: string | null
          breathing_pattern?: Json | null
          category?: string
          created_at?: string
          description?: string | null
          duration_seconds?: number
          icon_name?: string | null
          id?: string
          is_premium?: boolean
          is_published?: boolean
          name?: string
          sort_order?: number
          subtitle?: string | null
          thumbnail_url?: string | null
          time_of_day_priority?: string[] | null
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restore_guided_sessions_ambient_sound_id_fkey"
            columns: ["ambient_sound_id"]
            isOneToOne: false
            referencedRelation: "vibes_sounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restore_guided_sessions_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      restore_session_voices: {
        Row: {
          audio_url: string
          created_at: string
          duration_seconds: number | null
          id: string
          session_id: string
          voice_label: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          session_id: string
          voice_label?: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          session_id?: string
          voice_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "restore_session_voices_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "restore_guided_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      restore_sleep_stories: {
        Row: {
          ambient_sound_id: string | null
          created_at: string
          description: string | null
          id: string
          is_premium: boolean
          is_published: boolean
          name: string
          sort_order: number
          story_type: string
          subtitle: string | null
          thumbnail_url: string | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          ambient_sound_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_premium?: boolean
          is_published?: boolean
          name: string
          sort_order?: number
          story_type?: string
          subtitle?: string | null
          thumbnail_url?: string | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          ambient_sound_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_premium?: boolean
          is_published?: boolean
          name?: string
          sort_order?: number
          story_type?: string
          subtitle?: string | null
          thumbnail_url?: string | null
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restore_sleep_stories_ambient_sound_id_fkey"
            columns: ["ambient_sound_id"]
            isOneToOne: false
            referencedRelation: "vibes_sounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restore_sleep_stories_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      restore_story_voices: {
        Row: {
          audio_url: string
          created_at: string
          duration_seconds: number | null
          id: string
          story_id: string
          voice_label: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          story_id: string
          voice_label?: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          story_id?: string
          voice_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "restore_story_voices_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "restore_sleep_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_workouts: {
        Row: {
          client_id: string
          id: string
          saved_at: string
          workout_plan_id: string
        }
        Insert: {
          client_id: string
          id?: string
          saved_at?: string
          workout_plan_id: string
        }
        Update: {
          client_id?: string
          id?: string
          saved_at?: string
          workout_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_workouts_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      section_resources: {
        Row: {
          id: string
          order_index: number
          resource_id: string
          section_id: string
        }
        Insert: {
          id?: string
          order_index: number
          resource_id: string
          section_id: string
        }
        Update: {
          id?: string
          order_index?: number
          resource_id?: string
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "section_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_resources_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "collection_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      shooting_sessions: {
        Row: {
          attempts: number
          best_streak: number
          client_id: string
          completed_at: string | null
          confidence_after: number | null
          confidence_before: number | null
          created_at: string
          drill_type: string
          duration_seconds: number | null
          fatigue: number | null
          focus: number | null
          id: string
          location: string | null
          makes: number
          pressure_mode: boolean
          pressure_pass: boolean | null
          started_at: string | null
          status: string
          target_shots: number | null
        }
        Insert: {
          attempts?: number
          best_streak?: number
          client_id: string
          completed_at?: string | null
          confidence_after?: number | null
          confidence_before?: number | null
          created_at?: string
          drill_type?: string
          duration_seconds?: number | null
          fatigue?: number | null
          focus?: number | null
          id?: string
          location?: string | null
          makes?: number
          pressure_mode?: boolean
          pressure_pass?: boolean | null
          started_at?: string | null
          status?: string
          target_shots?: number | null
        }
        Update: {
          attempts?: number
          best_streak?: number
          client_id?: string
          completed_at?: string | null
          confidence_after?: number | null
          confidence_before?: number | null
          created_at?: string
          drill_type?: string
          duration_seconds?: number | null
          fatigue?: number | null
          focus?: number | null
          id?: string
          location?: string | null
          makes?: number
          pressure_mode?: boolean
          pressure_pass?: boolean | null
          started_at?: string | null
          status?: string
          target_shots?: number | null
        }
        Relationships: []
      }
      shot_chart_entries: {
        Row: {
          client_id: string
          created_at: string
          id: string
          lab_type: string
          result: string
          session_id: string
          x: number
          y: number
          zone: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          lab_type: string
          result: string
          session_id: string
          x: number
          y: number
          zone?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          lab_type?: string
          result?: string
          session_id?: string
          x?: number
          y?: number
          zone?: string | null
        }
        Relationships: []
      }
      smart_pace_admin_actions: {
        Row: {
          action_date: string
          action_type: string
          admin_id: string
          client_id: string
          created_at: string
          goal_id: string
          id: string
          payload: Json
          reason: string | null
        }
        Insert: {
          action_date: string
          action_type: string
          admin_id: string
          client_id: string
          created_at?: string
          goal_id: string
          id?: string
          payload?: Json
          reason?: string | null
        }
        Update: {
          action_date?: string
          action_type?: string
          admin_id?: string
          client_id?: string
          created_at?: string
          goal_id?: string
          id?: string
          payload?: Json
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "smart_pace_admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_pace_admin_actions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_pace_admin_actions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "smart_pace_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_pace_daily_log: {
        Row: {
          actual_loss_lbs: number | null
          client_id: string
          created_at: string
          credit_delta: number
          debt_delta: number
          goal_id: string
          id: string
          log_date: string
          notes: string | null
          status: string
          target_loss_lbs: number
          updated_at: string
          weight_recorded: number | null
          weight_source: string | null
        }
        Insert: {
          actual_loss_lbs?: number | null
          client_id: string
          created_at?: string
          credit_delta?: number
          debt_delta?: number
          goal_id: string
          id?: string
          log_date: string
          notes?: string | null
          status?: string
          target_loss_lbs: number
          updated_at?: string
          weight_recorded?: number | null
          weight_source?: string | null
        }
        Update: {
          actual_loss_lbs?: number | null
          client_id?: string
          created_at?: string
          credit_delta?: number
          debt_delta?: number
          goal_id?: string
          id?: string
          log_date?: string
          notes?: string | null
          status?: string
          target_loss_lbs?: number
          updated_at?: string
          weight_recorded?: number | null
          weight_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "smart_pace_daily_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_pace_daily_log_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "smart_pace_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_pace_goals: {
        Row: {
          client_id: string
          consecutive_behind_days: number
          consecutive_missed_days: number
          created_at: string
          current_credit_lbs: number
          current_debt_lbs: number
          daily_pace_lbs: number
          ended_at: string | null
          ended_reason: string | null
          goal_direction: string
          goal_weight: number
          id: string
          last_weigh_in_date: string | null
          last_weigh_in_value: number | null
          start_date: string
          start_weight: number | null
          status: string
          target_date: string | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          consecutive_behind_days?: number
          consecutive_missed_days?: number
          created_at?: string
          current_credit_lbs?: number
          current_debt_lbs?: number
          daily_pace_lbs?: number
          ended_at?: string | null
          ended_reason?: string | null
          goal_direction?: string
          goal_weight: number
          id?: string
          last_weigh_in_date?: string | null
          last_weigh_in_value?: number | null
          start_date?: string
          start_weight?: number | null
          status?: string
          target_date?: string | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          consecutive_behind_days?: number
          consecutive_missed_days?: number
          created_at?: string
          current_credit_lbs?: number
          current_debt_lbs?: number
          daily_pace_lbs?: number
          ended_at?: string | null
          ended_reason?: string | null
          goal_direction?: string
          goal_weight?: number
          id?: string
          last_weigh_in_date?: string | null
          last_weigh_in_value?: number | null
          start_date?: string
          start_weight?: number | null
          status?: string
          target_date?: string | null
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_pace_goals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_pace_goals_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_pace_prescriptions: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          actions: Json
          client_id: string
          created_at: string
          generated_by: string
          goal_id: string
          id: string
          message: string
          prescription_date: string
          severity: string
          target_makeup_lbs: number | null
          title: string
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          actions?: Json
          client_id: string
          created_at?: string
          generated_by?: string
          goal_id: string
          id?: string
          message: string
          prescription_date: string
          severity?: string
          target_makeup_lbs?: number | null
          title: string
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          actions?: Json
          client_id?: string
          created_at?: string
          generated_by?: string
          goal_id?: string
          id?: string
          message?: string
          prescription_date?: string
          severity?: string
          target_makeup_lbs?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_pace_prescriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_pace_prescriptions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "smart_pace_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      sport_event_completions: {
        Row: {
          client_id: string
          completed_at: string
          created_at: string
          id: string
          notes: string | null
          sport_event_id: string
          status: string
        }
        Insert: {
          client_id: string
          completed_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          sport_event_id: string
          status?: string
        }
        Update: {
          client_id?: string
          completed_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          sport_event_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sport_event_completions_sport_event_id_fkey"
            columns: ["sport_event_id"]
            isOneToOne: false
            referencedRelation: "sport_schedule_events"
            referencedColumns: ["id"]
          },
        ]
      }
      sport_schedule_events: {
        Row: {
          all_day: boolean
          client_id: string
          created_at: string
          description: string | null
          end_time: string | null
          event_type: string
          event_uid: string
          feed_id: string
          id: string
          location: string | null
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          client_id: string
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_type?: string
          event_uid: string
          feed_id: string
          id?: string
          location?: string | null
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          client_id?: string
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_type?: string
          event_uid?: string
          feed_id?: string
          id?: string
          location?: string | null
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sport_schedule_events_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "client_ical_feeds"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_program_workouts: {
        Row: {
          created_at: string
          day_of_week: number
          id: string
          is_rest_day: boolean
          notes: string | null
          order_index: number
          program_id: string
          week_number: number
          workout_id: string | null
        }
        Insert: {
          created_at?: string
          day_of_week?: number
          id?: string
          is_rest_day?: boolean
          notes?: string | null
          order_index?: number
          program_id: string
          week_number?: number
          workout_id?: string | null
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          is_rest_day?: boolean
          notes?: string | null
          order_index?: number
          program_id?: string
          week_number?: number
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_program_workouts_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "studio_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_program_workouts_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "ondemand_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_programs: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          duration_weeks: number
          id: string
          is_published: boolean | null
          name: string
          status: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          duration_weeks?: number
          id?: string
          is_published?: boolean | null
          name: string
          status?: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          duration_weeks?: number
          id?: string
          is_published?: boolean | null
          name?: string
          status?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      system_events: {
        Row: {
          client_id: string
          coach_id: string | null
          created_at: string
          details: Json | null
          event_type: string
          id: string
        }
        Insert: {
          client_id: string
          coach_id?: string | null
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
        }
        Update: {
          client_id?: string
          coach_id?: string | null
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          content: string | null
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string | null
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string | null
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "client_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          attachments: Json | null
          created_at: string
          description: string | null
          form_questions: Json | null
          frequency: string | null
          goal_unit: string | null
          goal_value: number | null
          icon_url: string | null
          id: string
          is_shared: boolean | null
          name: string
          reminder_enabled: boolean | null
          reminder_hours_before: number | null
          task_type: Database["public"]["Enums"]["task_type"]
          trainer_id: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          description?: string | null
          form_questions?: Json | null
          frequency?: string | null
          goal_unit?: string | null
          goal_value?: number | null
          icon_url?: string | null
          id?: string
          is_shared?: boolean | null
          name: string
          reminder_enabled?: boolean | null
          reminder_hours_before?: number | null
          task_type?: Database["public"]["Enums"]["task_type"]
          trainer_id: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          description?: string | null
          form_questions?: Json | null
          frequency?: string | null
          goal_unit?: string | null
          goal_value?: number | null
          icon_url?: string | null
          id?: string
          is_shared?: boolean | null
          name?: string
          reminder_enabled?: boolean | null
          reminder_hours_before?: number | null
          task_type?: Database["public"]["Enums"]["task_type"]
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      throwing_sessions: {
        Row: {
          arm_feel_after: number | null
          arm_feel_before: number | null
          client_id: string
          completed_at: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          pain_reported: boolean
          started_at: string | null
          status: string
          target_hits: number
          target_throws: number | null
          throw_type: string
          total_throws: number
        }
        Insert: {
          arm_feel_after?: number | null
          arm_feel_before?: number | null
          client_id: string
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          pain_reported?: boolean
          started_at?: string | null
          status?: string
          target_hits?: number
          target_throws?: number | null
          throw_type?: string
          total_throws?: number
        }
        Update: {
          arm_feel_after?: number | null
          arm_feel_before?: number | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          pain_reported?: boolean
          started_at?: string | null
          status?: string
          target_hits?: number
          target_throws?: number | null
          throw_type?: string
          total_throws?: number
        }
        Relationships: []
      }
      trainer_availability: {
        Row: {
          appointment_type_id: string | null
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          is_general: boolean
          location: string | null
          start_time: string
          trainer_id: string
        }
        Insert: {
          appointment_type_id?: string | null
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          is_general?: boolean
          location?: string | null
          start_time: string
          trainer_id: string
        }
        Update: {
          appointment_type_id?: string | null
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          is_general?: boolean
          location?: string | null
          start_time?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_availability_appointment_type_id_fkey"
            columns: ["appointment_type_id"]
            isOneToOne: false
            referencedRelation: "appointment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_availability_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_clients: {
        Row: {
          assigned_at: string
          client_id: string
          id: string
          status: Database["public"]["Enums"]["client_status"]
          trainer_id: string
        }
        Insert: {
          assigned_at?: string
          client_id: string
          id?: string
          status?: Database["public"]["Enums"]["client_status"]
          trainer_id: string
        }
        Update: {
          assigned_at?: string
          client_id?: string
          id?: string
          status?: Database["public"]["Enums"]["client_status"]
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_clients_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_date_overrides: {
        Row: {
          created_at: string
          end_time: string | null
          id: string
          is_unavailable: boolean
          notes: string | null
          override_date: string
          start_time: string | null
          trainer_id: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          id?: string
          is_unavailable?: boolean
          notes?: string | null
          override_date: string
          start_time?: string | null
          trainer_id: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          id?: string
          is_unavailable?: boolean
          notes?: string | null
          override_date?: string
          start_time?: string | null
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_date_overrides_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_fasting_cards: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          message: string | null
          title: string | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          message?: string | null
          title?: string | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          message?: string | null
          title?: string | null
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_fasting_cards_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_pdf_branding: {
        Row: {
          accent_color: string
          created_at: string
          document_label_override: string | null
          footer_text: string | null
          id: string
          show_logo: boolean
          trainer_id: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          created_at?: string
          document_label_override?: string | null
          footer_text?: string | null
          id?: string
          show_logo?: boolean
          trainer_id: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          created_at?: string
          document_label_override?: string | null
          footer_text?: string | null
          id?: string
          show_logo?: boolean
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_pdf_branding_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_vacations: {
        Row: {
          created_at: string
          end_date: string
          id: string
          reason: string | null
          start_date: string
          trainer_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
          trainer_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_vacations_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_welcome_cards: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          message: string | null
          title: string | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          message?: string | null
          title?: string | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          message?: string | null
          title?: string | null
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_welcome_cards_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bookmarks: {
        Row: {
          content_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_bookmarks_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "explore_content"
            referencedColumns: ["id"]
          },
        ]
      }
      user_challenges: {
        Row: {
          abandoned_at: string | null
          challenge_id: string
          completed_at: string | null
          created_at: string
          id: string
          joined_at: string
          progress_value: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          abandoned_at?: string | null
          challenge_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          joined_at?: string
          progress_value?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          abandoned_at?: string | null
          challenge_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          joined_at?: string
          progress_value?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      vibes_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      vibes_favorites: {
        Row: {
          created_at: string | null
          id: string
          sound_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          sound_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          sound_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vibes_favorites_sound_id_fkey"
            columns: ["sound_id"]
            isOneToOne: false
            referencedRelation: "vibes_sounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vibes_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vibes_mix_items: {
        Row: {
          id: string
          mix_id: string
          sort_order: number | null
          sound_id: string
          volume: number | null
        }
        Insert: {
          id?: string
          mix_id: string
          sort_order?: number | null
          sound_id: string
          volume?: number | null
        }
        Update: {
          id?: string
          mix_id?: string
          sort_order?: number | null
          sound_id?: string
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vibes_mix_items_mix_id_fkey"
            columns: ["mix_id"]
            isOneToOne: false
            referencedRelation: "vibes_mixes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vibes_mix_items_sound_id_fkey"
            columns: ["sound_id"]
            isOneToOne: false
            referencedRelation: "vibes_sounds"
            referencedColumns: ["id"]
          },
        ]
      }
      vibes_mixes: {
        Row: {
          cover_url: string | null
          created_at: string | null
          id: string
          is_public: boolean | null
          name: string
          share_slug: string | null
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          share_slug?: string | null
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          share_slug?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vibes_mixes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vibes_sounds: {
        Row: {
          audio_url: string
          category_id: string | null
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          icon_url: string | null
          id: string
          is_featured: boolean | null
          is_premium: boolean | null
          name: string
          sort_order: number | null
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          audio_url: string
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          icon_url?: string | null
          id?: string
          is_featured?: boolean | null
          is_premium?: boolean | null
          name: string
          sort_order?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          audio_url?: string
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          icon_url?: string | null
          id?: string
          is_featured?: boolean | null
          is_premium?: boolean | null
          name?: string
          sort_order?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vibes_sounds_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vibes_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      vibes_tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      water_goal_settings: {
        Row: {
          client_id: string
          created_at: string
          daily_goal_oz: number
          id: string
          reminders_enabled: boolean
          serving_size_oz: number
          unit: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          daily_goal_oz?: number
          id?: string
          reminders_enabled?: boolean
          serving_size_oz?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          daily_goal_oz?: number
          id?: string
          reminders_enabled?: boolean
          serving_size_oz?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      water_log_entries: {
        Row: {
          amount_oz: number
          client_id: string
          created_at: string
          id: string
          logged_at: string
        }
        Insert: {
          amount_oz: number
          client_id: string
          created_at?: string
          id?: string
          logged_at?: string
        }
        Update: {
          amount_oz?: number
          client_id?: string
          created_at?: string
          id?: string
          logged_at?: string
        }
        Relationships: []
      }
      workout_collection_categories: {
        Row: {
          card_layout: string
          collection_id: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          order_index: number
        }
        Insert: {
          card_layout?: string
          collection_id: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order_index: number
        }
        Update: {
          card_layout?: string
          collection_id?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "workout_collection_categories_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "workout_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_collections: {
        Row: {
          collection_type: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_published: boolean | null
          name: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          collection_type?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean | null
          name: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          collection_type?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean | null
          name?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_collections_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_comments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercise_logs: {
        Row: {
          band_level: string | null
          completed: boolean | null
          created_at: string | null
          duration_seconds: number | null
          exercise_id: string
          id: string
          notes: string | null
          reps: number | null
          session_id: string
          set_number: number
          weight: number | null
        }
        Insert: {
          band_level?: string | null
          completed?: boolean | null
          created_at?: string | null
          duration_seconds?: number | null
          exercise_id: string
          id?: string
          notes?: string | null
          reps?: number | null
          session_id: string
          set_number: number
          weight?: number | null
        }
        Update: {
          band_level?: string | null
          completed?: boolean | null
          created_at?: string | null
          duration_seconds?: number | null
          exercise_id?: string
          id?: string
          notes?: string | null
          reps?: number | null
          session_id?: string
          set_number?: number
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercise_logs_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercise_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_labels: {
        Row: {
          category: Database["public"]["Enums"]["label_category"]
          created_at: string
          id: string
          is_default: boolean | null
          trainer_id: string | null
          value: string
        }
        Insert: {
          category: Database["public"]["Enums"]["label_category"]
          created_at?: string
          id?: string
          is_default?: boolean | null
          trainer_id?: string | null
          value: string
        }
        Update: {
          category?: Database["public"]["Enums"]["label_category"]
          created_at?: string
          id?: string
          is_default?: boolean | null
          trainer_id?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_labels_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plan_exercises: {
        Row: {
          detail_fields: string[] | null
          distance: string | null
          duration_seconds: number | null
          exercise_id: string | null
          exercise_type: string | null
          id: string
          is_unilateral: boolean | null
          notes: string | null
          order_index: number
          recommended_band_level: string | null
          reps: number | null
          rest_seconds: number | null
          rpe: number | null
          section_id: string | null
          sets: number | null
          tempo: string | null
          weight_lbs: number | null
          workout_plan_id: string
        }
        Insert: {
          detail_fields?: string[] | null
          distance?: string | null
          duration_seconds?: number | null
          exercise_id?: string | null
          exercise_type?: string | null
          id?: string
          is_unilateral?: boolean | null
          notes?: string | null
          order_index: number
          recommended_band_level?: string | null
          reps?: number | null
          rest_seconds?: number | null
          rpe?: number | null
          section_id?: string | null
          sets?: number | null
          tempo?: string | null
          weight_lbs?: number | null
          workout_plan_id: string
        }
        Update: {
          detail_fields?: string[] | null
          distance?: string | null
          duration_seconds?: number | null
          exercise_id?: string | null
          exercise_type?: string | null
          id?: string
          is_unilateral?: boolean | null
          notes?: string | null
          order_index?: number
          recommended_band_level?: string | null
          reps?: number | null
          rest_seconds?: number | null
          rpe?: number | null
          section_id?: string | null
          sets?: number | null
          tempo?: string | null
          weight_lbs?: number | null
          workout_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_plan_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_plan_exercises_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "workout_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_plan_exercises_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plans: {
        Row: {
          category: string
          client_owner_id: string | null
          cloudflare_video_id: string | null
          created_at: string
          description: string | null
          difficulty: Database["public"]["Enums"]["workout_difficulty"]
          duration_minutes: number
          equipment: string[] | null
          hidden_equipment: string[] | null
          id: string
          image_url: string | null
          is_template: boolean | null
          name: string
          template_category: string | null
          trainer_id: string
          updated_at: string
          use_count: number | null
          video_url: string | null
        }
        Insert: {
          category: string
          client_owner_id?: string | null
          cloudflare_video_id?: string | null
          created_at?: string
          description?: string | null
          difficulty: Database["public"]["Enums"]["workout_difficulty"]
          duration_minutes: number
          equipment?: string[] | null
          hidden_equipment?: string[] | null
          id?: string
          image_url?: string | null
          is_template?: boolean | null
          name: string
          template_category?: string | null
          trainer_id: string
          updated_at?: string
          use_count?: number | null
          video_url?: string | null
        }
        Update: {
          category?: string
          client_owner_id?: string | null
          cloudflare_video_id?: string | null
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["workout_difficulty"]
          duration_minutes?: number
          equipment?: string[] | null
          hidden_equipment?: string[] | null
          id?: string
          image_url?: string | null
          is_template?: boolean | null
          name?: string
          template_category?: string | null
          trainer_id?: string
          updated_at?: string
          use_count?: number | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_plans_client_owner_id_fkey"
            columns: ["client_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_plans_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sections: {
        Row: {
          created_at: string | null
          id: string
          name: string
          notes: string | null
          order_index: number
          rest_between_rounds_seconds: number | null
          rest_seconds: number | null
          rounds: number | null
          section_type: string
          work_seconds: number | null
          workout_plan_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          order_index: number
          rest_between_rounds_seconds?: number | null
          rest_seconds?: number | null
          rounds?: number | null
          section_type?: string
          work_seconds?: number | null
          workout_plan_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          order_index?: number
          rest_between_rounds_seconds?: number | null
          rest_seconds?: number | null
          rounds?: number | null
          section_type?: string
          work_seconds?: number | null
          workout_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sections_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          client_id: string
          client_workout_id: string | null
          completed_at: string | null
          completion_percentage: number | null
          created_at: string | null
          difficulty_rating: number | null
          duration_seconds: number | null
          id: string
          is_partial: boolean | null
          notes: string | null
          resume_exercise_index: number | null
          resume_round: number | null
          resume_section_index: number | null
          resume_set: number | null
          resume_set_logs: Json | null
          started_at: string
          status: string
          workout_plan_id: string | null
        }
        Insert: {
          client_id: string
          client_workout_id?: string | null
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          difficulty_rating?: number | null
          duration_seconds?: number | null
          id?: string
          is_partial?: boolean | null
          notes?: string | null
          resume_exercise_index?: number | null
          resume_round?: number | null
          resume_section_index?: number | null
          resume_set?: number | null
          resume_set_logs?: Json | null
          started_at: string
          status?: string
          workout_plan_id?: string | null
        }
        Update: {
          client_id?: string
          client_workout_id?: string | null
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          difficulty_rating?: number | null
          duration_seconds?: number | null
          id?: string
          is_partial?: boolean | null
          notes?: string | null
          resume_exercise_index?: number | null
          resume_round?: number | null
          resume_section_index?: number | null
          resume_set?: number | null
          resume_set_logs?: Json | null
          started_at?: string
          status?: string
          workout_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_client_workout_id_fkey"
            columns: ["client_workout_id"]
            isOneToOne: false
            referencedRelation: "client_workouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_workout_labels: {
        Row: {
          label_id: string
          workout_id: string
        }
        Insert: {
          label_id: string
          workout_id: string
        }
        Update: {
          label_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_workout_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "workout_labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_workout_labels_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "ondemand_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      yoga_flow_assignments: {
        Row: {
          assigned_at: string
          client_id: string
          flow_id: string
          id: string
          trainer_id: string
        }
        Insert: {
          assigned_at?: string
          client_id: string
          flow_id: string
          id?: string
          trainer_id: string
        }
        Update: {
          assigned_at?: string
          client_id?: string
          flow_id?: string
          id?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "yoga_flow_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yoga_flow_assignments_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "yoga_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yoga_flow_assignments_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      yoga_flow_poses: {
        Row: {
          created_at: string
          flow_id: string
          hold_seconds: number
          id: string
          order_index: number
          pose_id: string
          transition_note: string | null
        }
        Insert: {
          created_at?: string
          flow_id: string
          hold_seconds?: number
          id?: string
          order_index?: number
          pose_id: string
          transition_note?: string | null
        }
        Update: {
          created_at?: string
          flow_id?: string
          hold_seconds?: number
          id?: string
          order_index?: number
          pose_id?: string
          transition_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "yoga_flow_poses_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "yoga_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yoga_flow_poses_pose_id_fkey"
            columns: ["pose_id"]
            isOneToOne: false
            referencedRelation: "yoga_poses"
            referencedColumns: ["id"]
          },
        ]
      }
      yoga_flows: {
        Row: {
          client_id: string | null
          created_at: string
          description: string | null
          difficulty: string
          estimated_duration_seconds: number | null
          id: string
          is_template: boolean
          name: string
          trainer_id: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string
          estimated_duration_seconds?: number | null
          id?: string
          is_template?: boolean
          name: string
          trainer_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string
          estimated_duration_seconds?: number | null
          id?: string
          is_template?: boolean
          name?: string
          trainer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "yoga_flows_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yoga_flows_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      yoga_poses: {
        Row: {
          category: string | null
          created_at: string
          default_hold_seconds: number
          description: string | null
          difficulty: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          order_index: number
          trainer_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          default_hold_seconds?: number
          description?: string | null
          difficulty?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          order_index?: number
          trainer_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          default_hold_seconds?: number
          description?: string | null
          difficulty?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          order_index?: number
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "yoga_poses_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      yoga_sessions: {
        Row: {
          client_id: string
          completed_at: string | null
          completed_poses: number
          created_at: string
          duration_seconds: number
          flow_id: string | null
          flow_name: string
          id: string
          started_at: string
          status: string
          total_poses: number
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          completed_poses?: number
          created_at?: string
          duration_seconds?: number
          flow_id?: string | null
          flow_name: string
          id?: string
          started_at?: string
          status?: string
          total_poses?: number
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          completed_poses?: number
          created_at?: string
          duration_seconds?: number
          flow_id?: string | null
          flow_name?: string
          id?: string
          started_at?: string
          status?: string
          total_poses?: number
        }
        Relationships: [
          {
            foreignKeyName: "yoga_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yoga_sessions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "yoga_flows"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      backfill_activity_events: {
        Args: { p_client_id: string }
        Returns: number
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      emit_activity_event: {
        Args: {
          p_actor_id?: string
          p_category?: string
          p_client_id: string
          p_event_type: string
          p_icon?: string
          p_metadata?: Json
          p_occurred_at?: string
          p_source?: string
          p_subtitle?: string
          p_title: string
        }
        Returns: string
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      is_conversation_member: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_trainer: { Args: { _user_id: string }; Returns: boolean }
      is_trainer_of_client: {
        Args: { _client_id: string; _trainer_id: string }
        Returns: boolean
      }
      is_trainer_of_collection: {
        Args: { p_collection_id: string }
        Returns: boolean
      }
      is_trainer_of_workout_collection: {
        Args: { p_collection_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      provision_default_progress_tiles: {
        Args: { p_client_id: string }
        Returns: undefined
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      client_status: "active" | "paused" | "pending"
      engine_mode: "metabolic" | "performance" | "athletic"
      label_category:
        | "level"
        | "duration"
        | "intensity"
        | "type"
        | "body_part"
        | "location"
      layout_type: "large_cards" | "narrow_cards" | "small_cards" | "list"
      meal_plan_type: "flexible" | "structured" | "recipe_books_only"
      meal_type: "breakfast" | "lunch" | "dinner" | "snack"
      ondemand_workout_type: "regular" | "video"
      resource_type: "link" | "document" | "form"
      subscription_tier: "starter" | "pro" | "elite" | "enterprise"
      task_type:
        | "general"
        | "progress_photo"
        | "body_metrics"
        | "form"
        | "habit"
      user_role: "trainer" | "client"
      workout_difficulty: "beginner" | "intermediate" | "advanced"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      client_status: ["active", "paused", "pending"],
      engine_mode: ["metabolic", "performance", "athletic"],
      label_category: [
        "level",
        "duration",
        "intensity",
        "type",
        "body_part",
        "location",
      ],
      layout_type: ["large_cards", "narrow_cards", "small_cards", "list"],
      meal_plan_type: ["flexible", "structured", "recipe_books_only"],
      meal_type: ["breakfast", "lunch", "dinner", "snack"],
      ondemand_workout_type: ["regular", "video"],
      resource_type: ["link", "document", "form"],
      subscription_tier: ["starter", "pro", "elite", "enterprise"],
      task_type: ["general", "progress_photo", "body_metrics", "form", "habit"],
      user_role: ["trainer", "client"],
      workout_difficulty: ["beginner", "intermediate", "advanced"],
    },
  },
} as const
