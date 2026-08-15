# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *

from dataclasses import dataclass
from datetime import datetime, timezone
import json
import typing


MAX_MARKETS = 128
MAX_POSITIONS = 512
MAX_QUESTION_LENGTH = 360
MAX_POLICY_LENGTH = 1600
MAX_SOURCE_URL_LENGTH = 512
MAX_SOURCE_CHARS = 9000
MIN_RESOLUTION_CONFIDENCE_BPS = 8000
RESOLVED_CONFIDENCE_BPS = 10000

STATUS_OPEN = "open"
STATUS_CLOSED = "closed"
STATUS_RESOLVED = "resolved"
STATUS_CANCELLED = "cancelled"
OUTCOME_YES = "yes"
OUTCOME_NO = "no"
OUTCOME_NONE = "none"


@gl.evm.contract_interface
class _Recipient:
    class View:
        pass

    class Write:
        pass


@allow_storage
@dataclass
class Market:
    creator: Address
    question: str
    source_url: str
    resolution_policy: str
    created_at: str
    close_ts: u256
    resolution_deadline_ts: u256
    status: str
    outcome: str
    confidence_bps: u256
    resolved_at: str
    yes_pool: u256
    no_pool: u256
    total_staked: u256
    paid_out: u256
    refunded: u256
    claimed_winning_stake: u256


@allow_storage
@dataclass
class Position:
    market_id: u256
    owner: Address
    outcome: str
    stake: u256
    claimed: bool


def _normalize_resolution_payload(raw: typing.Any) -> dict[str, typing.Any]:
    """Return the only resolution fields that may affect settlement.

    This function is deterministic and deliberately removes any model-provided
    summary or extra fields before strict equivalence is applied.
    """
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except Exception as error:
            raise gl.vm.UserError("resolution is not valid JSON") from error
    if not isinstance(raw, dict):
        raise gl.vm.UserError("resolution must be an object")

    state = str(raw.get("state", "")).strip().lower()
    outcome = str(raw.get("outcome", "")).strip().lower()
    try:
        confidence_bps = int(raw.get("confidence_bps", 0))
    except Exception as error:
        raise gl.vm.UserError("resolution confidence is invalid") from error

    if state == "unresolved":
        return {
            "state": "unresolved",
            "outcome": OUTCOME_NONE,
            "confidence_bps": 0,
        }
    if state != "resolved":
        raise gl.vm.UserError("resolution state is invalid")
    if outcome not in [OUTCOME_YES, OUTCOME_NO]:
        raise gl.vm.UserError("resolved outcome is invalid")
    if confidence_bps < MIN_RESOLUTION_CONFIDENCE_BPS or confidence_bps > 10000:
        return {
            "state": "unresolved",
            "outcome": OUTCOME_NONE,
            "confidence_bps": 0,
        }
    # The raw model score is a threshold gate, not a settlement parameter. Once
    # the gate is met, every resolved verdict carries the same canonical score.
    return {
        "state": "resolved",
        "outcome": outcome,
        "confidence_bps": RESOLVED_CONFIDENCE_BPS,
    }


def _canonical_resolution_json(raw: typing.Any) -> str:
    normalized = _normalize_resolution_payload(raw)
    return json.dumps(normalized, sort_keys=True, separators=(",", ":"))


def _payout_for_winning_claim(
    total_staked: int,
    paid_out: int,
    winning_pool: int,
    claimed_winning_stake: int,
    position_stake: int,
) -> tuple[int, int]:
    """Calculate a winner's payout without permitting rounding dust to remain.

    The result is `(amount, new_claimed_winning_stake)`. The final winning
    claimant receives the full remaining escrow, which makes payout totals
    exactly equal `total_staked` regardless of integer division rounding.
    """
    if total_staked <= 0 or winning_pool <= 0 or position_stake <= 0:
        raise ValueError("invalid payout inputs")
    next_claimed_stake = claimed_winning_stake + position_stake
    if next_claimed_stake > winning_pool:
        raise ValueError("winning stake accounting overflow")
    if next_claimed_stake == winning_pool:
        return total_staked - paid_out, next_claimed_stake
    return (position_stake * total_staked) // winning_pool, next_claimed_stake


class OutcomeMarket(gl.Contract):
    """Collateralized binary prediction markets with source-backed resolution.

    A resolver has no authority to set a payout percentage. It can only resolve
    an immutable YES/NO question. All settlement amounts are derived from the
    contract's locked pools, and `strict_eq` binds the exact source-review
    output independently produced by every validator before storage changes.
    """

    markets: DynArray[Market]
    positions: DynArray[Position]

    def __init__(self):
        pass

    @gl.public.write
    def create_market(
        self,
        question: str,
        source_url: str,
        resolution_policy: str,
        close_ts: u256,
        resolution_deadline_ts: u256,
    ) -> u256:
        if len(self.markets) >= MAX_MARKETS:
            raise gl.vm.UserError("market limit reached")
        self._require_text(question, MAX_QUESTION_LENGTH, "question")
        self._require_text(source_url, MAX_SOURCE_URL_LENGTH, "source_url")
        self._require_text(resolution_policy, MAX_POLICY_LENGTH, "resolution_policy")
        if not source_url.startswith("https://"):
            raise gl.vm.UserError("source_url must use https")
        now_ts = self._now_ts()
        if int(close_ts) <= now_ts:
            raise gl.vm.UserError("close_ts must be in the future")
        if int(resolution_deadline_ts) <= int(close_ts):
            raise gl.vm.UserError("resolution deadline must be after close")

        market_id = u256(len(self.markets))
        self.markets.append(
            Market(
                creator=gl.message.sender_address,
                question=question,
                source_url=source_url,
                resolution_policy=resolution_policy,
                created_at=self._now_iso(),
                close_ts=close_ts,
                resolution_deadline_ts=resolution_deadline_ts,
                status=STATUS_OPEN,
                outcome=OUTCOME_NONE,
                confidence_bps=u256(0),
                resolved_at="",
                yes_pool=u256(0),
                no_pool=u256(0),
                total_staked=u256(0),
                paid_out=u256(0),
                refunded=u256(0),
                claimed_winning_stake=u256(0),
            )
        )
        return market_id

    @gl.public.write.payable
    def take_position(self, market_id: int, outcome: str) -> None:
        market = self._market(market_id)
        self._require_open_for_trading(market)
        normalized_outcome = self._normalize_outcome(outcome)
        if gl.message.value == u256(0):
            raise gl.vm.UserError("position stake must be greater than zero")

        position = self._find_position(market_id, gl.message.sender_address, normalized_outcome)
        if position is None:
            if len(self.positions) >= MAX_POSITIONS:
                raise gl.vm.UserError("position limit reached")
            self.positions.append(
                Position(
                    market_id=u256(market_id),
                    owner=gl.message.sender_address,
                    outcome=normalized_outcome,
                    stake=gl.message.value,
                    claimed=False,
                )
            )
        else:
            if position.claimed:
                raise gl.vm.UserError("claimed position cannot be increased")
            position.stake = position.stake + gl.message.value

        if normalized_outcome == OUTCOME_YES:
            market.yes_pool = market.yes_pool + gl.message.value
        else:
            market.no_pool = market.no_pool + gl.message.value
        market.total_staked = market.total_staked + gl.message.value

    @gl.public.write
    def close_market(self, market_id: int) -> None:
        market = self._market(market_id)
        if market.status != STATUS_OPEN:
            raise gl.vm.UserError("market is not open")
        if self._now_ts() < int(market.close_ts):
            raise gl.vm.UserError("market close time has not been reached")
        market.status = STATUS_CLOSED

    @gl.public.write
    def resolve_market(self, market_id: int) -> None:
        market = self._market(market_id)
        self._require_closed_market(market)
        if self._now_ts() >= int(market.resolution_deadline_ts):
            raise gl.vm.UserError("resolution deadline has passed; cancel market")
        if market.yes_pool == u256(0) or market.no_pool == u256(0):
            raise gl.vm.UserError("one-sided markets must be cancelled")

        snapshot = self._resolution_snapshot(market)

        def evaluate_resolution() -> str:
            # This is the complete non-deterministic boundary. It performs no
            # storage writes or transfers and returns no non-settlement fields.
            return self._evaluate_resolution_snapshot(snapshot)

        agreed_json = gl.eq_principle.strict_eq(evaluate_resolution)
        agreed = _normalize_resolution_payload(agreed_json)
        if agreed["state"] != "resolved":
            raise gl.vm.UserError("registered source is not yet resolvable")

        market.status = STATUS_RESOLVED
        market.outcome = agreed["outcome"]
        market.confidence_bps = u256(agreed["confidence_bps"])
        market.resolved_at = self._now_iso()

    @gl.public.write
    def cancel_market(self, market_id: int) -> None:
        market = self._market(market_id)
        self._close_if_due(market)
        if market.status != STATUS_CLOSED:
            raise gl.vm.UserError("only closed unresolved markets can be cancelled")
        one_sided = market.yes_pool == u256(0) or market.no_pool == u256(0)
        deadline_passed = self._now_ts() >= int(market.resolution_deadline_ts)
        if not one_sided and not deadline_passed:
            raise gl.vm.UserError("resolution deadline has not passed")
        market.status = STATUS_CANCELLED

    @gl.public.write
    def claim(self, market_id: int, outcome: str) -> None:
        market = self._market(market_id)
        if market.status not in [STATUS_RESOLVED, STATUS_CANCELLED]:
            raise gl.vm.UserError("market is not claimable")
        normalized_outcome = self._normalize_outcome(outcome)
        position = self._find_position(market_id, gl.message.sender_address, normalized_outcome)
        if position is None:
            raise gl.vm.UserError("position not found")
        if position.claimed:
            raise gl.vm.UserError("position already claimed")

        if market.status == STATUS_CANCELLED:
            amount = position.stake
            position.claimed = True
            market.refunded = market.refunded + amount
        else:
            if position.outcome != market.outcome:
                raise gl.vm.UserError("only winning positions can claim")
            winning_pool = self._winning_pool(market)
            try:
                amount, next_claimed_stake = _payout_for_winning_claim(
                    int(market.total_staked),
                    int(market.paid_out),
                    int(winning_pool),
                    int(market.claimed_winning_stake),
                    int(position.stake),
                )
            except ValueError as error:
                raise gl.vm.UserError(str(error)) from error
            position.claimed = True
            market.claimed_winning_stake = u256(next_claimed_stake)
            market.paid_out = market.paid_out + u256(amount)

        _Recipient(position.owner).emit_transfer(value=u256(amount))

    @gl.public.view
    def get_market_count(self) -> u256:
        return u256(len(self.markets))

    @gl.public.view
    def get_market(self, market_id: int) -> dict[str, typing.Any]:
        market = self._market(market_id)
        return {
            "id": u256(market_id),
            "creator": str(market.creator),
            "question": market.question,
            "source_url": market.source_url,
            "resolution_policy": market.resolution_policy,
            "created_at": market.created_at,
            "close_ts": market.close_ts,
            "resolution_deadline_ts": market.resolution_deadline_ts,
            "status": market.status,
            "outcome": market.outcome,
            "confidence_bps": market.confidence_bps,
            "resolved_at": market.resolved_at,
            "yes_pool": market.yes_pool,
            "no_pool": market.no_pool,
            "total_staked": market.total_staked,
            "paid_out": market.paid_out,
            "refunded": market.refunded,
            "remaining_liability": self._remaining_liability(market),
            "can_cancel": self._can_cancel(market),
        }

    @gl.public.view
    def get_position(self, market_id: int, owner: str, outcome: str) -> dict[str, typing.Any]:
        self._market(market_id)
        normalized_outcome = self._normalize_outcome(outcome)
        position = self._find_position(market_id, Address(owner), normalized_outcome)
        if position is None:
            return {
                "found": False,
                "market_id": u256(market_id),
                "owner": owner,
                "outcome": normalized_outcome,
                "stake": u256(0),
                "claimed": False,
            }
        return {
            "found": True,
            "market_id": position.market_id,
            "owner": str(position.owner),
            "outcome": position.outcome,
            "stake": position.stake,
            "claimed": position.claimed,
        }

    @gl.public.view
    def get_market_position_count(self, market_id: int) -> u256:
        self._market(market_id)
        count = u256(0)
        for i in range(len(self.positions)):
            if self.positions[i].market_id == u256(market_id):
                count = count + u256(1)
        return count

    @gl.public.view
    def contract_balance(self) -> u256:
        return self.balance

    @gl.public.view
    def accounted_balance(self) -> u256:
        total = u256(0)
        for i in range(len(self.markets)):
            total = total + self._remaining_liability(self.markets[i])
        return total

    def _evaluate_resolution_snapshot(self, snapshot: dict[str, typing.Any]) -> str:
        source_text = gl.nondet.web.render(
            snapshot["source_url"],
            mode="text",
            wait_after_loaded="2s",
        )[:MAX_SOURCE_CHARS]
        prompt = f"""
You are independently resolving a binary prediction market from one registered
public source. Apply the registered policy exactly and do not use outside facts.

Question: {snapshot["question"]}
Registered policy: {snapshot["resolution_policy"]}
Market close timestamp: {snapshot["close_ts"]}
Allowed resolved outcomes: yes or no.

Public source text:
{source_text}

Return JSON only with: state, outcome, confidence_bps.
- state is resolved only if the source unambiguously establishes exactly one
  allowed outcome under the registered policy; otherwise state is unresolved.
- A resolved result uses outcome yes or no. Set confidence_bps from 8000 to
  10000 only when the source is unambiguous; the contract canonicalizes every
  qualifying resolved result to confidence_bps 10000 before strict comparison.
- An unresolved result uses outcome none and confidence_bps 0.
Do not include a summary, explanation, citation, or any additional keys.
"""
        raw = gl.nondet.exec_prompt(prompt, response_format="json")
        return _canonical_resolution_json(raw)

    def _resolution_snapshot(self, market: Market) -> dict[str, typing.Any]:
        return {
            "question": market.question,
            "source_url": market.source_url,
            "resolution_policy": market.resolution_policy,
            "close_ts": int(market.close_ts),
            "outcomes": [OUTCOME_YES, OUTCOME_NO],
        }

    def _market(self, market_id: int) -> Market:
        if market_id < 0 or market_id >= len(self.markets):
            raise gl.vm.UserError("market not found")
        return self.markets[market_id]

    def _find_position(self, market_id: int, owner: Address, outcome: str) -> typing.Optional[Position]:
        for i in range(len(self.positions)):
            position = self.positions[i]
            if (
                position.market_id == u256(market_id)
                and position.owner == owner
                and position.outcome == outcome
            ):
                return position
        return None

    def _require_open_for_trading(self, market: Market) -> None:
        if market.status != STATUS_OPEN:
            raise gl.vm.UserError("market is not open for trading")
        if self._now_ts() >= int(market.close_ts):
            raise gl.vm.UserError("market trading is closed")

    def _require_closed_market(self, market: Market) -> None:
        self._close_if_due(market)
        if market.status != STATUS_CLOSED:
            raise gl.vm.UserError("market must be closed before resolution")

    def _close_if_due(self, market: Market) -> None:
        if market.status == STATUS_OPEN and self._now_ts() >= int(market.close_ts):
            market.status = STATUS_CLOSED

    def _winning_pool(self, market: Market) -> u256:
        if market.outcome == OUTCOME_YES:
            return market.yes_pool
        if market.outcome == OUTCOME_NO:
            return market.no_pool
        raise gl.vm.UserError("market has no resolved outcome")

    def _remaining_liability(self, market: Market) -> u256:
        return market.total_staked - market.paid_out - market.refunded

    def _can_cancel(self, market: Market) -> bool:
        if market.status not in [STATUS_OPEN, STATUS_CLOSED]:
            return False
        if self._now_ts() < int(market.close_ts):
            return False
        one_sided = market.yes_pool == u256(0) or market.no_pool == u256(0)
        return one_sided or self._now_ts() >= int(market.resolution_deadline_ts)

    def _normalize_outcome(self, outcome: str) -> str:
        normalized = outcome.strip().lower()
        if normalized not in [OUTCOME_YES, OUTCOME_NO]:
            raise gl.vm.UserError("outcome must be yes or no")
        return normalized

    def _require_text(self, value: str, max_length: int, field: str) -> None:
        if not value or not value.strip():
            raise gl.vm.UserError(f"{field} is required")
        if len(value) > max_length:
            raise gl.vm.UserError(f"{field} is too long")

    def _now_iso(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _now_ts(self) -> int:
        return int(datetime.now(timezone.utc).timestamp())
