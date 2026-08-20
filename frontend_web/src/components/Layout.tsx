import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';

export function Layout({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="min-h-screen bg-void">
      <Sidebar />
      <div className="flex min-h-screen flex-col lg:ml-64">
        <TopBar title={title} />
        <div className="relative h-6 w-full overflow-hidden border-b border-outline-variant/20 bg-surface-container-lowest">
          <div className="pulse-line absolute left-0 top-1/2 -translate-y-1/2" />
        </div>
        <main className="flex flex-grow flex-col gap-6 p-4 pb-24 md:p-6 lg:pb-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
