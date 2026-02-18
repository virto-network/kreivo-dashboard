import React, { useState, useEffect, useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { chainClient$ } from "@/state/chains/chain.state"
import { firstValueFrom, take } from "rxjs"
import { kreivo } from "@polkadot-api/descriptors"
import { NostrService } from "@/services/nostr"
import BountyBreadcrumb from "./components/BountyBreadcrumb"
import BountyHeader from "./components/BountyHeader"
import BountyDescription from "./components/BountyDescription"
import BountyVotingResults from "./components/BountyVotingResults"
import BountyVotingPanel from "./components/BountyVotingPanel"
import BountyInformation from "./components/BountyInformation"
import BountyRecentVoters from "./components/BountyRecentVoters"
import BountyComments from "./components/BountyComments"
import { useVirto } from "@/contexts/VirtoContext"
import "./BountyDetail.css"

const BountyDetail: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { sdk, userAddress } = useVirto()
  const [bountyData, setBountyData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [membershipId, setMembershipId] = useState<number | null>(null);

  useEffect(() => {
    if (!userAddress) return;

    const fetchMembership = async () => {
      try {
        const { client } = await firstValueFrom(chainClient$.pipe(take(1)))
        if (!client) return
        const typedApi = client.getTypedApi(kreivo)

        // console.log("Fetching memberships for:", userAddress);
        const entries = await typedApi.query.CommunityMemberships.Account.getEntries(userAddress);

        if (entries && entries.length > 0) {
          const firstEntry = entries[0];
          // keyArgs: [address, collection, item]
          const itemId = firstEntry.keyArgs[2];
          // console.log(`[BountyDetail] Found membership ID: ${itemId}`);
          setMembershipId(Number(itemId));
        } else {
          // console.warn("[BountyDetail] No membership found");
        }
      } catch (err) {
        console.error("Error fetching membership:", err);
      }
    };
    fetchMembership();
  }, [userAddress]);


  const fetchBountyDetail = useCallback(async () => {
    if (!id) return;

    try {
      const { client } = await firstValueFrom(chainClient$.pipe(take(1)))
      if (!client) return

      const typedApi = client.getTypedApi(kreivo)
      const currentBlockFn = await typedApi.query.System.Number.getValue();
      const currentBlock = Number(currentBlockFn);

      const referendumInfo = await typedApi.query.CommunityReferenda.ReferendumInfoFor.getValue(Number(id))

      if (!referendumInfo) {
        console.error("Referendum not found")
        setLoading(false)
        return
      }

      let status = "Unknown"
      let proposalHash = id || ""
      let tally = { ayes: 0n, nays: 0n }
      let infoValue: any = null

      if (referendumInfo.type === 'Ongoing') {
        status = "Active"
        const ongoing = referendumInfo.value
        infoValue = ongoing
        // @ts-ignore
        tally = ongoing.tally

        if (ongoing.proposal.type === 'Inline') {
          proposalHash = id || "";
          // console.log(`[BountyDetail] Proposal ${id}, using ID as link key: ${proposalHash}`)
        } else if (ongoing.proposal.type === 'Lookup') {
          proposalHash = id || "";
          // console.log(`[BountyDetail] Proposal ${id}, using ID as link key: ${proposalHash}`)
        }

        // @ts-ignore
        if (!ongoing.decision_deposit) {
          status = "Preparing";
        }
      } else if (referendumInfo.type === 'Approved') {
        status = "Passed"
        infoValue = referendumInfo.value
        console.log("Approved Info Value:", infoValue)
      } else if (referendumInfo.type === 'Rejected' || referendumInfo.type === 'Cancelled' || referendumInfo.type === 'TimedOut' || referendumInfo.type === 'Killed') {
        status = "Rejected"
        infoValue = referendumInfo.value
        console.log("Rejected/Ended Info Value:", infoValue)
      }

      let metadata: any = null
      if (proposalHash) {
        metadata = await NostrService.getProposalMetadata(proposalHash)
      }

      let countAyes = 0;
      let countNays = 0;

      if (Number(tally.ayes) + Number(tally.nays) === 0 && (status === 'Passed' || status === 'Rejected')) {
        try {
          console.log("Attempting to reconstruct tally from CommunityVotes...");
          const votes = await typedApi.query.Communities.CommunityVotes.getEntries(Number(id));
          console.log("Fetched votes:", votes);

          let reconstructedAyes = 0n;
          let reconstructedNays = 0n;
          countAyes = 0;
          countNays = 0;

          votes.forEach((entry: any) => {
            const voteData = entry.value[0];

            let direction = false;
            let balance = 0n;

            if (voteData.type === 'Standard') {
              direction = voteData.value;
              balance = 1_000_000_000_000n;
            } else if (voteData.type === 'NativeBalance') {
              direction = voteData.value[0];
              balance = voteData.value[1];
            } else if (voteData.type === 'AssetBalance') {
              direction = voteData.value[0];
              balance = voteData.value[2];
            }

            if (direction) {
              reconstructedAyes += balance;
              countAyes++;
            } else {
              reconstructedNays += balance;
              countNays++;
            }
          });

          if (reconstructedAyes > 0n || reconstructedNays > 0n) {
            console.log(`Reconstructed Tally: Ayes ${reconstructedAyes}, Nays ${reconstructedNays}`);
            tally = { ayes: reconstructedAyes, nays: reconstructedNays };
          }
        } catch (err) {
          console.error("Error reconstructing votes:", err);
        }
      }
      const totalVotes = Number(tally.ayes) + Number(tally.nays)
      const forPercentage = totalVotes > 0 ? Math.round((Number(tally.ayes) / totalVotes) * 100) : (status === 'Passed' ? 100 : 0)
      const againstPercentage = totalVotes > 0 ? Math.round((Number(tally.nays) / totalVotes) * 100) : (status === 'Rejected' && Number(tally.nays) > 0 ? 100 : 0)

      let trackId = 0;
      let curves: any = null;

      if (referendumInfo.type === 'Ongoing') {
        // @ts-ignore
        trackId = Number(referendumInfo.value.track);
      } else {
        const metaTrack = Number(metadata?.track);
        trackId = isNaN(metaTrack) ? 1 : metaTrack;
      }

      try {
        // @ts-ignore
        const trackInfo = await typedApi.query.CommunityTracks.Tracks.getValue(trackId);
        if (trackInfo) {
          // @ts-ignore
          const approval = trackInfo.min_approval;
          // @ts-ignore
          const support = trackInfo.min_support;
          // @ts-ignore
          const decisionPeriod = Number(trackInfo.decision_period);

          console.log("Track Value:", {
            decisionPeriod,
            approval: approval.value,
            support: support.value,
            approvalType: approval.type,
            supportType: support.type
          });



          if (approval && support) {

            const extractCurve = (curve: any) => {
              if (!curve) return { start: 0, end: 0 };

              const normalize = (val: any) => Number(val) / 1_000_000_000 * 100;

              if (curve.type === 'LinearDecreasing') {
                return {
                  type: 'LinearDecreasing',
                  start: normalize(curve.value.ceil),
                  end: normalize(curve.value.floor),
                  length: curve.value.length ? Number(curve.value.length) : decisionPeriod
                };
              } else if (curve.type === 'Reciprocal') {
                return {
                  type: 'Reciprocal',
                  factor: Number(curve.value.factor),
                  xOffset: Number(curve.value.x_offset),
                  yOffset: Number(curve.value.y_offset),
                  length: decisionPeriod
                };
              } else if (curve.type === 'SteppedDecreasing') {
                return {
                  type: 'SteppedDecreasing',
                  begin: normalize(curve.value.begin),
                  end: normalize(curve.value.end),
                  step: normalize(curve.value.step),
                  period: normalize(curve.value.period),
                  length: decisionPeriod
                };
              }

              return { start: 0, end: 0, type: 'Unknown' };
            };

            curves = {
              decisionPeriod,
              approval: extractCurve(approval),
              support: extractCurve(support)
            };
          }

        }
      } catch (e) {
        console.error("Error fetching track info:", e);
      }



      let progress = 0;
      let timeLeft = "Unknown";
      let blocksRemaining = 0;
      let startDateStr: any = "N/A";
      let endDateStr: any = "N/A";

      if (metadata?.timestamp) {
        const startDate = new Date(metadata.timestamp);
        const decisionPeriodBlocks = Number(curves?.decisionPeriod || 0);
        const durationMs = decisionPeriodBlocks > 0 ? decisionPeriodBlocks * 6 * 1000 : 0;
        const endDate = durationMs > 0 ? new Date(metadata.timestamp + durationMs) : null;

        const optionsDate: Intl.DateTimeFormatOptions = {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        };
        const optionsTime: Intl.DateTimeFormatOptions = {
          hour: 'numeric',
          minute: 'numeric',
          hour12: true
        };

        startDateStr = {
          date: startDate.toLocaleDateString('en-US', optionsDate),
          time: startDate.toLocaleTimeString('en-US', optionsTime)
        };

        if (endDate) {
          endDateStr = {
            date: endDate.toLocaleDateString('en-US', optionsDate),
            time: endDate.toLocaleTimeString('en-US', optionsTime)
          };
        }
      }

      if (referendumInfo.type === 'Ongoing') {
        const ongoing = referendumInfo.value;
        // @ts-ignore
        if (ongoing.deciding) {
          // @ts-ignore
          const decidingSince = Number(ongoing.deciding.since);
          // @ts-ignore
          const decisionPeriod = Number(curves?.decisionPeriod || 0);

          if (decisionPeriod > 0) {
            const elapsed = currentBlock - decidingSince;
            progress = Math.min((elapsed / decisionPeriod) * 100, 100);
            progress = Math.max(progress, 0);

            blocksRemaining = decisionPeriod - elapsed;
            if (blocksRemaining > 0) {
              // Assuming 6s block time
              const seconds = blocksRemaining * 6;
              const days = Math.floor(seconds / (3600 * 24));
              const hours = Math.floor((seconds % (3600 * 24)) / 3600);
              const minutes = Math.floor((seconds % 3600) / 60);

              if (days > 0) timeLeft = `${days}d ${hours}h`;
              else if (hours > 0) timeLeft = `${hours}h ${minutes}m`;
              else timeLeft = `${minutes}m`;

              const now = Date.now();
              const elapsedSeconds = elapsed * 6;
              const remainingSeconds = blocksRemaining * 6;

              const startDate = new Date(now - elapsedSeconds * 1000);
              const endDate = new Date(now + remainingSeconds * 1000);

              const optionsDate: Intl.DateTimeFormatOptions = {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              };
              const optionsTime: Intl.DateTimeFormatOptions = {
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
              };

              startDateStr = {
                date: startDate.toLocaleDateString('en-US', optionsDate),
                time: startDate.toLocaleTimeString('en-US', optionsTime)
              };
              endDateStr = {
                date: endDate.toLocaleDateString('en-US', optionsDate),
                time: endDate.toLocaleTimeString('en-US', optionsTime)
              };

            } else {
              timeLeft = "Ended";
            }
            console.log(`[BountyDetail] Progress: ${progress.toFixed(2)}%, TimeLeft: ${timeLeft}, Block: ${currentBlock}, Start: ${decidingSince}, Period: ${decisionPeriod}`);
          }
        }
      } else {
        progress = 100;
        timeLeft = "Ended";
      }

      const isPassed = status === 'Passed';

      const data = {
        id: id,
        title: metadata?.title || `Proposal #${id}`,
        category: metadata?.track || "Uncategorized",
        categoryColor: "orange",
        communityId: metadata?.communityId || null,
        status: status,
        decisionDepositNeeded: status === "Preparing",
        proposer: {
          address: infoValue?.submission_deposit?.who || infoValue?.[1]?.who || metadata?.proposer || "Unknown",
        },
        startDate: startDateStr,
        endDate: endDateStr,
        description: metadata?.description || "No description available",
        voting: {
          timeLeft: timeLeft,
          supportThreshold: 50,
          approvalThreshold: 60,
          forVotes: Number(tally.ayes),
          forPercentage: forPercentage,
          forCount: countAyes,
          againstVotes: Number(tally.nays),
          againstPercentage: againstPercentage,
          againstCount: countNays,
          quorumCurrent: isPassed ? 100 : 0,
          quorumRequired: 50,
          quorumReached: isPassed,
          votingPower: 0,
          showCurves: true,
          curves: curves,
          progress: progress,
          currentApproval: forPercentage,
          currentSupport: isPassed ? 100 : forPercentage
        },
        information: {
          proposer: infoValue?.submission_deposit?.who || "Unknown",
          submissionDate: "Unknown",
          track: metadata?.track || "Unknown",
          deposit: infoValue?.submission_deposit?.amount?.toString() || "0",
        },
        recentVoters: []
      }

      setBountyData(data)
    } catch (err) {
      console.error("Error fetching bounty detail:", err)
    } finally {
      setLoading(false)
    }
  }, [id, userAddress])


  useEffect(() => {
    fetchBountyDetail()
  }, [fetchBountyDetail])
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (voteType: "for" | "against" | "abstain") => {
    if (!sdk || !userAddress) {
      alert("Please connect your wallet first.");
      return;
    }

    setIsVoting(true);

    try {
      const { client } = await firstValueFrom(chainClient$.pipe(take(1)))
      if (!client) return
      const typedApi = client.getTypedApi(kreivo)

      console.log(`Casting vote ${voteType} for proposal: ${id}`);

      if (!id) throw new Error("ID is required");

      const aye = voteType === 'for';

      console.log("Communities.vote function:", typedApi.tx.Communities.vote);

      if (membershipId === null) {
        throw new Error("No community membership found. You cannot vote.");
      }

      const params = {
        membership_id: membershipId,
        poll_index: Number(id),
        vote: { type: "Standard", value: aye }
      };

      console.log("Voting parameters JSON:", JSON.stringify(params, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ));

      // @ts-ignore
      const tx = typedApi.tx.Communities.vote(params);

      const encodedData = await tx.getEncodedData();
      const encodedHex = encodedData.asHex();

      const inclusionPromise = new Promise<void>((resolve, reject) => {
        const listener = (event: any) => {
          console.log("Vote Transaction Event:", event.type);
          if (event.type === 'included' || event.type === 'finalized') {
            resolve();
          }
          if (event.type === 'failed') {
            reject(event.transaction?.error || "Transaction failed");
          }
        };
        sdk.onTransactionUpdate(listener);
      });

      await sdk.custom.submitCallAsync(
        sdk.auth.sessionSigner,
        { callDataHex: encodedHex }
      );

      console.log("Vote submitted, waiting for inclusion...");
      await inclusionPromise;
      console.log("Vote included, reloading...");

      setTimeout(() => {
        fetchBountyDetail();
        setIsVoting(false);
      }, 1000);

    } catch (e) {
      console.error("Error casting vote:", e);
      alert("Failed to cast vote. See console for details.");
      setIsVoting(false);
    }
  }

  const [isDepositing, setIsDepositing] = useState(false);

  const handlePlaceDecisionDeposit = async () => {
    if (!sdk || !userAddress) {
      alert("Please connect your wallet first.");
      return;
    }

    setIsDepositing(true);

    try {
      const { client } = await firstValueFrom(chainClient$.pipe(take(1)))
      if (!client) return
      const typedApi = client.getTypedApi(kreivo)

      console.log("Placing decision deposit for proposal:", id);

      const tx = typedApi.tx.CommunityReferenda.place_decision_deposit({
        index: Number(id)
      });

      const encodedData = await tx.getEncodedData();
      const encodedHex = encodedData.asHex();

      const inclusionPromise = new Promise<void>((resolve, reject) => {
        const listener = (event: any) => {
          console.log("Deposit Transaction Event:", event.type);
          if (event.type === 'included' || event.type === 'finalized') {
            resolve();
          }
          if (event.type === 'failed') {
            reject(event.transaction?.error || "Transaction failed");
          }
        };
        sdk.onTransactionUpdate(listener);
      });

      await sdk.custom.submitCallAsync(
        sdk.auth.sessionSigner,
        { callDataHex: encodedHex }
      );

      console.log("Deposit submitted, waiting for inclusion...");
      await inclusionPromise;
      console.log("Deposit included, reloading...");

      setTimeout(() => {
        fetchBountyDetail();
        setIsDepositing(false);
      }, 2000);

    } catch (e) {
      console.error("Error placing deposit:", e);
      alert("Failed to place deposit. See console for details.");
      setIsDepositing(false);
    }
  }

  if (loading) return <div>Loading...</div>
  if (!bountyData) return <div>Proposal not found</div>

  return (
    <div className="bounty-detail">
      <BountyBreadcrumb
        category={bountyData.category}
        proposalId={bountyData.id}
        onBack={() => navigate(bountyData.communityId ? `/bounties/${bountyData.communityId}` : "/bounties")}
      />

      <div className="bounty-detail__grid">
        {/* Main Content */}
        <div className="bounty-detail__main">
          <BountyHeader
            id={bountyData.id}
            title={bountyData.title}
            category={bountyData.category}
            categoryColor={bountyData.categoryColor}
            status={bountyData.status}
            proposer={bountyData.proposer}
            startDate={bountyData.startDate}
            endDate={bountyData.endDate}
          />

          {bountyData.decisionDepositNeeded && (
            <div style={{
              background: 'rgba(234, 179, 8, 0.1)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              alignItems: 'start'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="material-icons-round" style={{ color: '#eab308' }}>info</span>
                <h3 style={{ margin: 0, color: '#eab308', fontSize: '1.1rem' }}>Decision Deposit Required</h3>
              </div>
              <p style={{ margin: 0, color: '#d1d5db', lineHeight: '1.5' }}>
                This proposal is currently in the <strong>Preparing</strong> stage.
                To move it to the Deciding stage and enable enactment, a Decision Deposit must be placed.
              </p>
              <button
                onClick={handlePlaceDecisionDeposit}
                disabled={isDepositing}
                className="button-primary"
                style={{
                  marginTop: '8px',
                  background: isDepositing ? '#9ca3af' : '#eab308',
                  color: '#000',
                  border: 'none',
                  fontWeight: 600,
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: isDepositing ? 'not-allowed' : 'pointer',
                  opacity: isDepositing ? 0.7 : 1
                }}
              >
                {isDepositing ? "Placing Deposit..." : "Place Decision Deposit"}
              </button>
            </div>
          )}

          <BountyDescription description={bountyData.description} />

          <BountyComments proposalId={bountyData.id} />
        </div>

        {/* Sidebar */}
        <div className="bounty-detail__sidebar">
          <BountyVotingResults voting={bountyData.voting} />

          {bountyData.status === 'Active' && (
            <BountyVotingPanel
              timeLeft={bountyData.voting.timeLeft}
              onVote={handleVote}
              isVoting={isVoting}
            />
          )}

          <BountyInformation information={bountyData.information} />

          <BountyRecentVoters voters={bountyData.recentVoters} />
        </div>
      </div>
    </div>
  )
}

export default BountyDetail

