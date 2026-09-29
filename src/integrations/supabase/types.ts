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
      app_feedback: {
        Row: {
          created_at: string
          friction: string
          id: string
          keep: string
          minutes_used: number
          missing: string
          rating: number
          survey_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friction?: string
          id?: string
          keep?: string
          minutes_used?: number
          missing?: string
          rating: number
          survey_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          friction?: string
          id?: string
          keep?: string
          minutes_used?: number
          missing?: string
          rating?: number
          survey_id?: string
          user_id?: string
        }
        Relationships: []
      }
      beta_access: {
        Row: {
          invitation_id: string | null
          invited_by: string | null
          joined_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          invitation_id?: string | null
          invited_by?: string | null
          joined_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          invitation_id?: string | null
          invited_by?: string | null
          joined_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      beta_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string | null
          expires_at: string
          id: string
          invited_by: string
          max_uses: number
          revoked_at: string | null
          token_hash: string
          use_count: number
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string | null
          expires_at: string
          id?: string
          invited_by: string
          max_uses?: number
          revoked_at?: string | null
          token_hash: string
          use_count?: number
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invited_by?: string
          max_uses?: number
          revoked_at?: string | null
          token_hash?: string
          use_count?: number
        }
        Relationships: []
      }
      calls: {
        Row: {
          conversation_id: string
          ended_at: string | null
          id: string
          initiator_id: string
          kind: string
          started_at: string
          status: string
        }
        Insert: {
          conversation_id: string
          ended_at?: string | null
          id?: string
          initiator_id: string
          kind?: string
          started_at?: string
          status?: string
        }
        Update: {
          conversation_id?: string
          ended_at?: string | null
          id?: string
          initiator_id?: string
          kind?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      connected_accounts: {
        Row: {
          created_at: string
          created_by: string | null
          details_submitted: boolean
          disabled_reason: string | null
          environment: string
          id: string
          org_id: string | null
          payouts_enabled: boolean
          status: string
          stripe_account_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          details_submitted?: boolean
          disabled_reason?: string | null
          environment?: string
          id?: string
          org_id?: string | null
          payouts_enabled?: boolean
          status?: string
          stripe_account_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          details_submitted?: boolean
          disabled_reason?: string | null
          environment?: string
          id?: string
          org_id?: string | null
          payouts_enabled?: boolean
          status?: string
          stripe_account_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connected_accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          created_at: string
          details: string
          id: string
          reason: string
          reporter_id: string
          resolution_note: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string
          id?: string
          reason: string
          reporter_id: string
          resolution_note?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string
          id?: string
          reason?: string
          reporter_id?: string
          resolution_note?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversation_members: {
        Row: {
          conversation_id: string
          joined_at: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          last_read_at?: string
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
      conversations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_group: boolean
          last_message_at: string
          title: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_group?: boolean
          last_message_at?: string
          title?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_group?: boolean
          last_message_at?: string
          title?: string | null
        }
        Relationships: []
      }
      counselor_profiles: {
        Row: {
          about: string
          city: string
          created_at: string
          display_name: string
          faith_integrated: boolean
          headline: string
          id: string
          languages: string[]
          license_number: string
          license_state: string
          license_type: string
          license_verified_at: string | null
          offers_in_person: boolean
          offers_video: boolean
          photo_url: string
          rate_cents: number
          region: string
          review_note: string
          sliding_scale: boolean
          slug: string
          specialties: string[]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          about?: string
          city?: string
          created_at?: string
          display_name: string
          faith_integrated?: boolean
          headline?: string
          id?: string
          languages?: string[]
          license_number?: string
          license_state?: string
          license_type?: string
          license_verified_at?: string | null
          offers_in_person?: boolean
          offers_video?: boolean
          photo_url?: string
          rate_cents?: number
          region?: string
          review_note?: string
          sliding_scale?: boolean
          slug: string
          specialties?: string[]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          about?: string
          city?: string
          created_at?: string
          display_name?: string
          faith_integrated?: boolean
          headline?: string
          id?: string
          languages?: string[]
          license_number?: string
          license_state?: string
          license_type?: string
          license_verified_at?: string | null
          offers_in_person?: boolean
          offers_video?: boolean
          photo_url?: string
          rate_cents?: number
          region?: string
          review_note?: string
          sliding_scale?: boolean
          slug?: string
          specialties?: string[]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      counselor_requests: {
        Row: {
          counselor_id: string
          created_at: string
          id: string
          message: string
          prefers_video: boolean
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          counselor_id: string
          created_at?: string
          id?: string
          message?: string
          prefers_video?: boolean
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          counselor_id?: string
          created_at?: string
          id?: string
          message?: string
          prefers_video?: boolean
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "counselor_requests_counselor_id_fkey"
            columns: ["counselor_id"]
            isOneToOne: false
            referencedRelation: "counselor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      covenant_agreements: {
        Row: {
          accepted_at: string
          accepted_name: string | null
          id: string
          scope: string
          scope_ref: string
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          accepted_name?: string | null
          id?: string
          scope: string
          scope_ref?: string
          user_id: string
          version: string
        }
        Update: {
          accepted_at?: string
          accepted_name?: string | null
          id?: string
          scope?: string
          scope_ref?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      daf_grants: {
        Row: {
          amount_cents: number
          anonymous: boolean
          created_at: string
          donor_name: string
          fund_name: string
          granted_on: string
          id: string
          note: string
          org_id: string
          public_credit: boolean
          recorded_by: string | null
          reference: string
          sponsor: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          anonymous?: boolean
          created_at?: string
          donor_name?: string
          fund_name?: string
          granted_on?: string
          id?: string
          note?: string
          org_id: string
          public_credit?: boolean
          recorded_by?: string | null
          reference?: string
          sponsor?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          anonymous?: boolean
          created_at?: string
          donor_name?: string
          fund_name?: string
          granted_on?: string
          id?: string
          note?: string
          org_id?: string
          public_credit?: boolean
          recorded_by?: string | null
          reference?: string
          sponsor?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daf_grants_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount_cents: number
          canceled_at: string | null
          charged_cents: number
          created_at: string
          currency: string
          current_period_end: string | null
          donor_name: string | null
          email: string | null
          environment: string
          fee_cents: number
          fees_covered: boolean
          frequency: string
          fund_gift_id: string | null
          id: string
          lane: string
          need_id: string | null
          note: string
          org_id: string
          paid_out_at: string | null
          pay_method: string
          payout_reference: string | null
          payout_status: string
          processing_fee_cents: number
          receipt_url: string | null
          recipient_cents: number
          refunded_cents: number
          status: string
          stripe_customer_id: string | null
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          stripe_subscription_id: string | null
          tip_cents: number
          updated_at: string
          user_id: string | null
          witness_fee_cents: number
        }
        Insert: {
          amount_cents: number
          canceled_at?: string | null
          charged_cents?: number
          created_at?: string
          currency?: string
          current_period_end?: string | null
          donor_name?: string | null
          email?: string | null
          environment?: string
          fee_cents?: number
          fees_covered?: boolean
          frequency?: string
          fund_gift_id?: string | null
          id?: string
          lane?: string
          need_id?: string | null
          note?: string
          org_id: string
          paid_out_at?: string | null
          pay_method?: string
          payout_reference?: string | null
          payout_status?: string
          processing_fee_cents?: number
          receipt_url?: string | null
          recipient_cents?: number
          refunded_cents?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          tip_cents?: number
          updated_at?: string
          user_id?: string | null
          witness_fee_cents?: number
        }
        Update: {
          amount_cents?: number
          canceled_at?: string | null
          charged_cents?: number
          created_at?: string
          currency?: string
          current_period_end?: string | null
          donor_name?: string | null
          email?: string | null
          environment?: string
          fee_cents?: number
          fees_covered?: boolean
          frequency?: string
          fund_gift_id?: string | null
          id?: string
          lane?: string
          need_id?: string | null
          note?: string
          org_id?: string
          paid_out_at?: string | null
          pay_method?: string
          payout_reference?: string | null
          payout_status?: string
          processing_fee_cents?: number
          receipt_url?: string | null
          recipient_cents?: number
          refunded_cents?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          tip_cents?: number
          updated_at?: string
          user_id?: string | null
          witness_fee_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "donations_fund_gift_id_fkey"
            columns: ["fund_gift_id"]
            isOneToOne: false
            referencedRelation: "fund_gifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_need_id_fkey"
            columns: ["need_id"]
            isOneToOne: false
            referencedRelation: "needs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      fund_gifts: {
        Row: {
          amount_cents: number
          canceled_at: string | null
          charged_cents: number
          created_at: string
          currency: string
          current_period_end: string | null
          donor_name: string | null
          email: string | null
          environment: string
          fee_cents: number
          fees_covered: boolean
          frequency: string
          id: string
          lane: string | null
          note: string
          org_count: number
          paid_out_at: string | null
          pay_method: string
          payout_reference: string | null
          payout_status: string
          processing_fee_cents: number
          receipt_url: string | null
          recipient_cents: number
          scope: string
          status: string
          stripe_customer_id: string | null
          stripe_session_id: string | null
          stripe_subscription_id: string | null
          tip_cents: number
          updated_at: string
          user_id: string | null
          witness_fee_cents: number
        }
        Insert: {
          amount_cents: number
          canceled_at?: string | null
          charged_cents?: number
          created_at?: string
          currency?: string
          current_period_end?: string | null
          donor_name?: string | null
          email?: string | null
          environment?: string
          fee_cents?: number
          fees_covered?: boolean
          frequency?: string
          id?: string
          lane?: string | null
          note?: string
          org_count?: number
          paid_out_at?: string | null
          pay_method?: string
          payout_reference?: string | null
          payout_status?: string
          processing_fee_cents?: number
          receipt_url?: string | null
          recipient_cents?: number
          scope?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          tip_cents?: number
          updated_at?: string
          user_id?: string | null
          witness_fee_cents?: number
        }
        Update: {
          amount_cents?: number
          canceled_at?: string | null
          charged_cents?: number
          created_at?: string
          currency?: string
          current_period_end?: string | null
          donor_name?: string | null
          email?: string | null
          environment?: string
          fee_cents?: number
          fees_covered?: boolean
          frequency?: string
          id?: string
          lane?: string | null
          note?: string
          org_count?: number
          paid_out_at?: string | null
          pay_method?: string
          payout_reference?: string | null
          payout_status?: string
          processing_fee_cents?: number
          receipt_url?: string | null
          recipient_cents?: number
          scope?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          tip_cents?: number
          updated_at?: string
          user_id?: string | null
          witness_fee_cents?: number
        }
        Relationships: []
      }
      gift_options: {
        Row: {
          active: boolean
          created_at: string
          description: string
          est_cost_to_org: number
          fmv: number
          id: string
          image_url: string | null
          impact_copy: string
          label: string
          requires_engraving: boolean
          requires_shipping: boolean
          requires_size: boolean
          slot: string
          tier_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string
          est_cost_to_org?: number
          fmv?: number
          id?: string
          image_url?: string | null
          impact_copy?: string
          label?: string
          requires_engraving?: boolean
          requires_shipping?: boolean
          requires_size?: boolean
          slot: string
          tier_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          est_cost_to_org?: number
          fmv?: number
          id?: string
          image_url?: string | null
          impact_copy?: string
          label?: string
          requires_engraving?: boolean
          requires_shipping?: boolean
          requires_size?: boolean
          slot?: string
          tier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_options_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_wall: {
        Row: {
          created_at: string
          display_name: string
          id: string
          kind: string
          ledger: string
          selection_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          kind: string
          ledger: string
          selection_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          kind?: string
          ledger?: string
          selection_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_wall_selection_id_fkey"
            columns: ["selection_id"]
            isOneToOne: true
            referencedRelation: "selections"
            referencedColumns: ["id"]
          },
        ]
      }
      giving_choices: {
        Row: {
          created_at: string
          id: string
          lane: string
          org_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lane?: string
          org_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lane?: string
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "giving_choices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      gratitude_amens: {
        Row: {
          created_at: string
          gratitude_id: string
          id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          gratitude_id: string
          id?: string
          sender_id: string
        }
        Update: {
          created_at?: string
          gratitude_id?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gratitude_amens_gratitude_id_fkey"
            columns: ["gratitude_id"]
            isOneToOne: false
            referencedRelation: "gratitude_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      gratitude_entries: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          linked_prayer_id: string | null
          media_path: string | null
          media_type: string | null
          privacy: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          linked_prayer_id?: string | null
          media_path?: string | null
          media_type?: string | null
          privacy?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          linked_prayer_id?: string | null
          media_path?: string | null
          media_type?: string | null
          privacy?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gratitude_entries_linked_prayer_id_fkey"
            columns: ["linked_prayer_id"]
            isOneToOne: false
            referencedRelation: "prayer_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "organization_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      intercessions: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          media_path: string | null
          media_type: string | null
          prayer_id: string
          sender_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          media_path?: string | null
          media_type?: string | null
          prayer_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          media_path?: string | null
          media_type?: string | null
          prayer_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intercessions_prayer_id_fkey"
            columns: ["prayer_id"]
            isOneToOne: false
            referencedRelation: "prayer_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      job_contributions: {
        Row: {
          amount_cents: number
          created_at: string
          donor_name: string
          email: string | null
          environment: string
          fund_id: string
          id: string
          need_id: string
          note: string
          refunded_cents: number
          status: string
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          donor_name?: string
          email?: string | null
          environment?: string
          fund_id: string
          id?: string
          need_id: string
          note?: string
          refunded_cents?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          donor_name?: string
          email?: string | null
          environment?: string
          fund_id?: string
          id?: string
          need_id?: string
          note?: string
          refunded_cents?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_contributions_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "job_funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_contributions_need_id_fkey"
            columns: ["need_id"]
            isOneToOne: false
            referencedRelation: "needs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_funds: {
        Row: {
          backer_count: number
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string
          donated: boolean
          environment: string
          goal_cents: number
          id: string
          need_id: string
          paid_out_at: string | null
          payout_reference: string | null
          payout_status: string
          platform_fee_bps: number
          platform_fee_cents: number
          raised_cents: number
          release_note: string
          released_at: string | null
          released_by: string | null
          status: string
          updated_at: string
          worker_balance_cents: number
          worker_id: string | null
          worker_line: string
          worker_name: string
        }
        Insert: {
          backer_count?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by: string
          donated?: boolean
          environment?: string
          goal_cents: number
          id?: string
          need_id: string
          paid_out_at?: string | null
          payout_reference?: string | null
          payout_status?: string
          platform_fee_bps?: number
          platform_fee_cents?: number
          raised_cents?: number
          release_note?: string
          released_at?: string | null
          released_by?: string | null
          status?: string
          updated_at?: string
          worker_balance_cents?: number
          worker_id?: string | null
          worker_line?: string
          worker_name?: string
        }
        Update: {
          backer_count?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string
          donated?: boolean
          environment?: string
          goal_cents?: number
          id?: string
          need_id?: string
          paid_out_at?: string | null
          payout_reference?: string | null
          payout_status?: string
          platform_fee_bps?: number
          platform_fee_cents?: number
          raised_cents?: number
          release_note?: string
          released_at?: string | null
          released_by?: string | null
          status?: string
          updated_at?: string
          worker_balance_cents?: number
          worker_id?: string | null
          worker_line?: string
          worker_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_funds_need_id_fkey"
            columns: ["need_id"]
            isOneToOne: true
            referencedRelation: "needs"
            referencedColumns: ["id"]
          },
        ]
      }
      member_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          kind: string
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          kind?: string
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          kind?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      need_pledges: {
        Row: {
          created_at: string
          id: string
          need_id: string
          note: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          need_id: string
          note?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          need_id?: string
          note?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "need_pledges_need_id_fkey"
            columns: ["need_id"]
            isOneToOne: false
            referencedRelation: "needs"
            referencedColumns: ["id"]
          },
        ]
      }
      need_stories: {
        Row: {
          assigned_at: string | null
          created_at: string
          created_by: string
          delivered_at: string | null
          delivery_note: string
          film_path: string
          film_url: string
          id: string
          need_id: string
          notes: string
          shared_at: string | null
          status: string
          updated_at: string
          videographer_id: string | null
          videographer_name: string
          week_of: string
        }
        Insert: {
          assigned_at?: string | null
          created_at?: string
          created_by?: string
          delivered_at?: string | null
          delivery_note?: string
          film_path?: string
          film_url?: string
          id?: string
          need_id: string
          notes?: string
          shared_at?: string | null
          status?: string
          updated_at?: string
          videographer_id?: string | null
          videographer_name?: string
          week_of: string
        }
        Update: {
          assigned_at?: string | null
          created_at?: string
          created_by?: string
          delivered_at?: string | null
          delivery_note?: string
          film_path?: string
          film_url?: string
          id?: string
          need_id?: string
          notes?: string
          shared_at?: string | null
          status?: string
          updated_at?: string
          videographer_id?: string | null
          videographer_name?: string
          week_of?: string
        }
        Relationships: [
          {
            foreignKeyName: "need_stories_need_id_fkey"
            columns: ["need_id"]
            isOneToOne: true
            referencedRelation: "needs"
            referencedColumns: ["id"]
          },
        ]
      }
      need_updates: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          kind: string
          media_path: string | null
          media_type: string | null
          need_id: string
        }
        Insert: {
          author_id: string
          body?: string
          created_at?: string
          id?: string
          kind?: string
          media_path?: string | null
          media_type?: string | null
          need_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          kind?: string
          media_path?: string | null
          media_type?: string | null
          need_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "need_updates_need_id_fkey"
            columns: ["need_id"]
            isOneToOne: false
            referencedRelation: "needs"
            referencedColumns: ["id"]
          },
        ]
      }
      needs: {
        Row: {
          city: string
          completed_at: string | null
          cover_path: string | null
          created_at: string
          featured_week: string | null
          goal_cents: number
          hands_count: number
          hours_needed: number
          id: string
          is_public: boolean
          kind: string
          needs_hands: boolean
          org_id: string | null
          posted_by: string
          prayer_id: string | null
          raised_cents: number
          region: string
          skills: string[]
          status: string
          story: string
          title: string
          updated_at: string
        }
        Insert: {
          city?: string
          completed_at?: string | null
          cover_path?: string | null
          created_at?: string
          featured_week?: string | null
          goal_cents?: number
          hands_count?: number
          hours_needed?: number
          id?: string
          is_public?: boolean
          kind?: string
          needs_hands?: boolean
          org_id?: string | null
          posted_by: string
          prayer_id?: string | null
          raised_cents?: number
          region?: string
          skills?: string[]
          status?: string
          story?: string
          title: string
          updated_at?: string
        }
        Update: {
          city?: string
          completed_at?: string | null
          cover_path?: string | null
          created_at?: string
          featured_week?: string | null
          goal_cents?: number
          hands_count?: number
          hours_needed?: number
          id?: string
          is_public?: boolean
          kind?: string
          needs_hands?: boolean
          org_id?: string | null
          posted_by?: string
          prayer_id?: string | null
          raised_cents?: number
          region?: string
          skills?: string[]
          status?: string
          story?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "needs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "needs_prayer_id_fkey"
            columns: ["prayer_id"]
            isOneToOne: false
            referencedRelation: "prayer_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      nonprofit_lane_tags: {
        Row: {
          added_by: string | null
          created_at: string
          id: string
          lane: string
          org_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: string
          lane: string
          org_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: string
          lane?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nonprofit_lane_tags_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      nonprofit_profiles: {
        Row: {
          accepting: boolean
          created_at: string
          id: string
          lane: string
          mission: string
          org_id: string
          tier: string
          to_program: number
          updated_at: string
        }
        Insert: {
          accepting?: boolean
          created_at?: string
          id?: string
          lane: string
          mission?: string
          org_id: string
          tier?: string
          to_program?: number
          updated_at?: string
        }
        Update: {
          accepting?: boolean
          created_at?: string
          id?: string
          lane?: string
          mission?: string
          org_id?: string
          tier?: string
          to_program?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nonprofit_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      nonprofit_spotlights: {
        Row: {
          buys: string[]
          city: string
          cover_url: string | null
          created_at: string
          id: string
          lane: string
          name: string
          org_id: string | null
          quote: string
          quote_by: string
          story: string
          tagline: string
          tier: string
          to_program: number
          updated_at: string
          website: string
          week_of: string
        }
        Insert: {
          buys?: string[]
          city: string
          cover_url?: string | null
          created_at?: string
          id?: string
          lane: string
          name: string
          org_id?: string | null
          quote?: string
          quote_by?: string
          story: string
          tagline: string
          tier?: string
          to_program?: number
          updated_at?: string
          website?: string
          week_of: string
        }
        Update: {
          buys?: string[]
          city?: string
          cover_url?: string | null
          created_at?: string
          id?: string
          lane?: string
          name?: string
          org_id?: string | null
          quote?: string
          quote_by?: string
          story?: string
          tagline?: string
          tier?: string
          to_program?: number
          updated_at?: string
          website?: string
          week_of?: string
        }
        Relationships: [
          {
            foreignKeyName: "nonprofit_spotlights_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      nonprofit_suggestions: {
        Row: {
          cause: string
          city: string
          created_at: string
          id: string
          lane: string
          name: string
          reason: string
          region: string
          review_note: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          suggested_by: string
          updated_at: string
          website: string
        }
        Insert: {
          cause?: string
          city?: string
          created_at?: string
          id?: string
          lane?: string
          name?: string
          reason?: string
          region?: string
          review_note?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggested_by: string
          updated_at?: string
          website?: string
        }
        Update: {
          cause?: string
          city?: string
          created_at?: string
          id?: string
          lane?: string
          name?: string
          reason?: string
          region?: string
          review_note?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggested_by?: string
          updated_at?: string
          website?: string
        }
        Relationships: []
      }
      notification_prefs: {
        Row: {
          answers: boolean
          created_at: string
          last_reminder_date: string | null
          messages: boolean
          needs: boolean
          prayed_for_me: boolean
          quiet_end: number | null
          quiet_start: number | null
          reminder_hour: number | null
          reminders: boolean
          time_zone: string | null
          updated_at: string
          user_id: string
          weekly_story: boolean
        }
        Insert: {
          answers?: boolean
          created_at?: string
          last_reminder_date?: string | null
          messages?: boolean
          needs?: boolean
          prayed_for_me?: boolean
          quiet_end?: number | null
          quiet_start?: number | null
          reminder_hour?: number | null
          reminders?: boolean
          time_zone?: string | null
          updated_at?: string
          user_id: string
          weekly_story?: boolean
        }
        Update: {
          answers?: boolean
          created_at?: string
          last_reminder_date?: string | null
          messages?: boolean
          needs?: boolean
          prayed_for_me?: boolean
          quiet_end?: number | null
          quiet_start?: number | null
          reminder_hour?: number | null
          reminders?: boolean
          time_zone?: string | null
          updated_at?: string
          user_id?: string
          weekly_story?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string
          category: string
          created_at: string
          id: string
          path: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string
          category: string
          created_at?: string
          id?: string
          path?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string
          category?: string
          created_at?: string
          id?: string
          path?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      org_announcements: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          kind: string
          link_url: string | null
          org_id: string
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body?: string
          created_at?: string
          id?: string
          kind?: string
          link_url?: string | null
          org_id: string
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          kind?: string
          link_url?: string | null
          org_id?: string
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_announcements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_claim_invites: {
        Row: {
          channel: string
          created_at: string
          handled_at: string | null
          handled_by: string | null
          id: string
          note: string
          org_id: string
          prompted_by: string | null
          sent_to: string
          status: string
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          note?: string
          org_id: string
          prompted_by?: string | null
          sent_to: string
          status?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          note?: string
          org_id?: string
          prompted_by?: string | null
          sent_to?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_claim_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_claims: {
        Row: {
          created_at: string
          id: string
          note: string
          org_id: string
          phone: string
          review_note: string
          reviewed_at: string | null
          reviewed_by: string | null
          role_title: string
          status: string
          updated_at: string
          user_id: string
          work_email: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string
          org_id: string
          phone?: string
          review_note?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_title?: string
          status?: string
          updated_at?: string
          user_id: string
          work_email?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          org_id?: string
          phone?: string
          review_note?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_title?: string
          status?: string
          updated_at?: string
          user_id?: string
          work_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_claims_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_counselors: {
        Row: {
          counselor_id: string
          created_at: string
          id: string
          org_id: string
        }
        Insert: {
          counselor_id: string
          created_at?: string
          id?: string
          org_id: string
        }
        Update: {
          counselor_id?: string
          created_at?: string
          id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_counselors_counselor_id_fkey"
            columns: ["counselor_id"]
            isOneToOne: false
            referencedRelation: "counselor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_counselors_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_payout_accounts: {
        Row: {
          account_holder: string
          account_reference: string
          bank_name: string
          contact_email: string
          created_at: string
          id: string
          note: string
          org_id: string
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          account_holder?: string
          account_reference?: string
          bank_name?: string
          contact_email?: string
          created_at?: string
          id?: string
          note?: string
          org_id: string
          provider?: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_holder?: string
          account_reference?: string
          bank_name?: string
          contact_email?: string
          created_at?: string
          id?: string
          note?: string
          org_id?: string
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_payout_accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_subscriptions: {
        Row: {
          amount_cents: number
          created_at: string
          current_period_end: string | null
          environment: string
          id: string
          org_id: string
          plan: string
          price_id: string
          started_by: string | null
          status: string
          stripe_customer_id: string | null
          stripe_session_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          current_period_end?: string | null
          environment?: string
          id?: string
          org_id: string
          plan: string
          price_id?: string
          started_by?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          current_period_end?: string | null
          environment?: string
          id?: string
          org_id?: string
          plan?: string
          price_id?: string
          started_by?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_events: {
        Row: {
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string
          ends_at: string | null
          id: string
          online_url: string | null
          org_id: string
          place: string
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          ends_at?: string | null
          id?: string
          online_url?: string | null
          org_id: string
          place?: string
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          ends_at?: string | null
          id?: string
          online_url?: string | null
          org_id?: string
          place?: string
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_groups: {
        Row: {
          accepting: boolean
          covenant: string[]
          created_at: string
          created_by: string | null
          description: string
          door_question: string
          id: string
          kind: string
          member_count: number
          name: string
          next_meet: string
          open_to: string
          org_id: string
          rhythm: string
          seats_total: number
          tone: string
          updated_at: string
        }
        Insert: {
          accepting?: boolean
          covenant?: string[]
          created_at?: string
          created_by?: string | null
          description?: string
          door_question?: string
          id?: string
          kind?: string
          member_count?: number
          name: string
          next_meet?: string
          open_to?: string
          org_id: string
          rhythm?: string
          seats_total?: number
          tone?: string
          updated_at?: string
        }
        Update: {
          accepting?: boolean
          covenant?: string[]
          created_at?: string
          created_by?: string | null
          description?: string
          door_question?: string
          id?: string
          kind?: string
          member_count?: number
          name?: string
          next_meet?: string
          open_to?: string
          org_id?: string
          rhythm?: string
          seats_total?: number
          tone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_groups_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
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
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: string
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
      organization_prayer_requests: {
        Row: {
          contact: string
          created_at: string
          id: string
          keep_private: boolean
          name: string
          org_id: string
          prayed: boolean
          request: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          contact?: string
          created_at?: string
          id?: string
          keep_private?: boolean
          name?: string
          org_id: string
          prayed?: boolean
          request: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          contact?: string
          created_at?: string
          id?: string
          keep_private?: boolean
          name?: string
          org_id?: string
          prayed?: boolean
          request?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_prayer_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_services: {
        Row: {
          created_at: string
          day_of_week: number
          id: string
          label: string
          note: string
          org_id: string
          sort: number
          time_text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week?: number
          id?: string
          label: string
          note?: string
          org_id: string
          sort?: number
          time_text?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          label?: string
          note?: string
          org_id?: string
          sort?: number
          time_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_services_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string
          city: string
          claimed_at: string | null
          claimed_by: string | null
          contact_email: string | null
          contact_phone: string | null
          cover_path: string | null
          created_at: string
          description: string
          google_place_id: string | null
          id: string
          kind: string
          logo_url: string | null
          name: string
          owner_id: string | null
          region: string
          slug: string
          updated_at: string
          verified: boolean
          website: string | null
        }
        Insert: {
          address?: string
          city?: string
          claimed_at?: string | null
          claimed_by?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          cover_path?: string | null
          created_at?: string
          description?: string
          google_place_id?: string | null
          id?: string
          kind?: string
          logo_url?: string | null
          name: string
          owner_id?: string | null
          region?: string
          slug: string
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          address?: string
          city?: string
          claimed_at?: string | null
          claimed_by?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          cover_path?: string | null
          created_at?: string
          description?: string
          google_place_id?: string | null
          id?: string
          kind?: string
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          region?: string
          slug?: string
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Relationships: []
      }
      payout_transfers: {
        Row: {
          amount_cents: number
          connected_account_id: string | null
          created_at: string
          currency: string
          environment: string
          failure_message: string | null
          id: string
          org_id: string | null
          source_id: string
          source_kind: string
          status: string
          stripe_account_id: string
          stripe_transfer_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          connected_account_id?: string | null
          created_at?: string
          currency?: string
          environment?: string
          failure_message?: string | null
          id?: string
          org_id?: string | null
          source_id: string
          source_kind: string
          status?: string
          stripe_account_id: string
          stripe_transfer_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          connected_account_id?: string | null
          created_at?: string
          currency?: string
          environment?: string
          failure_message?: string | null
          id?: string
          org_id?: string | null
          source_id?: string
          source_kind?: string
          status?: string
          stripe_account_id?: string
          stripe_transfer_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payout_transfers_connected_account_id_fkey"
            columns: ["connected_account_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_transfers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      perk_awards: {
        Row: {
          created_at: string
          fulfilled_at: string | null
          fulfilled_by: string | null
          id: string
          note: string
          perk: string
          shipping: string
          status: string
          threshold: number
          track: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          id?: string
          note?: string
          perk: string
          shipping?: string
          status?: string
          threshold: number
          track: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          id?: string
          note?: string
          perk?: string
          shipping?: string
          status?: string
          threshold?: number
          track?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string
          enabled: boolean
          key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          enabled?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      platform_testimonials: {
        Row: {
          author_id: string
          consent_confirmed: boolean
          created_at: string
          headline: string
          id: string
          org_id: string | null
          outcome: string
          photo_url: string | null
          pro_id: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          story: string
          subject_type: string
          updated_at: string
        }
        Insert: {
          author_id: string
          consent_confirmed?: boolean
          created_at?: string
          headline: string
          id?: string
          org_id?: string | null
          outcome: string
          photo_url?: string | null
          pro_id?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          story: string
          subject_type: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          consent_confirmed?: boolean
          created_at?: string
          headline?: string
          id?: string
          org_id?: string | null
          outcome?: string
          photo_url?: string | null
          pro_id?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          story?: string
          subject_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_testimonials_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_testimonials_pro_id_fkey"
            columns: ["pro_id"]
            isOneToOne: false
            referencedRelation: "pro_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_media: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          media_type: string
          mime_type: string
          owner_id: string
          prayer_id: string
          size_bytes: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          media_type: string
          mime_type: string
          owner_id: string
          prayer_id: string
          size_bytes: number
          storage_path: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          media_type?: string
          mime_type?: string
          owner_id?: string
          prayer_id?: string
          size_bytes?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_media_prayer_id_fkey"
            columns: ["prayer_id"]
            isOneToOne: false
            referencedRelation: "prayer_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_posts: {
        Row: {
          answer_kind: string | null
          author_id: string
          bg_color: string | null
          body: string
          category: string
          created_at: string
          followup_sent_at: string | null
          id: string
          is_anonymous: boolean
          organization_id: string | null
          overlay: Json | null
          parent_prayer_id: string | null
          post_type: string
          privacy: string
          status: string
          updated_at: string
          verse_ref: string | null
          verse_text: string | null
        }
        Insert: {
          answer_kind?: string | null
          author_id: string
          bg_color?: string | null
          body?: string
          category?: string
          created_at?: string
          followup_sent_at?: string | null
          id?: string
          is_anonymous?: boolean
          organization_id?: string | null
          overlay?: Json | null
          parent_prayer_id?: string | null
          post_type?: string
          privacy?: string
          status?: string
          updated_at?: string
          verse_ref?: string | null
          verse_text?: string | null
        }
        Update: {
          answer_kind?: string | null
          author_id?: string
          bg_color?: string | null
          body?: string
          category?: string
          created_at?: string
          followup_sent_at?: string | null
          id?: string
          is_anonymous?: boolean
          organization_id?: string | null
          overlay?: Json | null
          parent_prayer_id?: string | null
          post_type?: string
          privacy?: string
          status?: string
          updated_at?: string
          verse_ref?: string | null
          verse_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prayer_posts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_posts_parent_prayer_id_fkey"
            columns: ["parent_prayer_id"]
            isOneToOne: false
            referencedRelation: "prayer_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_contacts: {
        Row: {
          phone: string
          pro_id: string
          updated_at: string
        }
        Insert: {
          phone?: string
          pro_id: string
          updated_at?: string
        }
        Update: {
          phone?: string
          pro_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pro_contacts_pro_id_fkey"
            columns: ["pro_id"]
            isOneToOne: true
            referencedRelation: "pro_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_lanes: {
        Row: {
          active: boolean
          created_at: string
          id: string
          lane: string
          notes: string
          pro_id: string
          rate_cents: number
          rate_kind: string
          serves_free: boolean
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          lane: string
          notes?: string
          pro_id: string
          rate_cents?: number
          rate_kind?: string
          serves_free?: boolean
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          lane?: string
          notes?: string
          pro_id?: string
          rate_cents?: number
          rate_kind?: string
          serves_free?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pro_lanes_pro_id_fkey"
            columns: ["pro_id"]
            isOneToOne: false
            referencedRelation: "pro_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_profiles: {
        Row: {
          about: string
          city: string
          created_at: string
          display_name: string
          headline: string
          id: string
          id_verified_at: string | null
          photo_url: string | null
          rate_cents: number
          rate_kind: string
          region: string
          removed_at: string | null
          review_note: string
          reviewed_at: string | null
          reviewed_by: string | null
          serves_free: boolean
          service_area: string
          slug: string
          status: string
          trade: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          about?: string
          city?: string
          created_at?: string
          display_name?: string
          headline?: string
          id?: string
          id_verified_at?: string | null
          photo_url?: string | null
          rate_cents?: number
          rate_kind?: string
          region?: string
          removed_at?: string | null
          review_note?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          serves_free?: boolean
          service_area?: string
          slug: string
          status?: string
          trade?: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          about?: string
          city?: string
          created_at?: string
          display_name?: string
          headline?: string
          id?: string
          id_verified_at?: string | null
          photo_url?: string | null
          rate_cents?: number
          rate_kind?: string
          region?: string
          removed_at?: string | null
          review_note?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          serves_free?: boolean
          service_area?: string
          slug?: string
          status?: string
          trade?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      pro_reviews: {
        Row: {
          author_id: string
          body: string
          created_at: string
          direction: string
          id: string
          job_key: string
          need_id: string | null
          pro_id: string
          revealed_at: string | null
          stars: number
          subject_id: string
        }
        Insert: {
          author_id: string
          body?: string
          created_at?: string
          direction: string
          id?: string
          job_key: string
          need_id?: string | null
          pro_id: string
          revealed_at?: string | null
          stars: number
          subject_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          direction?: string
          id?: string
          job_key?: string
          need_id?: string | null
          pro_id?: string
          revealed_at?: string | null
          stars?: number
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pro_reviews_pro_id_fkey"
            columns: ["pro_id"]
            isOneToOne: false
            referencedRelation: "pro_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_strikes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kind: string
          need_id: string | null
          note: string
          pro_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          need_id?: string | null
          note?: string
          pro_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          need_id?: string | null
          note?: string
          pro_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pro_strikes_pro_id_fkey"
            columns: ["pro_id"]
            isOneToOne: false
            referencedRelation: "pro_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_subscriptions: {
        Row: {
          amount_cents: number
          created_at: string
          current_period_end: string | null
          environment: string
          id: string
          plan: string
          price_id: string
          pro_id: string
          status: string
          stripe_customer_id: string | null
          stripe_session_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          current_period_end?: string | null
          environment?: string
          id?: string
          plan?: string
          price_id?: string
          pro_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          current_period_end?: string | null
          environment?: string
          id?: string
          plan?: string
          price_id?: string
          pro_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pro_subscriptions_pro_id_fkey"
            columns: ["pro_id"]
            isOneToOne: false
            referencedRelation: "pro_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_verifications: {
        Row: {
          created_at: string
          id: string
          note: string
          pro_id: string
          provider: string
          reference: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string
          pro_id: string
          provider?: string
          reference?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          pro_id?: string
          provider?: string
          reference?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pro_verifications_pro_id_fkey"
            columns: ["pro_id"]
            isOneToOne: true
            referencedRelation: "pro_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_media: {
        Row: {
          caption: string
          created_at: string
          display_order: number
          id: string
          media_type: string
          moderation_status: string
          owner_id: string
          page_id: string
          page_type: string
          storage_path: string
          updated_at: string
        }
        Insert: {
          caption?: string
          created_at?: string
          display_order?: number
          id?: string
          media_type: string
          moderation_status?: string
          owner_id: string
          page_id: string
          page_type: string
          storage_path: string
          updated_at?: string
        }
        Update: {
          caption?: string
          created_at?: string
          display_order?: number
          id?: string
          media_type?: string
          moderation_status?: string
          owner_id?: string
          page_id?: string
          page_type?: string
          storage_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          business_line: string
          business_name: string
          created_at: string
          display_name: string | null
          giver_mark: boolean
          has_given: boolean
          id: string
          serving_public: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          business_line?: string
          business_name?: string
          created_at?: string
          display_name?: string | null
          giver_mark?: boolean
          has_given?: boolean
          id?: string
          serving_public?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          business_line?: string
          business_name?: string
          created_at?: string
          display_name?: string | null
          giver_mark?: boolean
          has_given?: boolean
          id?: string
          serving_public?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_devices: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reminder_cron_key: {
        Row: {
          created_at: string
          id: number
          key: string
        }
        Insert: {
          created_at?: string
          id?: number
          key: string
        }
        Update: {
          created_at?: string
          id?: number
          key?: string
        }
        Relationships: []
      }
      selections: {
        Row: {
          address_1: string | null
          address_2: string | null
          anonymous: boolean
          city: string | null
          created_at: string
          earned_tier_id: string
          engraving_text: string | null
          fmv_at_selection: number
          id: string
          ledger: string
          locks_at: string
          option_id: string
          qualified_at: string
          shipping_name: string | null
          size: string | null
          slot: string
          state: string | null
          status: string
          tier_id: string
          updated_at: string
          user_id: string
          zip: string | null
        }
        Insert: {
          address_1?: string | null
          address_2?: string | null
          anonymous?: boolean
          city?: string | null
          created_at?: string
          earned_tier_id: string
          engraving_text?: string | null
          fmv_at_selection?: number
          id?: string
          ledger: string
          locks_at: string
          option_id: string
          qualified_at: string
          shipping_name?: string | null
          size?: string | null
          slot: string
          state?: string | null
          status?: string
          tier_id: string
          updated_at?: string
          user_id: string
          zip?: string | null
        }
        Update: {
          address_1?: string | null
          address_2?: string | null
          anonymous?: boolean
          city?: string | null
          created_at?: string
          earned_tier_id?: string
          engraving_text?: string | null
          fmv_at_selection?: number
          id?: string
          ledger?: string
          locks_at?: string
          option_id?: string
          qualified_at?: string
          shipping_name?: string | null
          size?: string | null
          slot?: string
          state?: string | null
          status?: string
          tier_id?: string
          updated_at?: string
          user_id?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "selections_earned_tier_id_fkey"
            columns: ["earned_tier_id"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selections_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "gift_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selections_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_hours: {
        Row: {
          created_at: string
          hours: number
          id: string
          need_id: string | null
          note: string
          org_id: string | null
          served_on: string
          status: string
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          hours: number
          id?: string
          need_id?: string | null
          note?: string
          org_id?: string | null
          served_on?: string
          status?: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          hours?: number
          id?: string
          need_id?: string | null
          note?: string
          org_id?: string | null
          served_on?: string
          status?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_hours_need_id_fkey"
            columns: ["need_id"]
            isOneToOne: false
            referencedRelation: "needs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_hours_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_offers: {
        Row: {
          created_at: string
          id: string
          message: string
          pro_id: string
          pro_user_id: string
          rate_cents: number
          rate_kind: string
          request_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string
          pro_id: string
          pro_user_id?: string
          rate_cents?: number
          rate_kind?: string
          request_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          pro_id?: string
          pro_user_id?: string
          rate_cents?: number
          rate_kind?: string
          request_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_offers_pro_id_fkey"
            columns: ["pro_id"]
            isOneToOne: false
            referencedRelation: "pro_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          budget_cents: number
          city: string
          contact_note: string
          created_at: string
          details: string
          heads_up_at: string | null
          heads_up_note: string
          hired_at: string | null
          hired_pro_id: string | null
          id: string
          lane: string
          org_id: string | null
          rate_kind: string
          region: string
          seeker_id: string
          status: string
          title: string
          updated_at: string
          urgency: string
          wants_donated: boolean
        }
        Insert: {
          budget_cents?: number
          city?: string
          contact_note?: string
          created_at?: string
          details?: string
          heads_up_at?: string | null
          heads_up_note?: string
          hired_at?: string | null
          hired_pro_id?: string | null
          id?: string
          lane: string
          org_id?: string | null
          rate_kind?: string
          region?: string
          seeker_id?: string
          status?: string
          title: string
          updated_at?: string
          urgency?: string
          wants_donated?: boolean
        }
        Update: {
          budget_cents?: number
          city?: string
          contact_note?: string
          created_at?: string
          details?: string
          heads_up_at?: string | null
          heads_up_note?: string
          hired_at?: string | null
          hired_pro_id?: string | null
          id?: string
          lane?: string
          org_id?: string | null
          rate_kind?: string
          region?: string
          seeker_id?: string
          status?: string
          title?: string
          updated_at?: string
          urgency?: string
          wants_donated?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_hired_pro_id_fkey"
            columns: ["hired_pro_id"]
            isOneToOne: false
            referencedRelation: "pro_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      serving_badges: {
        Row: {
          avatar_url: string | null
          business_line: string
          business_name: string
          display_name: string
          hours_self: number
          hours_verified: number
          is_public: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          business_line?: string
          business_name?: string
          display_name?: string
          hours_self?: number
          hours_verified?: number
          is_public?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          business_line?: string
          business_name?: string
          display_name?: string
          hours_self?: number
          hours_verified?: number
          is_public?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      store_order_items: {
        Row: {
          created_at: string
          id: string
          name: string
          order_id: string
          product_id: string | null
          quantity: number
          size: string | null
          unit_cents: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          order_id: string
          product_id?: string | null
          quantity?: number
          size?: string | null
          unit_cents: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          size?: string | null
          unit_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "store_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_orders: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          delivered_at: string | null
          email: string | null
          environment: string
          fulfillment: string
          id: string
          org_id: string
          refunded_cents: number
          shipped_at: string | null
          shipping_address: Json | null
          shipping_cents: number
          shipping_name: string | null
          status: string
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          tax_cents: number
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          currency?: string
          delivered_at?: string | null
          email?: string | null
          environment?: string
          fulfillment?: string
          id?: string
          org_id: string
          refunded_cents?: number
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_cents?: number
          shipping_name?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tax_cents?: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          delivered_at?: string | null
          email?: string | null
          environment?: string
          fulfillment?: string
          id?: string
          org_id?: string
          refunded_cents?: number
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_cents?: number
          shipping_name?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tax_cents?: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      store_products: {
        Row: {
          active: boolean
          created_at: string
          description: string
          id: string
          image_url: string | null
          name: string
          org_id: string
          price_cents: number
          sizes: string[]
          sort: number
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          name: string
          org_id: string
          price_cents: number
          sizes?: string[]
          sort?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          name?: string
          org_id?: string
          price_cents?: number
          sizes?: string[]
          sort?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_products_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      story_shoots: {
        Row: {
          created_at: string
          id: string
          note: string
          phase: string
          scheduled_for: string
          status: string
          story_id: string
          update_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string
          phase: string
          scheduled_for: string
          status?: string
          story_id: string
          update_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          phase?: string
          scheduled_for?: string
          status?: string
          story_id?: string
          update_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_shoots_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "need_stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_shoots_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "need_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      support_requests: {
        Row: {
          answered_at: string | null
          body: string
          created_at: string
          email: string
          id: string
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          answered_at?: string | null
          body: string
          created_at?: string
          email: string
          id?: string
          status?: string
          subject: string
          user_id: string
        }
        Update: {
          answered_at?: string | null
          body?: string
          created_at?: string
          email?: string
          id?: string
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      therapists: {
        Row: {
          accepting: boolean
          bio: string
          created_at: string
          credentials: string
          display_name: string
          license_state: string
          updated_at: string
          user_id: string
          verified: boolean
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          accepting?: boolean
          bio?: string
          created_at?: string
          credentials?: string
          display_name?: string
          license_state?: string
          updated_at?: string
          user_id: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          accepting?: boolean
          bio?: string
          created_at?: string
          credentials?: string
          display_name?: string
          license_state?: string
          updated_at?: string
          user_id?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      therapy_agreements: {
        Row: {
          id: string
          party: string
          signed_at: string
          signed_name: string
          user_id: string
          version: string
        }
        Insert: {
          id?: string
          party?: string
          signed_at?: string
          signed_name?: string
          user_id: string
          version: string
        }
        Update: {
          id?: string
          party?: string
          signed_at?: string
          signed_name?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      therapy_notes: {
        Row: {
          body: string
          created_at: string
          id: string
          session_id: string
          therapist_id: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          session_id: string
          therapist_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          session_id?: string
          therapist_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "therapy_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "therapy_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      therapy_sessions: {
        Row: {
          client_id: string
          conversation_id: string | null
          created_at: string
          ended_at: string | null
          id: string
          minutes: number
          reason: string
          slot_id: string | null
          started_at: string | null
          starts_at: string
          status: string
          therapist_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          conversation_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          minutes?: number
          reason?: string
          slot_id?: string | null
          started_at?: string | null
          starts_at: string
          status?: string
          therapist_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          conversation_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          minutes?: number
          reason?: string
          slot_id?: string | null
          started_at?: string | null
          starts_at?: string
          status?: string
          therapist_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "therapy_sessions_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "therapy_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      therapy_slots: {
        Row: {
          created_at: string
          id: string
          minutes: number
          starts_at: string
          status: string
          therapist_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          minutes?: number
          starts_at: string
          status?: string
          therapist_id: string
        }
        Update: {
          created_at?: string
          id?: string
          minutes?: number
          starts_at?: string
          status?: string
          therapist_id?: string
        }
        Relationships: []
      }
      tiers: {
        Row: {
          created_at: string
          gifts: boolean
          id: string
          ledger: string
          name: string
          sort_order: number
          threshold: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          gifts?: boolean
          id?: string
          ledger: string
          name?: string
          sort_order?: number
          threshold: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          gifts?: boolean
          id?: string
          ledger?: string
          name?: string
          sort_order?: number
          threshold?: number
          updated_at?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
      user_survey: {
        Row: {
          added_features: string[]
          anonymous_first: boolean
          answers: Json
          completed: boolean
          contact: string
          created_at: string
          faith_based: boolean | null
          first_name: string
          gender: string
          group_size: string
          intensity: string
          lanes: string[]
          mens_room: boolean
          processing: string
          removed_features: string[]
          seasons: string[]
          serve: string[]
          time_of_day: string
          updated_at: string
          user_id: string
        }
        Insert: {
          added_features?: string[]
          anonymous_first?: boolean
          answers?: Json
          completed?: boolean
          contact?: string
          created_at?: string
          faith_based?: boolean | null
          first_name?: string
          gender?: string
          group_size?: string
          intensity?: string
          lanes?: string[]
          mens_room?: boolean
          processing?: string
          removed_features?: string[]
          seasons?: string[]
          serve?: string[]
          time_of_day?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          added_features?: string[]
          anonymous_first?: boolean
          answers?: Json
          completed?: boolean
          contact?: string
          created_at?: string
          faith_based?: boolean | null
          first_name?: string
          gender?: string
          group_size?: string
          intensity?: string
          lanes?: string[]
          mens_room?: boolean
          processing?: string
          removed_features?: string[]
          seasons?: string[]
          serve?: string[]
          time_of_day?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      videographers: {
        Row: {
          about: string
          city: string
          created_at: string
          display_name: string
          id: string
          reel_url: string
          region: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          about?: string
          city?: string
          created_at?: string
          display_name: string
          id?: string
          reel_url?: string
          region?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          about?: string
          city?: string
          created_at?: string
          display_name?: string
          id?: string
          reel_url?: string
          region?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      witness_gifts: {
        Row: {
          amount_cents: number
          canceled_at: string | null
          created_at: string
          currency: string
          current_period_end: string | null
          donor_name: string | null
          email: string | null
          environment: string
          frequency: string
          id: string
          note: string
          pay_method: string
          receipt_url: string | null
          status: string
          stripe_customer_id: string | null
          stripe_invoice_id: string | null
          stripe_session_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          canceled_at?: string | null
          created_at?: string
          currency?: string
          current_period_end?: string | null
          donor_name?: string | null
          email?: string | null
          environment?: string
          frequency?: string
          id?: string
          note?: string
          pay_method?: string
          receipt_url?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          canceled_at?: string | null
          created_at?: string
          currency?: string
          current_period_end?: string | null
          donor_name?: string | null
          email?: string | null
          environment?: string
          frequency?: string
          id?: string
          note?: string
          pay_method?: string
          receipt_url?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      worker_marks: {
        Row: {
          created_at: string
          created_by: string
          id: string
          kind: string
          need_id: string
          note: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          kind: string
          need_id: string
          note?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          need_id?: string
          note?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_marks_need_id_fkey"
            columns: ["need_id"]
            isOneToOne: false
            referencedRelation: "needs"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_reputation: {
        Row: {
          donated_count: number
          jobs_paid: number
          mark_count: number
          review_count: number
          stars_avg: number
          updated_at: string
          user_id: string
        }
        Insert: {
          donated_count?: number
          jobs_paid?: number
          mark_count?: number
          review_count?: number
          stars_avg?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          donated_count?: number
          jobs_paid?: number
          mark_count?: number
          review_count?: number
          stars_avg?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      worker_reviews: {
        Row: {
          body: string
          created_at: string
          donated: boolean
          hours: number | null
          id: string
          need_id: string
          reviewer_id: string
          reviewer_role: string
          stars: number
          updated_at: string
          worker_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          donated?: boolean
          hours?: number | null
          id?: string
          need_id: string
          reviewer_id: string
          reviewer_role?: string
          stars: number
          updated_at?: string
          worker_id: string
        }
        Update: {
          body?: string
          created_at?: string
          donated?: boolean
          hours?: number | null
          id?: string
          need_id?: string
          reviewer_id?: string
          reviewer_role?: string
          stars?: number
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_reviews_need_id_fkey"
            columns: ["need_id"]
            isOneToOne: false
            referencedRelation: "needs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      grants_for_org_public: {
        Args: { _org_id: string }
        Returns: {
          amount_cents: number
          anonymous: boolean
          created_at: string
          donor_name: string
          fund_name: string
          granted_on: string
          id: string
          note: string
          org_id: string
          recorded_by: string
          reference: string
          sponsor: string
          status: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_beta_member: { Args: { _user_id: string }; Returns: boolean }
      join_group: { Args: { p_group_id: string }; Returns: string }
      member_cards: {
        Args: { _ids: string[] }
        Returns: {
          avatar_url: string
          bio: string
          business_line: string
          business_name: string
          display_name: string
          giver_mark: boolean
          has_given: boolean
          serving_public: boolean
          user_id: string
        }[]
      }
      org_plans: {
        Args: { _org_id: string }
        Returns: {
          plan: string
          status: string
        }[]
      }
      search_people: {
        Args: { _limit?: number; _q: string }
        Returns: {
          avatar_url: string
          bio: string
          business_line: string
          business_name: string
          display_name: string
          user_id: string
        }[]
      }
      sync_serving_badge: { Args: { _user: string }; Returns: undefined }
      sync_worker_reputation: { Args: { _user: string }; Returns: undefined }
      therapy_agreement_signed: { Args: { _party: string }; Returns: boolean }
      therapy_agreement_version: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "vetter" | "org_leader" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "vetter", "org_leader", "user"],
    },
  },
} as const
