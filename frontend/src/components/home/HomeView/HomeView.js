import { HomeCard } from "../HomeCard/HomeCard";
import { HomeCardEmpty } from "../HomeCardEmpty/HomeCardEmpty";
import s from "./HomeView.module.css";

export default function HomeView(props) {
  return (
    <div className={`${s.root}`}>
      <div className={`row ${s.main}`}>
        <h1 className="col-6">
          Optimized <span>Liquidity Vaults</span> for Uniswap V3
        </h1>
        <h1 className="col-6 text-end">
          TVL: <span>$ 1000000</span>
        </h1>
      </div>
      <hr />

      <div className={`${s.scrollable}`}>
        <div className="row">
          <div className="col-4">
            <HomeCard />
          </div>
          <div className="col-4">
            <HomeCard />
          </div>
          <div className="col-4">
            <HomeCardEmpty />
          </div>
        </div>
        <div className="row">
          <div className="col-4">
            <HomeCardEmpty />
          </div>
          <div className="col-4">
            <HomeCardEmpty />
          </div>
          <div className="col-4">
            <HomeCardEmpty />
          </div>
        </div>
      </div>
    </div>
  );
}
