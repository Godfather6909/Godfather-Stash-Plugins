// addIdtoScene.js
(async () => {
  // Set up on scene edit pages, once the edit form exists.
  csLib.PathElementListener("/scenes/", "[id*='-edit-details']", () => {
    setupAddIdUI();
  });

  function setupAddIdUI() {
    const objID = window.location.pathname.split("/")[2];

    // Only show on existing scenes, not on "new"
    if (objID !== "new") {
      insertAddIdButton();
    }
  }

  function insertAddIdButton() {
    // Avoid duplicate buttons
    if (document.querySelector("button.customId-addButton") != null) {
      return;
    }

    const stashLabel = document.querySelector("label[for='stash_ids']");
    if (!stashLabel) return;

    const addButton = document.createElement("button");
    addButton.className = "customId-addButton btn btn-secondary";
    addButton.type = "button";
    addButton.innerText = "Add ID";
    addButton.onclick = (event) => {
      event.preventDefault();
      showModal();
    };

    // Append button to the Stash IDs label (same pattern as tag copy/paste)
    stashLabel.append(addButton);
  }

  // --- Modal helpers ------------------------------------------------------

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
          <button type="button" class="btn btn-secondary" id="custom-id-cancel-btn">
            Cancel
          </button>
          <button type="button" class="btn btn-primary" id="custom-id-ok-btn">
            OK
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Click outside content closes modal
    modal.addEventListener("click", (e) => {
      if (e.target === modal) hideModal();
    });

    const cancelBtn = modal.querySelector("#custom-id-cancel-btn");
    const okBtn = modal.querySelector("#custom-id-ok-btn");

    cancelBtn.addEventListener("click", hideModal);
    okBtn.addEventListener("click", () => {
      // For now: just close. You can log later for testing:
      // const instance = document.getElementById("custom-id-instance-input").value;
      // const idVal = document.getElementById("custom-id-value-input").value;
      // console.log("Instance:", instance, "ID:", idVal);
      hideModal();
    });

    return modal;
  }

  function showModal() {
    const modal = ensureModalExists();
    modal.style.display = "flex";

    // Reset fields
    const instanceInput = document.getElementById("custom-id-instance-input");
    const idInput = document.getElementById("custom-id-value-input");
    if (instanceInput) instanceInput.value = "";
    if (idInput) idInput.value = "";
    if (instanceInput) instanceInput.focus();
  }

  function hideModal() {
    const modal = document.getElementById("custom-add-id-modal");
    if (!modal) return;
    modal.style.display = "none";
  }
})();
