import Navbar from "@/components/Navbar";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="overflow-x-hidden bg-slate-100 text-slate-900">
        <div className="mx-auto w-full max-w-md min-h-screen overflow-x-hidden bg-white">
          <Navbar />
          <main className="overflow-x-hidden pt-14">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}