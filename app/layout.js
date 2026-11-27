import "./globals.css";

export const metadata = {
  title: "Classroom Lost & Found Board",
  description: "Report and browse lost or found items in class",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
