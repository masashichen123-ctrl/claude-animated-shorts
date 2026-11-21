import React from "react";
import { Composition, registerRoot } from "remotion";
import { BatShort, BAT_FRAMES } from "./videos/bat/Bat";
const Root: React.FC = () => (<>
  <Composition id="BatShort" component={BatShort} durationInFrames={BAT_FRAMES} fps={30} width={1080} height={1920} />
</>);
registerRoot(Root);
