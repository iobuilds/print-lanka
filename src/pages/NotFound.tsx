import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import logo from "../assets/logo.png";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="text-center max-w-md">
        <img
          src={logo}
          alt="App Logo"
          className="mx-auto mb-6 h-16 w-auto opacity-90"
        />

        <h1 className="mb-2 text-5xl font-extrabold tracking-tight">404</h1>

        <p className="mb-6 text-lg text-muted-foreground">
          Oops! The page you’re looking for doesn’t exist or has been moved.
        </p>

        <a
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Go back home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
