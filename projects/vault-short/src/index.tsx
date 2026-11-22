import React from "react";
import { Composition, registerRoot } from "remotion";
import { VaultShort, VAULT_FRAMES } from "./videos/vault/Vault";
const Root: React.FC = () => (<>
  <Composition id="VaultShort" component={VaultShort} durationInFrames={VAULT_FRAMES} fps={30} width={1080} height={1920} />
</>);
registerRoot(Root);
