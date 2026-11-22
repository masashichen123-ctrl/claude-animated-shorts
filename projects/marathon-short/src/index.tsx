import React from "react";
import { Composition, registerRoot } from "remotion";
import { MarathonShort, MARATHON_FRAMES } from "./videos/marathon/Marathon";
const Root: React.FC = () => (<>
  <Composition id="MarathonShort" component={MarathonShort} durationInFrames={MARATHON_FRAMES} fps={30} width={1080} height={1920} />
</>);
registerRoot(Root);
