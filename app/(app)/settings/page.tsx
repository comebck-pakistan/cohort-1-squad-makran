import { RateHistoryScreen } from "@/features/settings/RateHistoryScreen";
import { getRateHistory } from "@/lib/actions/rates";

export default async function SettingsPage() {
  const rates = await getRateHistory();
  return <RateHistoryScreen initialRates={rates} />;
}
