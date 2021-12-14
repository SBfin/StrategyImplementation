import s from "./HomeCardEmpty.module.css";

export default function HomeCardEmpty(props) {
  return (
    <div className={`card ${s.root}`}>
      <div className={`${s.body}`}>
        <p>More vaults coming soon</p>
      </div>
    </div>
  );
}
