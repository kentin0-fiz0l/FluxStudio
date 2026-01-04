import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Image, Video, Music, Box } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="relative container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              <span className="gradient-text">Creative Feedback</span>
              <br />
              Made Simple
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Collaborate on images, video, audio, and 3D models with your team.
              Leave precise feedback, track revisions, and ship creative work faster.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="gap-2">
                <Link href="/auth/signup">
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/demo">
                  View Demo
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Every Creative Format</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              One platform for all your creative review needs. Support for every file type your team works with.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Image Feedback */}
            <div className="group p-6 rounded-xl bg-card border border-border hover:border-[hsl(var(--feedback-image))] transition-colors">
              <div className="w-12 h-12 rounded-lg bg-[hsl(var(--feedback-image))]/10 flex items-center justify-center mb-4">
                <Image className="h-6 w-6 text-[hsl(var(--feedback-image))]" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Images</h3>
              <p className="text-sm text-muted-foreground">
                Annotate designs, photos, and illustrations with pixel-perfect precision.
              </p>
            </div>

            {/* Video Feedback */}
            <div className="group p-6 rounded-xl bg-card border border-border hover:border-[hsl(var(--feedback-video))] transition-colors">
              <div className="w-12 h-12 rounded-lg bg-[hsl(var(--feedback-video))]/10 flex items-center justify-center mb-4">
                <Video className="h-6 w-6 text-[hsl(var(--feedback-video))]" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Video</h3>
              <p className="text-sm text-muted-foreground">
                Frame-accurate comments on video content with timecode sync.
              </p>
            </div>

            {/* Audio Feedback */}
            <div className="group p-6 rounded-xl bg-card border border-border hover:border-[hsl(var(--feedback-audio))] transition-colors">
              <div className="w-12 h-12 rounded-lg bg-[hsl(var(--feedback-audio))]/10 flex items-center justify-center mb-4">
                <Music className="h-6 w-6 text-[hsl(var(--feedback-audio))]" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Audio</h3>
              <p className="text-sm text-muted-foreground">
                Review music, podcasts, and sound design with waveform annotations.
              </p>
            </div>

            {/* 3D Model Feedback */}
            <div className="group p-6 rounded-xl bg-card border border-border hover:border-[hsl(var(--feedback-3d))] transition-colors">
              <div className="w-12 h-12 rounded-lg bg-[hsl(var(--feedback-3d))]/10 flex items-center justify-center mb-4">
                <Box className="h-6 w-6 text-[hsl(var(--feedback-3d))]" />
              </div>
              <h3 className="text-lg font-semibold mb-2">3D Models</h3>
              <p className="text-sm text-muted-foreground">
                Explore and annotate 3D assets in an interactive viewer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to streamline your creative workflow?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands of creative teams using FluxStudio to ship better work, faster.
          </p>
          <Button asChild size="lg">
            <Link href="/auth/signup">
              Start Your Free Trial
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
