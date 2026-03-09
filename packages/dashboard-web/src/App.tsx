import { Navigate, Route, Routes } from "react-router";
import Jobs from "./pages/Jobs.tsx";
import JobCreate from "./pages/JobCreate.tsx";
import Tournaments from "./pages/Tournaments.tsx";
import Posts from "./pages/Posts.tsx";
import PostCreate from "./pages/PostCreate.tsx";
import Images from "./pages/Images.tsx";
import Replacements from "./pages/Replacements.tsx";
import Users from "./pages/Users.tsx";
import { TopNav } from "./components/TopNav.tsx";
import { AuthProvider } from "./libs/hooks/use-auth.provider.tsx";

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen pt-12">
        <TopNav />
        <main className="mx-auto max-w-250 px-3 py-4 md:px-4 md:py-6">
          <Routes>
            <Route index element={<Navigate to="/posts" replace />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="jobs/new" element={<JobCreate />} />
            <Route path="tournaments" element={<Tournaments />} />
            <Route path="posts" element={<Posts />} />
            <Route path="posts/new" element={<PostCreate />} />
            <Route path="posts/images" element={<Images />} />
            <Route path="posts/replacements" element={<Replacements />} />
            <Route path="users" element={<Users />} />
            <Route path="*" element={<Navigate to="/posts" replace />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}
