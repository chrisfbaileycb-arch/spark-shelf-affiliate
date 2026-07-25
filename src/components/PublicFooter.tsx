import { Link } from "@tanstack/react-router";

export function PublicFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Signal F Holdings LLC. ReelRipper is a product of Signal F Holdings LLC.</p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <Link to="/how-it-works" className="hover:text-foreground">How it works</Link>
          <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link to="/guides" className="hover:text-foreground">Guides</Link>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link to="/cookies" className="hover:text-foreground">Cookies</Link>
          <Link to="/refunds" className="hover:text-foreground">Refunds</Link>
          <Link to="/affiliate-disclosure" className="hover:text-foreground">Affiliate disclosure</Link>
        </nav>
      </div>
    </footer>
  );
}
