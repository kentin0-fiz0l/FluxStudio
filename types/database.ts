/**
 * Supabase Database Types for FluxStudio
 *
 * This file contains TypeScript types for the database schema.
 * Update this file when making schema changes.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // Users table
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      // Organizations/Teams
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          owner_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };

      // Organization members
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'member' | 'viewer';
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: 'owner' | 'admin' | 'member' | 'viewer';
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: 'owner' | 'admin' | 'member' | 'viewer';
          created_at?: string;
        };
      };

      // Projects
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          organization_id: string;
          created_by: string;
          status: 'active' | 'archived' | 'completed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          organization_id: string;
          created_by: string;
          status?: 'active' | 'archived' | 'completed';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          organization_id?: string;
          created_by?: string;
          status?: 'active' | 'archived' | 'completed';
          created_at?: string;
          updated_at?: string;
        };
      };

      // Assets (files uploaded for feedback)
      assets: {
        Row: {
          id: string;
          name: string;
          file_path: string;
          file_type: 'image' | 'video' | 'audio' | '3d' | 'document';
          mime_type: string;
          file_size: number;
          thumbnail_url: string | null;
          duration: number | null; // For video/audio in seconds
          dimensions: Json | null; // { width: number, height: number } for images/video
          metadata: Json | null;
          project_id: string;
          uploaded_by: string;
          version: number;
          parent_asset_id: string | null; // For version tracking
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          file_path: string;
          file_type: 'image' | 'video' | 'audio' | '3d' | 'document';
          mime_type: string;
          file_size: number;
          thumbnail_url?: string | null;
          duration?: number | null;
          dimensions?: Json | null;
          metadata?: Json | null;
          project_id: string;
          uploaded_by: string;
          version?: number;
          parent_asset_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          file_path?: string;
          file_type?: 'image' | 'video' | 'audio' | '3d' | 'document';
          mime_type?: string;
          file_size?: number;
          thumbnail_url?: string | null;
          duration?: number | null;
          dimensions?: Json | null;
          metadata?: Json | null;
          project_id?: string;
          uploaded_by?: string;
          version?: number;
          parent_asset_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      // Comments/Annotations
      comments: {
        Row: {
          id: string;
          content: string;
          asset_id: string;
          author_id: string;
          parent_comment_id: string | null; // For replies
          // Position data for annotations
          position: Json | null; // { x: number, y: number } for images
          timestamp: number | null; // For video/audio timestamps in seconds
          frame: number | null; // For video frame numbers
          camera_position: Json | null; // For 3D models { x, y, z, target: { x, y, z } }
          is_resolved: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          content: string;
          asset_id: string;
          author_id: string;
          parent_comment_id?: string | null;
          position?: Json | null;
          timestamp?: number | null;
          frame?: number | null;
          camera_position?: Json | null;
          is_resolved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          content?: string;
          asset_id?: string;
          author_id?: string;
          parent_comment_id?: string | null;
          position?: Json | null;
          timestamp?: number | null;
          frame?: number | null;
          camera_position?: Json | null;
          is_resolved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };

      // Review sessions
      review_sessions: {
        Row: {
          id: string;
          name: string;
          project_id: string;
          created_by: string;
          status: 'pending' | 'in_progress' | 'completed';
          due_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          project_id: string;
          created_by: string;
          status?: 'pending' | 'in_progress' | 'completed';
          due_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          project_id?: string;
          created_by?: string;
          status?: 'pending' | 'in_progress' | 'completed';
          due_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };

    Views: {
      [_ in never]: never;
    };

    Functions: {
      [_ in never]: never;
    };

    Enums: {
      asset_type: 'image' | 'video' | 'audio' | '3d' | 'document';
      member_role: 'owner' | 'admin' | 'member' | 'viewer';
      project_status: 'active' | 'archived' | 'completed';
      review_status: 'pending' | 'in_progress' | 'completed';
    };
  };
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

// Convenience type aliases
export type User = Tables<'users'>;
export type Organization = Tables<'organizations'>;
export type OrganizationMember = Tables<'organization_members'>;
export type Project = Tables<'projects'>;
export type Asset = Tables<'assets'>;
export type Comment = Tables<'comments'>;
export type ReviewSession = Tables<'review_sessions'>;
