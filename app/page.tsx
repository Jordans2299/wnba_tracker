import { getData } from "@/lib/data";
import HomeClient from "@/components/HomeClient";

export default async function Page() {
  const { players, teams, meta } = await getData();
  return <HomeClient players={players} teams={teams} meta={meta} />;
}
