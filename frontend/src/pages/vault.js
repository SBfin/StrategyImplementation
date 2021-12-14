import VaultView from "../components/vault/";
import { useParams } from "react-router-dom";

const Vault = ({ props }) => {
  let { vaultId } = useParams();

  return <VaultView vaultId={vaultId} />;
};

export default Vault;
//
