import { Film } from "../kit/world";
import { TL } from "./timeline";
import { build, pose, Handles } from "./set";
import { stage } from "./cast";
export const FILM: Film<Handles> = { id: "emu", tl: TL, build, pose, stage, fogAdd: [80, 900] };
