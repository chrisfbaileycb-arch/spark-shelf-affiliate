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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ad_images: {
        Row: {
          campaign_id: string | null
          created_at: string
          headline: string | null
          id: string
          mockup_style: string | null
          primary_text: string | null
          product_id: string | null
          prompt: string
          ratio: string
          size: string
          storage_path: string
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          headline?: string | null
          id?: string
          mockup_style?: string | null
          primary_text?: string | null
          product_id?: string | null
          prompt: string
          ratio: string
          size: string
          storage_path: string
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          headline?: string | null
          id?: string
          mockup_style?: string | null
          primary_text?: string | null
          product_id?: string | null
          prompt?: string
          ratio?: string
          size?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_images_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_links: {
        Row: {
          affiliate_program_id: string | null
          clicks: number
          created_at: string
          destination_url: string
          id: string
          product_id: string | null
          short_code: string
          user_id: string
        }
        Insert: {
          affiliate_program_id?: string | null
          clicks?: number
          created_at?: string
          destination_url: string
          id?: string
          product_id?: string | null
          short_code: string
          user_id: string
        }
        Update: {
          affiliate_program_id?: string | null
          clicks?: number
          created_at?: string
          destination_url?: string
          id?: string
          product_id?: string | null
          short_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_links_affiliate_program_id_fkey"
            columns: ["affiliate_program_id"]
            isOneToOne: false
            referencedRelation: "affiliate_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_programs: {
        Row: {
          created_at: string
          id: string
          link_template: string
          name: string
          network: string
          notes: string | null
          tracking_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link_template: string
          name: string
          network: string
          notes?: string | null
          tracking_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link_template?: string
          name?: string
          network?: string
          notes?: string | null
          tracking_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          daily_global_video_cap: number
          generation_enabled: boolean
          id: boolean
          pause_reason: string | null
          per_user_daily_broll_cap: number
          per_user_daily_video_cap: number
          updated_at: string
        }
        Insert: {
          daily_global_video_cap?: number
          generation_enabled?: boolean
          id?: boolean
          pause_reason?: string | null
          per_user_daily_broll_cap?: number
          per_user_daily_video_cap?: number
          updated_at?: string
        }
        Update: {
          daily_global_video_cap?: number
          generation_enabled?: boolean
          id?: boolean
          pause_reason?: string | null
          per_user_daily_broll_cap?: number
          per_user_daily_video_cap?: number
          updated_at?: string
        }
        Relationships: []
      }
      calendar_slots: {
        Row: {
          campaign_id: string | null
          caption: string
          created_at: string
          created_by: string
          disclosure: string
          engine: string
          generated_at: string | null
          hashtags: Json
          hook: string
          id: string
          image_prompt: string
          model: string | null
          notes: string
          org_id: string
          plan_date: string
          platforms: Json
          post_id: string | null
          product_id: string | null
          script: string
          slot_time: string
          status: string
          title: string
          updated_at: string
          video_prompt: string
        }
        Insert: {
          campaign_id?: string | null
          caption?: string
          created_at?: string
          created_by: string
          disclosure?: string
          engine?: string
          generated_at?: string | null
          hashtags?: Json
          hook?: string
          id?: string
          image_prompt?: string
          model?: string | null
          notes?: string
          org_id: string
          plan_date: string
          platforms?: Json
          post_id?: string | null
          product_id?: string | null
          script?: string
          slot_time?: string
          status?: string
          title?: string
          updated_at?: string
          video_prompt?: string
        }
        Update: {
          campaign_id?: string | null
          caption?: string
          created_at?: string
          created_by?: string
          disclosure?: string
          engine?: string
          generated_at?: string | null
          hashtags?: Json
          hook?: string
          id?: string
          image_prompt?: string
          model?: string | null
          notes?: string
          org_id?: string
          plan_date?: string
          platforms?: Json
          post_id?: string | null
          product_id?: string | null
          script?: string
          slot_time?: string
          status?: string
          title?: string
          updated_at?: string
          video_prompt?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_slots_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_slots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_slots_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_slots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_workflows: {
        Row: {
          campaign_id: string | null
          created_at: string
          created_by: string
          current_step: number
          id: string
          name: string
          org_id: string
          product_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          created_by: string
          current_step?: number
          id?: string
          name: string
          org_id: string
          product_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          created_by?: string
          current_step?: number
          id?: string
          name?: string
          org_id?: string
          product_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_workflows_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_workflows_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_workflows_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          ad_description: string | null
          asset_kind: Database["public"]["Enums"]["asset_kind"]
          created_at: string
          destination_url: string | null
          error: string | null
          headline: string | null
          id: string
          include_video: boolean
          name: string
          primary_text: string | null
          product_id: string | null
          source_url: string
          status: string
          step: string | null
          updated_at: string
          user_id: string
          utm_campaign: string | null
          utm_medium: string
          utm_source: string
          video_id: string | null
        }
        Insert: {
          ad_description?: string | null
          asset_kind?: Database["public"]["Enums"]["asset_kind"]
          created_at?: string
          destination_url?: string | null
          error?: string | null
          headline?: string | null
          id?: string
          include_video?: boolean
          name?: string
          primary_text?: string | null
          product_id?: string | null
          source_url: string
          status?: string
          step?: string | null
          updated_at?: string
          user_id: string
          utm_campaign?: string | null
          utm_medium?: string
          utm_source?: string
          video_id?: string | null
        }
        Update: {
          ad_description?: string | null
          asset_kind?: Database["public"]["Enums"]["asset_kind"]
          created_at?: string
          destination_url?: string | null
          error?: string | null
          headline?: string | null
          id?: string
          include_video?: boolean
          name?: string
          primary_text?: string | null
          product_id?: string | null
          source_url?: string
          status?: string
          step?: string | null
          updated_at?: string
          user_id?: string
          utm_campaign?: string | null
          utm_medium?: string
          utm_source?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      content_packs: {
        Row: {
          approved_at: string | null
          campaign_id: string | null
          captions: Json
          created_at: string
          email_angle: string
          generated_at: string | null
          hashtags: Json
          hooks: Json
          id: string
          model: string | null
          org_id: string
          scripts: Json
          updated_at: string
          workflow_id: string
        }
        Insert: {
          approved_at?: string | null
          campaign_id?: string | null
          captions?: Json
          created_at?: string
          email_angle?: string
          generated_at?: string | null
          hashtags?: Json
          hooks?: Json
          id?: string
          model?: string | null
          org_id: string
          scripts?: Json
          updated_at?: string
          workflow_id: string
        }
        Update: {
          approved_at?: string | null
          campaign_id?: string | null
          captions?: Json
          created_at?: string
          email_angle?: string
          generated_at?: string | null
          hashtags?: Json
          hooks?: Json
          id?: string
          model?: string | null
          org_id?: string
          scripts?: Json
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_packs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_packs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_packs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: true
            referencedRelation: "campaign_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          created_at: string
          id: string
          idempotency_key: string
          last_error: string | null
          lead_id: string
          org_id: string
          provider_enrollment_id: string | null
          sequence_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          idempotency_key: string
          last_error?: string | null
          lead_id: string
          org_id: string
          provider_enrollment_id?: string | null
          sequence_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          idempotency_key?: string
          last_error?: string | null
          lead_id?: string
          org_id?: string
          provider_enrollment_id?: string | null
          sequence_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      gtm_strategies: {
        Row: {
          angles: Json
          approved_at: string | null
          created_at: string
          cta: string
          generated_at: string | null
          icp: Json
          id: string
          model: string | null
          objections: Json
          org_id: string
          pillars: Json
          positioning: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          angles?: Json
          approved_at?: string | null
          created_at?: string
          cta?: string
          generated_at?: string | null
          icp?: Json
          id?: string
          model?: string | null
          objections?: Json
          org_id: string
          pillars?: Json
          positioning?: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          angles?: Json
          approved_at?: string | null
          created_at?: string
          cta?: string
          generated_at?: string | null
          icp?: Json
          id?: string
          model?: string | null
          objections?: Json
          org_id?: string
          pillars?: Json
          positioning?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gtm_strategies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gtm_strategies_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: true
            referencedRelation: "campaign_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_credentials: {
        Row: {
          category: Database["public"]["Enums"]["integration_category"]
          ciphertext: string
          created_at: string
          id: string
          key_version: number
          last_error: string | null
          last_validated_at: string | null
          masked_hint: string | null
          metadata: Json
          org_id: string
          provider: string
          status: Database["public"]["Enums"]["integration_state"]
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["integration_category"]
          ciphertext: string
          created_at?: string
          id?: string
          key_version?: number
          last_error?: string | null
          last_validated_at?: string | null
          masked_hint?: string | null
          metadata?: Json
          org_id: string
          provider: string
          status?: Database["public"]["Enums"]["integration_state"]
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["integration_category"]
          ciphertext?: string
          created_at?: string
          id?: string
          key_version?: number
          last_error?: string | null
          last_validated_at?: string | null
          masked_hint?: string | null
          metadata?: Json
          org_id?: string
          provider?: string
          status?: Database["public"]["Enums"]["integration_state"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_credentials_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_test_runs: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          org_id: string
          provider: string
          status: string
          step: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          org_id: string
          provider: string
          status: string
          step: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          org_id?: string
          provider?: string
          status?: string
          step?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_test_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_queue: {
        Row: {
          attempts: number
          created_at: string
          engine: string
          id: string
          kind: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          next_run_at: string
          org_id: string
          payload: Json
          run_key: string
          status: Database["public"]["Enums"]["job_state"]
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          engine: string
          id?: string
          kind: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          next_run_at?: string
          org_id: string
          payload?: Json
          run_key: string
          status?: Database["public"]["Enums"]["job_state"]
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          engine?: string
          id?: string
          kind?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          next_run_at?: string
          org_id?: string
          payload?: Json
          run_key?: string
          status?: Database["public"]["Enums"]["job_state"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_queue_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_runs: {
        Row: {
          error: string | null
          finished_at: string | null
          id: number
          items_processed: number
          job_id: string
          org_id: string
          outcome: string | null
          started_at: string
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          id?: number
          items_processed?: number
          job_id: string
          org_id: string
          outcome?: string | null
          started_at?: string
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          id?: number
          items_processed?: number
          job_id?: string
          org_id?: string
          outcome?: string | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_runs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_runs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          company: string | null
          company_domain: string | null
          created_at: string
          dedupe_key: string
          email: string | null
          email_status: string | null
          enriched_at: string | null
          full_name: string | null
          id: string
          linkedin_url: string | null
          location: string | null
          org_id: string
          outbound_campaign_id: string
          provider: string
          provider_contact_id: string | null
          provider_person_id: string | null
          qualification_model: string | null
          qualification_reason: string | null
          qualification_score: number | null
          qualified_at: string | null
          raw: Json
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          company_domain?: string | null
          created_at?: string
          dedupe_key: string
          email?: string | null
          email_status?: string | null
          enriched_at?: string | null
          full_name?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          org_id: string
          outbound_campaign_id: string
          provider?: string
          provider_contact_id?: string | null
          provider_person_id?: string | null
          qualification_model?: string | null
          qualification_reason?: string | null
          qualification_score?: number | null
          qualified_at?: string | null
          raw?: Json
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          company_domain?: string | null
          created_at?: string
          dedupe_key?: string
          email?: string | null
          email_status?: string | null
          enriched_at?: string | null
          full_name?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          org_id?: string
          outbound_campaign_id?: string
          provider?: string
          provider_contact_id?: string | null
          provider_person_id?: string | null
          qualification_model?: string | null
          qualification_reason?: string | null
          qualification_score?: number | null
          qualified_at?: string | null
          raw?: Json
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_outbound_campaign_id_fkey"
            columns: ["outbound_campaign_id"]
            isOneToOne: false
            referencedRelation: "outbound_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      link_clicks: {
        Row: {
          affiliate_link_id: string
          country: string | null
          created_at: string
          id: number
          referer: string | null
          user_agent: string | null
        }
        Insert: {
          affiliate_link_id: string
          country?: string | null
          created_at?: string
          id?: number
          referer?: string | null
          user_agent?: string | null
        }
        Update: {
          affiliate_link_id?: string
          country?: string | null
          created_at?: string
          id?: number
          referer?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_clicks_affiliate_link_id_fkey"
            columns: ["affiliate_link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          due_reminders_enabled: boolean
          lead_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_reminders_enabled?: boolean
          lead_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          due_reminders_enabled?: boolean
          lead_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      org_settings: {
        Row: {
          active_outbound_provider: string
          autopublish_enabled: boolean
          created_at: string
          daily_post_cap: number
          org_id: string
          social_adapter: string
          social_dry_run: boolean
          test_post_passed_at: string | null
          updated_at: string
        }
        Insert: {
          active_outbound_provider?: string
          autopublish_enabled?: boolean
          created_at?: string
          daily_post_cap?: number
          org_id: string
          social_adapter?: string
          social_dry_run?: boolean
          test_post_passed_at?: string | null
          updated_at?: string
        }
        Update: {
          active_outbound_provider?: string
          autopublish_enabled?: boolean
          created_at?: string
          daily_post_cap?: number
          org_id?: string
          social_adapter?: string
          social_dry_run?: boolean
          test_post_passed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          is_personal: boolean
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_personal?: boolean
          name?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_personal?: boolean
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      outbound_campaigns: {
        Row: {
          created_at: string
          email_account_id: string | null
          icp_filters: Json
          id: string
          last_searched_at: string | null
          org_id: string
          provider: string
          provider_sequence_id: string | null
          qualification_threshold: number
          sending_paused: boolean
          status: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          email_account_id?: string | null
          icp_filters?: Json
          id?: string
          last_searched_at?: string | null
          org_id: string
          provider?: string
          provider_sequence_id?: string | null
          qualification_threshold?: number
          sending_paused?: boolean
          status?: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          email_account_id?: string | null
          icp_filters?: Json
          id?: string
          last_searched_at?: string | null
          org_id?: string
          provider?: string
          provider_sequence_id?: string | null
          qualification_threshold?: number
          sending_paused?: boolean
          status?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outbound_campaigns_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_campaigns_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: true
            referencedRelation: "campaign_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_events: {
        Row: {
          enrollment_id: string | null
          id: number
          lead_id: string | null
          occurred_at: string
          org_id: string
          payload: Json
          source: string
          type: string
        }
        Insert: {
          enrollment_id?: string | null
          id?: number
          lead_id?: string | null
          occurred_at?: string
          org_id: string
          payload?: Json
          source?: string
          type: string
        }
        Update: {
          enrollment_id?: string | null
          id?: number
          lead_id?: string | null
          occurred_at?: string
          org_id?: string
          payload?: Json
          source?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "outbound_events_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      personas: {
        Row: {
          age_range: string
          bio: string
          catchphrases: Json
          created_at: string
          elevenlabs_voice_id: string
          gender: string
          heygen_avatar_id: string
          id: string
          is_default: boolean
          name: string
          niche: string
          speech_quirks: string
          updated_at: string
          user_id: string
          vibe: string
          voice_tone: string
        }
        Insert: {
          age_range?: string
          bio?: string
          catchphrases?: Json
          created_at?: string
          elevenlabs_voice_id?: string
          gender?: string
          heygen_avatar_id?: string
          id?: string
          is_default?: boolean
          name: string
          niche?: string
          speech_quirks?: string
          updated_at?: string
          user_id: string
          vibe?: string
          voice_tone?: string
        }
        Update: {
          age_range?: string
          bio?: string
          catchphrases?: Json
          created_at?: string
          elevenlabs_voice_id?: string
          gender?: string
          heygen_avatar_id?: string
          id?: string
          is_default?: boolean
          name?: string
          niche?: string
          speech_quirks?: string
          updated_at?: string
          user_id?: string
          vibe?: string
          voice_tone?: string
        }
        Relationships: []
      }
      product_briefs: {
        Row: {
          approved_at: string | null
          audience: string
          constraints: string
          created_at: string
          id: string
          offer: string
          org_id: string
          product_id: string | null
          proof_points: Json
          source_url: string | null
          updated_at: string
          workflow_id: string
        }
        Insert: {
          approved_at?: string | null
          audience?: string
          constraints?: string
          created_at?: string
          id?: string
          offer?: string
          org_id: string
          product_id?: string | null
          proof_points?: Json
          source_url?: string | null
          updated_at?: string
          workflow_id: string
        }
        Update: {
          approved_at?: string | null
          audience?: string
          constraints?: string
          created_at?: string
          id?: string
          offer?: string
          org_id?: string
          product_id?: string | null
          proof_points?: Json
          source_url?: string | null
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_briefs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_briefs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_briefs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: true
            referencedRelation: "campaign_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          asset_kind: Database["public"]["Enums"]["asset_kind"]
          campaign_mode: string
          created_at: string
          currency: string | null
          description: string | null
          id: string
          images: Json
          price: string | null
          raw: Json | null
          source_domain: string | null
          source_url: string
          suggested_network: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_kind?: Database["public"]["Enums"]["asset_kind"]
          campaign_mode?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          images?: Json
          price?: string | null
          raw?: Json | null
          source_domain?: string | null
          source_url?: string
          suggested_network?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_kind?: Database["public"]["Enums"]["asset_kind"]
          campaign_mode?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          images?: Json
          price?: string | null
          raw?: Json | null
          source_domain?: string | null
          source_url?: string
          suggested_network?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          default_voice_id: string
          display_name: string | null
          id: string
          influencer_style: string
          referral_code: string | null
          referred_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_voice_id?: string
          display_name?: string | null
          id: string
          influencer_style?: string
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_voice_id?: string
          display_name?: string | null
          id?: string
          influencer_style?: string
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      referral_conversions: {
        Row: {
          created_at: string
          credited_at: string | null
          credited_cents: number
          currency: string
          id: string
          referred_user_id: string
          referrer_id: string
          stripe_balance_txn_id: string | null
        }
        Insert: {
          created_at?: string
          credited_at?: string | null
          credited_cents?: number
          currency?: string
          id?: string
          referred_user_id: string
          referrer_id: string
          stripe_balance_txn_id?: string | null
        }
        Update: {
          created_at?: string
          credited_at?: string | null
          credited_cents?: number
          currency?: string
          id?: string
          referred_user_id?: string
          referrer_id?: string
          stripe_balance_txn_id?: string | null
        }
        Relationships: []
      }
      sequence_steps: {
        Row: {
          body: string
          created_at: string
          delay_days: number
          id: string
          org_id: string
          provider_step_id: string | null
          sequence_id: string
          step_number: number
          subject: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          delay_days?: number
          id?: string
          org_id: string
          provider_step_id?: string | null
          sequence_id: string
          step_number: number
          subject?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          delay_days?: number
          id?: string
          org_id?: string
          provider_step_id?: string | null
          sequence_id?: string
          step_number?: number
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_steps_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      sequences: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          org_id: string
          outbound_campaign_id: string
          provider: string
          provider_sequence_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          org_id: string
          outbound_campaign_id: string
          provider?: string
          provider_sequence_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          outbound_campaign_id?: string
          provider?: string
          provider_sequence_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequences_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequences_outbound_campaign_id_fkey"
            columns: ["outbound_campaign_id"]
            isOneToOne: false
            referencedRelation: "outbound_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      social_accounts: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          external_account_id: string
          handle: string | null
          id: string
          last_checked_at: string | null
          org_id: string
          platform: Database["public"]["Enums"]["social_platform"]
          scopes: Json
          status: Database["public"]["Enums"]["integration_state"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          external_account_id: string
          handle?: string | null
          id?: string
          last_checked_at?: string | null
          org_id: string
          platform: Database["public"]["Enums"]["social_platform"]
          scopes?: Json
          status?: Database["public"]["Enums"]["integration_state"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          external_account_id?: string
          handle?: string | null
          id?: string
          last_checked_at?: string | null
          org_id?: string
          platform?: Database["public"]["Enums"]["social_platform"]
          scopes?: Json
          status?: Database["public"]["Enums"]["integration_state"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_events: {
        Row: {
          actor: string
          from_state: Database["public"]["Enums"]["post_state"] | null
          id: number
          occurred_at: string
          org_id: string
          payload: Json
          post_id: string | null
          to_state: Database["public"]["Enums"]["post_state"] | null
          type: string
          variant_id: string | null
        }
        Insert: {
          actor?: string
          from_state?: Database["public"]["Enums"]["post_state"] | null
          id?: number
          occurred_at?: string
          org_id: string
          payload?: Json
          post_id?: string | null
          to_state?: Database["public"]["Enums"]["post_state"] | null
          type: string
          variant_id?: string | null
        }
        Update: {
          actor?: string
          from_state?: Database["public"]["Enums"]["post_state"] | null
          id?: number
          occurred_at?: string
          org_id?: string
          payload?: Json
          post_id?: string | null
          to_state?: Database["public"]["Enums"]["post_state"] | null
          type?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_post_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_events_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_events_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "social_post_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_variants: {
        Row: {
          account_id: string | null
          attempts: number
          caption: string
          caption_copied_at: string | null
          confirmation_method: string | null
          created_at: string
          external_post_id: string | null
          external_post_url: string | null
          handed_off_at: string | null
          id: string
          idempotency_key: string
          last_error: string | null
          last_share_error: string | null
          media_url: string | null
          options: Json
          org_id: string
          permalink: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          platform_title: string | null
          post_id: string
          posted_at: string | null
          posted_by: string | null
          privacy: string
          ready_at: string | null
          skipped_at: string | null
          state: Database["public"]["Enums"]["post_state"]
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          attempts?: number
          caption?: string
          caption_copied_at?: string | null
          confirmation_method?: string | null
          created_at?: string
          external_post_id?: string | null
          external_post_url?: string | null
          handed_off_at?: string | null
          id?: string
          idempotency_key: string
          last_error?: string | null
          last_share_error?: string | null
          media_url?: string | null
          options?: Json
          org_id: string
          permalink?: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          platform_title?: string | null
          post_id: string
          posted_at?: string | null
          posted_by?: string | null
          privacy?: string
          ready_at?: string | null
          skipped_at?: string | null
          state?: Database["public"]["Enums"]["post_state"]
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          attempts?: number
          caption?: string
          caption_copied_at?: string | null
          confirmation_method?: string | null
          created_at?: string
          external_post_id?: string | null
          external_post_url?: string | null
          handed_off_at?: string | null
          id?: string
          idempotency_key?: string
          last_error?: string | null
          last_share_error?: string | null
          media_url?: string | null
          options?: Json
          org_id?: string
          permalink?: string | null
          platform?: Database["public"]["Enums"]["social_platform"]
          platform_title?: string | null
          post_id?: string
          posted_at?: string | null
          posted_by?: string | null
          privacy?: string
          ready_at?: string | null
          skipped_at?: string | null
          state?: Database["public"]["Enums"]["post_state"]
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_post_variants_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_variants_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_variants_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          campaign_id: string | null
          created_at: string
          created_by: string
          id: string
          master_caption: string
          org_id: string
          scheduled_at: string | null
          state: Database["public"]["Enums"]["post_state"]
          timezone: string
          title: string
          updated_at: string
          video_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          campaign_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          master_caption?: string
          org_id: string
          scheduled_at?: string | null
          state?: Database["public"]["Enums"]["post_state"]
          timezone?: string
          title?: string
          updated_at?: string
          video_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          campaign_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          master_caption?: string
          org_id?: string
          scheduled_at?: string | null
          state?: Database["public"]["Enums"]["post_state"]
          timezone?: string
          title?: string
          updated_at?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      social_provider_profiles: {
        Row: {
          adapter: string
          created_at: string
          external_profile_title: string | null
          id: string
          key_version: number
          last_error: string | null
          org_id: string
          profile_ref_ciphertext: string | null
          status: Database["public"]["Enums"]["integration_state"]
          updated_at: string
        }
        Insert: {
          adapter?: string
          created_at?: string
          external_profile_title?: string | null
          id?: string
          key_version?: number
          last_error?: string | null
          org_id: string
          profile_ref_ciphertext?: string | null
          status?: Database["public"]["Enums"]["integration_state"]
          updated_at?: string
        }
        Update: {
          adapter?: string
          created_at?: string
          external_profile_title?: string | null
          id?: string
          key_version?: number
          last_error?: string | null
          org_id?: string
          profile_ref_ciphertext?: string | null
          status?: Database["public"]["Enums"]["integration_state"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_provider_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          status: Database["public"]["Enums"]["sub_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["sub_tier"]
          trial_videos_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          status?: Database["public"]["Enums"]["sub_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["sub_tier"]
          trial_videos_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          status?: Database["public"]["Enums"]["sub_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["sub_tier"]
          trial_videos_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          broll_used: number
          images_used: number
          period_start: string
          updated_at: string
          user_id: string
          videos_used: number
        }
        Insert: {
          broll_used?: number
          images_used?: number
          period_start: string
          updated_at?: string
          user_id: string
          videos_used?: number
        }
        Update: {
          broll_used?: number
          images_used?: number
          period_start?: string
          updated_at?: string
          user_id?: string
          videos_used?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          affiliate_program_id: string | null
          caption: string | null
          created_at: string
          duration_seconds: number | null
          error: string | null
          generation_cost: number | null
          hashtags: string[]
          heygen_avatar_id: string | null
          heygen_video_id: string | null
          hook: string | null
          id: string
          persona_id: string | null
          product_id: string
          provider: string | null
          script: string | null
          status: Database["public"]["Enums"]["video_status"]
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          video_kind: string
          video_url: string | null
          voice_id: string | null
        }
        Insert: {
          affiliate_program_id?: string | null
          caption?: string | null
          created_at?: string
          duration_seconds?: number | null
          error?: string | null
          generation_cost?: number | null
          hashtags?: string[]
          heygen_avatar_id?: string | null
          heygen_video_id?: string | null
          hook?: string | null
          id?: string
          persona_id?: string | null
          product_id: string
          provider?: string | null
          script?: string | null
          status?: Database["public"]["Enums"]["video_status"]
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          video_kind?: string
          video_url?: string | null
          voice_id?: string | null
        }
        Update: {
          affiliate_program_id?: string | null
          caption?: string | null
          created_at?: string
          duration_seconds?: number | null
          error?: string | null
          generation_cost?: number | null
          hashtags?: string[]
          heygen_avatar_id?: string | null
          heygen_video_id?: string | null
          hook?: string | null
          id?: string
          persona_id?: string | null
          product_id?: string
          provider?: string | null
          script?: string | null
          status?: Database["public"]["Enums"]["video_status"]
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          video_kind?: string
          video_url?: string | null
          voice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_affiliate_program_id_fkey"
            columns: ["affiliate_program_id"]
            isOneToOne: false
            referencedRelation: "affiliate_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      integration_status: {
        Row: {
          category: Database["public"]["Enums"]["integration_category"] | null
          created_at: string | null
          last_validated_at: string | null
          masked_hint: string | null
          org_id: string | null
          provider: string | null
          status: Database["public"]["Enums"]["integration_state"] | null
          updated_at: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["integration_category"] | null
          created_at?: string | null
          last_validated_at?: string | null
          masked_hint?: string | null
          org_id?: string | null
          provider?: string | null
          status?: Database["public"]["Enums"]["integration_state"] | null
          updated_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["integration_category"] | null
          created_at?: string | null
          last_validated_at?: string | null
          masked_hint?: string | null
          org_id?: string | null
          provider?: string | null
          status?: Database["public"]["Enums"]["integration_state"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_credentials_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_status: {
        Row: {
          attempts: number | null
          created_at: string | null
          engine: string | null
          id: string | null
          kind: string | null
          max_attempts: number | null
          next_run_at: string | null
          org_id: string | null
          status: Database["public"]["Enums"]["job_state"] | null
          updated_at: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          engine?: string | null
          id?: string | null
          kind?: string | null
          max_attempts?: number | null
          next_run_at?: string | null
          org_id?: string | null
          status?: Database["public"]["Enums"]["job_state"] | null
          updated_at?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          engine?: string | null
          id?: string | null
          kind?: string | null
          max_attempts?: number | null
          next_run_at?: string | null
          org_id?: string | null
          status?: Database["public"]["Enums"]["job_state"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_queue_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      social_profile_status: {
        Row: {
          adapter: string | null
          external_profile_title: string | null
          has_profile: boolean | null
          org_id: string | null
          status: Database["public"]["Enums"]["integration_state"] | null
          updated_at: string | null
        }
        Insert: {
          adapter?: string | null
          external_profile_title?: string | null
          has_profile?: never
          org_id?: string | null
          status?: Database["public"]["Enums"]["integration_state"] | null
          updated_at?: string | null
        }
        Update: {
          adapter?: string | null
          external_profile_title?: string | null
          has_profile?: never
          org_id?: string | null
          status?: Database["public"]["Enums"]["integration_state"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_provider_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      consume_broll_quota: { Args: { _user_id: string }; Returns: Json }
      consume_image_quota: {
        Args: { _count?: number; _user_id: string }
        Returns: Json
      }
      consume_video_quota: { Args: { _user_id: string }; Returns: Json }
      gen_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_admin: { Args: { _org: string; _user: string }; Returns: boolean }
      is_org_member: { Args: { _org: string; _user: string }; Returns: boolean }
      plan_limits: {
        Args: { _tier: Database["public"]["Enums"]["sub_tier"] }
        Returns: Json
      }
      provision_personal_org: {
        Args: { _name: string; _user_id: string }
        Returns: string
      }
      release_broll_quota: { Args: { _user_id: string }; Returns: undefined }
      release_image_quota: {
        Args: { _count?: number; _user_id: string }
        Returns: undefined
      }
      resolve_affiliate_redirect: {
        Args: { _code: string; _referer?: string; _user_agent?: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user"
      asset_kind: "ecommerce" | "mobile_app" | "saas"
      integration_category: "outbound" | "social"
      integration_state:
        | "not_connected"
        | "staged"
        | "connected"
        | "expired"
        | "revoked"
        | "error"
      job_state: "queued" | "running" | "succeeded" | "failed" | "dead"
      org_role: "owner" | "admin" | "member"
      post_state:
        | "draft"
        | "awaiting_approval"
        | "scheduled"
        | "publishing"
        | "published"
        | "failed"
        | "canceled"
      social_platform:
        | "tiktok"
        | "instagram"
        | "youtube"
        | "linkedin"
        | "x"
        | "facebook"
      sub_status: "active" | "past_due" | "canceled" | "trialing"
      sub_tier: "trial" | "starter" | "pro" | "test" | "agency"
      video_status:
        | "pending"
        | "scripting"
        | "generating_voice"
        | "generating_images"
        | "rendering"
        | "ready"
        | "failed"
        | "low_credit"
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
      app_role: ["admin", "user"],
      asset_kind: ["ecommerce", "mobile_app", "saas"],
      integration_category: ["outbound", "social"],
      integration_state: [
        "not_connected",
        "staged",
        "connected",
        "expired",
        "revoked",
        "error",
      ],
      job_state: ["queued", "running", "succeeded", "failed", "dead"],
      org_role: ["owner", "admin", "member"],
      post_state: [
        "draft",
        "awaiting_approval",
        "scheduled",
        "publishing",
        "published",
        "failed",
        "canceled",
      ],
      social_platform: [
        "tiktok",
        "instagram",
        "youtube",
        "linkedin",
        "x",
        "facebook",
      ],
      sub_status: ["active", "past_due", "canceled", "trialing"],
      sub_tier: ["trial", "starter", "pro", "test", "agency"],
      video_status: [
        "pending",
        "scripting",
        "generating_voice",
        "generating_images",
        "rendering",
        "ready",
        "failed",
        "low_credit",
      ],
    },
  },
} as const
