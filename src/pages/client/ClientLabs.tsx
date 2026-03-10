import { ClientLayout } from "@/components/ClientLayout";
import { SportCommandCenter } from "@/components/sports/SportCommandCenter";

export default function ClientLabs() {
  return (
    <ClientLayout>
      <div className="p-4 space-y-4 pb-24">
        <SportCommandCenter />
      </div>
    </ClientLayout>
  );
}
