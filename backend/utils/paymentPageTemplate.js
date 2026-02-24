export function paymentPage({ title, message, status }) {
  const color =
    status === "success"
      ? "#22c55e"
      : status === "error"
      ? "#ef4444"
      : "#f59e0b";

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <title>${title} | PayShield</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        margin: 0;
        font-family: Arial, sans-serif;
        background: linear-gradient(135deg, #4b0082, #2e0057);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
      }
      .card {
        background: white;
        color: #111;
        padding: 40px;
        border-radius: 16px;
        text-align: center;
        width: 90%;
        max-width: 420px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.2);
      }
      h1 {
        margin-top: 0;
        color: ${color};
      }
      .btn {
        display: inline-block;
        margin-top: 20px;
        padding: 12px 20px;
        background: #4b0082;
        color: white;
        text-decoration: none;
        border-radius: 8px;
        font-weight: bold;
      }
      .btn:hover {
        opacity: 0.9;
      }
      .logo {
        font-size: 20px;
        font-weight: bold;
        margin-bottom: 20px;
        color: #4b0082;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="logo">PayShield</div>
      <h1>${title}</h1>
      <p>${message}</p>
      <a class="btn" href="https://payshield.shieldsconsulting.co.za">
        Return to Dashboard
      </a>
    </div>
  </body>
  </html>
  `;
}

