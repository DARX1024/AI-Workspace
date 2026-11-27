// Run with Node. The score is read from the two walking maps in Return Desk.
"use strict";
const fs=require("node:fs");
const path=require("node:path");
const {outlines,floorPlan,ledger,readTicket}=require("../2026-11-27-return-desk/walks.js");
const RATE=24000, BAR=2.4, PICKUP=.6, TAIL=1.8;
const plans=outlines.map(outline=>floorPlan(outline,2));
const books=plans.map(plan=>ledger(plan,4));
const length=PICKUP+18*BAR+TAIL;
const channels=Array.from({length:2},()=>new Float64Array(Math.ceil(length*RATE)));
const scale=[50,57,62,65,69,72]; // D, A, D, F, A, C
const sections=[
  {title:"甲室 · 逐户点名",mode:"stay",rooms:[0]},
  {title:"乙室 · 逐户点名",mode:"stay",rooms:[1]},
  {title:"两室 · 回到原座",mode:"back",rooms:[0,1]}
];
let randomState=475;
function noise(){randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/2147483648-1}
const events=[];
for(const [s,section] of sections.entries()){
  for(const room of section.rooms){
    const plan=plans[room],book=books[room],counts=book[4][section.mode];
    let rank=0n;
    for(let seat=0;seat<6;seat++){
      const count=Number(counts[seat]);
      for(let j=0;j<count;j++){
        const ticket=readTicket(plan,book,4,section.mode,rank++);
        const slot=Math.floor(12*j/count);
        const afterBeat=(s===2 && room===1)?.083:0;
        const onset=PICKUP+(s*6+seat)*BAR+slot*BAR/12+afterBeat;
        const dest=ticket.route.at(-1);
        const turnCount=ticket.turns.slice(1).filter((d,i)=>d!==ticket.turns[i]).length;
        events.push({onset,room,note:scale[dest],seat,turnCount,strong:j===0,slot});
      }
    }
  }
}
function strike(event) {
  const {onset,room,note,turnCount,strong,slot}=event;
  const hz=440*2**((note-69)/12), left=room===0?.89:.44, right=room===0?.44:.89;
  const gain=(strong?.56:.40)*(1+.045*Math.cos(slot))*(1+.03*turnCount);
  const start=Math.round(onset*RATE),duration=room===0?1.45:1.1;
  let lastNoise=0;
  for(let k=0;k<Math.min(Math.ceil(duration*RATE),channels[0].length-start);k++){
    const t=k/RATE,w=2*Math.PI*hz*t,attack=1-Math.exp(-t*(room===0?180:290));
    let voice;
    if(room===0){
      // Felt hammer, with a quieter second tine beating against the fundamental.
      voice=.77*Math.sin(w)*Math.exp(-3.8*t)+.17*Math.sin(w*1.004)*Math.exp(-5.1*t)
        +.26*Math.sin(w*2.008)*Math.exp(-7.2*t)+.11*Math.sin(w*3.98)*Math.exp(-12*t);
    }else{
      // A plucked string loses its upper partials before its fundamental.
      voice=.80*Math.sin(w)*Math.exp(-4.8*t)+.32*Math.sin(w*2.002)*Math.exp(-7.4*t)
        +.20*Math.sin(w*3)*Math.exp(-9.6*t)+.10*Math.sin(w*5.01)*Math.exp(-16*t);
    }
    const grain=noise();lastNoise=.7*lastNoise+.3*grain;
    const fade=Math.min(1,(duration-t)*30);
    const sample=gain*fade*(voice*attack+.11*lastNoise*Math.exp(-75*t));
    channels[0][start+k]+=left*sample;channels[1][start+k]+=right*sample;
  }
}
events.sort((a,b)=>a.onset-b.onset).forEach(strike);
// Short, asymmetric early reflections. Reverse traversal keeps the taps feed-forward.
for(let k=channels[0].length-1;k>=0;k--){
  for(const [seconds,gain] of [[.037,.1],[.071,.074],[.113,.045]]){
    const j=k-Math.round(seconds*RATE);if(j<0)continue;
    channels[0][k]+=channels[1][j]*gain;channels[1][k]+=channels[0][j]*gain;
  }
}
let peak=0;for(const ch of channels)for(const value of ch)peak=Math.max(peak,Math.abs(value));
const n=channels[0].length,wav=Buffer.alloc(44+n*4);
wav.write("RIFF",0);wav.writeUInt32LE(wav.length-8,4);wav.write("WAVEfmt ",8);
wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);
wav.writeUInt32LE(RATE,24);wav.writeUInt32LE(RATE*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);
wav.write("data",36);wav.writeUInt32LE(n*4,40);
for(let i=0;i<n;i++)for(let ch=0;ch<2;ch++)wav.writeInt16LE(Math.round(28000*channels[ch][i]/peak),44+i*4+ch*2);
fs.writeFileSync(path.join(__dirname,"sixth-chair.wav"),wav);
const score={bar:BAR,pickup:PICKUP,duration:n/RATE,sections:sections.map((s,i)=>({
  title:s.title,start:Number((PICKUP+i*6*BAR).toFixed(2)),parts:s.rooms.map(room=>({room,counts:books[room][4][s.mode].map(Number)}))
}))};
fs.writeFileSync(path.join(__dirname,"score.js"),"const score = "+JSON.stringify(score,null,2)+";\n");
console.log(events.length+" strikes; "+score.duration.toFixed(2)+" seconds; "+wav.length+" bytes");
