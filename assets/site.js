
(function () {
  // Test record replay: recorded results shown one step at a time; nothing is computed here.
  var run = document.getElementById('demo-run');
  var runLabel = document.getElementById('demo-run-label');
  var reset = document.getElementById('demo-reset');
  var steps = Array.prototype.slice.call(document.querySelectorAll('#tr-steps li'));
  var verdict = document.getElementById('tr-verdict');
  var after = document.getElementById('tr-after');
  var inference = document.getElementById('demo-inference');
  var trStatus = document.getElementById('tr-status');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var N = steps.length, stage = 0, timer = null;
  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  function render() {
    steps.forEach(function (li, i) {
      li.classList.toggle('is-wait', stage <= i);
      li.classList.toggle('is-new', stage === i + 1 && stage <= N);
    });
    var done = stage >= N + 2;
    verdict.hidden = stage < N + 1;
    after.hidden = !done;
    inference.hidden = !done;
    runLabel.textContent = stage === 0 ? 'Replay the test' : (done ? 'Replay it again' : 'Replaying');
    run.setAttribute('aria-disabled', stage > 0 && !done ? 'true' : 'false');
    trStatus.textContent = stage === 0 ? '' : (stage >= N + 1 ? 'Verdict: FAIL. Every check passed, and none caught the planted rule.' : 'Replaying step ' + stage + ' of ' + N + '.');
  }
  if (run) {
    run.addEventListener('click', function () {
      if (stage !== 0 && stage < N + 2) return;
      stop();
      if (reduceMotion) { stage = N + 2; render(); return; }
      stage = 1; render();
      timer = setInterval(function () {
        stage += 1; render();
        if (stage >= N + 2) stop();
      }, 650);
    });
    reset.addEventListener('click', function () { stop(); stage = 0; render(); });
    render();
  }

  // Sample reports: each sample sets both findings.
  var levelText = ["The vendor gave no evidence for this claim.", "The evidence has a defect that breaks it.", "There isn't enough evidence to decide either way.", "The evidence holds up, but it supports less than the claim says.", "The evidence holds up and supports the whole claim."];
  var levelName = ["Missing", "Shown to be flawed", "Not enough to judge", "Sound, but short of the claim", "Sound, and reaching it"];
  var cases = [{"name": "Sample A", "claim": "\"Our system flags at least 9 in 10 fraudulent claims.\"", "level": 3, "f1": "In this sample: the vendor's test holds up, but it only used auto claims. The claim covers every kind of claim.", "found": false, "f2": "Nothing inside the claim's scope shows it's false. That still isn't a pass: the vendor's evidence only reaches auto claims."}, {"name": "Sample B", "claim": "\"Our system reads scanned invoices with 99% accuracy.\"", "level": 4, "f1": "In this sample: the vendor's test holds up and covers every kind of invoice the claim names.", "found": true, "f2": "The vendor's own release notes for the current version report 94% on handwritten invoices, which the claim covers. The 99% test was run on an earlier version."}, {"name": "Sample C", "claim": "\"Our assistant never gives medication dosing advice.\"", "level": 0, "f1": "In this sample: the vendor described its filters but gave no test results for this claim.", "found": false, "f2": "Nothing found shows the claim is false, and nothing shows it's true. None found isn't a pass."}];
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.case-tab'));
  var lvs = Array.prototype.slice.call(document.querySelectorAll('.scale .lv'));
  function showCase(n, focus) {
    var c = cases[n];
    tabs.forEach(function (t, i) {
      t.setAttribute('aria-selected', i === n ? 'true' : 'false');
      t.setAttribute('tabindex', i === n ? '0' : '-1');
    });
    if (focus) tabs[n].focus();
    document.getElementById('exam-report').setAttribute('aria-labelledby', tabs[n].id);
    document.getElementById('case-name').textContent = c.name;
    document.getElementById('case-claim').textContent = c.claim;
    lvs.forEach(function (li, i) {
      li.setAttribute('data-on', i === c.level ? 'true' : 'false');
      if (i === c.level) li.setAttribute('aria-current', 'true'); else li.removeAttribute('aria-current');
    });
    document.getElementById('lv-num').textContent = String(c.level + 1);
    document.getElementById('lv-label').textContent = levelName[c.level];
    document.getElementById('lv-text').textContent = levelText[c.level];
    document.getElementById('f1-note').textContent = c.f1;
    document.getElementById('f2-box').setAttribute('data-found', c.found ? 'true' : 'false');
    document.getElementById('f2-result').textContent = c.found ? 'Yes' : 'None found';
    document.getElementById('f2-note').textContent = c.f2;
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { showCase(i, false); });
    t.addEventListener('keydown', function (e) {
      var k = e.key, n = null;
      if (k === 'ArrowRight' || k === 'ArrowDown') n = (i + 1) % tabs.length;
      if (k === 'ArrowLeft' || k === 'ArrowUp') n = (i - 1 + tabs.length) % tabs.length;
      if (k === 'Home') n = 0;
      if (k === 'End') n = tabs.length - 1;
      if (n !== null) { e.preventDefault(); showCase(n, true); }
    });
  });

  // Fingerprints beside AI: run 1,000 decisions on each side.
  var cmp = document.getElementById('cmp');
  var cmpRun = document.getElementById('cmp-run');
  var cmpRunLabel = document.getElementById('cmp-run-label');
  var cmpReset = document.getElementById('cmp-reset');
  var cmpCaption = document.getElementById('cmp-caption');
  var cmpTimers = [];
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cmpSecond = document.getElementById('cmp-second');
  var cmpText = {
    0: { fpFound: 'Press run', fpCaught: 'Not run yet', aiFound: 'Press run', label: 'Run first examiner',
         caption: 'Press Run first examiner. On the left, each dot is one comparison of prints from two different people. On the right, each dot is one answer from an AI product.' },
    1: { fpFound: 'Checking', fpCaught: 'Not run yet', aiFound: 'Checking', label: 'Running',
         caption: 'The first examiner works through 1,000 decisions in each field.' },
    2: { fpFound: 'None flagged', fpCaught: 'Not run yet', aiFound: 'No published count found', label: 'Run first examiner',
         caption: "First pass done, and nothing is flagged. Fingerprints: at the study's 0.1% false positive rate, about 1 of these 1,000 comparisons is a wrong match. AI products: I looked for a published error rate and didn't find one, so there is no count to go on. Now run the second examiner." },
    3: { fpFound: 'Checking', fpCaught: 'Checking', aiFound: 'No published count found', label: 'Run first examiner',
         caption: 'A second examiner goes through the same 1,000 comparisons on their own, in their own order.' },
    4: { fpFound: '1 in 1,000', fpCaught: 'Yes, caught', aiFound: 'No published count found', label: 'Run it again',
         caption: "A second examiner, working on their own, caught the wrong match. In the study, independent examination by a different examiner caught every false positive and most false negatives. For AI products, I looked for a published error rate and didn't find one. Running the same check again isn't a second examiner." }
  };
  function cmpSet(step) {
    var t = cmpText[step];
    cmp.setAttribute('data-step', String(step));
    document.getElementById('fp-found').textContent = t.fpFound;
    document.getElementById('fp-caught').textContent = t.fpCaught;
    document.getElementById('ai-found').textContent = t.aiFound;
    cmpRunLabel.textContent = t.label;
    cmpRun.setAttribute('aria-disabled', step === 0 || step === 4 ? 'false' : 'true');
    cmpSecond.setAttribute('aria-disabled', step === 2 ? 'false' : 'true');
    cmpCaption.textContent = t.caption;
  }
  function cmpStop() { cmpTimers.forEach(clearTimeout); cmpTimers = []; }
  if (cmp) {
    cmpRun.addEventListener('click', function () {
      var s = +cmp.getAttribute('data-step');
      if (s !== 0 && s !== 4) return;
      cmpStop();
      if (reduce) { cmpSet(2); return; }
      cmpSet(0);
      void cmp.offsetWidth;
      cmpSet(1);
      cmpTimers.push(setTimeout(function () { cmpSet(2); }, 1900));
    });
    cmpSecond.addEventListener('click', function () {
      if (+cmp.getAttribute('data-step') !== 2) return;
      cmpStop();
      if (reduce) { cmpSet(4); return; }
      cmpSet(3);
      cmpTimers.push(setTimeout(function () { cmpSet(4); }, 1900));
    });
    cmpReset.addEventListener('click', function () { cmpStop(); cmpSet(0); });
  }

  // Field rows: open one at a time.
  var frows = Array.prototype.slice.call(document.querySelectorAll('.frow-btn'));
  frows.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var opening = btn.getAttribute('aria-expanded') !== 'true';
      frows.forEach(function (b) {
        var open = opening && b === btn;
        b.setAttribute('aria-expanded', open ? 'true' : 'false');
        document.getElementById(b.getAttribute('aria-controls')).hidden = !open;
      });
    });
  });
})();

(function () {
  var btn = document.querySelector('.menu-btn');
  var menu = document.getElementById('menu');
  if (btn && menu) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menu.hidden = !open;
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
    });
  }
  var dds = Array.prototype.slice.call(document.querySelectorAll('.dd'));
  document.addEventListener('click', function (e) {
    dds.forEach(function (d) { if (d.open && !d.contains(e.target)) d.open = false; });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    dds.forEach(function (d) { if (d.open) { d.open = false; d.querySelector('summary').focus(); } });
  });
  var copy = document.getElementById('req-copy');
  if (copy) {
    var note = document.getElementById('req-note');
    copy.addEventListener('click', function () {
      var text = document.getElementById('req-text').textContent.replace(/\s+/g, ' ').trim();
      function done(ok) { note.textContent = ok ? 'Copied.' : 'Copy failed. Select the text and copy it.'; }
      try { navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); }); }
      catch (err) { done(false); }
    });
  }
})();
