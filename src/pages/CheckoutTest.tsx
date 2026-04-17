import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function CheckoutTest() {
  const { openCheckout, loading } = usePaddleCheckout();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <div className="max-w-md mx-auto p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Checkout test</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Test Plan — $9.99/month. Use card 4242 4242 4242 4242.
          </p>
        </div>
        <Button
          disabled={loading}
          onClick={() =>
            openCheckout({
              priceId: "test_monthly",
              customerEmail: user?.email,
              customData: user?.id ? { userId: user.id } : undefined,
              successUrl: `${window.location.origin}/checkout-test?success=1`,
            })
          }
          className="w-full"
        >
          {loading ? "Loading…" : "Buy Test Plan"}
        </Button>
      </div>
    </div>
  );
}
