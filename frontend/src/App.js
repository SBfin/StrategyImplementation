import { useState, useEffect } from "react";
import Nav from "./components/nav/Nav";
import Footer from "./components/footer/Footer";
import Home from "./pages/home";
import Vault from "./pages/vault";
import "./App.scss";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

function App() {
  const [fetching, setFetching] = useState(false);

  return (
    <Router>
      <div className="App">
        <Nav />

        <Routes>
          <Route path="/vault/:vaultId" element={<Vault fetching={fetching} />} />
          <Route path="/" element={<Home />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
