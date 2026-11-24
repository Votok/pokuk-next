import "./style.css";

export const metadata = { title: "Pokuk" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body>
        <main data-gallery-revision={process.env.CONTAINER_APP_REVISION}>{children}</main>
      </body>
    </html>
  );
}
