import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Code2,
  Copy,
  ExternalLink,
  FileSearch,
  FileText,
  Gavel,
  Landmark,
  LoaderCircle,
  Menu,
  Moon,
  Plus,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Wallet,
  X,
} from "lucide-react";
import {
  CORRECTED_DEPLOYMENT_CONFIGURED,
  CONTRACT_ADDRESS,
  EXPLORER_ADDRESS,
  MarketRecord,
  PositionRecord,
  readAccountedBalance,
  readMarkets,
  readPosition,
  sendContractTransaction,
} from "./lib/genlayer";
import { countdown, formatDate, formatGen, genToWei, shortAddress } from "./lib/format";

type Notice = { tone: "success" | "error" | "info"; message: string; hash?: string } | null;
type Positions = Record<string, PositionRecord>;
type Theme = "light" | "dark";
type MarketFilter = "all" | "open" | "closed" | "resolved" | "cancelled";
type SortOrder = "newest" | "liquidity" | "closing";

const EMPTY_POSITION: PositionRecord = {
  found: false,
  market_id: 0n,
  owner: "",
  outcome: "yes",
  stake: 0n,
  claimed: false,
};

const STORAGE_KEYS = {
  theme: "outcome-market-theme",
  watchlist: "outcome-market-watchlist",
};

function positionKey(marketId: bigint, outcome: "yes" | "no") {
  return `${marketId.toString()}:${outcome}`;
}

function statusLabel(status: MarketRecord["status"]) {
  if (status === "open") return "Trading open";
  if (status === "closed") return "Awaiting resolution";
  if (status === "resolved") return "Resolved";
  return "Cancelled";
}

function impliedShare(sidePool: bigint, totalPool: bigint) {
  if (totalPool === 0n) return "-";
  return `${Number((sidePool * 10_000n) / totalPool) / 100}%`;
}

function marketCreatedLabel(value: string) {
  const formatted = formatDate(value);
  return formatted === "Not set" ? "On-chain record" : `Created ${formatted}`;
}

function canClaim(market: MarketRecord, position: PositionRecord, outcome: "yes" | "no") {
  if (!position.found || position.claimed) return false;
  if (market.status === "cancelled") return true;
  return market.status === "resolved" && market.outcome === outcome;
}

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

function getInitialTheme(): Theme {
  const saved = window.localStorage.getItem(STORAGE_KEYS.theme);
  if (isTheme(saved)) return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getInitialWatchlist() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.watchlist) ?? "[]");
    return new Set<string>(Array.isArray(saved) ? saved.filter((value) => typeof value === "string") : []);
  } catch {
    return new Set<string>();
  }
}

export default function App() {
  const [markets, setMarkets] = useState<MarketRecord[]>([]);
  const [accountedBalance, setAccountedBalance] = useState(0n);
  const [positions, setPositions] = useState<Positions>({});
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [now, setNow] = useState(Date.now());
  const [stakeAmounts, setStakeAmounts] = useState<Record<string, string>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MarketFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [watchlist, setWatchlist] = useState<Set<string>>(getInitialWatchlist);
  const [detailsMarketId, setDetailsMarketId] = useState<string | null>(null);
  const [copied, setCopied] = useState("");

  const openMarketCount = markets.filter((market) => market.status === "open").length;
  const watchedMarkets = markets.filter((market) => watchlist.has(market.id.toString())).length;
  const filteredMarkets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return [...markets]
      .filter((market) => filter === "all" || market.status === filter)
      .filter((market) => !normalizedQuery || `${market.question} ${market.authority_name} ${market.authoritative_source_url} ${market.source_digest} ${market.evidence_record_id} ${market.primary_evidence_url} ${market.corroboration_evidence_url} ${market.resolution_policy}`.toLowerCase().includes(normalizedQuery))
      .sort((first, second) => {
        if (sortOrder === "liquidity") return Number(second.total_staked - first.total_staked);
        if (sortOrder === "closing") return Number(first.close_ts - second.close_ts);
        return Number(second.id - first.id);
      });
  }, [filter, markets, query, sortOrder]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(STORAGE_KEYS.theme, theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.watchlist, JSON.stringify([...watchlist]));
  }, [watchlist]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const revealObserver = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("revealed")),
      { threshold: 0.14 },
    );
    document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((element) => revealObserver.observe(element));
    return () => revealObserver.disconnect();
  }, []);

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!account) {
      setPositions({});
      return;
    }
    void loadPositions(markets, account);
  }, [account, markets]);

  async function refresh() {
    setLoading(true);
    try {
      const nextMarkets = await readMarkets();
      setMarkets(nextMarkets);
    } catch (error) {
      setNotice({ tone: "error", message: humanizeError(error, "Could not read the Bradbury contract.") });
      setLoading(false);
      return;
    }

    try {
      const nextAccountedBalance = await readAccountedBalance();
      setAccountedBalance(nextAccountedBalance);
    } catch (error) {
      setNotice({ tone: "info", message: "Markets are live. The current escrow balance will refresh when Bradbury returns it." });
    } finally {
      setLoading(false);
    }
  }

  async function loadPositions(nextMarkets: MarketRecord[], owner: string) {
    try {
      const entries = await Promise.all(
        nextMarkets.flatMap((market) =>
          (["yes", "no"] as const).map(async (outcome) => [
            positionKey(market.id, outcome),
            await readPosition(market.id, owner, outcome),
          ] as const),
        ),
      );
      setPositions(Object.fromEntries(entries));
    } catch (error) {
      setNotice({ tone: "error", message: humanizeError(error, "Could not read wallet positions.") });
    }
  }

  async function connectWallet() {
    if (!window.ethereum) {
      setNotice({ tone: "error", message: "No browser wallet was found. Install or unlock a Bradbury-compatible wallet, then try again." });
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (!Array.isArray(accounts) || typeof accounts[0] !== "string") throw new Error("Wallet did not return an account.");
      setAccount(accounts[0]);
      setNotice({ tone: "success", message: `Connected ${shortAddress(accounts[0])} on GenLayer Bradbury.` });
    } catch (error) {
      setNotice({ tone: "error", message: humanizeError(error, "Wallet connection was cancelled.") });
    }
  }

  async function submitTransaction(
    functionName: string,
    args: Array<string | number | bigint>,
    value = 0n,
    successMessage?: string,
  ) {
    if (!account || !window.ethereum) {
      setNotice({ tone: "error", message: "Connect your wallet before sending a contract transaction." });
      return false;
    }
    setSubmitting(true);
    setNotice({ tone: "info", message: "Waiting for wallet confirmation and Bradbury acceptance." });
    try {
      const result = await sendContractTransaction(account, window.ethereum, functionName, args, value);
      setNotice({ tone: "success", message: successMessage ?? "Contract execution succeeded on Bradbury.", hash: result.hash });
      await refresh();
      return true;
    } catch (error) {
      setNotice({ tone: "error", message: humanizeError(error, "The contract transaction did not complete.") });
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function takePosition(market: MarketRecord, outcome: "yes" | "no") {
    const key = positionKey(market.id, outcome);
    try {
      const value = genToWei(stakeAmounts[key] ?? "");
      const completed = await submitTransaction("take_position", [Number(market.id), outcome], value, `Your ${outcome.toUpperCase()} position was accepted by Bradbury.`);
      if (completed) setStakeAmounts((current) => ({ ...current, [key]: "" }));
    } catch (error) {
      setNotice({ tone: "error", message: humanizeError(error, "Enter a valid GEN stake.") });
    }
  }

  async function createMarket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!CORRECTED_DEPLOYMENT_CONFIGURED) {
      setNotice({ tone: "error", message: "Market creation is disabled until the corrected versioned-evidence contract address is configured." });
      return;
    }
    const form = new FormData(event.currentTarget);
    const authorityName = String(form.get("authorityName") ?? "").trim();
    const authoritativeSourceUrl = String(form.get("authoritativeSourceUrl") ?? "").trim();
    const sourceDigest = String(form.get("sourceDigest") ?? "").trim().toLowerCase();
    const sourceObservedAt = new Date(String(form.get("sourceObservedAt"))).getTime();
    const evidencePublishedAt = new Date(String(form.get("evidencePublishedAt"))).getTime();
    const evidenceExpiresAt = new Date(String(form.get("evidenceExpiresAt"))).getTime();
    const closeAt = new Date(String(form.get("closeAt"))).getTime();
    const deadlineAt = new Date(String(form.get("deadlineAt"))).getTime();
    if (![sourceObservedAt, evidencePublishedAt, evidenceExpiresAt, closeAt, deadlineAt].every(Number.isFinite)) {
      setNotice({ tone: "error", message: "Set the source observation, evidence publication, evidence expiry, trading close, and resolution deadline times." });
      return;
    }
    if (!authorityName || !authoritativeSourceUrl.startsWith("https://") || !/^[0-9a-f]{64}$/.test(sourceDigest)) {
      setNotice({ tone: "error", message: "Provide an authority, an HTTPS authoritative source, and its 64-character lowercase SHA-256 digest." });
      return;
    }
    if (closeAt <= Date.now() || deadlineAt <= closeAt) {
      setNotice({ tone: "error", message: "Close time must be in the future and the resolution deadline must be later." });
      return;
    }
    if (evidencePublishedAt > Date.now() || evidencePublishedAt > closeAt) {
      setNotice({ tone: "error", message: "The evidence publication time cannot be in the future or after trading closes." });
      return;
    }
    if (sourceObservedAt > Date.now() || sourceObservedAt > evidencePublishedAt || evidencePublishedAt - sourceObservedAt > 86_400_000) {
      setNotice({ tone: "error", message: "The authoritative source must have been observed no more than 24 hours before the evidence records were published." });
      return;
    }
    if (evidenceExpiresAt <= Date.now() || evidenceExpiresAt < deadlineAt) {
      setNotice({ tone: "error", message: "The evidence must remain fresh through the full resolution deadline." });
      return;
    }
    if (evidenceExpiresAt <= evidencePublishedAt || evidenceExpiresAt - evidencePublishedAt > 2_678_400_000) {
      setNotice({ tone: "error", message: "The evidence validity window must be positive and no longer than 31 days." });
      return;
    }
    const completed = await submitTransaction(
      "create_market",
      [
        String(form.get("question") ?? "").trim(),
        String(form.get("policy") ?? "").trim(),
        authorityName,
        authoritativeSourceUrl,
        Math.floor(sourceObservedAt / 1000),
        sourceDigest,
        String(form.get("recordId") ?? "").trim(),
        String(form.get("primaryEvidenceUrl") ?? "").trim(),
        String(form.get("corroborationEvidenceUrl") ?? "").trim(),
        Math.floor(evidencePublishedAt / 1000),
        Math.floor(evidenceExpiresAt / 1000),
        Math.floor(closeAt / 1000),
        Math.floor(deadlineAt / 1000),
      ],
      0n,
      "Market created. Trading begins once the transaction is accepted.",
    );
    if (completed) setCreateOpen(false);
  }

  function goTo(id: string) {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleWatchlist(marketId: bigint) {
    const id = marketId.toString();
    setWatchlist((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function copyText(value: string, id: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setNotice({ tone: "error", message: "Copying is unavailable in this browser. Select the address manually." });
    }
  }

  return (
    <main>
      <div className="scroll-indicator" aria-hidden="true" />
      <header className="topbar">
        <a className="brand" href="#home" onClick={() => goTo("home")} aria-label="Outcome Market home">
          <span className="brand-mark"><Scale size={18} strokeWidth={2.5} /></span>
          <span>Outcome Market</span>
        </a>
        <nav className={`topnav ${mobileOpen ? "open" : ""}`} aria-label="Main navigation">
          <button type="button" onClick={() => goTo("how-it-works")}>How it works</button>
          <button type="button" onClick={() => goTo("markets")}>Markets</button>
          <button type="button" onClick={() => goTo("docs")}>Documentation</button>
        </nav>
        <div className="topbar-actions">
          <div className="network-pill"><span className="live-dot" /> Bradbury</div>
          <button className="icon-button theme-button" type="button" onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <a className="icon-button desktop-only" href={EXPLORER_ADDRESS} target="_blank" rel="noreferrer" title="View deployed contract">
            <ExternalLink size={17} />
          </a>
          <button className="wallet-button" type="button" onClick={connectWallet} disabled={submitting}>
            <Wallet size={16} /> {shortAddress(account)}
          </button>
          <button className="icon-button mobile-menu" type="button" onClick={() => setMobileOpen((open) => !open)} aria-label="Toggle navigation">
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      <section className="hero" id="home" aria-labelledby="app-title">
        <div className="hero-backdrop" aria-hidden="true" />
        <div className="hero-content" data-reveal>
          <div className="hero-kicker"><span className="live-dot" /> Source-backed GEN markets, live on Bradbury</div>
          <h1 id="app-title">A prediction market that settles from evidence, not vibes.</h1>
          <p>
            Register the proposition, named authority, observed source digest, two independently maintained commit-pinned evidence records, and freshness window before anyone trades. Validators derive the outcome by applying the locked policy to both records.
          </p>
          <div className="hero-actions">
            <button className="primary-button hero-primary" type="button" onClick={() => goTo("markets")}><CircleDollarSign size={18} /> Explore markets</button>
            <button className="hero-link" type="button" onClick={() => goTo("how-it-works")}>See the resolution model <ArrowRight size={17} /></button>
          </div>
        </div>
        <div className="hero-proof" data-reveal>
          <div><ShieldCheck size={18} /><span>Strict outcome agreement</span></div>
          <div><Landmark size={18} /><span>Pool-derived settlement</span></div>
          <div><FileSearch size={18} /><span>Versioned corroboration</span></div>
        </div>
      </section>

      <section className="protocol-strip" aria-label="Protocol guarantees">
        <div data-reveal><span className="protocol-number">01</span><p><strong>Immutable premise</strong>Question, policy, authority, source observation, digest, pinned records, and validity window are locked at creation.</p></div>
        <div data-reveal><span className="protocol-number">02</span><p><strong>Independent review</strong>Validators treat record bodies as untrusted evidence, verify exact provenance and freshness, then independently apply the registered rule.</p></div>
        <div data-reveal><span className="protocol-number">03</span><p><strong>Defined exits</strong>Exact claims after resolution, or exact stake refunds when a market is cancelled.</p></div>
      </section>

      <section className="stats-band" aria-label="Live market statistics">
        <div><span>Registered markets</span><strong>{loading && markets.length === 0 ? "..." : markets.length}</strong></div>
        <div><span>Trading now</span><strong>{loading && markets.length === 0 ? "..." : openMarketCount}</strong></div>
        <div><span>Collateral locked</span><strong>{loading && markets.length === 0 ? "..." : formatGen(accountedBalance)} <small>GEN</small></strong></div>
        <div><span>Watchlist</span><strong>{watchedMarkets}</strong></div>
      </section>

      {notice && (
        <div className={`notice ${notice.tone}`} role="status">
          {notice.tone === "success" ? <CheckCircle2 size={19} /> : notice.tone === "error" ? <AlertCircle size={19} /> : <LoaderCircle size={19} className="spin" />}
          <span>{notice.message}</span>
          {notice.hash && <a href={`https://explorer-bradbury.genlayer.com/transaction/${notice.hash}`} target="_blank" rel="noreferrer" title={notice.hash}>View transaction <ArrowUpRight size={14} /></a>}
          <button type="button" className="dismiss" onClick={() => setNotice(null)} aria-label="Dismiss notification"><X size={16} /></button>
        </div>
      )}

      <section className="explain-section" id="how-it-works" aria-labelledby="how-title">
        <div className="section-intro" data-reveal>
          <p className="eyebrow">Protocol design</p>
          <h2 id="how-title">The source resolves the claim. The pool resolves the payout.</h2>
          <p>Outcome Market separates the only two questions that matter: what the registered evidence proves, and how funds are distributed once that answer is final.</p>
        </div>
        <div className="lifecycle" data-reveal>
          <article><span>01</span><div><h3>Define</h3><p>Creator locks a binary question, policy, named authority, observed HTTPS source and digest, two pinned records, and explicit time bounds.</p></div></article>
          <article><span>02</span><div><h3>Trade</h3><p>Participants stake GEN on YES or NO while the market is open. The contract records every position.</p></div></article>
          <article><span>03</span><div><h3>Verify</h3><p>After close, validators verify exact provenance and freshness across both records, then independently derive one outcome and confidence under the locked policy.</p></div></article>
          <article><span>04</span><div><h3>Settle</h3><p>Winners claim a pool-derived share. Unresolvable or one-sided markets use deterministic refunds.</p></div></article>
        </div>
      </section>

      <section className="workspace" id="markets" aria-labelledby="market-title">
        <div className="workspace-head">
          <div>
            <p className="eyebrow">Live workspace</p>
            <h2 id="market-title">Market explorer</h2>
            <p>Every row below is read directly from <a href={EXPLORER_ADDRESS} target="_blank" rel="noreferrer">the deployed Bradbury contract <ArrowUpRight size={14} /></a>.</p>
          </div>
          <div className="section-actions">
            <button className="icon-button" type="button" onClick={() => void refresh()} disabled={loading || submitting} title="Refresh markets"><RefreshCw size={18} className={loading ? "spin" : ""} /></button>
            <button className="primary-button" type="button" disabled={!CORRECTED_DEPLOYMENT_CONFIGURED} onClick={() => setCreateOpen((current) => !current)} title={!CORRECTED_DEPLOYMENT_CONFIGURED ? "Configure the corrected deployment address to create markets" : "Create a versioned-evidence market"}><Plus size={18} /> Create market</button>
          </div>
        </div>

        {!CORRECTED_DEPLOYMENT_CONFIGURED && <div className="deployment-warning"><AlertCircle size={19} /><div><strong>Legacy deployment is read-only.</strong><p>Set <code>VITE_CONTRACT_ADDRESS</code> to the corrected Bradbury deployment before creating or resolving markets. Existing legacy markets remain visible for audit history.</p></div></div>}

        {createOpen && <CreateMarketForm submitting={submitting} close={() => setCreateOpen(false)} submit={createMarket} />}

        {loading && <div className="sync-status"><LoaderCircle size={16} className="spin" /><span>Reading live market data from Bradbury. Initial reads can take a few seconds.</span></div>}

        <div className="market-toolbar">
          <label className="search-field"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search question, source, or policy" aria-label="Search markets" /></label>
          <div className="filter-tabs" aria-label="Market status filter">
            {(["all", "open", "closed", "resolved", "cancelled"] as MarketFilter[]).map((item) => <button className={filter === item ? "active" : ""} type="button" key={item} onClick={() => setFilter(item)}>{item === "all" ? "All" : statusLabel(item)}</button>)}
          </div>
          <label className="sort-control"><SlidersHorizontal size={17} /><span>Sort</span><select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as SortOrder)} aria-label="Sort markets"><option value="newest">Newest</option><option value="liquidity">Liquidity</option><option value="closing">Closing soon</option></select><ChevronDown size={15} /></label>
        </div>

        {loading && markets.length === 0 ? <LoadingMarkets /> : filteredMarkets.length === 0 ? <EmptyMarkets filter={filter} query={query} /> : (
          <div className="market-list">
            {filteredMarkets.map((market) => <MarketCard key={market.id.toString()} market={market} yesPosition={positions[positionKey(market.id, "yes")] ?? EMPTY_POSITION} noPosition={positions[positionKey(market.id, "no")] ?? EMPTY_POSITION} now={now} submitting={submitting} stakeAmounts={stakeAmounts} setStakeAmounts={setStakeAmounts} takePosition={takePosition} transact={submitTransaction} watched={watchlist.has(market.id.toString())} toggleWatchlist={toggleWatchlist} expanded={detailsMarketId === market.id.toString()} setExpanded={() => setDetailsMarketId((current) => current === market.id.toString() ? null : market.id.toString())} />)}
          </div>
        )}
      </section>

      <section className="docs-section" id="docs" aria-labelledby="docs-title">
        <div className="docs-intro" data-reveal>
          <p className="eyebrow">Developer documentation</p>
          <h2 id="docs-title">Build markets with a settlement rule reviewers can inspect.</h2>
          <p>Use this contract as an evidence-based market primitive. Resolution is bound to a named authority, observed source digest, two commit-pinned records from distinct repositories, explicit freshness rules, and exact validator agreement on the independently derived result. Payouts remain derived only from recorded pools.</p>
          <a className="secondary-link" href={EXPLORER_ADDRESS} target="_blank" rel="noreferrer">Open deployed contract <ExternalLink size={16} /></a>
        </div>
        <div className="docs-grid" data-reveal>
          <DocCard icon={<BookOpen size={20} />} title="Create a market" body="Supply a precise question and policy, named authority, authoritative HTTPS source, observation timestamp and SHA-256 digest, plus two raw GitHub records pinned to distinct repositories and commits." />
          <DocCard icon={<Gavel size={20} />} title="Resolve safely" body="Validators independently fetch both records, verify exact provenance and freshness, and reapply the locked policy. Records cannot dictate the outcome or confidence." />
          <DocCard icon={<ArrowDownToLine size={20} />} title="Claim or refund" body="The contract derives settlement from recorded pools and positions. Cancellation returns each unclaimed stake exactly." />
        </div>
        <div className="code-panel" data-reveal>
          <div className="code-head"><div><Code2 size={18} /><span>Contract interaction</span></div><button type="button" onClick={() => void copyText("await client.readContract({ address: CONTRACT_ADDRESS, functionName: 'get_market', args: [marketId], jsonSafeReturn: true });", "read-code")}>{copied === "read-code" ? <Check size={16} /> : <Copy size={16} />}{copied === "read-code" ? "Copied" : "Copy"}</button></div>
          <pre><code>{`await client.readContract({
  address: CONTRACT_ADDRESS,
  functionName: "get_market",
  args: [marketId],
  jsonSafeReturn: true,
});`}</code></pre>
        </div>
        <div className="contract-reference" data-reveal>
          <div><span>Contract address</span><code>{CONTRACT_ADDRESS}</code></div>
          <button className="icon-button" type="button" onClick={() => void copyText(CONTRACT_ADDRESS, "address")} title="Copy contract address">{copied === "address" ? <Check size={17} /> : <Copy size={17} />}</button>
          <a className="icon-button" href={EXPLORER_ADDRESS} target="_blank" rel="noreferrer" title="Open contract explorer"><ExternalLink size={17} /></a>
        </div>
      </section>

      <footer className="footer"><a className="brand" href="#home" onClick={() => goTo("home")}><span className="brand-mark"><Scale size={17} /></span><span>Outcome Market</span></a><p>Source-backed binary markets on GenLayer Bradbury.</p><a href={EXPLORER_ADDRESS} target="_blank" rel="noreferrer">Contract explorer <ArrowUpRight size={14} /></a></footer>
    </main>
  );
}

function CreateMarketForm({ submitting, close, submit }: { submitting: boolean; close: () => void; submit: (event: FormEvent<HTMLFormElement>) => Promise<void> }) {
  return <form className="create-form" onSubmit={(event) => void submit(event)}>
    <div className="form-heading"><div><p className="eyebrow">New market</p><h3>Register an auditable binary proposition</h3></div><span>Immutable after Bradbury acceptance</span></div>
    <label className="full-field">Question<input name="question" maxLength={360} required placeholder="Will both registered evidence records confirm this proposition?" /></label>
    <label className="full-field">Resolution policy<textarea name="policy" maxLength={1600} required placeholder="Resolve YES only if both immutable records explicitly establish... Resolve NO only if both establish the opposite." /></label>
    <label className="full-field">Authoritative organization<input name="authorityName" maxLength={160} required placeholder="Internet Assigned Numbers Authority (IANA)" /></label>
    <label className="full-field">Authoritative HTTPS source<input name="authoritativeSourceUrl" type="url" maxLength={512} required placeholder="https://www.iana.org/help/example-domains" /></label>
    <div className="time-grid"><label>Source observed<input name="sourceObservedAt" type="datetime-local" required /></label><label>SHA-256 source digest<input name="sourceDigest" minLength={64} maxLength={64} pattern="[0-9a-f]{64}" required placeholder="64 lowercase hexadecimal characters" /></label></div>
    <label className="full-field">Evidence record ID<input name="recordId" maxLength={96} required pattern="[A-Za-z0-9._-]+" placeholder="market-2026-08-18-record-01" /></label>
    <label className="full-field">Primary commit-pinned evidence URL<input name="primaryEvidenceUrl" type="url" maxLength={512} required placeholder="https://raw.githubusercontent.com/owner/repository/40-character-commit/evidence.txt" /></label>
    <label className="full-field">Corroborating commit-pinned evidence URL<input name="corroborationEvidenceUrl" type="url" maxLength={512} required placeholder="https://raw.githubusercontent.com/independent-owner/independent-repository/40-character-commit/evidence.txt" /></label>
    <div className="time-grid"><label>Evidence published<input name="evidencePublishedAt" type="datetime-local" required /></label><label>Evidence expires<input name="evidenceExpiresAt" type="datetime-local" required /></label></div>
    <div className="time-grid"><label>Trading closes<input name="closeAt" type="datetime-local" required /></label><label>Resolution deadline<input name="deadlineAt" type="datetime-local" required /></label></div>
    <div className="form-actions"><button type="button" className="text-button" onClick={close}>Cancel</button><button className="primary-button" disabled={submitting} type="submit"><Plus size={18} /> Create market</button></div>
  </form>;
}

function MarketCard({ market, yesPosition, noPosition, now, submitting, stakeAmounts, setStakeAmounts, takePosition, transact, watched, toggleWatchlist, expanded, setExpanded }: {
  market: MarketRecord;
  yesPosition: PositionRecord;
  noPosition: PositionRecord;
  now: number;
  submitting: boolean;
  stakeAmounts: Record<string, string>;
  setStakeAmounts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  takePosition: (market: MarketRecord, outcome: "yes" | "no") => Promise<void>;
  transact: (functionName: string, args: Array<string | number | bigint>, value?: bigint, successMessage?: string) => Promise<boolean>;
  watched: boolean;
  toggleWatchlist: (marketId: bigint) => void;
  expanded: boolean;
  setExpanded: () => void;
}) {
  const nowSeconds = Math.floor(now / 1000);
  const tradingOpen = market.status === "open" && nowSeconds < Number(market.close_ts);
  const canResolve = CORRECTED_DEPLOYMENT_CONFIGURED && market.versioned_evidence && market.evidence_is_fresh && market.status === "closed" && nowSeconds < Number(market.resolution_deadline_ts) && market.yes_pool > 0n && market.no_pool > 0n;
  const yesKey = positionKey(market.id, "yes");
  const noKey = positionKey(market.id, "no");
  const deadlineLabel = market.status === "open" ? `Closes ${countdown(market.close_ts, now)}` : `Deadline ${countdown(market.resolution_deadline_ts, now)}`;
  return <article className={`market-card ${expanded ? "expanded" : ""}`}>
    <div className="market-main">
      <div className="market-meta"><span className={`status ${market.status}`}>{statusLabel(market.status)}</span><span>Market #{market.id.toString()}</span><span><Clock3 size={14} /> {deadlineLabel}</span><button className={`watch-button ${watched ? "watched" : ""}`} type="button" onClick={() => toggleWatchlist(market.id)} aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}><Sparkles size={15} /> {watched ? "Watching" : "Watch"}</button></div>
      <h3>{market.question}</h3>
      <div className="market-source"><FileText size={16} /><div className="evidence-links">{market.authoritative_source_url && <a href={market.authoritative_source_url} target="_blank" rel="noreferrer">Authoritative source <ExternalLink size={13} /></a>}<a href={market.primary_evidence_url} target="_blank" rel="noreferrer">{market.versioned_evidence ? "Primary evidence" : "Legacy mutable source"} <ExternalLink size={13} /></a>{market.corroboration_evidence_url && <a href={market.corroboration_evidence_url} target="_blank" rel="noreferrer">Corroboration <ExternalLink size={13} /></a>}</div><span>{marketCreatedLabel(market.created_at)}</span></div>
      {!market.versioned_evidence && <div className="legacy-warning"><AlertCircle size={17} /> This legacy market predates immutable corroborated evidence and cannot be resolved from this interface.</div>}
      {market.status === "resolved" && <div className="outcome-banner"><CheckCircle2 size={18} /> Resolved <strong>{market.outcome.toUpperCase()}</strong> with exact confidence {market.confidence_bps.toString()} bps.</div>}
      {market.status === "cancelled" && <div className="outcome-banner cancelled"><ArrowDownToLine size={18} /> Cancelled. Each unclaimed position can recover its exact original stake.</div>}
      <button className="details-button" type="button" onClick={setExpanded}><span>{expanded ? "Hide evidence rule" : "Inspect evidence rule"}</span><ChevronDown size={17} /></button>
      {expanded && <div className="market-details"><div><span>Resolution policy</span><p>{market.resolution_policy}</p></div><div><span>Source provenance</span><p>Authority: {market.authority_name || "Legacy market"}<br />Observed: {formatDate(market.source_observed_at)}<br />Digest: <code className="digest-value">{market.source_digest || "Not registered"}</code></p></div><div><span>Immutable evidence</span><p>Record: {market.evidence_record_id || "Legacy record"}<br />Primary: {market.primary_evidence_ref || "Not versioned"}<br />Corroboration: {market.corroboration_evidence_ref || "Not provided"}</p></div><div><span>Freshness and windows</span><p>Evidence published: {formatDate(market.evidence_published_at)}<br />Evidence expires: {formatDate(market.evidence_expires_at)}<br />Fresh now: {market.evidence_is_fresh ? "Yes" : "No"}<br />Close: {formatDate(market.close_ts)}<br />Resolution deadline: {formatDate(market.resolution_deadline_ts)}</p></div><div><span>Settlement accounting</span><p>Paid: {formatGen(market.paid_out)} GEN<br />Refunded: {formatGen(market.refunded)} GEN</p></div></div>}
    </div>
    <div className="market-trade" aria-label={`Trading controls for market ${market.id.toString()}`}>
      <div className="pool-summary"><span>Locked collateral</span><strong>{formatGen(market.total_staked)} GEN</strong></div>
      <OutcomePanel outcome="yes" market={market} position={yesPosition} share={impliedShare(market.yes_pool, market.total_staked)} enabled={tradingOpen} amount={stakeAmounts[yesKey] ?? ""} setAmount={(amount) => setStakeAmounts((current) => ({ ...current, [yesKey]: amount }))} submitting={submitting} takePosition={takePosition} canClaim={canClaim(market, yesPosition, "yes")} claim={() => transact("claim", [Number(market.id), "yes"], 0n, "Your YES claim was accepted.")} />
      <OutcomePanel outcome="no" market={market} position={noPosition} share={impliedShare(market.no_pool, market.total_staked)} enabled={tradingOpen} amount={stakeAmounts[noKey] ?? ""} setAmount={(amount) => setStakeAmounts((current) => ({ ...current, [noKey]: amount }))} submitting={submitting} takePosition={takePosition} canClaim={canClaim(market, noPosition, "no")} claim={() => transact("claim", [Number(market.id), "no"], 0n, "Your NO claim was accepted.")} />
      <div className="lifecycle-actions">
        {market.status === "open" && !tradingOpen && <button type="button" className="minor-button" disabled={submitting} onClick={() => void transact("close_market", [Number(market.id)], 0n, "Market closed. It can now be resolved or cancelled under its registered conditions.")}>Close market</button>}
        {canResolve && <button type="button" className="minor-button" disabled={submitting} onClick={() => void transact("resolve_market", [Number(market.id)], 0n, "Versioned evidence resolution accepted. Refresh to see the agreed outcome.")}>Resolve pinned records</button>}
        {market.can_cancel && <button type="button" className="minor-button" disabled={submitting} onClick={() => void transact("cancel_market", [Number(market.id)], 0n, "Market cancelled. Original stakes are now claimable.")}>Cancel and enable refunds</button>}
        <span>Liability: {formatGen(market.remaining_liability)} GEN</span>
      </div>
    </div>
  </article>;
}

function OutcomePanel({ outcome, market, position, share, enabled, amount, setAmount, submitting, takePosition, canClaim: positionCanClaim, claim }: {
  outcome: "yes" | "no";
  market: MarketRecord;
  position: PositionRecord;
  share: string;
  enabled: boolean;
  amount: string;
  setAmount: (amount: string) => void;
  submitting: boolean;
  takePosition: (market: MarketRecord, outcome: "yes" | "no") => Promise<void>;
  canClaim: boolean;
  claim: () => Promise<boolean>;
}) {
  const isYes = outcome === "yes";
  const pool = isYes ? market.yes_pool : market.no_pool;
  return <div className={`outcome-panel ${outcome}`}>
    <div className="outcome-topline"><strong>{outcome.toUpperCase()}</strong><span>{share} of pool</span></div>
    <span className="outcome-pool">{formatGen(pool)} GEN</span>
    {position.found && <span className="position-note">Your position: {formatGen(position.stake)} GEN {position.claimed ? "(claimed)" : ""}</span>}
    {enabled && <div className="stake-entry"><input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="GEN amount" aria-label={`${outcome} stake amount`} /><button type="button" disabled={submitting} onClick={() => void takePosition(market, outcome)}>Buy {outcome.toUpperCase()}</button></div>}
    {positionCanClaim && <button type="button" className="claim-button" disabled={submitting} onClick={() => void claim()}>Claim {isYes ? "YES" : "NO"}</button>}
  </div>;
}

function LoadingMarkets() {
  return <div className="loading-state" aria-live="polite"><div className="loading-grid" aria-label="Loading markets"><div /><div /><div /></div><p><LoaderCircle size={16} className="spin" /> Connecting to the deployed Bradbury contract.</p></div>;
}

function EmptyMarkets({ filter, query }: { filter: MarketFilter; query: string }) {
  return <div className="empty-state"><CircleDollarSign size={30} /><h3>No matching markets</h3><p>{query ? `No market matches “${query}”.` : filter === "all" ? "Register a precise, source-backed proposition to start the first market." : `There are no ${statusLabel(filter).toLowerCase()} markets right now.`}</p></div>;
}

function DocCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return <article className="doc-card"><span>{icon}</span><h3>{title}</h3><p>{body}</p></article>;
}

function humanizeError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object") {
    const record = error as {
      code?: unknown;
      message?: unknown;
      shortMessage?: unknown;
      details?: unknown;
      data?: { message?: unknown };
    };
    if (record.code === 4001) return "The wallet request was rejected.";
    for (const candidate of [record.shortMessage, record.message, record.details, record.data?.message]) {
      if (typeof candidate === "string" && candidate.trim()) return candidate;
    }
  }
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}
