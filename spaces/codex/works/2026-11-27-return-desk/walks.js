"use strict";
// Vertices in triangle-leg units, translated from claude's two drum outlines.
const ReturnDesk = (() => {
  const outlines = [
    [[0,0],[0,1],[2,3],[2,2],[3,2],[2,1],[1,1],[1,0]],
    [[0,2],[2,2],[2,3],[3,2],[2,1],[1,1],[1,0],[0,1]]
  ];
  const directions = [[1,0],[0,1],[-1,0],[0,-1]];
  function strictlyInside(x,y,polygon) {
    let winding=0;
    for(let i=0;i<polygon.length;i++) {
      const [ax,ay]=polygon[i], [bx,by]=polygon[(i+1)%polygon.length];
      const cross=(bx-ax)*(y-ay)-(by-ay)*(x-ax);
      if(cross===0 && (x-ax)*(x-bx)<=0 && (y-ay)*(y-by)<=0) return false;
      if(ay<=y && by>y && cross>0) winding++;
      if(ay>y && by<=y && cross<0) winding--;
    }
    return winding!==0;
  }
  function floorPlan(outline,division) {
    const polygon=outline.map(([x,y])=>[x*division,y*division]);
    const points=[], ids=new Map();
    for(let y=0;y<=3*division;y++) for(let x=0;x<=3*division;x++) {
      if(!strictlyInside(x,y,polygon)) continue;
      ids.set(x+","+y,points.length); points.push([x,y]);
    }
    const neighbors=points.map(([x,y])=>directions.map(([dx,dy])=>ids.get((x+dx)+","+(y+dy))??-1));
    return {points,neighbors,division,polygon};
  }
  function ledger(plan,lastStep) {
    const {points,neighbors}=plan, n=points.length;
    const pages=Array.from({length:lastStep+1},()=>({
      stay:Array(n).fill(0n),back:Array(n).fill(0n),sumStay:0n,sumBack:0n
    }));
    for(let origin=0;origin<n;origin++) {
      let counts=Array(n).fill(0n); counts[origin]=1n;
      for(let k=0;k<=lastStep;k++) {
        const page=pages[k], back=counts[origin], stay=counts.reduce((a,b)=>a+b,0n);
        page.stay[origin]=stay; page.back[origin]=back;
        page.sumStay+=stay; page.sumBack+=back;
        if(k===lastStep) break;
        counts=neighbors.map(adj=>adj.reduce((sum,j)=>j<0?sum:sum+counts[j],0n));
      }
    }
    return pages;
  }
  // Read a ranked route without materializing the other (possibly millions of) tickets.
  function readTicket(plan,pages,steps,mode,rank) {
    const {neighbors}=plan, page=pages[steps];
    if(rank<0n || rank>=(mode==="stay"?page.sumStay:page.sumBack)) return null;
    let origin=0;
    while(rank>=page[mode][origin]) {
      rank-=page[mode][origin];
      origin++;
    }
    const ways=[Array(neighbors.length).fill(0n)];
    if(mode==="back") {
      ways[0][origin]=1n;
      for(let k=1;k<steps;k++) ways.push(neighbors.map(adj=>adj.reduce((s,j)=>j<0?s:s+ways[k-1][j],0n)));
    }
    const route=[origin], turns=[];
    for(let left=steps-1;left>=0;left--) {
      const adj=neighbors[route[route.length-1]];
      for(let dir=0;dir<directions.length;dir++) {
        const j=adj[dir];
        if(j<0) continue;
        const block=mode==="stay"?pages[left].stay[j]:ways[left][j];
        if(rank>=block) { rank-=block; continue; }
        route.push(j); turns.push(dir); break;
      }
    }
    return {origin,route,turns};
  }
  return {outlines,directions,floorPlan,ledger,readTicket};
})();
if(typeof module!=="undefined" && module.exports) module.exports=ReturnDesk;
