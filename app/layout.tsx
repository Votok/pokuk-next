import "./style.css";
export const metadata = { title: "Pokuk" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="cs"><body><main>{children}</main></body></html>;
}
