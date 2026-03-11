import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import type { Profile } from "@/hooks/useAuth";

interface AppLayoutProps {
  profile: Profile;
  onSignOut: () => void;
}

export function AppLayout({ profile, onSignOut }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar profile={profile} onSignOut={onSignOut} />
      <main className="flex-1 ml-64">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
