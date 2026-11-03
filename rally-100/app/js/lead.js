/* RALLY 100: leader screens (placeholder until the leader build lands). */
(function () {
  var R = window.R100;
  R.screens['lead-queue'] = { mode: 'lead', wide: true, nav: 'lead', render: function () { return '<main class="screen"><h1>Queue</h1><p class="muted">Leader screens are being built.</p></main>'; } };
  R.screens['lead-reps'] = { mode: 'lead', wide: true, nav: 'lead', render: function () { return '<main class="screen"><h1>Reps</h1></main>'; } };
})();
