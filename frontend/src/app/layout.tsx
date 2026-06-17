import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "داشبورد فروش طلا",
  description: "محاسبه قیمت و صدور فاکتور فروش طلا"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
