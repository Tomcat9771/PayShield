import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import api from "../api";

export default function PaymentHistory() {

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

    const res = await api.get(
      `/businesses/${business.id}/payments`
    );

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
return <div>Loading payments...</div>;
}

return (

<div style={{ padding: "30px" }}>

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
        <th style={{ padding: "10px" }}>Amount</th>
        <th style={{ padding: "10px" }}>Reference</th>
        <th style={{ padding: "10px" }}>Status</th>
      </tr>
    </thead>

    <tbody>

      {payments.map((p) => (

        <tr key={p.id} style={{ borderBottom: "1px solid #ddd" }}>

          <td style={{ padding: "10px" }}>
            {new Date(p.created_at).toLocaleString()}
          </td>

          <td style={{ padding: "10px" }}>
            R{Number(p.amount_gross).toFixed(2)}
          </td>

          <td style={{ padding: "10px" }}>
            {p.provider_ref || "-"}
          </td>

          <td style={{ padding: "10px" }}>
            {p.status}
          </td>

        </tr>

      ))}

    </tbody>

  </table>

</div>

);

}
