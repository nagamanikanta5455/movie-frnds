import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAnonAuth } from '@/features/auth/useAnonAuth';
import { Landing } from '@/features/room/Landing';
import { Lobby } from '@/features/room/Lobby'; // <-- Import added

export default function App() {
  const { loading } = useAnonAuth();

  if (loading) {
    return <div className="grid min-h-screen place-items-center">Loading...</div>;
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Landing />} />
        {/* Wire up the Lobby route */}
        <Route path="/r/:roomId" element={<Lobby />} />
      </Routes>
    </BrowserRouter>
  );
}