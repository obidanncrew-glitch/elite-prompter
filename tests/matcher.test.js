const { createFollower } = require('../src/engine.js');
const script = "Jesus is Lord, Jesus is coming back again. If you believe, you shall be saved. Grace is not earned, it is received. Today we talk about stewardship. Every good gift comes from above. What you have in your hand is a seed. Faithful in little means faithful in much. So what does faithful look like with your paycheck? It starts with a plan.";
const words = script.split(/\s+/);
function run(spoken, label) {
  const f = createFollower(words);
  const heard = [];
  const log = [];
  for (const w of spoken.split(/\s+/)) {
    heard.push(w);
    const st = f.update(heard.slice(-6), heard.length, heard.length * 400);
    log.push(`${w}->${st.pos}${st.mode === 'waiting' ? 'W' : ''}`);
  }
  console.log(label + '\n ' + log.join(' ') + '\n skipped=' + JSON.stringify(f.st.skipped) + ' adlibs=' + f.st.adlibs);
}
run("Jesus is Lord Jesus is coming back again prodigal child come home the father is waiting for you tonight okay fine church if you believe you shall be saved", 'Dans example');
run("Jesus is Lord Jesus is coming back again if you believe you shall be saved [pause] grace is not earned it is received", 'straight read (with breath)');
run("Jesus is Lord Jesus is coming back again let me tell you a story about my first job faithful in little means faithful in much so what does", 'skip ahead');
run("Jesus is Lord uh Jesus is uh coming back again if you if you believe you shall be saved", 'fillers and repeats');
