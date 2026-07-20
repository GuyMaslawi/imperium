import { redirect } from "next/navigation";

// /game has no dashboard of its own — send players to their base so the bare
// route resolves instead of 404-ing.
export default function GameIndexPage() {
  redirect("/game/base");
}
