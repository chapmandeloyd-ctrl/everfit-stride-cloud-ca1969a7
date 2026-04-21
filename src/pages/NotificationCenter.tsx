import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ComposeTab } from "@/components/notifications/ComposeTab";
import { QuickSendTab } from "@/components/notifications/QuickSendTab";
import { TemplatesTab } from "@/components/notifications/TemplatesTab";
import { HistoryTab } from "@/components/notifications/HistoryTab";
import { PushDevicesTab } from "@/components/notifications/PushDevicesTab";
import { Bell, FileText, History, Send, Smartphone, Zap } from "lucide-react";

export default function NotificationCenter() {
  const [activeTab, setActiveTab] = useState("quick");

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notification Center</h1>
            <p className="text-sm text-muted-foreground">Send emails and in-app notifications to your clients</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full max-w-2xl grid-cols-5">
            <TabsTrigger value="quick" className="flex items-center gap-1.5">
              <Zap className="h-4 w-4" />
              Quick Send
            </TabsTrigger>
            <TabsTrigger value="compose" className="flex items-center gap-1.5">
              <Send className="h-4 w-4" />
              Compose
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1.5">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="push-devices" className="flex items-center gap-1.5">
              <Smartphone className="h-4 w-4" />
              Push Devices
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quick">
            <QuickSendTab />
          </TabsContent>

          <TabsContent value="compose">
            <ComposeTab />
          </TabsContent>

          <TabsContent value="templates">
            <TemplatesTab />
          </TabsContent>

          <TabsContent value="history">
            <HistoryTab />
          </TabsContent>

          <TabsContent value="push-devices">
            <PushDevicesTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
