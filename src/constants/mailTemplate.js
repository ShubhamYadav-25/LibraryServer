export const verificationTemplate = ({
  name,
  verificationUrl,
}) => {

  return `
  <!DOCTYPE html>
  <html>

  <head>
    <meta charset="UTF-8" />

    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />

    <title>
      Verify Your Email
    </title>
  </head>

  <body
    style="
      margin:0;
      padding:0;
      background:#f4f4f4;
      font-family:Arial,sans-serif;
    "
  >

    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
    >
      <tr>
        <td align="center">

          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="
              background:#ffffff;
              margin:40px 0;
              padding:40px;
              border-radius:10px;
            "
          >

            <tr>
              <td>

                <h1
                  style="
                    color:#111827;
                    margin-bottom:20px;
                  "
                >
                  Verify Your Email
                </h1>

                <p
                  style="
                    color:#374151;
                    font-size:16px;
                    line-height:1.6;
                  "
                >
                  Hello ${name},
                </p>

                <p
                  style="
                    color:#374151;
                    font-size:16px;
                    line-height:1.6;
                  "
                >
                  Thank you for registering
                  for LibraryMS.
                </p>

                <p
                  style="
                    color:#374151;
                    font-size:16px;
                    line-height:1.6;
                  "
                >
                  Please verify your email
                  address by clicking the
                  button below.
                </p>

                <div
                  style="
                    margin:30px 0;
                    text-align:center;
                  "
                >

                  <a
                    href="${verificationUrl}"
                    style="
                      background:#2563eb;
                      color:#ffffff;
                      padding:14px 28px;
                      text-decoration:none;
                      border-radius:6px;
                      display:inline-block;
                      font-weight:bold;
                    "
                  >
                    Verify Email
                  </a>

                </div>

                <p
                  style="
                    color:#6b7280;
                    font-size:14px;
                  "
                >
                  This verification link
                  expires in 15 minutes.
                </p>

                <p
                  style="
                    color:#6b7280;
                    font-size:14px;
                  "
                >
                  If you did not create this
                  account, you can safely
                  ignore this email.
                </p>

              </td>
            </tr>

          </table>

        </td>
      </tr>
    </table>

  </body>
  </html>
  `;
};


export const welcomeTemplate = ({
  name,
}) => {

  return `
  <!DOCTYPE html>
  <html>

  <head>
    <meta charset="UTF-8" />

    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />

    <title>
      Welcome to LibraryMS
    </title>
  </head>

  <body
    style="
      margin:0;
      padding:0;
      background:#f4f4f4;
      font-family:Arial,sans-serif;
    "
  >

    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
    >
      <tr>
        <td align="center">

          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="
              background:#ffffff;
              margin:40px 0;
              padding:40px;
              border-radius:10px;
            "
          >

            <tr>
              <td>

                <h1
                  style="
                    color:#111827;
                    margin-bottom:20px;
                    text-align:center;
                  "
                >
                  Welcome to LibraryMS 🎉
                </h1>

                <p
                  style="
                    color:#374151;
                    font-size:16px;
                    line-height:1.6;
                  "
                >
                  Hello ${name},
                </p>

                <p
                  style="
                    color:#374151;
                    font-size:16px;
                    line-height:1.6;
                  "
                >
                  Your email has been successfully verified.
                </p>

                <p
                  style="
                    color:#374151;
                    font-size:16px;
                    line-height:1.6;
                  "
                >
                  Your account is now active and you can
                  start using LibraryMS.
                </p>

                <div
                  style="
                    margin:30px 0;
                    text-align:center;
                  "
                >

                  <a
                    href="${process.env.FRONTEND_URL}"
                    style="
                      background:#2563eb;
                      color:#ffffff;
                      padding:14px 28px;
                      text-decoration:none;
                      border-radius:6px;
                      display:inline-block;
                      font-weight:bold;
                    "
                  >
                    Go to LibraryMS
                  </a>

                </div>

                <p
                  style="
                    color:#6b7280;
                    font-size:14px;
                    line-height:1.6;
                  "
                >
                  If you did not create this account,
                  please contact support immediately.
                </p>

                <hr
                  style="
                    border:none;
                    border-top:1px solid #e5e7eb;
                    margin:30px 0;
                  "
                />

                <p
                  style="
                    color:#9ca3af;
                    font-size:12px;
                    text-align:center;
                  "
                >
                  © ${new Date().getFullYear()} LibraryMS.
                  All rights reserved.
                </p>

              </td>
            </tr>

          </table>

        </td>
      </tr>
    </table>

  </body>
  </html>
  `;
};