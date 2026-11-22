import React from "react";
import { Composition, registerRoot } from "remotion";
import { WhaleShort, WHALE_FRAMES } from "./videos/whale/Whale";
const Root: React.FC = () => (<>
  <Composition id="WhaleShort" component={WhaleShort} durationInFrames={WHALE_FRAMES} fps={30} width={1080} height={1920} />
</>);
registerRoot(Root);
