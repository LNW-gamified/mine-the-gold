// Cart body (rect + angled front panel + two wheels), copied from
// leaderboard-race.html's .cart svg. Shared by the facilitator's cart-race
// leaderboard and the play screen's game-complete celebration cart so both
// stay pixel-identical instead of drifting apart as separate copies.
export default function CartBody() {
  return (
    <>
      <rect x="4" y="6" width="34" height="16" rx="2" fill="#3a2a14" stroke="#5a4022" strokeWidth="1.5" />
      <path d="M6,6 L10,0 L34,0 L38,6 Z" fill="#4a3418" />
      <circle cx="12" cy="24" r="5" fill="#0e0a05" stroke="#2a2015" strokeWidth="1.5" />
      <circle cx="32" cy="24" r="5" fill="#0e0a05" stroke="#2a2015" strokeWidth="1.5" />
    </>
  );
}
