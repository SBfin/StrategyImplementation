import s from "./HomeCard.module.css";
import { Link } from "react-router-dom";
import Loader from "../../loader/Loader";
import { truncateNumber, getSymbolToken } from "../../common/helpers";

export function HomeCard(props) {
  const { tokenData, tokensDetails } = props;

  const symbolToken0 = getSymbolToken(true, tokenData?.token0);
  const symbolToken1 = getSymbolToken(true, tokenData?.token1);

  return (
    <div className={`card ${s.root}`}>
      {tokenData ? (
        <Link to={"vault/" + tokenData.vault} className="text-decoration-none">
          <div className={`card-body ${s.body}`}>
            <p>
              state: <span>ACTIVE</span>
            </p>
            <hr />
            <h5 className="card-title">
              {symbolToken0} / {symbolToken1}
            </h5>
            <hr className="mb-3" />
            <h6 className="card-subtitle mb-2">TVL</h6>
            <h4 className="card-text mb-3">$ {tokensDetails && truncateNumber(tokensDetails.tvl, 2)}</h4>
            <h6 className="card-subtitle mb-2">Cap used</h6>
            <h4 className="card-text">{tokensDetails && truncateNumber(tokensDetails.cap, 2)}%</h4>
          </div>
        </Link>
      ) : (
        <Loader />
      )}
    </div>
  );
}
