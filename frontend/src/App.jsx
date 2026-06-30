import React from "react";
import AppRoutes from "./routes/AppRoutes";
import RuntimeAlbanianTranslator from "./components/RuntimeAlbanianTranslator";
import "./styles/ui.css";
import "./styles/theme.css";

function App() {
  return (
    <>
      <RuntimeAlbanianTranslator />
      <AppRoutes />
    </>
  );
}

export default App;
