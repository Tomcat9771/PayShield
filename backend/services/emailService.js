import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendApprovalEmail(toEmail, businessName) {
  const payLink = `${process.env.FRONTEND_URL}/pay-registration`;

  await transporter.sendMail({
    from: `"PayShield" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: "Your PayShield Registration Has Been Approved",
    html: `
      <div style="font-family: Arial; padding: 20px;">
        <h2>Congratulations 🎉</h2>
        <p>Your business <strong>${businessName}</strong> has been approved.</p>
        <p>Please complete your R150 registration fee to activate your account.</p>
        <a href="${payLink}" 
           style="background:#6B1A7B; color:#F1C50E; padding:12px 24px; border-radius:30px; text-decoration:none;">
           Complete Payment
        </a>
        <p style="margin-top:20px;">– PayShield Team</p>
      </div>
    `,
  });
}