export function Unavailable({ href }: { href: string }) {
  return (
    <>
      <h1>Galerie je dočasně nedostupná</h1>
      <a href={href}>Zkusit znovu</a>
    </>
  );
}
