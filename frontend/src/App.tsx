import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClosetPage } from "./pages/ClosetPage";
import { HomePage } from "./pages/HomePage";
import { QuizPage } from "./pages/QuizPage";
import "./index.css";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/quiz/:sessionId" element={<QuizPage />} />
          <Route path="/closet" element={<ClosetPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
