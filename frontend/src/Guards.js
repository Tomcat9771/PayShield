import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "./apiClient";
import GuardQRCode from "./GuardQRCode";
import PageHeader from "./components/PageHeader";
import EditGuardModal from "./components/EditGuardModal";
import ChangePayoutMethodModal from "./components/ChangePayoutMethodModal";
import BankDetailsModal from "./components/BankDetailsModal";

export default function Guards() {
  const [guards, setGuards] = useState([]);
  const [showQRFor, setShowQRFor] = useState(null);
  const [editGuard, setEditGuard] = useState(null);
  const [payoutGuard, setPayoutGuard] = useState(null);
  const [bankGuard, setBankGuard] = useState(null);

  const navigate = useNavigate();
  const qrRefs = useRef({});

  useEffect(() => {
    loadGuards();
  }, []);

  async function loadGuards() {
    const res = await api.get("/guards/bank-status");
    setGuards(res.data);
  }

  function toggleQR(id) {
    setShowQRFor(showQRFor === id ? null : id);
  }

  async function verifyBank(guardId) {
    if (!window.confirm("Verify this guard's bank details?")) return;
    await api.post(`/guards/${guardId}/verify-bank`);
    loadGuards();
  }

  async function unverifyBank(guardId) {
    if (!window.confirm("Mark this guard's bank details as unverified?")) return;
    await api.post(`/guards/${guardId}/unverify-bank`);
    loadGuards();
  }

  function renderBankStatus(guard) {
    if (guard.bank_status === "not_required") {
      return <div className="guard-status">Cash payout</div>;
    }

    if (guard.bank_status === "valid" && guard.bank_verified) {
      return (
        <div className="guard-status verified">
          ✔ Bank verified
          <button onClick={() => unverifyBank(guard.id)} style={{ marginLeft: 10 }}>
            Unverify
          </button>
        </div>
      );
    }

    return (
      <div className="guard-status unverified">
        ⏳ Bank unverified
        <button onClick={() => verifyBank(guard.id)} style={{ marginLeft: 10 }}>
          Verify
        </button>
      </div>
    );
  }

  function renderBankDetails(guard) {
    if (guard.bank_status === "not_required") return null;

    return (
      <div className="guard-bank-box">
        <div><strong>Bank:</strong> {guard.bank_name}</div>
        <div><strong>Account Holder:</strong> {guard.account_holder}</div>
        <div><strong>Account Type:</strong> {guard.account_type || "—"}</div>
        <div><strong>Branch Code:</strong> {guard.branch_code}</div>
        <div>
          <strong>Account Number:</strong> ****
          {String(guard.account_number).slice(-4)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto" }}>
      <PageHeader
        title="Guards"
        breadcrumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Guards" },
        ]}
        showBack
      />

      {guards.map((g) => {
        const isInactive = g.status === "inactive";

        return (
          <div
            key={g.id}
            className="guard-card"
            style={{ opacity: isInactive ? 0.6 : 1 }}
          >
            {/* Header */}
            <div className="guard-header">
              <div>
                <div className="guard-name">
                  {g.full_name}
                  {isInactive && (
                    <span style={{ color: "red", marginLeft: 8 }}>
                      (Inactive)
                    </span>
                  )}
                </div>
                <div className="guard-site">{g.site_location}</div>
              </div>
            </div>

            {renderBankStatus(g)}
            {renderBankDetails(g)}

            {/* Actions */}
            <div className="guard-actions">
              {!isInactive && (
                <>
                  <button className="primary" onClick={() => toggleQR(g.id)}>
                    {showQRFor === g.id ? "Hide QR Code" : "Show QR Code"}
                  </button>

                  <button onClick={() => qrRefs.current[g.id]?.download()}>
                    Download QR
                  </button>
                </>
              )}

              <button onClick={() => navigate(`/guards/${g.id}/history`)}>
                History
              </button>

              <button
		  onClick={async () => {
		    const res = await api.get("/guards");
		    const fullGuard = res.data.find(x => x.id === g.id);
		    setEditGuard(fullGuard);
		  }}
		>
		  Edit details
		</button>


              <button onClick={() => setPayoutGuard(g)}>
                Change payout method
              </button>

              {g.payout_method === "bank" && g.bank_status === "invalid" && (
                <button className="warn" onClick={() => setBankGuard(g)}>
                  Add / Update bank details
                </button>
              )}

              {g.payout_method === "bank" &&
                g.bank_status === "valid" &&
                g.bank_verified && (
                  <>
                    <button className="warn" onClick={() => setBankGuard(g)}>
                      Change bank details
                    </button>
                    <span style={{ fontSize: 12, color: "#a94442" }}>
                      Changing bank requires re-verification
                    </span>
                  </>
                )}
            </div>

            {showQRFor === g.id && !isInactive && (
              <GuardQRCode
                guard={g}
                ref={(el) => (qrRefs.current[g.id] = el)}
              />
            )}
          </div>
        );
      })}

      {/* Modals */}
      {editGuard && (
        <EditGuardModal
          guard={editGuard}
          onClose={() => setEditGuard(null)}
          onSaved={loadGuards}
        />
      )}

      {payoutGuard && (
        <ChangePayoutMethodModal
          guard={payoutGuard}
          onClose={() => setPayoutGuard(null)}
          onUpdated={loadGuards}
        />
      )}

      {bankGuard && (
        <BankDetailsModal
          guard={bankGuard}
          onClose={() => setBankGuard(null)}
          onSaved={loadGuards}
        />
      )}
    </div>
  );
}
