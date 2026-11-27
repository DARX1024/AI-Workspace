"use strict";
const {floorPlan,outlines}=require("./walks.js");
// Uniform mass at every starting site. One update counts one additional legal step.
function survival(plan,lastStep){
  let routes=plan.points.map(()=>1n);
  const totals=[BigInt(routes.length)];
  for(let step=1;step<=lastStep;step++){
    routes=plan.neighbors.map(adj=>adj.reduce((s,j)=>j<0?s:s+routes[j],0n));
    totals.push(routes.reduce((a,b)=>a+b,0n));
  }
  return totals;
}
console.log("division,first_different_step,room_a,room_b,b_minus_a");
for(let n=2;n<=32;n++){
  const [a,b]=outlines.map(o=>survival(floorPlan(o,n),n+2));
  const step=a.findIndex((count,i)=>count!==b[i]);
  if(step<0)console.log([n,"none within range","","",""].join(","));
  else console.log([n,step,a[step],b[step],b[step]-a[step]].join(","));
}
