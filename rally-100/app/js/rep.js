/* RALLY 100: rep screens (placeholder until the rep build lands). */
(function () {
  var R = window.R100;
  R.screens.onboarding = { mode: 'rep', bare: true, render: function () { return '<main class="ob"><h1>Rep screens are being built.</h1></main>'; } };
  R.screens.home = { mode: 'rep', nav: 'rep', render: function () { return '<main class="screen"><h1>My list</h1><p class="muted">Rep screens are being built.</p></main>'; } };
})();
