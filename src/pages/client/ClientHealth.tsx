import { ClientLayout } from '@/components/ClientLayout';
import { ActivitySummary } from '@/components/health/ActivitySummary';
import { useEffectiveClientId } from '@/hooks/useEffectiveClientId';
import { Settings, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useNativeHealth } from '@/hooks/useNativeHealth';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useCallback, useRef, useState, type MouseEvent } from 'react';

export default function ClientHealth() {
  const effectiveClientId = useEffectiveClientId();
  const { isNative, permissionGranted, requestPermissions } = useNativeHealth();
  const [connecting, setConnecting] = useState(false);
  const lastTapRef = useRef(0);
  const connectInFlightRef = useRef(false);

  const handleConnect = useCallback(async () => {
    if (connectInFlightRef.current) return;

    connectInFlightRef.current = true;
    setConnecting(true);
    console.log('[HealthConnect] Tap received — waiting for iOS permission sheet...');
    toast.info('Requesting Apple Health access — please allow on the popup...', { id: 'apple-health-request' });

    try {
      // No timeout race — let native iOS complete naturally (up to 60s)
      const result = await requestPermissions();

      if (!result) {
        toast.error('Permission denied — open Settings > Privacy > Health to enable', {
          id: 'apple-health-request',
        });
      } else {
        toast.success('Apple Health connected!', { id: 'apple-health-request' });
      }
    } catch (err: any) {
      console.error('[HealthConnect] Error:', err);
      toast.error(`Connection failed: ${err?.message || 'Unknown error'}`, {
        id: 'apple-health-request',
      });
    } finally {
      connectInFlightRef.current = false;
      setConnecting(false);
    }
  }, [requestPermissions]);

  const handleConnectTap = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();

      const now = Date.now();
      if (connecting || connectInFlightRef.current || now - lastTapRef.current < 700) return;

      lastTapRef.current = now;
      void handleConnect();
    },
    [connecting, handleConnect],
  );

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Health Dashboard</h1>
              <p className="text-muted-foreground">
                Track your health metrics and activity
              </p>
            </div>
            {isNative && permissionGranted && (
              <Badge variant="outline" className="mt-1 gap-1 text-xs border-green-500 text-green-600">
                <Smartphone className="h-3 w-3" />
                Live
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isNative && !permissionGranted ? (
              <Button
                type="button"
                variant="default"
                onClick={handleConnectTap}
                disabled={connecting}
                className="min-h-12 touch-manipulation select-none relative z-10"
              >
                <Smartphone className="h-4 w-4 mr-2" />
                {connecting ? 'Connecting...' : 'Connect Apple Health'}
              </Button>
            ) : (
              <Button variant="outline" asChild>
                <Link to="/client/health-connect">
                  <Settings className="h-4 w-4 mr-2" />
                  Health Settings
                </Link>
              </Button>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Today's Summary</h2>
          <ActivitySummary clientId={effectiveClientId} />
        </div>
      </div>
    </ClientLayout>
  );
}
