import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/AuthContext";

/**
 * A "start your trial" call to action. New visitors go straight to sign-up and
 * land in the app afterwards; a painter who is already signed in goes to their quotes.
 */
export default function StartLink({ className, children, trailing, signedInLabel = "Open my quotes", onClick }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Link to="/app" className={className} onClick={onClick}>{signedInLabel}{trailing}</Link>;
  }
  return <Link to="/register" search={{ returnTo: "/app" }} className={className} onClick={onClick}>{children}{trailing}</Link>;
}