import s from "./HomeCard.module.css";

export function HomeCard(props) {
  return (
    <div className={`card ${s.root}`}>
      <div className={`card-body ${s.body}`}>
        <p>
          state: <span>ACTIVE</span>
        </p>
        <hr />
        <h5 className="card-title">WETH / DAI</h5>
        <hr className="mb-3" />
        <h6 className="card-subtitle mb-2">TVL</h6>
        <h4 className="card-text mb-3">$ 1400000</h4>
        <h6 className="card-subtitle mb-2">Cap used</h6>
        <h4 className="card-text">99.9%</h4>
      </div>
    </div>
  );
}
