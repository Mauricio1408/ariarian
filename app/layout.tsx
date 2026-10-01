import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import { Toaster } from "@/components/ui/overlay";
import "./globals.css";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-hanken",
});

export const metadata: Metadata = {
  title: "AriArian — Asset Lifecycle Management",
  description:
    "Interactive prototype of AriArian, asset lifecycle management for DOST and partner agencies: " +
    "registry, custodianship, maintenance triage, and COA-compliant property forms.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {process.env.NODE_ENV === "development" && (
          // Dev only: a hidden preview pane pauses requestAnimationFrame, which stalls Motion.
          <script dangerouslySetInnerHTML={{ __html: "if(document.hidden){window.requestAnimationFrame=function(cb){return setTimeout(function(){cb(performance.now())},16)};window.cancelAnimationFrame=clearTimeout;}" }} />
        )}
      </head>
      <body className={`${hanken.variable} font-sans antialiased`}>
        <StoreProvider>
          {children}
          <Toaster />
        </StoreProvider>
      </body>
    </html>
  );
}
