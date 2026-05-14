import { LandingNavBar } from "@shared/components/LandingNavBar";
import { LandingBody } from "@shared/components/LandingBody";
import { LandingFooter } from "@shared/components/LandingFooter";

const Landing = () => {
  return (
    <div>
      <LandingNavBar />
      <LandingBody />
      <LandingFooter />
    </div>

  );
};

export { Landing };