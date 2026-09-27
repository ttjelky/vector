import { useParams } from "react-router-dom";
import { Profile } from "./Profile";

// Чужий профіль — та сама сторінка, що й «Мій профіль»,
// але без редагування, виходу та особистих деталей.
export function UserProfile() {
  const { userId } = useParams();
  return <Profile userId={userId} />;
}
