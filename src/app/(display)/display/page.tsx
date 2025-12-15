import { DisplayBoard } from "@/components/display/display-board";
import { getTimersSnapshot } from "@/lib/timers/repository";

export default async function DisplayPage() {
  const initialSnapshot = await getTimersSnapshot();

  return <DisplayBoard initialSnapshot={initialSnapshot} />;
}
