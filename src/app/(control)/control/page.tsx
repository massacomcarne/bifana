import { ControlBoard } from "@/components/control/control-board";
import { getTimersSnapshot } from "@/lib/timers/repository";

export default async function ControlPage() {
  const initialSnapshot = await getTimersSnapshot();

  return <ControlBoard initialSnapshot={initialSnapshot} />;
}
