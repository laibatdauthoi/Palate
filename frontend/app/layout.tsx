import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LayoutScaleController } from "@/components/layout_scale_controller";
import { MobileBottomNav } from "@/components/mobile_bottom_nav";
import { BrandRegion, NavigationRegion, WalletRegion } from "@/components/navigation_bar";
import { RoutePerfTracker } from "@/components/route_perf_tracker";
import { MediaViewerProvider } from "@/providers/media_viewer_provider";
import { MediaPlayerProvider } from "@/providers/media_player_provider";
import { PalateProvider } from "@/providers/palate_provider";
import { WalletProvider } from "@/providers/wallet_provider";
import "@fontsource-variable/fredoka";
import "@/styles/globals.css";
import "@/styles/primitives.css";
import "@/styles/layout.css";
import "@/styles/buttons.css";
import "@/styles/filter-bar.css";
import "@/styles/badges.css";
import "@/styles/cards.css";
import "@/styles/modal.css";
import "@/styles/media-renderer.css";
import "@/styles/waiting-push.css";
import "@/styles/match-card.css";
import "@/styles/wallet.css";
import "@/styles/navigation.css";
import "@/styles/pages/home.css";
import "@/styles/pages/content.css";

export const metadata: Metadata = {
  title: "Palate",
  description: "A premium media game where users Push media and Buff random matches.",
  icons: {
    icon: "/brand/favicon.png"
  }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <LayoutScaleController />
        <WalletProvider>
          <PalateProvider>
            <MediaPlayerProvider>
              <MediaViewerProvider>
                <div className="app_shell">
                  <RoutePerfTracker />
                  <BrandRegion />
                  <NavigationRegion />
                  <main className="main_content">{children}</main>
                  <WalletRegion />
                  <MobileBottomNav />
                </div>
              </MediaViewerProvider>
            </MediaPlayerProvider>
          </PalateProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
