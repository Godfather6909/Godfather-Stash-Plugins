// addIdtoScene.js
(function () {
  // Make sure the CommunityScripts UI lib is available
  if (typeof window.csLib === "undefined") {
    console.error("[Create Custom ID] csLib is not available. Is cs-ui-lib.js loaded before this script?");
    return;
  }

  const { PathElementListener, waitForElement, callGQL } = window.csLib;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function getSceneIdFromPath() {
    // Handles /scenes/123 or /scenes/123/edit
    const parts = window.location.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf("scenes");
    if (idx !== -1 && parts.length > idx + 1) {
      return parts[idx + 1];
    }
    // older/simple style: /scenes/123
    if (parts[0] === "scenes" && parts[1]) {
      return parts[1];
    }
    return null;
  }

  async function fetchSceneStashIds(sceneId) {
    const query = `
      query GetSceneStashIds($id: ID!) {
        findScene(id: $id) {
          id
          stash_ids {
            endpoint
            stash_id
          }
        }
      }
    `;
    const variables = { id: sceneId };
    const data = await callGQL({ query, variables });

    return (data && data.findScene && data.findScene.stash_ids) || [];
  }

  async function updateSceneStashIds(sceneId, stashIds) {
    const query = `
      mutation SceneUpdate($input: SceneUpdateInput!) {
        sceneUpdate(input: $input) {
          id
          stash_ids {
            endpoint
            stash_id
          }
        }
      }
    `;
    const variables = {
      input: {
        id: sceneId,
        stash_ids: stashIds,
      },
    };

    return await callGQL({ query, variables });
  }

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
          <input id="custom-id-instance-input" type="text" class="form-control" placeholder="https://theporndb.net/graphql" />
        </div>
        <div class="form-group">
          <label for="custom-id-value-input">ID</label>
          <input id="custom-id-value-input" type="text" class="form-control" placeholder="UUID or custom ID" />
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
    okBtn.addEventListener("click", onOkClicked);

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
  // OK button handler (actual functionality)
  // ---------------------------------------------------------------------------

  async function onOkClicked(e) {
    e.preventDefault();

    const sceneId = getSceneIdFromPath();
    if (!sceneId) {
      console.error("[Create Custom ID] Could not determine scene ID from URL");
      alert("Could not determine scene ID.");
      return;
    }

    const instanceInput = document.getElementById("custom-id-instance-input");
    const idInput = document.getElementById("custom-id-value-input");

    const endpoint = (instanceInput?.value || "").trim();
    const stash_id = (idInput?.value || "").trim();

    if (!endpoint || !stash_id) {
      alert("Please fill in both Instance and ID.");
      return;
    }

    const modal = document.getElementById("custom-add-id-modal");
    const okBtn = modal?.querySelector("#custom-id-ok-btn");
    const cancelBtn = modal?.querySelector("#custom-id-cancel-btn");

    const originalOkText = okBtn ? okBtn.textContent : "";
    if (okBtn) {
      okBtn.disabled = true;
      okBtn.textContent = "Saving...";
    }
    if (cancelBtn) cancelBtn.disabled = true;

    try {
      // 1) Fetch existing stash_ids
      const currentStashIds = await fetchSceneStashIds(sceneId);

      // 2) Build new stash_ids array with the new one appended
      const newEntry = { endpoint, stash_id };

      // Optional: avoid exact duplicates
      const alreadyExists = currentStashIds.some(
        (s) => s.endpoint === endpoint && s.stash_id === stash_id
      );
      if (alreadyExists) {
        console.info("[Create Custom ID] This endpoint+ID pair already exists; skipping update.");
        hideModal();
        if (okBtn) {
          okBtn.disabled = false;
          okBtn.textContent = originalOkText;
        }
        if (cancelBtn) cancelBtn.disabled = false;
        return;
      }

      const updatedStashIds = [...currentStashIds, newEntry];

      // 3) Send mutation
      await updateSceneStashIds(sceneId, updatedStashIds);

      // 4) Reload so the standard Stash UI shows the new ID pill
      window.location.reload();
    } catch (err) {
      console.error("[Create Custom ID] Error while updating stash_ids:", err);
      alert("Failed to save custom ID. Check console for details.");
      if (okBtn) {
        okBtn.disabled = false;
        okBtn.textContent = originalOkText;
      }
      if (cancelBtn) cancelBtn.disabled = false;
    }
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
