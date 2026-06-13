import { mock_stats } from "@/data/mock_data";
import { ActionButton } from "./action_button";

export function WalletPanel() {
  return (
    <aside className="wallet_panel">
      <div>
        <span className="eyebrow">Wallet</span>
        <strong>{mock_stats.wallet}</strong>
      </div>
      <div className="wallet_balance">
        <span>Palate Balance</span>
        <strong>{mock_stats.availableBalance}</strong>
      </div>
      <ActionButton variant="secondary">Mock Wallet</ActionButton>
    </aside>
  );
}
