import React from "react";
import { Composition } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import { WhaleShort, WHALE_FRAMES } from "./videos/whale/Whale";
import { makeShort } from "./videos/kit/Short";
import { FILM as scorchie } from "./videos/scorchie";
import { FILM as hotel } from "./videos/hotel";
import { FILM as orbiter } from "./videos/orbiter";
import { FILM as emu } from "./videos/emu";
import { FILM as pepsi } from "./videos/pepsi";

export const Root: React.FC = () => (
  <>
    <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="ScorchieShort" component={makeShort(scorchie)} durationInFrames={scorchie.tl.TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="HotelShort" component={makeShort(hotel)} durationInFrames={hotel.tl.TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="OrbiterShort" component={makeShort(orbiter)} durationInFrames={orbiter.tl.TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="EmuShort" component={makeShort(emu)} durationInFrames={emu.tl.TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="PepsiShort" component={makeShort(pepsi)} durationInFrames={pepsi.tl.TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="WhaleShort" component={WhaleShort} durationInFrames={WHALE_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
