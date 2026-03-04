import { QRCodeSVG } from "qrcode.react";

export default function BusinessQR({ code }) {
  return (
    <div style={{ textAlign: "center" }}>
      <QRCodeSVG
        value={code}
        size={220}
        bgColor="#ffffff"
        fgColor="#000000"
        level="H"
        includeMargin={true}
      />
      <p style={{ marginTop: 10, fontSize: 14 }}>
        {code}
      </p>
    </div>
  );
}