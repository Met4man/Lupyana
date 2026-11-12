# Enquiry form — Google Apps Script setup

The appointment form posts to a Google Apps Script web app, which emails each
enquiry to **lupyanapolyclinicLPC@gmail.com**. WhatsApp stays the instant option
through the header button.

The site works before this is deployed: with no endpoint configured, the form
falls back to opening WhatsApp with the answers already filled in.

## Deploy once

1. Sign in to Google as the account that should **send** the enquiry emails.
   Use the clinic account (`lupyanapolyclinicLPC@gmail.com`) so the mail comes
   from the clinic's own mailbox.
2. Open <https://script.google.com> and choose **New project**.
3. Delete the sample `Code.gs` content and paste the contents of
   [`Code.gs`](./Code.gs) from this folder. Save the project as
   `Lupyana enquiry form`.
4. Click **Deploy → New deployment**.
   - Type: **Web app**
   - Description: `Lupyana website enquiry form`
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click **Deploy**. Google asks for authorisation:
   **Authorize access → choose the account → Advanced → Go to Lupyana enquiry
   form (unsafe) → Allow**. This warning is normal for a personal script; it is
   needed so the script can send email as you.
6. Copy the **Web app URL**. It ends in `/exec`, for example:
   `https://script.google.com/macros/s/AKfycb.../exec`
7. Paste that exact URL into **both** content files:
   - `content.json` → `"enquiryEndpoint": "https://script.google.com/macros/s/.../exec"`
   - `assets/js/content-data.js` → the same key (this is the `file://` fallback,
     so the two files must stay identical).
8. Reload `/appointment.html` and send a test enquiry. You should receive the
   email and then land on `/thank-you.html`.

## Updating the script later

1. Edit `Code.gs` in the Apps Script editor and save.
2. **Deploy → Manage deployments → Edit (pencil) → Version: New version →
   Deploy.** The `/exec` URL stays the same, so nothing on the site changes.

## Check it is running

Open the `/exec` URL in a browser. You should see:

> Lupyana Polyclinic enquiry endpoint is running.

## What the script does

- Accepts the JSON body the site sends as `text/plain` (this avoids the CORS
  preflight that Apps Script rejects).
- Silently ignores submissions that fill the hidden `company` honeypot.
- Validates name, phone, preferred date, service and consent.
- Throttles repeat sends from the same phone number for 60 seconds.
- Emails a plain-text and HTML version to the clinic, with the reply details.
- Returns JSON so the site can redirect to `thank-you.html` only on success.

## Limits and notes

- A free Gmail account can send roughly 100 emails per day through Apps Script;
  that is far above normal enquiry volume for the clinic.
- Anyone who knows the `/exec` URL can post to it. The honeypot, validation and
  per-phone throttle reduce abuse; the URL is not a secret and should not be
  treated as one.
- Do not add passwords or API keys to this script. It only needs `MailApp`.
- The privacy page already tells visitors that Google Apps Script delivers the
  form to the clinic's Gmail mailbox. Keep that copy in step with reality.
