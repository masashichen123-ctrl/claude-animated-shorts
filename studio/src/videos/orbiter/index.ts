import { Film } from "../kit/world";
import { TL } from "./timeline";
import { build, pose, Handles } from "./set";
import { stage } from "./cast";
export const FILM: Film<Handles> = { id: "orbiter", tl: TL, build, pose, stage, fogAdd: [400, 3000], bg: "#070a1c" };
