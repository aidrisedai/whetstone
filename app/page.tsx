import { WhetstoneApp } from "@/components/WhetstoneApp";
import { isDemoMode } from "@/lib/anthropic";
import { activeBuilder } from "@/lib/builders";
import { DEFAULT_THRESHOLD } from "@/lib/scoring";

// Demo mode and the connected builder are resolved from the environment at
// request time, so this page must render dynamically.
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <WhetstoneApp
      demo={isDemoMode()}
      threshold={DEFAULT_THRESHOLD}
      builderName={activeBuilder().name}
    />
  );
}
