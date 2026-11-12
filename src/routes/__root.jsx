import { useEffect } from "react";
import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { DefaultCatchBoundary } from "@/components/DefaultCatchBoundary";
import { NotFound } from "@/components/NotFound";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/AuthContext";
import { Base44Scripts } from "base44:document";
import appCss from "@/index.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Notch — Walk the house. Send the quote." },
      {
        name: "description",
        content: "Quoting built for New Zealand painters and decorators. Speak room dimensions, snap photos, and send a GST-ready quote link.",
      },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Notch" },
      { name: "theme-color", content: "#F5F7FA" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  errorComponent: DefaultCatchBoundary,
  notFoundComponent: () => <NotFound />,
  shellComponent: RootDocument,
  component: RootComponent,
});

function RootComponent() {
  useEffect(() => {
    const stored = window.localStorage.getItem("notch_theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored ? stored === "dark" : prefersDark;
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  return (
    <AuthProvider>
      <Outlet />
      <Toaster position="top-center" />
    </AuthProvider>
  );
}

function RootDocument({ children }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body data-react-root="true">
        {children}
        <Base44Scripts />
        <Scripts />
      </body>
    </html>
  );
}