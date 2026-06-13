import { ActionButton } from "@/components/action_button";
import { MatchCard } from "@/components/match_card";
import { SectionPanel } from "@/components/section_panel";
import { mock_matches, mock_stats } from "@/data/mock_data";

const stat_cards = [
  { label: "Active matches", value: "24" },
  { label: "Pending Buffs", value: mock_stats.pendingBuffs },
  { label: "Claimable", value: mock_stats.claimableAmount },
  { label: "Palate Balance", value: mock_stats.availableBalance }
];

export default function HomePage() {
  return (
    <div className="page_stack">
      <section className="home_hero">
        <div className="stack">
          <span className="eyebrow">Palate Lobby</span>
          <h1 className="hero_title">Buff is the signal. Media is the weapon.</h1>
          <p className="hero_copy">
            Enter a random active match, choose the side that deserves to win, and keep live score, pools, and direction hidden until settlement.
          </p>
          <div className="cluster">
            <ActionButton href="/buff">Buff Random Match</ActionButton>
            <ActionButton href="/my-media/upload" variant="secondary">Upload Media</ActionButton>
            <ActionButton href="/push" variant="secondary">Push Media</ActionButton>
          </div>
          <p className="mock_note">Temporary mock data only. Aptos and Shelby integration come later.</p>
        </div>
        <div className="hero_match_preview">
          <MatchCard match={mock_matches[0]} />
        </div>
      </section>

      <div className="panel_grid">
        {stat_cards.map((stat) => (
          <SectionPanel key={stat.label}>
            <div className="stat_card">
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          </SectionPanel>
        ))}
      </div>

      <SectionPanel title="Featured match preview" copy="The UI can preview active matches without exposing live score, Buff pool, leading side, odds, win probability, or supporter direction.">
        <div className="wide_two_column">
          {mock_matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </SectionPanel>
    </div>
  );
}
