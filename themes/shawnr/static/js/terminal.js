/**
 * shawnrider.com — the whole site is a terminal
 */
(function () {
  'use strict';

  var output = document.getElementById('term-output');
  var input = document.getElementById('term-input');
  var hintsEl = document.getElementById('term-hints');
  var data = JSON.parse(document.getElementById('site-data').textContent.trim());
  var cmdHistory = [];
  var historyIdx = -1;
  var destroyed = false;

  // Card navigation
  var activeCards = [];
  var cardIdx = -1;
  var cardMode = false;

  // Wumpus game state
  var wumpusMode = false;
  var wumpusInstance = null;

  // Filesystem
  var cwd = '~';
  var cwdStack = ['~'];
  var dirCache = {}; // path -> { dirs: [...], files: [{name, ext, content?}] }

  // =========================================================================
  // Helpers
  // =========================================================================

  function line(text, cls) {
    var el = document.createElement('div');
    el.className = 'line' + (cls ? ' ' + cls : '');
    el.textContent = text || '';
    output.appendChild(el);
  }

  function htm(markup, cls) {
    var el = document.createElement('div');
    el.className = 'line' + (cls ? ' ' + cls : '');
    el.innerHTML = markup;
    output.appendChild(el);
  }

  function blank() { line('', 'line-blank'); }
  function rule() { line('\u2500'.repeat(56), 'line-rule'); }

  function lnk(url, label) {
    return '<a class="term-link" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(label || url) + '</a>';
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function scroll() { output.scrollTop = output.scrollHeight; }

  function prompt() { return esc(cwd) + '$'; }

  function setHints(items) {
    hintsEl.innerHTML = items.map(function (h) {
      return '<span><kbd>' + h[0] + '</kbd> ' + h[1] + '</span>';
    }).join('');
  }

  function defaultHints() {
    setHints([['Enter', 'run'], ['\u2191\u2193', 'history'], ['Ctrl+L', 'clear'], ['Tab', 'complete']]);
  }

  function cardHints() {
    setHints([['\u2191\u2193 / jk', 'navigate'], ['Enter', 'open'], ['Esc / q', 'back']]);
  }

  function pick(arr, n) {
    var s = arr.slice().sort(function () { return 0.5 - Math.random(); });
    return s.slice(0, n);
  }

  // =========================================================================
  // Card navigation
  // =========================================================================

  function enterCardMode() {
    activeCards = output.querySelectorAll('.term-card');
    if (!activeCards.length) return;
    cardMode = true;
    cardIdx = 0;
    focusCard(0);
    cardHints();
    input.blur();
  }

  function exitCardMode() {
    activeCards.forEach(function (c) { c.classList.remove('focused'); });
    cardMode = false;
    cardIdx = -1;
    activeCards = [];
    defaultHints();
    input.focus();
  }

  function focusCard(idx) {
    activeCards.forEach(function (c) { c.classList.remove('focused'); });
    if (activeCards[idx]) {
      activeCards[idx].classList.add('focused');
      activeCards[idx].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  function openCard(idx) {
    var card = activeCards[idx];
    if (!card) return;
    var a = card.querySelector('.term-link');
    if (a) window.open(a.href, '_blank');
  }

  // =========================================================================
  // Fake filesystem with persistent directories and readable .txt files
  // =========================================================================

  var dirNames = [
    'abandoned_drafts', 'analog_voltage_logs', 'backup_of_backup',
    'broken_promises', 'cold_storage', 'daemon_dreams',
    'dangerous_experiments', 'deleted_scenes', 'dev_null_but_worse',
    'do_not_open', 'dream_journal', 'dubplate_masters', 'dusty_floppy_images',
    'electric_sheep', 'emergency_riffs', 'encrypted_payloads',
    'failed_startups', 'forbidden_knowledge', 'forgotten_passwords',
    'future_plans_2009', 'ghost_in_the_machine', 'goto_considered_harmful',
    'half_finished_songs', 'here_be_dragons', 'hidden_tracks', 'html_crimes',
    'infinite_loop', 'knife_patterns', 'late_night_code',
    'lava_lamp_firmware', 'library_of_babel', 'lost_and_found',
    'midnight_oil', 'misc_misc_misc', 'mystery_meat_navigation',
    'never_gonna_deploy_this', 'node_modules_of_doom', 'old_myspace_page',
    'oops_all_segfaults', 'parallel_universe', 'perpetual_motion',
    'probably_fine', 'quantum_entanglements', 'questionable_decisions',
    'recursive_nightmares', 'revenge_of_the_semicolon', 'robot_uprising_plans',
    'secret_projects', 'sentient_css', 'skeleton_keys', 'sleep_debt',
    'spooky_action_at_a_distance', 'suspicious_binaries', 'temporal_anomalies',
    'the_good_timeline', 'the_other_shawn', 'the_void',
    'things_that_worked_once', 'titanium_dreams', 'todo_list_2014',
    'too_many_tabs', 'trap_door', 'unfinished_masterpiece',
    'unsent_letters', 'untitled_document_47', 'vinyl_rips',
    'void_pointer', 'weird_frequencies', 'wip_wip_wip', 'xanadu',
    'zero_day_stash', 'zombie_processes',
    // cultural refs
    'aperture_science_backups', 'deltron_3030_stems', 'night_city_saves',
    'vonnegut_quotes', 'lee_scratch_perry_dubs', 'augustus_pablo_riddims',
    'murderbot_diaries_fanfic', 'children_of_time_notes', 'balatro_strats',
    'conan_workout_plans', 'godzilla_sighting_logs', 'pbs_outtakes',
    'borges_labyrinths', 'neuromancer_highlights', 'tmbg_setlists',
    'buffalo_snowfall_data', 'pnw_mushroom_field_guide', 'diy_bench_plans',
    'skateboard_deck_designs', 'cuda_kernel_experiments', 'reggae_riddim_archive',
    'k8s_manifests_that_work', 'yaml_indentation_crimes', 'git_reflog_archaeology',
    'bash_one_liners', 'zsh_plugins_graveyard', 'python_venvs_forgotten',
    'node_modules_event_horizon', 'markdown_all_the_way_down',
    'saunders_marginalia', 'robert_e_howard_pulps', 'marlon_james_notes',
    'nnedi_okorafor_worlds', 'companion_cube_memorial'
  ];

  var weirdExts = [
    '.hex', '.bin', '.raw', '.mem', '.core', '.dump', '.sys',
    '.dat', '.key', '.sig', '.enc', '.tar.xz', '.img', '.iso',
    '.pcap', '.log.gz', '.bak', '.swap', '.pid', '.lock',
    '.conf.d', '.rc', '.ini.old', '.patch', '.diff',
    '.eldritch', '.glitch', '.quantum', '.void', '.null',
    '.wasm', '.so', '.dylib', '.o', '.elf',
    '.riff', '.dub', '.punk', '.voltage', '.titanium',
    '.anodized', '.tempered', '.forged', '.patina'
  ];

  var fileStems = [
    'README', 'DONT_README', 'config', 'secrets', 'mixtape_v3',
    'fix_later', 'the_truth', 'shopping_list', 'why_is_this_here',
    'haiku', 'cat_photos', 'unfinished_novel_ch1', 'abandoned_thesis',
    'budget_2019', 'knife_heat_treat_log', 'weird_sound_3am',
    'core_dump', 'last_css_file_ever', 'please_work',
    'import_antigravity', 'hello_world_but_sad', 'Makefile',
    'existential_crisis', 'env_production_oops', 'glitch_art_001',
    'voltage_calibration', 'sourdough_schedule', 'definitely_not_a_rootkit',
    'plan_b', 'plan_c', 'plan_zz', 'last_resort',
    'the_sound_of_one_hand_coding', 'recursive_feelings',
    'midnight_thought', 'shower_argument_winner', 'letter_to_younger_me',
    'things_i_should_have_said', 'portal_test_results',
    'cake_recipe_CLASSIFIED', 'balatro_seed_notes', 'vampire_hunter_gear_list',
    'deltron_3030_tracklist', 'slaughterhouse_five_annotations',
    'dub_delay_settings', 'skateboard_bearing_specs',
    'cuda_benchmark', 'godzilla_evacuation_plan', 'mushroom_log_pnw',
    'murderbot_performance_review', 'children_of_time_spiders',
    'buffalo_winters_survival_guide', 'companion_cube_eulogy',
    'deployment_yaml_v47', 'git_stash_pop_regrets', 'kubectl_cheatsheet',
    'python_repl_history_3am', 'package_lock_diff_4000_lines',
    'zshrc_over_engineered', 'bashrc_from_2011_still_works',
    'markdown_resume_draft_12'
  ];

  var txtContents = [
    'the algorithm knows what you did last summer.\nit has opinions.\nthey are not favorable.',
    'dear future me,\n\nplease finish this.\n\nlove,\npast me\n\nps: you won\'t.',
    'INGREDIENTS:\n- 1 mass of tangled cables\n- 3 mass of self-doubt\n- a mass of caffeine\n\nINSTRUCTIONS:\nmix until 3am. serve with regret.',
    'things I have learned:\n1. CSS is not your friend\n2. CSS is not your enemy\n3. CSS is an entity beyond morality\n4. respect the cascade',
    'the server room hums at 3am\nthe lights blink in morse code\n"help"\n"help"\n"help"',
    'title: unfinished novel, chapter 1\n\nIt was a dark and stormy deployment.\n\n[the rest of this file has been corrupted]',
    'MEETING NOTES 2019-03-14:\n- discussed the thing\n- decided not to do the thing\n- scheduled meeting to discuss why we didn\'t do the thing\n- the thing remains undone',
    'heat treat log:\n  1. heat titanium to 900F\n  2. quench in the tears of your enemies\n  3. temper at 400F for 1 hour\n  4. anodize with 90V\n  5. admire the colors\n  6. repeat forever',
    'haiku:\n\nsyntax error found\nthe semicolon was there\nit was the wrong line',
    'TODO:\n  [ ] finish the website\n  [ ] learn to rest\n  [ ] update this list\n  [x] make a todo list\n  [ ] stop making todo lists',
    'the password is ********\n\njust kidding. there is no password.\nthere never was a password.\nthe door was always open.',
    'FIELD NOTES:\n\nthe game of life runs behind everything.\nmost people never notice.\nthe ones who do tend to stay a while.',
    'letter to the void:\n\nhi. it\'s me. again.\ni made another website.\nthis one is a terminal.\ni know.\n\nanyway,\nshawn',
    'you found a secret file!\n\n...but the secret is that there is no secret.\nthe real treasure was the commands you typed along the way.',
    'three chords and the truth:\nE - A - B\nrepeat until free.',
    'INCIDENT REPORT:\ndate: every day\nincident: shipped code to production\nresolution: we got lucky. again.',
    'the web was better in 1996.\nor maybe I was better in 1996.\neither way, something has changed\nand it\'s not the <marquee> tag.',
    'the cake is a lie.\nthe cake was always a lie.\nbut the testing protocol is real\nand you are doing very well.',
    'BALATRO RUN NOTES:\n  seed: 4DMNT9\n  deck: abandoned\n  jokers: misprint, wrathful, sly\n  result: lost to the boss blind.\n  again.\n  always the boss blind.',
    'things Lee "Scratch" Perry taught me:\n  1. the studio is an instrument\n  2. reverb is a dimension\n  3. you are already in the dub\n  4. the dub is in you',
    '"I tell you, we are here on Earth to fart around,\nand don\'t let anybody tell you different."\n\n- Kurt Vonnegut\n\n[taped to the monitor since 2007]',
    'DELTRON 3030 — THINGS I STILL THINK ABOUT:\n  - "upgrade your gray matter, one day it may matter"\n  - the year 3030 is only 1004 years away\n  - Del was right about the corporations\n  - Automator was right about the beats',
    'vampire hunter loadout:\n  silver stakes: 12\n  garlic: 3 cloves (also for cooking)\n  holy water: 1 flask (suspicious origin)\n  crossbow: borrowed, needs return\n  confidence: low',
    'SEATTLE FIELD NOTES:\n  it is raining.\n  it has been raining.\n  it will continue to rain.\n  this is fine. the moss is beautiful.\n  the coffee is necessary.',
    'BUFFALO FIELD NOTES:\n  the lake effect snow is 4 feet deep.\n  the chicken wings are perfect.\n  the people are unreasonably kind.\n  the Bills are going to win this year.\n  (this note has been here since 2003.)',
    'Murderbot says:\n  "I could have become a mass murderer after I\n  hacked my governor module, but then I realized\n  I could access the combined media feeds of\n  35,000 hours of entertainment."\n\nsame, honestly.',
    'CONAN THE BARBARIAN — THINGS THAT ARE BEST IN LIFE:\n  1. to crush your enemies\n  2. to see them driven before you\n  3. to hear the lamentation of their CI/CD pipelines',
    'Augustus Pablo\'s melodica drifts through\nthe server room at midnight.\nthe packets slow down.\nthey want to listen too.',
    '"The universe is made of stories, not of atoms."\n- Muriel Rukeyser\n\nbut also atoms. the atoms are important.\nespecially the titanium ones.',
    'NVIDIA CUDA notes:\n  the GPU has more cores than I have brain cells\n  after 3am, this ratio gets worse\n  the tensors are tensing\n  the kernels are coloneling\n  ship it',
    'PBS pledge drive transcript (REDACTED):\n  "if everyone watching gave just $5..."\n  [TAPE DEGRADES]\n  "...and that\'s how we saved public media"\n  [audience applause, possibly canned]',
    'George Saunders wrote:\n  "What I regret most in my life are\n  failures of kindness."\n\nI think about this while debugging.\nI try to be kind to the code.\nThe code is not kind back.',
    'reading list (never finished):\n  Borges - Labyrinths [pg 47, lost]\n  Marlon James - Black Leopard, Red Wolf [pg 200, scared]\n  Nnedi Okofor - Lagoon [finished! once.]\n  Neuromancer - every year, like scripture\n  Children of Time - the spiders are sympathetic\n  Robert E. Howard - Conan stories [comfort reading]',
    'THEY MIGHT BE GIANTS setlist (ideal):\n  1. Birdhouse in Your Soul\n  2. Istanbul (Not Constantinople)\n  3. Particle Man\n  4. Don\'t Let\'s Start\n  5. Ana Ng\n  encore: the entire Flood album\n  encore 2: just keep playing forever',
    'the skateboard in the garage has flat spots\non every wheel. it still rolls.\nit still rolls.\nthat\'s the thing about skateboards.',
    'CYBERPUNK 2077 save file corrupted.\njust like night city intended.\nthe real bug was the friends we made\nin the process of filing JIRA tickets.',
    'Godzilla is not the monster.\nGodzilla is the response to the monster.\nGodzilla is what happens when\nyou build nuclear reactors on fault lines\nand the earth has opinions about it.',
    'DIY BENCH NOTES:\n  cut twice, measure once. wait.\n  the wood glue takes 24 hours.\n  patience is the hardest tool.\n  the dovetails are not great\n  but they are mine.',
    'YAML INCIDENT LOG:\n  - indentation was 3 spaces instead of 2\n  - kubernetes rejected the manifest\n  - the pod crashed\n  - the node crashed\n  - the cluster crashed\n  - I switched to JSON for 10 minutes\n  - I switched back. YAML is fine. YAML is fine.',
    'git log --oneline --all --graph\n  * 4a2f1b3 fix the fix\n  * 9c8d7e6 fix\n  * 1b2a3c4 this should work\n  * 5d6e7f8 why doesn\'t this work\n  * 0a1b2c3 initial commit (perfect, all downhill from here)',
    'kubernetes haiku:\n\npod evicted again\nthe node was under pressure\nOOMKilled, always',
    'PYTHON REPL AT 3AM:\n  >>> import this\n  Beautiful is better than ugly.\n  >>> # yes but have you seen my code\n  >>> exit()\n  >>> # wait I need to check one more thing\n  >>> # it is now 5am',
    'things javascript has taught me:\n  1. === is not ==\n  2. null is not undefined\n  3. NaN is not NaN\n  4. [] + [] is ""\n  5. [] + {} is "[object Object]"\n  6. {} + [] is 0\n  7. trust nothing',
    '.zshrc excerpt:\n  # added 2019, don\'t remember why\n  alias yolo="git push --force"\n  # added 2020, definitely remember why\n  alias nope="git reset --hard HEAD~1"\n  # added 2023\n  alias friday="kubectl delete pod --all"',
    'bash one-liner hall of fame:\n  find . -name "*.log" -mtime +30 -delete\n  # deleted production logs. on purpose. it was fine.\n  # (it was not fine.)',
    'git stash list:\n  stash@{0}: WIP on main: the thing I was working on\n  stash@{1}: WIP on main: the other thing\n  stash@{2}: WIP on main: I don\'t remember\n  stash@{3}: WIP on main: this one is important DO NOT DROP\n  stash@{47}: WIP on main: here be dragons',
    'markdown is just HTML for people\nwho have opinions about whitespace.\n\nI am one of those people.\n\n---\n\n*this file is, of course, in markdown.*'
  ];

  function generateDir(path) {
    if (dirCache[path]) return dirCache[path];

    var numDirs = 2 + Math.floor(Math.random() * 4);
    var numFiles = 3 + Math.floor(Math.random() * 5);
    var dirs = pick(dirNames, numDirs);
    var files = [];

    // 1-3 .txt files with actual content
    var numTxt = 1 + Math.floor(Math.random() * 3);
    var txtStemsUsed = pick(fileStems, numTxt);
    txtStemsUsed.forEach(function (stem) {
      files.push({
        name: stem + '.txt',
        ext: '.txt',
        content: txtContents[Math.floor(Math.random() * txtContents.length)]
      });
    });

    // Rest are weird files
    var weirdStemsUsed = pick(fileStems.filter(function (s) { return txtStemsUsed.indexOf(s) < 0; }), numFiles - numTxt);
    weirdStemsUsed.forEach(function (stem) {
      var ext = weirdExts[Math.floor(Math.random() * weirdExts.length)];
      files.push({ name: stem + ext, ext: ext });
    });

    // Maybe a hidden file
    if (Math.random() > 0.5) {
      files.push({ name: '.hidden_agenda', ext: '', content: 'there is no agenda.\nthat IS the agenda.' });
    }

    var entry = { dirs: dirs, files: files };
    dirCache[path] = entry;
    return entry;
  }

  function getCurrentDir() {
    return generateDir(cwd);
  }

  function allNamesInCwd() {
    var d = getCurrentDir();
    var names = d.dirs.map(function (n) { return n + '/'; });
    d.files.forEach(function (f) { names.push(f.name); });
    return names;
  }

  // =========================================================================
  // Tab completion
  // =========================================================================

  var baseCmds = [
    'help', 'whoami', 'about', 'music', 'craft', 'archive', 'links',
    'ls', 'ls /misc', 'cd', 'cat', 'less', 'grep', 'find', 'pwd', 'echo',
    'man', 'sudo', 'chmod', 'touch', 'mkdir', 'rm',
    'mv', 'cp', 'sed', 'awk', 'curl', 'ping', 'ssh', 'top', 'ps',
    'kill', 'df', 'du', 'head', 'tail', 'wc', 'date', 'uptime',
    'uname', 'reset', 'wumpus',
    'gol', 'gol pause', 'gol resume', 'gol reset',
    'gol glider', 'gol speed', 'clear', 'theme'
  ];

  function tabComplete(val) {
    var lower = val.toLowerCase();
    // If the command has a space and starts with cd/cat/less, complete filenames
    var parts = lower.split(/\s+/);
    if (parts.length >= 2 && ['cd', 'cat', 'less', 'grep'].indexOf(parts[0]) >= 0) {
      var partial = parts.slice(1).join(' ');
      var names = allNamesInCwd();
      // For cd, only dirs
      if (parts[0] === 'cd') names = getCurrentDir().dirs.map(function (n) { return n + '/'; });
      var matches = names.filter(function (n) { return n.toLowerCase().indexOf(partial) === 0; });
      if (matches.length === 1) return parts[0] + ' ' + matches[0];
      if (matches.length > 1) {
        blank();
        line('  ' + matches.join('  '), 'line-purple');
        scroll();
        var prefix = matches[0];
        for (var i = 1; i < matches.length; i++) {
          while (matches[i].indexOf(prefix) !== 0) prefix = prefix.slice(0, -1);
        }
        return parts[0] + ' ' + prefix;
      }
      return val;
    }

    // Command completion
    var matches2 = baseCmds.filter(function (c) { return c.indexOf(lower) === 0; });
    if (matches2.length === 1) return matches2[0];
    if (matches2.length > 1) {
      blank();
      line('  ' + matches2.join('  '), 'line-purple');
      scroll();
      var prefix2 = matches2[0];
      for (var j = 1; j < matches2.length; j++) {
        while (matches2[j].indexOf(prefix2) !== 0) prefix2 = prefix2.slice(0, -1);
      }
      return prefix2;
    }
    return val;
  }

  // =========================================================================
  // Boot
  // =========================================================================

  function boot() {
    line('shawnrider.com', 'line-heading');
    blank();
    line('connection established.', 'line-muted');
    line('last login: a long time ago from somewhere interesting', 'line-muted');
    blank();
    rule();
    blank();
    line('  Shawn Rider', 'line-bright');
    line('  Writer. Engineer. Musician. Maker.', 'line-cyan');
    line('  ' + data.description, 'line-purple');
    blank();
    rule();
    blank();
    htm('  type <span style="color:var(--gold)">help</span> to see what\u2019s here.');
    line('  or don\u2019t. the cells are nice to watch.', 'line-muted');
    blank();
    scroll();
    defaultHints();
  }

  // =========================================================================
  // Site commands
  // =========================================================================

  var commands = {};

  commands.help = function () {
    blank();
    line('COMMANDS', 'line-heading');
    blank();
    htm('  <span style="color:var(--green)">whoami</span>       about this person');
    htm('  <span style="color:var(--green)">music</span>        the band');
    htm('  <span style="color:var(--green)">craft</span>        the titanium stuff');
    htm('  <span style="color:var(--green)">archive</span>      old work, still alive');
    htm('  <span style="color:var(--green)">links</span>        find me elsewhere');
    blank();
    htm('  <span style="color:var(--orange)">wumpus</span>       hunt the wumpus');
    blank();
    htm('  <span style="color:var(--cyan)">gol</span>          game of life controls');
    htm('  <span style="color:var(--cyan)">theme</span>        toggle transparency');
    htm('  <span style="color:var(--cyan)">clear</span>        clear screen');
    htm('  <span style="color:var(--cyan)">reset</span>        reboot terminal');
    blank();
    line('  standard unix commands also work. mostly.', 'line-muted');
    line('  click the background to draw cells.', 'line-muted');
    line('  double-click to spawn a glider.', 'line-muted');
  };

  commands.whoami = function () {
    blank();
    line('SHAWN RIDER', 'line-heading');
    blank();
    line('  Writer. Engineer. Musician. Maker.', 'line-bright');
    line('  Building for the web since 1996.', 'line-cyan');
    line('  Currently in Seattle.', 'line-cyan');
    blank();
    line('  MFA in electronic writing.', 'line-purple');
    line('  Made net.art before it was retro.', 'line-purple');
    line('  Puts voltage through metal until it turns colors.', 'line-purple');
    blank();
    line('  ' + data.description, 'line-gold');
  };

  commands.about = commands.whoami;

  commands.music = function () {
    blank();
    line('MUSIC', 'line-heading');
    blank();
    line('  ' + data.music.band, 'line-bright');
    line('  ' + data.music.tagline, 'line-purple');
    line('  ' + data.music.authorial, 'line-muted');
    blank();
    htm('  ' + lnk(data.music.bandcamp, 'bandcamp') + '  ' +
      lnk('https://open.spotify.com/artist/harderwins', 'spotify') + '  ' +
      lnk('https://music.apple.com/artist/harder-wins', 'apple music'));
    htm('  ' + lnk('https://youtube.com/@harderwins', 'youtube') + '  ' +
      lnk('https://soundcloud.com/harderwins', 'soundcloud') + '  ' +
      lnk(data.music.harderwins, 'harderwins.com'));
    blank();
    rule();
    blank();
    line('  DISCOGRAPHY', 'line-gold');
    blank();

    data.music.albums.forEach(function (album) {
      var card = document.createElement('div');
      card.className = 'term-card';
      var inner = '';
      if (album.cover) inner += '<img class="term-img" src="' + esc(album.cover) + '" alt="' + esc(album.title) + '">';
      inner += '<div class="card-body">';
      inner += '<span class="card-name">' + esc(album.title) + '</span>';
      inner += ' <span class="card-meta">(' + album.year + ')</span>';
      inner += '<div class="card-desc">' + esc(album.description) + '</div>';
      inner += '<div class="card-meta"><a class="term-link" href="' + esc(album.url) + '" target="_blank" rel="noopener">\u2192 listen</a></div>';
      inner += '</div>';
      card.innerHTML = inner;
      output.appendChild(card);
    });

    blank();
    line('  \u2191\u2193 navigate \u00b7 enter open \u00b7 esc back to prompt', 'line-muted');
    setTimeout(function () { scroll(); enterCardMode(); }, 50);
  };

  commands.craft = function () {
    blank();
    line('CRAFT', 'line-heading');
    blank();
    line('  ' + data.craft.subtitle, 'line-cyan');
    blank();
    line('  ' + data.craft.authorial, 'line-purple');
    blank();
    line('  gallery + process videos coming soon at:', 'line-muted');
    htm('  ' + lnk(data.craft.site_url, 'shawnr.design \u2192'));
    blank();
    line('  in the meantime:', 'line-muted');
    htm('  ' + lnk(data.craft.instagram, '@shawnr on instagram \u2192'));
  };

  commands.archive = function () {
    blank();
    line('ARCHIVE', 'line-heading');
    blank();

    data.archive.forEach(function (item) {
      var card = document.createElement('div');
      card.className = 'term-card';
      var inner = '';
      if (item.screenshot) inner += '<img class="term-img" src="' + esc(item.screenshot) + '" alt="' + esc(item.title) + '">';
      inner += '<div class="card-body">';
      inner += '<span class="card-type">[' + esc(item.label) + ']</span> ';
      inner += '<span class="card-name">' + esc(item.title) + '</span>';
      inner += '<div class="card-desc">' + esc(item.hook) + '</div>';
      inner += '<div class="card-meta">' + esc(item.year) + '  ';
      inner += '<a class="term-link" href="' + esc(item.url) + '" target="_blank" rel="noopener">\u2192 visit</a></div>';
      inner += '</div>';
      card.innerHTML = inner;
      output.appendChild(card);
    });

    blank();
    line('  \u2191\u2193 navigate \u00b7 enter open \u00b7 esc back to prompt', 'line-muted');
    setTimeout(function () { scroll(); enterCardMode(); }, 50);
  };

  commands.links = function () {
    blank();
    line('FIND ME', 'line-heading');
    blank();
    htm('  <span style="color:var(--green)">Bandcamp</span>    ' + lnk(data.elsewhere.bandcamp, 'harderwins.bandcamp.com'));
    htm('  <span style="color:var(--cyan)">GitHub</span>      ' + lnk(data.elsewhere.github, 'github.com/shawnr'));
    htm('  <span style="color:var(--pink)">Instagram</span>   ' + lnk(data.elsewhere.instagram, 'instagram.com/shawnr'));
    htm('  <span style="color:var(--blue)">Bluesky</span>     ' + lnk(data.elsewhere.bluesky, 'bsky.app/profile/shawnr.bsky.social'));
    blank();
    line('  ' + data.elsewhere.closing, 'line-muted');
  };

  commands['ls /misc'] = function () {
    blank();
    line('/misc/', 'line-heading');
    blank();
    line('  blackpieday.com', 'line-green');
    line('    stay home. eat pie. it\u2019s the day after', 'line-info');
    line('    thanksgiving.', 'line-info');
    blank();
    line('  jesusisyournewhealthcare.com', 'line-orange');
    line('    contemporary to a specific political', 'line-info');
    line('    moment. you\u2019ll either get it or you won\u2019t.', 'line-info');
    blank();
    line('  [two more entries \u2014 locked pending review]', 'line-muted');
  };

  // =========================================================================
  // GoL commands
  // =========================================================================

  commands.gol = function () {
    blank();
    line('GAME OF LIFE', 'line-heading');
    blank();
    htm('  <span style="color:var(--green)">gol pause</span>    pause');
    htm('  <span style="color:var(--green)">gol resume</span>   resume');
    htm('  <span style="color:var(--green)">gol reset</span>    new random seed');
    htm('  <span style="color:var(--green)">gol glider</span>   spawn glider at center');
    htm('  <span style="color:var(--green)">gol speed</span> <span style="color:var(--orange)">N</span>  set tick (ms)');
    blank();
    line('  click background \u2192 toggle cell', 'line-muted');
    line('  double-click \u2192 spawn glider', 'line-muted');
  };

  commands['gol pause'] = function () {
    if (window.gol) window.gol.pause();
    line('  paused.', 'line-orange');
  };

  commands['gol resume'] = function () {
    if (window.gol) window.gol.resume();
    line('  resumed.', 'line-green');
  };

  commands['gol reset'] = function () {
    if (window.gol) { window.gol.seed(); window.gol.render(); }
    line('  grid randomized.', 'line-cyan');
  };

  commands['gol glider'] = function () {
    if (window.gol) window.gol.spawnGlider(window.innerWidth / 2, window.innerHeight / 2);
    line('  glider spawned.', 'line-green');
  };

  commands.clear = function () { output.innerHTML = ''; };

  commands.theme = function () {
    var shell = document.getElementById('terminal-shell');
    if (shell.style.backgroundColor) {
      shell.style.backgroundColor = '';
      shell.style.backdropFilter = '';
      shell.style.webkitBackdropFilter = '';
      line('  opacity: default', 'line-purple');
    } else {
      shell.style.backgroundColor = 'rgba(22, 12, 42, 0.45)';
      shell.style.backdropFilter = 'blur(6px)';
      shell.style.webkitBackdropFilter = 'blur(6px)';
      line('  opacity: translucent', 'line-purple');
    }
  };

  commands.reset = function () {
    if (destroyed) {
      destroyed = false;
      document.getElementById('terminal-shell').style.display = '';
    }
    output.innerHTML = '';
    cwd = '~';
    cwdStack = ['~'];
    dirCache = {};
    boot();
  };

  // =========================================================================
  // Wumpus game integration
  // =========================================================================

  // Print adapter — wumpus.js calls window.wumpusPrint(text)
  window.wumpusPrint = function (text) {
    if (!wumpusMode) return;
    // Split on newlines and print each line
    String(text).split('\n').forEach(function (l) {
      line('  ' + l, 'line-green');
    });
    scroll();
  };

  function startWumpus() {
    wumpusMode = true;
    if (window.WumpusGame) {
      wumpusInstance = new window.WumpusGame();
    }
    blank();
    line('HUNT THE WUMPUS', 'line-heading');
    line('  JS port by Benjam Welker (2009)', 'line-muted');
    line('  type "quit" to exit the game', 'line-muted');
    blank();
    rule();
    blank();
    // Start the game
    if (wumpusInstance) {
      wumpusInstance.startup();
    }
    setHints([['Enter', 'submit'], ['quit', 'exit game']]);
    scroll();
  }

  function stopWumpus() {
    wumpusMode = false;
    wumpusInstance = null;
    blank();
    line('  you fled the caves. the wumpus sleeps... for now.', 'line-muted');
    defaultHints();
  }

  function wumpusInput(raw) {
    var cmd = raw.trim().toLowerCase();
    if (cmd === 'quit' || cmd === 'exit') {
      stopWumpus();
      return;
    }
    htm('<span class="prompt" style="color:var(--green)">?></span> ' + esc(raw), 'line-cmd');
    if (wumpusInstance) {
      var result = wumpusInstance.input(raw);
      if (result !== undefined && result !== null) {
        wumpusInstance.print(result);
      }
    }
    scroll();
  }

  commands.wumpus = function () {
    startWumpus();
  };

  // =========================================================================
  // Fake unix commands
  // =========================================================================

  function fakePerms() {
    var p = ['drwxr-xr-x', '-rw-r--r--', '-rwx------', 'lrwxrwxrwx', '-rw-------', 'drwx------'];
    return p[Math.floor(Math.random() * p.length)];
  }

  function fakeSize() {
    var s = ['4.0K', '8.0K', '42K', '128K', '256K', '1.3M', '4.2M', '69K', '420K', '666B', '0B', '\u221e'];
    return s[Math.floor(Math.random() * s.length)];
  }

  function fakeDate() {
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var m = months[Math.floor(Math.random() * 12)];
    var d = Math.floor(Math.random() * 28) + 1;
    var years = ['1999','2003','2007','2012','2016','2019','2024','13:37','04:20','??:??'];
    var y = years[Math.floor(Math.random() * years.length)];
    return m + ' ' + (d < 10 ? ' ' : '') + d + ' ' + y;
  }

  commands.ls = function () {
    blank();
    var dir = getCurrentDir();
    htm('  <span style="color:var(--muted)">total ' + (dir.dirs.length + dir.files.length) * 4 + '</span>');
    dir.dirs.forEach(function (d) {
      htm('  <span style="color:var(--muted)">' + fakePerms().replace(/^./, 'd') + '  shawnr  ' + fakeSize().padStart(5) + '  ' + fakeDate() + '</span>  <span style="color:var(--blue)">' + esc(d) + '/</span>');
    });
    dir.files.forEach(function (f) {
      var color = f.ext === '.txt' ? '--green' : '--orange';
      if (f.name.startsWith('.')) color = '--muted';
      htm('  <span style="color:var(--muted)">' + fakePerms().replace(/^./, '-') + '  shawnr  ' + fakeSize().padStart(5) + '  ' + fakeDate() + '</span>  <span style="color:var(' + color + ')">' + esc(f.name) + '</span>');
    });
  };

  commands.pwd = function () { line('  ' + cwd, 'line-cyan'); };

  function handleCd(arg) {
    arg = arg.trim() || '~';
    if (arg === '/' || arg === '~') {
      cwd = arg === '/' ? '/' : '~';
      cwdStack = [cwd];
      line('  ' + cwd, 'line-cyan');
      return;
    }
    if (arg === '..') {
      if (cwdStack.length > 1) {
        cwdStack.pop();
      } else {
        cwdStack = ['~', pick(dirNames, 1)[0]];
      }
      cwd = cwdStack.join('/').replace(/\/+/g, '/');
      line('  ' + cwd, 'line-cyan');
      return;
    }
    if (arg === '-') { line('  nice try.', 'line-muted'); return; }
    cwdStack.push(arg.replace(/\/$/, ''));
    if (cwdStack.length > 6) cwdStack = cwdStack.slice(-4);
    cwd = cwdStack.join('/').replace(/\/+/g, '/');
    line('  ' + cwd, 'line-cyan');
  }

  function handleCatLess(arg) {
    arg = arg.trim();
    if (!arg) { line('  cat: missing file operand', 'line-orange'); return; }
    // Check if it's a real file in the current dir
    var dir = getCurrentDir();
    var found = null;
    dir.files.forEach(function (f) {
      if (f.name.toLowerCase() === arg.toLowerCase()) found = f;
    });
    if (found && found.content) {
      blank();
      found.content.split('\n').forEach(function (l) { line('  ' + l, 'line-info'); });
      return;
    }
    if (found) {
      // Weird extension, no content
      var msgs = [
        'cat: ' + arg + ': binary file (not shown)',
        'cat: ' + arg + ': encoding not recognized. possibly cursed.',
        'cat: ' + arg + ': this file makes a sound when you open it. you don\u2019t want to hear it.',
        'cat: ' + arg + ': file is 4-dimensional. your terminal can only display 2.',
        'cat: ' + arg + ': the bytes are there but they refuse to be read.',
        'cat: ' + arg + ': contains only the letter "q" repeated 40,000 times.',
      ];
      blank();
      line('  ' + msgs[Math.floor(Math.random() * msgs.length)], 'line-orange');
      return;
    }
    // Not found in dir — generic response
    var generic = [
      'cat: ' + arg + ': No such file or directory',
      'cat: ' + arg + ': file not found. it was here a minute ago.',
      'cat: ' + arg + ': the file exists in another timeline.',
    ];
    blank();
    line('  ' + generic[Math.floor(Math.random() * generic.length)], 'line-orange');
  }

  function handleGrep(arg) {
    arg = arg.trim();
    if (!arg) { line('  grep: missing pattern', 'line-orange'); return; }
    var results = [
      ['meaning_of_life.txt', '42'],
      ['old_diary.md', '...and that\u2019s when I realized CSS was my real enemy.'],
      ['README.md', 'DO NOT ACTUALLY READ THIS'],
      ['.bash_history', 'why did I run that command'],
      ['fix_later.js', '// FIXME: has been here since 2017'],
      ['haiku.txt', 'segfault at midnight / the stack trace reveals nothing / ship it anyway'],
      ['the_truth.gpg', 'Binary file matches (but you can\u2019t read it)'],
      ['notes.txt', 'remember: the deployment is ALWAYS on fire'],
      ['config.yaml', 'password: hunter2  # TODO: change this'],
      ['budget.csv', '"vibes","unlimited","do not question"'],
      ['portal_test_log.dat', 'the cake is a lie. the enrichment center reminds you that the cake is a lie.'],
      ['deltron_lyrics.txt', 'upgrade your gray matter, one day it may matter'],
      ['vonnegut_quotes.md', 'so it goes. so it goes. so it goes.'],
      ['dub_delay_settings.conf', 'feedback=0.73 // the Lee "Scratch" Perry setting'],
      ['murderbot.log', 'PERFORMANCE REVIEW: declined. watching media feeds instead.'],
      ['neuromancer.highlight', 'the sky above the port was the color of television, tuned to a dead channel'],
      ['balatro_notes.txt', 'DO NOT discard the joker. trust the joker. the joker knows.'],
      ['conan_workout.csv', 'exercise,reps\n"crush enemies",999\n"contemplate riddle of steel",1'],
      ['deployment.yaml', 'replicas: 1  # it used to be 3. we don\'t talk about what happened.'],
      ['.zshrc', 'alias yolo="git push --force"  # added 2019'],
      ['git_stash_list.txt', 'stash@{47}: WIP on main: here be dragons'],
      ['.bash_history', 'kubectl delete pod --all --namespace=production  # oh no'],
      ['app.py', '# TODO: remove this hack before code review (2021-03-14)'],
      ['package.json', '"left-pad": "^1.0.0"  # never forget'],
    ];
    blank();
    pick(results, 1 + Math.floor(Math.random() * 3)).forEach(function (r) {
      htm('  <span style="color:var(--purple)">' + esc(r[0]) + '</span><span style="color:var(--muted)">:</span> ' + esc(r[1]));
    });
  }

  function handleFind() {
    var things = [
      'yourself', 'inner peace', 'the bug (it was DNS)', 'a reason to refactor',
      'your keys (they were in your pocket)', '47 node_modules directories',
      'the missing semicolon', 'enlightenment (it segfaulted)',
      'that one email from 2014', 'a mass grave of TODO comments',
      'the companion cube (it was in the incinerator)',
      'a Lee "Scratch" Perry dub plate (priceless)',
      'an Augustus Pablo melodica reed (slightly haunted)',
      'Deltron\u2019s last transmission from the year 3030',
      'a Vonnegut paperback in a free library box',
      'a skateboard wheel under the couch (mystery solved)',
      'the riddle of steel (Conan was right)',
      'a working NVIDIA driver on Linux (impossible)',
      'Borges\u2019 Library of Babel (it was here the whole time)',
      'a kubernetes pod that actually stayed running',
      'the yaml indentation error (it was on line 847)',
      'a git stash from 2019 (it was important after all)',
      'a python virtualenv with every dependency pinned correctly',
      'the one bash script that runs the entire company'
    ];
    blank();
    line('  find: searching...', 'line-muted');
    line('  found: ' + things[Math.floor(Math.random() * things.length)], 'line-cyan');
  }

  function handleEcho(arg) {
    blank();
    if (!arg.trim()) { line('  ', 'line-info'); return; }
    var lower = arg.trim().toLowerCase();
    if (lower === 'hello' || lower === 'hi' || lower === 'hey') {
      line('  hey. welcome. look around.', 'line-green');
    } else if (/fuck|shit|damn|ass/.test(lower)) {
      line('  valid.', 'line-pink');
    } else {
      line('  ' + arg.trim(), 'line-info');
      line('  (echo is basically the console.log of coping mechanisms)', 'line-muted');
    }
  }

  function handleSed() {
    var r = [
      'sed: cannot substitute feelings',
      'sed: replaced 0 instances of "productivity" with "doom scrolling"',
      'sed: s/sleep/more coffee/g \u2014 365 replacements made',
      'sed: s/bugs/features/g \u2014 perception updated successfully',
      'sed: the regex grew too powerful. it has opinions now.',
      'sed: you want to replace WHAT with WHAT? in THIS economy?',
    ];
    blank();
    line('  ' + r[Math.floor(Math.random() * r.length)], 'line-orange');
  }

  var noPermission = [
    'permission denied. this is a read-only universe.',
    'permission denied. you\u2019re a guest here.',
    'permission denied. nice try though.',
    'permission denied. some things are sacred.',
    'operation not permitted. the filesystem has boundaries.',
    'permission denied. have you tried being root? (you can\u2019t be root.)',
  ];

  function permDenied(cmd) {
    blank();
    line('  ' + cmd + ': ' + noPermission[Math.floor(Math.random() * noPermission.length)], 'line-orange');
  }

  function handleRmRf() {
    blank();
    line('  rm: removing /...', 'line-red');
    destroyed = true;
    var shell = document.getElementById('terminal-shell');
    var steps = [
      [200, '  deleting abandoned_drafts/...'],
      [350, '  deleting forgotten_passwords/...'],
      [500, '  deleting titanium_dreams/...'],
      [650, '  deleting the_good_timeline/...'],
      [800, '  deleting everything_you_ever_made/...'],
      [1000, '  deleting the concept of websites/...'],
      [1200, '  deleting shawnrider.com...'],
    ];
    var idx = 0;
    function next() {
      if (idx >= steps.length) {
        setTimeout(function () {
          blank();
          line('  done. it\u2019s all gone.', 'line-red');
          blank();
          line('  ...', 'line-muted');
          scroll();
          setTimeout(function () {
            line('  was it worth it?', 'line-muted');
            blank();
            line('  (refresh or type "reset" to undo)', 'line-muted');
            scroll();
            setTimeout(function () { shell.style.display = 'none'; }, 600);
          }, 800);
        }, 400);
        return;
      }
      var s = steps[idx];
      setTimeout(function () {
        line(s[1], 'line-muted');
        scroll();
        idx++;
        next();
      }, s[0] - (idx > 0 ? steps[idx - 1][0] : 0));
    }
    next();
  }

  commands.man = function () { blank(); line('  no manual. figure it out. that\u2019s the unix way.', 'line-muted'); };
  commands.sudo = function () { blank(); line('  shawnr is not in the sudoers file.', 'line-orange'); line('  this incident will be reported.', 'line-orange'); line('  (to no one. there is no one.)', 'line-muted'); };
  commands.top = function () {
    blank();
    line('  PID   USER    %CPU  %MEM  COMMAND', 'line-muted');
    htm('  <span style="color:var(--green)">1</span>     shawnr  99.9  42.0  <span style="color:var(--bright)">conway-game-of-life</span>');
    htm('  <span style="color:var(--green)">2</span>     shawnr   0.1   0.1  <span style="color:var(--bright)">existential-dread</span>');
    htm('  <span style="color:var(--green)">3</span>     shawnr   0.0  58.0  <span style="color:var(--bright)">unfinished-projects</span>');
    htm('  <span style="color:var(--green)">4</span>     shawnr   0.0   0.0  <span style="color:var(--muted)">ambition (sleeping)</span>');
  };
  commands.ps = commands.top;
  commands.kill = function () { blank(); line('  kill: cannot kill that which is already dead inside', 'line-orange'); };
  commands.df = function () {
    blank();
    line('  Filesystem      Size  Used  Avail  Use%  Mounted on', 'line-muted');
    htm('  <span style="color:var(--cyan)">/dev/dreams</span>      \u221e     98%   2%     98%   <span style="color:var(--blue)">/home/shawnr</span>');
    htm('  <span style="color:var(--cyan)">/dev/talent</span>      ???   ???   ???    ???   <span style="color:var(--blue)">/impostor-syndrome</span>');
    htm('  <span style="color:var(--cyan)">/dev/null</span>        \u221e     0%    100%   0%    <span style="color:var(--blue)">/dev/null</span>');
  };
  commands.du = function () { blank(); line('  4.2G    ./node_modules', 'line-info'); line('  2.1G    ./regrets', 'line-info'); line('  1.8G    ./unfinished_songs', 'line-info'); line('  900M    ./titanium_dust', 'line-info'); line('  420K    ./actual_shipped_work', 'line-info'); line('  0B      ./spare_time', 'line-muted'); };
  commands.head = function () { blank(); line('  the first line is always the hardest.', 'line-info'); line('  (that\u2019s true of files AND songs.)', 'line-muted'); };
  commands.tail = function () { blank(); line('  ...and that\u2019s how I learned never to run', 'line-info'); line('  that command in production again.', 'line-info'); line('  \u2014 the end \u2014', 'line-muted'); };
  commands.wc = function () { blank(); line('  ' + (Math.floor(Math.random() * 90000) + 10000) + ' words', 'line-info'); line('  (and climbing. always climbing.)', 'line-muted'); };
  commands.date = function () { blank(); line('  ' + new Date().toString(), 'line-cyan'); line('  (time is a flat circle on the internet)', 'line-muted'); };
  commands.uptime = function () { var y = new Date().getFullYear() - 1996; blank(); line('  up ' + y + ' years, give or take a few existential reboots', 'line-green'); line('  load average: too much, way too much, why', 'line-muted'); };
  commands.uname = function () { blank(); line('  ShawnrOS 51.0-neon-terminal ACAB.1213', 'line-cyan'); line('  built with hugo, vanilla js, stubbornness', 'line-muted'); };
  commands.ping = function () { blank(); line('  PING shawnrider.com: 64 bytes \u2014 time=0.001ms', 'line-green'); line('  PING shawnrider.com: 64 bytes \u2014 time=0.001ms', 'line-green'); line('  (it\u2019s always up. it\u2019s a static site.)', 'line-muted'); };
  commands.ssh = function () { blank(); line('  ssh: you\u2019re already here.', 'line-cyan'); line('  there is nowhere deeper to go.', 'line-muted'); line('  ...or is there?', 'line-muted'); };
  commands.curl = function () { blank(); line('  < HTTP/1.1 200 OK', 'line-green'); line('  < Content-Type: text/vibes', 'line-info'); line('  < X-Powered-By: caffeine, spite', 'line-info'); line('  < X-Frame-Of-Mind: questionable', 'line-muted'); line('  < Server: a laptop in seattle', 'line-muted'); };
  commands.awk = function () { blank(); line('  awk: it\u2019s always awk-ward in here.', 'line-orange'); line('  (you expected a real awk? on a personal website?)', 'line-muted'); };
  commands['import this'] = function () {
    blank();
    line('  The Zen of Python, by Tim Peters', 'line-heading');
    blank();
    var zen = [
      'Beautiful is better than ugly.',
      'Explicit is better than implicit.',
      'Simple is better than complex.',
      'Complex is better than complicated.',
      'Flat is better than nested.',
      'Sparse is better than dense.',
      'Readability counts.',
      'Special cases aren\u2019t special enough to break the rules.',
      'Although practicality beats purity.',
      'Errors should never pass silently.',
      'Unless explicitly silenced.',
      'In the face of ambiguity, refuse the temptation to guess.',
      'There should be one-- and preferably only one --obvious way to do it.',
      'Although that way may not be obvious at first unless you\u2019re Dutch.',
      'Now is better than never.',
      'Although never is often better than right now.',
      'If the implementation is hard to explain, it\u2019s a bad idea.',
      'If the implementation is easy to explain, it may be a good idea.',
      'Namespaces are one honking great idea \u2013 let\u2019s do more of those!'
    ];
    zen.forEach(function (l) { line('  ' + l, 'line-green'); });
  };

  commands.chmod = function () { permDenied('chmod'); };
  commands.touch = function () { permDenied('touch'); };
  commands.mkdir = function () { permDenied('mkdir'); };
  commands.rm = function () { permDenied('rm'); };
  commands.mv = function () { permDenied('mv'); };
  commands.cp = function () { permDenied('cp'); };
  commands['rm -rf /.'] = function () { handleRmRf(); };

  // =========================================================================
  // Command runner
  // =========================================================================

  function run(raw) {
    if (destroyed && raw.trim().toLowerCase() !== 'reset') {
      document.getElementById('terminal-shell').style.display = '';
      line('  there\u2019s nothing left.', 'line-muted');
      line('  type "reset" to rebuild from the ashes.', 'line-muted');
      blank(); scroll();
      return;
    }

    // Route to wumpus if in game mode (must be before empty-check — game needs empty Enter)
    if (wumpusMode) {
      wumpusInput(raw);
      return;
    }

    var cmd = raw.trim().toLowerCase();
    if (!cmd) return;

    // ALWAYS exit card mode
    if (cardMode) exitCardMode();

    htm('<span class="prompt">' + prompt() + '</span> ' + esc(raw), 'line-cmd');

    if (commands[cmd]) {
      commands[cmd]();
    } else if (cmd === 'cd' || cmd.indexOf('cd ') === 0) {
      handleCd(cmd.slice(2));
    } else if (cmd.indexOf('cat ') === 0) {
      handleCatLess(cmd.slice(4));
    } else if (cmd === 'less' || cmd.indexOf('less ') === 0) {
      handleCatLess((cmd.slice(4)).trim());
    } else if (cmd.indexOf('grep ') === 0) {
      handleGrep(cmd.slice(5));
    } else if (cmd.indexOf('echo ') === 0) {
      handleEcho(cmd.slice(5));
    } else if (cmd === 'find' || cmd.indexOf('find ') === 0) {
      handleFind();
    } else if (cmd.indexOf('sed ') === 0 || cmd === 'sed') {
      handleSed();
    } else if (cmd.indexOf('gol speed ') === 0) {
      var ms = parseInt(cmd.slice(10), 10);
      if (isNaN(ms) || ms < 16) line('  usage: gol speed <ms>  (min 16)', 'line-muted');
      else { window.golTickMs = ms; line('  tick speed: ' + ms + 'ms', 'line-cyan'); }
    } else if (/^rm\s+(-rf?|--force|-r)\b/.test(cmd)) {
      handleRmRf();
    } else if (/^(rm|mkdir|touch|chmod|mv|cp)\b/.test(cmd)) {
      permDenied(cmd.split(' ')[0]);
    } else {
      line('  command not found: ' + cmd, 'line-muted');
      htm('  type <span style="color:var(--gold)">help</span> for commands');
    }

    blank();
    scroll();
  }

  // =========================================================================
  // Input handling
  // =========================================================================

  input.addEventListener('keydown', function (e) {
    if (cardMode && e.key !== 'ArrowUp' && e.key !== 'ArrowDown'
      && e.key !== 'Escape' && e.key !== 'Enter' && e.key !== 'Tab') {
      exitCardMode();
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (cardMode) return; // global handler deals with card Enter
      var val = input.value;
      if (val.trim()) { cmdHistory.push(val); historyIdx = cmdHistory.length; }
      run(val);
      input.value = '';
    } else if (e.key === 'ArrowUp') {
      if (!cardMode) {
        e.preventDefault();
        if (historyIdx > 0) { historyIdx--; input.value = cmdHistory[historyIdx]; }
      }
    } else if (e.key === 'ArrowDown') {
      if (!cardMode) {
        e.preventDefault();
        if (historyIdx < cmdHistory.length - 1) { historyIdx++; input.value = cmdHistory[historyIdx]; }
        else { historyIdx = cmdHistory.length; input.value = ''; }
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      commands.clear();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      input.value = tabComplete(input.value);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (!cardMode) {
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag !== 'input' && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) input.focus();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); if (cardIdx < activeCards.length - 1) { cardIdx++; focusCard(cardIdx); } }
    else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); if (cardIdx > 0) { cardIdx--; focusCard(cardIdx); } }
    else if (e.key === 'Enter') { e.preventDefault(); openCard(cardIdx); }
    else if (e.key === 'Escape' || e.key === 'q') { e.preventDefault(); exitCardMode(); }
  });

  document.getElementById('terminal-shell').addEventListener('click', function (e) {
    if (e.target.tagName !== 'A' && !cardMode) input.focus();
  });

  // =========================================================================
  boot();
  input.focus();
})();
