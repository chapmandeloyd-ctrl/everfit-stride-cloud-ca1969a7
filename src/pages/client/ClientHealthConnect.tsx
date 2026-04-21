import { useEffect, useState } from 'react';
import { ClientLayout } from '@/components/ClientLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Heart, Info, Shield, Smartphone, CheckCircle2, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNativeHealth } from '@/hooks/useNativeHealth';
import { useHealthConnections } from '@/hooks/useHealthData';
import { toast } from 'sonner';

export default function ClientHealthConnect() {
  const { isNative, permissionGranted, requestPermissions } = useNativeHealth();
  const { data: connections = [] } = useHealthConnections();
  const [isConnecting, setIsConnecting] = useState(false);
  const isConnected =
    permissionGranted ||
    connections.some((connection) => connection.provider === 'apple_health' && connection.is_connected);

  useEffect(() => {
    if (isConnected) {
      setIsConnecting(false);
    }
  }, [isConnected]);

  const handleConnectTap = async () => {
    if (isConnecting) return;

    toast.info('Requesting Apple Health access — please allow on the popup...', { id: 'apple-health-request' });
    setIsConnecting(true);

    const releaseUiTimer = window.setTimeout(() => {
      setIsConnecting(false);
    }, 4000);

    void requestPermissions()
      .catch((err: any) => {
        console.error('[HealthConnect] Error:', err);
        toast.error(`Connection failed: ${err?.message || 'Unknown error'}`, {
          id: 'apple-health-request',
        });
      })
      .finally(() => {
        window.clearTimeout(releaseUiTimer);
        setIsConnecting(false);
      });
  };

  const statusLabel = !isNative
    ? 'Mobile App Required'
    : isConnected
      ? 'Connected'
      : 'Not Connected';

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Connect Health App</h1>
          <p className="text-muted-foreground">
            Sync your wearable device data to track your progress automatically
          </p>
        </div>

        {!isNative && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Mobile App Required</AlertTitle>
            <AlertDescription>
              Health sync requires the mobile app. Open this page inside your iPhone app to connect Apple Health.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary/10 p-3">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Apple Health</CardTitle>
                  <CardDescription>
                    Sync heart rate, calories, steps, sleep, and workouts from your Apple Watch or iPhone.
                  </CardDescription>
                </div>
              </div>
              <Badge variant={isConnected ? 'default' : 'secondary'}>
                {isConnected ? (
                  <>
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    {statusLabel}
                  </>
                ) : (
                  <>
                    <XCircle className="mr-1 h-3 w-3" />
                    {statusLabel}
                  </>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isNative ? (
              <p className="text-sm text-muted-foreground">
                Apple Health connection only works inside the native iPhone app.
              </p>
            ) : isConnected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Smartphone className="h-4 w-4 text-primary" />
                  Apple Health access is active and your data can sync automatically.
                </div>
                <Button className="w-full" disabled>
                  Apple Health Connected
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                className="w-full"
                  onClick={() => void handleConnectTap()}
                  disabled={isConnecting}
              >
                  {isConnecting ? 'Connecting...' : 'Connect Apple Health'}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Your Privacy</CardTitle>
            </div>
            <CardDescription>
              We take your health data privacy seriously
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Activity className="mt-0.5 h-4 w-4 text-primary" />
                <span>Your trainer can view your health metrics to optimize your training program</span>
              </li>
              <li className="flex items-start gap-2">
                <Activity className="mt-0.5 h-4 w-4 text-primary" />
                <span>Data is synced securely and encrypted during transfer</span>
              </li>
              <li className="flex items-start gap-2">
                <Activity className="mt-0.5 h-4 w-4 text-primary" />
                <span>You can disconnect at any time to stop sharing data</span>
              </li>
              <li className="flex items-start gap-2">
                <Activity className="mt-0.5 h-4 w-4 text-primary" />
                <span>We only access the specific health metrics you approve</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What Data Gets Synced?</CardTitle>
            <CardDescription>
              The following health metrics will be shared with your trainer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium">Activity Data</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Daily step count</li>
                  <li>• Active energy burned</li>
                  <li>• Resting energy (basal metabolic)</li>
                  <li>• Workouts from your watch</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Health Metrics</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Heart rate</li>
                  <li>• Sleep duration</li>
                  <li>• Weight</li>
                  <li>• Calories burned</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
