import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function PublicNav() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
      <Link to="/" className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-brand text-primary-foreground shadow-pop">
          <Sparkles className="h-5 w-5" />
        </div>
        <span className="font-display text-xl font-semibold tracking-tight">ReelRipper</span>
      </Link>
      <nav className="flex items-center gap-1 md:gap-2">
        <Link to="/how-it-works" className="hidden rounded-full px-3 py-2 text-sm font-medium text-foreground/70 hover:text-foreground md:inline">How it works</Link>
        <Link to="/pricing" className="hidden rounded-full px-3 py-2 text-sm font-medium text-foreground/70 hover:text-foreground md:inline">Pricing</Link>
        <Link to="/guides" className="hidden rounded-full px-3 py-2 text-sm font-medium text-foreground/70 hover:text-foreground md:inline">Guides</Link>
        <Link to="/auth" className="rounded-full px-3 py-2 text-sm font-medium text-foreground/70 hover:text-foreground">Sign in</Link>
        <Link to="/auth" className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90">Get started</Link>
      </nav>
    </header>
  );
}
