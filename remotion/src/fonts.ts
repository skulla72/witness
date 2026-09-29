import { loadFont as loadSora } from "@remotion/google-fonts/Sora";
import { loadFont as loadManrope } from "@remotion/google-fonts/Manrope";

const sora = loadSora("normal", { weights: ["300", "400", "600"], subsets: ["latin"] });
const manrope = loadManrope("normal", { weights: ["300", "400", "500"], subsets: ["latin"] });

export const DISPLAY_FONT = sora.fontFamily;
export const BODY_FONT = manrope.fontFamily;
