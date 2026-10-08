// Remove the legacy checkpoint overlay; session persistence is handled separately.
(() => {
  document.getElementById('slide-progress-checkpoint-banner')?.remove();
})();
