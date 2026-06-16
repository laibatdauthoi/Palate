import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MobileBottomNav } from "@/components/mobile_bottom_nav";
import { NavigationBar } from "@/components/navigation_bar";
import { RouteBackground } from "@/components/route_background";
import { WelcomeIntro } from "@/components/welcome_intro";
import { MediaPlayerProvider } from "@/providers/media_player_provider";
import { PalateProvider } from "@/providers/palate_provider";
import { WalletProvider } from "@/providers/wallet_provider";
import "@fontsource-variable/fredoka";
import "@/styles/globals.css";

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
        <WalletProvider>
          <PalateProvider>
            <MediaPlayerProvider>
              <WelcomeIntro />
              <div className="app_shell">
                <RouteBackground />
                <NavigationBar />
                <main className="main_content">{children}</main>
                <MobileBottomNav />
              </div>
            </MediaPlayerProvider>
          </PalateProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
