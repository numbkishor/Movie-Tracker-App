/**
 * Types for the schema in supabase/migrations/0001_init.sql.
 *
 * Hand-written to match that migration column for column. If you change the
 * schema, regenerate or update this in the same commit —
 * `supabase gen types typescript --local > src/lib/supabase/database.types.ts`
 * produces the same shape.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      movies: {
        Row: {
          tmdb_id: number;
          media_type: string;
          title: string;
          release_date: string | null;
          poster_path: string | null;
          backdrop_path: string | null;
          logo_path: string | null;
          cached_at: string;
        };
        Insert: {
          tmdb_id: number;
          media_type?: string;
          title: string;
          release_date?: string | null;
          poster_path?: string | null;
          backdrop_path?: string | null;
          logo_path?: string | null;
          cached_at?: string;
        };
        Update: {
          tmdb_id?: number;
          media_type?: string;
          title?: string;
          release_date?: string | null;
          poster_path?: string | null;
          backdrop_path?: string | null;
          logo_path?: string | null;
          cached_at?: string;
        };
        Relationships: [];
      };
      watched_entries: {
        Row: {
          id: string;
          user_id: string;
          movie_id: number;
          rating: number | null;
          review: string | null;
          watched_on: string;
          is_public: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          movie_id: number;
          rating?: number | null;
          review?: string | null;
          watched_on?: string;
          is_public?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          movie_id?: number;
          rating?: number | null;
          review?: string | null;
          watched_on?: string;
          is_public?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "watched_entries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "watched_entries_movie_id_fkey";
            columns: ["movie_id"];
            isOneToOne: false;
            referencedRelation: "movies";
            referencedColumns: ["tmdb_id"];
          },
        ];
      };
      watchlist_entries: {
        Row: {
          id: string;
          user_id: string;
          movie_id: number;
          is_public: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          movie_id: number;
          is_public?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          movie_id?: number;
          is_public?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "watchlist_entries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "watchlist_entries_movie_id_fkey";
            columns: ["movie_id"];
            isOneToOne: false;
            referencedRelation: "movies";
            referencedColumns: ["tmdb_id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type MovieRow = Database["public"]["Tables"]["movies"]["Row"];
export type WatchedEntryRow = Database["public"]["Tables"]["watched_entries"]["Row"];
