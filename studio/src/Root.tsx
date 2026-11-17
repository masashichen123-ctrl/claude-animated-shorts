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
import { FILM as sweden } from "./videos/sweden";
import { FILM as pisa } from "./videos/pisa";
import { FILM as toads } from "./videos/toads";
import { FILM as missile } from "./videos/missile";
import { FILM as stink } from "./videos/stink";

export const Root: React.FC = () => (
  <>
    <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="ScorchieShort" component={makeShort(scorchie)} durationInFrames={scorchie.tl.TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="HotelShort" component={makeShort(hotel)} durationInFrames={hotel.tl.TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="OrbiterShort" component={makeShort(orbiter)} durationInFrames={orbiter.tl.TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="EmuShort" component={makeShort(emu)} durationInFrames={emu.tl.TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="PepsiShort" component={makeShort(pepsi)} durationInFrames={pepsi.tl.TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="SwedenShort" component={makeShort(sweden)} durationInFrames={sweden.tl.TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="PisaShort" component={makeShort(pisa)} durationInFrames={pisa.tl.TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="ToadsShort" component={makeShort(toads)} durationInFrames={toads.tl.TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="MissileShort" component={makeShort(missile)} durationInFrames={missile.tl.TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="StinkShort" component={makeShort(stink)} durationInFrames={stink.tl.TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="WhaleShort" component={WhaleShort} durationInFrames={WHALE_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
