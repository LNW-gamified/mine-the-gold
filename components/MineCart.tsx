// Cart body (rect + angled front panel + two wheels), copied from
// leaderboard-race.html's .cart svg. Shared by the facilitator's cart-race
// leaderboard and the play screen's game-complete celebration cart so both
// stay pixel-identical instead of drifting apart as separate copies. Colors
// are overridable (e.g. the leaderboard's gold-bodied carts) but default to
// the original hardcoded values, so the celebration cart is unaffected.
export default function CartBody({
  bodyFill = "#3a2a14",
  bodyStroke = "#5a4022",
  panelFill = "#4a3418",
  wheelFill = "#0e0a05",
  wheelStroke = "#2a2015",
}: {
  bodyFill?: string;
  bodyStroke?: string;
  panelFill?: string;
  wheelFill?: string;
  wheelStroke?: string;
} = {}) {
  return (
    <>
      <rect x="4" y="6" width="34" height="16" rx="2" fill={bodyFill} stroke={bodyStroke} strokeWidth="1.5" />
      <path d="M6,6 L10,0 L34,0 L38,6 Z" fill={panelFill} />
      <circle cx="12" cy="24" r="5" fill={wheelFill} stroke={wheelStroke} strokeWidth="1.5" />
      <circle cx="32" cy="24" r="5" fill={wheelFill} stroke={wheelStroke} strokeWidth="1.5" />
    </>
  );
}
