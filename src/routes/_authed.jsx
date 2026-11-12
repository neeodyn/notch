import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AuthGateError, requireSignedIn } from "@/components/auth/AuthGate";
import AppNavigation from "@/components/notch/AppNavigation";

export const Route = createFileRoute("/_authed")({
  ssr: false,
  beforeLoad: requireSignedIn,
  errorComponent: AuthGateError,
  component: () => <div className="premium-app"><AppNavigation /><Outlet /></div>,
});