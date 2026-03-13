import Navbar from "@/components/Navbar";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="overflow-x-hidden text-white">
        <div className="mx-auto max-w-md min-h-screen px-4">
          <Navbar />
          <main className="overflow-x-hidden pb-28 pt-4">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}