import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/ui/Layout';
import WarRoom from './pages/WarRoom';
import Screener from './pages/Screener';
import DeepDive from './pages/DeepDive';
import DeepDiveDefault from './pages/DeepDiveDefault';
import Archive from './pages/Archive';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000, // 1 minute
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<WarRoom />} />
            <Route path="/screener" element={<Screener />} />
            <Route path="/deep-dive" element={<DeepDiveDefault />} />
            <Route path="/deep-dive/:ticker" element={<DeepDive />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
