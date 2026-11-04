import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Laço — Sempre por perto",
  description: "O seu círculo de cuidado. Gestão familiar e localização partilhada.",
  icons: {
    icon: "/assets/laco-icon.png",
    shortcut: "/assets/laco-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-PT">
      <body className="antialiased">{children}</body>
    </html>
  );
}
