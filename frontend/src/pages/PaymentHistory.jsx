import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import api from "../api";
import { useNavigate } from "react-router-dom";
import GoldButton from "../components/GoldButton";

export default function PaymentHistory() {

  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const loadPayments = async () => {

      try {

        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;

        if (!user) return;

        const { data: business } = await supabase
          .from("businesses")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!business) return;

        const res = await api.get(`/businesses/${business.id}/payments`);

        setPayments(res.data);

      } catch (err) {

        console.error(err);

      } finally {

        setLoading(false);

      }

    };

    loadPayments();

  }, []);

  if (loading) {
    return <div style={{ padding: "30px" }}>Loading payments...</div>;
  }

  return (

    <div style={{ padding: "30px" }}>

      <div style={{ marginBottom: "20px" }}>
        <GoldButton onClick={() => navigate("/dashboard")}>
          Return to Dashboard
        </GoldButton>
      </div>

      <h2>Payment History</h2>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: "20px"
        }}
      >

        <thead>
          <tr style={{ background: "#eee" }}>
            <th style={{ padding: "10px" }}>Date</th>
            <th style={{ padding: "10px" }}>Time</th>
            <th style={{ padding: "10px" }}>Gross Amount</th>
            <th style={{ padding: "10px" }}>Platform Fees</th>
            <th style={{ padding: "10px" }}>Net Amount</th>
            <th style={{ padding: "10px" }}>Reference</th>
            <th style={{ padding: "10px" }}>Status</th>
          </tr>
        </thead>

        <tbody>

          {payments.map((p) => {

            const dateObj = new Date(p.created_at);

            const gross = Number(p.amount_gross || p.amount || 0);
            const platformFee = Number(p.platform_fee || 0);
            const net = Number(p.amount_net || 0);

            return (

              <tr key={p.id} style={{ borderBottom: "1px solid #ddd" }}>

                <td style={{ padding: "10px" }}>
                  {dateObj.toLocaleDateString()}
                </td>

                <td style={{ padding: "10px" }}>
                  {dateObj.toLocaleTimeString()}
                </td>

                <td style={{ padding: "10px" }}>
                  R{gross.toFixed(2)}
                </td>

                <td style={{ padding: "10px" }}>
                  R{platformFee.toFixed(2)}
                </td>

                <td style={{ padding: "10px" }}>
                  R{net.toFixed(2)}
                </td>

                <td style={{ padding: "10px" }}>
                  {p.customer_reference || "Walk-in"}
                </td>

                <td style={{ padding: "10px" }}>
                  {p.provider_status || p.status}
                </td>

              </tr>

            );

          })}

        </tbody>

      </table>

    </div>

  );

}