export const metadata = {
  title: "AVS Matrimony API",
  description: "Next.js API routes for AVS Matrimony",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 24 }}>{children}</body>
    </html>
  );
}
