import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { BrandLoader } from '@/components/common/Brand';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

// Pages that need an account (only enforced in cloud mode).
const PROTECTED_PAGES = new Set(["MyTrips", "TripView", "UserPreferences"]);

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

/** Sends signed-out visitors to the login page, then back to where they were going. */
function RequireAuth({ page, children }) {
  const { isCloud, isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isCloud || isAuthenticated || !PROTECTED_PAGES.has(page)) return children;
  const next = encodeURIComponent(location.pathname + location.search);
  return <Navigate to={`/Login?next=${next}`} replace />;
}

const AuthenticatedApp = () => {
  const { isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return <BrandLoader />;
  }

  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <RequireAuth page={path}>
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            </RequireAuth>
          }
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
