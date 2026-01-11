import type { Metadata } from "next";
import SettingsProvider from "@/components/desktop/SettingsProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ethfolio",
  description: "Personal ETH portfolio tracker",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="app-body">
        <SettingsProvider>{children}</SettingsProvider>
      </body>
    </html>
  );
}
