import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MobileBottomNav } from "@/components/mobile_bottom_nav";
import { NavigationBar } from "@/components/navigation_bar";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Palate",
  description: "A premium media game where users Push media and Buff random matches."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="app_shell">
          <NavigationBar />
          <main className="main_content">{children}</main>
          <MobileBottomNav />
        </div>
      </body>
    </html>
  );
}
