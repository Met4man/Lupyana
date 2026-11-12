/**
 * Lupyana Polyclinic — enquiry form receiver
 * Google Apps Script web app that emails website enquiries to the clinic.
 *
 * Deploy from the clinic's own Google account (the one that owns
 * lupyanapolyclinicLPC@gmail.com) so MailApp can send from that mailbox.
 * See README.md in this folder for the click-by-click steps.
 */

var RECIPIENT = "lupyanapolyclinicLPC@gmail.com";
var SITE_NAME = "Lupyana Polyclinic";
var SITE_URL = "https://lupyanapolyclinic.co.tz";
var TIME_ZONE = "Africa/Dar_es_Salaam";
var MIN_SECONDS_BETWEEN_SENDS = 60;
var MAX_MESSAGE_LENGTH = 2000;

function doGet() {
  return ContentService.createTextOutput(
    SITE_NAME + " enquiry endpoint is running."
  ).setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    var data = parsePayload_(e);

    // Honeypot: bots fill the hidden "company" field. Pretend success.
    if (data.company) return respond_({ ok: true });

    var error = validate_(data);
    if (error) return respond_({ ok: false, error: error });

    var phoneKey = "enquiry_" + digits_(data.phone);
    var cache = CacheService.getScriptCache();
    if (cache.get(phoneKey)) {
      return respond_({ ok: false, error: "rate_limited" });
    }

    var when = Utilities.formatDate(new Date(), TIME_ZONE, "dd MMM yyyy, HH:mm");
    var subject =
      "Website enquiry — " +
      clean_(data.fullName, 80) +
      " — " +
      clean_(data.serviceLabel || data.service, 80);

    var body = [
      "New appointment enquiry from the " + SITE_NAME + " website.",
      "",
      "Sent: " + when + " (" + TIME_ZONE + ")",
      "Language: " + (data.language === "sw" ? "Swahili" : "English"),
      "",
      "Name: " + clean_(data.fullName, 120),
      "Phone / WhatsApp: " + clean_(data.phone, 40),
      "Preferred date: " + clean_(data.preferredDate, 20),
      "Preferred time: " + (clean_(data.preferredTime, 20) || "Not specified"),
      "Service: " + clean_(data.serviceLabel || data.service, 120),
      "",
      "Message:",
      clean_(data.message, MAX_MESSAGE_LENGTH) || "(none)",
      "",
      "Page: " + clean_(data.page, 300),
      "",
      "Reply to this email or call the number above. The website form does",
      "not collect medical history, diagnoses or prescriptions."
    ].join("\n");

    var html =
      '<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;color:#0f2a2a">' +
      '<h2 style="margin:0 0 4px;color:#0b5d5a">New website enquiry</h2>' +
      '<p style="margin:0 0 18px;color:#4b6363">' +
      escapeHtml_(when) +
      " · " +
      (data.language === "sw" ? "Swahili" : "English") +
      "</p>" +
      table_([
        ["Name", clean_(data.fullName, 120)],
        ["Phone / WhatsApp", clean_(data.phone, 40)],
        ["Preferred date", clean_(data.preferredDate, 20)],
        ["Preferred time", clean_(data.preferredTime, 20) || "Not specified"],
        ["Service", clean_(data.serviceLabel || data.service, 120)]
      ]) +
      '<p style="margin:16px 0 4px;font-weight:bold">Message</p>' +
      '<p style="margin:0;white-space:pre-wrap">' +
      escapeHtml_(clean_(data.message, MAX_MESSAGE_LENGTH) || "(none)") +
      "</p>" +
      '<p style="margin:20px 0 0;color:#4b6363;font-size:12px">Sent from ' +
      escapeHtml_(SITE_URL) +
      " · " +
      escapeHtml_(clean_(data.page, 300)) +
      "</p></div>";

    MailApp.sendEmail({
      to: RECIPIENT,
      subject: subject,
      body: body,
      htmlBody: html
    });

    cache.put(phoneKey, "1", MIN_SECONDS_BETWEEN_SENDS);
    return respond_({ ok: true });
  } catch (error) {
    console.error("Enquiry failed: " + (error && error.stack ? error.stack : error));
    return respond_({ ok: false, error: "server_error" });
  }
}

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */

function parsePayload_(e) {
  var raw = "";
  if (e && e.postData && e.postData.contents) raw = e.postData.contents;
  else if (e && e.parameter && e.parameter.payload) raw = e.parameter.payload;

  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch (error) {
    // A normal HTML form post (application/x-www-form-urlencoded) also works.
    return (e && e.parameter) || {};
  }
}

function validate_(data) {
  if (!clean_(data.fullName, 120)) return "name_required";
  if (digits_(data.phone).length < 7) return "phone_required";
  if (!clean_(data.preferredDate, 20)) return "date_required";
  if (!clean_(data.service, 80)) return "service_required";
  if (data.consent !== true && data.consent !== "true" && data.consent !== "on") {
    return "consent_required";
  }
  return "";
}

function clean_(value, limit) {
  return String(value == null ? "" : value)
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, limit || 200);
}

function digits_(value) {
  return String(value == null ? "" : value).replace(/\D/g, "");
}

function escapeHtml_(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function table_(rows) {
  return (
    '<table style="border-collapse:collapse;width:100%">' +
    rows
      .map(function (row) {
        return (
          '<tr>' +
          '<td style="padding:6px 12px 6px 0;color:#4b6363;vertical-align:top;white-space:nowrap">' +
          escapeHtml_(row[0]) +
          "</td>" +
          '<td style="padding:6px 0;font-weight:bold">' +
          escapeHtml_(row[1]) +
          "</td>" +
          "</tr>"
        );
      })
      .join("") +
    "</table>"
  );
}

function respond_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}
