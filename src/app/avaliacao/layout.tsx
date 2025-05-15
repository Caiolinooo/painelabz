export default function AvaliacaoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Simplificando completamente - sem verificações de autenticação no layout
  // Isso permite que o conteúdo seja renderizado e as verificações de autenticação
  // serão feitas nas páginas individuais
  return <>{children}</>;
}
