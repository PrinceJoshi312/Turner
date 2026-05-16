import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import NewJob from './pages/NewJob';
import JobDetail from './pages/JobDetail';
import Evaluations from './pages/Evaluations';
import EvalDetail from './pages/EvalDetail';
import Navbar from './components/Navbar';
import { useAuthStore } from './store/authStore';

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {isAuthenticated && <Navbar />}
        <main className="flex-1">
          <Routes>
            <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
            <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />
            
            <Route path="/" element={isAuthenticated ? <Navigate to="/jobs/new" /> : <Navigate to="/login" />} />
            <Route path="/jobs/new" element={isAuthenticated ? <NewJob /> : <Navigate to="/login" />} />
            <Route path="/jobs/:jobId" element={isAuthenticated ? <JobDetail /> : <Navigate to="/login" />} />
            
            <Route path="/evaluations" element={isAuthenticated ? <Evaluations /> : <Navigate to="/login" />} />
            <Route path="/evaluations/:evalId" element={isAuthenticated ? <EvalDetail /> : <Navigate to="/login" />} />
            <Route path="/evaluations/compare" element={isAuthenticated ? <EvalDetail /> : <Navigate to="/login" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
