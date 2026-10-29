/** Keep depth precision around the displayed model, including orbit and zoom. */
export function modelDepthRange(radius:number,distance:number){
 const envelope=Math.max(radius,1)*2;
 const near=Math.max(radius*.05,distance-envelope,.001);
 return {near,far:Math.max(near*2,distance+envelope)};
}
