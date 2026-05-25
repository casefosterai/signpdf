import type { Metadata, Viewport } from "next";
import "./globals.css";
import CasefosterBadge from "@/components/CasefosterBadge";

export const metadata: Metadata = {
  title: "signpdf — Quick PDF Signing",
  description:
    "Drop a PDF, sign it on your phone, download the result. No accounts, no uploads. For high-stakes contracts, use DocuSign.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "signpdf",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <CasefosterBadge slug="signpdf" />
      </body>
    </html>
  );
}
