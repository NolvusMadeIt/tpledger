import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { FavoritesProvider } from "@/components/favorites";
import { InspectProvider } from "@/components/item-tooltip";
import { PluginHost } from "@/components/plugin-host";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

const APP_NAME = "Tyria Ledger";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "theme-color", content: "#0E0C0A" },
      {
        name: "description",
        content: "Live Guild Wars 2 Trading Post prices and vault appraisal.",
      },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/icon.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: () => (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground">
        <PreviewHostBridge />
        <AuthProvider>
          <FavoritesProvider>
            <PluginHost>
              <InspectProvider>
                <Outlet />
              </InspectProvider>
            </PluginHost>
          </FavoritesProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
