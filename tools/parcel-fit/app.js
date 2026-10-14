"use strict";

(function () {
  var CONTACT = "devin.gallemore@gmail.com";

  function clean(value, maxLength) {
    return String(value == null ? "" : value)
      .replace(/[\u0000-\u001F\u007F]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLength);
  }

  function buildRequest(values) {
    var fields = {
      name: clean(values.name, 100),
      email: clean(values.email, 150),
      role: clean(values.role, 60),
      region: clean(values.region, 150),
      use: clean(values.use, 180),
      property: clean(values.property, 320),
      acreage: clean(values.acreage, 80),
      notes: clean(values.notes, 900)
    };
    if (!fields.name || !fields.email || !fields.region || !fields.use) {
      throw new Error("Name, email, region and intended use are required.");
    }
    // The browser validates the email field before submission. The non-browser
    // contract deliberately fails closed for invalid addresses, too.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
      throw new Error("Enter a valid email address.");
    }
    var subject = "Parcel Fit pilot inquiry - " + fields.region.slice(0, 65);
    var lines = [
      "Hello,",
      "",
      "I'd like to discuss a scoped Parcel Fit desktop-screening pilot.",
      "",
      "Name: " + fields.name,
      "Email: " + fields.email,
      "I am a: " + (fields.role || "Not specified"),
      "Target area: " + fields.region,
      "Intended use: " + fields.use,
      "Property link / parcel ID: " + (fields.property || "Not selected yet"),
      "Land requirements: " + (fields.acreage || "Not specified"),
      "Important constraints: " + (fields.notes || "Not specified"),
      "",
      "Please confirm whether you can screen this project, the scope, price,",
      "and delivery timing before any payment.",
      "",
      "I understand this is desk research, not professional site approval."
    ];
    var body = lines.join("\n");
    return {
      subject: subject,
      body: body,
      email: CONTACT,
      mailto: "mailto:" + CONTACT + "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body)
    };
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { buildRequest: buildRequest, clean: clean };
  }
  if (typeof document === "undefined") return;

  var form = document.getElementById("request-form");
  var draft = document.getElementById("draft");
  var draftText = document.getElementById("draft-text");
  var emailLink = document.getElementById("send-email");
  var copyButton = document.getElementById("copy-request");
  var draftStatus = document.getElementById("draft-status");
  var printButton = document.getElementById("print-report");

  if (form && draft && draftText && emailLink && copyButton && draftStatus) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!form.reportValidity()) return;
      var entries = Object.fromEntries(new FormData(form).entries());
      try {
        var request = buildRequest(entries);
        draftText.value = "To: " + request.email + "\nSubject: " + request.subject + "\n\n" + request.body;
        emailLink.href = request.mailto;
        draft.hidden = false;
        draftStatus.textContent = "Prepared locally. Nothing has been sent. Use your email app to send the inquiry.";
        draft.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } catch (error) {
        draft.hidden = false;
        emailLink.removeAttribute("href");
        draftText.value = "";
        draftStatus.textContent = error.message || "Please review your fields.";
      }
    });
    form.addEventListener("input", function () {
      if (!draft.hidden) {
        draft.hidden = true;
        draftStatus.textContent = "";
        emailLink.removeAttribute("href");
      }
    });
    copyButton.addEventListener("click", async function () {
      var message = draftText.value;
      if (!message) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(message);
          draftStatus.textContent = "Request copied. Paste it into an email addressed to " + CONTACT + ".";
          return;
        } catch (error) {
          // Browsers may reject Clipboard API calls. Provide selectable text.
        }
      }
      draftText.focus();
      draftText.select();
      draftStatus.textContent = "Select and copy the highlighted request, then email it to " + CONTACT + ".";
    });
  }

  if (printButton) {
    printButton.addEventListener("click", function () { window.print(); });
  }
})();
