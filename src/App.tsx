import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Profiles from "./pages/Profiles";
import ProfileDetail from "./pages/ProfileDetail";
import ProfileNew from "./pages/ProfileNew";
import MyProfile from "./pages/MyProfile";
import MasterTasks from "./pages/MasterTasks";
import MasterProducts from "./pages/MasterProducts";
import Developers from "./pages/Developers";
import SubSectors from "./pages/SubSectors";
import ImportPage from "./pages/Import";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profiles" element={<Profiles />} />
              <Route path="/profiles/new" element={<ProfileNew />} />
              <Route path="/profiles/:id" element={<ProfileDetail />} />
              <Route path="/me" element={<MyProfile />} />
              <Route path="/master-tasks" element={<ProtectedRoute allow={["admin"]}><MasterTasks /></ProtectedRoute>} />
              <Route path="/master-products" element={<ProtectedRoute allow={["admin"]}><MasterProducts /></ProtectedRoute>} />
              <Route path="/developers" element={<ProtectedRoute allow={["admin"]}><Developers /></ProtectedRoute>} />
              <Route path="/sub-sectors" element={<ProtectedRoute allow={["admin"]}><SubSectors /></ProtectedRoute>} />
              <Route path="/import" element={<ProtectedRoute allow={["admin"]}><ImportPage /></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
