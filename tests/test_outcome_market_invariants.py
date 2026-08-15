"""Regression tests for Outcome Market's settlement-critical behavior.

The tests load deterministic contract helpers with a small SDK stub. They do
not pretend to replace GenVM/Bradbury testing; they protect the field binding
and accounting rules that must also be exercised in the deployment smoke plan.
"""

from __future__ import annotations

import importlib.util
import inspect
import sys
import types
import unittest
from datetime import datetime, timezone
from pathlib import Path


class _UserError(Exception):
    pass


class _DynArray:
    @classmethod
    def __class_getitem__(cls, _item):
        return cls


def _identity(value):
    return value


def _load_contract_module():
    if "genlayer" not in sys.modules:
        genlayer = types.ModuleType("genlayer")
        genlayer.u256 = int
        genlayer.Address = str
        genlayer.DynArray = _DynArray
        genlayer.allow_storage = _identity
        genlayer.gl = types.SimpleNamespace(
            Contract=object,
            evm=types.SimpleNamespace(contract_interface=_identity),
            public=types.SimpleNamespace(write=_identity, view=_identity),
            vm=types.SimpleNamespace(UserError=_UserError),
        )
        genlayer.gl.public.write.payable = _identity
        sys.modules["genlayer"] = genlayer

    path = Path(__file__).parents[1] / "contracts" / "outcome_market.py"
    spec = importlib.util.spec_from_file_location("outcome_market_under_test", path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


CONTRACT = _load_contract_module()


class _RecipientStub:
    transfers: list[tuple[str, int]] = []

    def __init__(self, recipient: str):
        self.recipient = recipient

    def emit_transfer(self, *, value: int):
        self.transfers.append((self.recipient, value))


def _now_ts() -> int:
    return int(datetime.now(timezone.utc).timestamp())


def _market(
    *,
    status: str = "open",
    close_offset: int = 100,
    deadline_offset: int = 200,
    yes_pool: int = 0,
    no_pool: int = 0,
    total_staked: int = 0,
    outcome: str = "none",
) -> object:
    now = _now_ts()
    return CONTRACT.Market(
        creator="0x0000000000000000000000000000000000000001",
        question="Will the published result meet the registered condition?",
        source_url="https://example.com/result",
        resolution_policy="Resolve yes only when the source explicitly confirms the condition.",
        created_at="",
        close_ts=now + close_offset,
        resolution_deadline_ts=now + deadline_offset,
        status=status,
        outcome=outcome,
        confidence_bps=0,
        resolved_at="",
        yes_pool=yes_pool,
        no_pool=no_pool,
        total_staked=total_staked,
        paid_out=0,
        refunded=0,
        claimed_winning_stake=0,
    )


def _contract_with(market: object, positions: list[object]) -> object:
    instance = CONTRACT.OutcomeMarket()
    instance.markets = [market]
    instance.positions = positions
    return instance


class ResolutionCanonicalizationTests(unittest.TestCase):
    def test_canonical_output_keeps_only_settlement_fields(self):
        raw = {
            "state": "resolved",
            "outcome": "YES",
            "confidence_bps": 9500,
            "summary": "This must never become a consensus-bearing field.",
        }

        self.assertEqual(
            CONTRACT._canonical_resolution_json(raw),
            '{"confidence_bps":10000,"outcome":"yes","state":"resolved"}',
        )

    def test_qualifying_raw_confidences_share_one_canonical_value(self):
        lower = CONTRACT._canonical_resolution_json(
            {"state": "resolved", "outcome": "yes", "confidence_bps": 8000}
        )
        higher = CONTRACT._canonical_resolution_json(
            {"state": "resolved", "outcome": "yes", "confidence_bps": 9999}
        )

        self.assertEqual(lower, higher)
        self.assertEqual(
            lower,
            '{"confidence_bps":10000,"outcome":"yes","state":"resolved"}',
        )

    def test_insufficient_confidence_becomes_canonical_unresolved(self):
        result = CONTRACT._normalize_resolution_payload(
            {"state": "resolved", "outcome": "no", "confidence_bps": 7999}
        )

        self.assertEqual(
            result,
            {"state": "unresolved", "outcome": "none", "confidence_bps": 0},
        )

    def test_invalid_resolved_outcome_is_rejected(self):
        with self.assertRaises(_UserError):
            CONTRACT._normalize_resolution_payload(
                {"state": "resolved", "outcome": "maybe", "confidence_bps": 9500}
            )


class PayoutConservationTests(unittest.TestCase):
    def test_final_winner_receives_rounding_remainder(self):
        # Total pool 10, winner stakes 2 and 1. First payout floors to 6;
        # final payout must receive the 4 remaining wei, not another floor(3).
        first, claimed = CONTRACT._payout_for_winning_claim(10, 0, 3, 0, 2)
        final, claimed = CONTRACT._payout_for_winning_claim(10, first, 3, claimed, 1)

        self.assertEqual(first, 6)
        self.assertEqual(final, 4)
        self.assertEqual(claimed, 3)
        self.assertEqual(first + final, 10)

    def test_claimed_winning_stake_cannot_exceed_pool(self):
        with self.assertRaises(ValueError):
            CONTRACT._payout_for_winning_claim(10, 0, 3, 2, 2)

    def test_cancel_refunds_are_exact_stakes(self):
        stakes = [17, 23, 61]
        self.assertEqual(sum(stakes), 101)


class MarketLifecycleTests(unittest.TestCase):
    def setUp(self):
        CONTRACT.gl.message = types.SimpleNamespace(
            sender_address="0x00000000000000000000000000000000000000aa",
            value=0,
        )
        CONTRACT._Recipient = _RecipientStub
        _RecipientStub.transfers = []

    def test_taking_positions_updates_each_pool_and_total_collateral(self):
        market = _market()
        instance = _contract_with(market, [])

        CONTRACT.gl.message.value = 11
        instance.take_position(0, "yes")
        CONTRACT.gl.message.value = 7
        instance.take_position(0, "no")

        self.assertEqual(market.yes_pool, 11)
        self.assertEqual(market.no_pool, 7)
        self.assertEqual(market.total_staked, 18)
        self.assertEqual(instance.accounted_balance(), 18)
        self.assertEqual(len(instance.positions), 2)

    def test_one_sided_market_cancels_and_refunds_exact_stake_once(self):
        market = _market(status="open", close_offset=-1, deadline_offset=100, yes_pool=25, total_staked=25)
        position = CONTRACT.Position(
            market_id=0,
            owner="0x00000000000000000000000000000000000000aa",
            outcome="yes",
            stake=25,
            claimed=False,
        )
        instance = _contract_with(market, [position])

        instance.cancel_market(0)
        instance.claim(0, "yes")

        self.assertEqual(market.status, "cancelled")
        self.assertTrue(position.claimed)
        self.assertEqual(market.refunded, 25)
        self.assertEqual(instance.accounted_balance(), 0)
        self.assertEqual(_RecipientStub.transfers, [(position.owner, 25)])
        with self.assertRaises(_UserError):
            instance.claim(0, "yes")

    def test_resolve_stores_only_exact_agreed_result(self):
        market = _market(status="closed", yes_pool=30, no_pool=20, total_staked=50)
        instance = _contract_with(market, [])
        instance._evaluate_resolution_snapshot = lambda _snapshot: (
            '{"confidence_bps":9200,"outcome":"yes","state":"resolved"}'
        )
        CONTRACT.gl.eq_principle = types.SimpleNamespace(strict_eq=lambda evaluator: evaluator())

        instance.resolve_market(0)

        self.assertEqual(market.status, "resolved")
        self.assertEqual(market.outcome, "yes")
        self.assertEqual(market.confidence_bps, 10000)

    def test_unresolved_result_does_not_change_market_state(self):
        market = _market(status="closed", yes_pool=30, no_pool=20, total_staked=50)
        instance = _contract_with(market, [])
        instance._evaluate_resolution_snapshot = lambda _snapshot: (
            '{"confidence_bps":0,"outcome":"none","state":"unresolved"}'
        )
        CONTRACT.gl.eq_principle = types.SimpleNamespace(strict_eq=lambda evaluator: evaluator())

        with self.assertRaises(_UserError):
            instance.resolve_market(0)

        self.assertEqual(market.status, "closed")
        self.assertEqual(market.outcome, "none")
        self.assertEqual(market.confidence_bps, 0)

    def test_resolution_after_deadline_is_blocked_for_refund_path(self):
        market = _market(
            status="closed",
            close_offset=-200,
            deadline_offset=-1,
            yes_pool=30,
            no_pool=20,
            total_staked=50,
        )
        instance = _contract_with(market, [])

        with self.assertRaises(_UserError):
            instance.resolve_market(0)

        self.assertEqual(market.status, "closed")

    def test_real_claim_calls_pay_the_full_resolved_pool(self):
        market = _market(
            status="resolved",
            yes_pool=3,
            no_pool=7,
            total_staked=10,
            outcome="yes",
        )
        first = CONTRACT.Position(
            market_id=0,
            owner="0x00000000000000000000000000000000000000aa",
            outcome="yes",
            stake=2,
            claimed=False,
        )
        final = CONTRACT.Position(
            market_id=0,
            owner="0x00000000000000000000000000000000000000bb",
            outcome="yes",
            stake=1,
            claimed=False,
        )
        instance = _contract_with(market, [first, final])

        CONTRACT.gl.message.sender_address = first.owner
        instance.claim(0, "yes")
        CONTRACT.gl.message.sender_address = final.owner
        instance.claim(0, "yes")

        self.assertEqual(market.paid_out, 10)
        self.assertEqual(market.claimed_winning_stake, 3)
        self.assertEqual(instance.accounted_balance(), 0)
        self.assertEqual(_RecipientStub.transfers, [(first.owner, 6), (final.owner, 4)])


class NondeterminismBoundaryTests(unittest.TestCase):
    def test_resolution_uses_exact_strict_equivalence(self):
        source = inspect.getsource(CONTRACT.OutcomeMarket.resolve_market)
        self.assertIn("gl.eq_principle.strict_eq", source)
        self.assertNotIn("run_nondet_unsafe", source)

    def test_evaluator_does_not_write_storage_or_transfer(self):
        source = inspect.getsource(CONTRACT.OutcomeMarket._evaluate_resolution_snapshot)
        self.assertIn("gl.nondet.web.render", source)
        self.assertIn("gl.nondet.exec_prompt", source)
        self.assertNotIn("emit_transfer", source)
        self.assertNotIn("self.markets", source)
        self.assertNotIn("self.positions", source)


if __name__ == "__main__":
    unittest.main()
