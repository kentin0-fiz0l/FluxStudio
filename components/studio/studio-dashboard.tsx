'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { User } from '@supabase/supabase-js';
import type { Project } from '@/types/database';
import {
  Image,
  Video,
  Music,
  Box,
  Plus,
  ArrowRight,
  FolderKanban,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

interface StudioDashboardProps {
  user: User;
  projects: Project[];
}

export function StudioDashboard({ user, projects }: StudioDashboardProps) {
  const firstName = user.user_metadata?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {firstName}</h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your projects
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="group cursor-pointer hover:border-[hsl(var(--feedback-image))] transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-[hsl(var(--feedback-image))]/10 flex items-center justify-center">
                <Image className="h-5 w-5 text-[hsl(var(--feedback-image))]" />
              </div>
              <Plus className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-base">Image Review</CardTitle>
            <CardDescription className="text-sm">
              Upload images for feedback
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="group cursor-pointer hover:border-[hsl(var(--feedback-video))] transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-[hsl(var(--feedback-video))]/10 flex items-center justify-center">
                <Video className="h-5 w-5 text-[hsl(var(--feedback-video))]" />
              </div>
              <Plus className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-base">Video Review</CardTitle>
            <CardDescription className="text-sm">
              Upload videos for feedback
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="group cursor-pointer hover:border-[hsl(var(--feedback-audio))] transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-[hsl(var(--feedback-audio))]/10 flex items-center justify-center">
                <Music className="h-5 w-5 text-[hsl(var(--feedback-audio))]" />
              </div>
              <Plus className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-base">Audio Review</CardTitle>
            <CardDescription className="text-sm">
              Upload audio for feedback
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="group cursor-pointer hover:border-[hsl(var(--feedback-3d))] transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-[hsl(var(--feedback-3d))]/10 flex items-center justify-center">
                <Box className="h-5 w-5 text-[hsl(var(--feedback-3d))]" />
              </div>
              <Plus className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-base">3D Model Review</CardTitle>
            <CardDescription className="text-sm">
              Upload 3D models for feedback
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Recent projects */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Projects</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/studio/projects" className="gap-2">
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {projects.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No projects yet</h3>
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
                Create your first project to start collecting feedback on your creative work.
              </p>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Card key={project.id} className="group hover:border-primary/50 transition-colors">
                <CardHeader>
                  <CardTitle className="text-base">{project.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {project.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatRelativeTime(project.updated_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      0 comments
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
