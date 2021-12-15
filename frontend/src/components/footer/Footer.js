import s from "./Footer.module.css";
import { FooterLogo, Bridge, Chat, Discord } from "../icons";

export default function Footer() {
  return (
    <div className={s.root}>
      <hr className={s.line} />
      <div className={`row ${s.row}`}>
        <FooterLogo className={`col-3 ${s.logo}`} />
        <h2 className="col-3">
          <Bridge className={s.icons} />A BRIDGE project
        </h2>
        <h2 className="col-3">
          <Chat className={s.icons} />
          Contact us
        </h2>
        <h2 className="col-3">
          <Discord className={s.icons} />
          Discord
        </h2>
      </div>
      <hr className={s.line} />
    </div>
  );
}
