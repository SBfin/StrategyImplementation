import { useState, useEffect } from "react";
import Nav from "./components/nav/Nav";
import Footer from "./components/footer/Footer";
import VaultView from "./components/vault";
import HomeView from "./components/home";
import "./App.scss";

function App() {
  const [fetching, setFetching] = useState(false);

  return (
    <div className="App">
      <Nav />
      <VaultView fetching={fetching} />

      <HomeView />
      <Footer />
    </div>
  );
}

export default App;
