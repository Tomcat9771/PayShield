import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import html2canvas from "html2canvas";

const GuardQRCode = forwardRef(({ guard }, ref) => {
  const cardRef = useRef(null);

  // ✅ ALWAYS produce a valid absolute URL
  const qrValue =
    guard.qr_url && guard.qr_url.startsWith("http")
      ? guard.qr_url
      : `${window.location.origin}/pay/${guard.id}`;

  useImperativeHandle(ref, () => ({
    async download() {
      if (!cardRef.current) return;

      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });

      const image = canvas.toDataURL("image/png");
      const safeName = (guard.full_name || "Guard").replace(/\s+/g, "_");

      const link = document.createElement("a");
      link.href = image;
      link.download = `PayShield_${safeName}_QR.png`;
      link.click();
    },
  }));

  return (
    <div
      ref={cardRef}
      style={{
        width: 260,
        padding: 20,
        border: "3px solid #5b2d8b",
        borderRadius: 16,
        background: "#fff",
        marginTop: 12,
      }}
    >
      {/* LOGO */}
      <img
        src="/shieldpay-logo.png"
        alt="PayShield"
        style={{
          width: 90,
          display: "block",
          margin: "0 auto 12px",
        }}
      />

      {/* ✅ QR WRAPPER (THIS IS THE FIX) */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          margin: "12px 0",
        }}
      >
        <QRCodeCanvas
          value={qrValue}
          size={180}
          level="H"
          includeMargin
        />
      </div>

      {/* GUARD NAME */}
      <div
        style={{
          marginTop: 10,
          fontWeight: "bold",
          textAlign: "center",
        }}
      >
        {guard.full_name}
      </div>

      {/* LOCATION */}
      <div
        style={{
          fontSize: 13,
          color: "#666",
          textAlign: "center",
        }}
      >
        {guard.site_location}
      </div>

      <hr style={{ margin: "12px 0" }} />

      {/* FOOTER */}
      <div
        style={{
          fontSize: 11,
          color: "#777",
          textAlign: "center",
        }}
      >
        Hosted by Shields Consulting
        <br />
        www.shieldsconsulting.co.za
      </div>
    </div>
  );
});

export default GuardQRCode;
