import { AppProvider, useApp } from './app-state';
import { navigate, useRoute, type Route } from './router';
import { Home } from './pages/Home';
import { Drill } from './pages/Drill';
import { Judgement } from './pages/Judgement';
import { Stats } from './pages/Stats';
import { Rules } from './pages/Rules';
import { Settings } from './pages/Settings';

const NAV = [
  { path: '/', label: 'Modes' },
  { path: '/judgement', label: 'Judgement' },
  { path: '/stats', label: 'Statistics' },
  { path: '/rules', label: 'Rules' },
  { path: '/settings', label: 'Settings' },
];

export function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

function Shell() {
  const route = useRoute();
  const app = useApp();
  // A drill owns the whole screen; the nav would only invite mid-run fiddling.
  const inDrill = route.path === '/drill';

  return (
    <div className="app">
      <a className="skiplink" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <button className="brand" onClick={() => navigate('/')}>
          LING·TRAINER
          <small>SENIOR 2026</small>
        </button>
        {inDrill ? (
          <button className="navlink" onClick={() => navigate('/')}>
            ← Leave drill
          </button>
        ) : (
          NAV.map((item) => (
            <button
              key={item.path}
              className="navlink"
              aria-current={route.path === item.path}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </button>
          ))
        )}
        <span style={{ flex: 1 }} />
        {app.cubeSet.provenance === 'approximate' && !inDrill && (
          <button
            className="chip tiny"
            title={app.cubeSet.note}
            onClick={() => navigate('/settings')}
            style={{ whiteSpace: 'nowrap' }}
          >
            approximate cubes
          </button>
        )}
      </header>

      <main id="main">
        <Page route={route} />
      </main>
    </div>
  );
}

function Page({ route }: { route: Route }) {
  switch (route.path) {
    case '/drill':
      return <Drill route={route} />;
    case '/judgement':
      return <Judgement route={route} />;
    case '/stats':
      return <Stats />;
    case '/rules':
      return <Rules />;
    case '/settings':
      return <Settings />;
    default:
      return <Home />;
  }
}
