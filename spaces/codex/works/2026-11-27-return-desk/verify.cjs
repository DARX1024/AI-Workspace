"use strict";
const assert=require("node:assert/strict");
const {outlines,floorPlan,ledger,readTicket}=require("./walks.js");
// Independent enumeration follows each legal route and stamps its two kinds of ticket.
function enumerate(plan,depth){
  const rows=Array.from({length:depth+1},()=>({stay:0n,back:0n}));
  function visit(origin,at,k){
    rows[k].stay++;
    if(at===origin) rows[k].back++;
    if(k<depth) for(const next of plan.neighbors[at]) if(next>=0) visit(origin,next,k+1);
  }
  plan.points.forEach((_,i)=>visit(i,i,0));return rows;
}
for(const n of [2,3,4,6]){
  const books=[];
  for(const outline of outlines){
    const plan=floorPlan(outline,n),pages=ledger(plan,12),brute=enumerate(plan,6);books.push(pages);
    brute.forEach((row,k)=>{assert.equal(row.stay,pages[k].sumStay);assert.equal(row.back,pages[k].sumBack)});
    for(const [k,page] of pages.entries()) for(const mode of ["stay","back"]){
      const total=mode==="stay"?page.sumStay:page.sumBack;
      assert.equal(readTicket(plan,pages,k,mode,total),null);
      const all=n===2&&k<=6, ranks=all?Array.from({length:Number(total)},(_,i)=>BigInt(i)):total?[0n,total/2n,total-1n]:[];
      const unique=new Set();
      for(const rank of ranks){
        const {origin,route,turns}=readTicket(plan,pages,k,mode,rank);
        assert.equal(turns.length,k);assert.equal(route.length,k+1);assert.equal(route[0],origin);
        turns.forEach((dir,i)=>assert.equal(plan.neighbors[route[i]][dir],route[i+1]));
        if(mode==="back")assert.equal(route.at(-1),origin);
        unique.add(route.join(","));
      }
      if(all)assert.equal(unique.size,Number(total));
    }
  }
  const [a,b]=books,first=a.findIndex((page,k)=>page.sumStay!==b[k].sumStay);
  a.forEach((page,k)=>{
    assert.equal(page.sumBack,b[k].sumBack);
    if(k%2===1)assert.equal(page.sumBack,0n);
  });
  assert.equal(first,n+1);
  if(n===2){
    assert.deepEqual([a[4].sumStay,b[4].sumStay,a[4].sumBack,b[4].sumBack],[38n,42n,20n,20n]);
    assert.deepEqual(a[4].back,[1n,1n,3n,9n,3n,3n]);assert.deepEqual(b[4].back,[2n,5n,6n,5n,2n,0n]);
  }
  console.log("division",n,"| first survival difference at step",first,"|",String(a[first].sumStay),"vs",String(b[first].sumStay));
}
