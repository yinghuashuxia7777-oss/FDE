import { type MouseEvent, useRef } from 'react';
import { HashRouter, NavLink } from 'react-router-dom';

export function App() {
  const mainRef = useRef<HTMLElement>(null);

  const focusMain = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    mainRef.current?.focus();
  };

  return (
    <HashRouter>
      <a className="skip-link" href="#main-content" onClick={focusMain}>
        Skip to main content
      </a>
      <header className="site-header">
        <NavLink className="site-brand" to="/" aria-label="FDE Arena home">
          FDE Arena
        </NavLink>
        <nav aria-label="Primary navigation">
          <NavLink to="/">Practice</NavLink>
        </nav>
      </header>
      <main
        ref={mainRef}
        id="main-content"
        aria-labelledby="app-title"
        tabIndex={-1}
      >
        <div className="hero">
          <p className="eyebrow">Front-end practice, focused</p>
          <h1 id="app-title">FDE Arena</h1>
          <p className="hero-copy">
            Build confidence through deliberate, accessible front-end exercises.
          </p>
        </div>
      </main>
    </HashRouter>
  );
}
