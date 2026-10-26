import { Link, useLocation } from "react-router";
import { APP_NAME } from "@/lib/constants";

export function PublicHeader() {
  const location = useLocation();
  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/signup";

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="container">
        <div className="flex h-16 items-center justify-between">
          <Link
            to="/"
            aria-label={`${APP_NAME} home`}
            className="flex items-center font-semibold text-lg transition-opacity hover:opacity-80"
          >
            <span className="logo-panel">
              <img
                src="/cascade-horizontal-no-tagline.png"
                alt="Cascade Web Solutions"
              />
            </span>
          </Link>

          <nav className="flex items-center gap-2">
            {isAuthPage ? null : null}
          </nav>
        </div>
      </div>
    </header>
  );
}
