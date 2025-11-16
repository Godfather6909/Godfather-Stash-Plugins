// addIdtoScene.js
(function () {
  // Make sure the CommunityScripts UI lib is available
  if (typeof window.csLib === "undefined") {
    console.error("[Create Custom ID] csLib is not available. Is cs-ui-lib.js loaded before this script?");
    return;
  }

  const { PathElementListener, waitForElement } = window.csLib;

  // ---------------------------------------------------------------------------
  // Modal helpers
  // ---------------------------------------------------------------------------

  function ensureModalExists() {
    let modal = document.getElementById("custom-add-id-modal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "custom-add-id-modal";
    modal.className = "custom-id-modal-backdrop";

    modal.innerHTML = `
      <div class="custom-id-modal-content">
        <h5>Add Custom ID</h5>
        <div class="form-group">
          <label for="custom-id-instance-input">Instance</label>
          <input id="custom-id-instance-input" type="text" class="form-control" />
        </div>
        <div class="form-group">
          <label for="custom-id-value-input">ID</label>
          <input id="custom-id-value-input" type="text" class="form-control" />
        </div>
        <div class="custom-id-modal-footer">
          <button type="button" class="btn btn-secondary" id="custom-id-cancel-btn">Cancel</button>
          <button type="button" class="btn btn-primary" id="custom-id-ok-btn">OK</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Clicking outside the content closes the modal
    modal.addEventListener("click", (e) => {
      if (e.target === modal) hideModal();
    });

    const cancelBtn = modal.querySelector("#custom-id-cancel-btn");
    const okBtn = modal.querySelector("#custom-id-ok-btn");

    cancelBtn.addEventListener("click", hideModal);

    okBtn.addEventListener("click", () => {
      // NO functionality yet, just close the modal for UI testing
      // Later you can read:
      // const instance = document.getElementById("custom-id-instance-input").value;
      // const idVal   = document.getElementById("custom-id-value-input").value;
      hideModal();
    });

    return modal;
  }

  function showModal() {
    const modal = ensureModalExists();
    modal.classList.add("is-visible");

    // Clear previous values for testing
    const instanceInput = document.getElementById("custom-id-instance-input");
    const idInput = document.getElementById("custom-id-value-input");
    if (instanceInput) instanceInput.value = "";
    if (idInput) idInput.value = "";

    if (instanceInput) instanceInput.focus();
  }

  function hideModal() {
    const modal = document.getElementById("custom-add-id-modal");
    if (!modal) return;
    modal.classList.remove("is-visible");
  }

  // ---------------------------------------------------------------------------
  // Button injection
  // ---------------------------------------------------------------------------

  function insertAddIdButton() {
    // Avoid duplicates if navigation happens
    if (document.getElementById("custom-add-id-btn")) return;

    // Find the "Stash IDs" label and its form-group container
    const label = document.querySelector("label[for='stash_ids']");
    if (!label) {
      console.warn("[Create Custom ID] Could not find label[for='stash_ids']");
      return;
    }

    const formGroup = label.closest(".form-group");
    if (!formGroup || !formGroup.parentNode) {
      console.warn("[Create Custom ID] Could not find .form-group parent for stash_ids");
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "custom-id-add-wrapper";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "custom-add-id-btn";
    btn.className = "btn btn-sm btn-outline-primary";
    btn.textContent = "Add ID";

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      showModal();
    });

    wrapper.appendChild(btn);

    // Insert right after the entire "Stash IDs" form-group row
    formGroup.parentNode.insertBefore(wrapper, formGroup.nextSibling);

    // Make sure the modal exists at least once
    ensureModalExists();
  }

  function setupForSceneEdit() {
    // Wait until the "Stash IDs" label exists, then inject
    waitForElement("label[for='stash_ids']", () => {
      insertAddIdButton();
    });
  }

  // ---------------------------------------------------------------------------
  // Hook into Stash navigation: only on /scenes/
  // ---------------------------------------------------------------------------

  PathElementListener(
    "/scenes/",
    "[id*='-edit-details']",
    () => {
      setupForSceneEdit();
    }
  );
})();
