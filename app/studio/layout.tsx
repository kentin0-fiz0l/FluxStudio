import { StudioNav } from '@/components/studio/studio-nav';

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <StudioNav />
      <main className="flex-1">{children}</main>
    </div>
  );
}
