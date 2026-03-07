import { Navigate, Route, Routes } from "react-router";
import Jobs from "./pages/Jobs.tsx";
import { TopNav } from "./components/TopNav.tsx";

export default function App() {
  return (
    <div className="min-h-screen pt-12">
      <TopNav />
      <main className="mx-auto max-w-250 px-4 py-6">
        <Routes>
          <Route index element={<Navigate to="/jobs" replace />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="*" element={<Navigate to="/jobs" replace />} />
        </Routes>
      </main>
    </div>
  );
}
