"""Regression tests for Outcome Market settlement-critical behavior.

The tests load deterministic contract helpers with a small SDK stub. They do
not replace GenVM/Bradbury testing; they protect the evidence binding and
accounting rules that are also exercised in the deployment smoke plan.
"""

from __future__ import annotations

import importlib.util
import inspect
import json
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
PRIMARY_SHA = "a" * 40
CORROBORATION_SHA = "b" * 40
PRIMARY_URL = (
    "https://raw.githubusercontent.com/outcome-evidence/primary-ledger/"
    f"{PRIMARY_SHA}/records/iana-example-domains.txt"
)
CORROBORATION_URL = (
    "https://raw.githubusercontent.com/outcome-evidence/corroboration-ledger/"
    f"{CORROBORATION_SHA}/records/iana-example-domains.txt"
)
AUTHORITY_NAME = "Internet Assigned Numbers Authority"
AUTHORITATIVE_SOURCE_URL = "https://www.iana.org/help/example-domains"
SOURCE_DIGEST = "c" * 64


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
    evidence_expiry_offset: int = 400,
    yes_pool: int = 0,
    no_pool: int = 0,
    total_staked: int = 0,
    outcome: str = "none",
) -> object:
    now = _now_ts()
    return CONTRACT.Market(
        creator="0x0000000000000000000000000000000000000001",
        question="Will the published result meet the registered condition?",
        resolution_policy="Resolve yes only when the two records explicitly confirm the condition.",
        authority_name=AUTHORITY_NAME,
        authoritative_source_url=AUTHORITATIVE_SOURCE_URL,
        source_observed_at=now - 120,
        source_digest=SOURCE_DIGEST,
        evidence_record_id="iana-example-domains-2026-08",
        primary_evidence_url=PRIMARY_URL,
        primary_evidence_ref=f"outcome-evidence/primary-ledger@{PRIMARY_SHA}",
        corroboration_evidence_url=CORROBORATION_URL,
        corroboration_evidence_ref=(
            f"outcome-evidence/corroboration-ledger@{CORROBORATION_SHA}"
        ),
        evidence_published_at=now - 60,
        evidence_expires_at=now + evidence_expiry_offset,
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


def _resolution(snapshot: dict[str, object], outcome: str = "yes") -> dict[str, object]:
    return {
        "state": "resolved",
        "outcome": outcome,
        "confidence_bps": 10000,
        "authority_name": snapshot["authority_name"],
        "authoritative_source_url": snapshot["authoritative_source_url"],
        "source_observed_at": snapshot["source_observed_at"],
        "source_digest": snapshot["source_digest"],
        "evidence_record_id": snapshot["evidence_record_id"],
        "primary_evidence_ref": snapshot["primary_evidence_ref"],
        "corroboration_evidence_ref": snapshot["corroboration_evidence_ref"],
        "evidence_published_at": snapshot["evidence_published_at"],
        "evidence_expires_at": snapshot["evidence_expires_at"],
    }


def _record_text(
    snapshot: dict[str, object],
    body: str = "The quoted source explicitly confirms the registered condition.",
) -> str:
    return "\n".join(
        [
            "Outcome-Market-Evidence: outcome-market-evidence-v1",
            f"Record-ID: {snapshot['evidence_record_id']}",
            f"Question: {snapshot['question']}",
            f"Policy: {snapshot['resolution_policy']}",
            f"Authority: {snapshot['authority_name']}",
            f"Authoritative-Source: {snapshot['authoritative_source_url']}",
            f"Source-Observed-At: {snapshot['source_observed_at']}",
            f"Evidence-Published-At: {snapshot['evidence_published_at']}",
            f"Evidence-Expires-At: {snapshot['evidence_expires_at']}",
            f"Source-Digest: {snapshot['source_digest']}",
            "",
            body,
        ]
    )


def _contract_with(market: object, positions: list[object]) -> object:
    instance = CONTRACT.OutcomeMarket()
    instance.markets = [market]
    instance.positions = positions
    return instance


class EvidenceBindingTests(unittest.TestCase):
    def test_canonical_output_binds_every_settlement_relevant_field(self):
        market = _market()
        instance = _contract_with(market, [])
        snapshot = instance._resolution_snapshot(market)
        raw = _resolution(snapshot)

        self.assertEqual(
            json.loads(CONTRACT._canonical_resolution_json(raw, snapshot)),
            raw,
        )

    def test_canonical_output_rejects_extra_or_unbound_fields(self):
        market = _market()
        instance = _contract_with(market, [])
        snapshot = instance._resolution_snapshot(market)

        extra = _resolution(snapshot)
        extra["summary"] = "Consensus must not settle an unbound field."
        with self.assertRaises(_UserError):
            CONTRACT._canonical_resolution_json(extra, snapshot)

        changed_ref = _resolution(snapshot)
        changed_ref["primary_evidence_ref"] = "attacker/rewrite@" + ("c" * 40)
        with self.assertRaises(_UserError):
            CONTRACT._canonical_resolution_json(changed_ref, snapshot)

        changed_digest = _resolution(snapshot)
        changed_digest["source_digest"] = "d" * 64
        with self.assertRaises(_UserError):
            CONTRACT._canonical_resolution_json(changed_digest, snapshot)

        changed_authority = _resolution(snapshot)
        changed_authority["authority_name"] = "Unregistered authority"
        with self.assertRaises(_UserError):
            CONTRACT._canonical_resolution_json(changed_authority, snapshot)

    def test_record_parser_requires_exact_matching_metadata(self):
        market = _market()
        instance = _contract_with(market, [])
        snapshot = instance._resolution_snapshot(market)
        parsed = instance._parse_evidence_record(_record_text(snapshot), "primary evidence")
        instance._require_record_matches_snapshot(parsed, snapshot, "primary evidence")
        self.assertIn("explicitly confirms", parsed["evidence_body"])

        mismatched = instance._parse_evidence_record(
            _record_text(snapshot).replace(SOURCE_DIGEST, "d" * 64),
            "primary evidence",
        )
        with self.assertRaises(_UserError):
            instance._require_record_matches_snapshot(
                mismatched,
                snapshot,
                "primary evidence",
            )
        malformed = _record_text(snapshot).replace("Record-ID:", "Unexpected:")
        with self.assertRaises(_UserError):
            instance._parse_evidence_record(malformed, "primary evidence")

    def test_record_parser_rejects_declared_outcome_and_empty_body(self):
        market = _market()
        instance = _contract_with(market, [])
        snapshot = instance._resolution_snapshot(market)

        declared_outcome = _record_text(snapshot).replace(
            f"Source-Digest: {SOURCE_DIGEST}",
            f"Source-Digest: {SOURCE_DIGEST}\nOutcome: yes",
        )
        with self.assertRaises(_UserError):
            instance._parse_evidence_record(declared_outcome, "primary evidence")

        empty_body = _record_text(snapshot, "")
        with self.assertRaises(_UserError):
            instance._parse_evidence_record(empty_body, "primary evidence")

    def test_policy_judgment_accepts_only_exact_consequential_outcome(self):
        self.assertEqual(CONTRACT._normalize_policy_judgment('{"outcome":"yes"}'), "yes")
        self.assertEqual(CONTRACT._normalize_policy_judgment({"outcome": "no"}), "no")
        self.assertEqual(
            CONTRACT._normalize_policy_judgment({"outcome": "inconclusive"}),
            "inconclusive",
        )
        with self.assertRaises(_UserError):
            CONTRACT._normalize_policy_judgment(
                {"outcome": "yes", "confidence_bps": 10000}
            )
        with self.assertRaises(_UserError):
            CONTRACT._normalize_policy_judgment({"outcome": "allowed"})

    def test_freshness_window_rejects_stale_or_future_observation(self):
        instance = CONTRACT.OutcomeMarket()
        now = _now_ts()
        instance._require_evidence_window(
            now - 120,
            now - 60,
            now + 300,
            now + 100,
            now + 200,
            now,
        )

        with self.assertRaises(_UserError):
            instance._require_evidence_window(
                now - CONTRACT.MAX_SOURCE_OBSERVATION_AGE_SECONDS - 1,
                now,
                now + 300,
                now + 100,
                now + 200,
                now,
            )
        with self.assertRaises(_UserError):
            instance._require_evidence_window(
                now + 1,
                now,
                now + 300,
                now + 100,
                now + 200,
                now,
            )

    def test_pinned_urls_require_distinct_commit_addressed_repositories(self):
        instance = CONTRACT.OutcomeMarket()
        self.assertEqual(
            instance._pinned_evidence_ref(PRIMARY_URL, "primary_evidence_url"),
            f"outcome-evidence/primary-ledger@{PRIMARY_SHA}",
        )
        with self.assertRaises(_UserError):
            instance._pinned_evidence_ref(
                "https://raw.githubusercontent.com/outcome-evidence/primary-ledger/main/record.txt",
                "primary_evidence_url",
            )


class PayoutConservationTests(unittest.TestCase):
    def test_final_winner_receives_rounding_remainder(self):
        first, claimed = CONTRACT._payout_for_winning_claim(10, 0, 3, 0, 2)
        final, claimed = CONTRACT._payout_for_winning_claim(10, first, 3, claimed, 1)

        self.assertEqual(first, 6)
        self.assertEqual(final, 4)
        self.assertEqual(claimed, 3)
        self.assertEqual(first + final, 10)

    def test_claimed_winning_stake_cannot_exceed_pool(self):
        with self.assertRaises(ValueError):
            CONTRACT._payout_for_winning_claim(10, 0, 3, 2, 2)


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
        market = _market(
            status="open",
            close_offset=-1,
            deadline_offset=100,
            yes_pool=25,
            total_staked=25,
        )
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

    def test_expired_evidence_blocks_resolution_and_enables_refunds(self):
        market = _market(
            status="closed",
            close_offset=-100,
            deadline_offset=100,
            evidence_expiry_offset=-1,
            yes_pool=30,
            no_pool=20,
            total_staked=50,
        )
        instance = _contract_with(market, [])

        with self.assertRaises(_UserError):
            instance.resolve_market(0)
        self.assertTrue(instance._can_cancel(market))
        instance.cancel_market(0)
        self.assertEqual(market.status, "cancelled")

    def test_resolve_stores_only_exact_bound_result(self):
        market = _market(status="closed", yes_pool=30, no_pool=20, total_staked=50)
        instance = _contract_with(market, [])
        snapshot = instance._resolution_snapshot(market)
        instance._evaluate_resolution_snapshot = lambda _snapshot: CONTRACT._canonical_resolution_json(
            _resolution(snapshot, "yes"),
            snapshot,
        )
        CONTRACT.gl.eq_principle = types.SimpleNamespace(strict_eq=lambda evaluator: evaluator())

        instance.resolve_market(0)

        self.assertEqual(market.status, "resolved")
        self.assertEqual(market.outcome, "yes")
        self.assertEqual(market.confidence_bps, 10000)

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

    def test_evaluator_fetches_two_records_without_nested_nondeterminism_or_writes(self):
        source = inspect.getsource(CONTRACT.OutcomeMarket._evaluate_resolution_snapshot)
        self.assertEqual(source.count("gl.nondet.web.render"), 2)
        self.assertEqual(source.count("gl.nondet.exec_prompt"), 1)
        self.assertNotIn("emit_transfer", source)
        self.assertNotIn("self.markets", source)
        self.assertNotIn("self.positions", source)

    def test_inconclusive_validator_review_cannot_settle(self):
        market = _market(status="closed", yes_pool=1, no_pool=1, total_staked=2)
        instance = _contract_with(market, [])
        snapshot = instance._resolution_snapshot(market)
        record = _record_text(snapshot)
        CONTRACT.gl.nondet = types.SimpleNamespace(
            web=types.SimpleNamespace(render=lambda *_args, **_kwargs: record),
            exec_prompt=lambda _prompt: '{"outcome":"inconclusive"}',
        )

        with self.assertRaises(_UserError):
            instance._evaluate_resolution_snapshot(snapshot)
        self.assertEqual(market.status, "closed")
        self.assertEqual(market.outcome, "none")
        self.assertEqual(instance.accounted_balance(), 2)


if __name__ == "__main__":
    unittest.main()
