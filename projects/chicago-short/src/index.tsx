import React from "react";
import { Composition, registerRoot } from "remotion";
import { ChicagoShort, CHICAGO_FRAMES } from "./videos/chicago/Chicago";
const Root: React.FC = () => (<>
  <Composition id="ChicagoShort" component={ChicagoShort} durationInFrames={CHICAGO_FRAMES} fps={30} width={1080} height={1920} />
</>);
registerRoot(Root);
