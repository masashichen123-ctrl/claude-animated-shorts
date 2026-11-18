import React from "react";
import { Composition, registerRoot } from "remotion";
import { MissileShort, MISSILE_FRAMES } from "../../videos/missile_post/Missile";
const Root: React.FC = () => <Composition id="MissileShort" component={MissileShort} durationInFrames={MISSILE_FRAMES} fps={30} width={1080} height={1920} />;
registerRoot(Root);
