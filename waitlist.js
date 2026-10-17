/* Fin City waitlist — shared by every signup box (<div class="waitlist">) on the site.
   Signups go to the "Fin-City Emails Waitlist" Google Form, so they land in its responses.
   To point at a different form: open its preview, right-click the email box > Inspect,
   copy the input's name (entry.123…), and update both values below. */

(function () {
  const WAITLIST = {
    formId: "1FAIpQLScb49oREfL_ngM_pm_mGpV1C_3gcPOmrBF-WBM0qRgeojWeDA",
    emailEntry: "entry.1524611244"
  };
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  document.querySelectorAll(".waitlist").forEach(box => {
    const form = box.querySelector(".wl-form");
    const input = form.querySelector("input[type=email]");
    const error = form.querySelector(".wl-error");
    const button = form.querySelector("button[type=submit]");
    const label = button.textContent;

    function finish() {
      box.querySelectorAll("[data-wl-hide]").forEach(el => { el.hidden = true; });
      form.hidden = true;
      const done = box.querySelector(".wl-done");
      done.hidden = false;
      done.focus();
    }

    form.addEventListener("submit", async e => {
      e.preventDefault();
      const email = input.value.trim();
      if (!EMAIL.test(email)) {
        input.setAttribute("aria-invalid", "true");
        error.textContent = "That doesn't look like an email address. Try again?";
        input.focus();
        return;
      }
      input.removeAttribute("aria-invalid");
      error.textContent = "";
      button.disabled = true;
      button.textContent = "Saving…";
      try {
        // Google Forms doesn't send CORS headers, so the response is opaque; a network failure still throws.
        await fetch("https://docs.google.com/forms/d/e/" + WAITLIST.formId + "/formResponse", {
          method: "POST",
          mode: "no-cors",
          body: new URLSearchParams({ [WAITLIST.emailEntry]: email })
        });
        finish();
      } catch (err) {
        error.textContent = "Couldn't reach the server. Check your connection and try again.";
        button.disabled = false;
        button.textContent = label;
      }
    });

    input.addEventListener("input", () => {
      if (input.getAttribute("aria-invalid")) { input.removeAttribute("aria-invalid"); error.textContent = ""; }
    });
  });
})();
