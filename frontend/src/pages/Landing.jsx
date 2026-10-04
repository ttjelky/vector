import { LandingNavBar } from "@shared/components/LandingNavBar";
import { LandingBody } from "@shared/components/LandingBody";
import { LandingFooter } from "@shared/components/LandingFooter";

const Landing = () => {
  // overflow-x: clip — страховка від горизонтального скролу через
  // декоративні абсолютні елементи (стікери, слайдер hero).
  return (
    <div style={{ overflowX: "clip", width: "100%" }}>
      <LandingNavBar />
      <LandingBody />
      <LandingFooter />
    </div>

  );
};

export { Landing };