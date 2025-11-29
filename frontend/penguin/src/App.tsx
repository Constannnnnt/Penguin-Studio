import { ThemeProvider, IDELayout, ErrorBoundary } from "@/shared/components";
import { Toaster } from "@/shared/components/ui/sonner";
import "./App.css";

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <div className="h-screen w-full overflow-hidden bg-background text-foreground">
          <IDELayout />
          <Toaster />
        </div>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
