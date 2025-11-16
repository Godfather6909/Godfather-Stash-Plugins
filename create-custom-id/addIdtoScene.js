// addIdtoScene.js
(function () {
  // --- helpers -------------------------------------------------------------

  function findStashIdsFormGroup() {
    const label = document.querySelector('label[for="stash_ids"]');
    if (!label) return null;
    return label.closest('.form-group');
  }

  function ensureModalExists() {
    let modal = document.getElementById('custom-add-id-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'custom-add-id-modal';
    modal.className = 'custom-id-modal-backdrop';

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
    modal.addEventListener('click', function (e) {
      if (e.target === modal) {
        hideModal();
      }
    });

    const cancelBtn = modal.querySelector('#custom-id-cancel-btn');
    const okBtn = modal.querySelector('#custom-id-ok-btn');

    cancelBtn.addEventListener('click', hideModal);
    okBtn.addEventListener('click', function () {
      // No functionality yet – just close the modal.
      // For later testing you can uncomment:
      // const instance = document.getElementById('custom-id-instance-input').value;
      // const idVal = document.getElementById('custom-id-value-input').value;
      // console.log('Instance:', instance, 'ID:', idVal);
      hideModal();
    });

    return modal;
  }

  function showModal() {
    const modal = ensureModalExists();
    modal.style.display = 'flex';

    // Clear previous values each time we open
    const instanceInput = document.getElementById('custom-id-instance-input');
    const idInput = document.getElementById('custom-id-value-input');
    if (instanceInput) instanceInput.value = '';
    if (idInput) idInput.value = '';

    if (instanceInput) instanceInput.focus();
  }

  function hideModal() {
    const modal = document.getElementById('custom-add-id-modal');
    if (!modal) return;
    modal.style.display = 'none';
  }

  function injectButton() {
    // Avoid duplicates
    if (document.getElementById('custom-add-id-btn')) return;

    const formGroup = findStashIdsFormGroup();
    if (!formGroup || !formGroup.parentNode) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'custom-id-add-wrapper';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'custom-add-id-btn';
    btn.className = 'btn btn-sm btn-outline-primary';
    btn.textContent = 'Add ID';

    btn.addEventListener('click', showModal);

    wrapper.appendChild(btn);

    // Insert right after the whole Stash IDs form group
    formGroup.parentNode.insertBefore(wrapper, formGroup.nextSibling);
  }

  function init() {
    // Try immediately
    if (findStashIdsFormGroup()) {
      injectButton();
      return;
    }

    // If not present yet, poll a few times (simple and good enough for testing)
    let attempts = 0;
    const maxAttempts = 20;
    const interval = setInterval(function () {
      attempts++;
      if (findStashIdsFormGroup()) {
        injectButton();
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
