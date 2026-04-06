export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center bg-muted">
      {children}
    </main>
  );
}
