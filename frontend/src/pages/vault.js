import Main from "../components/vault/Main";
import { useParams } from "react-router-dom";

const Vault = ({ props }) => {
  let { vaultId } = useParams();

  return <Main vaultId={vaultId} />;
};

export default Vault;
