// addIdtoScene.js
(function () {
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

  function generateEndpointVariant(baseEndpoint, stashIds) {
    // Collect numeric suffixes already used for this base
    const used = new Set();
    for (const s of stashIds) {
      if (!s || typeof s.endpoint !== "string") continue;
      const ep = s.endpoint;
      if (!ep.startsWith(baseEndpoint)) continue;

      const suffix = ep.slice(baseEndpoint.length);
      if (suffix === "") {
        used.add(0);
      } else if (/^\d+$/.test(suffix)) {
        used.add(parseInt(suffix, 10));
      }
    }

    // Smallest non-negative integer not in `used`
    let n = 0;
    while (used.has(n)) n++;

    return baseEndpoint + (n === 0 ? "" : String(n));
  }

  function stashIdAlreadyExists(baseEndpoint, stash_id, stashIds) {
    // Don't add the same stash_id twice for the same "instance group"
    return stashIds.some(
      (s) =>
        typeof s.endpoint === "string" &&
        s.endpoint.startsWith(baseEndpoint) &&
        s.stash_id === stash_id
    );
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
          <input
            id="custom-id-instance-input"
            type="text"
            class="form-control"
            placeholder="https://stashdb.org/graphql"
          />
        </div>
        <div class="form-group">
          <label for="custom-id-value-input">ID</label>
          <input
            id="custom-id-value-input"
            type="text"
            class="form-control"
            placeholder="UUID or custom ID"
          />
        </div>
        <div class="custom-id-modal-footer">
          <button type="button" class="btn btn-secondary" id="custom-id-cancel-btn">Cancel</button>
          <button type="button" class="btn btn-primary" id="custom-id-ok-btn">OK</button>
        </div>
      </div>
    """

    document.body.appendChild(modal);

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

    const instanceInput = document.getElementById("custom-id-instance-input");
    const idInput = document.getElementById("custom-id-value-input");
    if (instanceInput && !instanceInput.value) {
      // Optional: default to local stash or a known instance
      instanceInput.value = "https://stashdb.org/graphql";
    }
    if (idInput) idInput.value = "";

    if (instanceInput) instanceInput.focus();
  }

  function hideModal() {
    const modal = document.getElementById("custom-add-id-modal");
    if (!modal) return;
    modal.classList.remove("is-visible");
  }

  // ---------------------------------------------------------------------------
  // OK button handler – now supports multiple IDs per "instance" via suffixes
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

    let baseEndpoint = (instanceInput?.value || "").trim();
    const stash_id = (idInput?.value || "").trim();

    if (!baseEndpoint || !stash_id) {
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

      // 2) Check if this ID already exists for this instance group
      if (stashIdAlreadyExists(baseEndpoint, stash_id, currentStashIds)) {
        console.info("[Create Custom ID] This stash ID already exists for that instance group.");
        hideModal();
        if (okBtn) {
          okBtn.disabled = false;
          okBtn.textContent = originalOkText;
        }
        if (cancelBtn) cancelBtn.disabled = false;
        return;
      }

      // 3) Generate a unique endpoint variant:
      //    base, base1, base2, ...
      const finalEndpoint = generateEndpointVariant(baseEndpoint, currentStashIds);
      const newEntry = { endpoint: finalEndpoint, stash_id };

      const updatedStashIds = [...currentStashIds, newEntry];

      // 4) Send mutation
      await updateSceneStashIds(sceneId, updatedStashIds);

      // 5) Reload so the standard Stash UI shows the new ID pill(s)
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
    if (document.getElementById("custom-add-id-btn")) return;

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
    formGroup.parentNode.insertBefore(wrapper, formGroup.nextSibling);
    ensureModalExists();
  }

  function setupForSceneEdit() {
    waitForElement("label[for='stash_ids']", () => {
      insertAddIdButton();
    });
  }

  PathElementListener(
    "/scenes/",
    "[id*='-edit-details']",
    () => {
      setupForSceneEdit();
    }
  );
})();
